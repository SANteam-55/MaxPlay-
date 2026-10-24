# MaxPlay Admin APK, Native Multi-Box Link Verification & Smart Verified Download System

This plan introduces a dedicated **MaxPlay Admin APK (`MaxPlay-Admin.apk`)** powered by the Native Kotlin scraping backend, upgrades the Admin Panel's **Verify S1 / Verify S2** buttons to inspect every filled quality box (`1080p`, `720p`, `480p`, `360p`) with live step-by-step progress and real HLS metadata auto-fill, and overhauls the **Download Selection Modal** so users see only genuine qualities with accurate MB/GB sizes, cross-server options, and multi-episode batch confirmation.

## User Review & Critical Decisions

> [!IMPORTANT]
> **MaxPlay Existing System Protection Guarantee**: All existing Firestore collections, playback pipelines, Upnshare (Server 1) and Filemoon (Server 2) scrapers, and offline vault download mechanics remain 100% intact. We are extending the Admin verification pipeline, APK build workflow, and Download Selection Modal without breaking any working features.

- **Confirmed Decision 1 — Dual APK Compilation (`MaxPlay.apk` + `MaxPlay-Admin.apk`)**: GitHub Actions will automatically compile both the standard user app (`MaxPlay.apk`) and the dedicated administrator app (`MaxPlay-Admin.apk`, package `com.maxplay.admin`, app name `"MaxPlay Admin"`), which boots directly into the mobile-optimized Admin Portal with full Native Kotlin scraper access.
- **Confirmed Decision 2 — Multi-Box Native Verification & Auto-Fill**: Tapping **Verify S1** or **Verify S2** on a Movie or Series Episode iterates through all filled quality boxes (`1080p`, `720p`, `480p`, `360p`), displays a live progress counter (`Verifying 1/3 (1080p)...`), extracts the real `.m3u8` stream, real MB/GB size, real duration, and real audio tracks (`Hindi`, `English`, etc.), and saves them directly to Firestore.
- **Confirmed Decision 3 — Zero Fake MB Sizes & Smart Cross-Server Multi-Episode Download**: All synthetic bitrate/size fallbacks and dummy quality cards are removed. The Download Modal displays only real Admin-provided or HLS-discovered qualities with their verified MB/GB sizes, shows Server 2 qualities alongside Server 1 for 1-tap cross-server switching, and provides a top-first filter flow (Server → Quality → Audio Language → Multi-Select Episodes → Confirmation Summary → Background Queue).

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **MaxPlay Admin Android App (`MaxPlay-Admin.apk`)**: Gives administrators a dedicated mobile app that embeds the Admin Portal inside the Native Kotlin WebView container (`window.MaxPlayNative`), enabling 100% CORS-free Upnshare & Filemoon stream scraping and HLS segment inspection directly from an Android phone.
  2. **Multi-Box Stream Verification & Metadata Auto-Fill**: Since individual quality links (`1080p`, `720p`, `480p`, `360p`) are often uploaded separately while sharing the same audio tracks, the Admin Panel's Verify button now checks every filled quality input box for both Server 1 and Server 2, computes exact file size (MB/GB) and duration from the HLS manifest/segments, detects audio languages, and stores this verified metadata in Firestore.
  3. **Accurate Per-Quality Download & Smart Episode Selector**: When a user opens the Download Modal, it immediately displays the verified MB/GB sizes and real qualities for both Server 1 and Server 2—never showing fake MB numbers or non-existent dummy qualities—and downloads from the exact provider link matching the user's selected quality and server.
- **Target Audience / Persona**:
  - **Administrators** managing movies, series episodes, and multi-quality Upnshare/Filemoon links on mobile or desktop.
  - **End Users** downloading single movies or multi-episode series batches who need accurate MB/GB data usage previews and reliable per-quality downloads.
