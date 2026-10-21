# MaxPlay Production APK — Surgical Implementation Plan

> **Existing System Protection Compliance:** All existing Firebase collections, authentication flows, backend proxy routes, and player progress-sync mechanisms will remain untouched and 100% backward-compatible. All enhancements are additive or targeted bug fixes.

---

## 1. Custom APK & WebApp Icon (Exact Uploaded Image)
- **Goal:** Use the exact image provided (`/public/assets/aistudio/1792597087926_74b81757.png`) as the official MaxPlay APK launcher icon and PWA icon without cropping, recoloring, or editing it.
- **Changes:**
  - Copy `/public/assets/aistudio/1792597087926_74b81757.png` directly to all Android launcher mipmap directories (`mipmap-mdpi`, `mipmap-hdpi`, `mipmap-xhdpi`, `mipmap-xxhdpi`, `mipmap-xxxhdpi`, and drawable icon assets) inside `/android-kotlin/app/src/main/res/` and configure `AndroidManifest.xml` (`android:icon` and `android:roundIcon`) to point to it.
  - Update `public/manifest.json` and `index.html` (`apple-touch-icon` & `icon`) to reference `/assets/aistudio/1792597087926_74b81757.png`.

---

## 2. Server 2 Download Failure — Root-Cause Fix
- **Root Cause Identified:**
  1. When Server 2 (Filemoon / Byse / Kerapoxy / secondary HLS) extracts an `.m3u8` stream, its `.ts`/`.m4s` segments are hosted on external CDN domains (`sprintcdn`, `owphbf`, etc.) that require the original embed host (`Referer` & `Origin`) to authorize segment downloads.
  2. In `MaxPlayOfflineVault.kt` (`downloadSegmentToDisk`) and `ClientHlsDownloader.ts`, segment downloads were sending an empty `refererUrl` (falling back to the CDN's own hostname instead of `CorsFreeWebViewClient.resolveRefererForHost(host)`), causing Server 2 CDNs to reject segment downloads with HTTP 403.
  3. In `DownloadManager.ts` (`resolveStreamForTask`), `SmartStreamService.isExtractableSource(trimmed, true)` needed the `isSmartHls = true` flag so all Server 2 hoster URLs are extracted just-in-time.
- **Fix:**
  - Update `MaxPlayOfflineVault.kt` to resolve the registered stream `Referer` and `Origin` via `CorsFreeWebViewClient.resolveRefererForHost(host)` whenever `refererUrl` is not explicitly provided.
  - Pass the active source/embed Referer through `ClientHlsDownloader.downloadStream` and `wrapProxyUrl`.
  - Ensure `DownloadSelectionModal.tsx` and `DownloadManager.ts` pass `isSmartHls = true` and prioritize `secondaryServerUrl` / `secondaryQualityLinks` when `selectedServer === 'server2'`.

---

## 3. Real Voice Search Mic on Search Screen (Purple Gradient + White Icon)
- **Goal:** Replace the two non-functional decorative mics on the Search Screen with a single, real Speech-to-Text voice search button styled with a purple gradient (`from-purple-600 to-indigo-600`) and a white `Mic` icon.
- **Changes:**
  - In `src/components/common/SearchBar.tsx` and `src/screens/main/SearchScreen.tsx`, remove the duplicate outer decorative mic and style the SearchBar mic button with a purple gradient circle, white mic icon, and pulsing recording ring when active.
  - Wire up real voice recognition using the Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) plus a Native Android SpeechRecognizer bridge fallback (`window.MaxPlayNative.startVoiceRecognition`) so speaking immediately types the recognized text into the search bar and triggers live search results.

---

## 4. Details Screen Selector Row, Server 2 Languages & Quality Switch Indicator
- **Static Single-Line Selector Boxes:**
  - In `src/screens/content/ContentDetailScreen.tsx`, update the selector row containing **Audio Language**, **Video Quality**, and **Season Selector** to use a non-wrapping horizontal flex layout (`flex-nowrap items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar`) with compact responsive padding so all three boxes stay aligned in a single static horizontal line on Series/Anime screens across all phone widths.
