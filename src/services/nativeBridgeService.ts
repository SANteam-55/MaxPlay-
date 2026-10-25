/**
 * MaxPlay Native Kotlin Bridge Adapter
 * ----------------------------------------------------
 * Connects the React Frontend to the Native Kotlin Android App (`window.MaxPlayNative`).
 * - When running inside the MaxPlay Android APK:
 *   1. Executes inbuilt stream scraping & .m3u8 sniffing directly on the user's phone (Zero CORS).
 *   2. Fetches HLS playlists & binary video segments via Native OkHttp with custom Referer/User-Agent.
 *   3. Controls native Android sensor landscape orientation and immersive fullscreen.
 * - When running in a regular Web Browser:
 *   Gracefully returns null/false so 100% of existing web logic continues working unchanged.
 */

export interface NativeScrapeResult {
  ok: boolean;
  m3u8Url?: string;
  qualities?: string[];
  qualityLinks?: Record<string, string>;
  downloadQualities?: {
    id: string;
    label: string;
    sizeMb: number;
    url: string;
    bandwidth: number;
  }[];
  audioTracks?: string[];
  duration?: number;
  headers?: Record<string, string>;
  method?: 'kotlin_okhttp' | 'kotlin_headless_sniffer';
  error?: string;
}

interface MaxPlayKotlinBridge {
  isNativeApp?: () => boolean;
  getAppVersion?: () => string;
  extractStreamNative?: (sourceUrl: string, headersJson: string) => string;
  extractStreamNativeAsync?: (sourceUrl: string, headersJson: string, callbackId: string) => void;
  sniffStreamAsync?: (sourceUrl: string, callbackId: string, timeoutMs: number) => void;
  fetchUrlCorsFree?: (targetUrl: string, headersJson: string) => string;
  fetchUrlCorsFreeAsync?: (targetUrl: string, headersJson: string, callbackId: string) => void;
  fetchBytesBase64CorsFree?: (targetUrl: string, headersJson: string) => string;
  setLandscapeOrientation?: (locked: boolean) => void;
  setBrightness?: (percent: number) => void;
  getBrightness?: () => number;
  setVolume?: (percent: number) => void;
  getVolume?: () => number;
  enterPipMode?: () => boolean;
  getDeviceStorageStats?: () => string;
  downloadSegmentToDisk?: (
    storageKey: string,
    segmentIndex: number,
    segmentUrl: string,
    refererUrl: string,
    callbackId: string
  ) => void;
  downloadAudioSegmentToDisk?: (
    storageKey: string,
    segmentIndex: number,
    segmentUrl: string,
    refererUrl: string,
    callbackId: string
  ) => void;
  saveOfflineManifest?: (
    storageKey: string,
    totalSegments: number,
    totalDurationSec: number,
    isSingleFile: boolean
  ) => boolean;
  saveOfflineManifestWithAudio?: (
    storageKey: string,
    totalSegments: number,
    totalDurationSec: number,
    isSingleFile: boolean,
    totalAudioSegments: number,
    languageLabel: string
  ) => boolean;
  getOfflineCheckpointInfo?: (storageKey: string) => string;
  hasOfflineItem?: (storageKey: string) => boolean;
  getOfflinePlaybackUrl?: (storageKey: string) => string;
  deleteOfflineItem?: (storageKey: string) => boolean;
  clearImageDiskCache?: () => boolean;
  getImageDiskCacheBytes?: () => number;
  showNativeNotification?: (title: string, body: string, imageUrl?: string) => boolean;
  startVoiceRecognition?: () => boolean;
  exportAndShareMaxPlayFile?: (storageKey: string, fileName: string, metadataJson: string) => string;
  setStatusBarColor?: (hexColor: string) => boolean;
  setAutoPipEnabled?: (enabled: boolean) => boolean;
  setVideoPlayingState?: (isPlaying: boolean) => boolean;
  scanDeviceLocalVideos?: () => string;
  requestVideoStoragePermission?: () => boolean;
  startDirectTransferServer?: (storageKey: string, transferCode: string, metadataJson: string) => string;
  stopDirectTransferServer?: () => boolean;
  receiveDirectTransferFromPeer?: (
    senderIp: string,
    senderPort: number,
    transferCode: string,
    targetStorageKey: string,
    callbackId: string
  ) => void;
  downloadAndInstallApk?: (apkUrl: string, versionName: string, title: string) => boolean;
  openPopunderAd?: (adUrl: string) => boolean;
  closePopunderAd?: () => boolean;
  isPopunderAdOpen?: () => boolean;
}

export interface ApkUpdateProgressState {
  status: 'downloading' | 'installing' | 'permission_required' | 'completed' | 'error';
  progress: number;
  downloadedMb: number;
  totalMb: number;
  version: string;
  message: string;
}

export interface DeviceLocalVideoItem {
  id: string;
  title: string;
  folderName: string;
  sizeMb: number;
  durationSec: number;
  resolution: string;
  width?: number;
  height?: number;
  isVertical?: boolean;
  mimeType: string;
  dateModified: number;
  playbackUrl: string;
  thumbnailUrl?: string;
}

declare global {
  interface Window {
    MaxPlayNative?: MaxPlayKotlinBridge;
    __maxplaySnifferCallbacks?: Record<string, (resultJson: string) => void>;
    onMaxPlaySnifferResult?: (callbackId: string, resultJson: string) => void;
    __maxplaySegmentCallbacks?: Record<string, (res: any) => void>;
    __onMaxPlaySegmentComplete?: (callbackId: string, res: any) => void;
    __onMaxPlayPipModeChanged?: (isInPip: boolean) => void;
    __onMaxPlayVoiceResult?: (spokenText: string) => void;
    __onMaxPlayTransferProgress?: (callbackId: string, pct: number, msg: string) => void;
    __onMaxPlayApkUpdateProgress?: (payload: ApkUpdateProgressState) => void;
    __handleMaxPlayHardwareBack?: () => string;
  }
}