- **Key Value**: Eliminates unverified links, fake MB estimates, and dummy quality options while making mobile content management and multi-episode downloading fast and trustworthy.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **MaxPlay Admin App & Mobile-Responsive Admin Portal**:
     - Launching **MaxPlay Admin** on an Android phone opens the Admin Portal directly in a touch-friendly mobile layout (collapsible drawer navigation, responsive multi-quality link rows, full-width action buttons, and hardware Back button support).
  2. **Admin Multi-Box Verification Flow (Server 1 & Server 2)**:
     - The Admin pastes links into 1, 2, 3, or all 4 quality boxes (`1080p`, `720p`, `480p`, `360p`) under Server 1 (Upnshare) or Server 2 (Filemoon) for a Movie or Series Episode and taps **Verify S1** or **Verify S2**.
     - The button displays a live progress indicator: `Verifying 1/4 (1080p)...` → `Verifying 2/4 (720p)...` → `Verified 4/4 Qualities ✓`.
     - Below the quality boxes, a rich verification summary badge appears showing each verified quality's real MB/GB size, total duration (`24m 12s`), and detected audio languages (`Hindi, English`), automatically populating the content's saved metadata.
  3. **Smart Cross-Server & Multi-Episode Download Flow**:
     - **Top Filter Bar**: The user sees the **Server Toggle** (`Server 1` / `Server 2`), **Available Qualities** (showing real verified MB/GB sizes for the active server PLUS cross-server quality cards badged with `[S2]` or `[S1]` so tapping a Server 2 quality automatically switches to Server 2), and **Audio Language Pills** (`Hindi`, `English`, etc.).
     - **Episode Multi-Selection (Series/Anime)**: Below the top filters, the user taps multiple episodes (`Ep 1`, `Ep 2`, `Ep 3`...) or uses `Select All` / `Range`. Each episode card shows its real verified MB size for the chosen quality.
     - **Confirmation Summary Sheet**: Tapping **Download** opens a clear confirmation summary listing the selected Server, Quality, Audio Language, Episode count, per-episode MB breakdown, and Total MB/GB required. Confirming queues each episode 1-by-1 using that quality's exact link.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Obsidian Cinema Dark (`#0A0A0A` primary background, `#141416` elevated cards) paired with Electric Purple (`#8B5CF6`), Cyan (`#06B6D4`), Amber (`#F59E0B` for Server 2), and Emerald (`#10B981` for verified status badges).
  - *Typography & Hierarchy*: Bold `Outfit` / `Plus Jakarta Sans` headers, crisp monospace badges for resolution (`1080p`, `720p`, `480p`, `360p`) and real file sizes (`342 MB`, `1.24 GB`).
  - *Interactive Feedback*: Live progress counters on Verify buttons (`1/3`, `2/3`, `3/3`), per-box checkmarks (`✓ 385 MB`), and smooth server/quality pill transitions.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Single-Variant & Multi-Variant HLS Real Size Calculation**
  - *Chosen Approach*: When an Admin uploads separate links for `1080p`, `720p`, `480p`, and `360p`, each link often resolves to a single-quality HLS playlist rather than a multi-variant master playlist. Our Native Kotlin & Web HLS prober will calculate exact duration by summing `#EXTINF` segment durations and determine real byte size by checking `BANDWIDTH` / `#EXT-X-BYTERANGE` or sampling segment `Content-Length` headers across the playlist.
  - *Why*: Guarantees 100% real MB/GB numbers even when providers omit `BANDWIDTH` attributes on individual quality uploads.
- **Decision 2: Pre-Verified Firestore Metadata + Live On-Device Fallback**
  - *Chosen Approach*: The Admin Panel saves verified `downloadQualities` (Server 1) and `secondaryDownloadQualities` (Server 2) along with `duration` and `audioTracks` directly on the Movie or Episode object in Firestore. If an older item hasn't been verified in the Admin Panel yet, the Download Modal probes the configured quality links live without ever inventing dummy qualities or fake MB sizes.
  - *Why*: Makes the Download Modal open instantaneously with verified MB sizes for all users while remaining backward-compatible with older content.
- **Decision 3: Dedicated `MaxPlay-Admin.apk` Build Target**
  - *Chosen Approach*: Configure the Android build and GitHub Actions workflow to produce both `MaxPlay.apk` (`com.maxplay.app`) and `MaxPlay-Admin.apk` (`com.maxplay.admin`), where the Admin APK boots directly into `/admin.html` inside the Native Kotlin WebView.
  - *Why*: Allows the administrator to install both apps side-by-side on the same phone and run native Kotlin stream verification for Upnshare and Filemoon with zero browser CORS blocks.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   GITHUB ACTIONS DUAL APK BUILD PIPELINE                    │
│  ┌───────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │           MaxPlay.apk             │  │       MaxPlay-Admin.apk        │  │
│  │  • Package: com.maxplay.app       │  │  • Package: com.maxplay.admin  │  │
│  │  • Entry: /index.html (User SPA)  │  │  • Entry: /admin.html (Admin)  │  │
│  └─────────────────┬─────────────────┘  └────────────────┬───────────────┘  │
└────────────────────┼─────────────────────────────────────┼──────────────────┘
                     │                                     │
                     ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│             NATIVE KOTLIN WEBVIEW & STREAM SCRAPER ENGINE                   │
