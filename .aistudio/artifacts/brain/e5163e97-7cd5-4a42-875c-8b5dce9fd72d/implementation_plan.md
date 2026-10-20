# MaxPlay — Complete Optimization, Multi-Quality Server Architecture & Native APK Enhancement Plan

## 🛡️ 0. MaxPlay Existing System Protection Guarantee
- **100% Backward Compatibility:** All existing movies, web series, anime, episodes, Firestore documents, authentication flows, and security rules remain untouched and fully functional.
- **Additive Multi-Quality Schema:** Existing content that only has a single `videoUrl` (Server 1) or `secondaryVideoUrl` (Server 2) will continue to play and download exactly as before. New multi-quality links (`1080p`, `720p`, `480p`, `360p`) are stored in the existing optional fields `qualityLinks` (Server 1) and `secondaryQualityLinks` (Server 2), while automatically keeping `videoUrl` and `secondaryVideoUrl` populated with the primary stream URL so no existing screen or service breaks.

---

## 🎚️ 1. Multi-Quality Server Link System (`1080p`, `720p`, `480p`, `360p` per Server)

### A. Admin Panel (`AdminDashboardScreen.tsx`) — Movie & Series Episode Cards
- **4 Quality Slots per Server with `[✕]` Remove & `+ Add` Controls:**
  - Under **Server 1 (Primary Stream)** and **Server 2 (Secondary Stream)** in Smart HLS Mode (for both Movie upload/edit and Series Episode cards), display 4 labeled quality input rows: **`1080p`**, **`720p`**, **`480p`**, and **`360p`**.
  - Each quality input row includes a **`[✕]`** button on the right to remove/hide any unneeded quality box, plus quick **`+ 1080p` / `+ 720p` / `+ 480p` / `+ 360p`** restore pills so the Admin can fill 1, 2, 3, or all 4 qualities as needed.
  - **Smart Auto-Sync on Save:**
    - Server 1 slots save into `qualityLinks: { '1080p'?: string, '720p'?: string, '480p'?: string, '360p'?: string }`, and automatically set `videoUrl` to the highest/first provided link for 100% backward compatibility.
    - Server 2 slots save into `secondaryQualityLinks: { '1080p'?: string, '720p'?: string, '480p'?: string, '360p'?: string }`, and automatically set `secondaryVideoUrl` to the highest/first provided link.
    - When editing an older Movie/Episode that only has `videoUrl` or `secondaryVideoUrl`, it automatically loads into the `1080p` (or default) box so nothing is ever lost.

### B. How the App & APK Decide Which Quality Link to Scrape First (`SmartStreamService` & `ContentDetailScreen`)
- **Step 1 — User Preference Check:** Checks `localStorage.getItem('maxplay_preferred_quality')` (`Auto`, `1080p`, `720p`, `480p`, `360p`). If the user explicitly chose e.g. `480p` or `720p` and that link exists on the active server, the app scrapes that exact link first.
- **Step 2 — Smart Network & RAM Auto-Detection (When set to `Auto`):**
  - Checks `navigator.connection` (`effectiveType` and `downlink` Mbps) + `navigator.deviceMemory`:
    - **Weak / Slow Network (`2g`, `3g`, or `downlink < 2.5 Mbps`) or Low-RAM (`<= 4GB`):** Automatically selects **`480p`** (or `360p` / `720p` fallback) first so the video starts **instantly with zero buffering**.
    - **Normal 4G (`downlink 2.5 – 6 Mbps`):** Selects **`720p`** first for fast startup and crisp HD quality.
    - **Fast Wi-Fi / 5G (`downlink > 6 Mbps`):** Selects **`1080p`** (or `720p`) first.
- **Step 3 — Background Next-Quality Pre-Warm:** Only the single chosen quality link is scraped initially for instant playback; if the user opens the Quality Drawer and picks another quality, that quality link is resolved on demand (and cached in `SmartStreamService`).

### C. Hybrid Player Quality Drawer & Seamless Mid-Playback Switching (`InlinePlayer.tsx`)
- **Unified Quality Drawer (`QualityDrawer.tsx`):**
  - Displays internal HLS variant qualities (`hlsQualities`) when a single Master `.m3u8` contains multiple resolutions.
  - Displays the Admin-configured per-server quality links (`1080p`, `720p`, `480p`, `360p` from `qualityLinks` for Server 1 or `secondaryQualityLinks` for Server 2) when separate quality links are provided!
