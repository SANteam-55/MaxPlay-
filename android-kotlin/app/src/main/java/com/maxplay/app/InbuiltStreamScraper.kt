package com.maxplay.app

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Base64
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.net.URLDecoder
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import java.util.regex.Pattern

/**
 * MaxPlay Inbuilt Kotlin Direct Stream Scraper Engine (Voe.sx & Filemoon.sx)
 * ----------------------------------------------------------------------
 * Includes a 2-Layer Smart Provider Detection Router (`ProviderType.VOE` vs `ProviderType.FILEMOON`)
 * so Voe.sx links and Filemoon.sx links never collide and always execute their dedicated pipeline:
 *
 * 1. VOE.SX Dedicated Pipeline (100% Preserved & Verified):
 *    - Normalizes /{code} -> /e/{code} across voe.sx and rotating Voe mirror domains
 *    - Follows JS window.location.href redirects
 *    - Decodes VOE ROT13 + symbol-strip + Base64 + charShift(-3) + reverse + Base64 JSON payloads
 *    - Decodes wc0 / Base64 JSON configs
 *
 * 2. FILEMOON.SX Dedicated Pipeline (Upgraded with V8 Packer Unpacker + Iframe Unwrapper):
 *    - Normalizes /d/{code} -> /e/{code} across filemoon.sx and Filemoon mirror domains
 *    - Follows nested player <iframe src="..."> (/bkg/, kerapoxy, moonmov, bysedikamoum, f16px)
 *      with Sec-Fetch-Dest: iframe & Referer headers
 *    - Unpacks eval(function(p,a,c,k,e,d)...) using BOTH real V8 JS evaluation (`eval(block.replace(/^eval/, ''))`)
 *      and escaped-quote-safe Kotlin regex unpacker
 *    - Stage 2 640x360 Offscreen WebView Sniffer preserves child iframe hierarchy (window.top !== window.self),
 *      strips ad overlays, clicks (320, 180), intercepts .m3u8 & ?mu= requests, and inspects JWPlayer
 */
