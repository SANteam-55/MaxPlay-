package com.maxplay.app

import android.app.Activity
import android.content.pm.ActivityInfo
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import okhttp3.Request
import org.json.JSONObject

/**
 * MaxPlay Native Kotlin Bridge (`window.MaxPlayNative`)
 * ----------------------------------------------------------------------
 * Exposes Native Android OS capabilities directly to the MaxPlay React Frontend:
 * - `extractStreamNative(sourceUrl, headersJson)` -> Runs InbuiltStreamScraper
 * - `sniffStreamAsync(sourceUrl, callbackId, timeoutMs)` -> Runs Headless WebView Sniffer
 * - `fetchUrlCorsFree(targetUrl, headersJson)` -> CORS-free text/playlist fetch via OkHttp
 * - `fetchBytesBase64CorsFree(targetUrl, headersJson)` -> CORS-free binary segment fetch via OkHttp
 * - `setLandscapeOrientation(locked)` -> Hardware sensor landscape lock for fullscreen player
 */
class MaxPlayNativeBridge(
    private val activity: Activity,
    private val webView: WebView
) {
    private val scraper = InbuiltStreamScraper(activity)

    @JavascriptInterface
    fun isNativeApp(): Boolean = true

    @JavascriptInterface
    fun getAppVersion(): String = "1.0.0-kotlin-native"

    @JavascriptInterface
    fun extractStreamNative(sourceUrl: String, headersJson: String?): String {
        val headersMap = parseHeadersJson(headersJson)
        val resultJson = scraper.scrapeStreamSync(sourceUrl, headersMap)

        // Register discovered Referer for seamless WebView playback
        if (resultJson.optBoolean("ok")) {
            val m3u8Url = resultJson.optString("m3u8Url")
            val ref = resultJson.optJSONObject("headers")?.optString("Referer") ?: ""
            if (m3u8Url.isNotEmpty() && ref.isNotEmpty()) {
                CorsFreeWebViewClient.registerStreamReferer(m3u8Url, ref)
            }
        }

        return resultJson.toString()
    }

    @JavascriptInterface
    fun sniffStreamAsync(sourceUrl: String, callbackId: String, timeoutMs: Long) {
        scraper.sniffStreamWithHeadlessWebView(sourceUrl, timeoutMs) { resultJson ->
            if (resultJson.optBoolean("ok")) {
                val m3u8Url = resultJson.optString("m3u8Url")
                val ref = resultJson.optJSONObject("headers")?.optString("Referer") ?: ""
                if (m3u8Url.isNotEmpty() && ref.isNotEmpty()) {
                    CorsFreeWebViewClient.registerStreamReferer(m3u8Url, ref)
                }
            }

            val escapedJson = JSONObject.quote(resultJson.toString())
            val jsCode = "window.onMaxPlaySnifferResult && window.onMaxPlaySnifferResult('$callbackId', $escapedJson);"
            activity.runOnUiThread {
                webView.evaluateJavascript(jsCode, null)
            }
        }
    }

    @JavascriptInterface
    fun fetchUrlCorsFree(targetUrl: String, headersJson: String?): String {
        val out = JSONObject()
        try {
            val headersMap = parseHeadersJson(headersJson)
            val host = try { java.net.URL(targetUrl).host } catch (_: Exception) { "" }
            val defaultRef = CorsFreeWebViewClient.resolveRefererForHost(host)

            val reqBuilder = Request.Builder()
                .url(targetUrl)
                .header("User-Agent", InbuiltStreamScraper.DEFAULT_USER_AGENT)
                .header("Accept", "*/*")
                .header("Referer", headersMap["Referer"] ?: defaultRef)

            for ((k, v) in headersMap) {
                reqBuilder.header(k, v)
            }

            InbuiltStreamScraper.okHttpClient.newCall(reqBuilder.build()).execute().use { resp ->
                out.put("ok", resp.isSuccessful)
                out.put("status", resp.code)
                out.put("body", resp.body?.string() ?: "")
            }
        } catch (e: Exception) {
            out.put("ok", false)
            out.put("error", e.message ?: "OkHttp fetch failed")
        }
        return out.toString()
    }

    @JavascriptInterface
    fun fetchBytesBase64CorsFree(targetUrl: String, headersJson: String?): String {
        return try {
            val headersMap = parseHeadersJson(headersJson)
            val host = try { java.net.URL(targetUrl).host } catch (_: Exception) { "" }
            val defaultRef = CorsFreeWebViewClient.resolveRefererForHost(host)

            val reqBuilder = Request.Builder()
                .url(targetUrl)
                .header("User-Agent", InbuiltStreamScraper.DEFAULT_USER_AGENT)
                .header("Accept", "*/*")
                .header("Referer", headersMap["Referer"] ?: defaultRef)

            for ((k, v) in headersMap) {
                reqBuilder.header(k, v)
            }

            InbuiltStreamScraper.okHttpClient.newCall(reqBuilder.build()).execute().use { resp ->
                if (!resp.isSuccessful) return "ERROR:HTTP_${resp.code}"
                val bytes = resp.body?.bytes() ?: return "ERROR:EMPTY"
                Base64.encodeToString(bytes, Base64.NO_WRAP)
            }
        } catch (e: Exception) {
            "ERROR:${e.message}"
        }
    }

    @JavascriptInterface
    fun setLandscapeOrientation(locked: Boolean) {
        activity.runOnUiThread {
            activity.requestedOrientation = if (locked) {
                ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            } else {
                ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            }
        }
    }

    private fun parseHeadersJson(headersJson: String?): Map<String, String> {
        if (headersJson.isNullOrBlank()) return emptyMap()
        val map = mutableMapOf<String, String>()
        try {
            val obj = JSONObject(headersJson)
            val keys = obj.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                map[k] = obj.optString(k, "")
            }
        } catch (_: Exception) {}
        return map
    }
}
