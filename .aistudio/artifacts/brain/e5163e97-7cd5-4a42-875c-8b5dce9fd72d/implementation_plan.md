# MaxPlay Native Kotlin Android Wrapper & Inbuilt CORS-Free Scraper Engine

This plan delivers a complete, standalone **Native Kotlin Android Project** alongside a seamless **Frontend Native Bridge Adapter** so MaxPlay can run as a true Android APK with **zero browser CORS policies**, an **inbuilt native stream scraper & `.m3u8` sniffer**, and **native multi-threaded background video downloading**—while keeping 100% of the existing MaxPlay UI/UX, animations, Admin AI Co-Pilot, and Firebase backend completely untouched and safe.

## User Review & Critical Decisions

> [!IMPORTANT]
> **100% Existing System Protection**: The live MaxPlay web app, backend server, Firebase configuration, Firestore database, and existing UI components will **not** be replaced or altered. The Kotlin Android project lives in its own isolated build workspace and communicates with the existing UI via an automatic `window.MaxPlayNative` JavascriptInterface bridge that gracefully falls back to the existing web logic when opened in a normal browser.

- **Confirmed Decision 1 (Hybrid Native Kotlin Wrapper + Local/Live Sync)**: The Kotlin app bundles and caches the MaxPlay UI shell while syncing live Firebase/API data, and disables all WebView CORS restrictions (`allowUniversalAccessFromFileURLs`, custom `shouldInterceptRequest` OkHttp pipeline).
- **Confirmed Decision 2 (Inbuilt Native Kotlin Scraper & Stream Sniffer)**: Includes both a direct `OkHttp` HTML/RegEx scraper with custom `User-Agent` / `Referer` / Cookie injection and an invisible Headless WebView stream sniffer that automatically intercepts `.m3u8` and `.mp4` master links directly on the user's phone.
- **Confirmed Decision 3 (One-Click Cloud APK Build + Android Studio Support)**: Includes a ready-to-compile Gradle Kotlin DSL project plus an automated GitHub Actions workflow so you can generate signed `.apk` files in the cloud even without a heavy PC setup.

---

## 1. Overview & Core Concept

- **What It Does**: Wraps the complete MaxPlay experience inside a high-performance Native Kotlin Android shell equipped with a native `@JavascriptInterface` bridge (`MaxPlayNativeBridge`). When running inside the Android app, stream extraction, scraping, CORS-free segment fetching, hardware orientation lock, and offline MP4 downloading run directly at the Android OS level.
- **Target Audience / Persona**: MaxPlay end-users watching and downloading movies, series, and anime on Android phones, as well as the Super Admin using the Admin Panel & AI Co-Pilot to extract and verify streaming links without server bottlenecks.
- **Key Value**:
  - **Zero CORS Blockades**: Android's native `OkHttp` client and `WebViewClient.shouldInterceptRequest` ignore browser `Access-Control-Allow-Origin` restrictions completely.
  - **Distributed Client-Side Scraping**: Each user's Android device extracts `.m3u8` streams directly from video hosts (VOE, Filemoon, Streamtape, Dood, etc.) using their own residential mobile IP—preventing server IP bans and serverless timeouts.
  - **100% UI/UX Preservation**: Every single screen, gesture control, 2X speed capsule, Admin Co-Pilot command, and Firebase feature works identically with zero loss.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Zero-Config Native Detection**: When MaxPlay launches inside the Kotlin APK, the frontend automatically detects `window.MaxPlayNative` and routes stream extraction and HLS segment downloads through the native Kotlin engine first, with automatic fallback to the existing web pipeline if run in Chrome.
  2. **Inbuilt Scraper & Stream Sniffer Flow**: When a movie or episode with an external embed/hoster link is played or probed in the Admin Panel, the Kotlin Native Scraper fetches the page with custom headers (`Referer`, `User-Agent`, cookies) or spins up an invisible background WebView sniffer to capture the `.m3u8` master playlist in milliseconds.
  3. **Native High-Speed Offline Downloads**: Tapping **Download Movie** or **Download Episodes** uses the Kotlin multi-threaded `OkHttp` segment fetcher with zero CORS overhead and saves the assembled MP4 directly for instant offline playback.
  4. **Native Fullscreen & Hardware Controls**: Tapping fullscreen invokes Android's native `ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE` and immersive system bars (`WindowInsetsControllerCompat`).
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Retains MaxPlay's signature dark cinema aesthetic (`#0A0A0A` canvas, `#121216` elevated cards, `#8B5CF6` primary violet accent, `#38BDF8` sky highlights).
  - *Mobile & Touch Ergonomics*: Preserves $\ge 44\times 44\text{px}$ touch targets, bottom thumb-zone navigation, 15% sticky surface cap, and tabular numerals (`tabular-nums`) for download speeds and timestamps.
