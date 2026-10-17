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
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLDecoder
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.regex.Pattern

/**
 * MaxPlay Inbuilt Kotlin Direct Stream Scraper Engine (Voe.sx & Filemoon.sx)
 * ----------------------------------------------------------------------
 * Executes 100% on the user's Android phone (same IP, zero server dependency, zero proxy rewriting):
 * 1. URL Normalization:
 *    - Filemoon (/d/xxx -> /e/xxx) & mirror domains (moonmov, kerapoxy, bysedikamoum, f16px)
 *    - Voe.sx (/xxx -> /e/xxx) & rotating Voe mirror domains
 * 2. Stage 1 (Fast OkHttp + Nested Iframe Follower + Unpacker):
 *    - Follows JS redirects (window.location.href / replace) and nested player <iframe src="...">
 *    - Unpacks Dean Edwards eval(function(p,a,c,k,e,d)...) blocks (base-36 / base-62)
 *    - Decodes VOE ROT13 + symbol-strip + Base64 + charShift(-3) + reverse + Base64 JSON payloads
 * 3. Stage 2 (Attached 1x1 Offscreen WebView Sniffer & Auto-Clicker — Puppeteer Equivalent):
 *    - Attaches an invisible 1x1 WebView to the live Activity container so Android Chromium never throttles JS
 *    - Spoofs Desktop Chrome User-Agent and navigator.webdriver = undefined
 *    - Blocks popup/ad hijack redirects while allowing legitimate Voe/Filemoon redirects
 *    - Intercepts all network requests across main & child frames for .m3u8 and ?mu= parameters
 *    - Simulates real touch + DOM play clicks (.play-btn, .jw-icon, video) and inspects jwplayer/videojs/eval(p,a,c,k,e,d)
 */
class InbuiltStreamScraper(private val activity: Activity) {

    companion object {
        const val DEFAULT_USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

        val okHttpClient: OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .build()

        private val AD_KEYWORDS = listOf(
            "doubleclick", "googlesyndication", "adservice", "popads", "popcash",
            "exoclick", "magsrv", "juicyads", "a-ads", "adsco", "onclick",
            "bet365", "1xbet", "casino", "clickadu", "hilltopads",
            "propellerads", "adsterra", "acscdn", "usrpubtrk", "tsyndicate"
        )

        private val KNOWN_STREAM_DOMAINS = listOf(
            "voe.sx", "voe", "reputationsickler", "turtledoveconsequent",
            "launchreliantcleaverriver", "fraudclatterflyingcar", "321naturelikefur",
            "ralphysuccessfull", "filemoon", "moonmov", "kerapoxy", "bysedikamoum",
            "f16px", "streamwish", "hlswish", "playerwish", "vidhide", "dood", "streamtape"
        )
    }

    /**
     * Normalizes provider URLs before scraping:
     * - Filemoon: /d/{code} -> /e/{code} (strips query/hash, exact match to normalizeFilemoonUrl)
     * - Voe: https://voe.sx/{code} -> https://voe.sx/e/{code}
     */
    fun normalizeProviderUrl(rawUrl: String): String {
        val trimmed = rawUrl.trim()
        if (trimmed.isEmpty()) return trimmed
        return try {
            val uri = android.net.Uri.parse(trimmed)
            val host = (uri.host ?: "").lowercase()
            val path = uri.path ?: ""

            // Filemoon & its mirror domains: convert /d/xxx to /e/xxx
            val isFilemoon = host.contains("filemoon") ||
                host.contains("moonmov") ||
                host.contains("kerapoxy") ||
                host.contains("bysedikamoum") ||
                host.contains("f16px")

            if (isFilemoon || path.startsWith("/d/")) {
                val newPath = path.replace(Regex("^/d/"), "/e/")
                return "${uri.scheme ?: "https"}://${uri.host}$newPath"
            }

            // Voe & its mirror domains: ensure /e/{code} when path is /{code}
            val isVoe = host.contains("voe") ||
                host.contains("reputationsickler") ||
                host.contains("turtledoveconsequent") ||
                host.contains("launchreliantcleaverriver") ||
                host.contains("fraudclatterflyingcar") ||
                host.contains("321naturelikefur") ||
                host.contains("ralphysuccessfull")

            if (isVoe && !path.startsWith("/e/")) {
                val segs = path.split("/").filter { it.isNotBlank() }
                if (segs.size == 1 && segs[0].length >= 6 && !segs[0].contains(".")) {
                    return "${uri.scheme ?: "https"}://${uri.host}/e/${segs[0]}"
                }
            }

            trimmed
        } catch (_: Exception) {
            trimmed
        }
    }

