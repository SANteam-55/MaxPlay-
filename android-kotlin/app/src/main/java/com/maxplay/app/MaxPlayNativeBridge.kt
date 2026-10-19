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
 * - `extractStreamNativeAsync(sourceUrl, headersJson, callbackId)` -> Non-blocking Stage 1 Scraper
 * - `extractStreamNative(sourceUrl, headersJson)` -> Synchronous Stage 1 Scraper (backward compatible)
 * - `sniffStreamAsync(sourceUrl, callbackId, timeoutMs)` -> Stage 2 Offscreen WebView Sniffer
 * - `fetchUrlCorsFreeAsync(targetUrl, headersJson, callbackId)` -> Non-blocking CORS-free text/playlist fetch
 * - `fetchUrlCorsFree(targetUrl, headersJson)` -> CORS-free text/playlist fetch via OkHttp
 * - `fetchBytesBase64CorsFree(targetUrl, headersJson)` -> CORS-free binary segment fetch via OkHttp
 * - `setLandscapeOrientation(locked)` -> Hardware sensor landscape lock for fullscreen player
 */
class MaxPlayNativeBridge(
    private val activity: MainActivity,
    private val webView: WebView
) {
    private val scraper = InbuiltStreamScraper(activity, webView)

    @JavascriptInterface
    fun isNativeApp(): Boolean = true

    @JavascriptInterface
    fun getAppVersion(): String = "1.1.0-kotlin-native"

    @JavascriptInterface
    fun extractStreamNative(sourceUrl: String, headersJson: String?): String {
        val headersMap = parseHeadersJson(headersJson)
        val resultJson = scraper.scrapeStreamSync(sourceUrl, headersMap)

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
    fun extractStreamNativeAsync(sourceUrl: String, headersJson: String?, callbackId: String) {
        InbuiltStreamScraper.backgroundExecutor.execute {
            val headersMap = parseHeadersJson(headersJson)
            val resultJson = scraper.scrapeStreamSync(sourceUrl, headersMap)

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
    fun fetchUrlCorsFreeAsync(targetUrl: String, headersJson: String?, callbackId: String) {
        InbuiltStreamScraper.backgroundExecutor.execute {
            val resStr = fetchUrlCorsFree(targetUrl, headersJson)
            val escapedJson = JSONObject.quote(resStr)
            val jsCode = "window.onMaxPlaySnifferResult && window.onMaxPlaySnifferResult('$callbackId', $escapedJson);"
            activity.runOnUiThread {
                webView.evaluateJavascript(jsCode, null)
            }
        }
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

    @JavascriptInterface
    fun setBrightness(percent: Int) {
        activity.setHardwareBrightness(percent)
    }

    @JavascriptInterface
    fun getBrightness(): Int {
        return activity.getHardwareBrightness()
    }

    @JavascriptInterface
    fun setVolume(percent: Int) {
        activity.setHardwareVolume(percent)
    }

    @JavascriptInterface
    fun getVolume(): Int {
        return activity.getHardwareVolume()
    }

    @JavascriptInterface
    fun enterPipMode(): Boolean {
        return activity.enterNativePipMode()
    }

    @JavascriptInterface
    fun getDeviceStorageStats(): String {
        return MaxPlayOfflineVault.getDeviceStorageStats(activity.applicationContext).toString()
    }

    @JavascriptInterface
    fun downloadSegmentToDisk(
        storageKey: String,
        segmentIndex: Int,
        segmentUrl: String,
        refererUrl: String,
        callbackId: String
    ) {
        InbuiltStreamScraper.backgroundExecutor.execute {
            val res = MaxPlayOfflineVault.downloadSegmentToDisk(
                context = activity.applicationContext,
                storageKey = storageKey,
                segmentIndex = segmentIndex,
                segmentUrl = segmentUrl,
                refererUrl = refererUrl
            )
            val safeCallbackId = JSONObject.quote(callbackId)
            val escapedJson = JSONObject.quote(res.toString())
            val jsCode = "window.__onMaxPlaySegmentComplete && window.__onMaxPlaySegmentComplete($safeCallbackId, JSON.parse($escapedJson));"
            activity.runOnUiThread {
                try {
                    webView.evaluateJavascript(jsCode, null)
                } catch (_: Exception) {}
            }
        }
    }

    @JavascriptInterface
    fun saveOfflineManifest(
        storageKey: String,
        totalSegments: Int,
        totalDurationSec: Double,
        isSingleFile: Boolean
    ): Boolean {
        return MaxPlayOfflineVault.saveDownloadManifest(
            context = activity.applicationContext,
            storageKey = storageKey,
            totalSegments = totalSegments,
            totalDurationSec = totalDurationSec,
            isSingleFile = isSingleFile
        )
    }

    @JavascriptInterface
    fun getOfflineCheckpointInfo(storageKey: String): String {
        return MaxPlayOfflineVault.getCheckpointInfo(activity.applicationContext, storageKey).toString()
    }

    @JavascriptInterface
    fun hasOfflineItem(storageKey: String): Boolean {
        return MaxPlayOfflineVault.hasPlayableOfflineItem(activity.applicationContext, storageKey)
    }

    @JavascriptInterface
    fun getOfflinePlaybackUrl(storageKey: String): String {
        return MaxPlayOfflineVault.getLocalPlaybackUrl(storageKey)
    }

    @JavascriptInterface
    fun deleteOfflineItem(storageKey: String): Boolean {
        return MaxPlayOfflineVault.deleteOfflineItem(activity.applicationContext, storageKey)
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
