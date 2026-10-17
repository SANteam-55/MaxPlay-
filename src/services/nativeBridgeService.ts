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
}

declare global {
  interface Window {
    MaxPlayNative?: MaxPlayKotlinBridge;
    __maxplaySnifferCallbacks?: Record<string, (resultJson: string) => void>;
    onMaxPlaySnifferResult?: (callbackId: string, resultJson: string) => void;
  }
}

// Initialize global callback receiver for async Headless WebView Sniffer from Kotlin
if (typeof window !== 'undefined') {
  window.__maxplaySnifferCallbacks = window.__maxplaySnifferCallbacks || {};
  window.onMaxPlaySnifferResult = (callbackId: string, resultJson: string) => {
    const cb = window.__maxplaySnifferCallbacks?.[callbackId];
    if (cb) {
      delete window.__maxplaySnifferCallbacks![callbackId];
      cb(resultJson);
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

    try {
      // Step 1: Non-blocking Native OkHttp + Deterministic Packer Unpacker Scrape (1-3s)
      let scrapeData: any = null;
      if (typeof window.MaxPlayNative.extractStreamNativeAsync === 'function') {
        scrapeData = await new Promise<any>((resolve) => {
          const cbId = 's1_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
          const timer = setTimeout(() => {
            if (window.__maxplaySnifferCallbacks?.[cbId]) {
              delete window.__maxplaySnifferCallbacks[cbId];
            }
            resolve(null);
          }, 9000);

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
      } else if (window.MaxPlayNative.extractStreamNative) {
        const rawJson = window.MaxPlayNative.extractStreamNative(sourceUrl, '{}');
        if (rawJson) {
          scrapeData = JSON.parse(rawJson);
        }
      }

      // Step 2: If Stage 1 needs Headless WebView Sniffer for dynamic JS execution (capped at 9s)
      if ((!scrapeData || !scrapeData.ok || !scrapeData.m3u8Url) && window.MaxPlayNative.sniffStreamAsync) {
        scrapeData = await new Promise<any>((resolve) => {
          const cbId = 'sniff_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
          const timer = setTimeout(() => {
            if (window.__maxplaySnifferCallbacks?.[cbId]) {
              delete window.__maxplaySnifferCallbacks[cbId];
            }
            resolve(null);
          }, 9500);

          window.__maxplaySnifferCallbacks![cbId] = (resultJson: string) => {
            clearTimeout(timer);
            try {
              resolve(JSON.parse(resultJson));
            } catch {
              resolve(null);
            }
          };

          window.MaxPlayNative!.sniffStreamAsync!(sourceUrl, cbId, 9000);
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
        requestedDurationSec
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
    }
  }

  /**
   * Parses HLS Master Playlist on the user's device without CORS limits and without fetching heavy sub-playlists.
   */
  public static async parseHlsManifestOnDevice(
    m3u8Url: string,
    headers: Record<string, string> = {},
    durationSec: number = 0
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
    const fallbackQualities = ['1080p', '720p'];
    const fallbackDownloadQualities = [
      { id: '1080p', label: '1080p Full HD', sizeMb: 450, url: m3u8Url, bandwidth: 2200000 },
      { id: '720p', label: '720p HD', sizeMb: 240, url: m3u8Url, bandwidth: 1100000 },
    ];
    const fallbackAudios = ['Hindi', 'English'];

    try {
      const text = await this.fetchTextCorsFree(m3u8Url, headers);
      if (!text) {
        return {
          qualities: fallbackQualities,
          qualityLinks: { '1080p': m3u8Url, '720p': m3u8Url },
          downloadQualities: fallbackDownloadQualities,
          audioTracks: fallbackAudios,
          duration: durationSec || 1440,
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
        let friendly = rawName || rawLang || 'Default Audio';
        const code = (rawLang || rawName).toLowerCase();
        if (code.includes('hin') || code.includes('hi')) friendly = 'Hindi';
        else if (code.includes('eng') || code.includes('en')) friendly = 'English';
        else if (code.includes('jpn') || code.includes('ja') || code.includes('jap')) friendly = 'Japanese';
        else if (code.includes('tam') || code.includes('ta')) friendly = 'Tamil';
        else if (code.includes('tel') || code.includes('te')) friendly = 'Telugu';
        else if (code.includes('kor') || code.includes('ko')) friendly = 'Korean';

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
                : '720p';

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

      // Fast duration calculation without downloading a second 1MB media playlist
      let detectedDuration = durationSec > 0 ? durationSec : 0;
      if (text.includes('#EXTINF:')) {
        let segSum = 0;
        const extinfRegex = /#EXTINF:(\d+(?:\.\d+)?)/g;
        let eMatch: RegExpExecArray | null;
        while ((eMatch = extinfRegex.exec(text)) !== null) {
          segSum += parseFloat(eMatch[1]);
        }
        if (segSum > 5) {
          detectedDuration = Math.round(segSum);
        }
      }

      const finalDuration = detectedDuration > 0 ? detectedDuration : durationSec > 0 ? durationSec : 1440;

      if (qualities.length === 0) {
        qualities.push('1080p');
        qualityLinks['1080p'] = m3u8Url;
      }

      for (const q of qualities) {
        const url = qualityLinks[q] || m3u8Url;
        const defaultBps = q.includes('1080')
          ? 2400000
          : q.includes('720')
          ? 1200000
          : q.includes('480')
          ? 600000
          : 300000;
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
        audioTracks: audioTracks.length > 0 ? audioTracks : fallbackAudios,
        duration: finalDuration,
      };
    } catch {
      return {
        qualities: fallbackQualities,
        qualityLinks: { '1080p': m3u8Url, '720p': m3u8Url },
        downloadQualities: fallbackDownloadQualities,
        audioTracks: fallbackAudios,
        duration: durationSec || 1440,
      };
    }
  }
}
