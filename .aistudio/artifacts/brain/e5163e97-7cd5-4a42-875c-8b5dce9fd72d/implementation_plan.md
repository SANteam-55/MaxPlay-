# MaxPlay Inbuilt Kotlin Direct HLS Scraper Engine (Voe.sx & Filemoon.sx)

Upgrade the MaxPlay Android Kotlin application with a 100% on-device, Puppeteer-equivalent **Direct HLS Stream Scraper Engine** for **Voe.sx** (including all rotating Voe mirror domains) and **Filemoon.sx** (including `/d/` to `/e/` normalization and nested player iframes). Because scraping and playback happen on the same mobile device (same IP and User-Agent), extracted `.m3u8` URLs are passed **directly** to the custom player and sequential downloader without any proxy URL rewriting.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Existing System Protection Guarantee**: Your live MaxPlay React application, UI components, Firebase database, Admin Panel, and server routes remain 100% untouched and protected. All scraping upgrades happen inside the native Android Kotlin bridge (`android-kotlin`) and its native bridge adapter.

- **Confirmed Decision 1 — Direct `.m3u8` Playback & Download (Zero Proxy / Zero Rewriting)**: Since the phone itself extracts the `.m3u8` link, the CDN token is bound to the user's own IP address. The scraper returns the **direct `.m3u8` URL** to the video player and downloader without `/api/proxy` wrapping or `.m3u8` playlist rewriting.
- **Confirmed Decision 2 — Transparent Header Support (`CorsFreeWebViewClient`)**: For CDN hosts (like Filemoon) that check `Referer` or `Origin` headers on direct `.m3u8` / `.ts` requests, `CorsFreeWebViewClient` automatically attaches the matched `Referer` and `Access-Control-Allow-Origin: *` headers in the background while keeping the stream URL 100% direct.
- **Confirmed Decision 3 — Puppeteer-Equivalent Attached Hidden WebView Engine**: Android Chromium throttles unattached `applicationContext` WebViews. The upgraded scraper attaches a `1x1 px` invisible hardware-accelerated `WebView` to the Activity container, blocks ad/popup redirects, simulates real touch + DOM play clicks across main and child frames, intercepts `.m3u8` & `mu=` requests, and runs active JS fallbacks (`jwplayer`, `videojs`, `plyr`, `eval(p,a,c,k,e,d)` unpacker, and VOE ROT13/Base64 decoding).

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Series Episode Click**: When a user taps any Episode on the Details screen, the inbuilt Kotlin scraper extracts the direct `.m3u8` master stream from the Voe.sx or Filemoon link and plays it immediately in MaxPlay's custom player.
  2. **Movie Click**: When a user taps Play on a Movie card or Details screen, its single provider link is scraped on-device and handed directly to the custom player.
  3. **Sequential Multi-Episode & Movie Downloads**: When a user selects qualities/episodes in the Download Modal and taps Download, the queue worker scrapes each episode link on-device one by one and downloads the HLS segments directly to offline storage.
- **Target Audience / Persona**: MaxPlay Android users watching and downloading movies and web series in full HD without browser CORS blocks, server queues, or IP mismatch `403 Forbidden` errors.
- **Key Value**: Instant, unlimited on-device stream extraction with zero external server dependency.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  - **Seamless Watch Flow**: User taps an episode or movie -> MaxPlay's native loading state appears briefly (`1–4 seconds`) while the hidden Kotlin engine extracts the direct `.m3u8` -> Custom video player starts playing with full quality & audio track switching.
  - **Seamless Download Flow**: User opens the Download Selection Modal -> Real qualities (`1080p`, `720p`, `480p`) and audio tracks are probed via the native scraper -> User selects episodes and starts download -> `DownloadManager` scrapes and downloads each episode sequentially (`1 -> 2 -> 3`).
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Preserves MaxPlay's existing dark cinema UI (`#0A0A0A` obsidian canvas, crimson/violet accents, and custom video player controls) with zero visual alterations.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Two-Stage Hybrid Extraction (Fast OkHttp + Attached Headless WebView)**
  - *Chosen Approach*:
    - **Stage 1 (Fast OkHttp + Nested Iframe Follower)**: Normalizes `/d/` to `/e/`, follows JS redirects (`window.location.href`) and nested `<iframe src="...">` (used by Filemoon `/bkg/` embeds), unpacks `eval(function(p,a,c,k,e,d))`, and decodes VOE ROT13/Base64 payloads in `< 1 second` whenever possible.
    - **Stage 2 (Attached Headless WebView Sniffer & Auto-Clicker)**: If dynamic JS execution is required, spins up an attached `1x1 px` offscreen `WebView` with Desktop Chrome User-Agent spoofing, `navigator.webdriver = undefined`, ad-redirect blocking, real coordinate touch + multi-selector play button clicking, network `.m3u8` / `mu=` capture, and active JS player inspection (`jwplayer`, `videojs`, `<video>`).
  - *Why*: Combines sub-second speed for static/packed embeds with 100% browser compatibility for dynamically rendered embeds.

