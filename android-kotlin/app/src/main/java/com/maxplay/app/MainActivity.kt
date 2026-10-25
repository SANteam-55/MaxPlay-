package com.maxplay.app

import android.annotation.SuppressLint
import android.content.pm.ActivityInfo
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * MaxPlay Native Kotlin MainActivity
 * ----------------------------------------------------------------------
 * Hosts the MaxPlay application in a hardware-accelerated, CORS-free Android WebView:
 * - Disables universal file & cross-origin security blocks (`allowUniversalAccessFromFileURLs = true`)
 * - Registers `window.MaxPlayNative` (@JavascriptInterface) for inbuilt stream scraping & segment downloads
 * - Supports both bundled local offline assets (`file:///android_asset/webapp/index.html`)
 *   and live remote cloud synchronization
 */
class MainActivity : AppCompatActivity() {

    private lateinit var rootContainer: FrameLayout
    private lateinit var webView: WebView
    private var customFullscreenView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null
    private var fileUploadCallback: android.webkit.ValueCallback<Array<android.net.Uri>>? = null
    private val bgNotificationScheduler = java.util.concurrent.Executors.newSingleThreadScheduledExecutor()
    @Volatile
    var autoPipEnabled: Boolean = true
    @Volatile
    var isVideoCurrentlyPlaying: Boolean = false
    private var popunderDialog: android.app.Dialog? = null
    private var popunderWebView: WebView? = null

    fun getScraperContainer(): ViewGroup = rootContainer

    companion object {
        // Primary entry: HTTPS virtual origin mapped to assets/webapp/ inside APK (avoids file:// ES module & path block!)
        const val LOCAL_BUNDLE_URL = "https://appassets.androidplatform.net/index.html"
        const val LOCAL_ADMIN_BUNDLE_URL = "https://appassets.androidplatform.net/admin.html"
        const val LIVE_APP_URL = "https://ais-pre-yzg6gpi5jxavdg2ivlhyef-775675507395.asia-southeast1.run.app"
        const val LIVE_ADMIN_URL = "https://ais-pre-yzg6gpi5jxavdg2ivlhyef-775675507395.asia-southeast1.run.app/admin.html"
        const val FIRESTORE_MESSAGES_REST_URL =
            "https://firestore.googleapis.com/v1/projects/gen-lang-client-0291911037/databases/ai-studio-maxplay-e5163e97-7cd5-4a42-875c-8b5dce9fd72d/documents/messages?pageSize=60"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            val prefs = getSharedPreferences("maxplay_native_prefs", MODE_PRIVATE)
            autoPipEnabled = prefs.getBoolean("auto_pip", true)
        } catch (_: Exception) {}

        // Keep screen on during streaming & downloads and use deep #0A0A0A status bar
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.statusBarColor = Color.parseColor("#0A0A0A")
        window.navigationBarColor = Color.parseColor("#0A0A0A")

        rootContainer = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#0A0A0A"))
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#0A0A0A"))
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        rootContainer.addView(webView)
        setContentView(rootContainer)

        configureCorsFreeWebView()

        val isAdminApp = packageName.endsWith(".admin", ignoreCase = true)

        // Load bundled webapp assets over HTTPS virtual origin if present in APK, otherwise load live MaxPlay URL
        val targetAssetFile = if (isAdminApp) "admin.html" else "index.html"
        val hasLocalBundle = try {
            assets.list("webapp")?.contains(targetAssetFile) == true
        } catch (_: Exception) {
            false
        }

        if (isAdminApp) {
            if (hasLocalBundle) {
                webView.loadUrl(LOCAL_ADMIN_BUNDLE_URL)
            } else {
                webView.loadUrl(LIVE_ADMIN_URL)
            }
        } else {
            if (hasLocalBundle) {
                webView.loadUrl(LOCAL_BUNDLE_URL)
            } else {
                webView.loadUrl(LIVE_APP_URL)
            }
        }

        // Create notification channel & request notification + microphone permissions upfront
        createNotificationChannel()
        requestStartupPermissions()

        // Start native background poller for Firestore Admin messages so notifications arrive even when minimized
        if (!isAdminApp) {
            startBackgroundAnnouncementMonitor()
        }

        // Check if launched from tapping a status-bar notification
        handleNotificationIntent(intent)