// Initialize global callback receiver for async Headless WebView Sniffer & Native Disk Segment Downloader from Kotlin
if (typeof window !== 'undefined') {
  window.__maxplaySnifferCallbacks = window.__maxplaySnifferCallbacks || {};
  window.onMaxPlaySnifferResult = (callbackId: string, resultJson: string) => {
    const cb = window.__maxplaySnifferCallbacks?.[callbackId];
    if (cb) {
      delete window.__maxplaySnifferCallbacks![callbackId];
      cb(resultJson);
    }
  };

  window.__maxplaySegmentCallbacks = window.__maxplaySegmentCallbacks || {};
  window.__onMaxPlaySegmentComplete = (callbackId: string, res: any) => {
    const cb = window.__maxplaySegmentCallbacks?.[callbackId];
    if (cb) {
      delete window.__maxplaySegmentCallbacks![callbackId];
      cb(res);
    }
  };
}

export class NativeBridgeService {
  /**
   * Returns true if the web app is currently running inside the Native Kotlin Android wrapper.
   */
  public static isRunningInKotlinApp(): boolean {
    try {
      return Boolean(
        typeof window !== 'undefined' &&
          window.MaxPlayNative &&
          typeof window.MaxPlayNative.extractStreamNative === 'function'
      );
    } catch {
      return false;
    }
  }

  /**
   * Alias for isRunningInKotlinApp() for backward compatibility.
   */
  public static isAndroidWebView(): boolean {
    return this.isRunningInKotlinApp();
  }

  /**
   * Locks or unlocks native Android hardware landscape orientation when entering/exiting fullscreen.
   */
  public static setNativeLandscapeOrientation(locked: boolean): boolean {
    try {
      if (this.isRunningInKotlinApp() && window.MaxPlayNative?.setLandscapeOrientation) {
        window.MaxPlayNative.setLandscapeOrientation(locked);
        return true;
      }
    } catch (err) {
      console.warn('[NativeBridge] Orientation control warning:', err);
    }
    return false;
  }

  /**
   * Adjusts real Android phone hardware screen brightness (10 to 100%).
   */
  public static setNativeBrightness(percent: number): boolean {
    try {
      if (this.isRunningInKotlinApp() && typeof window.MaxPlayNative?.setBrightness === 'function') {
        window.MaxPlayNative.setBrightness(Math.round(Math.max(5, Math.min(100, percent))));
        return true;
      }
    } catch {}
    return false;
  }

  /**
   * Reads current Android phone hardware screen brightness (10 to 100%).
   */
  public static getNativeBrightness(): number | null {
    try {
      if (this.isRunningInKotlinApp() && typeof window.MaxPlayNative?.getBrightness === 'function') {
        const val = window.MaxPlayNative.getBrightness();
        if (typeof val === 'number' && !isNaN(val)) return val;
      }
    } catch {}
    return null;
  }

  /**
   * Adjusts real Android phone STREAM_MUSIC hardware volume (0 to 100%).
   */
  public static setNativeVolume(percent: number): boolean {
    try {
      if (this.isRunningInKotlinApp() && typeof window.MaxPlayNative?.setVolume === 'function') {
        window.MaxPlayNative.setVolume(Math.round(Math.max(0, Math.min(100, percent))));
        return true;
      }
    } catch {}
    return false;
  }

  /**
   * Reads current Android phone STREAM_MUSIC hardware volume (0 to 100%).
   */
  public static getNativeVolume(): number | null {
    try {
      if (this.isRunningInKotlinApp() && typeof window.MaxPlayNative?.getVolume === 'function') {
        const val = window.MaxPlayNative.getVolume();
        if (typeof val === 'number' && !isNaN(val)) return val;
      }
    } catch {}
    return null;
  }

  /**
   * Enters native Android Picture-in-Picture (PiP) floating video window.
   */
  public static enterNativePipMode(): boolean {
    try {
      if (this.isRunningInKotlinApp() && typeof window.MaxPlayNative?.enterPipMode === 'function') {
        return Boolean(window.MaxPlayNative.enterPipMode());
      }
    } catch {}
    return false;
  }