- **Decision 2: Direct Stream URLs with Native Header Injection**
  - *Chosen Approach*: Return the raw, direct `.m3u8` URL to `hls.js` and `ClientHlsDownloader`, and record the discovered `Referer` in `CorsFreeWebViewClient.hostRefererMap` (including wildcard domain matching for CDN subdomains).
  - *Why*: Eliminates `/api/proxy` bottlenecks and IP mismatch `403` errors while guaranteeing CDN segment requests never fail due to missing `Referer` headers.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     MaxPlay React App (WebView UI)                       │
│  ┌────────────────────┐  ┌─────────────────────┐  ┌───────────────────┐  │
│  │ Movie / Episode    │  │ Download Selection  │  │ Sequential Queue  │  │
│  │ Watch Click        │  │ Modal Probe         │  │ DownloadManager   │  │
│  └─────────┬──────────┘  └──────────┬──────────┘  └─────────┬─────────┘  │
└────────────┼────────────────────────┼───────────────────────┼────────────┘
             │                        │                       │
             ▼                        ▼                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│              MaxPlayNativeBridge (@JavascriptInterface)                  │
│  • extractStreamNative(url)   • sniffStreamAsync(url, cbId, timeoutMs)   │
└─────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                 InbuiltStreamScraper (Kotlin Native)                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Stage 1: Fast OkHttp + Iframe Follower + Unpacker                  │  │
│  │ • Normalizes Filemoon (/d/ -> /e/) & Voe (/e/) URLs                │  │
│  │ • Follows JS window.location.href & nested <iframe src="...">      │  │
│  │ • Unpacks eval(function(p,a,c,k,e,d)) & VOE ROT13/Base64 configs   │  │
│  └────────────────────────────────┬───────────────────────────────────┘  │
│                                   │ (If dynamic JS needed)               │
│                                   ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Stage 2: Attached 1x1 Offscreen WebView (Puppeteer Equivalent)     │  │
│  │ • Attached to Activity rootContainer (prevents Chromium throttle)  │  │
│  │ • Blocks ad/popup redirects; allows legitimate player iframes      │  │
│  │ • Dispatches real touch + clicks (.play-btn, .jw-icon, video)      │  │
│  │ • Intercepts .m3u8 & ?mu= requests + scans jwplayer/videojs/DOM    │  │
│  └────────────────────────────────┬───────────────────────────────────┘  │
└───────────────────────────────────┼──────────────────────────────────────┘
                                    │
                                    ▼
                  Direct .m3u8 URL + Discovered Referer
           (Played & Downloaded Directly with 0% IP Mismatch)
```

- **Interactive Component & State Mapping**:
  - **URL Normalization**: Automatically normalizes Filemoon (`/d/xxx` -> `/e/xxx`) and Voe (`voe.sx/xxx` -> `voe.sx/e/xxx`) URLs before scraping.
  - **Ad & Popup Shield**: Inside the offscreen scraper WebView, `shouldOverrideUrlLoading` blocks third-party ad/popup navigations on the main frame while allowing Voe mirror redirects and Filemoon player iframes.
  - **Download Modal Native Probe**: In `DownloadSelectionModal.tsx`, when running inside the Kotlin APK (`NativeBridgeService.isRunningInKotlinApp()`), stream probing uses `NativeBridgeService.extractStreamNative(targetUrl)` first so quality and audio options load directly from the phone's inbuilt scraper.