    /**
     * Stage 1: Fast Native OkHttp + Nested Iframe Follower + Unpacker
     */
    fun scrapeStreamSync(sourceUrl: String, customHeaders: Map<String, String> = emptyMap()): JSONObject {
        val normalizedUrl = normalizeProviderUrl(sourceUrl)

        try {
            if (normalizedUrl.lowercase().contains(".m3u8")) {
                CorsFreeWebViewClient.registerStreamReferer(normalizedUrl, normalizedUrl)
                return JSONObject().apply {
                    put("ok", true)
                    put("m3u8Url", normalizedUrl)
                    put("method", "direct_m3u8")
                }
            }

            var currentUrl = normalizedUrl
            var refererUrl = extractOriginWithSlash(normalizedUrl)
            var html = ""

            // Follow up to 5 hops of JS redirects or nested player iframes (e.g. Filemoon /e/ -> /bkg/)
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

                // Try extracting .m3u8 on the current page immediately
                val extractedNow = extractM3u8FromHtml(html, currentUrl)
                if (!extractedNow.isNullOrBlank()) {
                    return buildSuccessResponse(extractedNow, currentUrl, "kotlin_okhttp")
                }

                // Check for JS redirect (VOE frequently uses window.location.href = 'https://...')
                val jsRedirect = findJsRedirectUrl(html, currentUrl)
                if (!jsRedirect.isNullOrBlank() && jsRedirect != currentUrl) {
                    refererUrl = currentUrl
                    currentUrl = normalizeProviderUrl(jsRedirect)
                    continue
                }

                // Check for nested player <iframe src="..."> (Filemoon frequently embeds /bkg/ or kerapoxy/moonmov iframe)
                val nestedIframe = findLegitPlayerIframeUrl(html, currentUrl)
                if (!nestedIframe.isNullOrBlank() && nestedIframe != currentUrl) {
                    refererUrl = currentUrl
                    currentUrl = nestedIframe
                    continue
                }

                break
            }

            // Final check on last fetched HTML
            val finalExtracted = extractM3u8FromHtml(html, currentUrl)
            if (!finalExtracted.isNullOrBlank()) {
                return buildSuccessResponse(finalExtracted, currentUrl, "kotlin_okhttp")
            }

            return JSONObject().apply {
                put("ok", false)
                put("needsHeadlessSniffer", true)
                put("error", "Needs Headless WebView Sniffer for dynamic JS execution")
            }
        } catch (e: Exception) {
            return JSONObject().apply {
                put("ok", false)
                put("needsHeadlessSniffer", true)
                put("error", e.message ?: "OkHttp scrape exception")
            }
        }
    }

    private fun buildSuccessResponse(m3u8Url: String, refererPageUrl: String, method: String): JSONObject {
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
            put("method", method)
            put("headers", JSONObject().apply {
                put("Referer", refererPageUrl)
                put("Origin", origin)
                put("User-Agent", DEFAULT_USER_AGENT)
            })
        }
    }

    /**
     * Extracts .m3u8 from HTML using all 5 static & obfuscated extraction strategies:
     * 1. Packed JS: eval(function(p,a,c,k,e,d)...) unpacker (Filemoon / StreamWish / VidHide)
     * 2. VOE Obfuscated <script type="application/json"> (ROT13 -> symbol strip -> Base64 -> shift(-3) -> reverse -> Base64)
     * 3. VOE wc0 / Base64 JSON config ("hls": "...")
     * 4. Raw .m3u8 URLs in HTML / inline scripts (preferring master.m3u8)
     * 5. Inline atob('...') encoded .m3u8 strings
     */
    private fun extractM3u8FromHtml(html: String, baseUrl: String): String? {
        if (html.isBlank()) return null

        // Strategy 1: Unpack all eval(function(p,a,c,k,e,d)...) blocks (Filemoon primary method)
        val packedBlocks = extractPackedBlocks(html)
        for (block in packedBlocks) {
            val unpacked = unpackPacker(block)
            if (unpacked.isNotBlank()) {
                val candidates = findM3u8CandidatesInText(unpacked, baseUrl)
                val best = pickBestM3u8(candidates)
                if (best != null) return best
            }
        }

        // Strategy 2: VOE obfuscated <script type="application/json"> token
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

        // Strategy 3: VOE `let wc0 = '...'` or Base64 JSON config containing "hls"
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

        // Strategy 4: Direct / escaped .m3u8 links anywhere in the HTML
        val directCandidates = findM3u8CandidatesInText(html, baseUrl)
        val directBest = pickBestM3u8(directCandidates)
        if (directBest != null) return directBest

        // Strategy 5: Base64 encoded 'hls' or atob('...')
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
     * Decodes VOE's signature multi-step obfuscated payload:
     * ROT13 -> strip symbols (@$, ^^, ~@, %?, *~, !!, #&) -> Base64 decode -> shift chars (-3) -> reverse -> Base64 decode -> JSON
     */
    private fun decodeVoeObfuscatedPayload(raw: String): String? {
        return try {
            // Step 1: ROT13 on alphabetic characters
            val rot13 = StringBuilder(raw.length)
            for (ch in raw) {
                when (ch) {
                    in 'a'..'z' -> rot13.append('a' + (ch - 'a' + 13) % 26)
                    in 'A'..'Z' -> rot13.append('A' + (ch - 'A' + 13) % 26)
                    else -> rot13.append(ch)
                }
            }

            // Step 2: Strip VOE's marker tokens
            var cleaned = rot13.toString()
            val markers = listOf("@$", "^^", "~@", "%?", "*~", "!!", "#&")
            for (mk in markers) {
                cleaned = cleaned.replace(mk, "")
            }
            cleaned = cleaned.replace("_", "")

            // Step 3: Base64 decode
            val step3Bytes = Base64.decode(cleaned, Base64.DEFAULT)
            val step3Str = String(step3Bytes, Charsets.UTF_8)

            // Step 4: Shift each character code by -3
            val shifted = StringBuilder(step3Str.length)
            for (ch in step3Str) {
                shifted.append((ch.code - 3).toChar())
            }

            // Step 5: Reverse string & Base64 decode into JSON
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
     * Unpacks a Dean Edwards Packer block: eval(function(p,a,c,k,e,d){...}('payload',36,count,'sym1|sym2'.split('|'),0,{}))
     */
    fun unpackPacker(packedBlock: String): String {
        try {
            val argsRegex = Pattern.compile(
                """\}\s*\(\s*'(.*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([^']*)'\.split\('\|'\)""",
                Pattern.DOTALL
            )
            val m = argsRegex.matcher(packedBlock)
            if (!m.find()) return ""

            val payload = m.group(1) ?: return ""
            val radix = m.group(2)?.toIntOrNull() ?: 36
            val symtab = (m.group(4) ?: "").split("|")

            val wordPattern = Pattern.compile("""\b[0-9a-zA-Z]+\b""")
            val wordMatcher = wordPattern.matcher(payload)
            val sb = StringBuffer()

            while (wordMatcher.find()) {
                val word = wordMatcher.group(0) ?: continue
                val index = parseBaseRadix(word, radix)
                val replacement = if (index in symtab.indices && symtab[index].isNotEmpty()) {
                    symtab[index]
                } else {
                    word
                }
                wordMatcher.appendReplacement(sb, java.util.regex.Matcher.quoteReplacement(replacement))
            }
            wordMatcher.appendTail(sb)
            return sb.toString().replace("\\/", "/").replace("\\'", "'").replace("\\\"", "\"")
        } catch (_: Exception) {
            return ""
        }
    }

    private fun parseBaseRadix(str: String, radix: Int): Int {
        val chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
        var result = 0
        for (ch in str) {
            val digit = chars.indexOf(ch)
            if (digit < 0 || digit >= radix) return -1
            result = result * radix + digit
        }
        return result
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
        // Prefer master.m3u8 or index.m3u8 over single-variant playlists
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
        val m = Pattern.compile(
            """<iframe[^>]+src=["']([^"']+)["']""",
            Pattern.CASE_INSENSITIVE
        ).matcher(html)
        while (m.find()) {
            val rawSrc = (m.group(1) ?: "").trim()
            if (rawSrc.isEmpty() || rawSrc.startsWith("javascript:") || rawSrc == "about:blank") continue
            val resolved = resolveUrl(rawSrc, baseUrl)
            if (!isAdOrPopupUrl(resolved)) {
                return resolved
            }
        }
        return null
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
     * Stage 2: Attached 1x1 Offscreen WebView Sniffer & Auto-Clicker (Puppeteer Equivalent)
     * ----------------------------------------------------------------------
     * Runs on the Android Main Thread with an invisible 1x1 WebView attached to the Activity's
     * root container so Chromium executes all player timers, iframes, and JWPlayer/VideoJS scripts
     * at full speed without background throttling.
     */
    @SuppressLint("SetJavaScriptEnabled", "ClickableViewAccessibility")
    fun sniffStreamWithHeadlessWebView(
        sourceUrl: String,
        timeoutMs: Long = 22000L,
        onResult: (JSONObject) -> Unit
    ) {
        val mainHandler = Handler(Looper.getMainLooper())
        val isResolved = AtomicBoolean(false)
        val normalizedTargetUrl = normalizeProviderUrl(sourceUrl)

        mainHandler.post {
            var snifferWebView: WebView? = null
            var pollRunnable: Runnable? = null
            var currentSniffPageUrl = normalizedTargetUrl
            var followedNestedIframe = false
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

            fun finishWithM3u8(rawM3u8: String, refererUrl: String) {
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
                val res = buildSuccessResponse(decodedM3u8, refererUrl, "kotlin_headless_sniffer")
                onResult(res)
            }

            val timeoutRunnable = Runnable {
                if (isResolved.compareAndSet(false, true)) {
                    cleanupWebView()
                    onResult(JSONObject().apply {
                        put("ok", false)
                        put("error", "Headless WebView Sniffer timed out after ${timeoutMs}ms")
                    })
                }
            }
            mainHandler.postDelayed(timeoutRunnable, timeoutMs)

            try {
                // Create 1x1 invisible WebView attached to Activity container (prevents Chromium background freeze!)
                snifferWebView = WebView(activity).apply {
                    alpha = 0.01f
                    visibility = View.VISIBLE
                    layoutParams = FrameLayout.LayoutParams(1, 1)

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
                            // Block all ad popup windows
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
                                // Block ad/popup hijack redirects on the main frame
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

                            // 1. Direct .m3u8 network request interception (all frames)
                            if (lower.contains(".m3u8") && !lower.contains("jwpltx") && !lower.contains("ping.gif")) {
                                mainHandler.removeCallbacks(timeoutRunnable)
                                mainHandler.post { finishWithM3u8(reqUrl, currentSniffPageUrl) }
                            }

                            // 2. Filemoon / JWPlayer ?mu= query parameter interception
                            if (lower.contains("mu=")) {
                                try {
                                    val muParam = reqUri.getQueryParameter("mu")
                                    if (!muParam.isNullOrBlank() && muParam.lowercase().contains(".m3u8")) {
                                        mainHandler.removeCallbacks(timeoutRunnable)
                                        mainHandler.post { finishWithM3u8(muParam, currentSniffPageUrl) }
                                    }
                                } catch (_: Exception) {
                                }
                            }

                            // 3. Block known ad scripts from slowing down the offscreen scraper
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
                            // Spoof navigator.webdriver = undefined & disable window.open popups
                            view?.evaluateJavascript(
                                """
                                (function() {
                                    try {
                                        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                                        window.open = function() { return null; };
                                    } catch(e) {}
                                })();
                                """.trimIndent(),
                                null
                            )
                        }
                    }
                }

                parentContainer?.addView(snifferWebView)

                // Active polling loop every 700ms (simulates clicks + inspects JWPlayer/VideoJS/eval(p,a,c,k,e,d)/iframes)
                pollRunnable = object : Runnable {
                    override fun run() {
                        if (isResolved.get() || snifferWebView == null) return

                        val wv = snifferWebView ?: return

                        // Simulate real hardware touch tap at center of WebView
                        try {
                            val now = SystemClock.uptimeMillis()
                            val down = MotionEvent.obtain(now, now, MotionEvent.ACTION_DOWN, 0.5f, 0.5f, 0)
                            val up = MotionEvent.obtain(now, now + 40, MotionEvent.ACTION_UP, 0.5f, 0.5f, 0)
                            wv.dispatchTouchEvent(down)
                            wv.dispatchTouchEvent(up)
                            down.recycle()
                            up.recycle()
                        } catch (_: Exception) {
                        }

                        // Evaluate comprehensive in-browser JS extractor & play button clicker
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

                                    // 1. Click play overlays & buttons
                                    var sels = ['.play-btn', '#play-btn', '.play-wrapper', '.jw-display-icon-display',
                                                '.jw-icon-playback', '.vjs-big-play-button', 'video', 'button', '[class*="play"]'];
                                    for (var i = 0; i < sels.length; i++) {
                                        var el = document.querySelector(sels[i]);
                                        if (el && typeof el.click === 'function') {
                                            try { el.click(); } catch(e) {}
                                        }
                                    }
                                    if (document.body) { try { document.body.click(); } catch(e) {} }

                                    // 2. Check JWPlayer API
                                    if (typeof jwplayer === 'function') {
                                        try {
                                            var p = jwplayer();
                                            if (p) {
                                                if (typeof p.play === 'function') { try { p.play(true); } catch(e) {} }
                                                if (typeof p.getPlaylist === 'function') {
                                                    var pl = JSON.stringify(p.getPlaylist());
                                                    var jm = findM3u8(pl);
                                                    if (jm) return JSON.stringify({ type: 'm3u8', url: jm });
                                                }
                                                if (typeof p.getPlaylistItem === 'function') {
                                                    var item = JSON.stringify(p.getPlaylistItem());
                                                    var im = findM3u8(item);
                                                    if (im) return JSON.stringify({ type: 'm3u8', url: im });
                                                }
                                            }
                                        } catch(e) {}
                                    }

                                    // 3. Check <video> and <source> elements
                                    var vids = document.querySelectorAll('video, source');
                                    for (var v = 0; v < vids.length; v++) {
                                        var src = vids[v].currentSrc || vids[v].src || vids[v].getAttribute('src') || '';
                                        if (src.indexOf('.m3u8') !== -1) {
                                            return JSON.stringify({ type: 'm3u8', url: src });
                                        }
                                        if (vids[v].tagName === 'VIDEO' && typeof vids[v].play === 'function') {
                                            try { vids[v].muted = true; vids[v].play(); } catch(e) {}
                                        }
                                    }

                                    // 4. Check Performance Resource Timing entries (.m3u8 or mu=)
                                    if (window.performance && typeof performance.getEntriesByType === 'function') {
                                        var entries = performance.getEntriesByType('resource') || [];
                                        for (var r = 0; r < entries.length; r++) {
                                            var name = entries[r].name || '';
                                            if (name.indexOf('.m3u8') !== -1 && name.indexOf('jwpltx') === -1) {
                                                return JSON.stringify({ type: 'm3u8', url: name });
                                            }
                                            if (name.indexOf('mu=') !== -1) {
                                                try {
                                                    var mu = new URL(name).searchParams.get('mu');
                                                    if (mu && mu.indexOf('.m3u8') !== -1) {
                                                        return JSON.stringify({ type: 'm3u8', url: mu });
                                                    }
                                                } catch(e) {}
                                            }
                                        }
                                    }

                                    // 5. Unpack eval(function(p,a,c,k,e,d)...) directly in JS engine
                                    var scripts = document.querySelectorAll('script');
                                    for (var s = 0; s < scripts.length; s++) {
                                        var txt = scripts[s].textContent || '';
                                        if (txt.indexOf('eval(function(p,a,c,k,e,') !== -1) {
                                            var idx = txt.indexOf('eval(function(p,a,c,k,e,');
                                            var sub = txt.slice(idx + 4);
                                            try {
                                                var unpacked = eval(sub);
                                                var um = findM3u8(unpacked);
                                                if (um) return JSON.stringify({ type: 'm3u8', url: um });
                                            } catch(e) {}
                                        }
                                        var dm = findM3u8(txt);
                                        if (dm) return JSON.stringify({ type: 'm3u8', url: dm });
                                    }

                                    // 6. Check for nested legitimate player iframe (e.g. Filemoon /bkg/ iframe)
                                    var iframes = document.querySelectorAll('iframe');
                                    for (var f = 0; f < iframes.length; f++) {
                                        var fsrc = iframes[f].src || iframes[f].getAttribute('src') || '';
                                        if (fsrc && fsrc.indexOf('http') === 0 &&
                                            fsrc.indexOf('doubleclick') === -1 &&
                                            fsrc.indexOf('googlesyndication') === -1 &&
                                            fsrc.indexOf('popads') === -1 &&
                                            fsrc.indexOf('exoclick') === -1) {
                                            return JSON.stringify({ type: 'iframe', url: fsrc });
                                        }
                                    }
                                } catch(e) {}
                                return '';
                            })();
                        """.trimIndent()

                        wv.evaluateJavascript(activeProbeJs) { rawResult ->
                            if (isResolved.get()) return@evaluateJavascript
                            val unquoted = rawResult
                                ?.trim()
                                ?.removeSurrounding("\"")
                                ?.replace("\\\"", "\"")
                                ?.replace("\\\\", "\\")
                                ?.replace("\\/", "/")
                                ?: ""

                            if (unquoted.startsWith("{")) {
                                try {
                                    val obj = JSONObject(unquoted)
                                    val type = obj.optString("type")
                                    val url = obj.optString("url")
                                    if (type == "m3u8" && url.contains(".m3u8")) {
                                        mainHandler.removeCallbacks(timeoutRunnable)
                                        finishWithM3u8(url, currentSniffPageUrl)
                                        return@evaluateJavascript
                                    } else if (
                                        type == "iframe" &&
                                        url.startsWith("http") &&
                                        !followedNestedIframe &&
                                        (SystemClock.elapsedRealtime() - startTimeMs) > 3200L
                                    ) {
                                        // Navigate directly into nested player iframe (e.g. Filemoon /bkg/ embed) with Referer
                                        followedNestedIframe = true
                                        val headers = mapOf("Referer" to currentSniffPageUrl)
                                        currentSniffPageUrl = url
                                        wv.loadUrl(url, headers)
                                    }
                                } catch (_: Exception) {
                                }
                            }
                        }

                        if (!isResolved.get()) {
                            mainHandler.postDelayed(this, 700L)
                        }
                    }
                }

                // Start loading normalized provider URL with Origin/Referer headers
                val initialHeaders = mapOf(
                    "Referer" to extractOriginWithSlash(normalizedTargetUrl)
                )
                snifferWebView?.loadUrl(normalizedTargetUrl, initialHeaders)
                mainHandler.postDelayed(pollRunnable!!, 1200L)

            } catch (e: Exception) {
                if (isResolved.compareAndSet(false, true)) {
                    mainHandler.removeCallbacks(timeoutRunnable)
                    cleanupWebView()
                    onResult(JSONObject().apply {
                        put("ok", false)
                        put("error", e.message ?: "WebView sniffer initialization error")
                    })
                }
            }
        }
    }
}