- **Seamless Timestamp & Audio Track Preservation:**
  - When a user switches quality (e.g., `1080p` → `480p`) via separate server links:
    1. Saves exact `currentTime` (e.g., `18:24`), play state, and active audio language (`currentLanguage`, e.g., `Hindi`).
    2. Extracts/resolves the `480p` link for the active server via `SmartStreamService`.
    3. Loads the new `.m3u8` stream at `18:24` and automatically locks onto the same `Hindi` audio track (since all quality copies share the same multi-audio tracks).

---

## 📥 2. Download Engine Fixes: Zero First-Try Failures, Locked MB Size, Unique Series MB & Turbo Speed

### A. Fix First-Try Series Multi-Episode Download Failure (`downloadManager.ts` & `smartStreamService.ts`)
- **Root Cause Fixed:** When opening the Download Modal and immediately queuing 2+ episodes, the modal probe and episode downloader triggered concurrent cold extractions that could time out on the first try.
- **Solution:**
  1. **In-Flight Extraction Deduplication:** Share a single `inFlightExtractions: Map<string, Promise<any>>` in `SmartStreamService` so the Download Modal probe and `DownloadManager` reuse the exact same ongoing extraction instead of colliding.
  2. **3x Automatic Silent Retry with Backoff:** In `DownloadManager.processTask`, wrap stream extraction and manifest probing in a 3-attempt auto-retry loop (`0ms` → `1200ms` → `2500ms`, with `forceRefresh: true` on retry) before ever marking an episode as `failed`.

### B. Fix Fluctuating Total MB (800 MB ↔ 900 MB) During Download (`clientHlsDownloader.ts`)
- **Root Cause Fixed:** Variable Bitrate (VBR) `.ts` segments caused `estimatedTotalBytes = avgSegmentBytes * totalSegments` to jump up and down after every batch.
- **Solution:** Lock `lockedTotalMb` at the start of the download using the playlist bandwidth × actual `#EXTINF` total duration (calibrated once after the first 5 segments), and **never recalculate total MB upward/downward mid-download**. At 100% completion, snap `downloadedMb = totalMb`.

### C. Fix Duplicate MB Across Different Series in Download Modal (`DownloadSelectionModal.tsx` & `clientHlsDownloader.ts`)
- **Root Cause Fixed:** Episodes defaulted to `1440s` (24m) duration and Master `.m3u8` playlists only list `BANDWIDTH` without `#EXTINF` durations, causing different series with similar bitrates to display identical MB estimates.
- **Solution:**
  1. In `ClientHlsDownloader.probeMasterPlaylist`, automatically fetch the first variant sub-playlist header to sum the **real `#EXTINF` segment durations** (`actualDurationSec`), giving every series and episode its true unique duration and MB size.
  2. Scope the metadata cache key with `${content.id}_s${selectedSeasonIdx}_e${focusedEpisodeIdx}_${targetUrl}` so one series never inherits another series's cached MB.

### D. Lock Top Filter Bar (Server + Language + Quality) Across "Select All" Episodes (`DownloadSelectionModal.tsx`)
- When the user selects **Server (`Server 1` / `Server 2`)**, **Audio Language (e.g. `Hindi`)**, and **Video Quality (e.g. `480p` or `720p`)** in the top filter bar and clicks **Select All** (or selects multiple episodes):
  - Every queued episode receives the exact selected `server`, `language`, and `quality`.
  - For each episode, `resolveItemDownloadUrl` picks that episode's matching quality link (`qualityLinks[selectedQuality]` for Server 1, or `secondaryQualityLinks[selectedQuality]` for Server 2, or master URL with `selectedQuality` variant selection) + matching audio language track.

### E. Maximum Network Speed Turbo Downloader (`clientHlsDownloader.ts` & `MainActivity.kt`)
- **Continuous Sliding Window Worker Pool (8 Parallel Workers):** Replace the 5-segment blocking `Promise.all` batch loop (which waited for the slowest segment in every batch of 5) with an **8-worker continuous sliding pool** so all 8 workers stay 100% saturated without pauses between batches.
- **Kotlin Native `OkHttpClient` High-Concurrency Tuning (`MainActivity.kt`):** Configure `Dispatcher().apply { maxRequests = 64; maxRequestsPerHost = 16 }` on the shared `OkHttpClient` to eliminate host connection throttling during HLS segment downloads.

---

## 🏷️ 3. Hide Provider Names (`voe.sx`, `filemoon`, `byse`) Everywhere in User UI
- **`ContentDetailScreen.tsx` & `DownloadSelectionModal.tsx`:**
  - Replace all user-facing strings (`Voe.sx`, `Filemoon / Byse`, `Primary Stream (Voe.sx)`, `Secondary Stream (Filemoon / Byse)`) with clean brand labels:
    - **`Server 1`** — *High-Speed Primary Stream*
    - **`Server 2`** — *Turbo Backup Stream*

