package com.maxplay.app

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import okhttp3.Request
import java.io.ByteArrayInputStream

/**
 * MaxPlay CORS-Free WebViewClient
 * ----------------------------------------------------------------------
 * Intercepts cross-origin media playlists (.m3u8), video segments (.ts, .m4s),
 * and external stream host requests from the WebView, executes them via Native
 * Android OkHttp, and injects `Access-Control-Allow-Origin: *` headers.
 *
 * Result: Standard `fetch()`, `XMLHttpRequest`, `hls.js`, and `ClientHlsDownloader`
 * inside the MaxPlay Web App work with 0% CORS restrictions!
 */
class CorsFreeWebViewClient : WebViewClient() {

    companion object {
        // Stores custom Referer/Origin headers discovered per stream host domain
        val hostRefererMap = java.util.concurrent.ConcurrentHashMap<String, String>()
    }

    override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest?
    ): WebResourceResponse? {
        val reqUrl = request?.url?.toString() ?: return super.shouldInterceptRequest(view, request)
        val method = request.method?.uppercase() ?: "GET"

        // Handle CORS Preflight OPTIONS immediately with 200 OK
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

        // Intercept external HLS manifests (.m3u8) and segments (.ts, .m4s) to strip CORS blocks
        val lower = reqUrl.lowercase()
        val isHlsOrSegment =
            lower.contains(".m3u8") ||
                lower.contains(".ts") ||
                lower.contains(".m4s") ||
                lower.contains("master.txt") ||
                lower.contains("urlset")

        if (isHlsOrSegment && (lower.startsWith("http://") || lower.startsWith("https://"))) {
            try {
                val host = request.url.host ?: ""
                val customReferer = hostRefererMap[host] ?: "${request.url.scheme}://${request.url.host}/"

                val okReqBuilder = Request.Builder()
                    .url(reqUrl)
                    .header("User-Agent", InbuiltStreamScraper.DEFAULT_USER_AGENT)
                    .header("Accept", "*/*")
                    .header("Referer", customReferer)

                request.requestHeaders?.get("Range")?.let { rangeHeader ->
                    okReqBuilder.header("Range", rangeHeader)
                }

                val response = InbuiltStreamScraper.okHttpClient.newCall(okReqBuilder.build()).execute()
                val statusCode = response.code
                val contentTypeRaw = response.header("Content-Type") ?: guessMimeType(lower)
                val mimeType = contentTypeRaw.substringBefore(";").trim().ifEmpty { "application/octet-stream" }

                val responseHeaders = buildCorsHeaders(mimeType).toMutableMap()
                response.header("Content-Length")?.let { responseHeaders["Content-Length"] = it }
                response.header("Content-Range")?.let { responseHeaders["Content-Range"] = it }
                response.header("Accept-Ranges")?.let { responseHeaders["Accept-Ranges"] = it }

                val bodyStream = response.body?.byteStream() ?: ByteArrayInputStream(ByteArray(0))

                return WebResourceResponse(
                    mimeType,
                    "UTF-8",
                    statusCode,
                    response.message.ifEmpty { "OK" },
                    responseHeaders,
                    bodyStream
                )
            } catch (_: Exception) {
                // Fall back to default WebView networking if custom interception fails
            }
        }

        return super.shouldInterceptRequest(view, request)
    }

    private fun guessMimeType(lowerUrl: String): String {
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
