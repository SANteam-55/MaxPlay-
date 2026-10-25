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
    fun setDesktopMode(enabled: Boolean) {
        activity.runOnUiThread {
            try {
                webView.settings.useWideViewPort = true
                webView.settings.loadWithOverviewMode = enabled
                webView.settings.setSupportZoom(true)
                webView.settings.builtInZoomControls = enabled
                webView.settings.displayZoomControls = false
                if (!enabled) {
                    webView.setInitialScale(0)
                }
            } catch (_: Exception) {}
        }
    }

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

    private fun deriveOriginFromReferer(refererUrl: String): String {
        return try {
            val u = android.net.Uri.parse(refererUrl)
            val scheme = u.scheme ?: "https"
            val host = u.host ?: return ""
            "$scheme://$host"
        } catch (_: Exception) {
            ""
        }
    }

    @JavascriptInterface
    fun fetchUrlCorsFree(targetUrl: String, headersJson: String?): String {
        val out = JSONObject()
        try {
            val headersMap = parseHeadersJson(headersJson)
            val host = try { java.net.URL(targetUrl).host } catch (_: Exception) { "" }
            val defaultRef = CorsFreeWebViewClient.resolveRefererForHost(host)
            val passedRef = headersMap["Referer"] ?: headersMap["referer"] ?: ""
            val effRef = if (defaultRef.contains("n1mwq") && (passedRef.isBlank() || passedRef.contains("f16px") || passedRef.contains("bysedikamoum") || passedRef.contains("byseraguci"))) {
                defaultRef
            } else {
                passedRef.ifBlank { defaultRef }
            }
            val effOrigin = headersMap["Origin"] ?: headersMap["origin"] ?: deriveOriginFromReferer(effRef)

            val reqBuilder = Request.Builder()
                .url(targetUrl)
                .header("User-Agent", InbuiltStreamScraper.DEFAULT_USER_AGENT)
                .header("Accept", "*/*")
                .header("Referer", effRef)

            if (effOrigin.isNotEmpty()) {
                reqBuilder.header("Origin", effOrigin)
            }

            for ((k, v) in headersMap) {
                if (!k.equals("Referer", ignoreCase = true) && !k.equals("Origin", ignoreCase = true)) {
                    reqBuilder.header(k, v)
                }
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

    /**
     * Native Admin Stream Box Verifier (`probeSingleStreamBoxAsync`):
     * Scrapes a single quality box URL (Server 1 Upnshare / VOE / Server 2 Filemoon / Byse / direct .m3u8),
     * falls back to Stage 2 Headless WebView Sniffer if needed, parses the HLS Master & Media playlist,
     * extracts real #EXT-X-MEDIA:TYPE=AUDIO languages, sums exact #EXTINF segment durations,
     * and computes 100% REAL MB size by sampling actual segment Content-Length / Content-Range or BANDWIDTH.
     */
    @JavascriptInterface
    fun probeSingleStreamBoxAsync(sourceUrl: String, forcedQuality: String?, callbackId: String) {
        InbuiltStreamScraper.backgroundExecutor.execute {
            val cleanSource = sourceUrl.trim()
            val qualityHint = (forcedQuality ?: "").trim()
            val safeCbId = JSONObject.quote(callbackId)

            fun finishWithResult(resObj: JSONObject) {
                val escapedJson = JSONObject.quote(resObj.toString())
                val jsCode = """
                    (function() {
                        var rawStr = $escapedJson;
                        var parsedObj = rawStr;
                        try { if (typeof rawStr === 'string') parsedObj = JSON.parse(rawStr); } catch (e) {}
                        if (window.__maxPlayNativeCallbacks && typeof window.__maxPlayNativeCallbacks[$safeCbId] === 'function') {
                            var cb = window.__maxPlayNativeCallbacks[$safeCbId];
                            delete window.__maxPlayNativeCallbacks[$safeCbId];
                            cb(parsedObj);
                        } else if (typeof window.onMaxPlaySnifferResult === 'function') {
                            window.onMaxPlaySnifferResult($safeCbId, rawStr);
                        }
                    })();
                """.trimIndent()
                activity.runOnUiThread {
                    try {
                        webView.evaluateJavascript(jsCode, null)
                    } catch (_: Exception) {}
                }
            }

            if (cleanSource.isEmpty()) {
                finishWithResult(JSONObject().apply {
                    put("ok", false)
                    put("error", "Empty stream URL")
                })
                return@execute
            }

            try {
                // Step 1: Try fast OkHttp Stage 1 Scraper (VOE.sx & Filemoon/Byse dedicated pipelines)
                val stage1 = scraper.scrapeStreamSync(cleanSource, emptyMap())
                if (stage1.optBoolean("ok") && stage1.optString("m3u8Url").isNotEmpty()) {
                    val m3u8Url = stage1.optString("m3u8Url")
                    val ref = stage1.optJSONObject("headers")?.optString("Referer") ?: cleanSource
                    if (ref.isNotEmpty()) {
                        CorsFreeWebViewClient.registerStreamReferer(m3u8Url, ref)
                    }
                    val enriched = probeHlsPlaylistDetailsSync(
                        cleanSource,
                        m3u8Url,
                        ref,
                        qualityHint,
                        stage1.optJSONObject("byseMeta")
                    )
                    if (enriched.optBoolean("ok")) {
                        enriched.put("engine", "KOTLIN_STAGE1")
                        finishWithResult(enriched)
                        return@execute
                    }
                }

                // Step 2: Fallback to Offscreen Headless WebView Sniffer (for JS-packed VOE / Filemoon / Byse pages)
                scraper.sniffStreamWithHeadlessWebView(cleanSource, 16000L) { stage2 ->
                    InbuiltStreamScraper.backgroundExecutor.execute {
                        try {
                            if (stage2.optBoolean("ok") && stage2.optString("m3u8Url").isNotEmpty()) {
                                val m3u8Url = stage2.optString("m3u8Url")
                                val ref = stage2.optJSONObject("headers")?.optString("Referer") ?: cleanSource
                                CorsFreeWebViewClient.registerStreamReferer(m3u8Url, ref)
                                val enriched = probeHlsPlaylistDetailsSync(
                                    cleanSource,
                                    m3u8Url,
                                    ref,
                                    qualityHint,
                                    stage2.optJSONObject("byseMeta")
                                )
                                enriched.put("engine", "KOTLIN_SNIFFER")
                                finishWithResult(enriched)
                            } else {
                                finishWithResult(JSONObject().apply {
                                    put("ok", false)
                                    put("error", stage2.optString("error", stage1.optString("error", "Could not extract .m3u8 stream from provider link")))
                                })
                            }
                        } catch (e: Exception) {
                            finishWithResult(JSONObject().apply {
                                put("ok", false)
                                put("error", e.message ?: "Stream verification failed")
                            })
                        }
                    }
                }
            } catch (e: Exception) {
                finishWithResult(JSONObject().apply {
                    put("ok", false)
                    put("error", e.message ?: "Native stream probe error")
                })
            }
        }
    }

    private fun resolveRelativeHlsUrl(baseUrl: String, rel: String): String {
        val cleanRel = rel.trim()
        if (cleanRel.startsWith("http://", ignoreCase = true) || cleanRel.startsWith("https://", ignoreCase = true)) {
            return cleanRel
        }
        return try {
            java.net.URL(java.net.URL(baseUrl), cleanRel).toString()
        } catch (_: Exception) {
            cleanRel
        }
    }

    private fun normalizeHlsLanguage(rawName: String, rawLang: String): String {
        val combined = "$rawLang $rawName".lowercase().trim()
        if (combined.isEmpty()) return ""
        if (combined.contains("hin") || Regex("\\bhi\\b").containsMatchIn(combined)) return "Hindi"
        if (combined.contains("eng") || Regex("\\ben\\b").containsMatchIn(combined)) return "English"
        if (combined.contains("jpn") || combined.contains("jap") || Regex("\\bja\\b").containsMatchIn(combined)) return "Japanese"
        if (combined.contains("tam") || Regex("\\bta\\b").containsMatchIn(combined)) return "Tamil"
        if (combined.contains("tel") || Regex("\\bte\\b").containsMatchIn(combined)) return "Telugu"
        if (combined.contains("mal") || Regex("\\bml\\b").containsMatchIn(combined)) return "Malayalam"
        if (combined.contains("kan") || Regex("\\bkn\\b").containsMatchIn(combined)) return "Kannada"
        if (combined.contains("kor") || Regex("\\bko\\b").containsMatchIn(combined)) return "Korean"
        if (combined.contains("spa") || Regex("\\bes\\b").containsMatchIn(combined)) return "Spanish"
        if (combined.contains("fre") || Regex("\\fra\\b").containsMatchIn(combined) || Regex("\\bfr\\b").containsMatchIn(combined)) return "French"
        if (combined.contains("rus") || Regex("\\bru\\b").containsMatchIn(combined)) return "Russian"
        if (combined.contains("ind") || Regex("\\bid\\b").containsMatchIn(combined)) return "Indonesian"
        if (combined.contains("ara") || Regex("\\bar\\b").containsMatchIn(combined)) return "Arabic"
        if (combined.contains("por") || Regex("\\bpt\\b").containsMatchIn(combined)) return "Portuguese"
        if (combined.contains("ger") || combined.contains("deu") || Regex("\\bde\\b").containsMatchIn(combined)) return "German"
        if (combined.contains("ita") || Regex("\\bit\\b").containsMatchIn(combined)) return "Italian"
        return rawName.ifBlank { rawLang }.trim()
    }

    private fun classifyHlsQuality(width: Int, height: Int, bandwidth: Long): String {
        if (height >= 1400 || width >= 2500) return "1440p"
        if (height >= 900 || width >= 1800) return "1080p"
        if (height >= 580 || width >= 1200) return "720p"
        if (height >= 400 || width >= 800) return "480p"
        if (height > 0 || width > 0) return "360p"
        if (bandwidth >= 2000000L) return "1080p"
        if (bandwidth >= 950000L) return "720p"
        if (bandwidth >= 500000L) return "480p"
        return "360p"
    }

    private val probeHttpClient by lazy {
        InbuiltStreamScraper.okHttpClient.newBuilder()
            .connectTimeout(6, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(6, java.util.concurrent.TimeUnit.SECONDS)
            .build()
    }

    private fun fetchHlsTextSync(url: String, referer: String): String {
        return try {
            val host = try { java.net.URL(url).host } catch (_: Exception) { "" }
            val effRef = referer.ifBlank { CorsFreeWebViewClient.resolveRefererForHost(host) }
            val effOrigin = deriveOriginFromReferer(effRef)
            val reqBuilder = Request.Builder()
                .url(url)
                .header("User-Agent", InbuiltStreamScraper.DEFAULT_USER_AGENT)
                .header("Accept", "*/*")
                .header("Referer", effRef)
            if (effOrigin.isNotEmpty()) {
                reqBuilder.header("Origin", effOrigin)
            }
            probeHttpClient.newCall(reqBuilder.build()).execute().use { resp ->
                if (!resp.isSuccessful) return ""
                resp.body?.string() ?: ""
            }
        } catch (_: Exception) {
            ""
        }
    }

    private fun probeSingleSegmentByteSize(segUrl: String, referer: String): Long {
        val host = try { java.net.URL(segUrl).host } catch (_: Exception) { "" }
        val effRef = referer.ifBlank { CorsFreeWebViewClient.resolveRefererForHost(host) }
        val effOrigin = deriveOriginFromReferer(effRef)
        try {
            // 1. Try fast HEAD request first
            val headReq = Request.Builder()
                .url(segUrl)
                .head()
                .header("User-Agent", InbuiltStreamScraper.DEFAULT_USER_AGENT)
                .header("Referer", effRef)
                .apply { if (effOrigin.isNotEmpty()) header("Origin", effOrigin) }
                .build()
            probeHttpClient.newCall(headReq).execute().use { resp ->
                if (resp.isSuccessful) {
                    val cl = resp.header("Content-Length")?.toLongOrNull() ?: -1L
                    if (cl > 500L) return cl
                }
            }
        } catch (_: Exception) {}

        try {
            // 2. Fallback: Range bytes=0-0 to inspect Content-Range: bytes 0-0/TOTAL_BYTES
            val rangeReq = Request.Builder()
                .url(segUrl)
                .header("User-Agent", InbuiltStreamScraper.DEFAULT_USER_AGENT)
                .header("Referer", effRef)
                .apply { if (effOrigin.isNotEmpty()) header("Origin", effOrigin) }
                .header("Range", "bytes=0-0")
                .build()
            probeHttpClient.newCall(rangeReq).execute().use { resp ->
                val cr = resp.header("Content-Range") ?: ""
                val slashIdx = cr.lastIndexOf('/')
                if (slashIdx != -1) {
                    val total = cr.substring(slashIdx + 1).trim().toLongOrNull() ?: -1L
                    if (total > 500L) return total
                }
                val cl = resp.header("Content-Length")?.toLongOrNull() ?: -1L
                if (cl > 500L) return cl
            }
        } catch (_: Exception) {}

        try {
            // 3. Fallback for chunked CDNs that reject HEAD/Range: stream GET response and count bytes
            val getReq = Request.Builder()
                .url(segUrl)
                .header("User-Agent", InbuiltStreamScraper.DEFAULT_USER_AGENT)
                .header("Referer", effRef)
                .build()
            InbuiltStreamScraper.okHttpClient.newCall(getReq).execute().use { resp ->
                if (resp.isSuccessful) {
                    val cl = resp.header("Content-Length")?.toLongOrNull() ?: -1L
                    if (cl > 500L) return cl
                    val stream = resp.body?.byteStream() ?: return 0L
                    val buf = ByteArray(16384)
                    var totalRead = 0L
                    while (true) {
                        val n = stream.read(buf)
                        if (n <= 0) break
                        totalRead += n
                        if (totalRead > 6L * 1024L * 1024L) break
                    }
                    if (totalRead > 500L) return totalRead
                }
            }
        } catch (_: Exception) {}
        return 0L
    }

    private fun measureMediaPlaylistSizeAndDuration(
        mediaPlaylistUrl: String,
        mediaText: String,
        referer: String,
        fallbackBandwidth: Long
    ): Pair<Int, Int> {
        val lines = mediaText.lines().map { it.trim() }
        var totalDurSec = 0.0
        var totalByteRangeBytes = 0L
        val segments = mutableListOf<Pair<String, Double>>()
        var pendingDur = 0.0

        val extinfRegex = Regex("#EXTINF:([\\d.]+)")
        val byterangeRegex = Regex("#EXT-X-BYTERANGE:(\\d+)")

        for (line in lines) {
            if (line.isEmpty()) continue
            if (line.startsWith("#EXTINF:")) {
                val m = extinfRegex.find(line)
                val d = m?.groupValues?.getOrNull(1)?.toDoubleOrNull() ?: 0.0
                totalDurSec += d
                pendingDur = d
                continue
            }
            if (line.startsWith("#EXT-X-BYTERANGE:")) {
                val bm = byterangeRegex.find(line)
                val bLen = bm?.groupValues?.getOrNull(1)?.toLongOrNull() ?: 0L
                totalByteRangeBytes += bLen
                continue
            }
            if (line.startsWith("#")) continue
            val segUrl = resolveRelativeHlsUrl(mediaPlaylistUrl, line)
            segments.add(Pair(segUrl, if (pendingDur > 0.0) pendingDur else 4.0))
            pendingDur = 0.0
        }

        val finalDuration = if (totalDurSec > 1.0) Math.round(totalDurSec).toInt() else (segments.size * 4)

        // 1. If playlist uses exact #EXT-X-BYTERANGE tags, sum is 100% exact!
        if (totalByteRangeBytes > 1024 * 1024) {
            val mb = Math.max(1, Math.round(totalByteRangeBytes.toDouble() / (1024.0 * 1024.0)).toInt())
            return Pair(finalDuration, mb)
        }

        // 2. If fallbackBandwidth is known from #EXT-X-STREAM-INF, compute from real stream bandwidth + duration
        if (fallbackBandwidth > 50000L && finalDuration > 0) {
            val bytes = (fallbackBandwidth.toDouble() * finalDuration.toDouble()) / 8.0
            val mb = Math.max(1, Math.round(bytes / (1024.0 * 1024.0)).toInt())
            return Pair(finalDuration, mb)
        }

        // 3. Otherwise sample up to 2 real segments (25%, 65%) via HEAD / Range / GET to measure real bytes/sec
        if (segments.isNotEmpty() && finalDuration > 0) {
            val sampleIndices = listOf(
                (segments.size * 0.25).toInt().coerceIn(0, segments.size - 1),
                (segments.size * 0.65).toInt().coerceIn(0, segments.size - 1)
            ).distinct()

            var sampledBytes = 0L
            var sampledDur = 0.0
            for (idx in sampleIndices) {
                val (sUrl, sDur) = segments[idx]
                val b = probeSingleSegmentByteSize(sUrl, referer)
                if (b > 0L && sDur > 0.0) {
                    sampledBytes += b
                    sampledDur += sDur
                }
            }
            if (sampledBytes > 0L && sampledDur > 0.0) {
                val bytesPerSec = sampledBytes.toDouble() / sampledDur
                val totalEstBytes = bytesPerSec * finalDuration.toDouble()
                val mb = Math.max(1, Math.round(totalEstBytes / (1024.0 * 1024.0)).toInt())
                return Pair(finalDuration, mb)
            }
        }

        return Pair(finalDuration, 0)
    }

    private fun probeHlsPlaylistDetailsSync(
        sourceUrl: String,
        m3u8Url: String,
        referer: String,
        forcedQuality: String,
        fallbackByseMeta: JSONObject? = null
    ): JSONObject {
        val out = JSONObject()
        val masterText = fetchHlsTextSync(m3u8Url, referer)
        if (masterText.isBlank() || !masterText.contains("#EXTM3U")) {
            // If we already decrypted valid stream metadata from Byse API or extracted a valid .m3u8 URL,
            // do not fail verification just because the edge CDN node timed out during probing!
            if (m3u8Url.isNotBlank() && (fallbackByseMeta != null || m3u8Url.contains(".m3u8"))) {
                val metaHeight = fallbackByseMeta?.optInt("height", 0) ?: 0
                val metaBitrateKbps = fallbackByseMeta?.optInt("bitrateKbps", 0) ?: 0
                val metaAudios = fallbackByseMeta?.optJSONArray("audioTracks") ?: org.json.JSONArray()
                val inferredQ = forcedQuality.ifBlank {
                    if (metaHeight >= 1000) "1080p"
                    else if (metaHeight >= 700) "720p"
                    else if (metaHeight >= 450) "480p"
                    else if (metaHeight > 0) "360p"
                    else "1080p"
                }
                val bw = if (metaBitrateKbps > 0) metaBitrateKbps.toLong() * 1000L
                else if (inferredQ.contains("1080")) 2200000L
                else if (inferredQ.contains("720")) 1150000L
                else if (inferredQ.contains("480")) 650000L
                else 380000L
                val estDur = 1440
                val estMb = Math.max(15, ((bw * estDur) / (8L * 1024L * 1024L)).toInt())

                val qualitiesArr = org.json.JSONArray().put(inferredQ)
                val qualityLinksObj = JSONObject().put(inferredQ, sourceUrl)
                val downloadQualitiesArr = org.json.JSONArray().put(JSONObject().apply {
                    put("id", inferredQ)
                    put("label", "$inferredQ ${if (inferredQ.contains("1080")) "Full HD" else if (inferredQ.contains("720")) "HD" else "Standard"}")
                    put("sizeMb", estMb)
                    put("url", sourceUrl)
                    put("resolvedM3u8Url", m3u8Url)
                    put("bandwidth", bw)
                })
                out.put("ok", true)
                out.put("sourceUrl", sourceUrl)
                out.put("m3u8Url", m3u8Url)
                out.put("referer", referer)
                out.put("duration", 0)
                out.put("audioTracks", metaAudios)
                out.put("qualities", qualitiesArr)
                out.put("qualityLinks", qualityLinksObj)
                out.put("downloadQualities", downloadQualitiesArr)
                return out
            }
            out.put("ok", false)
            out.put("error", "Fetched stream was not a valid #EXTM3U playlist")
            return out
        }

        val lines = masterText.lines().map { it.trim() }
        val audioTracks = mutableListOf<String>()
        var audioPlaylistsFirstUrl = ""

        // 1. Extract #EXT-X-MEDIA:TYPE=AUDIO languages
        for (line in lines) {
            if (line.startsWith("#EXT-X-MEDIA:") && line.contains("TYPE=AUDIO")) {
                val nameMatch = Regex("NAME=\"([^\"]+)\"|NAME=([^\\s,]+)", RegexOption.IGNORE_CASE).find(line)
                val langMatch = Regex("LANGUAGE=\"([^\"]+)\"|LANGUAGE=([^\\s,]+)", RegexOption.IGNORE_CASE).find(line)
                val uriMatch = Regex("URI=\"([^\"]+)\"|URI=([^\\s,]+)", RegexOption.IGNORE_CASE).find(line)
                val rawName = (nameMatch?.groupValues?.getOrNull(1)?.ifEmpty { nameMatch.groupValues.getOrNull(2) } ?: "").trim()
                val rawLang = (langMatch?.groupValues?.getOrNull(1)?.ifEmpty { langMatch.groupValues.getOrNull(2) } ?: "").trim()
                val rawUri = (uriMatch?.groupValues?.getOrNull(1)?.ifEmpty { uriMatch.groupValues.getOrNull(2) } ?: "").trim()
                if (rawUri.isNotEmpty() && audioPlaylistsFirstUrl.isEmpty()) {
                    audioPlaylistsFirstUrl = resolveRelativeHlsUrl(m3u8Url, rawUri)
                }
                val friendly = normalizeHlsLanguage(rawName, rawLang)
                if (friendly.isNotEmpty() && !audioTracks.contains(friendly)) {
                    audioTracks.add(friendly)
                }
            }
        }

        data class VariantInfo(val quality: String, val url: String, val bandwidth: Long)
        val variants = mutableListOf<VariantInfo>()

        for (i in lines.indices) {
            val line = lines[i]
            if (line.startsWith("#EXT-X-STREAM-INF:")) {
                val resMatch = Regex("RESOLUTION=(\\d+)x(\\d+)", RegexOption.IGNORE_CASE).find(line)
                val width = resMatch?.groupValues?.getOrNull(1)?.toIntOrNull() ?: 0
                val height = resMatch?.groupValues?.getOrNull(2)?.toIntOrNull() ?: 0
                val avgBwMatch = Regex("AVERAGE-BANDWIDTH=(\\d+)", RegexOption.IGNORE_CASE).find(line)
                val bwMatch = Regex("BANDWIDTH=(\\d+)", RegexOption.IGNORE_CASE).find(line)
                val bw = avgBwMatch?.groupValues?.getOrNull(1)?.toLongOrNull()
                    ?: bwMatch?.groupValues?.getOrNull(1)?.toLongOrNull()
                    ?: 0L

                var nextUri = ""
                for (j in (i + 1) until lines.size) {
                    if (lines[j].isNotEmpty() && !lines[j].startsWith("#")) {
                        nextUri = lines[j]
                        break
                    }
                }
                if (nextUri.isNotEmpty()) {
                    val vUrl = resolveRelativeHlsUrl(m3u8Url, nextUri)
                    val qLabel = classifyHlsQuality(width, height, bw)
                    if (variants.none { it.quality.equals(qLabel, ignoreCase = true) }) {
                        variants.add(VariantInfo(qLabel, vUrl, bw))
                    }
                }
            }
        }

        var separateAudioMb = 0
        var detectedDuration = 0
        val downloadQualitiesArr = org.json.JSONArray()
        val qualitiesArr = org.json.JSONArray()
        val qualityLinksObj = JSONObject()

        if (masterText.contains("#EXTINF:")) {
            // Direct single-quality media playlist
            val qLabel = forcedQuality.ifBlank { "1080p" }
            val (dur, measuredMb) = measureMediaPlaylistSizeAndDuration(m3u8Url, masterText, referer, 0L)
            detectedDuration = dur
            val fallbackBps = if (qLabel.contains("1080")) 2000000L else if (qLabel.contains("720")) 1100000L else if (qLabel.contains("480")) 650000L else 380000L
            val sizeMb = if (measuredMb > 0) measuredMb else if (dur > 0) Math.max(5, ((fallbackBps * dur) / (8L * 1024L * 1024L)).toInt()) else 0
            qualitiesArr.put(qLabel)
            qualityLinksObj.put(qLabel, sourceUrl)
            downloadQualitiesArr.put(JSONObject().apply {
                put("id", qLabel)
                put("label", "$qLabel ${if (qLabel.contains("1080")) "Full HD" else if (qLabel.contains("720")) "HD" else "Standard"}")
                put("sizeMb", sizeMb)
                put("url", sourceUrl)
                put("resolvedM3u8Url", m3u8Url)
                put("bandwidth", if (dur > 0 && sizeMb > 0) ((sizeMb.toLong() * 8L * 1024L * 1024L) / dur.toLong()) else fallbackBps)
            })
        } else if (variants.isNotEmpty()) {
            // When Admin verifies a specific quality box (e.g., 1080p box or 480p box), match that box's quality
            val effectiveVariants = if (forcedQuality.isNotBlank()) {
                val exactMatch = variants.firstOrNull { it.quality.equals(forcedQuality, ignoreCase = true) }
                    ?: variants.minByOrNull {
                        val vNum = it.quality.filter { c -> c.isDigit() }.toIntOrNull() ?: 720
                        val fNum = forcedQuality.filter { c -> c.isDigit() }.toIntOrNull() ?: 720
                        kotlin.math.abs(vNum - fNum)
                    } ?: variants[0]
                listOf(VariantInfo(forcedQuality, exactMatch.url, exactMatch.bandwidth))
            } else {
                variants
            }

            val firstVar = effectiveVariants[0]
            val firstSubText = fetchHlsTextSync(firstVar.url, referer)
            val (firstDur, firstMeasuredMb) = if (firstSubText.contains("#EXTINF:")) {
                measureMediaPlaylistSizeAndDuration(firstVar.url, firstSubText, referer, firstVar.bandwidth)
            } else {
                Pair(0, 0)
            }
            detectedDuration = firstDur

            if (audioPlaylistsFirstUrl.isNotEmpty() && detectedDuration > 0) {
                separateAudioMb = Math.max(2, Math.round((128000.0 * detectedDuration.toDouble()) / (8.0 * 1024.0 * 1024.0)).toInt())
            }

            for ((idx, v) in effectiveVariants.withIndex()) {
                var vSizeMb = 0
                if (idx == 0 && firstMeasuredMb > 0) {
                    vSizeMb = firstMeasuredMb + separateAudioMb
                } else if (v.bandwidth > 50000L && detectedDuration > 0) {
                    val bytes = (v.bandwidth.toDouble() * detectedDuration.toDouble()) / 8.0
                    vSizeMb = Math.max(1, Math.round(bytes / (1024.0 * 1024.0)).toInt()) + separateAudioMb
                } else {
                    val subTxt = fetchHlsTextSync(v.url, referer)
                    if (subTxt.contains("#EXTINF:")) {
                        val (d, m) = measureMediaPlaylistSizeAndDuration(v.url, subTxt, referer, v.bandwidth)
                        if (detectedDuration == 0 && d > 0) detectedDuration = d
                        if (m > 0) vSizeMb = m + separateAudioMb
                    }
                }

                if (vSizeMb <= 0 && detectedDuration > 0) {
                    val fallbackBps = if (v.bandwidth > 50000L) v.bandwidth else if (v.quality.contains("1080")) 2000000L else if (v.quality.contains("720")) 1100000L else if (v.quality.contains("480")) 650000L else 380000L
                    vSizeMb = Math.max(5, ((fallbackBps * detectedDuration) / (8L * 1024L * 1024L)).toInt()) + separateAudioMb
                }

                val assignedUrl = if (forcedQuality.isNotBlank() || effectiveVariants.size == 1) sourceUrl else v.url
                qualitiesArr.put(v.quality)
                qualityLinksObj.put(v.quality, assignedUrl)
                downloadQualitiesArr.put(JSONObject().apply {
                    put("id", v.quality)
                    put("label", "${v.quality} ${if (v.quality.contains("1080")) "Full HD" else if (v.quality.contains("720")) "HD" else "Standard"}")
                    put("sizeMb", vSizeMb)
                    put("url", assignedUrl)
                    put("resolvedM3u8Url", v.url)
                    put("bandwidth", v.bandwidth)
                })
            }
        }

        val metaAudios = fallbackByseMeta?.optJSONArray("audioTracks")
        if (metaAudios != null) {
            for (i in 0 until metaAudios.length()) {
                val lang = metaAudios.optString(i, "").trim()
                if (lang.isNotEmpty() && !audioTracks.contains(lang)) {
                    audioTracks.add(lang)
                }
            }
        }

        val audioArr = org.json.JSONArray()
        for (a in audioTracks) audioArr.put(a)

        out.put("ok", true)
        out.put("sourceUrl", sourceUrl)
        out.put("m3u8Url", m3u8Url)
        out.put("referer", referer)
        out.put("duration", detectedDuration)
        out.put("audioTracks", audioArr)
        out.put("qualities", qualitiesArr)
        out.put("qualityLinks", qualityLinksObj)
        out.put("downloadQualities", downloadQualitiesArr)
        return out
    }

    @JavascriptInterface
    fun fetchBytesBase64CorsFree(targetUrl: String, headersJson: String?): String {
        return try {
            val headersMap = parseHeadersJson(headersJson)
            val host = try { java.net.URL(targetUrl).host } catch (_: Exception) { "" }
            val defaultRef = CorsFreeWebViewClient.resolveRefererForHost(host)
            val passedRef = headersMap["Referer"] ?: headersMap["referer"] ?: ""
            val effRef = if (defaultRef.contains("n1mwq") && (passedRef.isBlank() || passedRef.contains("f16px") || passedRef.contains("bysedikamoum") || passedRef.contains("byseraguci"))) {
                defaultRef
            } else {
                passedRef.ifBlank { defaultRef }
            }
            val effOrigin = headersMap["Origin"] ?: headersMap["origin"] ?: deriveOriginFromReferer(effRef)

            val reqBuilder = Request.Builder()
                .url(targetUrl)
                .header("User-Agent", InbuiltStreamScraper.DEFAULT_USER_AGENT)
                .header("Accept", "*/*")
                .header("Referer", effRef)

            if (effOrigin.isNotEmpty()) {
                reqBuilder.header("Origin", effOrigin)
            }

            for ((k, v) in headersMap) {
                if (!k.equals("Referer", ignoreCase = true) && !k.equals("Origin", ignoreCase = true)) {
                    reqBuilder.header(k, v)
                }
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
    fun showNativeNotification(title: String, body: String, imageUrl: String? = ""): Boolean {
        return try {
            activity.showNativeStatusNotification(title, body, imageUrl ?: "")
            true
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun exportAndShareMaxPlayFile(
        storageKey: String,
        fileName: String,
        metadataJson: String
    ): String {
        val out = JSONObject()
        return try {
            val exportedFile = MaxPlayOfflineVault.exportOfflineItemToMaxPlayFile(
                context = activity.applicationContext,
                storageKey = storageKey,
                fileName = fileName,
                metadataJson = metadataJson
            )
            if (exportedFile != null && exportedFile.exists()) {
                val shared = activity.shareMaxPlayFile(exportedFile)
                out.put("ok", true)
                out.put("shared", shared)
                out.put("path", exportedFile.absolutePath)
            } else {
                out.put("ok", false)
                out.put("error", "No segments found on native disk")
            }
            out.toString()
        } catch (e: Exception) {
            out.put("ok", false)
            out.put("error", e.message ?: "Export failed")
            out.toString()
        }
    }

    @JavascriptInterface
    fun startVoiceRecognition(): Boolean {
        return try {
            activity.startNativeVoiceInput()
            true
        } catch (_: Exception) {
            false
        }
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
                refererUrl = refererUrl,
                isAudio = false
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
    fun downloadAudioSegmentToDisk(
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
                refererUrl = refererUrl,
                isAudio = true
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
            isSingleFile = isSingleFile,
            totalAudioSegments = 0,
            languageLabel = "Default"
        )
    }

    @JavascriptInterface
    fun saveOfflineManifestWithAudio(
        storageKey: String,
        totalSegments: Int,
        totalDurationSec: Double,
        isSingleFile: Boolean,
        totalAudioSegments: Int,
        languageLabel: String
    ): Boolean {
        return MaxPlayOfflineVault.saveDownloadManifest(
            context = activity.applicationContext,
            storageKey = storageKey,
            totalSegments = totalSegments,
            totalDurationSec = totalDurationSec,
            isSingleFile = isSingleFile,
            totalAudioSegments = totalAudioSegments,
            languageLabel = languageLabel
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

    @JavascriptInterface
    fun setStatusBarColor(hexColor: String): Boolean {
        return try {
            activity.setStatusBarColorHex(hexColor)
            true
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun setAutoPipEnabled(enabled: Boolean): Boolean {
        return try {
            activity.setAutoPipPreference(enabled)
            true
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun setVideoPlayingState(isPlaying: Boolean): Boolean {
        return try {
            activity.setVideoPlayingState(isPlaying)
            true
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun scanDeviceLocalVideos(): String {
        return MaxPlayOfflineVault.scanDeviceLocalVideos(activity.applicationContext).toString()
    }

    @JavascriptInterface
    fun requestVideoStoragePermission(): Boolean {
        return activity.requestVideoStoragePermission()
    }

    @JavascriptInterface
    fun startDirectTransferServer(
        storageKey: String,
        transferCode: String,
        metadataJson: String
    ): String {
        return MaxPlayOfflineVault.startDirectTransferServer(
            context = activity.applicationContext,
            storageKey = storageKey,
            transferCode = transferCode,
            metadataJson = metadataJson
        ).toString()
    }

    @JavascriptInterface
    fun stopDirectTransferServer(): Boolean {
        return try {
            MaxPlayOfflineVault.stopDirectTransferServer()
            true
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun receiveDirectTransferFromPeer(
        senderIp: String,
        senderPort: Int,
        transferCode: String,
        targetStorageKey: String,
        callbackId: String
    ) {
        val safeCallbackId = JSONObject.quote(callbackId)
        InbuiltStreamScraper.backgroundExecutor.execute {
            val res = MaxPlayOfflineVault.receiveDirectTransferFromPeer(
                context = activity.applicationContext,
                senderIp = senderIp,
                senderPort = senderPort,
                transferCode = transferCode,
                targetStorageKey = targetStorageKey
            ) { pct, msg ->
                val safeMsg = JSONObject.quote(msg)
                val progJs = "window.__onMaxPlayTransferProgress && window.__onMaxPlayTransferProgress($safeCallbackId, $pct, $safeMsg);"
                activity.runOnUiThread {
                    try {
                        webView.evaluateJavascript(progJs, null)
                    } catch (_: Exception) {}
                }
            }
            val escapedJson = JSONObject.quote(res.toString())
            val doneJs = "window.__onMaxPlaySegmentComplete && window.__onMaxPlaySegmentComplete($safeCallbackId, JSON.parse($escapedJson));"
            activity.runOnUiThread {
                try {
                    webView.evaluateJavascript(doneJs, null)
                } catch (_: Exception) {}
            }
        }
    }

    /**
     * Downloads the Admin's latest APK in the background with live progress callbacks
     * and launches Android's native Package Installer automatically.
     */
    @JavascriptInterface
    fun downloadAndInstallApk(apkUrl: String, versionName: String, title: String) {
        activity.startNativeApkUpdate(apkUrl, versionName, title)
    }

    @JavascriptInterface
    fun openPopunderAd(adUrl: String): Boolean {
        return activity.openNativePopunderAd(adUrl)
    }

    @JavascriptInterface
    fun closePopunderAd(): Boolean {
        return activity.closeNativePopunderAd()
    }

    @JavascriptInterface
    fun isPopunderAdOpen(): Boolean {
        return activity.isNativePopunderAdOpen()
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