---

## 🗣️ 4. Sync External Language Selector with Player's Discovered Audio Tracks (`ContentDetailScreen.tsx`)
- **Root Cause Fixed:** The external language selector modal (`SoloLevelingSelectorModal`) only read static Firestore `content.languages`, while `InlinePlayer`'s internal Audio Drawer read live `#EXT-X-MEDIA:TYPE=AUDIO` tracks discovered from the `.m3u8` manifest (`discoveredHlsAudioTracks`).
- **Solution:** Merge `discoveredHlsAudioTracks` into `availableLanguages` in `ContentDetailScreen.tsx` so the external Language button and `SoloLevelingSelectorModal` immediately show all real audio tracks discovered by the player, and selecting a language from either place stays 100% synced.

---

## 🔊 5. Online Player Real Hardware Volume & Brightness (`InlinePlayer.tsx`)
- Connect `InlinePlayer.tsx`'s left-side vertical swipe (Brightness) and right-side vertical swipe (Volume) + volume controls directly to `NativeBridgeService.setNativeBrightness()` and `NativeBridgeService.setNativeVolume()` / `getNativeVolume()`, matching `OfflinePlayer.tsx` so gestures control the real Android phone hardware volume and screen brightness.

---

## 🔙 6. Fix Back-Navigation Scroll Jump to Top (`ThreeColumnRow.tsx`, `HomeScreen.tsx`, `AnimeScreen.tsx`, `SearchScreen.tsx`)
- **Root Cause Fixed:**
  1. `ThreeColumnRow.tsx` had `useEffect(() => setDisplayCount(9), [items])` which reset the grid back to 9 items every time `HomeScreen` re-rendered (every 4 seconds from the search placeholder timer!), collapsing the scroll height while `ContentDetailScreen` was open.
  2. Scroll container `scrollTop` was not locked/restored across detail screen open/close transitions.
- **Solution:**
  1. In `ThreeColumnRow.tsx`, only reset `displayCount` if the category/tab actually changes, never when `items` array reference updates with the same content IDs.
  2. Save `scrollRef.current.scrollTop` right before opening `ContentDetailScreen` and restore it via `requestAnimationFrame` when returning via the Android Triangle Back button or in-app Back button.

---

## 🖼️ 7. Persistent Native Disk Image Cache in Kotlin APK (`CorsFreeWebViewClient.kt` & `MainActivity.kt`)
- **Root Cause Fixed:** External image hosts (`ibb.co`, `postimg.cc`, `tmdb.org`, `unsplash.com`) were re-downloaded on cold app restarts because WebView memory cache cleared on process exit.
- **Solution:**
  - Add a **Persistent Disk Image Cache (`MaxPlayImageCache` — 250 MB LRU in `context.cacheDir/poster_cache`)** inside `CorsFreeWebViewClient.shouldInterceptRequest`:
    - Intercepts image requests (`.jpg`, `.jpeg`, `.png`, `.webp`, `.avif` or image host domains).
    - If SHA-256 key exists on disk, serves the image **instantly in 0ms from local storage** with `Cache-Control: public, max-age=31536000, immutable` — zero internet used on app restarts!
    - If not cached yet, fetches via `sharedHttpClient`, streams to WebView, and writes to disk cache in the background.

---

## ⚡ 8. 4GB RAM Phone Performance Optimization & APK Polish
1. **Isolate Rotating Search Bar Placeholder (`HomeScreen.tsx`):** Move the 4-second `tagIndex` timer into an isolated memoized component so `HomeScreen` never re-renders its 100+ movie cards every 4 seconds.
2. **Freeze Background Screens During Video Playback (`App.tsx` / `HomeScreen.tsx` / `HeroBannerCarousel.tsx`):** Pause `HeroBannerCarousel` auto-slide and background timers whenever `ContentDetailScreen` is open or another tab is active.
3. **Throttle Player `onTimeUpdate` Re-renders (`InlinePlayer.tsx`):** When player controls are hidden during playback, update `currentTime` React state once per second (`1000ms` throttle) instead of 4–5 times per second, cutting CPU/React reconciliation overhead by **75%** on 4GB RAM phones.
4. **Clean Up Downloads Storage Footer (`DownloadsScreen.tsx`) & Settings Cache Control (`SettingsScreen.tsx`):**
   - Replace the hardcoded `3.5 GB Free` text and non-functional Transfer modal in `DownloadsScreen.tsx` with real calculated storage usage (`navigator.storage.estimate()` + actual downloaded MB).
   - Add a **Clear Image & Stream Cache** action in `SettingsScreen.tsx` that clears cached stream tokens and temporary cache without touching downloaded offline videos.
