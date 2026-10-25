# Implementation Plan: Smart Series & Movie Download System, Audio Isolation & Ad SSL Error Fix

## 1. Existing System Protection & Impact Assessment
In strict accordance with the **MaxPlay Existing System Protection Rule**:
- **What Exists**:
  - `src/components/downloads/DownloadSelectionModal.tsx`: Handles Movie and Series episode download selection, quality/language picking, and confirmation modal.
  - `src/services/DownloadManager.ts`, `src/services/clientHlsDownloader.ts`, and `android-kotlin/app/src/main/java/com/maxplay/app/MaxPlayOfflineVault.kt`: Execute sequential HLS/MP4 downloads on Web and Native Android.
  - `android-kotlin/app/src/main/java/com/maxplay/app/MainActivity.kt`: Handles `openNativePopunderAd` inside an Android WebView overlay.
- **What Needs to Change & Why**:
  1. **Download Selection UI & Episode Resolution (`DownloadSelectionModal.tsx`)**:
     - Currently, tapping an episode triggers slow per-episode probing and displays horizontal grid boxes (`E1`, `E2`) that hide per-episode quality/language states.
     - Language filters only apply cleanly to Server 1 and not Server 2.
     - We will replace this with fast **Pill-Shaped Global Filters** (Server, Quality, Audio Language) backed directly by Admin-verified metadata, a **Vertical Scrollable Episode List** showing clear badges (`1080p`, `Hindi`, `S1`/`S2`, `MB size`) on every episode row, and a **Smart Confirmation Screen** that highlights lower-quality fallback episodes in **Red** with an inline **Unselect** button.
  2. **Cross-Episode Audio Contamination Fix (`DownloadSelectionModal.tsx`, `clientHlsDownloader.ts`, `MaxPlayOfflineVault.kt`)**:
     - Currently, when resolving `backupVideoUrl` for an episode `ep` on Server 2, if `ep` does not have an exact quality match on Server 1, `resolveItemDownloadUrl` falls back to root `content.videoUrl` / `content.qualityLinks` (which belong to Episode 1). Then, if Server 2 uses muxed audio (no separate `#EXT-X-MEDIA:TYPE=AUDIO` manifest), the downloader grafts external audio from `backupVideoUrl` (Episode 1's Server 1 stream) onto Episode `N`'s video.
     - We will strictly isolate episode URLs so an episode never falls back to root `content.videoUrl`, and prevent cross-server audio grafting onto Server 2 streams when Server 2 already has muxed audio or belongs to a different provider encoding.
  3. **Popunder Ad `net::ERR_SSL_PROTOCOL_ERROR` Fix (`MainActivity.kt`)**:
     - Currently, when an ISP blocks TLS handshakes (`net::ERR_SSL_PROTOCOL_ERROR`) to the ad network domain, Android WebView displays the raw `"Web page not available"` error screen.
     - We will intercept `onReceivedError` / `onReceivedHttpError` / `onReceivedSslError` in `openNativePopunderAd`, clear the default error view (`about:blank`), attempt a silent fallback load, and cleanly dismiss or hide the error state so the broken Android WebView error page never appears.
- **Safety Guarantee**:
  - No Firestore collections, database schemas, authentication logic, Firebase security rules, or existing video playback flows will be removed or altered.

---

## 2. Detailed Feature Architecture

### A. Global Pill Filter Bar (Server 1 & Server 2 Unified)
- **Server Selector Pills**:
  - Clean pill toggle between **Server 1 (Primary)** and **Server 2 (Backup)** (only shown if Server 2 links exist on the movie or any episode).
  - Switching servers immediately updates the available Quality and Audio Language pills using pre-verified metadata (`server1VerifiedMeta` / `server2VerifiedMeta` and `qualityLinks` / `secondaryQualityLinks`) without slow per-episode network re-probing.
- **Quality Selector Pills (`1080p`, `720p`, `480p`, `360p`)**:
  - Aggregated across all configured qualities in the current season (for Series) or movie.
  - Selecting a quality pill globally sets the target quality for all selected episodes.
- **Audio Language Selector Pills (`Hindi`, `English`, etc.)**:
  - Aggregated across both Server 1 and Server 2 verified audio tracks (`verifiedAudioTracks`, `audioLanguages`, and multi-audio labels).
  - Works identically whether Server 1 or Server 2 is selected, ensuring the chosen language is passed to both the UI badges and the downloader task (`selectedAudioLang`).

### B. Vertical Scrollable Episode List (Series & Anime)
- Replaces the small horizontal grid boxes with a smooth, scrollable vertical list container.
- **Header Controls**:
  - Season selector pills (when multiple seasons exist).
  - Quick **Select All / Unselect All** button and selected count indicator (`X / Y Selected`).
- **Each Episode Row Displays**:
  - Checkbox + Episode Badge (`EP 01`) + Episode Title & Duration.
  - **Live Resolution Status Badges** (computed instantaneously for the active filter):
    - **Exact Match on Selected Server**: Green/Cyan badge showing e.g. `1080p • Hindi • Server 1 • 185 MB`.
    - **Auto-Switched to Other Server (Same Quality)**: Blue/Amber badge showing e.g. `1080p • Hindi • Server 2 (Auto)` when the selected server lacks `1080p` for that episode but the other server has `1080p`.
    - **Lower Quality Fallback**: Red warning badge showing e.g. `720p (1080p N/A) • Hindi • 110 MB` when neither Server 1 nor Server 2 has `1080p` for that episode.
- Tapping anywhere on an episode row immediately toggles its selection for batch downloading without triggering network re-probing.

### C. Smart Multi-Episode Resolution & Confirmation Modal with Red Warning + Unselect
When the user taps **Download Selected Episodes**, the Confirmation View opens with a complete breakdown before queuing downloads:
1. **Scenario 1 — Exact Quality Match on Selected Server**:
   - Downloads from the user's selected server (`Server 1` or `Server 2`) using that episode's exact quality link and selected language.
2. **Scenario 2 — Cross-Server Exact Quality Match**:
   - If the selected server does not have the target quality (e.g. `1080p`) for Episode `X`, but the other server *does* have `1080p` for Episode `X`, the resolver automatically routes Episode `X` to the other server at `1080p` with the user's chosen language (`Hindi`), displaying a clear `Server 2 (1080p Auto-Matched)` badge.
3. **Scenario 3 — Lower Quality Fallback (Red Alert Card + Inline Unselect Button)**:
   - If neither Server 1 nor Server 2 has the requested quality (e.g. `1080p`) for Episode `X`, the resolver automatically selects the highest available quality below it (e.g. `720p` or `480p`).
   - On the Confirmation Screen, Episode `X` is highlighted with a **Red border and warning banner**:
     - *"1080p is not available for Episode X — 720p has been auto-selected."*
     - Includes an interactive **Unselect / Skip Episode** button directly on that episode's row so the user can remove it with one tap if they don't want the lower quality, while keeping all other selected episodes ready to download.

### D. Strict Per-Episode Audio & URL Isolation (Fixing Wrong Audio on Server 2)
- **`DownloadSelectionModal.tsx` (`resolveEpisodePlan` & `resolveItemDownloadUrl`)**:
  - When resolving an episode `ep` in a series, remove the fallback to root `content.videoUrl` / `content.qualityLinks` / `deepUrls.primaryUrl`. Root `content` links belong to Movies or Episode 1 only; each episode `ep` must strictly use its own `ep.qualityLinks`, `ep.videoUrl`, `ep.secondaryQualityLinks`, and `ep.secondaryVideoUrl`.
- **`clientHlsDownloader.ts` & `MaxPlayOfflineVault.kt`**:
  - Do not pass Server 1's URL as `secondaryStreamUrl` for cross-server audio grafting when downloading from Server 2 (`serverOrder === 2`), unless both streams belong to the same episode and explicit external audio merging is intended.
  - Ensure that when downloading from Server 2, if Server 2's HLS master manifest has `#EXT-X-MEDIA:TYPE=AUDIO` tracks, it selects the matching language (`Hindi`, `English`, etc.) from Server 2's own manifest; if Server 2's stream has muxed audio, it downloads Server 2's own muxed video+audio segments cleanly without injecting audio from another episode.

### E. Native Popunder Ad `net::ERR_SSL_PROTOCOL_ERROR` Fix & Speed Optimization
- **`MainActivity.kt` (`openNativePopunderAd`)**:
  - Override `onReceivedError` (both modern `WebResourceRequest` and legacy overloads) and `onReceivedHttpError` in `adWeb.webViewClient`.
  - When `ERROR_FAILED_SSL_HANDSHAKE`, `ERROR_CONNECT`, `ERROR_HOST_LOOKUP`, or `net::ERR_SSL_PROTOCOL_ERROR` occurs on the main frame:
    - Immediately load `about:blank` or hide `adWeb` so Android WebView never renders the white/dark `"Web page not available (net::ERR_SSL_PROTOCOL_ERROR)"` screen.
    - Attempt a one-time fallback via `http://` or proxy fetch; if the ISP still blocks the connection, silently dismiss the popunder overlay and resume the user's video playback immediately.
- **Download Speed & Reliability Polish**:
  - Keep pre-verified metadata fast-path active in `DownloadSelectionModal.tsx` so opening the download modal and switching filters is instantaneous (`0ms` UI lag).
  - Ensure native Kotlin `MaxPlayOfflineVault.kt` and web `clientHlsDownloader.ts` use optimal segment concurrency and clean connection pooling for both Server 1 (`voe.sx`) and Server 2 (`filemoon`/`byse`).