- **Server 2 Multi-Language Selector Box:**
  - In `ContentDetailScreen.tsx`, ensure that when `selectedServer === 'server2'` is active, `availableLanguages` immediately merges:
    1. Live discovered `#EXT-X-MEDIA:TYPE=AUDIO` tracks from the player,
    2. Probed/cached `audioTracks` from `SmartStreamService.getCachedStreamMeta(secondaryServerUrl)`, and
    3. Configured episode/content `audioTracks` / `languages` / `availableLanguages` so the Language Selector box never disappears or collapses to a single language on multi-audio Server 2 streams.
- **Fast Quality Switching + `"Your quality is switching..."` Status Text:**
  - In `src/components/player/InlinePlayer.tsx`, track when a quality switch is in progress (`isSwitchingQuality` state with target quality label).
  - Display a crisp status pill directly below the loading spinner: `"Your quality is switching to 480p..."` during the transition, followed by a brief `"Quality switched to 480p"` confirmation badge once the new level/stream starts playing.
  - Optimize HLS level switching (`hls.nextLevel = levelIdx; hls.loadLevel = levelIdx`) so switching within a master playlist happens with minimal buffer flush while keeping the video playing continuously.

---

## 5. Picture-in-Picture (PiP) Mode — Video Player Only
- **Root Cause Identified:** In the Android APK, `MainActivity.enterNativePipMode()` puts the entire Android `Activity` into PiP mode. Because `ContentDetailScreen` renders the 16:9 player at the top of a full-screen portrait page, the entire Details Screen (synopsis, buttons, episodes) was visible inside the tiny PiP floating window.
- **Fix:**
  - In `MainActivity.kt`, override `onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)` and notify the WebView via `window.__onMaxPlayPipModeChanged(isInPictureInPictureMode)`, while also setting `PictureInPictureParams.Builder().setSourceRectHint(...)` to the top 16:9 video bounds.
  - In `InlinePlayer.tsx` and `ContentDetailScreen.tsx`, listen for `enterpictureinpicture` / `leavepictureinpicture` and the native `__onMaxPlayPipModeChanged` event. When PiP is active, promote the video player container to `fixed inset-0 z-[99999] w-screen h-screen bg-black` and hide player control overlays so **100% of the PiP floating window shows only the playing video**. Exiting PiP automatically restores the normal Details Screen layout.

---

## 6. Popunder Ads Rule (Max 2 After 10 Minutes) & Back-Button Trap Shield
- **Changes in `src/services/adService.ts`, `InlinePlayer.tsx`, and `MainActivity.kt`:**
  - Enforce the strict new rule in `adService.ts`:
    - Reset `popundersShownInCurrentDetail = 0` and `detailsScreenEnteredAt = Date.now()` each time a user opens a Details Screen.
    - **10-Minute Grace Period:** Block all popunders during the first `10 * 60 * 1000` ms (10 minutes) on a Details Screen.
    - **Max 2 Limit:** Allow at most **2 popunder triggers total** per Details Screen session (`MAX_POPUNDERS_PER_DETAIL = 2`).
  - **Back-Button Return Shield:**
    - Before opening an ad URL, push a protective in-app history state (`{ maxplayAdReturnGuard: true, returnContext: isFullscreen ? 'player' : 'details' }`).
    - In `CorsFreeWebViewClient.kt` / `MainActivity.kt`, intercept external ad popup/navigation attempts (`setSupportMultipleWindows` / `shouldOverrideUrlLoading`) in a dismissible overlay WebView or Custom Tab so pressing the phone's Back button closes the ad overlay and immediately returns the user to the **exact Video Player or Details Screen timestamp** without ever exiting the app or leaving the Details Screen.

---

