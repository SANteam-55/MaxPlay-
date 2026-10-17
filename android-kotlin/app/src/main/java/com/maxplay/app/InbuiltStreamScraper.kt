package com.maxplay.app

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.regex.Pattern

/**
 * MaxPlay Inbuilt Native Kotlin Stream Scraper & Headless Sniffer Engine
 * ----------------------------------------------------------------------
 * Runs directly on the user's Android device with ZERO CORS restrictions:
 * 1. Direct OkHttp HTML & Script Scraper with custom User-Agent, Referer & Cookies
 * 2. VOE Base64 + ROT13 Config Decoder (`wc0`, `hls`, `mp4`)
 * 3. Dean Edwards `eval(function(p,a,c,k,e,d))` Packed JS Unpacker (Filemoon, StreamWish, VidHide, etc.)
 * 4. Headless Android WebView Stream Sniffer (automatically captures .m3u8 / .mp4 requests from obfuscated embeds)
 */
class InbuiltStreamScraper(private val context: Context) {

    companion object {
        const val DEFAULT_USER_AGENT =
            "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"

        val okHttpClient: OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .build()
    }

    /**
     * Synchronous Native OkHttp Stream Scraper (called from background/JS bridge thread).
     */
    fun scrapeStreamSync(sourceUrl: String, extraHeaders: Map<String, String> = emptyMap()): JSONObject {
        val result = JSONObject()
        try {
            val cleanUrl = normalizeEmbedUrl(sourceUrl.trim())
            val origin = extractOrigin(cleanUrl)

            val reqBuilder = Request.Builder()
                .url(cleanUrl)
                .header("User-Agent", extraHeaders["User-Agent"] ?: DEFAULT_USER_AGENT)
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "en-US,en;q=0.9")
                .header("Referer", extraHeaders["Referer"] ?: "$origin/")

            for ((k, v) in extraHeaders) {
                reqBuilder.header(k, v)
            }

            okHttpClient.newCall(reqBuilder.build()).execute().use { response ->
                val finalPageUrl = response.request.url.toString()
                val html = response.body?.string() ?: ""

                // Check if redirect link in HTML (common on VOE: window.location.href = '...')
                val redirectRegex = Pattern.compile("""window\.location\.href\s*=\s*['"](https?://[^'"]+)['"]""")
                val redirectMatcher = redirectRegex.matcher(html)
                val targetHtml: String
                val effectiveReferer: String

                if (redirectMatcher.find() && !html.contains(".m3u8")) {
                    val redirectedUrl = redirectMatcher.group(1) ?: finalPageUrl
                    effectiveReferer = extractOrigin(redirectedUrl) + "/"
                    val redirReq = Request.Builder()
                        .url(redirectedUrl)
                        .header("User-Agent", DEFAULT_USER_AGENT)
                        .header("Referer", finalPageUrl)
                        .build()
                    okHttpClient.newCall(redirReq).execute().use { r2 ->
                        targetHtml = r2.body?.string() ?: html
                    }
                } else {
                    targetHtml = html
                    effectiveReferer = extractOrigin(finalPageUrl) + "/"
                }

                // 1. Check packed JavaScript: eval(function(p,a,c,k,e,d)...)
                var combinedSource = targetHtml
                val unpackedScripts = unpackAllDeanEdwards(targetHtml)
                if (unpackedScripts.isNotEmpty()) {
                    combinedSource += "\n" + unpackedScripts.joinToString("\n")
                }

                // 2. Check VOE Base64 / ROT13 obfuscated payload
                val voeM3u8 = extractVoeEncodedStream(combinedSource)
                if (!voeM3u8.isNullOrBlank()) {
                    return buildSuccessJson(voeM3u8, effectiveReferer, "kotlin_okhttp")
                }

                // 3. Direct or Unpacked .m3u8 URL Regex Match
                val m3u8Regex = Pattern.compile("""(https?://[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*)""", Pattern.CASE_INSENSITIVE)
                val m3u8Matcher = m3u8Regex.matcher(combinedSource.replace("\\/", "/"))
                if (m3u8Matcher.find()) {
                    val foundUrl = m3u8Matcher.group(1)
                    if (!foundUrl.isNullOrBlank()) {
                        return buildSuccessJson(foundUrl, effectiveReferer, "kotlin_okhttp")
                    }
                }

                // 4. Base64-encoded 'hls': '...' property inside script tags
                val b64HlsRegex = Pattern.compile("""['"]hls['"]\s*:\s*['"]([A-Za-z0-9+/=]{16,})['"]""")
                val b64Matcher = b64HlsRegex.matcher(combinedSource)
                while (b64Matcher.find()) {
                    val token = b64Matcher.group(1) ?: continue
                    try {
                        val decoded = String(Base64.decode(token, Base64.DEFAULT), Charsets.UTF_8)
                        if (decoded.startsWith("http") && decoded.contains(".m3u8")) {
                            return buildSuccessJson(decoded.trim(), effectiveReferer, "kotlin_okhttp")
                        }
                    } catch (_: Exception) {}
                }
            }
        } catch (e: Exception) {
            result.put("ok", false)
            result.put("error", e.message ?: "Native OkHttp scrape failed")
            return result
        }