- **Interactive Feedback & Motion**: Smooth 150ms transitions, real-time native download speed telemetry in `MB/s`, and instant landscape rotation when entering fullscreen.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Native `@JavascriptInterface` Bridge + `shouldInterceptRequest` CORS Bypass**
  - *Chosen Approach*: Expose `window.MaxPlayNative` from Kotlin to the React WebView AND intercept cross-origin media/API requests in `WebViewClient.shouldInterceptRequest` using `OkHttp` to inject `Access-Control-Allow-Origin: *` headers automatically.
  - *Why*: Even standard `fetch()` and `hls.js` requests inside the WebView automatically become 100% CORS-free without rewriting existing player components.
  - *Alternatives Considered*: Rewriting all 30+ React screens in Jetpack Compose—rejected because it would alter the finely tuned UI/UX and risk losing complex Admin Co-Pilot and custom player features.
- **Decision 2: Dual-Mode Inbuilt Scraper (Fast OkHttp RegEx + Headless WebView Sniffer)**
  - *Chosen Approach*: Try fast `OkHttp` HTML/packed-JS extraction first (< 400ms); if a host uses heavy JS obfuscation, automatically fall back to a hidden background Android `WebView` that intercepts network requests until a `.m3u8` or `.mp4` URL is captured.
  - *Why*: Handles both simple video hosts and heavily obfuscated streaming providers directly on the phone.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     MAXPLAY REACT FRONTEND (UNCHANGED UI)                  │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │  Content & Player    │  │  Download Manager &  │  │  Admin Panel &   │  │
│  │  (Inline / Offline)  │  │  ClientHlsDownloader │  │  AI Co-Pilot     │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └────────┬─────────┘  │
│             └─────────────────────────┼───────────────────────┘            │
│                                       ▼                                    │
│                    ┌─────────────────────────────────────┐                 │
│                    │   Native Bridge Service Adapter     │                 │
│                    │  (Auto-detects window.MaxPlayNative │                 │
│                    │   with 100% Web Fallback)           │                 │
│                    └──────────────────┬──────────────────┘                 │
└───────────────────────────────────────┼────────────────────────────────────┘
                                        │ @JavascriptInterface + CORS Interceptor
┌───────────────────────────────────────▼────────────────────────────────────┐
│                   NATIVE KOTLIN ANDROID APP (android-kotlin/)              │
│                                                                            │
│  ┌──────────────────────────┐  ┌────────────────────────────────────────┐  │
│  │   MainActivity.kt &      │  │       InbuiltStreamScraper.kt          │  │
│  │   CorsFreeWebViewClient  │  │  • OkHttp Custom Header/Cookie Scraper │  │
│  │  • Injects CORS headers  │  │  • Packed JS (p,a,c,k,e,d) Unpacker    │  │
│  │  • Landscape Lock API    │  │  • Headless WebView .m3u8 Sniffer      │  │
│  └──────────────────────────┘  └────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     NativeHlsDownloader.kt                           │  │
│  │  • 12-Thread OkHttp Segment Fetcher (Zero CORS, Custom Referer)      │  │
│  │  • Streams bytes directly to WebView / Device Storage                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State
- **`NativeScrapeResult`**: `{ ok: boolean, m3u8Url: string, qualities: string[], qualityLinks: Record<string, string>, audioTracks: string[], headers: Record<string, string>, method: 'okhttp' | 'headless_sniffer' }`
- **`MaxPlayNativeBridge` Contract**:
  - `extractStreamNative(url: string, refererJson: string): string` (returns JSON `NativeScrapeResult`)
  - `fetchUrlCorsFree(url: string, headersJson: string): string` (fetches any text/playlist via native `OkHttp` with custom headers)
  - `fetchBytesBase64CorsFree(url: string, headersJson: string): string` (fetches binary segments via native `OkHttp` with zero CORS)
  - `setLandscapeOrientation(locked: boolean): void` (controls native Android screen orientation)

### Interactive Component & State Mapping
1. **`CorsFreeWebViewClient` (Kotlin)**: Intercepts outgoing `.m3u8`, `.ts`, `.m4s`, `.mp4`, and scraper target requests from the WebView, executes them through `OkHttp` with spoofed `User-Agent` and `Referer` headers, and returns a `WebResourceResponse` with `Access-Control-Allow-Origin: *` so `hls.js` and `ClientHlsDownloader` work with zero CORS errors.
2. **`InbuiltStreamScraper` (Kotlin)**: Parses HTML, unpacks Dean Edwards `eval(function(p,a,c,k,e,d))` scripts, extracts HLS `.m3u8` master manifests, and—if needed—runs an offscreen WebView sniffer to capture dynamically generated `.m3u8` URLs.
3. **Frontend Bridge Integration (`smartStreamService` & `ClientHlsDownloader`)**: Checks `if (window.MaxPlayNative)` first; when running inside the Kotlin APK, uses the inbuilt native scraper before calling `/api/extract-stream`, while keeping the existing web flow 100% intact for browser users.
