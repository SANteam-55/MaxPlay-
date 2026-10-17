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

    companion object {
        // Primary entry: HTTPS virtual origin mapped to assets/webapp/ inside APK (avoids file:// ES module & path block!)
        const val LOCAL_BUNDLE_URL = "https://appassets.androidplatform.net/index.html"
        const val LIVE_APP_URL = "https://ais-pre-yzg6gpi5jxavdg2ivlhyef-775675507395.asia-southeast1.run.app"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

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

        // Load bundled webapp assets over HTTPS virtual origin if present in APK, otherwise load live MaxPlay URL
        val hasLocalBundle = try {
            assets.list("webapp")?.contains("index.html") == true
        } catch (_: Exception) {
            false
        }

        if (hasLocalBundle) {
            webView.loadUrl(LOCAL_BUNDLE_URL)
        } else {
            webView.loadUrl(LIVE_APP_URL)
        }

        // Handle Android hardware Back button smoothly inside SPA navigation & fullscreen
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (customFullscreenView != null) {
                    webView.webChromeClient?.onHideCustomView()
                } else if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
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

        // Fullscreen HTML5 Video & Orientation Handler
        webView.webChromeClient = object : WebChromeClient() {
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
}
