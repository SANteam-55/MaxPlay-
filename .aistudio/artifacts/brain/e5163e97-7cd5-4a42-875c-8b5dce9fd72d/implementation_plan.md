# MaxPlay Performance Optimization, Smart Provider Router & Filemoon.sx Fix

Optimize MaxPlay's touch responsiveness, image loading pipeline, and Firebase Firestore caching for instant 60fps navigation while upgrading the inbuilt Kotlin scraper with a **Smart Provider Detection Router** (`VOE` vs `FILEMOON`) and dedicated **Filemoon.sx nested-iframe unpacker**.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Existing System Protection Guarantee**: Your Firebase collections, database schema, security rules, Admin Panel, and working Voe.sx scraper logic remain 100% intact and untouched. All optimizations are additive and non-destructive.

- **Confirmed Decision 1 — Strict Provider Detection & Routing (`VOE` vs `FILEMOON`)**:
  - Instead of running one mixed scraper blindly on every link, `InbuiltStreamScraper` now includes a dedicated **Provider Classifier (`detectProviderType`)** that inspects both the **URL domain/path** (`voe.sx` + Voe mirrors vs `filemoon.sx` + `/d/` or `/e/` + Filemoon mirrors like `kerapoxy`, `moonmov`, `bysedikamoum`, `f16px`) and **HTML page signatures** (in case a link uses a new custom mirror domain).
  - **Voe links** route strictly to the proven Voe pipeline (JS redirect follower + ROT13/Base64/wc0 decoder).
  - **Filemoon links** route strictly to the dedicated Filemoon pipeline (`/d/` -> `/e/` normalization, `/bkg/` nested player iframe unwrapping, `eval(function(p,a,c,k,e,d))` unpacker, and recursive child-iframe JWPlayer extractor).
  - Neither scraper can accidentally interfere with or mis-parse the other provider's links.
- **Confirmed Decision 2 — Non-Blocking Native Bridge (`extractStreamNativeAsync`)**:
  - Previously, calling `extractStreamNative` ran synchronously on a `@JavascriptInterface` bridge thread while the UI waited, freezing touch events for 1–3 seconds. Moving Stage 1 + Stage 2 orchestration to an asynchronous background thread pool keeps the WebView UI 100% responsive during scraping.
- **Confirmed Decision 3 — Zero-Lag Touch, Image Pipeline & Firebase Persistent Cache**:
  - Removing synchronous `OkHttp.execute()` interception for images/fonts in `CorsFreeWebViewClient` restores Chromium's parallel HTTP/2 image loader.
  - Enabling Firestore `persistentLocalCache` + shared in-memory `useContent` caching eliminates repeated full-collection network fetches on tab switches.
  - Removing blocking delays (`setTimeout` + synchronous ad checks) on `ContentCard` clicks makes movie/series screen navigation instantaneous (`< 50ms`).

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Smart Provider Router (Voe.sx vs Filemoon.sx)**: Automatically identifies whether a link belongs to Voe or Filemoon (by domain and HTML fingerprint) and runs the exact dedicated scraper for that provider.
  2. **Filemoon.sx 100% Extraction Fix**: Unwraps Filemoon's inner player `<iframe src="...">`, fixes the Kotlin `eval(function(p,a,c,k,e,d))` regex to handle internal semicolons (`return p}`), and injects recursive child-iframe inspection in the attached WebView sniffer.
  3. **Instant Touch & Fast Data/Images**: Eliminates the 1-second tap delay on movie cards, unblocks parallel image loading in Android WebView, and caches Firebase content locally for instant screen transitions.
- **Target Audience / Persona**: MaxPlay Android users browsing, streaming, and downloading movies and series.
- **Key Value**: Buttery-smooth 60fps app navigation paired with 100% reliable on-device Voe.sx and Filemoon.sx direct HLS playback and downloads.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  - **Instant Card Tap & Navigation**: Tapping any Movie, Series, or Episode responds within `< 50ms` with immediate visual press feedback (`active:scale-95`, `touch-action: manipulation`) and opens the Details screen immediately.
  - **Dedicated Provider Scraping Flow**:
    - If the link is **Voe.sx**, the router triggers the existing working Voe extractor.
    - If the link is **Filemoon.sx**, the router normalizes `/d/` to `/e/`, follows the nested player iframe, unpacks the `eval(p,a,c,k,e,d)` JWPlayer config or intercepts the child-frame `.m3u8`, and passes the direct stream + `Referer` header to the custom player.
