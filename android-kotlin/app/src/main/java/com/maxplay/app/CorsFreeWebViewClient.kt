package com.maxplay.app

import android.content.Context
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import okhttp3.Request
import java.io.ByteArrayInputStream

// MaxPlay CORS-Free WebViewClient & HTTPS Local Asset Server
// ----------------------------------------------------------------------
// 1. Serves bundled assets/webapp/ files over a real HTTPS virtual origin
//    (https://appassets.androidplatform.net/) so Vite ES Modules,
//    Tailwind CSS, Firebase Auth/Firestore, and IndexedDB work
//    with 100% compatibility and 0 black screen issues.
// 2. Fast-paths all Firebase, Google APIs, and image/poster/font requests
//    directly through Chromium's native HTTP/2 & disk-cache pipeline for
//    instant poster loading and zero UI lag.
// 3. Intercepts /api/proxy?url=... and cross-origin HLS streams (.m3u8, .ts, .m4s)
//    with matched Referer/Origin and Access-Control-Allow-Origin: *.
class CorsFreeWebViewClient(private val context: Context) : WebViewClient() {

    companion object {
        const val VIRTUAL_ASSET_HOST = "appassets.androidplatform.net"
        const val VIRTUAL_ASSET_ORIGIN = "https://appassets.androidplatform.net"

        // Stores custom Referer/Origin headers discovered per stream host domain & root domain
        val hostRefererMap = java.util.concurrent.ConcurrentHashMap<String, String>()

        @Volatile
        var lastActiveReferer: String? = null

        fun registerStreamReferer(streamUrl: String, refererUrl: String) {
            if (refererUrl.isBlank()) return
            lastActiveReferer = refererUrl
            try {
                val host = android.net.Uri.parse(streamUrl).host?.lowercase() ?: return
                hostRefererMap[host] = refererUrl
                val root = extractRootDomain(host)
                if (root.isNotEmpty()) {
                    hostRefererMap[root] = refererUrl
                }
            } catch (_: Exception) {
            }
        }

        fun resolveRefererForHost(host: String, fallbackScheme: String = "https"): String {
            val cleanHost = host.lowercase()
            hostRefererMap[cleanHost]?.let { return it }
            val root = extractRootDomain(cleanHost)
            if (root.isNotEmpty()) {
                hostRefererMap[root]?.let { return it }
            }
            return lastActiveReferer ?: "$fallbackScheme://$host/"
        }

        private fun extractRootDomain(host: String): String {
            val parts = host.split(".")
            return if (parts.size >= 2) {
                parts.takeLast(2).joinToString(".")
            } else {
                host
            }
        }
    }