## 7. `Me > Messages` Real Phone Status-Bar Push Notifications
- **Goal:** Give users a true native phone messaging feel when new messages or admin replies arrive in `Me > Messages`.
- **Changes:**
  - Add a Native Android Notification channel (`MAXPLAY_INBOX_CHANNEL`, High Importance with sound, vibration, and the new MaxPlay app icon) in `MainActivity.kt` / `MaxPlayNativeBridge.kt` (`showNativeNotification(title, message, messageId)`), plus Web Notification API / Service Worker fallback for PWA.
  - Subscribe to the user's Inbox/Messages collection in `RootNavigator.tsx` so whenever a new unread message arrives from Admin/System, the phone immediately rings/vibrates with a real Android system status-bar notification. Tapping the notification opens `Me > Messages` directly.

---

## 8. Hardware Back Button (Triangle Button) Navigation Fix Across All Screens
- **Root Cause Identified:**
  - `MainActivity.kt` relied on `webView.canGoBack()`, which does not reliably track React state transitions (`Me -> Settings`, `Downloads -> OfflineDetailScreen`, open modals, or fullscreen player).
  - `RootNavigator.tsx` only pushed a single history state when `isDetailOpen` changed from `false` to `true`, ignoring deeper stack pushes or `DownloadsScreen` sub-views.
- **Fix:**
  - Register a unified global back handler `window.__handleMaxPlayHardwareBack()` in `RootNavigator.tsx` that checks and pops in strict priority order:
    1. Open Fullscreen Video Player -> exits fullscreen back to portrait player.
    2. Open Modals / Drawers (`DownloadSelectionModal`, `TransferModal`, `UpdateModal`, `Settings` sub-modals) -> closes the active modal.
    3. `DownloadsScreen` open sub-views (`OfflineDetailScreen` / Series Folder view) -> pops back to the main `Downloads` tab.
    4. Active stack sub-screens (`Me > Settings`, `Me > Watch History`, `Me > Messages`, `Home > ContentDetail`, `Anime > ContentDetail`, `Search > ContentDetail`) -> pops one level back to the parent screen (`Me`, `Home`, `Anime`, `Search`).
    5. Non-Home root tab (`Anime`, `Search`, `Downloads`, `Me`) or root screen -> shows the `"Press back again to exit"` confirmation modal.
  - Update `MainActivity.kt`'s `OnBackPressedCallback` to invoke `window.__handleMaxPlayHardwareBack()` first and only exit the app when explicitly confirmed.

---

## 9. Downloads Screen — Transfer (`.maxplay`), Local Files, Received Tab, Storage UI & Recommendations
- **MaxPlay Transfer System (`Send` & `Receive` with Live Indicators):**
  - Build a dedicated **MaxPlay Transfer Modal** on `DownloadsScreen.tsx` when tapping `Transfer`:
    - **Send Mode:** Lets the user pick any downloaded movie/episode, packages it into an encrypted/signed **`.maxplay` container file** (embedding title, poster, quality, language, and video stream bytes) with live step-by-step progress indicators (`Preparing .maxplay package...` -> `Transferring (MB/s & %)...` -> `Sent Successfully!`). Uses Native Android Share / P2P Wi-Fi Direct / Web Share API so it only opens inside MaxPlay.
    - **Receive Mode:** Provides a `"Receive .maxplay File"` picker/listener with live unpacking progress (`Verifying .maxplay signature...` -> `Importing to MaxPlay Vault (0% - 100%)...` -> `Ready to Watch Offline!`). Imported items are saved with `category: 'received'` so they appear exclusively in MaxPlay's **Downloads > Received** tab.