- **Visual Identity & Theme**:
  - Preserves MaxPlay's existing dark cinema design (`#0A0A0A` canvas, existing layout and components) while improving scroll smoothness, image load speed, and touch responsiveness.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Two-Layer Provider Identification (URL + HTML Fingerprint)**
  - *Chosen Approach*:
    - **Layer 1 (URL & Domain Match)**: Checks known Voe domains (`voe.sx`, `reputationsickler`, `launchreliantcleaverriver`, etc.) and Filemoon domains (`filemoon.sx`, `filemoon.in`, `filemoon.to`, `moonmov.pro`, `kerapoxy.cc`, `bysedikamoum.com`, `f16px.com`, or `/d/` paths).
    - **Layer 2 (HTML Signature Match)**: Because both Voe and Filemoon frequently rotate mirror domains, if a link uses an unknown domain, the scraper inspects the HTML response: if it contains `voe` / ROT13 JSON / `wc0`, it routes to the **Voe Scraper**; if it contains `eval(function(p,a,c,k,e,d)` or Filemoon's `/bkg/` / `/e/` iframe structure, it routes to the **Filemoon Scraper**.
  - *Why*: Guarantees 0% collision between Voe and Filemoon scrapers even when providers change domain names in the future.

- **Decision 2:Selective WebView Interception (`CorsFreeWebViewClient`)**
  - *Chosen Approach*: Bypass `shouldInterceptRequest` for all images (`.jpg`, `.png`, `.webp`, TMDB/Firebase Storage URLs), fonts, CSS/JS bundles, and Firebase Firestore traffic, intercepting only stream playlists/segments that require custom `Referer` headers.
  - *Why*: Eliminates the WebView worker-thread bottleneck that caused slow poster loading and sluggish scrolling.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    MaxPlay Optimized Frontend & Bridge                    │
│  • Instant Card Tap (<50ms)      • Shared In-Memory + Persistent Cache    │
│  • Non-Blocking Async Bridge     • Parallel Native Chromium Image Loader  │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│              Smart Provider Classifier (detectProviderType)               │
│  1. Domain & Path Check (voe.* vs filemoon.* / /d/ / mirror domains)      │
│  2. HTML Signature Fallback (ROT13/wc0 vs eval(p,a,c,k,e,d) / iframe)     │
└──────────────────┬─────────────────────────────────────┬──────────────────┘
                   │                                     │
         [Provider = VOE]                      [Provider = FILEMOON]
                   │                                     │
                   ▼                                     ▼
┌─────────────────────────────────────┐ ┌───────────────────────────────────┐
│     Dedicated Voe.sx Pipeline       │ │   Dedicated Filemoon.sx Pipeline  │
│  • Preserves 100% working logic     │ │  • Normalizes /d/xxx -> /e/xxx    │
│  • Follows window.location redirects│ │  • Follows nested player <iframe> │
│  • Decodes ROT13 + Base64 + wc0     │ │  • Fixed eval(p,a,c,k,e,d) regex  │
│  • Offscreen WebView fallback       │ │  • Recursive child-frame sniffer  │
└──────────────────┬──────────────────┘ └────────────────┬──────────────────┘
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      ▼
                    Direct .m3u8 URL + Matched Referer Header
                   (Custom Video Player & Sequential Downloader)
```

- **Interactive Component & State Mapping**:
  - **Smart Provider Router (`InbuiltStreamScraper.kt`)**: Routes `ProviderType.VOE`, `ProviderType.FILEMOON`, and `ProviderType.GENERIC` cleanly without cross-interference.
  - **Async Native Extraction (`MaxPlayNativeBridge.kt` & `nativeBridgeService.ts`)**: Adds `extractStreamNativeAsync(url, callbackId)` running on a background thread pool so the UI thread never blocks during Stage 1 or Stage 2 scraping.
  - **Data & Touch Pipeline (`CorsFreeWebViewClient.kt`, `firebase.ts`, `useContent.ts`, `HomeScreen.tsx`)**: Unblocks image/Firestore network threads, caches content across tabs, and navigates immediately on card tap.