        // Handle Android hardware Back button (Triangle button) smoothly via React SPA handler first
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (isNativePopunderAdOpen()) {
                    closeNativePopunderAd()
                    return
                }
                if (customFullscreenView != null) {
                    webView.webChromeClient?.onHideCustomView()
                    return
                }
                webView.evaluateJavascript(
                    "(function() { return typeof window.__handleMaxPlayHardwareBack === 'function' ? String(window.__handleMaxPlayHardwareBack()) : 'UNHANDLED'; })()"
                ) { result ->
                    val clean = result?.trim()?.removeSurrounding("\"") ?: "UNHANDLED"
                    if (clean == "HANDLED") {
                        // Handled inside React SPA (popped screen, closed modal, or showed exit confirmation)
                        return@evaluateJavascript
                    } else if (clean == "EXIT_CONFIRMED") {
                        finish()
                    } else if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            }
        })
    }

    override fun onNewIntent(intent: android.content.Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleNotificationIntent(intent)
    }

    private fun handleNotificationIntent(intent: android.content.Intent?) {
        if (intent?.getBooleanExtra("open_messages", false) == true) {
            intent.removeExtra("open_messages")
            webView.postDelayed({
                try {
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('MAXPLAY_OPEN_MESSAGES_SCREEN'));",
                        null
                    )
                } catch (_: Exception) {}
            }, 900)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureCorsFreeWebView() {
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            allowContentAccess = true

            // Critical: Disable browser CORS restrictions for local & cross-origin requests!
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = true
            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = true

            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            userAgentString = InbuiltStreamScraper.DEFAULT_USER_AGENT
        }

        // Attach Native Kotlin Bridge (`window.MaxPlayNative`)
        webView.addJavascriptInterface(MaxPlayNativeBridge(this, webView), "MaxPlayNative")

        // Attach CORS-Free OkHttp Interceptor & HTTPS Local Asset Client
        webView.webViewClient = CorsFreeWebViewClient(this)

        // Fullscreen HTML5 Video, File Chooser (Local Video & .maxplay Receive), Microphone Permission & Orientation Handler
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: android.webkit.PermissionRequest?) {
                runOnUiThread {
                    try {
                        request?.grant(request.resources)
                    } catch (_: Exception) {}
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: android.webkit.ValueCallback<Array<android.net.Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                try {
                    fileUploadCallback?.onReceiveValue(null)
                    fileUploadCallback = filePathCallback

                    val acceptTypes = fileChooserParams?.acceptTypes ?: emptyArray()
                    val wantsVideo = acceptTypes.any { it.contains("video", ignoreCase = true) }

                    val pickerIntent = android.content.Intent(android.content.Intent.ACTION_GET_CONTENT).apply {
                        addCategory(android.content.Intent.CATEGORY_OPENABLE)
                        type = if (wantsVideo) "video/*" else "*/*"
                    }
                    @Suppress("DEPRECATION")
                    startActivityForResult(
                        android.content.Intent.createChooser(pickerIntent, "Select File for MaxPlay"),
                        3002
                    )
                    return true
                } catch (_: Exception) {
                    fileUploadCallback = null
                    return false
                }
            }

            override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                if (customFullscreenView != null) {
                    callback?.onCustomViewHidden()
                    return
                }
                customFullscreenView = view
                customViewCallback = callback
                webView.visibility = View.GONE
                rootContainer.addView(
                    view,
                    FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                )
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                setImmersiveSystemUi(true)
            }

            override fun onHideCustomView() {
                val view = customFullscreenView ?: return
                rootContainer.removeView(view)
                customFullscreenView = null
                customViewCallback?.onCustomViewHidden()
                customViewCallback = null
                webView.visibility = View.VISIBLE
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                setImmersiveSystemUi(false)
            }
        }
    }

    private fun setImmersiveSystemUi(fullscreen: Boolean) {
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        if (fullscreen) {
            controller.hide(WindowInsetsCompat.Type.systemBars())
            controller.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        } else {
            controller.show(WindowInsetsCompat.Type.systemBars())
        }
    }

    /**
     * Adjusts Android hardware window screen brightness (10 to 100%).
     */
    fun setHardwareBrightness(percent: Int) {
        runOnUiThread {
            try {
                val clamped = percent.coerceIn(5, 100)
                val lp = window.attributes
                lp.screenBrightness = (clamped / 100f).coerceIn(0.05f, 1.0f)
                window.attributes = lp
            } catch (_: Exception) {}
        }
    }

    /**
     * Reads current hardware window screen brightness (10 to 100%).
     */
    fun getHardwareBrightness(): Int {
        return try {
            val current = window.attributes.screenBrightness
            if (current < 0f) {
                val sys = android.provider.Settings.System.getInt(
                    contentResolver,
                    android.provider.Settings.System.SCREEN_BRIGHTNESS,
                    128
                )
                ((sys / 255f) * 100f).toInt().coerceIn(10, 100)
            } else {
                (current * 100f).toInt().coerceIn(10, 100)
            }
        } catch (_: Exception) {
            75
        }
    }

    /**
     * Adjusts Android STREAM_MUSIC hardware volume (0 to 100%).
     */
    fun setHardwareVolume(percent: Int) {
        try {
            val audioManager = getSystemService(AUDIO_SERVICE) as? android.media.AudioManager ?: return
            val maxVol = audioManager.getStreamMaxVolume(android.media.AudioManager.STREAM_MUSIC).coerceAtLeast(1)
            val clamped = percent.coerceIn(0, 100)
            val targetVol = Math.round((clamped / 100f) * maxVol).coerceIn(0, maxVol)
            audioManager.setStreamVolume(android.media.AudioManager.STREAM_MUSIC, targetVol, 0)
        } catch (_: Exception) {}
    }

    /**
     * Reads current Android STREAM_MUSIC hardware volume percentage (0 to 100%).
     */
    fun getHardwareVolume(): Int {
        return try {
            val audioManager = getSystemService(AUDIO_SERVICE) as? android.media.AudioManager ?: return 100
            val maxVol = audioManager.getStreamMaxVolume(android.media.AudioManager.STREAM_MUSIC).coerceAtLeast(1)
            val curVol = audioManager.getStreamVolume(android.media.AudioManager.STREAM_MUSIC)
            Math.round((curVol.toFloat() / maxVol.toFloat()) * 100f).coerceIn(0, 100)
        } catch (_: Exception) {
            100
        }
    }

    /**
     * Dynamically sets the Android top system Status Bar color (where time, network, and battery indicators sit)
     * to match the Hero Banner's ambient glow color.
     */
    fun setStatusBarColorHex(hexColor: String) {
        runOnUiThread {
            try {
                window.statusBarColor = Color.parseColor(hexColor)
            } catch (_: Exception) {
                window.statusBarColor = Color.parseColor("#0A0A0A")
            }
        }
    }

    fun setAutoPipPreference(enabled: Boolean) {
        autoPipEnabled = enabled
        try {
            getSharedPreferences("maxplay_native_prefs", MODE_PRIVATE)
                .edit()
                .putBoolean("auto_pip", enabled)
                .apply()
        } catch (_: Exception) {}
    }

    fun setVideoPlayingState(isPlaying: Boolean) {
        isVideoCurrentlyPlaying = isPlaying
    }

    /**
     * Automatically triggers Native Android Picture-in-Picture (PiP) when the user presses Home / minimizes the app
     * while a video is actively playing and Auto-Miniplayer is enabled in Settings.
     */
    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (autoPipEnabled && isVideoCurrentlyPlaying) {
            enterNativePipMode()
        }
    }

    /**
     * Enters native Android Picture-in-Picture (PiP) floating window mode (Android 8.0+).
     * Immediately notifies the React player so ONLY the video player fills the PiP window.
     */
    fun enterNativePipMode(): Boolean {
        return try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                runOnUiThread {
                    try {
                        webView.evaluateJavascript(
                            "window.__onMaxPlayPipModeChanged && window.__onMaxPlayPipModeChanged(true);",
                            null
                        )
                        val params = android.app.PictureInPictureParams.Builder()
                            .setAspectRatio(android.util.Rational(16, 9))
                            .build()
                        enterPictureInPictureMode(params)
                    } catch (_: Exception) {}
                }
                true
            } else {
                false
            }
        } catch (_: Exception) {
            false
        }
    }

    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean,
        newConfig: android.content.res.Configuration
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        runOnUiThread {
            try {
                webView.evaluateJavascript(
                    "window.__onMaxPlayPipModeChanged && window.__onMaxPlayPipModeChanged($isInPictureInPictureMode);",
                    null
                )
            } catch (_: Exception) {}
        }
    }

    private fun createNotificationChannel() {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                val channel = android.app.NotificationChannel(
                    "maxplay_inbox_alerts",
                    "MaxPlay Messages & Updates",
                    android.app.NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Real-time notifications for MaxPlay inbox messages and updates"
                    enableVibration(true)
                }
                val nm = getSystemService(NOTIFICATION_SERVICE) as? android.app.NotificationManager
                nm?.createNotificationChannel(channel)
            }
        } catch (_: Exception) {}
    }

    private fun requestStartupPermissions() {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                val needed = mutableListOf<String>()
                if (android.os.Build.VERSION.SDK_INT >= 33) {
                    if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        needed.add("android.permission.POST_NOTIFICATIONS")
                    }
                    if (checkSelfPermission("android.permission.READ_MEDIA_VIDEO") != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        needed.add("android.permission.READ_MEDIA_VIDEO")
                    }
                } else {
                    if (checkSelfPermission(android.Manifest.permission.READ_EXTERNAL_STORAGE) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        needed.add(android.Manifest.permission.READ_EXTERNAL_STORAGE)
                    }
                }
                if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    needed.add(android.Manifest.permission.RECORD_AUDIO)
                }
                if (needed.isNotEmpty()) {
                    requestPermissions(needed.toTypedArray(), 1001)
                }
            }
        } catch (_: Exception) {}
    }

    fun requestVideoStoragePermission(): Boolean {
        return try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                val perm = if (android.os.Build.VERSION.SDK_INT >= 33) {
                    "android.permission.READ_MEDIA_VIDEO"
                } else {
                    android.Manifest.permission.READ_EXTERNAL_STORAGE
                }
                if (checkSelfPermission(perm) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    runOnUiThread {
                        try {
                            requestPermissions(arrayOf(perm), 1002)
                        } catch (_: Exception) {}
                    }
                    return true
                }
            }
            false
        } catch (_: Exception) {
            false
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1001 || requestCode == 1002) {
            runOnUiThread {
                try {
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('MAXPLAY_LOCAL_VIDEOS_PERMISSION_GRANTED')); window.dispatchEvent(new CustomEvent('MAXPLAY_NOTIFICATION_PERMISSION_GRANTED'));",
                        null
                    )
                } catch (_: Exception) {}
            }
        }
    }

    /**
     * Triggers a real native Android status-bar notification with optional BigPictureStyle attached image & tap-to-open intent.
     */
    fun showNativeStatusNotification(title: String, body: String, imageUrl: String = "") {
        InbuiltStreamScraper.backgroundExecutor.execute {
            val bitmap: android.graphics.Bitmap? = if (imageUrl.startsWith("http", ignoreCase = true)) {
                try {
                    val req = okhttp3.Request.Builder()
                        .url(imageUrl)
                        .header("User-Agent", InbuiltStreamScraper.DEFAULT_USER_AGENT)
                        .build()
                    InbuiltStreamScraper.okHttpClient.newCall(req).execute().use { resp ->
                        if (resp.isSuccessful) {
                            val bytes = resp.body?.bytes()
                            if (bytes != null && bytes.isNotEmpty()) {
                                android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                            } else null
                        } else null
                    }
                } catch (_: Exception) {
                    null
                }
            } else null

            val appLogoBitmap: android.graphics.Bitmap? = try {
                android.graphics.BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher)
            } catch (_: Exception) {
                null
            }

            runOnUiThread {
                try {
                    val nm = getSystemService(NOTIFICATION_SERVICE) as? android.app.NotificationManager ?: return@runOnUiThread
                    val intent = android.content.Intent(this, MainActivity::class.java).apply {
                        flags = android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP or android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP
                        putExtra("open_messages", true)
                    }
                    val pendingFlags = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                        android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
                    } else {
                        android.app.PendingIntent.FLAG_UPDATE_CURRENT
                    }
                    val pendingIntent = android.app.PendingIntent.getActivity(this, 2001, intent, pendingFlags)

                    val builder = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        android.app.Notification.Builder(this, "maxplay_inbox_alerts")
                    } else {
                        @Suppress("DEPRECATION")
                        android.app.Notification.Builder(this)
                    }

                    builder.setSmallIcon(R.drawable.ic_stat_maxplay)
                        .setContentTitle(title.ifBlank { "MaxPlay" })
                        .setContentText(body)
                        .setAutoCancel(true)
                        .setContentIntent(pendingIntent)

                    if (bitmap != null) {
                        builder.setLargeIcon(bitmap)
                        builder.setStyle(
                            android.app.Notification.BigPictureStyle()
                                .bigPicture(bitmap)
                                .setBigContentTitle(title.ifBlank { "MaxPlay" })
                                .setSummaryText(body)
                        )
                    } else {
                        if (appLogoBitmap != null) {
                            builder.setLargeIcon(appLogoBitmap)
                        }
                        builder.setStyle(
                            android.app.Notification.BigTextStyle()
                                .setBigContentTitle(title.ifBlank { "MaxPlay" })
                                .bigText(body)
                        )
                    }

                    val notifId = ((title + "|" + body).hashCode() and 0x7FFFFFFF).coerceAtLeast(1000)
                    nm.notify(notifId, builder.build())
                } catch (_: Exception) {}
            }
        }
    }

    /**
     * Background poller that checks Firestore `messages` collection every 15 seconds so users receive
     * instant status-bar notifications (with attached image!) even when the app is minimized in background.
     */
    private fun startBackgroundAnnouncementMonitor() {
        bgNotificationScheduler.scheduleWithFixedDelay({
            try {
                if (android.os.Build.VERSION.SDK_INT >= 33) {
                    if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        return@scheduleWithFixedDelay
                    }
                }

                val prefs = getSharedPreferences("maxplay_native_notifs", MODE_PRIVATE)
                val isInitialized = prefs.getBoolean("initialized", false)
                val seenSet = HashSet(prefs.getStringSet("seen_doc_ids", emptySet()) ?: emptySet())

                val req = okhttp3.Request.Builder()
                    .url(FIRESTORE_MESSAGES_REST_URL)
                    .header("User-Agent", InbuiltStreamScraper.DEFAULT_USER_AGENT)
                    .build()

                InbuiltStreamScraper.okHttpClient.newCall(req).execute().use { resp ->
                    if (!resp.isSuccessful) return@use
                    val bodyStr = resp.body?.string() ?: return@use
                    val root = org.json.JSONObject(bodyStr)
                    val docs = root.optJSONArray("documents") ?: return@use

                    var newestNewTitle = ""
                    var newestNewBody = ""
                    var newestNewImg = ""
                    var newestTimestamp = ""

                    for (i in 0 until docs.length()) {
                        val doc = docs.optJSONObject(i) ?: continue
                        val fullName = doc.optString("name", "")
                        val docId = fullName.substringAfterLast("/")
                        if (docId.isBlank()) continue

                        val fields = doc.optJSONObject("fields") ?: continue
                        val targetType = fields.optJSONObject("targetType")?.optString("stringValue", "all") ?: "all"
                        if (targetType == "user") continue

                        if (!seenSet.contains(docId)) {
                            seenSet.add(docId)
                            val createdAt = fields.optJSONObject("createdAt")?.optString("stringValue", "")
                                ?: doc.optString("createTime", "")
                            if (newestNewTitle.isBlank() || createdAt >= newestTimestamp) {
                                newestTimestamp = createdAt
                                newestNewTitle = fields.optJSONObject("title")?.optString("stringValue", "") ?: ""
                                newestNewBody = fields.optJSONObject("body")?.optString("stringValue", "") ?: "New update in MaxPlay"
                                val bannerUrl = fields.optJSONObject("bannerUrl")?.optString("stringValue", "") ?: ""
                                val imageUrl = fields.optJSONObject("imageUrl")?.optString("stringValue", "") ?: ""
                                val attachedFields = fields.optJSONObject("attachedContent")
                                    ?.optJSONObject("mapValue")
                                    ?.optJSONObject("fields")
                                val backdropUrl = attachedFields?.optJSONObject("backdropUrl")?.optString("stringValue", "") ?: ""
                                val posterUrl = attachedFields?.optJSONObject("posterUrl")?.optString("stringValue", "") ?: ""
                                newestNewImg = listOf(bannerUrl, imageUrl, backdropUrl, posterUrl).firstOrNull { it.isNotBlank() } ?: ""
                            }
                        }
                    }

                    prefs.edit()
                        .putBoolean("initialized", true)
                        .putStringSet("seen_doc_ids", seenSet)
                        .apply()

                    // Notify immediately when a new announcement is published
                    if (isInitialized && newestNewTitle.isNotBlank()) {
                        showNativeStatusNotification(newestNewTitle, newestNewBody, newestNewImg)
                    }
                }
            } catch (_: Exception) {}
        }, 6, 15, java.util.concurrent.TimeUnit.SECONDS)
    }

    /**
     * Shares an exported `.maxplay` container file using Android's native Share Sheet (Quick Share / Bluetooth / WhatsApp / Save).
     */
    fun shareMaxPlayFile(file: java.io.File): Boolean {
        return try {
            runOnUiThread {
                try {
                    val builder = android.os.StrictMode.VmPolicy.Builder()
                    android.os.StrictMode.setVmPolicy(builder.build())
                    val uri = android.net.Uri.fromFile(file)
                    val sendIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                        type = "application/octet-stream"
                        putExtra(android.content.Intent.EXTRA_STREAM, uri)
                        putExtra(android.content.Intent.EXTRA_TITLE, file.name)
                        putExtra(
                            android.content.Intent.EXTRA_TEXT,
                            "Open this .maxplay file in MaxPlay > Downloads > Transfer > Receive Files."
                        )
                        addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    startActivity(android.content.Intent.createChooser(sendIntent, "Send ${file.name} via"))
                } catch (_: Exception) {}
            }
            true
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Launches Android's built-in Speech Recognizer intent and delivers spoken text to `window.__onMaxPlayVoiceResult(text)`.
     */
    fun startNativeVoiceInput() {
        runOnUiThread {
            try {
                val intent = android.content.Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(
                        android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                        android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                    )
                    putExtra(android.speech.RecognizerIntent.EXTRA_PROMPT, "Speak movie, series, or anime name...")
                }
                @Suppress("DEPRECATION")
                startActivityForResult(intent, 3001)
            } catch (_: Exception) {
                webView.evaluateJavascript(
                    "window.__onMaxPlayVoiceResult && window.__onMaxPlayVoiceResult('');",
                    null
                )
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 3001) {
            val matches = data?.getStringArrayListExtra(android.speech.RecognizerIntent.EXTRA_RESULTS)
            val spoken = matches?.firstOrNull()?.trim() ?: ""
            val escaped = org.json.JSONObject.quote(spoken)
            webView.evaluateJavascript(
                "window.__onMaxPlayVoiceResult && window.__onMaxPlayVoiceResult($escaped);",
                null
            )
        } else if (requestCode == 3002) {
            val callback = fileUploadCallback
            fileUploadCallback = null
            if (resultCode == RESULT_OK && data != null) {
                val results = WebChromeClient.FileChooserParams.parseResult(resultCode, data)
                    ?: data.data?.let { arrayOf(it) }
                callback?.onReceiveValue(results)
            } else {
                callback?.onReceiveValue(null)
            }
        } else if (requestCode == 3005) {
            val pendingFile = pendingApkInstallFile
            if (pendingFile != null && pendingFile.exists()) {
                launchAndroidPackageInstaller(pendingFile)
            }
        }
    }

    private var pendingApkInstallFile: java.io.File? = null

    private fun emitApkUpdateProgress(
        status: String,
        progress: Int,
        downloadedMb: Double,
        totalMb: Double,
        version: String,
        message: String
    ) {
        runOnUiThread {
            try {
                val payload = org.json.JSONObject().apply {
                    put("status", status)
                    put("progress", progress)
                    put("downloadedMb", downloadedMb)
                    put("totalMb", totalMb)
                    put("version", version)
                    put("message", message)
                }.toString()
                webView.evaluateJavascript(
                    "window.__onMaxPlayApkUpdateProgress && window.__onMaxPlayApkUpdateProgress($payload);",
                    null
                )
            } catch (_: Exception) {}
        }
    }

    /**
     * Downloads the Admin's APK update in the background with live 0% -> 100% progress
     * and launches Android's native Package Installer automatically when complete.
     */
    fun startNativeApkUpdate(apkUrl: String, versionName: String, title: String) {
        val cleanUrl = apkUrl.trim()
        if (cleanUrl.isBlank()) {
            emitApkUpdateProgress("error", 0, 0.0, 0.0, versionName, "Invalid APK download link.")
            return
        }

        kotlin.concurrent.thread(start = true, name = "MaxPlayApkUpdater") {
            try {
                val safeVer = versionName.replace(Regex("[^a-zA-Z0-9._-]"), "_").ifBlank { "latest" }
                val updateDir = java.io.File(externalCacheDir ?: cacheDir, "apk_updates")
                if (!updateDir.exists()) updateDir.mkdirs()
                val apkFile = java.io.File(updateDir, "MaxPlay_Update_$safeVer.apk")
                if (apkFile.exists()) apkFile.delete()

                emitApkUpdateProgress("downloading", 2, 0.0, 0.0, versionName, "Connecting to update server...")

                val req = okhttp3.Request.Builder()
                    .url(cleanUrl)
                    .header("User-Agent", InbuiltStreamScraper.DEFAULT_USER_AGENT)
                    .build()

                InbuiltStreamScraper.okHttpClient.newCall(req).execute().use { resp ->
                    if (!resp.isSuccessful) {
                        throw Exception("Server returned HTTP ${resp.code}")
                    }
                    val body = resp.body ?: throw Exception("Empty APK stream")
                    val contentLength = body.contentLength()
                    val totalMb = if (contentLength > 0) (contentLength.toDouble() / (1024.0 * 1024.0)) else 42.0

                    body.byteStream().use { input ->
                        java.io.FileOutputStream(apkFile).use { output ->
                            val buffer = ByteArray(32 * 1024)
                            var bytesRead: Int
                            var totalRead = 0L
                            var lastEmitTime = 0L

                            while (input.read(buffer).also { bytesRead = it } != -1) {
                                output.write(buffer, 0, bytesRead)
                                totalRead += bytesRead
                                val now = System.currentTimeMillis()
                                if (now - lastEmitTime >= 150) {
                                    lastEmitTime = now
                                    val dlMb = totalRead.toDouble() / (1024.0 * 1024.0)
                                    val pct = if (contentLength > 0) {
                                        ((totalRead * 100L) / contentLength).toInt().coerceIn(3, 99)
                                    } else {
                                        ((dlMb / totalMb) * 95.0).toInt().coerceIn(5, 95)
                                    }
                                    emitApkUpdateProgress(
                                        "downloading",
                                        pct,
                                        Math.round(dlMb * 10.0) / 10.0,
                                        Math.round(totalMb * 10.0) / 10.0,
                                        versionName,
                                        "Downloading MaxPlay $versionName ($pct%)..."
                                    )
                                }
                            }
                            output.flush()
                        }
                    }

                    val finalMb = Math.round((apkFile.length().toDouble() / (1024.0 * 1024.0)) * 10.0) / 10.0
                    emitApkUpdateProgress(
                        "installing",
                        100,
                        finalMb,
                        finalMb,
                        versionName,
                        "Download complete! Launching Android App Installer..."
                    )
                    showNativeStatusNotification(
                        title.ifBlank { "MaxPlay $versionName Downloaded" },
                        "Tap to install the latest MaxPlay APK update.",
                        ""
                    )
                    installDownloadedApk(apkFile)
                }
            } catch (e: Exception) {
                // If direct stream failed (e.g., webpage hosting link like Google Drive / Mega / GitHub release page),
                // open in Android system browser / downloader as seamless fallback
                emitApkUpdateProgress(
                    "browser_fallback",
                    100,
                    0.0,
                    0.0,
                    versionName,
                    "Opening official APK installer download..."
                )
                runOnUiThread {
                    try {
                        val browserIntent = android.content.Intent(
                            android.content.Intent.ACTION_VIEW,
                            android.net.Uri.parse(cleanUrl)
                        ).apply {
                            addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(browserIntent)
                    } catch (_: Exception) {}
                }
            }
        }
    }

    private fun installDownloadedApk(apkFile: java.io.File) {
        runOnUiThread {
            try {
                pendingApkInstallFile = apkFile
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    if (!packageManager.canRequestPackageInstalls()) {
                        val permIntent = android.content.Intent(
                            android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            android.net.Uri.parse("package:$packageName")
                        )
                        @Suppress("DEPRECATION")
                        startActivityForResult(permIntent, 3005)
                        return@runOnUiThread
                    }
                }
                launchAndroidPackageInstaller(apkFile)
            } catch (_: Exception) {}
        }
    }

    private fun launchAndroidPackageInstaller(apkFile: java.io.File) {
        try {
            val apkUri: android.net.Uri = try {
                androidx.core.content.FileProvider.getUriForFile(
                    this,
                    "$packageName.fileprovider",
                    apkFile
                )
            } catch (_: Exception) {
                val builder = android.os.StrictMode.VmPolicy.Builder()
                android.os.StrictMode.setVmPolicy(builder.build())
                android.net.Uri.fromFile(apkFile)
            }

            val installIntent = android.content.Intent(android.content.Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(installIntent)
        } catch (_: Exception) {}
    }

    fun isNativePopunderAdOpen(): Boolean {
        return try {
            popunderDialog?.isShowing == true
        } catch (_: Exception) {
            false
        }
    }

    fun closeNativePopunderAd(): Boolean {
        runOnUiThread {
            try {
                popunderWebView?.apply {
                    stopLoading()
                    loadUrl("about:blank")
                    destroy()
                }
            } catch (_: Exception) {}
            popunderWebView = null
            try {
                if (popunderDialog?.isShowing == true) {
                    popunderDialog?.dismiss()
                }
            } catch (_: Exception) {}
            popunderDialog = null
        }
        return true
    }

    @SuppressLint("SetJavaScriptEnabled")
    fun openNativePopunderAd(adUrl: String): Boolean {
        val cleanUrl = adUrl.trim()
        if (cleanUrl.isBlank()) return false
        runOnUiThread {
            try {
                if (popunderDialog?.isShowing == true) return@runOnUiThread

                val dialog = android.app.Dialog(this, android.R.style.Theme_Black_NoTitleBar)
                dialog.setCancelable(true)
                dialog.setOnCancelListener {
                    closeNativePopunderAd()
                }
                dialog.setOnKeyListener { _, keyCode, event ->
                    if (keyCode == android.view.KeyEvent.KEYCODE_BACK && event.action == android.view.KeyEvent.ACTION_UP) {
                        closeNativePopunderAd()
                        true
                    } else {
                        false
                    }
                }

                val density = resources.displayMetrics.density
                val container = android.widget.LinearLayout(this).apply {
                    orientation = android.widget.LinearLayout.VERTICAL
                    setBackgroundColor(Color.parseColor("#0A0A0A"))
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                }

                val topBar = android.widget.LinearLayout(this).apply {
                    orientation = android.widget.LinearLayout.HORIZONTAL
                    gravity = android.view.Gravity.CENTER_VERTICAL
                    setBackgroundColor(Color.parseColor("#121216"))
                    val padH = (14 * density).toInt()
                    val padV = (10 * density).toInt()
                    setPadding(padH, padV, padH, padV)
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                    )
                }

                val labelView = android.widget.TextView(this).apply {
                    text = "Sponsored • Press Back to return to MaxPlay"
                    setTextColor(Color.parseColor("#A1A1AA"))
                    textSize = 12f
                    typeface = android.graphics.Typeface.DEFAULT_BOLD
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        0,
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        1f
                    )
                }

                val closeBtn = android.widget.TextView(this).apply {
                    text = "✕ Return to Video"
                    setTextColor(Color.WHITE)
                    textSize = 12f
                    typeface = android.graphics.Typeface.DEFAULT_BOLD
                    val padBtnH = (14 * density).toInt()
                    val padBtnV = (6 * density).toInt()
                    setPadding(padBtnH, padBtnV, padBtnH, padBtnV)
                    background = android.graphics.drawable.GradientDrawable(
                        android.graphics.drawable.GradientDrawable.Orientation.TL_BR,
                        intArrayOf(Color.parseColor("#8B5CF6"), Color.parseColor("#6366F1"))
                    ).apply {
                        cornerRadius = 999f
                    }
                    setOnClickListener {
                        closeNativePopunderAd()
                    }
                }

                topBar.addView(labelView)
                topBar.addView(closeBtn)

                var triedFallback = false

                val adWeb = WebView(this).apply {
                    setBackgroundColor(Color.parseColor("#0A0A0A"))
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        0,
                        1f
                    )
                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        mediaPlaybackRequiresUserGesture = false
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        userAgentString = InbuiltStreamScraper.DEFAULT_USER_AGENT
                        setSupportMultipleWindows(false)
                        javaScriptCanOpenWindowsAutomatically = true
                    }
                    CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)

                    webViewClient = object : android.webkit.WebViewClient() {
                        private fun handleAdUrl(view: WebView?, rawTarget: String?): Boolean {
                            val target = rawTarget?.trim() ?: return true
                            if (target.startsWith("http://", ignoreCase = true) ||
                                target.startsWith("https://", ignoreCase = true)
                            ) {
                                return false
                            }
                            if (target.startsWith("intent://", ignoreCase = true)) {
                                try {
                                    val parsedIntent = android.content.Intent.parseUri(
                                        target,
                                        android.content.Intent.URI_INTENT_SCHEME
                                    )
                                    val fallbackUrl = parsedIntent.getStringExtra("browser_fallback_url")
                                    if (!fallbackUrl.isNullOrBlank() &&
                                        (fallbackUrl.startsWith("http://", ignoreCase = true) ||
                                            fallbackUrl.startsWith("https://", ignoreCase = true))
                                    ) {
                                        view?.loadUrl(fallbackUrl)
                                        return true
                                    }
                                    if (parsedIntent.resolveActivity(packageManager) != null) {
                                        parsedIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                                        startActivity(parsedIntent)
                                    }
                                } catch (_: Exception) {}
                                return true
                            }
                            if (target.startsWith("market://", ignoreCase = true)) {
                                try {
                                    val playHttp = "https://play.google.com/store/apps/" + target.removePrefix("market://")
                                    view?.loadUrl(playHttp)
                                } catch (_: Exception) {}
                                return true
                            }
                            // Suppress unknown custom protocols (e.g. tg://, whatsapp://, fb://) from showing WebView error page
                            return true
                        }

                        private fun handleMainFrameError(view: WebView?, failingUrl: String?) {
                            try {
                                view?.stopLoading()
                                // Immediately hide default Android WebView "Web page not available (net::ERR_SSL_PROTOCOL_ERROR)" page
                                view?.loadDataWithBaseURL(
                                    null,
                                    "<html><body style='background:#0A0A0A;color:#71717A;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-size:13px;'>Loading sponsored content...</body></html>",
                                    "text/html",
                                    "UTF-8",
                                    null
                                )
                            } catch (_: Exception) {}

                            val target = (failingUrl ?: cleanUrl).trim()
                            if (!triedFallback && target.isNotBlank()) {
                                triedFallback = true
                                Thread {
                                    fun fetchAdFallbackHtml(urlToFetch: String): String? {
                                        return try {
                                            val req = okhttp3.Request.Builder()
                                                .url(urlToFetch)
                                                .header("User-Agent", InbuiltStreamScraper.DEFAULT_USER_AGENT)
                                                .build()
                                            InbuiltStreamScraper.okHttpClient.newCall(req).execute().use { res ->
                                                if (res.isSuccessful) res.body?.string() else null
                                            }
                                        } catch (_: Exception) {
                                            null
                                        }
                                    }

                                    var recoveredHtml: String? = null
                                    var recoveredBaseUrl: String = target
                                    try {
                                        recoveredHtml = fetchAdFallbackHtml(target)
                                        if (recoveredHtml.isNullOrBlank() && target.startsWith("https://", ignoreCase = true)) {
                                            val httpUrl = "http://" + target.substring(8)
                                            recoveredBaseUrl = httpUrl
                                            recoveredHtml = fetchAdFallbackHtml(httpUrl)
                                        }
                                    } catch (_: Exception) {}

                                    runOnUiThread {
                                        if (popunderDialog?.isShowing != true) return@runOnUiThread
                                        if (!recoveredHtml.isNullOrBlank() && recoveredHtml.length > 64) {
                                            try {
                                                view?.loadDataWithBaseURL(
                                                    recoveredBaseUrl,
                                                    recoveredHtml,
                                                    "text/html",
                                                    "UTF-8",
                                                    null
                                                )
                                            } catch (_: Exception) {
                                                closeNativePopunderAd()
                                            }
                                        } else {
                                            // ISP completely blocked the ad domain — close silently so user never sees an error screen
                                            closeNativePopunderAd()
                                        }
                                    }
                                }.start()
                            } else {
                                closeNativePopunderAd()
                            }
                        }

                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: android.webkit.WebResourceRequest?
                        ): Boolean {
                            return handleAdUrl(view, request?.url?.toString())
                        }

                        @Deprecated("Deprecated in Java")
                        override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                            return handleAdUrl(view, url)
                        }

                        override fun onReceivedError(
                            view: WebView?,
                            request: android.webkit.WebResourceRequest?,
                            error: android.webkit.WebResourceError?
                        ) {
                            if (request == null || request.isForMainFrame) {
                                handleMainFrameError(view, request?.url?.toString())
                            }
                        }

                        @Deprecated("Deprecated in Java")
                        override fun onReceivedError(
                            view: WebView?,
                            errorCode: Int,
                            description: String?,
                            failingUrl: String?
                        ) {
                            handleMainFrameError(view, failingUrl)
                        }

                        @SuppressLint("WebViewClientOnReceivedSslError")
                        override fun onReceivedSslError(
                            view: WebView?,
                            handler: android.webkit.SslErrorHandler?,
                            error: android.net.http.SslError?
                        ) {
                            handler?.proceed()
                        }
                    }
                }

                container.addView(topBar)
                container.addView(adWeb)
                dialog.setContentView(container)

                popunderDialog = dialog
                popunderWebView = adWeb
                dialog.show()
                adWeb.loadUrl(cleanUrl)
            } catch (_: Exception) {}
        }
        return true
    }

    override fun onDestroy() {
        try {
            closeNativePopunderAd()
            bgNotificationScheduler.shutdownNow()
            MaxPlayOfflineVault.stopDirectTransferServer()
        } catch (_: Exception) {}
        super.onDestroy()
    }
}