    override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest?
    ): WebResourceResponse? {
        val uri = request?.url ?: return super.shouldInterceptRequest(view, request)
        val host = (uri.host ?: "").lowercase()
        val path = (uri.path ?: "/").lowercase()
        val reqUrl = uri.toString()
        val method = request.method?.uppercase() ?: "GET"

        // 0. Serve Local Offline Vault Segments & Playlists (https://maxplay.local/offline-vault/{key}/...)
        //    AND Scanned Phone Local Videos (https://maxplay.local/device-video/{id})
        if (host == "maxplay.local") {
            if (method == "OPTIONS") {
                return WebResourceResponse(
                    "text/plain",
                    "UTF-8",
                    200,
                    "OK",
                    buildCorsHeaders("text/plain"),
                    ByteArrayInputStream(ByteArray(0))
                )
            }
            if (path.startsWith("/offline-vault/")) {
                val vaultResp = MaxPlayOfflineVault.interceptOfflineVaultRequest(context.applicationContext, reqUrl)
                if (vaultResp != null) {
                    return vaultResp
                }
            } else if (path.startsWith("/device-video/")) {
                val rangeHeader = request.requestHeaders?.get("Range") ?: request.requestHeaders?.get("range")
                val devResp = MaxPlayOfflineVault.interceptDeviceVideoRequest(context.applicationContext, reqUrl, rangeHeader)
                if (devResp != null) {
                    return devResp
                }
            }
        }

        // 1. Serve Local Bundled WebApp & Native Proxy on https://appassets.androidplatform.net
        if (host == VIRTUAL_ASSET_HOST) {
            if (method == "OPTIONS") {
                return WebResourceResponse(
                    "text/plain",
                    "UTF-8",
                    200,
                    "OK",
                    buildCorsHeaders("text/plain"),
                    ByteArrayInputStream(ByteArray(0))
                )
            }

            val rawPath = uri.path ?: "/"

            // 1a. Native on-device /api/proxy?url=... handler (Zero CORS, Zero Cloud Timeout, Zero UI Thread Lock!)
            if (rawPath == "/api/proxy") {
                val targetUrl = uri.getQueryParameter("url")
                val explicitReferer = uri.getQueryParameter("referer")
                if (!targetUrl.isNullOrBlank()) {
                    if (!explicitReferer.isNullOrBlank()) {
                        registerStreamReferer(targetUrl, explicitReferer)
                    }
                    return proxyExternalUrlWithOkHttp(targetUrl, request, explicitReferer)
                }
            }

            // 1b. Disable PWA sw.js inside native APK since assets are already 100% local in APK
            if (rawPath == "/sw.js") {
                val noopSw = "// Native Android APK Asset Loader active".toByteArray(Charsets.UTF_8)
                return WebResourceResponse(
                    "application/javascript",
                    "UTF-8",
                    200,
                    "OK",
                    buildCorsHeaders("application/javascript"),
                    ByteArrayInputStream(noopSw)
                )
            }

            // 1c. Serve static file from assets/webapp/...
            val cleanPath = if (rawPath == "/" || rawPath.isEmpty()) {
                "index.html"
            } else {
                rawPath.removePrefix("/")
            }

            return try {
                val inputStream = context.assets.open("webapp/$cleanPath")
                val mime = getAssetMimeType(cleanPath)
                WebResourceResponse(
                    mime,
                    "UTF-8",
                    200,
                    "OK",
                    buildCorsHeaders(mime),
                    inputStream
                )
            } catch (_: Exception) {
                // SPA Route fallback: if path has no file extension, serve webapp/index.html
                if (!cleanPath.substringAfterLast('/').contains('.')) {
                    try {
                        val indexStream = context.assets.open("webapp/index.html")
                        WebResourceResponse(
                            "text/html",
                            "UTF-8",
                            200,
                            "OK",
                            buildCorsHeaders("text/html"),
                            indexStream
                        )
                    } catch (_: Exception) {
                        null
                    }
                } else {
                    null
                }
            }
        }

        // 2. FAST-PATH BYPASS: Never intercept Firebase, Google APIs, or Images/Posters/Fonts!
        //    Letting Chromium's native C++ HTTP/2 engine & disk cache handle these directly
        //    eliminates worker-thread bottlenecks and makes posters & Firestore data load instantly.
        if (host.contains("googleapis.com") ||
            host.contains("firebaseio.com") ||
            host.contains("firebaseapp.com") ||
            host.contains("gstatic.com") ||
            host.contains("google.com") ||
            host.contains("googleusercontent.com") ||
            host.contains("tmdb.org") ||
            host.contains("imgur.com") ||
            host.contains("ibb.co") ||
            host.contains("postimg.cc") ||
            host.contains("cloudinary.com") ||
            path.endsWith(".jpg") ||
            path.endsWith(".jpeg") ||
            path.endsWith(".png") ||
            path.endsWith(".webp") ||
            path.endsWith(".avif") ||
            path.endsWith(".gif") ||
            path.endsWith(".svg") ||
            path.endsWith(".ico") ||
            path.endsWith(".woff") ||
            path.endsWith(".woff2") ||
            path.endsWith(".ttf")
        ) {
            return null
        }

        // 3. Intercept external HLS manifests (.m3u8) and segments (.ts, .m4s, /hls2/) to inject Referer & CORS headers
        val lower = reqUrl.lowercase()
        val isHlsOrSegment =
            lower.contains(".m3u8") ||
                path.endsWith(".ts") ||
                path.endsWith(".m4s") ||
                lower.contains("/hls2/") ||
                host.contains("sprintcdn") ||
                host.contains("owphbf") ||
                lower.contains("master.txt") ||
                lower.contains("urlset")

        if (isHlsOrSegment && (lower.startsWith("http://") || lower.startsWith("https://"))) {
            if (method == "OPTIONS") {
                return WebResourceResponse(
                    "text/plain",
                    "UTF-8",
                    200,
                    "OK",
                    buildCorsHeaders("text/plain"),
                    ByteArrayInputStream(ByteArray(0))
                )
            }
            val proxied = proxyExternalUrlWithOkHttp(reqUrl, request)
            if (proxied != null) return proxied
        }

        return null
    }

    private fun proxyExternalUrlWithOkHttp(
        targetUrl: String,
        request: WebResourceRequest,
        explicitReferer: String? = null
    ): WebResourceResponse? {
        return try {
            val parsedTarget = android.net.Uri.parse(targetUrl)
            val host = parsedTarget.host ?: ""
            val scheme = parsedTarget.scheme ?: "https"
            val customReferer = if (!explicitReferer.isNullOrBlank()) {
                explicitReferer
            } else {
                resolveRefererForHost(host, scheme)
            }
            val customOrigin = try {
                val refUri = android.net.Uri.parse(customReferer)
                "${refUri.scheme ?: "https"}://${refUri.host ?: host}"
            } catch (_: Exception) {
                "$scheme://$host"
            }

            val okReqBuilder = Request.Builder()
                .url(targetUrl)
                .header("User-Agent", InbuiltStreamScraper.DEFAULT_USER_AGENT)
                .header("Accept", "*/*")
                .header("Referer", customReferer)
                .header("Origin", customOrigin)

            request.requestHeaders?.get("Range")?.let { rangeHeader ->
                okReqBuilder.header("Range", rangeHeader)
            }

            val response = InbuiltStreamScraper.okHttpClient.newCall(okReqBuilder.build()).execute()
            val statusCode = response.code
            val lowerUrl = targetUrl.lowercase()
            val contentTypeRaw = response.header("Content-Type") ?: guessMediaMimeType(lowerUrl)
            val mimeType = contentTypeRaw.substringBefore(";").trim().ifEmpty { "application/octet-stream" }

            val responseHeaders = buildCorsHeaders(mimeType).toMutableMap()
            response.header("Content-Length")?.let { responseHeaders["Content-Length"] = it }
            response.header("Content-Range")?.let { responseHeaders["Content-Range"] = it }
            response.header("Accept-Ranges")?.let { responseHeaders["Accept-Ranges"] = it }

            val bodyStream = response.body?.byteStream() ?: ByteArrayInputStream(ByteArray(0))

            WebResourceResponse(
                mimeType,
                "UTF-8",
                statusCode,
                response.message.ifEmpty { "OK" },
                responseHeaders,
                bodyStream
            )
        } catch (_: Exception) {
            null
        }
    }

    private fun getAssetMimeType(filePath: String): String {
        val ext = filePath.substringAfterLast('.', "").lowercase()
        return when (ext) {
            "html", "htm" -> "text/html"
            "js", "mjs" -> "application/javascript"
            "css" -> "text/css"
            "json", "map" -> "application/json"
            "svg" -> "image/svg+xml"
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "webp" -> "image/webp"
            "gif" -> "image/gif"
            "ico" -> "image/x-icon"
            "woff" -> "font/woff"
            "woff2" -> "font/woff2"
            "ttf" -> "font/ttf"
            "mp4" -> "video/mp4"
            "webm" -> "video/webm"
            else -> "application/octet-stream"
        }
    }

    private fun guessMediaMimeType(lowerUrl: String): String {
        return when {
            lowerUrl.contains(".m3u8") -> "application/vnd.apple.mpegurl"
            lowerUrl.contains(".ts") -> "video/mp2t"
            lowerUrl.contains(".m4s") || lowerUrl.contains(".mp4") -> "video/mp4"
            else -> "application/octet-stream"
        }
    }

    private fun buildCorsHeaders(contentType: String): Map<String, String> {
        return mapOf(
            "Access-Control-Allow-Origin" to "*",
            "Access-Control-Allow-Methods" to "GET, POST, OPTIONS, HEAD",
            "Access-Control-Allow-Headers" to "*",
            "Access-Control-Expose-Headers" to "Content-Length, Content-Range, Accept-Ranges",
            "Content-Type" to contentType
        )
    }
}
