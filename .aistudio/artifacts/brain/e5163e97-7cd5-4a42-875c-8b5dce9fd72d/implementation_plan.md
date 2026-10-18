# Filemoon Byse/F16Px Scraper Upgrade & Dual-Server Selection System

This plan upgrades MaxPlay's inbuilt Filemoon scraper to natively extract HLS streams from Filemoon's latest `byseraguci.com` / `bysedikamoum.com` / `f16px.com` (`/d/` and `/e/`) links via both encrypted API decryption and headless DOM/network interception, replaces the 4th Action Dock button (**Details**) on the Content Details screen with an interactive **Server Selector** (**Server 1: Primary Voe.sx** & **Server 2: Filemoon**), and updates the Admin Panel so every episode and movie can store both a Primary (`voe.sx`) and Secondary (`filemoon`) link.

### User Review & Critical Decisions

> [!IMPORTANT]
> **MaxPlay Existing System Protection Guarantee**:
> - The working **Voe.sx scraper pipeline** (`ProviderType.VOE`), existing Firestore database collections (`content`, `content_seasons`), authentication, and offline download engine remain **100% untouched and backward-compatible**.
> - Existing content items that only have a single `videoUrl` will continue playing seamlessly without requiring any data migration.

- **Confirmed Decision 1 (Smart Auto-Fallback)**: If the user selects Server 1 (`voe.sx`) or Server 2 (`filemoon`) and that link is either not uploaded for a particular episode or fails to resolve, the player automatically falls back to the other available server link and shows a subtle toast notification.
- **Confirmed Decision 2 (Dual-Server Admin Inputs for Episodes & Movies)**: Every Episode box in the Admin Panel (and the Movie Smart HLS section) will have two stacked inputs: **Server 1 — Primary Link (Voe.sx)** on top, and **Server 2 — Secondary Link (Filemoon / Byse)** directly below it, each with its own independent **Verify** button.
- **Confirmed Decision 3 (Button #4 Server Selector + Title Info Trigger)**: Button #4 in the Content Details 4-button Action Dock is transformed into the **Server** selector button (`Server 1` / `Server 2` badge), while a subtle info icon next to the content title remains available if a user wishes to view the story synopsis modal.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Fixes `https://byseraguci.com/d/euhf0n80b2ue` & All Filemoon Mirrors**: Filemoon links on `byseraguci.com`, `bysedikamoum.com`, `f16px.com`, `filemoon.sx`, and `moonmov.pro` use two mechanisms:
     - **Encrypted Playback API (`/api/videos/{code}/embed/details` & `/api/videos/{code}/embed/playback`)**: Returns an AES-256-GCM encrypted JSON payload (`payload`, `iv`, `key_parts`) containing the direct `.m3u8` master stream URL.
     - **Packed JWPlayer / Nested Iframe (`/bkg/`, `f16px`, `kerapoxy`)**: Uses `eval(function(p,a,c,k,e,d)...)` or runtime `fetch()` decryption inside an embedded player iframe.
     - Our upgraded Filemoon pipeline handles **both** in under 1–2 seconds: Stage 1 directly queries `/api/videos/{code}/embed/playback` and decrypts the AES-GCM payload in Kotlin (`javax.crypto.Cipher` `AES/GCM/NoPadding`) + Node.js (`crypto.createDecipheriv('aes-256-gcm')`) as well as running the Packer unpacker; Stage 2 WebView Sniffer hooks `window.fetch`, `XMLHttpRequest`, and `JSON.parse` to immediately capture any runtime-decrypted `.m3u8` URL.
  2. **Explicit Server Selection (Button #4 on Content Detail Screen)**:
     - Users can tap the 4th Action Dock button (**Server**) to open a sleek bottom sheet / modal and switch between **Server 1: Primary (Voe.sx)** and **Server 2: Backup (Filemoon)**.
     - Selecting a server immediately tells the scraper engine (`forcedProvider = 'VOE'` or `'FILEMOON'`) which dedicated pipeline to execute—eliminating any ambiguity between Voe and Filemoon links.
  3. **Admin Panel Dual-Server Workflow**:
     - Each Episode box displays **Primary Link (Server 1 — Voe.sx)** and directly beneath it **Secondary Link (Server 2 — Filemoon / Byse)** so admins can attach both mirrors per episode.

- **Target Audience / Persona**: MaxPlay viewers watching anime, series, and movies on Android APK and Web, and MaxPlay admins uploading dual-mirror streams.
- **Key Value**: 100% reliable playback across both Voe.sx and Filemoon (`byseraguci.com/d/...`) with instant server switching and zero guesswork for the scraper engine.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Viewer Server Switching Flow**:
     - On the Content Detail Screen, the 4-button Action Dock displays: `Like`, `My List`, `Download`, and **`Server`** (Button #4, showing the active server badge `S1` or `S2`).
     - Tapping **Server** opens a responsive dark glassmorphic selector sheet displaying:
       - **Server 1 • Primary (Voe.sx)** — Fast Multi-Quality HLS (`Active` / `Available` badge)
       - **Server 2 • Secondary (Filemoon)** — High-Stability Mirror (`Active` / `Available` badge)
     - When the user switches servers, playback resumes from the exact current timestamp (`playbackPosition`) using the newly selected server's link and dedicated scraper.
  2. **Admin Dual-Link Upload Flow**:
     - Inside the Admin Portal (`Upload / Edit Content` -> `Step 2`), every Episode box in Smart HLS mode shows:
       - **Input 1 (Server 1 — Primary Voe.sx)**: `https://voe.sx/...` + `[Verify S1]` button.
       - **Input 2 (Server 2 — Secondary Filemoon)**: `https://byseraguci.com/d/...` + `[Verify S2]` button.
     - Admins can fill either one or both links. Saving the content persists both links cleanly on the episode object (`videoUrl` / `primaryServerUrl` for Server 1, and `secondaryServerUrl` / `filemoonUrl` for Server 2).

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Matches MaxPlay's signature dark OTT HUD (`#0A0A0A` canvas, `#131318` elevated cards, `#8B5CF6` violet and `#06B6D4` cyan accents).
  - *Touch Ergonomics*: Minimum `44x44px` touch hitboxes on all server selection cards and action dock buttons, instant `<150ms` tactile feedback (`active:scale-95`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Native AES-256-GCM Decryption for `byseraguci.com/d/{code}` (`/api/videos/{code}/embed/playback`)**
  - *Chosen Approach*: Extract the media code (`euhf0n80b2ue`) from `/d/{code}` or `/e/{code}`, query `/api/videos/{code}/embed/details` and `/api/videos/{code}/embed/playback` with proper `Referer` / `X-Embed-Parent` headers, concatenate `key_parts[0] + key_parts[1]`, and decrypt `payload` with `iv` using native `AES/GCM/NoPadding`. If the host uses HTML Packer (`eval(function(p,a,c,k,e,d)...)`), run our state-machine unpacker; if it uses a cross-origin iframe, unwrap it and intercept `JSON.parse` / `fetch` in Stage 2.
  - *Why*: Modern Filemoon domains (`byseraguci.com`, `bysedikamoum.com`, `f16px.com`) no longer put `.m3u8` in plain HTML—they return an AES-GCM encrypted JSON from `/api/videos/{code}/embed/playback`. Decrypting this directly in Kotlin & Node.js resolves `https://byseraguci.com/d/euhf0n80b2ue` in `< 400ms` without waiting for heavy browser ads.

- **Decision 2: Explicit Provider Hinting via Server Selection (`server1_voe` vs `server2_filemoon`)**
  - *Chosen Approach*: Pass the active server selection (`providerHint: 'VOE' | 'FILEMOON'`) from `ContentDetailScreen` -> `SmartStreamService` -> `NativeBridgeService` -> `InbuiltStreamScraper.kt` (and `/api/extract-stream`).
  - *Why*: Ensures the Voe scraper never touches a Filemoon link and the Filemoon scraper never touches a Voe link, while still keeping automatic URL/HTML signature detection as a safety net when a single link is used.

- **Decision 3: Backward-Compatible Firestore Episode & Movie Data Structure**
  - *Chosen Approach*: Store Server 1 in `videoUrl` (and `server1Url`) and Server 2 in `secondaryVideoUrl` (and `server2Url`) on each episode and movie item. If an older episode only has `videoUrl` (whether Voe or Filemoon), the app automatically detects which server it belongs to and plays it smoothly.
  - *Why*: Protects 100% of existing uploaded content in Firestore with zero breaking changes.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         ADMIN PORTAL (Upload Step 2)                      │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Episode Box / Movie Smart HLS Box                                   │  │
│  │  • Server 1 Input (Primary - Voe.sx)      + [Verify S1]             │  │
│  │  • Server 2 Input (Secondary - Filemoon)  + [Verify S2]             │  │
│  └──────────────────────────────────┬──────────────────────────────────┘  │
└─────────────────────────────────────┼─────────────────────────────────────┘
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    CONTENT DETAIL SCREEN (Action Dock)                    │
│  [1. Like]     [2. My List]     [3. Download]     [4. Server (S1 / S2)]   │
│                                                            │              │
│   ┌────────────────────────────────────────────────────────┘              │
│   ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Server Selector Modal                                               │  │
│  │  (o) Server 1: Primary (Voe.sx)     — Fast Multi-Quality HLS        │  │
│  │  ( ) Server 2: Secondary (Filemoon) — Backup High-Speed Mirror      │  │
│  └──────────────────────────────────┬──────────────────────────────────┘  │
└─────────────────────────────────────┼─────────────────────────────────────┘
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│            DEDICATED SCRAPER ROUTER (Kotlin APK + Node Server)            │
│                                                                           │
│   ├──► Server 1 (VOE Pipeline) ──► ROT13 + Base64 + Shift(-3) + wc0       │
│   │                                (100% Existing Working Engine)         │
│   │                                                                       │
│   └──► Server 2 (FILEMOON / BYSE Pipeline)                                │
│         ├─ Step A: /api/videos/{code}/embed/details & /embed/playback     │
│         │          AES-256-GCM Decryptor (key_parts + iv + payload)       │
│         ├─ Step B: /d/{code} -> /e/{code} -> Nested Iframe (f16px / bkg)  │
│         │          Deterministic Packer Unpacker                          │
│         └─ Step C: Stage 2 WebView Sniffer with JSON.parse & fetch() Hook │
└───────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `Episode` & `ContentItem` interface additions (optional, non-breaking fields):
    - `videoUrl`: Primary stream link (Server 1 - Voe.sx, or default single link)
    - `secondaryVideoUrl?: string`: Secondary stream link (Server 2 - Filemoon / Byse)
    - `server1Url?: string`: Explicit Server 1 link alias
    - `server2Url?: string`: Explicit Server 2 link alias
  - `activeServer`: `'server1' | 'server2'` state in `ContentDetailScreen` (persisted in `localStorage` under `maxplay_preferred_server` so user preference is remembered across episodes).

- **Interactive Component & State Mapping**:
  - **Action Dock Button #4 (`Server`)**: Opens the Server Selection Modal showing availability status for Server 1 (Voe.sx) and Server 2 (Filemoon) on the active episode/movie.
  - **Server Selection Modal**: Clicking Server 1 or Server 2 saves current playback progress, updates `activeServer`, clears any stale error state, and immediately resolves the selected server's stream URL with explicit provider routing (`VOE` vs `FILEMOON`).
  - **Automatic Fallback Handler**: If `activeServer === 'server1'` but only `secondaryVideoUrl` exists (or if Server 1 extraction fails and `secondaryVideoUrl` is present), automatically switches to Server 2 and notifies the user via toast (`"Switched to Server 2 (Filemoon)"`), and vice-versa.