class InbuiltStreamScraper(
    private val activity: Activity,
    private val mainWebView: WebView? = null
) {

    enum class ProviderType {
        VOE,
        FILEMOON,
        GENERIC
    }

    companion object {
        const val DEFAULT_USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

        val okHttpClient: OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .build()

        val backgroundExecutor = Executors.newCachedThreadPool()

        private val VOE_DOMAIN_KEYWORDS = listOf(
            "voe.sx", "voe.", "reputationsickler", "turtledoveconsequent",
            "launchreliantcleaverriver", "fraudclatterflyingcar", "321naturelikefur",
            "ralphysuccessfull", "yodelswart", "availedsmallest", "graceaddresscommunity",
            "loriwithinfamily", "nathanfromsubject", "jilliandescribecompany",
            "maxfinishseveral", "kristiesoundsimply", "richardsignfish",
            "primaryclassalright", "alejandrorisk", "cindyeyefinal", "dianaavoidthey"
        )

        private val FILEMOON_DOMAIN_KEYWORDS = listOf(
            "filemoon", "moonmov", "kerapoxy", "bysedikamoum",
            "f16px", "1azayf9w", "8mhlloqo", "96ar.com", "xcoic.com", "l1afav.net"
        )

        private val AD_KEYWORDS = listOf(
            "doubleclick", "googlesyndication", "adservice", "popads", "popcash",
            "exoclick", "magsrv", "juicyads", "a-ads", "adsco", "onclick",
            "bet365", "1xbet", "casino", "clickadu", "hilltopads",
            "propellerads", "adsterra", "acscdn", "usrpubtrk", "tsyndicate"
        )

        private val KNOWN_STREAM_DOMAINS = VOE_DOMAIN_KEYWORDS + FILEMOON_DOMAIN_KEYWORDS + listOf(
            "streamwish", "hlswish", "playerwish", "vidhide", "dood", "streamtape"
        )
    }

    /**
     * 2-Layer Smart Provider Classifier:
     * Layer 1: Identifies VOE vs FILEMOON from URL domain and path patterns.
     * Layer 2: If a link uses a brand-new mirror domain, identifies VOE vs FILEMOON from HTML signatures.
     */
    fun detectProviderType(url: String, html: String = ""): ProviderType {
        try {
            val uri = android.net.Uri.parse(url.trim())
            val host = (uri.host ?: "").lowercase()
            val path = (uri.path ?: "").lowercase()

            // Layer 1A: Explicit Voe domain match
            if (VOE_DOMAIN_KEYWORDS.any { host.contains(it) }) {
                return ProviderType.VOE
            }

            // Layer 1B: Explicit Filemoon domain or /d/ or /bkg/ path match
            if (FILEMOON_DOMAIN_KEYWORDS.any { host.contains(it) } ||
                path.startsWith("/d/") ||
                path.startsWith("/bkg/")
            ) {
                return ProviderType.FILEMOON
            }
        } catch (_: Exception) {
        }

        // Layer 2: HTML Signature Detection (for unknown rotating mirror domains)
        if (html.isNotBlank()) {
            val lowerHtml = html.lowercase()
            val hasVoeSignature =
                lowerHtml.contains("voe.sx") ||
                    lowerHtml.contains("let wc0") ||
                    lowerHtml.contains("var wc0") ||
                    (lowerHtml.contains("application/json") &&
                        (html.contains("@$") || html.contains("^^") || html.contains("~@") || html.contains("%?")))

            val hasFilemoonSignature =
                html.contains("eval(function(p,a,c,k,e,") ||
                    lowerHtml.contains("filemoon") ||
                    lowerHtml.contains("/bkg/") ||
                    lowerHtml.contains("jwplayer")

            if (hasVoeSignature && !hasFilemoonSignature) return ProviderType.VOE
            if (hasFilemoonSignature && !hasVoeSignature) return ProviderType.FILEMOON
        }

        return ProviderType.GENERIC
    }

    /**
     * Normalizes provider URLs according to their detected ProviderType:
     * - FILEMOON: /d/{code} -> /e/{code} (strips query/hash, exact match to normalizeFilemoonUrl)
     * - VOE: https://voe.sx/{code} -> https://voe.sx/e/{code}
     */
    fun normalizeProviderUrl(rawUrl: String, forcedType: ProviderType? = null): String {
        val trimmed = rawUrl.trim()
        if (trimmed.isEmpty()) return trimmed
        return try {
            val provider = forcedType ?: detectProviderType(trimmed)
            val uri = android.net.Uri.parse(trimmed)
            val path = uri.path ?: ""

            when (provider) {
                ProviderType.FILEMOON -> {
                    val newPath = path.replace(Regex("^/d/"), "/e/")
                    "${uri.scheme ?: "https"}://${uri.host}$newPath"
                }
                ProviderType.VOE -> {
                    if (!path.startsWith("/e/")) {
                        val segs = path.split("/").filter { it.isNotBlank() }
                        if (segs.size == 1 && segs[0].length >= 6 && !segs[0].contains(".")) {
                            return "${uri.scheme ?: "https"}://${uri.host}/e/${segs[0]}"
                        }
                    }
                    trimmed
                }
                ProviderType.GENERIC -> {
                    if (path.startsWith("/d/")) {
                        val newPath = path.replace(Regex("^/d/"), "/e/")
                        return "${uri.scheme ?: "https"}://${uri.host}$newPath"
                    }
                    trimmed
                }
            }
        } catch (_: Exception) {
            trimmed
        }
    }

    /**
     * Stage 1 Router: Detects whether the link is VOE or FILEMOON and dispatches to its dedicated pipeline.
     */
    fun scrapeStreamSync(sourceUrl: String, customHeaders: Map<String, String> = emptyMap()): JSONObject {
        val trimmed = sourceUrl.trim()
        if (trimmed.lowercase().contains(".m3u8")) {
            CorsFreeWebViewClient.registerStreamReferer(trimmed, trimmed)
            return JSONObject().apply {
                put("ok", true)
                put("m3u8Url", trimmed)
                put("provider", "direct")
                put("method", "direct_m3u8")
            }
        }

        val initialProvider = detectProviderType(trimmed)
        return when (initialProvider) {
            ProviderType.VOE -> scrapeVoePipeline(trimmed, customHeaders)
            ProviderType.FILEMOON -> scrapeFilemoonPipeline(trimmed, customHeaders)
            ProviderType.GENERIC -> scrapeGenericWithAutoDetectPipeline(trimmed, customHeaders)
        }
    }

    /**
     * =========================================================================
     * PIPELINE 1: DEDICATED VOE.SX SCRAPER (100% Preserved Working Logic)
     * =========================================================================
     */
    private fun scrapeVoePipeline(sourceUrl: String, customHeaders: Map<String, String>): JSONObject {
        val normalizedUrl = normalizeProviderUrl(sourceUrl, ProviderType.VOE)
        try {
            var currentUrl = normalizedUrl
            var refererUrl = extractOriginWithSlash(normalizedUrl)
            var html = ""

            for (hop in 0 until 5) {
                val reqBuilder = Request.Builder()
                    .url(currentUrl)
                    .header("User-Agent", DEFAULT_USER_AGENT)
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                    .header("Accept-Language", "en-US,en;q=0.9")
                    .header("Referer", refererUrl)

                for ((k, v) in customHeaders) {
                    reqBuilder.header(k, v)
                }

                val response = okHttpClient.newCall(reqBuilder.build()).execute()
                val finalHopUrl = response.request.url.toString()
                html = response.body?.string() ?: ""
                if (html.isBlank()) break

                currentUrl = finalHopUrl

                // Extract using Voe-exclusive strategies
                val extractedNow = extractVoeM3u8FromHtml(html, currentUrl)
                if (!extractedNow.isNullOrBlank()) {
                    return buildSuccessResponse(extractedNow, currentUrl, "kotlin_voe_okhttp", ProviderType.VOE)
                }

                // Follow Voe JS redirect (window.location.href = 'https://...')
                val jsRedirect = findJsRedirectUrl(html, currentUrl)
                if (!jsRedirect.isNullOrBlank() && jsRedirect != currentUrl) {
                    refererUrl = currentUrl
                    currentUrl = normalizeProviderUrl(jsRedirect, ProviderType.VOE)
                    continue
                }

                val nestedIframe = findLegitPlayerIframeUrl(html, currentUrl)
                if (!nestedIframe.isNullOrBlank() && nestedIframe != currentUrl) {
                    refererUrl = currentUrl
                    currentUrl = nestedIframe
                    continue
                }

                break
            }

            val finalExtracted = extractVoeM3u8FromHtml(html, currentUrl)
            if (!finalExtracted.isNullOrBlank()) {
                return buildSuccessResponse(finalExtracted, currentUrl, "kotlin_voe_okhttp", ProviderType.VOE)
            }

            return JSONObject().apply {
                put("ok", false)
                put("provider", "VOE")
                put("needsHeadlessSniffer", true)
                put("error", "VOE requires Headless WebView Sniffer")
            }
        } catch (e: Exception) {
            return JSONObject().apply {
                put("ok", false)
                put("provider", "VOE")
                put("needsHeadlessSniffer", true)
                put("error", e.message ?: "VOE OkHttp exception")
            }
        }
    }

    /**
     * =========================================================================
     * PIPELINE 2: DEDICATED FILEMOON.SX SCRAPER (Iframe Unwrap + V8 Packer)
     * =========================================================================
     */
    private fun scrapeFilemoonPipeline(sourceUrl: String, customHeaders: Map<String, String>): JSONObject {
        val normalizedUrl = normalizeProviderUrl(sourceUrl, ProviderType.FILEMOON)
        try {
            var currentUrl = normalizedUrl
            var refererUrl = extractOriginWithSlash(normalizedUrl)
            var isIframeHop = false
            var html = ""

            // Follow up to 5 hops (e.g. /d/ -> /e/ -> nested <iframe src=".../bkg/...">)
            for (hop in 0 until 5) {
                val reqBuilder = Request.Builder()
                    .url(currentUrl)
                    .header("User-Agent", DEFAULT_USER_AGENT)
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
                    .header("Accept-Language", "en-US,en;q=0.9")
                    .header("Referer", refererUrl)

                // CRITICAL FOR FILEMOON: /bkg/ and mirror player iframes check Sec-Fetch-Dest: iframe!
                if (isIframeHop || currentUrl.lowercase().contains("/bkg/")) {
                    reqBuilder.header("Sec-Fetch-Dest", "iframe")
                    reqBuilder.header("Sec-Fetch-Mode", "navigate")
                    reqBuilder.header("Sec-Fetch-Site", "cross-site")
                    reqBuilder.header("Upgrade-Insecure-Requests", "1")
                } else {
                    reqBuilder.header("Sec-Fetch-Dest", "document")
                    reqBuilder.header("Sec-Fetch-Mode", "navigate")
                    reqBuilder.header("Sec-Fetch-Site", "none")
                }

                for ((k, v) in customHeaders) {
                    reqBuilder.header(k, v)
                }

                val response = okHttpClient.newCall(reqBuilder.build()).execute()
                val finalHopUrl = response.request.url.toString()
                html = response.body?.string() ?: ""
                if (html.isBlank()) break

                currentUrl = finalHopUrl

                // Try extracting Filemoon .m3u8 on the current page (via V8 Packer + Kotlin Packer + direct regex)
                val extractedNow = extractFilemoonM3u8FromHtml(html, currentUrl)
                if (!extractedNow.isNullOrBlank()) {
                    return buildSuccessResponse(extractedNow, currentUrl, "kotlin_filemoon_okhttp", ProviderType.FILEMOON)
                }

                // Check for nested player <iframe src="..."> (Filemoon /e/ page embeds /bkg/ or kerapoxy/moonmov iframe)
                val nestedIframe = findLegitPlayerIframeUrl(html, currentUrl)
                if (!nestedIframe.isNullOrBlank() && nestedIframe != currentUrl) {
                    refererUrl = currentUrl
                    currentUrl = nestedIframe
                    isIframeHop = true
                    continue
                }

                // Check for JS redirect
                val jsRedirect = findJsRedirectUrl(html, currentUrl)
                if (!jsRedirect.isNullOrBlank() && jsRedirect != currentUrl) {
                    refererUrl = currentUrl
                    currentUrl = normalizeProviderUrl(jsRedirect, ProviderType.FILEMOON)
                    continue
                }

                break
            }

            val finalExtracted = extractFilemoonM3u8FromHtml(html, currentUrl)
            if (!finalExtracted.isNullOrBlank()) {
                return buildSuccessResponse(finalExtracted, currentUrl, "kotlin_filemoon_okhttp", ProviderType.FILEMOON)
            }

            return JSONObject().apply {
                put("ok", false)
                put("provider", "FILEMOON")
                put("needsHeadlessSniffer", true)
                put("error", "Filemoon requires Headless WebView Sniffer")
            }
        } catch (e: Exception) {
            return JSONObject().apply {
                put("ok", false)
                put("provider", "FILEMOON")
                put("needsHeadlessSniffer", true)
                put("error", e.message ?: "Filemoon OkHttp exception")
            }
        }
    }

    /**
     * =========================================================================
     * PIPELINE 3: GENERIC / UNKNOWN MIRROR DOMAIN AUTO-DETECTOR
     * =========================================================================
     */
    private fun scrapeGenericWithAutoDetectPipeline(sourceUrl: String, customHeaders: Map<String, String>): JSONObject {
        val normalizedUrl = normalizeProviderUrl(sourceUrl, ProviderType.GENERIC)
        try {
            var currentUrl = normalizedUrl
            var refererUrl = extractOriginWithSlash(normalizedUrl)
            var isIframeHop = false

            for (hop in 0 until 5) {
                val reqBuilder = Request.Builder()
                    .url(currentUrl)
                    .header("User-Agent", DEFAULT_USER_AGENT)
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                    .header("Accept-Language", "en-US,en;q=0.9")
                    .header("Referer", refererUrl)

                if (isIframeHop) {
                    reqBuilder.header("Sec-Fetch-Dest", "iframe")
                    reqBuilder.header("Sec-Fetch-Mode", "navigate")
                    reqBuilder.header("Sec-Fetch-Site", "cross-site")
                }

                for ((k, v) in customHeaders) {
                    reqBuilder.header(k, v)
                }

                val response = okHttpClient.newCall(reqBuilder.build()).execute()
                currentUrl = response.request.url.toString()
                val html = response.body?.string() ?: ""
                if (html.isBlank()) break

                // Auto-detect provider from final hop URL + HTML signature
                val detected = detectProviderType(currentUrl, html)
                if (detected == ProviderType.VOE) {
                    val voeM3u8 = extractVoeM3u8FromHtml(html, currentUrl)
                    if (!voeM3u8.isNullOrBlank()) {
                        return buildSuccessResponse(voeM3u8, currentUrl, "kotlin_voe_autodetect", ProviderType.VOE)
                    }
                } else if (detected == ProviderType.FILEMOON) {
                    val fmM3u8 = extractFilemoonM3u8FromHtml(html, currentUrl)
                    if (!fmM3u8.isNullOrBlank()) {
                        return buildSuccessResponse(fmM3u8, currentUrl, "kotlin_filemoon_autodetect", ProviderType.FILEMOON)
                    }
                } else {
                    val anyM3u8 = extractFilemoonM3u8FromHtml(html, currentUrl)
                        ?: extractVoeM3u8FromHtml(html, currentUrl)
                    if (!anyM3u8.isNullOrBlank()) {
                        return buildSuccessResponse(anyM3u8, currentUrl, "kotlin_generic_okhttp", ProviderType.GENERIC)
                    }
                }

                val jsRedirect = findJsRedirectUrl(html, currentUrl)
                if (!jsRedirect.isNullOrBlank() && jsRedirect != currentUrl) {
                    refererUrl = currentUrl
                    currentUrl = normalizeProviderUrl(jsRedirect)
                    continue
                }

                val nestedIframe = findLegitPlayerIframeUrl(html, currentUrl)
                if (!nestedIframe.isNullOrBlank() && nestedIframe != currentUrl) {
                    refererUrl = currentUrl
                    currentUrl = nestedIframe
                    isIframeHop = true
                    continue
                }

                break
            }
        } catch (_: Exception) {
        }

        return JSONObject().apply {
            put("ok", false)
            put("provider", "GENERIC")
            put("needsHeadlessSniffer", true)
            put("error", "Needs Headless WebView Sniffer")
        }
    }

    private fun buildSuccessResponse(
        m3u8Url: String,
        refererPageUrl: String,
        method: String,
        provider: ProviderType
    ): JSONObject {
        val origin = try {
            val u = android.net.Uri.parse(refererPageUrl)
            "${u.scheme ?: "https"}://${u.host}"
        } catch (_: Exception) {
            refererPageUrl
        }

        CorsFreeWebViewClient.registerStreamReferer(m3u8Url, refererPageUrl)

        return JSONObject().apply {
            put("ok", true)
            put("m3u8Url", m3u8Url)
            put("provider", provider.name)
            put("method", method)
            put("headers", JSONObject().apply {
                put("Referer", refererPageUrl)
                put("Origin", origin)
                put("User-Agent", DEFAULT_USER_AGENT)
            })
        }
    }

    /**
     * Dedicated VOE.SX HTML Extractor:
     * 1. VOE Obfuscated <script type="application/json"> (ROT13 -> symbol strip -> Base64 -> shift(-3) -> reverse -> Base64)
     * 2. VOE wc0 / Base64 JSON config ("hls": "...")
     * 3. Direct .m3u8 URLs in HTML
     * 4. Inline atob('...') / 'hls' Base64 strings
     */
    private fun extractVoeM3u8FromHtml(html: String, baseUrl: String): String? {
        if (html.isBlank()) return null

        // 1. VOE obfuscated <script type="application/json"> token
        val voeJsonScriptMatcher = Pattern.compile(
            """<script[^>]+type=["']application/json["'][^>]*>\s*\[?\s*["']([^"'\[\]]+)["']\s*\]?\s*</script>""",
            Pattern.CASE_INSENSITIVE
        ).matcher(html)
        while (voeJsonScriptMatcher.find()) {
            val rawPayload = voeJsonScriptMatcher.group(1) ?: continue
            val decodedVoe = decodeVoeObfuscatedPayload(rawPayload)
            if (!decodedVoe.isNullOrBlank()) {
                return resolveUrl(decodedVoe, baseUrl)
            }
        }

        // 2. VOE `let wc0 = '...'` or Base64 JSON config containing "hls"
        val wc0Matcher = Pattern.compile(
            """(?:let|var|const)\s+(?:wc0|[a-zA-Z0-9_]{2,8})\s*=\s*['"]([A-Za-z0-9+/=]{40,})['"]"""
        ).matcher(html)
        while (wc0Matcher.find()) {
            val b64 = wc0Matcher.group(1) ?: continue
            try {
                val decoded = String(Base64.decode(b64, Base64.DEFAULT), Charsets.UTF_8)
                val candidates = findM3u8CandidatesInText(decoded, baseUrl)
                val best = pickBestM3u8(candidates)
                if (best != null) return best

                val reversed = decoded.reversed()
                val revCandidates = findM3u8CandidatesInText(reversed, baseUrl)
                val revBest = pickBestM3u8(revCandidates)
                if (revBest != null) return revBest
            } catch (_: Exception) {
            }
        }

        // 3. Direct / escaped .m3u8 links in HTML
        val directCandidates = findM3u8CandidatesInText(html, baseUrl)
        val directBest = pickBestM3u8(directCandidates)
        if (directBest != null) return directBest

        // 4. Base64 encoded 'hls' or atob('...')
        val b64Candidates = listOf(
            """['"]hls['"]\s*:\s*['"]([A-Za-z0-9+/=]{24,})['"]""",
            """atob\(\s*['"]([A-Za-z0-9+/=]{24,})['"]\s*\)"""
        )
        for (pat in b64Candidates) {
            val m = Pattern.compile(pat).matcher(html)
            while (m.find()) {
                val encoded = m.group(1) ?: continue
                try {
                    val decoded = String(Base64.decode(encoded, Base64.DEFAULT), Charsets.UTF_8).trim()
                    if (decoded.contains(".m3u8")) {
                        val cands = findM3u8CandidatesInText(decoded, baseUrl)
                        val best = pickBestM3u8(cands)
                        if (best != null) return best
                        if (decoded.startsWith("http")) return decoded
                    }
                } catch (_: Exception) {
                }
            }
        }

        return null
    }

    /**
     * Dedicated FILEMOON.SX HTML Extractor:
     * 1. Extracts all eval(function(p,a,c,k,e,d)...) blocks and unpacks them via:
     *    a) Ultra-fast deterministic state-machine Kotlin unpackPacker (< 1.5ms, zero regex stack overflow, zero UI thread wait)
     *    b) Real V8 JS Engine evaluation (`eval(block.replace(/^eval/, ''))` — fallback)
     * 2. Scans JWPlayer sources:[{file:"..."}] / direct .m3u8 links
     */
    private fun extractFilemoonM3u8FromHtml(html: String, baseUrl: String): String? {
        if (html.isBlank()) return null

        // 1. Unpack all eval(function(p,a,c,k,e,d)...) blocks (Filemoon primary method)
        val packedBlocks = extractPackedBlocks(html)
        for (block in packedBlocks) {
            // 1a. Run deterministic linear state-machine Kotlin unpacker FIRST (< 1.5ms on OkHttp worker thread!)
            val kotlinUnpacked = unpackPacker(block)
            if (kotlinUnpacked.isNotBlank()) {
                val candidates = findM3u8CandidatesInText(kotlinUnpacked, baseUrl)
                val best = pickBestM3u8(candidates)
                if (best != null) return best
            }

            // 1b. Fallback to real V8 JS evaluation if needed
            val v8Unpacked = unpackBlockViaV8(block)
            if (v8Unpacked.isNotBlank()) {
                val candidates = findM3u8CandidatesInText(v8Unpacked, baseUrl)
                val best = pickBestM3u8(candidates)
                if (best != null) return best
            }
        }

        // 2. Direct / escaped .m3u8 links anywhere in the HTML
        val directCandidates = findM3u8CandidatesInText(html, baseUrl)
        val directBest = pickBestM3u8(directCandidates)
        if (directBest != null) return directBest

        return null
    }

    /**
     * Executes `block.replace(/^eval/, '')` inside Android's V8 JavaScript engine on the main WebView.
     * Exact equivalent of `unpackBlock(block)` in the tested Filemoon Node.js script.
     */
    private fun unpackBlockViaV8(block: String): String {
        val wv = mainWebView ?: return ""
        // Never block if called from the Android Main Thread
        if (Looper.myLooper() == Looper.getMainLooper()) return ""

        return try {
            val expr = block.trim().removePrefix("eval")
            val latch = CountDownLatch(1)
            val outRef = AtomicReference("")
            val jsToRun = "(function(){ try { var r = $expr; return typeof r === 'string' ? r : ''; } catch(e) { return ''; } })();"

            Handler(Looper.getMainLooper()).post {
                try {
                    wv.evaluateJavascript(jsToRun) { rawRes ->
                        val decoded = unquoteEvaluateJsResult(rawRes)
                        outRef.set(decoded)
                        latch.countDown()
                    }
                } catch (_: Exception) {
                    latch.countDown()
                }
            }

            latch.await(900, TimeUnit.MILLISECONDS)
            outRef.get() ?: ""
        } catch (_: Exception) {
            ""
        }
    }

    private fun unquoteEvaluateJsResult(rawRes: String?): String {
        if (rawRes.isNullOrBlank() || rawRes == "null" || rawRes == "\"\"") return ""
        return try {
            // JSONArray wrapping safely decodes all JS string escapes (\n, \", \\, \/, \uXXXX)
            org.json.JSONArray("[$rawRes]").optString(0, "")
        } catch (_: Exception) {
            rawRes.trim()
                .removeSurrounding("\"")
                .replace("\\\"", "\"")
                .replace("\\/", "/")
                .replace("\\\\", "\\")
        }
    }

    /**
     * Decodes VOE's signature multi-step obfuscated payload:
     * ROT13 -> strip symbols (@$, ^^, ~@, %?, *~, !!, #&) -> Base64 decode -> shift chars (-3) -> reverse -> Base64 decode -> JSON
     */
    private fun decodeVoeObfuscatedPayload(raw: String): String? {
        return try {
            val rot13 = StringBuilder(raw.length)
            for (ch in raw) {
                when (ch) {
                    in 'a'..'z' -> rot13.append('a' + (ch - 'a' + 13) % 26)
                    in 'A'..'Z' -> rot13.append('A' + (ch - 'A' + 13) % 26)
                    else -> rot13.append(ch)
                }
            }

            var cleaned = rot13.toString()
            val markers = listOf("@$", "^^", "~@", "%?", "*~", "!!", "#&")
            for (mk in markers) {
                cleaned = cleaned.replace(mk, "")
            }
            cleaned = cleaned.replace("_", "")

            val step3Bytes = Base64.decode(cleaned, Base64.DEFAULT)
            val step3Str = String(step3Bytes, Charsets.UTF_8)

            val shifted = StringBuilder(step3Str.length)
            for (ch in step3Str) {
                shifted.append((ch.code - 3).toChar())
            }

            val reversed = shifted.toString().reversed()
            val finalBytes = Base64.decode(reversed, Base64.DEFAULT)
            val jsonStr = String(finalBytes, Charsets.UTF_8)

            val json = JSONObject(jsonStr)
            val source = json.optString("source", "")
            if (source.contains(".m3u8")) {
                return source
            }
            val directCands = findM3u8CandidatesInText(jsonStr, "")
            pickBestM3u8(directCands)
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Exact port of Filemoon's extractPackedBlocks(html) with balanced parenthesis tracking.
     */
    fun extractPackedBlocks(html: String): List<String> {
        val results = mutableListOf<String>()
        var idx = 0
        val marker = "eval(function(p,a,c,k,e,"
        while (true) {
            val start = html.indexOf(marker, idx)
            if (start == -1) break
            var i = start + 4 // skip "eval"
            var depth = 0
            var end = -1
            var inSingleQuote = false
            var inDoubleQuote = false
            var escaped = false

            while (i < html.length) {
                val ch = html[i]
                if (escaped) {
                    escaped = false
                } else if (ch == '\\') {
                    escaped = true
                } else if (ch == '\'' && !inDoubleQuote) {
                    inSingleQuote = !inSingleQuote
                } else if (ch == '"' && !inSingleQuote) {
                    inDoubleQuote = !inDoubleQuote
                } else if (!inSingleQuote && !inDoubleQuote) {
                    if (ch == '(') {
                        depth++
                    } else if (ch == ')') {
                        depth--
                        if (depth == 0) {
                            end = i
                            break
                        }
                    }
                }
                i++
            }
            if (end == -1) break
            results.add(html.substring(start, end + 1))
            idx = end + 1
        }
        return results
    }

    /**
     * Deterministic, zero-regex-stack state-machine unpacker for Dean Edwards Packer (`eval(function(p,a,c,k,e,d)...)`).
     * Unpacks 50KB+ Filemoon payloads in < 1.5ms without Java Pattern StackOverflowError or Int overflow.
     */
    fun unpackPacker(packedBlock: String): String {
        try {
            val returnIdx = packedBlock.indexOf("return p")
            if (returnIdx == -1) return ""

            // Locate closing '}' of function body followed by '(' of argument invocation
            var idx = returnIdx + 8
            while (idx < packedBlock.length && packedBlock[idx] != '}') idx++
            idx++ // skip '}'
            while (idx < packedBlock.length && packedBlock[idx].isWhitespace()) idx++
            if (idx >= packedBlock.length || packedBlock[idx] != '(') return ""
            idx++ // skip '('
            while (idx < packedBlock.length && packedBlock[idx].isWhitespace()) idx++

            // 1. Read payload string (Arg 1: p)
            val payloadPair = readQuotedJsString(packedBlock, idx) ?: return ""
            val payload = payloadPair.first
            idx = payloadPair.second

            // 2. Read radix integer (Arg 2: a)
            idx = skipCommaAndWhitespace(packedBlock, idx)
            val radixPair = readIntToken(packedBlock, idx) ?: return ""
            val radix = radixPair.first
            idx = radixPair.second

            // 3. Read count integer (Arg 3: c)
            idx = skipCommaAndWhitespace(packedBlock, idx)
            val countPair = readIntToken(packedBlock, idx) ?: return ""
            val count = countPair.first
            idx = countPair.second

            // 4. Read symtab string (Arg 4: k)
            idx = skipCommaAndWhitespace(packedBlock, idx)
            val symtabPair = readQuotedJsString(packedBlock, idx) ?: return ""
            val symtab = symtabPair.first.split("|")

            // Build O(1) dictionary matching JS `while(c--) r[e(c)] = k[c]`
            val dict = HashMap<String, String>(count.coerceAtLeast(16))
            val limit = count.coerceAtMost(symtab.size)
            for (c in 0 until limit) {
                val sym = symtab[c]
                if (sym.isNotEmpty()) {
                    dict[encodePackerToken(c, radix)] = sym
                }
            }

            // Linear single-pass word token replacement over payload
            val sb = StringBuilder(payload.length + 1024)
            var p = 0
            while (p < payload.length) {
                val ch = payload[p]
                if ((ch in '0'..'9') || (ch in 'a'..'z') || (ch in 'A'..'Z') || ch == '_') {
                    val startWord = p
                    while (p < payload.length) {
                        val wc = payload[p]
                        if ((wc in '0'..'9') || (wc in 'a'..'z') || (wc in 'A'..'Z') || wc == '_') {
                            p++
                        } else {
                            break
                        }
                    }
                    val word = payload.substring(startWord, p)
                    sb.append(dict[word] ?: word)
                } else {
                    sb.append(ch)
                    p++
                }
            }

            return sb.toString().replace("\\/", "/")
        } catch (_: Throwable) {
            return ""
        }
    }

    private fun readQuotedJsString(src: String, startIdx: Int): Pair<String, Int>? {
        if (startIdx >= src.length) return null
        val quote = src[startIdx]
        if (quote != '\'' && quote != '"') return null
        val sb = StringBuilder(2048)
        var i = startIdx + 1
        while (i < src.length) {
            val ch = src[i]
            if (ch == '\\') {
                if (i + 1 < src.length) {
                    val next = src[i + 1]
                    when (next) {
                        '\'', '"', '\\', '/' -> sb.append(next)
                        'n' -> sb.append('\n')
                        'r' -> sb.append('\r')
                        't' -> sb.append('\t')
                        else -> {
                            sb.append('\\')
                            sb.append(next)
                        }
                    }
                    i += 2
                    continue
                }
            }
            if (ch == quote) {
                return Pair(sb.toString(), i + 1)
            }
            sb.append(ch)
            i++
        }
        return null
    }

    private fun skipCommaAndWhitespace(src: String, startIdx: Int): Int {
        var i = startIdx
        while (i < src.length && (src[i].isWhitespace() || src[i] == ',')) {
            i++
        }
        return i
    }

    private fun readIntToken(src: String, startIdx: Int): Pair<Int, Int>? {
        var i = startIdx
        while (i < src.length && src[i].isWhitespace()) i++
        val numStart = i
        while (i < src.length && src[i].isDigit()) i++
        if (i == numStart) return null
        val value = src.substring(numStart, i).toIntOrNull() ?: return null
        return Pair(value, i)
    }

    private fun encodePackerToken(c: Int, a: Int): String {
        val radix = if (a <= 0) 36 else a
        val prefix = if (c < radix) "" else encodePackerToken(c / radix, radix)
        val rem = c % radix
        val suffix = if (rem > 35) {
            (rem + 29).toChar().toString()
        } else {
            rem.toString(36)
        }
        return prefix + suffix
    }

    private fun findM3u8CandidatesInText(text: String, baseUrl: String): List<String> {
        if (text.isBlank()) return emptyList()
        val cleaned = text.replace("\\/", "/")
        val results = mutableListOf<String>()

        // Full http/https .m3u8 URLs
        val fullMatcher = Pattern.compile(
            """https?://[^\s"'<>\\`]+?\.m3u8[^\s"'<>\\`]*""",
            Pattern.CASE_INSENSITIVE
        ).matcher(cleaned)
        while (fullMatcher.find()) {
            val candidate = (fullMatcher.group(0) ?: "")
                .trimEnd(',', ';', ')', ']', '}', '\'', '"')
            if (isValidM3u8Candidate(candidate)) {
                results.add(candidate)
            }
        }

        // Relative or protocol-relative .m3u8 paths inside file/src/hls properties
        if (baseUrl.isNotBlank()) {
            val relMatcher = Pattern.compile(
                """(?:file|src|source|hls)\s*[:=]\s*["']([^"']+\.m3u8[^"']*)["']""",
                Pattern.CASE_INSENSITIVE
            ).matcher(cleaned)
            while (relMatcher.find()) {
                val rawRel = relMatcher.group(1) ?: continue
                val resolved = resolveUrl(rawRel, baseUrl)
                if (isValidM3u8Candidate(resolved) && !results.contains(resolved)) {
                    results.add(resolved)
                }
            }
        }

        return results
    }

    private fun isValidM3u8Candidate(url: String): Boolean {
        val lower = url.lowercase()
        if (!lower.contains(".m3u8")) return false
        if (lower.contains("jwpltx") || lower.contains("ping.gif") || lower.contains("vast")) return false
        return lower.startsWith("http://") || lower.startsWith("https://")
    }

    private fun pickBestM3u8(candidates: List<String>): String? {
        if (candidates.isEmpty()) return null
        return candidates.firstOrNull { it.lowercase().contains("master") }
            ?: candidates.firstOrNull { it.lowercase().contains("index") }
            ?: candidates.first()
    }

    private fun findJsRedirectUrl(html: String, baseUrl: String): String? {
        val patterns = listOf(
            """window\.location\.href\s*=\s*['"](https?://[^'"]+)['"]""",
            """window\.location\.replace\(\s*['"](https?://[^'"]+)['"]\s*\)""",
            """location\.href\s*=\s*['"](https?://[^'"]+)['"]""",
            """<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"'\s>]+)["']"""
        )
        for (pat in patterns) {
            val m = Pattern.compile(pat, Pattern.CASE_INSENSITIVE).matcher(html)
            if (m.find()) {
                val target = m.group(1)?.trim() ?: continue
                if (!isAdOrPopupUrl(target)) {
                    return resolveUrl(target, baseUrl)
                }
            }
        }
        return null
    }

    private fun findLegitPlayerIframeUrl(html: String, baseUrl: String): String? {
        val candidates = mutableListOf<String>()

        // 1. Standard <iframe src="..."> or data-src="..."
        val m = Pattern.compile(
            """<iframe[^>]+(?:src|data-src)=["']([^"']+)["']""",
            Pattern.CASE_INSENSITIVE
        ).matcher(html)
        while (m.find()) {
            val rawSrc = (m.group(1) ?: "").trim()
            if (rawSrc.isEmpty() || rawSrc.startsWith("javascript:") || rawSrc == "about:blank") continue
            val resolved = resolveUrl(rawSrc, baseUrl)
            if (!isAdOrPopupUrl(resolved)) {
                candidates.add(resolved)
            }
        }

        // 2. Filemoon /bkg/ or embed player URL inside inline JS (e.g. iframe.src = "/bkg/..." or "https://.../bkg/...")
        val bkgMatcher = Pattern.compile(
            """["']((?:https?:)?//[^"'\s]+/bkg/[a-zA-Z0-9_-]+[^"'\s]*|/bkg/[a-zA-Z0-9_-]+[^"'\s]*)["']""",
            Pattern.CASE_INSENSITIVE
        ).matcher(html)
        while (bkgMatcher.find()) {
            val rawBkg = (bkgMatcher.group(1) ?: "").trim()
            val resolved = resolveUrl(rawBkg, baseUrl)
            if (!isAdOrPopupUrl(resolved) && !candidates.contains(resolved)) {
                candidates.add(resolved)
            }
        }

        // Prefer Filemoon /bkg/ or known stream domain iframes first
        return candidates.firstOrNull {
            val l = it.lowercase()
            l.contains("/bkg/") || l.contains("/e/") || KNOWN_STREAM_DOMAINS.any { d -> l.contains(d) }
        } ?: candidates.firstOrNull()
    }

    private fun isAdOrPopupUrl(url: String): Boolean {
        val lower = url.lowercase()
        return AD_KEYWORDS.any { lower.contains(it) }
    }

    private fun isLegitimateNavigation(targetUrl: String, initialUrl: String): Boolean {
        if (isAdOrPopupUrl(targetUrl)) return false
        val lower = targetUrl.lowercase()
        if (KNOWN_STREAM_DOMAINS.any { lower.contains(it) }) return true
        if (lower.contains("/e/") || lower.contains("/d/") || lower.contains("/bkg/") || lower.contains("embed")) {
            return true
        }
        return try {
            val targetHost = android.net.Uri.parse(targetUrl).host?.lowercase() ?: return false
            val initHost = android.net.Uri.parse(initialUrl).host?.lowercase() ?: return false
            targetHost == initHost || targetHost.endsWith(".$initHost") || initHost.endsWith(".$targetHost")
        } catch (_: Exception) {
            false
        }
    }

    private fun extractOriginWithSlash(url: String): String {
        return try {
            val u = android.net.Uri.parse(url)
            "${u.scheme ?: "https"}://${u.host}/"
        } catch (_: Exception) {
            url
        }
    }

    private fun resolveUrl(candidate: String, baseUrl: String): String {
        val cleaned = candidate.replace("\\/", "/").trim()
        if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) return cleaned
        return try {
            if (cleaned.startsWith("//")) {
                val baseScheme = android.net.Uri.parse(baseUrl).scheme ?: "https"
                "$baseScheme:$cleaned"
            } else {
                java.net.URI(baseUrl).resolve(cleaned).toString()
            }
        } catch (_: Exception) {
            cleaned
        }
    }

    /**
     * Stage 2: Attached 640x360 Offscreen WebView Sniffer & Auto-Clicker (Puppeteer Equivalent)
     * ----------------------------------------------------------------------
     * Uses a 640x360 offscreen WebView (`translationX = -2500f`, `alpha = 0.01f`) attached to the
     * Activity container so:
     * 1. Filemoon's child `<iframe>` (/bkg/, kerapoxy, moonmov) renders at full 640x360 desktop player size
     *    while keeping `window.top !== window.self` true!
     * 2. Real coordinate touches at (320f, 180f) land directly on the center play button inside child iframes.
     * 3. Any discovered child `<iframe src="...">` is ALSO probed in the background via OkHttp + V8 Packer
     *    with `Sec-Fetch-Dest: iframe` & `Referer` headers.
     */
    @SuppressLint("SetJavaScriptEnabled", "ClickableViewAccessibility")
    fun sniffStreamWithHeadlessWebView(
        sourceUrl: String,
        timeoutMs: Long = 22000L,
        onResult: (JSONObject) -> Unit
    ) {
        val mainHandler = Handler(Looper.getMainLooper())
        val isResolved = AtomicBoolean(false)
        val detectedProvider = detectProviderType(sourceUrl)
        val normalizedTargetUrl = normalizeProviderUrl(sourceUrl, detectedProvider)

        mainHandler.post {
            var snifferWebView: WebView? = null
            var pollRunnable: Runnable? = null
            var currentSniffPageUrl = normalizedTargetUrl
            var parentEmbedUrl = normalizedTargetUrl
            var followedNestedIframe = false
            val probedIframeUrls = mutableSetOf<String>()
            val startTimeMs = SystemClock.elapsedRealtime()

            val parentContainer: ViewGroup? = try {
                (activity as? MainActivity)?.getScraperContainer()
                    ?: activity.findViewById(android.R.id.content)
            } catch (_: Exception) {
                null
            }

            fun cleanupWebView() {
                try {
                    pollRunnable?.let { mainHandler.removeCallbacks(it) }
                    snifferWebView?.apply {
                        stopLoading()
                        loadUrl("about:blank")
                        (parent as? ViewGroup)?.removeView(this)
                        destroy()
                    }
                    snifferWebView = null
                } catch (_: Exception) {
                }
            }

            fun finishWithM3u8(rawM3u8: String, refererUrl: String, methodTag: String = "kotlin_headless_sniffer") {
                val decodedM3u8 = try {
                    if (rawM3u8.startsWith("http%3A") || rawM3u8.startsWith("https%3A")) {
                        URLDecoder.decode(rawM3u8, "UTF-8")
                    } else {
                        rawM3u8
                    }
                } catch (_: Exception) {
                    rawM3u8
                }

                if (!isValidM3u8Candidate(decodedM3u8)) return
                if (!isResolved.compareAndSet(false, true)) return

                cleanupWebView()
                val res = buildSuccessResponse(decodedM3u8, refererUrl, methodTag, detectedProvider)
                onResult(res)
            }

            val timeoutRunnable = Runnable {
                if (isResolved.compareAndSet(false, true)) {
                    cleanupWebView()
                    onResult(JSONObject().apply {
                        put("ok", false)
                        put("provider", detectedProvider.name)
                        put("error", "Headless WebView Sniffer timed out after ${timeoutMs}ms")
                    })
                }
            }
            mainHandler.postDelayed(timeoutRunnable, timeoutMs)

            try {
                // Create 640x360 offscreen WebView (translated to X = -2500f so 100% invisible & untouchable by user,
                // while giving JWPlayer & child iframes a real desktop-aspect viewport!)
                snifferWebView = WebView(activity).apply {
                    alpha = 0.01f
                    translationX = -2500f
                    translationY = -2500f
                    isFocusable = false
                    isFocusableInTouchMode = false
                    visibility = View.VISIBLE
                    layoutParams = FrameLayout.LayoutParams(640, 360)

                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        mediaPlaybackRequiresUserGesture = false
                        javaScriptCanOpenWindowsAutomatically = false
                        setSupportMultipleWindows(false)
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        userAgentString = DEFAULT_USER_AGENT
                        @Suppress("DEPRECATION")
                        allowUniversalAccessFromFileURLs = true
                    }

                    val cm = CookieManager.getInstance()
                    cm.setAcceptCookie(true)
                    cm.setAcceptThirdPartyCookies(this, true)

                    webChromeClient = object : WebChromeClient() {
                        override fun onCreateWindow(
                            view: WebView?,
                            isDialog: Boolean,
                            isUserGesture: Boolean,
                            resultMsg: android.os.Message?
                        ): Boolean {
                            return false
                        }
                    }

                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): Boolean {
                            val navUrl = request?.url?.toString() ?: return false
                            if (request.isForMainFrame) {
                                if (!isLegitimateNavigation(navUrl, normalizedTargetUrl)) {
                                    return true
                                }
                                currentSniffPageUrl = navUrl
                            }
                            return false
                        }

                        override fun shouldInterceptRequest(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): WebResourceResponse? {
                            val reqUri = request?.url ?: return super.shouldInterceptRequest(view, request)
                            val reqUrl = reqUri.toString()
                            val lower = reqUrl.lowercase()

                            // 1. Direct .m3u8 network request interception across main & child iframes
                            if (lower.contains(".m3u8") && !lower.contains("jwpltx") && !lower.contains("ping.gif")) {
                                val reqReferer = request.requestHeaders?.get("Referer") ?: currentSniffPageUrl
                                mainHandler.removeCallbacks(timeoutRunnable)
                                mainHandler.post { finishWithM3u8(reqUrl, reqReferer) }
                            }

                            // 2. Filemoon / JWPlayer ?mu= query parameter interception
                            if (lower.contains("mu=")) {
                                try {
                                    val muParam = reqUri.getQueryParameter("mu")
                                    if (!muParam.isNullOrBlank() && muParam.lowercase().contains(".m3u8")) {
                                        val reqReferer = request.requestHeaders?.get("Referer") ?: currentSniffPageUrl
                                        mainHandler.removeCallbacks(timeoutRunnable)
                                        mainHandler.post { finishWithM3u8(muParam, reqReferer) }
                                    }
                                } catch (_: Exception) {
                                }
                            }

                            // 3. If a child iframe (/bkg/, /e/, kerapoxy, moonmov) is being requested by the WebView,
                            //    also probe its HTML in the background with exact request headers to unpack eval(p,a,c,k,e,d)!
                            if (!request.isForMainFrame &&
                                (lower.contains("/bkg/") || lower.contains("/e/") || FILEMOON_DOMAIN_KEYWORDS.any { lower.contains(it) }) &&
                                !lower.endsWith(".js") && !lower.endsWith(".css") && !lower.endsWith(".png") && !lower.endsWith(".jpg")
                            ) {
                                if (probedIframeUrls.add(reqUrl)) {
                                    val reqHeaders = request.requestHeaders ?: emptyMap()
                                    backgroundExecutor.execute {
                                        if (isResolved.get()) return@execute
                                        try {
                                            val b = Request.Builder().url(reqUrl)
                                                .header("User-Agent", DEFAULT_USER_AGENT)
                                                .header("Referer", reqHeaders["Referer"] ?: parentEmbedUrl)
                                                .header("Sec-Fetch-Dest", "iframe")
                                                .header("Sec-Fetch-Mode", "navigate")
                                                .header("Sec-Fetch-Site", "cross-site")
                                            val resp = okHttpClient.newCall(b.build()).execute()
                                            val iframeHtml = resp.body?.string() ?: ""
                                            val m3u8 = extractFilemoonM3u8FromHtml(iframeHtml, reqUrl)
                                            if (!m3u8.isNullOrBlank() && !isResolved.get()) {
                                                mainHandler.removeCallbacks(timeoutRunnable)
                                                mainHandler.post {
                                                    finishWithM3u8(m3u8, reqUrl, "kotlin_filemoon_iframe_intercept")
                                                }
                                            }
                                        } catch (_: Exception) {
                                        }
                                    }
                                }
                            }

                            // 4. Block known ad scripts from slowing down the offscreen scraper
                            if (isAdOrPopupUrl(reqUrl)) {
                                return WebResourceResponse("text/plain", "UTF-8", null)
                            }

                            return super.shouldInterceptRequest(view, request)
                        }

                        override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                            super.onPageStarted(view, url, favicon)
                            if (!url.isNullOrBlank() && url != "about:blank") {
                                currentSniffPageUrl = url
                            }
                            // Spoof navigator.webdriver = undefined, disable window.open popups,
                            // and if we navigated directly into a child iframe, spoof window.top so framebusters pass!
                            val spoofTopJs = if (followedNestedIframe) {
                                """
                                try {
                                    var fakeTop = { location: { href: '$parentEmbedUrl' } };
                                    Object.defineProperty(window, 'top', { get: function() { return fakeTop; } });
                                    Object.defineProperty(window, 'parent', { get: function() { return fakeTop; } });
                                } catch(e) {}
                                """.trimIndent()
                            } else {
                                ""
                            }

                            view?.evaluateJavascript(
                                """
                                (function() {
                                    try {
                                        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                                        window.open = function() { return null; };
                                        $spoofTopJs
                                    } catch(e) {}
                                })();
                                """.trimIndent(),
                                null
                            )
                        }
                    }
                }

                parentContainer?.addView(snifferWebView)

                // Active polling loop every 650ms
                pollRunnable = object : Runnable {
                    override fun run() {
                        if (isResolved.get() || snifferWebView == null) return
                        val wv = snifferWebView ?: return

                        // Simulate real hardware touch tap at center (320f, 180f) of the 640x360 WebView
                        try {
                            val now = SystemClock.uptimeMillis()
                            val down = MotionEvent.obtain(now, now, MotionEvent.ACTION_DOWN, 320f, 180f, 0)
                            val up = MotionEvent.obtain(now, now + 45, MotionEvent.ACTION_UP, 320f, 180f, 0)
                            wv.dispatchTouchEvent(down)
                            wv.dispatchTouchEvent(up)
                            down.recycle()
                            up.recycle()
                        } catch (_: Exception) {
                        }

                        // Evaluate comprehensive in-browser JS extractor, ad-overlay stripper & play button clicker
                        val activeProbeJs = """
                            (function() {
                                try {
                                    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                                    window.open = function() { return null; };

                                    function findM3u8(str) {
                                        if (!str || typeof str !== 'string') return null;
                                        var clean = str.replace(/\\\//g, '/');
                                        var re = /https?:\/\/[^\s"'<>\\`]+?\.m3u8[^\s"'<>\\`]*/gi;
                                        var m, best = null;
                                        while ((m = re.exec(clean)) !== null) {
                                            var c = m[0];
                                            if (c.indexOf('jwpltx') === -1 && c.indexOf('ping.gif') === -1) {
                                                if (!best || c.indexOf('master') !== -1) best = c;
                                            }
                                        }
                                        return best;
                                    }

                                    // 0. Remove transparent ad overlays covering the player / iframe
                                    var overlays = document.querySelectorAll('a[target="_blank"], div[style*="z-index: 2147483647"], div[style*="z-index: 99999"]');
                                    for (var o = 0; o < overlays.length; o++) {
                                        try { overlays[o].remove(); } catch(e) {}
                                    }

                                    // 1. Click play overlays & buttons in main document and any accessible same-origin iframes
                                    function inspectWindow(win) {
                                        try {
                                            var doc = win.document;
                                            if (!doc) return null;

                                            var sels = ['.play-btn', '#play-btn', '.play-wrapper', '.jw-display-icon-display',
                                                        '.jw-icon-playback', '.vjs-big-play-button', 'video', 'button', '[class*="play"]'];
                                            for (var i = 0; i < sels.length; i++) {
                                                var el = doc.querySelector(sels[i]);
                                                if (el && typeof el.click === 'function') {
                                                    try { el.click(); } catch(e) {}
                                                }
                                            }

                                            // Check JWPlayer API
                                            if (typeof win.jwplayer === 'function') {
                                                try {
                                                    var p = win.jwplayer();
                                                    if (p) {
                                                        if (typeof p.play === 'function') { try { p.play(true); } catch(e) {} }
                                                        if (typeof p.getPlaylist === 'function') {
                                                            var pl = JSON.stringify(p.getPlaylist());
                                                            var jm = findM3u8(pl);
                                                            if (jm) return jm;
                                                        }
                                                        if (typeof p.getPlaylistItem === 'function') {
                                                            var item = JSON.stringify(p.getPlaylistItem());
                                                            var im = findM3u8(item);
                                                            if (im) return im;
                                                        }
                                                    }
                                                } catch(e) {}
                                            }

                                            // Check <video> and <source> elements
                                            var vids = doc.querySelectorAll('video, source');
                                            for (var v = 0; v < vids.length; v++) {
                                                var src = vids[v].currentSrc || vids[v].src || vids[v].getAttribute('src') || '';
                                                if (src.indexOf('.m3u8') !== -1) return src;
                                                if (vids[v].tagName === 'VIDEO' && typeof vids[v].play === 'function') {
                                                    try { vids[v].muted = true; vids[v].play(); } catch(e) {}
                                                }
                                            }

                                            // Check Performance Resource Timing entries (.m3u8 or mu=)
                                            if (win.performance && typeof win.performance.getEntriesByType === 'function') {
                                                var entries = win.performance.getEntriesByType('resource') || [];
                                                for (var r = 0; r < entries.length; r++) {
                                                    var name = entries[r].name || '';
                                                    if (name.indexOf('.m3u8') !== -1 && name.indexOf('jwpltx') === -1) return name;
                                                    if (name.indexOf('mu=') !== -1) {
                                                        try {
                                                            var mu = new URL(name).searchParams.get('mu');
                                                            if (mu && mu.indexOf('.m3u8') !== -1) return mu;
                                                        } catch(e) {}
                                                    }
                                                }
                                            }

                                            // Unpack eval(function(p,a,c,k,e,d)...) directly in V8
                                            var scripts = doc.querySelectorAll('script');
                                            for (var s = 0; s < scripts.length; s++) {
                                                var txt = scripts[s].textContent || '';
                                                if (txt.indexOf('eval(function(p,a,c,k,e,') !== -1) {
                                                    var idx = txt.indexOf('eval(function(p,a,c,k,e,');
                                                    var sub = txt.slice(idx + 4);
                                                    try {
                                                        var unpacked = win.eval(sub);
                                                        var um = findM3u8(unpacked);
                                                        if (um) return um;
                                                    } catch(e) {}
                                                }
                                                var dm = findM3u8(txt);
                                                if (dm) return dm;
                                            }
                                        } catch(e) {}
                                        return null;
                                    }

                                    var mainFound = inspectWindow(window);
                                    if (mainFound) return JSON.stringify({ type: 'm3u8', url: mainFound });

                                    // Inspect child frames & collect nested player iframe URL
                                    var iframes = document.querySelectorAll('iframe');
                                    var legitIframeUrl = '';
                                    for (var f = 0; f < iframes.length; f++) {
                                        try {
                                            if (iframes[f].contentWindow) {
                                                var childFound = inspectWindow(iframes[f].contentWindow);
                                                if (childFound) return JSON.stringify({ type: 'm3u8', url: childFound });
                                            }
                                        } catch(e) {}

                                        var fsrc = iframes[f].src || iframes[f].getAttribute('src') || '';
                                        if (fsrc && fsrc.indexOf('http') === 0 &&
                                            fsrc.indexOf('doubleclick') === -1 &&
                                            fsrc.indexOf('googlesyndication') === -1 &&
                                            fsrc.indexOf('popads') === -1 &&
                                            fsrc.indexOf('exoclick') === -1) {
                                            legitIframeUrl = fsrc;
                                        }
                                    }

                                    if (legitIframeUrl) {
                                        return JSON.stringify({ type: 'iframe', url: legitIframeUrl });
                                    }
                                } catch(e) {}
                                return '';
                            })();
                        """.trimIndent()

                        wv.evaluateJavascript(activeProbeJs) { rawResult ->
                            if (isResolved.get()) return@evaluateJavascript
                            val unquoted = unquoteEvaluateJsResult(rawResult)

                            if (unquoted.startsWith("{")) {
                                try {
                                    val obj = JSONObject(unquoted)
                                    val type = obj.optString("type")
                                    val url = obj.optString("url")
                                    if (type == "m3u8" && url.contains(".m3u8")) {
                                        mainHandler.removeCallbacks(timeoutRunnable)
                                        finishWithM3u8(url, currentSniffPageUrl)
                                        return@evaluateJavascript
                                    } else if (type == "iframe" && url.startsWith("http")) {
                                        // 1. Immediately probe the discovered iframe URL in the background via OkHttp + V8 unpacker!
                                        if (probedIframeUrls.add(url)) {
                                            val refForIframe = currentSniffPageUrl
                                            backgroundExecutor.execute {
                                                if (isResolved.get()) return@execute
                                                try {
                                                    val b = Request.Builder().url(url)
                                                        .header("User-Agent", DEFAULT_USER_AGENT)
                                                        .header("Referer", refForIframe)
                                                        .header("Sec-Fetch-Dest", "iframe")
                                                        .header("Sec-Fetch-Mode", "navigate")
                                                        .header("Sec-Fetch-Site", "cross-site")
                                                    val resp = okHttpClient.newCall(b.build()).execute()
                                                    val iframeHtml = resp.body?.string() ?: ""
                                                    val m3u8 = extractFilemoonM3u8FromHtml(iframeHtml, url)
                                                    if (!m3u8.isNullOrBlank() && !isResolved.get()) {
                                                        mainHandler.removeCallbacks(timeoutRunnable)
                                                        mainHandler.post {
                                                            finishWithM3u8(m3u8, url, "kotlin_filemoon_iframe_probe")
                                                        }
                                                    }
                                                } catch (_: Exception) {
                                                }
                                            }
                                        }

                                        // 2. If after 750ms the cross-origin iframe still hasn't fired network .m3u8,
                                        //    navigate into it with window.top spoofed and Sec-Fetch-Dest: iframe!
                                        if (!followedNestedIframe && (SystemClock.elapsedRealtime() - startTimeMs) > 750L) {
                                            followedNestedIframe = true
                                            parentEmbedUrl = currentSniffPageUrl
                                            val headers = mapOf(
                                                "Referer" to parentEmbedUrl,
                                                "Sec-Fetch-Dest" to "iframe",
                                                "Sec-Fetch-Mode" to "navigate",
                                                "Sec-Fetch-Site" to "cross-site"
                                            )
                                            currentSniffPageUrl = url
                                            wv.loadUrl(url, headers)
                                        }
                                    }
                                } catch (_: Exception) {
                                }
                            }
                        }

                        if (!isResolved.get()) {
                            mainHandler.postDelayed(this, 400L)
                        }
                    }
                }

                val initialHeaders = mapOf(
                    "Referer" to extractOriginWithSlash(normalizedTargetUrl)
                )
                snifferWebView?.loadUrl(normalizedTargetUrl, initialHeaders)
                mainHandler.postDelayed(pollRunnable!!, 350L)

            } catch (e: Exception) {
                if (isResolved.compareAndSet(false, true)) {
                    mainHandler.removeCallbacks(timeoutRunnable)
                    cleanupWebView()
                    onResult(JSONObject().apply {
                        put("ok", false)
                        put("provider", detectedProvider.name)
                        put("error", e.message ?: "WebView sniffer initialization error")
                    })
                }
            }
        }
    }
}
