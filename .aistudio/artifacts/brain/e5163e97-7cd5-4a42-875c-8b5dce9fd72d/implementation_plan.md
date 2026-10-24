# MaxPlay Final Polish & Core Stability Plan

Resolves the four remaining production issues across P2P file transfers, local device video playback, Native Picture-in-Picture (PiP), and ad protocol compatibility while preserving all existing features.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following default choices have been selected to ensure native Android reliability and a smooth playback experience:

- **Native Android PiP Only**: Custom in-app floating miniplayer overlays when backing out of the Details screen are removed. Picture-in-Picture now uses only Android's native OS PiP mode (triggered via the player's PiP button or pressing the Android Home button while playing).
- **Protocol-Safe Ad Container**: Popunder ads open in a dedicated native WebView overlay with custom scheme handling (`intent://`, `market://`, `http://`, `https://`) and a single-press Back button return to the video player, eliminating protocol and `X-Frame-Options` errors.
- **Strict Ad Frequency Caps**: Zero popunders during the first 10 minutes on the Details screen, and at most 2 popunders per Details screen visit (minimum 3 minutes apart).
- **In-Place Deduplication for Received Files**: Receiving a movie or episode that already exists in the `Received` tab updates the existing entry in-place rather than creating duplicate cards.

### 1. Overview & Core Concept

- **What It Does**: Upgrades MaxPlay's offline P2P transfer engine for high-speed LAN transfers, fixes local video streaming so device videos play continuously without false "re-download" errors, transitions exclusively to Native Android PiP, and fixes Popunder ad protocol errors.
- **Target Audience**: MaxPlay Android APK and web users watching online streams, local phone videos, and sharing downloaded movies/episodes offline between devices.
- **Key Value**: Fast peer-to-peer transfers in seconds instead of 30+ minutes, uninterrupted local video playback, clean native PiP behavior, and zero broken ad pages.

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Fast P2P File Transfer (`Send` / `Receive`)**: Sender taps *Send* to generate a 6-digit code and QR; Receiver enters the code or scans the QR. Both devices see real-time transfer progress, speed, and byte counters, and the completed item appears once in the `Received` tab without duplicates.
  2. **Continuous Local Video Playback**: Tapping any horizontal/vertical real-thumbnail video card in `Downloads > Local files` plays the video smoothly from start to finish using direct seekable byte-range streaming without false "re-download" warnings.
  3. **Native Android PiP**: Pressing the Back button from the Details screen cleanly exits back to the previous screen without spawning a floating in-app miniplayer box. Tapping the PiP icon in the player or pressing the Android Home button enters native system PiP.
  4. **Seamless Ad Return Flow**: When an eligible popunder triggers after the 10-minute grace period, it loads cleanly without protocol errors, and pressing the Back button or top close bar immediately returns to the video player.
- **Visual Identity & Theme**: Preserves MaxPlay's dark cinema aesthetic (`#08080A` obsidian background, `#FF2A5F` crimson accents, `#00E599` emerald transfer indicators) with clear progress bars and status badges.

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Parallel Multi-Stream LAN Transfer without Slow Internet Fallback**
  - *Chosen Approach*: Transfer media segments over LAN/Hotspot using an 8-worker parallel pool with 256 KB socket buffers and session-level deduplication locks.
  - *Why*: Sequential 1-by-1 segment transfers and accidental fallback to internet HLS re-downloading caused transfers to take >30 minutes and created duplicate entries.
- **Decision 2: Direct `<video>` & `FileChannel` Range Streaming for Local Videos**
  - *Chosen Approach*: Route local device videos (`blob:` and `/device-video/`) directly to the native HTML5 `<video>` element rather than `Hls.js`, backed by `FileChannel.position()` bounded range streaming on Android.
  - *Why*: Passing local MP4/MKV `blob:` URLs into `Hls.js` or failing subsequent `206 Partial Content` range skips caused playback to halt after 5–6 seconds with a misleading re-download error.
- **Decision 3: Dedicated Native WebView Dialog for Popunder Ads**
  - *Chosen Approach*: Replace restricted sandboxed iframes with a dedicated native Android WebView dialog that intercepts `intent://`, `market://`, and mixed HTTP/HTTPS redirects and closes on hardware Back press.
  - *Why*: Ad networks frequently redirect through schemes and headers (`X-Frame-Options: DENY`) that fail inside sandboxed iframes.

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MaxPlay Application UI                          │
├──────────────────────┬──────────────────────────┬───────────────────────┤
│   Downloads & P2P    │   Offline & Local Player │  Details & Ad Manager │
│  - Deduplicated      │  - Direct <video> for    │  - Native OS PiP only │
│    Received Vault    │    local files & blobs   │  - 10m grace period   │
│  - Session Lock      │  - Silent stall recovery │  - Max 2 popunders    │
└──────────┬───────────┴─────────────┬────────────┴───────────┬───────────┘
           │                         │                        │
           ▼                         ▼                        ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐
│  8-Thread LAN P2P    │  │ Seekable FileChannel │  │ Protocol-Safe Ad    │
│  Transfer Engine     │  │ 206 Range Streamer   │  │ WebView Dialog      │
│  (256KB Buffer Pool) │  │ (Bounded InputStream)│  │ (intent/market/http)│
└──────────────────────┘  └──────────────────────┘  └─────────────────────┘
```

- **Data Model & State**:
  - **Received Vault Deduplication**: Matches incoming transfers against existing `category === 'received'` records by `contentId + episodeIndex` (or `title + subtitle`) and updates existing entries in-place, guarded by an active session completion set.
  - **Local Video Stream Pipeline**: Serves exact byte slices `[clampedStart, clampedEnd]` via a bounded stream wrapper over `ParcelFileDescriptor` and normalizes container MIME types (`video/mp4`, `video/webm`) for WebView hardware decoding.
  - **Ad Frequency & Protocol State**: Tracks Details screen entry timestamp (`detailEnteredAt`) and session trigger count (`sessionPopunderCount <= 2`), delegating display to the native protocol-aware dialog on Android.