  /**
   * Reads real Android internal storage statistics (totalGb, freeGb, usedByAppMb).
   */
  public static getDeviceStorageStats(): {
    ok: boolean;
    totalGb: number;
    freeGb: number;
    usedByAppMb: number;
    totalBytes?: number;
    freeBytes?: number;
    usedByAppBytes?: number;
  } | null {
    try {
      if (this.isRunningInKotlinApp() && typeof window.MaxPlayNative?.getDeviceStorageStats === 'function') {
        const raw = window.MaxPlayNative.getDeviceStorageStats();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.ok) return parsed;
        }
      }
    } catch {}
    return null;
  }

  /**
   * Returns true if Native Disk Offline Vault is supported in this APK build.
   */
  public static supportsNativeOfflineVault(): boolean {
    try {
      return Boolean(
        this.isRunningInKotlinApp() &&
          typeof window.MaxPlayNative?.downloadSegmentToDisk === 'function' &&
          typeof window.MaxPlayNative?.saveOfflineManifest === 'function'
      );
    } catch {
      return false;
    }
  }

  /**
   * Returns true if the installed APK build supports separate audio rendition segment downloads on disk.
   */
  public static supportsNativeAudioVault(): boolean {
    try {
      return Boolean(
        this.supportsNativeOfflineVault() &&
          typeof window.MaxPlayNative?.downloadAudioSegmentToDisk === 'function' &&
          typeof window.MaxPlayNative?.saveOfflineManifestWithAudio === 'function'
      );
    } catch {
      return false;
    }
  }

  /**
   * Downloads a single HLS segment (.ts) directly to Android internal storage disk via Kotlin OkHttp.
   * Automatically reuses existing segment on disk if already downloaded (0ms checkpoint resume).
   */
  public static downloadSegmentToDiskNative(
    storageKey: string,
    segmentIndex: number,
    segmentUrl: string,
    refererUrl: string = '',
    isAudio: boolean = false
  ): Promise<{ ok: boolean; bytes?: number; cached?: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.supportsNativeOfflineVault()) {
        resolve({ ok: false, error: 'Native vault not supported' });
        return;
      }

      const callbackId = `seg_${Date.now()}_${isAudio ? 'a' : 'v'}${segmentIndex}_${Math.random().toString(36).slice(2, 6)}`;
      const timer = setTimeout(() => {
        if (window.__maxplaySegmentCallbacks?.[callbackId]) {
          delete window.__maxplaySegmentCallbacks[callbackId];
          resolve({ ok: false, error: 'Segment timeout' });
        }
      }, 45000);

      window.__maxplaySegmentCallbacks = window.__maxplaySegmentCallbacks || {};
      window.__maxplaySegmentCallbacks[callbackId] = (res: any) => {
        clearTimeout(timer);
        if (res && res.ok) {
          resolve({
            ok: true,
            bytes: Number(res.bytes || 0),
            cached: Boolean(res.cached),
          });
        } else {
          resolve({
            ok: false,
            error: res?.error || 'Segment download failed',
          });
        }
      };

      try {
        if (isAudio && typeof window.MaxPlayNative!.downloadAudioSegmentToDisk === 'function') {
          window.MaxPlayNative!.downloadAudioSegmentToDisk!(
            storageKey,
            segmentIndex,
            segmentUrl,
            refererUrl,
            callbackId
          );
        } else {
          window.MaxPlayNative!.downloadSegmentToDisk!(
            storageKey,
            segmentIndex,
            segmentUrl,
            refererUrl,
            callbackId
          );
        }
      } catch (e: any) {
        clearTimeout(timer);
        delete window.__maxplaySegmentCallbacks[callbackId];
        resolve({ ok: false, error: e?.message || 'Bridge exception' });
      }
    });
  }

  /**
   * Writes the offline HLS manifest (`index.m3u8`) on Android internal storage disk.
   */
  public static saveOfflineManifestNative(
    storageKey: string,
    totalSegments: number,
    totalDurationSec: number,
    isSingleFile: boolean = false,
    totalAudioSegments: number = 0,
    languageLabel: string = 'Default'
  ): boolean {
    try {
      if (this.supportsNativeOfflineVault()) {
        if (
          totalAudioSegments > 0 &&
          typeof window.MaxPlayNative!.saveOfflineManifestWithAudio === 'function'
        ) {
          return Boolean(
            window.MaxPlayNative!.saveOfflineManifestWithAudio!(
              storageKey,
              totalSegments,
              totalDurationSec,
              isSingleFile,
              totalAudioSegments,
              languageLabel
            )
          );
        }
        return Boolean(
          window.MaxPlayNative!.saveOfflineManifest!(
            storageKey,
            totalSegments,
            totalDurationSec,
            isSingleFile
          )
        );
      }
    } catch {}
    return false;
  }

  /**
   * Queries checkpoint status from Android internal storage disk for resumable downloads.
   */
  public static getOfflineCheckpointInfoNative(storageKey: string): {
    exists: boolean;
    downloadedSegments: number;
    totalBytes: number;
    completedIndices: number[];
    completedAudioIndices: number[];
    playbackUrl?: string;
  } | null {
    try {
      if (this.supportsNativeOfflineVault() && window.MaxPlayNative?.getOfflineCheckpointInfo) {
        const raw = window.MaxPlayNative.getOfflineCheckpointInfo(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            exists: Boolean(parsed.exists),
            downloadedSegments: Number(parsed.downloadedSegments || 0),
            totalBytes: Number(parsed.totalBytes || 0),
            completedIndices: Array.isArray(parsed.completedIndices) ? parsed.completedIndices : [],
            completedAudioIndices: Array.isArray(parsed.completedAudioIndices)
              ? parsed.completedAudioIndices
              : [],
            playbackUrl: parsed.playbackUrl,
          };
        }
      }
    } catch {}
    return null;
  }

  /**
   * Checks if a playable offline item exists on Android internal storage disk.
   */
  public static hasOfflineItemNative(storageKey: string): boolean {
    try {
      if (this.supportsNativeOfflineVault() && window.MaxPlayNative?.hasOfflineItem) {
        return Boolean(window.MaxPlayNative.hasOfflineItem(storageKey));
      }
    } catch {}
    return false;
  }

  /**
   * Gets the virtual local HTTPS URL (`https://maxplay.local/offline-vault/{key}/index.m3u8`) for zero-RAM playback.
   */
  public static getOfflinePlaybackUrlNative(storageKey: string): string | null {
    try {
      if (this.supportsNativeOfflineVault() && window.MaxPlayNative?.getOfflinePlaybackUrl) {
        return window.MaxPlayNative.getOfflinePlaybackUrl(storageKey) || null;
      }
    } catch {}
    return null;
  }

  /**
   * Deletes an offline item's segment directory from Android internal storage disk.
   */
  public static deleteOfflineItemNative(storageKey: string): boolean {
    try {
      if (this.supportsNativeOfflineVault() && window.MaxPlayNative?.deleteOfflineItem) {
        return Boolean(window.MaxPlayNative.deleteOfflineItem(storageKey));
      }
    } catch {}
    return false;
  }

  /**
   * Fetches any text or HLS .m3u8 manifest via Kotlin OkHttp with zero CORS restrictions and zero UI thread blocking.
   */
  public static async fetchTextCorsFree(
    targetUrl: string,
    headers: Record<string, string> = {}
  ): Promise<string | null> {
    if (!this.isRunningInKotlinApp() || !window.MaxPlayNative) {
      return null;
    }
    try {
      // Priority 1: Stream directly through CorsFreeWebViewClient's /api/proxy (runs 100% on Chromium IO thread, zero evaluateJavascript UI overhead!)
      try {
        const refParam = headers['Referer'] || headers['referer']
          ? `&referer=${encodeURIComponent(headers['Referer'] || headers['referer'])}`
          : '';
        const proxyResp = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}${refParam}`, {
          headers,
        });
        if (proxyResp.ok) {
          const text = await proxyResp.text();
          if (text && text.length > 0) {
            return text;
          }
        }
      } catch {}

      // Priority 2: Fallback to async JavascriptInterface callback
      let rawJson: string | null = null;
      if (typeof window.MaxPlayNative.fetchUrlCorsFreeAsync === 'function') {
        rawJson = await new Promise<string | null>((resolve) => {
          const cbId = 'fetch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
          const timer = setTimeout(() => {
            if (window.__maxplaySnifferCallbacks?.[cbId]) {
              delete window.__maxplaySnifferCallbacks[cbId];
            }
            resolve(null);
          }, 8000);

          window.__maxplaySnifferCallbacks![cbId] = (resultJson: string) => {
            clearTimeout(timer);
            resolve(resultJson);
          };

          window.MaxPlayNative!.fetchUrlCorsFreeAsync!(
            targetUrl,
            JSON.stringify(headers),
            cbId
          );
        });
      }

      if (!rawJson) return null;
      const parsed = JSON.parse(rawJson);
      if (parsed && parsed.ok && typeof parsed.body === 'string') {
        return parsed.body;
      }
      return null;
    } catch (err) {
      console.warn('[NativeBridge] fetchTextCorsFree error:', err);
      return null;
    }
  }

  /**
   * Fetches binary video segment (.ts / .m4s) asynchronously via CorsFreeWebViewClient's native OkHttp stream
   * (100% off the UI thread, zero synchronous Base64 / atob freeze!).
   */
  public static async fetchBytesCorsFree(
    targetUrl: string,
    headers: Record<string, string> = {}
  ): Promise<Uint8Array | null> {
    if (!this.isRunningInKotlinApp()) {
      return null;
    }
    try {
      const refParam = headers['Referer'] || headers['referer']
        ? `&referer=${encodeURIComponent(headers['Referer'] || headers['referer'])}`
        : '';
      const resp = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}${refParam}`, {
        headers,
      });
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        if (buf.byteLength > 0) {
          return new Uint8Array(buf);
        }
      }
      return null;
    } catch (err) {
      console.warn('[NativeBridge] fetchBytesCorsFree error:', err);
      return null;
    }
  }

  private static inFlightNativeExtractions = new Map<string, Promise<NativeScrapeResult | null>>();

  /**
   * Runs the inbuilt Kotlin stream scraper (OkHttp + Deterministic Packer Unpacker + Headless WebView Sniffer fallback)
   * completely asynchronously so the UI never freezes.
   */
  public static async extractStreamNative(
    sourceUrl: string,
    requestedDurationSec: number = 0
  ): Promise<NativeScrapeResult | null> {
    if (!this.isRunningInKotlinApp() || !window.MaxPlayNative) {
      return null;
    }

    const cleanKey = (sourceUrl || '').trim();
    if (!cleanKey) return null;

    const existingPromise = this.inFlightNativeExtractions.get(cleanKey);
    if (existingPromise) {
      return existingPromise;
    }

    const taskPromise = (async (): Promise<NativeScrapeResult | null> => {
      try {
        // Step 1: Non-blocking Native OkHttp + Deterministic Packer Unpacker Scrape
        let scrapeData: any = null;
        if (typeof window.MaxPlayNative?.extractStreamNativeAsync === 'function') {
          scrapeData = await new Promise<any>((resolve) => {
            const cbId = 's1_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            const timer = setTimeout(() => {
              if (window.__maxplaySnifferCallbacks?.[cbId]) {
                delete window.__maxplaySnifferCallbacks[cbId];
              }
              resolve(null);
            }, 22000);

            window.__maxplaySnifferCallbacks![cbId] = (resultJson: string) => {
              clearTimeout(timer);
              try {
                resolve(JSON.parse(resultJson));
              } catch {
                resolve(null);
              }
            };

            window.MaxPlayNative!.extractStreamNativeAsync!(sourceUrl, '{}', cbId);
          });
        } else if (window.MaxPlayNative?.extractStreamNative) {
          const rawJson = window.MaxPlayNative.extractStreamNative(sourceUrl, '{}');
          if (rawJson) {
            scrapeData = JSON.parse(rawJson);
          }
        }

        // Step 2: If Stage 1 needs Headless WebView Sniffer for dynamic JS execution
        if ((!scrapeData || !scrapeData.ok || !scrapeData.m3u8Url) && window.MaxPlayNative?.sniffStreamAsync) {
          scrapeData = await new Promise<any>((resolve) => {
            const cbId = 'sniff_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            const timer = setTimeout(() => {
              if (window.__maxplaySnifferCallbacks?.[cbId]) {
                delete window.__maxplaySnifferCallbacks[cbId];
              }
              resolve(null);
            }, 16500);

            window.__maxplaySnifferCallbacks![cbId] = (resultJson: string) => {
              clearTimeout(timer);
              try {
                resolve(JSON.parse(resultJson));
              } catch {
                resolve(null);
              }
            };

            window.MaxPlayNative!.sniffStreamAsync!(sourceUrl, cbId, 16000);
          });
        }

        if (!scrapeData || !scrapeData.ok || !scrapeData.m3u8Url) {
          return null;
        }

        const masterUrl: string = scrapeData.m3u8Url;
        const customHeaders: Record<string, string> = scrapeData.headers || {};

        // Step 3: Parse Master HLS Playlist directly via Native CORS-free stream
        const meta = await this.parseHlsManifestOnDevice(
          masterUrl,
          customHeaders,
          requestedDurationSec,
          scrapeData.byseMeta
        );

        return {
          ok: true,
          m3u8Url: masterUrl,
          qualities: meta.qualities,
          qualityLinks: meta.qualityLinks,
          downloadQualities: meta.downloadQualities,
          audioTracks: meta.audioTracks,
          duration: meta.duration,
          headers: customHeaders,
          method: scrapeData.method || 'kotlin_okhttp',
        };
      } catch (err) {
        console.warn('[NativeBridge] extractStreamNative error:', err);
        return null;
      } finally {
        this.inFlightNativeExtractions.delete(cleanKey);
      }
    })();

    this.inFlightNativeExtractions.set(cleanKey, taskPromise);
    return taskPromise;
  }

  /**
   * Parses HLS Master Playlist on the user's device without CORS limits and without fetching heavy sub-playlists.
   */
  public static async parseHlsManifestOnDevice(
    m3u8Url: string,
    headers: Record<string, string> = {},
    durationSec: number = 0,
    byseMeta?: any
  ): Promise<{
    qualities: string[];
    qualityLinks: Record<string, string>;
    downloadQualities: {
      id: string;
      label: string;
      sizeMb: number;
      url: string;
      bandwidth: number;
    }[];
    audioTracks: string[];
    duration: number;
  }> {
    const metaHeight = Number(byseMeta?.height || 0);
    const metaBitrateKbps = Number(byseMeta?.bitrateKbps || 0);
    const metaAudios: string[] = Array.isArray(byseMeta?.audioTracks) && byseMeta.audioTracks.length > 0
      ? byseMeta.audioTracks
      : ['Hindi', 'English'];
    const primaryQ =
      metaHeight >= 1000 ? '1080p' : metaHeight >= 700 ? '720p' : metaHeight >= 450 ? '480p' : '1080p';
    const primaryBw = metaBitrateKbps > 0 ? metaBitrateKbps * 1000 : 2200000;
    const effDur = durationSec || 1440;
    const primaryMb = Math.max(20, Math.round((primaryBw * effDur) / (8 * 1024 * 1024)));

    const fallbackQualities = metaHeight > 0 ? [primaryQ] : ['1080p', '720p'];
    const fallbackDownloadQualities =
      metaHeight > 0
        ? [
            {
              id: primaryQ,
              label: `${primaryQ} ${primaryQ === '1080p' ? 'Full HD' : primaryQ === '720p' ? 'HD' : 'Standard'}`,
              sizeMb: primaryMb,
              url: m3u8Url,
              bandwidth: primaryBw,
            },
          ]
        : [
            { id: '1080p', label: '1080p Full HD', sizeMb: 450, url: m3u8Url, bandwidth: 2200000 },
            { id: '720p', label: '720p HD', sizeMb: 240, url: m3u8Url, bandwidth: 1100000 },
          ];
    const fallbackAudios = metaAudios;

    try {
      const text = await this.fetchTextCorsFree(m3u8Url, headers);
      if (!text) {
        return {
          qualities: fallbackQualities,
          qualityLinks: metaHeight > 0 ? { [primaryQ]: m3u8Url } : { '1080p': m3u8Url, '720p': m3u8Url },
          downloadQualities: fallbackDownloadQualities,
          audioTracks: fallbackAudios,
          duration: effDur,
        };
      }

      const qualities: string[] = [];
      const qualityLinks: Record<string, string> = {};
      const downloadQualities: {
        id: string;
        label: string;
        sizeMb: number;
        url: string;
        bandwidth: number;
      }[] = [];
      const audioTracks: string[] = [];
      const bandwidthsByQuality: Record<string, number> = {};

      // Extract Audio Tracks
      const audioLines = text.split('\n').filter((l) => l.includes('#EXT-X-MEDIA:TYPE=AUDIO'));
      for (const line of audioLines) {
        const nameMatch = line.match(/NAME="([^"]+)"/i) || line.match(/NAME=([^\s,]+)/i);
        const langMatch = line.match(/LANGUAGE="([^"]+)"/i) || line.match(/LANGUAGE=([^\s,]+)/i);
        const rawName = (nameMatch ? nameMatch[1] : '').trim();
        const rawLang = (langMatch ? langMatch[1] : '').trim();
        let friendly = rawName || rawLang || '';
        const code = `${rawLang} ${rawName}`.toLowerCase();
        if (code.includes('hin') || /\bhi\b/.test(code)) friendly = 'Hindi';
        else if (code.includes('eng') || /\ben\b/.test(code)) friendly = 'English';
        else if (code.includes('jpn') || code.includes('jap') || /\bja\b/.test(code)) friendly = 'Japanese';
        else if (code.includes('tam') || /\bta\b/.test(code)) friendly = 'Tamil';
        else if (code.includes('tel') || /\bte\b/.test(code)) friendly = 'Telugu';
        else if (code.includes('mal') || /\bml\b/.test(code)) friendly = 'Malayalam';
        else if (code.includes('kan') || /\bkn\b/.test(code)) friendly = 'Kannada';
        else if (code.includes('kor') || /\bko\b/.test(code)) friendly = 'Korean';
        else if (code.includes('spa') || /\bes\b/.test(code)) friendly = 'Spanish';
        else if (code.includes('fre') || code.includes('fra') || /\bfr\b/.test(code)) friendly = 'French';
        else if (code.includes('rus') || /\bru\b/.test(code)) friendly = 'Russian';
        else if (code.includes('ind') || /\bid\b/.test(code)) friendly = 'Indonesian';

        if (friendly && !audioTracks.includes(friendly)) {
          audioTracks.push(friendly);
        }
      }

      // Extract Variant Streams
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
          const resMatch = line.match(/RESOLUTION=\d+x(\d+)/i);
          const height = resMatch ? parseInt(resMatch[1], 10) : 0;
          const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
          const avgBwMatch = line.match(/AVERAGE-BANDWIDTH=(\d+)/i);
          const detectedBw = avgBwMatch
            ? parseInt(avgBwMatch[1], 10)
            : bwMatch
            ? parseInt(bwMatch[1], 10)
            : 0;

          let nextUrl = '';
          for (let j = i + 1; j < lines.length; j++) {
            const nextL = lines[j].trim();
            if (nextL && !nextL.startsWith('#')) {
              nextUrl = nextL;
              break;
            }
          }

          if (nextUrl) {
            let resolvedUrl = nextUrl;
            try {
              resolvedUrl = new URL(nextUrl, m3u8Url).toString();
            } catch {}

            const qLabel =
              height >= 1000
                ? '1080p'
                : height >= 700
                ? '720p'
                : height >= 450
                ? '480p'
                : height > 0
                ? `${height}p`
                : detectedBw >= 2000000
                ? '1080p'
                : detectedBw >= 900000
                ? '720p'
                : '480p';

            if (detectedBw > 0) {
              bandwidthsByQuality[qLabel] = detectedBw;
            }
            if (!qualities.includes(qLabel)) {
              qualities.push(qLabel);
              qualityLinks[qLabel] = resolvedUrl;
            }
          }
        }
      }

      // Accurate duration calculation: if Master playlist has no #EXTINF, probe the first variant media playlist
      let detectedDuration = durationSec > 0 && durationSec !== 1440 ? durationSec : 0;
      let variantSegmentCount = 0;

      if (text.includes('#EXTINF:')) {
        let segSum = 0;
        const extinfRegex = /#EXTINF:(\d+(?:\.\d+)?)/g;
        let eMatch: RegExpExecArray | null;
        while ((eMatch = extinfRegex.exec(text)) !== null) {
          segSum += parseFloat(eMatch[1]);
          variantSegmentCount++;
        }
        if (segSum > 5) {
          detectedDuration = Math.round(segSum);
        }
      } else if (qualities.length > 0) {
        const firstVariantUrl = qualityLinks[qualities[0]];
        if (firstVariantUrl && firstVariantUrl !== m3u8Url) {
          try {
            const subText = await this.fetchTextCorsFree(firstVariantUrl, headers);
            if (subText && subText.includes('#EXTINF:')) {
              let segSum = 0;
              const extinfRegex = /#EXTINF:(\d+(?:\.\d+)?)/g;
              let eMatch: RegExpExecArray | null;
              while ((eMatch = extinfRegex.exec(subText)) !== null) {
                segSum += parseFloat(eMatch[1]);
                variantSegmentCount++;
              }
              if (segSum > 5) {
                detectedDuration = Math.round(segSum);
              }
            }
          } catch {}
        }
      }

      const finalDuration =
        detectedDuration > 0
          ? detectedDuration > 300
            ? detectedDuration
            : detectedDuration * 60
          : durationSec > 0
          ? durationSec > 300
            ? durationSec
            : durationSec * 60
          : 1440;

      if (qualities.length === 0) {
        qualities.push('1080p', '720p');
        qualityLinks['1080p'] = m3u8Url;
        qualityLinks['720p'] = m3u8Url;
      }

      // Deterministic URL fingerprint for subtle realistic variance when encoder omits BANDWIDTH tag
      let urlHash = 0;
      for (let i = 0; i < m3u8Url.length; i++) {
        urlHash = (urlHash * 31 + m3u8Url.charCodeAt(i)) & 0x7fffffff;
      }
      const bitrateVarianceFactor = 0.94 + ((urlHash % 13) * 0.01); // 0.94 to 1.06

      for (const q of qualities) {
        const url = qualityLinks[q] || m3u8Url;
        const defaultBps = Math.round(
          (q.includes('1080')
            ? 2400000
            : q.includes('720')
            ? 1200000
            : q.includes('480')
            ? 650000
            : 360000) * bitrateVarianceFactor
        );
        const actualBps = bandwidthsByQuality[q] || defaultBps;
        const estBytes = (actualBps * finalDuration) / 8;
        const sizeMb = Math.max(15, Math.round(estBytes / (1024 * 1024)));

        downloadQualities.push({
          id: q,
          label: `${q} ${q.includes('1080') ? 'Full HD' : q.includes('720') ? 'HD' : 'Standard'}`,
          sizeMb,
          url,
          bandwidth: actualBps,
        });
      }

      qualities.sort((a, b) => parseInt(b) - parseInt(a));
      downloadQualities.sort((a, b) => parseInt(b.id) - parseInt(a.id));

      return {
        qualities,
        qualityLinks,
        downloadQualities,
        audioTracks,
        duration: finalDuration,
      };
    } catch {
      return {
        qualities: fallbackQualities,
        qualityLinks: { '1080p': m3u8Url, '720p': m3u8Url },
        downloadQualities: fallbackDownloadQualities,
        audioTracks: [],
        duration: durationSec || 1440,
      };
    }
  }

  /**
   * Clears the persistent Native Android 250MB image poster disk cache (`poster_cache`).
   */
  public static clearNativeImageDiskCache(): boolean {
    if (!this.isRunningInKotlinApp()) return false;
    try {
      return window.MaxPlayNative?.clearImageDiskCache?.() ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Returns current bytes used by the Native Android persistent image disk cache.
   */
  public static getNativeImageDiskCacheBytes(): number {
    if (!this.isRunningInKotlinApp()) return 0;
    try {
      return window.MaxPlayNative?.getImageDiskCacheBytes?.() ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Triggers a real phone status-bar notification on Android APK (with Web Notification fallback),
   * including an optional rich attached banner/poster image.
   */
  public static showNativeNotification(title: string, body: string, imageUrl?: string): boolean {
    try {
      if (this.isRunningInKotlinApp() && typeof window.MaxPlayNative?.showNativeNotification === 'function') {
        return Boolean(window.MaxPlayNative.showNativeNotification(title, body, imageUrl || ''));
      }
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const notifOpts: any = {
          body,
          icon: imageUrl || '/favicon.png',
        };
        if (imageUrl) {
          notifOpts.image = imageUrl;
        }
        if (Notification.permission === 'granted') {
          new Notification(title, notifOpts);
          return true;
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') {
              new Notification(title, notifOpts);
            }
          });
        }
      }
    } catch {}
    return false;
  }

  /**
   * Starts Native Android Speech Recognizer dialog and invokes `onResult` with the recognized text.
   */
  public static startNativeVoiceRecognition(onResult?: (text: string) => void): boolean {
    try {
      if (this.isRunningInKotlinApp() && typeof window.MaxPlayNative?.startVoiceRecognition === 'function') {
        if (typeof onResult === 'function') {
          window.__onMaxPlayVoiceResult = (spokenText: string) => {
            onResult(spokenText || '');
          };
        }
        return Boolean(window.MaxPlayNative.startVoiceRecognition());
      }
    } catch {}
    return false;
  }

  /**
   * Packages an offline vault item directly on Android disk into a `.maxplay` file and launches Android's Native Share Sheet.
   */
  public static exportAndShareMaxPlayNative(
    storageKey: string,
    fileName: string,
    metadata: Record<string, any>
  ): { ok: boolean; shared?: boolean; path?: string; error?: string } | null {
    try {
      if (
        this.isRunningInKotlinApp() &&
        typeof window.MaxPlayNative?.exportAndShareMaxPlayFile === 'function'
      ) {
        const raw = window.MaxPlayNative.exportAndShareMaxPlayFile(
          storageKey,
          fileName,
          JSON.stringify(metadata)
        );
        if (raw) {
          return JSON.parse(raw);
        }
      }
    } catch {}
    return null;
  }

  /**
   * Sets the real Android phone top Status Bar color (where time, network, and battery indicators sit)
   * and updates the browser `<meta name="theme-color">` tag so top ambient glow extends into the status bar.
   */
  public static setNativeStatusBarColor(hexColor: string): boolean {
    try {
      const cleanHex = hexColor && hexColor.startsWith('#') ? hexColor : '#0A0A0A';
      if (typeof document !== 'undefined') {
        let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'theme-color';
          document.head.appendChild(meta);
        }
        if (meta.content !== cleanHex) {
          meta.content = cleanHex;
        }
      }
      if (this.isRunningInKotlinApp() && typeof window.MaxPlayNative?.setStatusBarColor === 'function') {
        return Boolean(window.MaxPlayNative.setStatusBarColor(cleanHex));
      }
    } catch {}
    return false;
  }

  /**
   * Enables or disables automatic Android Picture-in-Picture (PiP) when minimizing the app during video playback.
   */
  public static setAutoPipEnabled(enabled: boolean): boolean {
    try {
      if (this.isRunningInKotlinApp() && typeof window.MaxPlayNative?.setAutoPipEnabled === 'function') {
        return Boolean(window.MaxPlayNative.setAutoPipEnabled(enabled));
      }
    } catch {}
    return false;
  }

  /**
   * Notifies the Native Kotlin Activity whether a video is currently playing so `onUserLeaveHint`
   * only triggers native PiP when a video is actively playing.
   */
  public static setVideoPlayingState(isPlaying: boolean): boolean {
    try {
      if (this.isRunningInKotlinApp() && typeof window.MaxPlayNative?.setVideoPlayingState === 'function') {
        return Boolean(window.MaxPlayNative.setVideoPlayingState(isPlaying));
      }
    } catch {}
    return false;
  }

  /**
   * Scans the user's phone storage for all local video files via Android MediaStore.Video.Media.
   */
  public static scanDeviceLocalVideos(requestPermissionIfEmpty = false): DeviceLocalVideoItem[] {
    try {
      if (this.isRunningInKotlinApp() && typeof window.MaxPlayNative?.scanDeviceLocalVideos === 'function') {
        const raw = window.MaxPlayNative.scanDeviceLocalVideos();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.videos)) {
            if (
              parsed.videos.length === 0 &&
              requestPermissionIfEmpty &&
              typeof window.MaxPlayNative?.requestVideoStoragePermission === 'function'
            ) {
              window.MaxPlayNative.requestVideoStoragePermission();
            }
            return parsed.videos;
          }
        }
      }
    } catch {}
    return [];
  }

  /**
   * Requests Android READ_MEDIA_VIDEO / READ_EXTERNAL_STORAGE runtime permission.
   */
  public static requestVideoStoragePermission(): boolean {
    try {
      if (
        this.isRunningInKotlinApp() &&
        typeof window.MaxPlayNative?.requestVideoStoragePermission === 'function'
      ) {
        return Boolean(window.MaxPlayNative.requestVideoStoragePermission());
      }
    } catch {}
    return false;
  }

  /**
   * Starts a direct App-to-App HTTP Transfer Server on the sender phone (port 48821) for a specific storageKey.
   */
  public static startDirectTransferServerNative(
    storageKey: string,
    transferCode: string,
    metadata: Record<string, any>
  ): {
    ok: boolean;
    ip?: string;
    port?: number;
    totalSegments?: number;
    totalAudioSegments?: number;
    totalBytes?: number;
    error?: string;
  } | null {
    try {
      if (
        this.isRunningInKotlinApp() &&
        typeof window.MaxPlayNative?.startDirectTransferServer === 'function'
      ) {
        const raw = window.MaxPlayNative.startDirectTransferServer(
          storageKey,
          transferCode,
          JSON.stringify(metadata)
        );
        if (raw) {
          return JSON.parse(raw);
        }
      }
    } catch {}
    return null;
  }

  /**
   * Stops the active direct App-to-App HTTP Transfer Server on the sender phone.
   */
  public static stopDirectTransferServerNative(): void {
    try {
      if (
        this.isRunningInKotlinApp() &&
        typeof window.MaxPlayNative?.stopDirectTransferServer === 'function'
      ) {
        window.MaxPlayNative.stopDirectTransferServer();
      }
    } catch {}
  }

  /**
   * Connects directly from the Receiver MaxPlay app to the Sender MaxPlay app over LAN HTTP
   * and streams all offline segments directly into the Receiver's native disk vault.
   */
  public static receiveDirectTransferFromPeerNative(
    senderIp: string,
    senderPort: number,
    transferCode: string,
    targetStorageKey: string,
    onProgress?: (pct: number, msg: string) => void
  ): Promise<{ ok: boolean; totalBytes?: number; error?: string }> {
    return new Promise((resolve) => {
      if (
        !this.isRunningInKotlinApp() ||
        typeof window.MaxPlayNative?.receiveDirectTransferFromPeer !== 'function'
      ) {
        resolve({ ok: false, error: 'Native P2P transfer not available' });
        return;
      }

      const callbackId = `p2p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      window.__onMaxPlayTransferProgress = (cbId: string, pct: number, msg: string) => {
        if (cbId === callbackId && onProgress) {
          onProgress(pct, msg);
        }
      };

      window.__maxplaySegmentCallbacks = window.__maxplaySegmentCallbacks || {};
      window.__maxplaySegmentCallbacks[callbackId] = (res: any) => {
        if (res && res.ok) {
          resolve({ ok: true, totalBytes: Number(res.totalBytes || 0) });
        } else {
          resolve({ ok: false, error: res?.error || 'Direct P2P stream failed' });
        }
      };

      try {
        window.MaxPlayNative.receiveDirectTransferFromPeer(
          senderIp,
          senderPort,
          transferCode,
          targetStorageKey,
          callbackId
        );
      } catch (e: any) {
        delete window.__maxplaySegmentCallbacks[callbackId];
        resolve({ ok: false, error: e?.message || 'Bridge exception' });
      }
    });
  }

  /**
   * Triggers the Admin's hidden APK download link behind the Update button.
   * - Inside the Android Kotlin APK: Streams the `.apk` natively with live 0% -> 100% progress
   *   and launches the Android System Package Installer (`application/vnd.android.package-archive`) automatically.
   * - Inside Web/Preview: Simulates/streams progress and triggers direct file download seamlessly.
   */
  public static triggerApkUpdate(
    apkUrl: string,
    versionLabel: string,
    title: string = 'MaxPlay Official Update',
    onProgress?: (state: ApkUpdateProgressState) => void
  ): void {
    const cleanUrl = (apkUrl || '').trim();
    if (!cleanUrl) {
      onProgress?.({
        status: 'error',
        progress: 0,
        downloadedMb: 0,
        totalMb: 0,
        version: versionLabel,
        message: 'Admin has not attached an APK download link yet.',
      });
      return;
    }

    // 1. Native Android APK Self-Updater Path
    if (
      this.isRunningInKotlinApp() &&
      typeof window.MaxPlayNative?.downloadAndInstallApk === 'function'
    ) {
      window.__onMaxPlayApkUpdateProgress = (payload: ApkUpdateProgressState) => {
        onProgress?.(payload);
      };
      onProgress?.({
        status: 'downloading',
        progress: 2,
        downloadedMb: 0,
        totalMb: 42.5,
        version: versionLabel,
        message: `Starting native Android APK update (${versionLabel})...`,
      });
      try {
        window.MaxPlayNative.downloadAndInstallApk(cleanUrl, versionLabel, title);
        return;
      } catch {}
    }

    // 2. Comfortable Web / Browser Fallback with smooth progress feedback & hidden anchor download
    let pct = 8;
    const totalMb = 42.4;
    onProgress?.({
      status: 'downloading',
      progress: pct,
      downloadedMb: 3.4,
      totalMb,
      version: versionLabel,
      message: `Preparing MaxPlay_${versionLabel}.apk download...`,
    });

    const interval = setInterval(() => {
      pct = Math.min(95, pct + 18);
      const dlMb = Math.round(((pct / 100) * totalMb) * 10) / 10;
      onProgress?.({
        status: 'downloading',
        progress: pct,
        downloadedMb: dlMb,
        totalMb,
        version: versionLabel,
        message: `Downloading MaxPlay ${versionLabel} APK (${pct}%)...`,
      });
    }, 220);

    setTimeout(() => {
      clearInterval(interval);
      onProgress?.({
        status: 'installing',
        progress: 100,
        downloadedMb: totalMb,
        totalMb,
        version: versionLabel,
        message: `APK Ready! Starting MaxPlay ${versionLabel} installer download...`,
      });
      try {
        const a = document.createElement('a');
        a.href = cleanUrl;
        a.download = `MaxPlay_${versionLabel.replace(/[^a-zA-Z0-9._-]/g, '_')}.apk`;
        a.rel = 'noopener noreferrer';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try {
            document.body.removeChild(a);
          } catch {}
        }, 1500);
      } catch {
        window.location.href = cleanUrl;
      }
    }, 1150);
  }

  /**
   * Opens a protocol-safe Native Android WebView Dialog for Popunder Ads.
   * Handles http://, https://, intent://, market://, and custom schemes without X-Frame-Options or protocol errors,
   * and closes cleanly on hardware Back button press.
   */
  public static openNativePopunderAd(adUrl: string): boolean {
    try {
      if (
        this.isRunningInKotlinApp() &&
        typeof window.MaxPlayNative?.openPopunderAd === 'function'
      ) {
        return Boolean(window.MaxPlayNative.openPopunderAd(adUrl));
      }
    } catch {}
    return false;
  }

  /**
   * Closes the Native Android Popunder Ad Dialog if open.
   */
  public static closeNativePopunderAd(): boolean {
    try {
      if (
        this.isRunningInKotlinApp() &&
        typeof window.MaxPlayNative?.closePopunderAd === 'function'
      ) {
        return Boolean(window.MaxPlayNative.closePopunderAd());
      }
    } catch {}
    return false;
  }

  /**
   * Returns true if the Native Android Popunder Ad Dialog is currently showing.
   */
  public static isNativePopunderAdOpen(): boolean {
    try {
      if (
        this.isRunningInKotlinApp() &&
        typeof window.MaxPlayNative?.isPopunderAdOpen === 'function'
      ) {
        return Boolean(window.MaxPlayNative.isPopunderAdOpen());
      }
    } catch {}
    return false;
  }
}