        result.put("ok", false)
        result.put("error", "No direct stream found in static HTML; use Headless Sniffer")
        return result
    }

    /**
     * Invisible Headless Android WebView Stream Sniffer:
     * Loads the embed URL in an offscreen WebView and intercepts every network request
     * until an `.m3u8` or `.mp4` stream URL is captured!
     */
    @SuppressLint("SetJavaScriptEnabled")
    fun sniffStreamWithHeadlessWebView(
        sourceUrl: String,
        timeoutMs: Long = 11000L,
        onResult: (JSONObject) -> Unit
    ) {
        val mainHandler = Handler(Looper.getMainLooper())
        val completed = AtomicBoolean(false)

        mainHandler.post {
            var headlessWebView: WebView? = null

            val cleanup = {
                try {
                    headlessWebView?.stopLoading()
                    headlessWebView?.destroy()
                    headlessWebView = null
                } catch (_: Exception) {}
            }

            val timeoutRunnable = Runnable {
                if (completed.compareAndSet(false, true)) {
                    cleanup()
                    val err = JSONObject()
                    err.put("ok", false)
                    err.put("error", "Headless stream sniffer timed out")
                    onResult(err)
                }
            }

            try {
                val wv = WebView(context.applicationContext)
                headlessWebView = wv

                wv.settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    mediaPlaybackRequiresUserGesture = false
                    mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                    userAgentString = DEFAULT_USER_AGENT
                    allowUniversalAccessFromFileURLs = true
                }

                val targetEmbedUrl = normalizeEmbedUrl(sourceUrl.trim())
                val refererOrigin = extractOrigin(targetEmbedUrl) + "/"

                wv.webViewClient = object : WebViewClient() {
                    override fun shouldInterceptRequest(
                        view: WebView?,
                        request: WebResourceRequest?
                    ): WebResourceResponse? {
                        val reqUrl = request?.url?.toString() ?: return super.shouldInterceptRequest(view, request)
                        val lower = reqUrl.lowercase()

                        if ((lower.contains(".m3u8") || lower.contains("master.txt") || lower.contains("index-v1")) &&
                            !lower.contains(".ts")
                        ) {
                            if (completed.compareAndSet(false, true)) {
                                mainHandler.removeCallbacks(timeoutRunnable)
                                val reqHeaders = request.requestHeaders ?: emptyMap()
                                val ref = reqHeaders["Referer"] ?: refererOrigin
                                val successJson = buildSuccessJson(reqUrl, ref, "kotlin_headless_sniffer")
                                mainHandler.post {
                                    cleanup()
                                    onResult(successJson)
                                }
                            }
                        }
                        return super.shouldInterceptRequest(view, request)
                    }
                }

                mainHandler.postDelayed(timeoutRunnable, timeoutMs)
                wv.loadUrl(targetEmbedUrl)
            } catch (e: Exception) {
                if (completed.compareAndSet(false, true)) {
                    mainHandler.removeCallbacks(timeoutRunnable)
                    cleanup()
                    val err = JSONObject()
                    err.put("ok", false)
                    err.put("error", e.message ?: "Headless WebView exception")
                    onResult(err)
                }
            }
        }
    }

    private fun buildSuccessJson(m3u8Url: String, referer: String, method: String): JSONObject {
        val headersObj = JSONObject()
        headersObj.put("Referer", referer)
        headersObj.put("Origin", referer.trimEnd('/'))
        headersObj.put("User-Agent", DEFAULT_USER_AGENT)

        return JSONObject().apply {
            put("ok", true)
            put("m3u8Url", m3u8Url)
            put("headers", headersObj)
            put("method", method)
        }
    }

    private fun normalizeEmbedUrl(url: String): String {
        val lower = url.lowercase()
        if ((lower.contains("voe.sx") || lower.contains("voe.")) && !url.contains("/e/")) {
            val m = Pattern.compile("""https?://[^/]+/([a-zA-Z0-9_-]+)""").matcher(url)
            if (m.find()) {
                val id = m.group(1)
                val origin = extractOrigin(url)
                return "$origin/e/$id"
            }
        }
        return url
    }

    private fun extractOrigin(url: String): String {
        return try {
            val u = java.net.URL(url)
            "${u.protocol}://${u.host}"
        } catch (_: Exception) {
            "https://voe.sx"
        }
    }

    /**
     * Decodes VOE's ROT13 + Base64 obfuscated stream configuration if present.
     */
    private fun extractVoeEncodedStream(html: String): String? {
        try {
            val pat = Pattern.compile("""['"]([a-zA-Z0-9+/=]{60,})['"]""")
            val matcher = pat.matcher(html)
            while (matcher.find()) {
                val candidate = matcher.group(1) ?: continue
                // Try direct base64 decode or ROT13 -> base64 decode
                for (attempt in 0..1) {
                    try {
                        val input = if (attempt == 0) candidate else rot13(candidate)
                        val decoded = String(Base64.decode(input, Base64.DEFAULT), Charsets.UTF_8)
                        if (decoded.contains(".m3u8")) {
                            val m = Pattern.compile("""(https?://[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*)""").matcher(decoded.replace("\\/", "/"))
                            if (m.find()) return m.group(1)
                        }
                    } catch (_: Exception) {}
                }
            }
        } catch (_: Exception) {}
        return null
    }

    private fun rot13(input: String): String {
        val sb = StringBuilder(input.length)
        for (c in input) {
            when (c) {
                in 'a'..'m', in 'A'..'M' -> sb.append(c + 13)
                in 'n'..'z', in 'N'..'Z' -> sb.append(c - 13)
                else -> sb.append(c)
            }
        }
        return sb.toString()
    }

    /**
     * Unpacks Dean Edwards `eval(function(p,a,c,k,e,d){...})` packed JS blocks.
     */
    private fun unpackAllDeanEdwards(html: String): List<String> {
        val results = mutableListOf<String>()
        try {
            val regex = Pattern.compile(
                """eval\(function\(p,a,c,k,e,[dr]\)\{.*?\}\(\s*'((?:\\'|[^'])*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:\\'|[^'])*)'\.split\('\|'\)""",
                Pattern.DOTALL
            )
            val matcher = regex.matcher(html)
            while (matcher.find()) {
                val payload = matcher.group(1)?.replace("\\'", "'") ?: continue
                val radix = matcher.group(2)?.toIntOrNull() ?: 36
                val count = matcher.group(3)?.toIntOrNull() ?: 0
                val symtab = matcher.group(4)?.split("|") ?: emptyList()

                var unpacked = payload
                for (i in (count - 1) downTo 0) {
                    val word = i.toString(radix.coerceIn(2, 36))
                    val replacement = if (i < symtab.size && symtab[i].isNotEmpty()) symtab[i] else word
                    unpacked = unpacked.replace(Regex("\\b$word\\b"), Regex.escapeReplacement(replacement))
                }
                results.add(unpacked)
            }
        } catch (_: Exception) {}
        return results
    }
}