│  • Upnshare / VOE Pipeline + Filemoon / Byse Pipeline                       │
│  • Single-Variant & Master HLS Manifest Analyzer (Real MB, Duration, Audio) │
└────────────────────┬─────────────────────────────────────┬──────────────────┘
                     │                                     │
                     │                                     ▼
                     │            ┌────────────────────────────────────────┐
                     │            │     ADMIN PORTAL (Mobile & Desktop)    │
                     │            │  • Multi-Box Verify S1 & Verify S2     │
                     │            │  • Live Progress (Verifying 1/4...4/4) │
                     │            │  • Auto-Fills Real MB, Duration, Audio │
                     │            └────────────────────┬───────────────────┘
                     │                                 │ Saves Verified Metadata
                     │                                 ▼
                     │            ┌────────────────────────────────────────┐
                     │            │          FIRESTORE DATABASE            │
                     │            │  • qualityLinks / secondaryQualityLinks│
                     │            │  • downloadQualities (S1 Real MB/URL)  │
                     │            │  • secondaryDownloadQualities (S2 MB)  │
                     │            │  • audioTracks & duration              │
                     │            └────────────────────┬───────────────────┘
                     │                                 │ Reads Verified Metadata
                     ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 SMART DOWNLOAD SELECTION MODAL & QUEUE                      │
│  1. Top Filters: Server 1/2 Toggle + Real Qualities (with [S2]/[S1] Cross-  │
│     Server Auto-Switch) + Shared Audio Language Selector                    │
│  2. Episode Multi-Select Grid (Real Per-Episode MB for Selected Quality)    │
│  3. Confirmation Summary Sheet (Per-Episode & Total Real MB/GB Breakdown)   │
│  4. Background Download Queue (Downloads From Exact Selected Quality Link)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **Per-Server Verified Quality Metadata (`downloadQualities` & `secondaryDownloadQualities`)**:
  - Stored on each Movie document and each Series Episode object:
    - `id`: Quality key (`"1080p"`, `"720p"`, `"480p"`, `"360p"`)
    - `label`: Display label (`"1080p Full HD"`, `"720p HD"`, `"480p Standard"`, `"360p Saver"`)
    - `sizeMb`: Real verified integer/float size in MB computed from the HLS stream
    - `duration`: Verified duration in seconds
    - `url`: The exact provider/HLS link for that quality box
    - `server`: `"s1"` (Server 1 / Upnshare) or `"s2"` (Server 2 / Filemoon)
- **Shared Audio Languages (`audioTracks` / `availableLanguages`)**:
  - Since all quality encodes of the same movie/episode share the same audio tracks (e.g., `["Hindi", "English"]`), audio tracks discovered on any quality box (such as `1080p`) are automatically shared across all verified qualities (`720p`, `480p`, `360p`) and synced to the content's language tags.

### Interactive Component & State Mapping

1. **Admin Multi-Box Verification Handler**:
   - Collects all non-empty quality inputs (`1080p`, `720p`, `480p`, `360p`) for the target server (Server 1 or Server 2).
   - Sequentially invokes the Native Kotlin scraper (`window.MaxPlayNative.extractStreamNativeAsync`) and HLS manifest analyzer (`parseHlsManifestOnDevice`) for each box while updating the button label (`Verifying 1/N (1080p)...`).
   - If a single link is a Master `.m3u8` containing multiple resolutions, auto-populates all discovered resolutions and their real MB sizes; if separate per-quality links are provided, records each box's exact verified MB size, duration, and audio languages.
2. **Download Selection Modal State Machine**:
   - **Zero Dummy Rule**: Filters the quality list strictly to qualities present in `downloadQualities` / `qualityLinks` (for Server 1) and `secondaryDownloadQualities` / `secondaryQualityLinks` (for Server 2).
   - **Cross-Server Quality Selection**: Renders active server qualities first, followed by any qualities available on the other server with a clear `[Server 2]` / `[Server 1]` badge. Clicking a cross-server quality card automatically switches `selectedServer` and selects that quality.
   - **Exact Quality Link Dispatch**: When queuing a single movie or multi-episode batch, resolves the download URL strictly from the selected server's matching quality link (`qualityLinks[selectedQuality]` or `secondaryQualityLinks[selectedQuality]`) so picking `360p` on Server 1 or Server 2 always downloads the `360p` stream.
