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
// 2. Intercepts /api/proxy?url=... locally on the Android device via OkHttp
//    so video segments download directly to the phone with 0% server timeout.
// 3. Intercepts cross-origin media playlists (.m3u8) & video segments (.ts, .m4s)
//    and injects Access-Control-Allow-Origin: *.
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
        val reqUrl = uri.toString()
        val method = request.method?.uppercase() ?: "GET"

        // 1. Handle CORS Preflight OPTIONS immediately with 200 OK
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

        // 2. Serve Local Bundled WebApp & Native Proxy on https://appassets.androidplatform.net
        if (uri.host == VIRTUAL_ASSET_HOST) {
            val path = uri.path ?: "/"

            // 2a. Native on-device /api/proxy?url=... handler (Zero CORS, Zero Cloud Timeout!)
            if (path == "/api/proxy") {
                val targetUrl = uri.getQueryParameter("url")
                if (!targetUrl.isNullOrBlank()) {
                    return proxyExternalUrlWithOkHttp(targetUrl, request)
                }
            }

            // 2b. Disable PWA sw.js inside native APK since assets are already 100% local in APK
            if (path == "/sw.js") {
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

            // 2c. Serve static file from assets/webapp/...
            val cleanPath = if (path == "/" || path.isEmpty()) {
                "index.html"
            } else {
                path.removePrefix("/")
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

        // 3. Intercept external HLS manifests (.m3u8) and segments (.ts, .m4s) to strip CORS blocks
        val lower = reqUrl.lowercase()
        val isHlsOrSegment =
            lower.contains(".m3u8") ||
                lower.contains(".ts") ||
                lower.contains(".m4s") ||
                lower.contains("master.txt") ||
                lower.contains("urlset")

        if (isHlsOrSegment && (lower.startsWith("http://") || lower.startsWith("https://"))) {
            val proxied = proxyExternalUrlWithOkHttp(reqUrl, request)
            if (proxied != null) return proxied
        }

        return super.shouldInterceptRequest(view, request)
    }

    private fun proxyExternalUrlWithOkHttp(
        targetUrl: String,
        request: WebResourceRequest
    ): WebResourceResponse? {
        return try {
            val parsedTarget = android.net.Uri.parse(targetUrl)
            val host = parsedTarget.host ?: ""
            val scheme = parsedTarget.scheme ?: "https"
            val customReferer = resolveRefererForHost(host, scheme)
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