- **Activate `MovieBox`, `Local files`, and `Received` Tabs:**
  - **MovieBox Tab:** Displays all in-app downloaded movies and series folders.
  - **Local files Tab:** Displays device video files imported into MaxPlay, with a prominent `"Import Local Video from Phone"` button (`<input type="file" accept="video/*,.mkv,.mp4,.webm" multiple />`) that indexes local phone videos (`category: 'local'`) for instant ad-free playback inside MaxPlay's custom player (with 200% volume boost, speed control, and brightness gestures).
  - **Received Tab:** Displays all `.maxplay` videos received via the Transfer system (`category: 'received'`) plus a quick `"Receive via Transfer"` button.
- **Storage Available Indicator Alignment:**
  - Redesign the `"Storage Available"` badge next to the filter tabs in `DownloadsScreen.tsx` into a clean, non-overflowing pill (`shrink-0 whitespace-nowrap`) with a mini visual usage bar (`Free GB / Total GB`).
- **Real "For You" Recommendations & Working Refresh Button:**
  - Replace the static 6 mock recommendation cards in `DownloadsScreen.tsx` with real items from the live Firestore content catalog (`subscribeToContent` + `CURATED_RECOMMENDATIONS` fallback).
  - Make the `"Refresh new content"` button shuffle and cycle through a fresh set of 6 real catalog recommendations with a smooth spin animation, and allow tapping any card or its Download icon to open/download that title.

---

## 10. Multi-Device UI Overflow Fix (Video Player Fullscreen Button & Safe Areas)
- **Root Cause Identified:** In `src/components/player/PlayerControls.tsx`, the bottom control bar right-hand group (`Cast`, `Audio Language`, `Quality`, `PiP`, `Fullscreen`) had fixed minimum widths and untruncated language names, pushing the `Fullscreen` button off the right edge on 320px–375px wide phones.
- **Fix:**
  - Make the `PlayerControls.tsx` bottom bar responsive (`flex-wrap: nowrap`, `min-w-0`, compact gaps `gap-1 sm:gap-2.5` on mobile, `max-w-[72px] sm:max-w-[110px] truncate` on the language badge, and `shrink-0` on the Fullscreen & PiP buttons) so every button—especially Fullscreen—is 100% visible and tappable on all phone screen sizes.

---

## 11. Home Screen Top-Right Arrow — APK Update Checker & Admin Force-Update Lock
- **Admin Version & Force-Update Configuration:**
  - Read `appVersion` (or `latestApkVersion`), `apkDownloadUrl` (or `downloadUrl`), `minRequiredVersion`, and `forceApkUpdate` from Firestore `settings/general` (with live real-time `onSnapshot` listener so changes in the Admin Panel reflect immediately on user devices).
- **Home Screen Top-Right Update Button (`src/screens/main/HomeScreen.tsx`):**
  - Compare the user's current installed version (`1.1`, or stored/bridge version) against the Admin's latest version using semantic version comparison (`compareSemver(latestVersion, currentVersion) > 0`).
  - **When Up-to-Date:** The circular arrow button on the right of the search bar stays in its sleek glassmorphic state (tapping it shows a clean toast: `"You are using the latest version of MaxPlay (v1.1)"`).
  - **When Update Available (e.g. Current `1.1` < Admin `1.2`):**
    - The circular button switches from glassmorphism to a **vibrant blinking red alert badge** (`bg-red-600 animate-pulse ring-2 ring-red-400 shadow-[0_0_15px_rgba(239,68,68,0.8)]`).
    - Tapping the blinking red button opens a dedicated **APK Update Modal** displaying the new version number (`v1.2`), convincing release highlights (*"Update to the latest version of MaxPlay to enjoy faster downloads, smoother streaming, and new features!"*), and a direct **Download Latest APK** button.
    - While un-updated, the red button continues blinking and automatically shows a reminder popup periodically.
- **Admin "Stop Service on Old Version" (Force Update Lock):**
  - If the Admin sets `forceUpdate: true` or sets `minRequiredVersion` higher than the user's installed version in `settings/general`, render a **Full-Screen Non-Dismissible Force Update Lock Screen** (cannot be closed with Back button or X button) requiring the user to tap **Update Now** to download the new APK.
