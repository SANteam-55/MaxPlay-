/**
 * MaxPlay Smart Stream Service
 * 
 * Handles client-side resolution and caching for dynamically extracted HLS streams.
 * Prevents token expiration (3-hour expiry limit) by managing automated extraction
 * and local caching without exposing secret master credentials in the browser.
 */

import { NativeBridgeService } from "./nativeBridgeService";

interface ClientCachedStream {
  m3u8Url: string;
  expiresAt: number;
  cachedAt: number;
}

const CACHE_PREFIX = "maxplay_hls_stream_";

export class SmartStreamService {
  /**
   * Detects if a URL is an extractable source (e.g. VOE or external streaming host)
   * vs a direct mp4/m3u8 link.
   */
  public static isExtractableSource(url?: string, isSmartHls?: boolean): boolean {
    if (!url || typeof url !== "string") return false;
    const lower = url.toLowerCase().trim();

    // Already a direct HLS master/media stream, MP4, blob, or MaxPlay backend proxy
    if (
      lower.includes("/proxy/m3u8") ||
      lower.includes(".m3u8") ||
      lower.includes(".mp4") ||
      lower.startsWith("blob:")
    ) {
      return false;
    }

    // Recognised video hosters that require extraction (Voe, Filemoon, StreamWish, VidHide, etc.)
    if (
      lower.includes("voe.sx") ||
      lower.includes("voe.") ||
      lower.includes("voe-network") ||
      lower.includes("cloudwindow-route") ||
      lower.includes("reputationsickler") ||
      lower.includes("turtledoveconsequent") ||
      lower.includes("launchreliantcleaverriver") ||
      lower.includes("fraudclatterflyingcar") ||
      lower.includes("321naturelikefur") ||
      lower.includes("ralphysuccessfull") ||
      lower.includes("node=h0ke") ||
      lower.includes("filemoon.") ||
      lower.includes("moonmov.") ||
      lower.includes("kerapoxy.") ||
      lower.includes("bysedikamoum.") ||
      lower.includes("f16px.") ||
      lower.includes("streamwish.") ||
      lower.includes("hlswish.") ||
      lower.includes("playerwish.") ||
      lower.includes("vidhide.") ||
      lower.includes("dood.") ||
      lower.includes("streamtape.") ||
      /https?:\/\/[^\/]+\/(?:e|d)\/[a-z0-9_-]{6,}/i.test(lower)
    ) {
      return true;
    }

    if (isSmartHls && !lower.includes(".m3u8") && !lower.includes(".mp4")) {
      return true;
    }

    return false;
  }

  /**
   * Helper to retrieve iframe embed URL for external hosters like VOE / Filemoon.
   */
  public static getEmbedUrl(sourceUrl?: string): string | null {
    if (!sourceUrl || typeof sourceUrl !== "string") return null;
    const trimmed = sourceUrl.trim();
    const lower = trimmed.toLowerCase();

    if (
      lower.includes("filemoon.") ||
      lower.includes("moonmov.") ||
      lower.includes("kerapoxy.") ||
      lower.includes("bysedikamoum.") ||
      lower.includes("f16px.")
    ) {
      return trimmed.replace(/\/d\//i, "/e/");
    }

    if (
      lower.includes("voe.sx") ||
      lower.includes("voe.") ||
      lower.includes("voe-network") ||
      lower.includes("cloudwindow-route") ||
      lower.includes("reputationsickler") ||
      lower.includes("turtledoveconsequent") ||
      lower.includes("launchreliantcleaverriver") ||
      lower.includes("fraudclatterflyingcar") ||
      lower.includes("321naturelikefur") ||
      lower.includes("ralphysuccessfull")
    ) {
      if (trimmed.includes("/e/")) return trimmed;
      const match = trimmed.match(/https?:\/\/[^\/]+\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const host = trimmed.split("/")[2];
        return `https://${host}/e/${match[1]}`;
      }
      return trimmed;
    }

    if (lower.includes("youtube.com/watch?v=")) {
      const v = new URL(trimmed).searchParams.get("v");
      return `https://www.youtube.com/embed/${v}?autoplay=1&rel=0`;
    }
    if (lower.includes("youtu.be/")) {
      const v = trimmed.split("youtu.be/")[1].split("?")[0];
      return `https://www.youtube.com/embed/${v}?autoplay=1&rel=0`;
    }
    if (lower.includes("drive.google.com/file/d/")) {
      return trimmed.replace("/view", "/preview");
    }
    if (lower.includes("vimeo.com/")) {
      const v = trimmed.split("vimeo.com/")[1].split("?")[0];
      if (!isNaN(Number(v))) {
        return `https://player.vimeo.com/video/${v}?autoplay=1`;
      }
    }
    if (lower.includes("dailymotion.com/video/")) {
      const v = trimmed.split("video/")[1].split("?")[0];
      return `https://www.dailymotion.com/embed/video/${v}?autoplay=1`;
    }
    if (lower.includes("/embed/") || lower.includes("/iframe/")) {
      return trimmed;
    }

    return null;
  }

  /**
   * Retrieves client-side cached stream URL if still valid.
   */
  private static getClientCache(sourceUrl: string): ClientCachedStream | null {
    try {
      const key = CACHE_PREFIX + btoa(encodeURIComponent(sourceUrl)).slice(0, 48);
      const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (!raw) return null;

      const data: ClientCachedStream = JSON.parse(raw);
      const now = Date.now();

      // In Kotlin native app, never reuse old server-proxied (/proxy/m3u8) URLs; always use direct .m3u8
      if (
        NativeBridgeService.isRunningInKotlinApp() &&
        data?.m3u8Url &&
        data.m3u8Url.includes("/proxy/m3u8")
      ) {
        this.clearClientCache(sourceUrl);
        return null;
      }

      // Ensure at least 5 minutes buffer before expiry
      if (data && data.m3u8Url && data.expiresAt > now + 5 * 60 * 1000) {
        return data;
      }
      // Stale or expired
      this.clearClientCache(sourceUrl);
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Stores stream URL in client session storage.
   */
  private static setClientCache(sourceUrl: string, m3u8Url: string, expiresAt: number): void {
    try {
      const key = CACHE_PREFIX + btoa(encodeURIComponent(sourceUrl)).slice(0, 48);
      const data: ClientCachedStream = {
        m3u8Url,
        expiresAt,
        cachedAt: Date.now()
      };
      sessionStorage.setItem(key, JSON.stringify(data));
      // Also cache in localStorage for fast resumes across tabs
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("[SmartStreamService] Failed to write cache:", e);
    }
  }

  /**
   * Public synchronous lookup for already-resolved cached stream URL (0ms for Download Modal).
   */
  public static getCachedStreamUrl(sourceUrl: string): string | null {
    if (!sourceUrl || !sourceUrl.trim()) return null;
    const cached = this.getClientCache(sourceUrl.trim());
    return cached?.m3u8Url || null;
  }

  /**
   * Invalidate cached token for a source URL (e.g. when playback error happens).
   */
  public static clearClientCache(sourceUrl: string): void {
    try {
      const key = CACHE_PREFIX + btoa(encodeURIComponent(sourceUrl)).slice(0, 48);
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  private static inFlightMap = new Map<string, Promise<{
    streamUrl: string;
    isExtracted: boolean;
    cached: boolean;
    isEmbed?: boolean;
    expiresAt?: number;
  }>>();

  /**
   * Resolves a video source URL into a playable Master m3u8 URL.
   * If the URL is already an m3u8 or mp4, it returns it directly.
   * If it is an extractable source (e.g. VOE / Filemoon), it uses the on-device scraper or backend proxy.
   */
  public static async resolveStream(
    sourceUrl: string,
    options: { forceRefresh?: boolean } = {}
  ): Promise<{
    streamUrl: string;
    isExtracted: boolean;
    cached: boolean;
    isEmbed?: boolean;
    expiresAt?: number;
  }> {
    if (!sourceUrl || !sourceUrl.trim()) {
      throw new Error("Missing video source URL");
    }

    const trimmed = sourceUrl.trim();

    // Check if it's already a direct HLS master or MP4
    if (!this.isExtractableSource(trimmed)) {
      return {
        streamUrl: trimmed,
        isExtracted: false,
        cached: false,
        isEmbed: false
      };
    }

    // 1. Check client-side cache first
    if (!options.forceRefresh) {
      const cached = this.getClientCache(trimmed);
      if (cached) {
        return {
          streamUrl: cached.m3u8Url,
          isExtracted: true,
          cached: true,
          isEmbed: false,
          expiresAt: cached.expiresAt
        };
      }

      const existingInFlight = this.inFlightMap.get(trimmed);
      if (existingInFlight) {
        return existingInFlight;
      }
    }

    const taskPromise = this.resolveStreamInternal(trimmed, options);
    this.inFlightMap.set(trimmed, taskPromise);
    try {
      return await taskPromise;
    } finally {
      this.inFlightMap.delete(trimmed);
    }
  }

  private static async resolveStreamInternal(
    trimmed: string,
    options: { forceRefresh?: boolean } = {}
  ): Promise<{
    streamUrl: string;
    isExtracted: boolean;
    cached: boolean;
    isEmbed?: boolean;
    expiresAt?: number;
  }> {
    // 1.5 Priority Tier (Android APK): Inbuilt Native Kotlin Scraper & Headless Sniffer (Zero CORS)
    if (NativeBridgeService.isRunningInKotlinApp()) {
      try {
        const nativeRes = await NativeBridgeService.extractStreamNative(trimmed);
        if (nativeRes && nativeRes.ok && nativeRes.m3u8Url) {
          const ttlMs = 170 * 60 * 1000;
          const expiresAt = Date.now() + ttlMs;
          this.setClientCache(trimmed, nativeRes.m3u8Url, expiresAt);
          return {
            streamUrl: nativeRes.m3u8Url,
            isExtracted: true,
            cached: false,
            isEmbed: false,
            expiresAt
          };
        }
      } catch (nativeErr) {
        console.warn("[SmartStreamService] Native Kotlin scraper fallback to server:", nativeErr);
      }
    }

    // 2. Call backend proxy endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute extraction window

      const response = await fetch("/api/extract-stream", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: trimmed,
          forceRefresh: options.forceRefresh === true
        })
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        if (result.ok && result.m3u8Url) {
          if (result.expiresAt) {
            this.setClientCache(trimmed, result.m3u8Url, result.expiresAt);
          }
          return {
            streamUrl: result.m3u8Url,
            isExtracted: true,
            cached: Boolean(result.cached),
            isEmbed: false,
            expiresAt: result.expiresAt
          };
        }

        // If backend returned embed fallback
        if (result.isEmbed && result.fallbackUrl) {
          console.log("[SmartStreamService] Backend provided embed fallback:", result.fallbackUrl);
          return {
            streamUrl: result.fallbackUrl,
            isExtracted: false,
            cached: false,
            isEmbed: true
          };
        }
      }
    } catch (proxyErr) {
      console.warn("[SmartStreamService] Backend proxy call failed or timed out, trying direct extractor:", proxyErr);
    }

    // 3. Fallback Tier 1: Direct client-side call to Hugging Face extractor (CORS enabled)
    try {
      const clientCtrl = new AbortController();
      const clientTimer = setTimeout(() => clientCtrl.abort(), 60000); // 1 minute fallback window
      const directApiUrl = `https://nawazkhan001-mw-hub-master.hf.space/api/extract?url=${encodeURIComponent(trimmed)}&key=MaxPlayMasterPass777!`;
      const directRes = await fetch(directApiUrl, {
        signal: clientCtrl.signal,
        headers: { "Accept": "application/json" }
      });
      clearTimeout(clientTimer);

      if (directRes.ok) {
        const directData = await directRes.json();
        const directM3u8 = directData?.m3u8Url || directData?.url || directData?.streamUrl;
        if (directM3u8) {
          const ttlMs = 170 * 60 * 1000;
          const expiresAt = Date.now() + ttlMs;
          this.setClientCache(trimmed, directM3u8, expiresAt);
          return {
            streamUrl: directM3u8,
            isExtracted: true,
            cached: false,
            isEmbed: false,
            expiresAt
          };
        }
      }
    } catch (directErr) {
      console.warn("[SmartStreamService] Direct client extraction also failed:", directErr);
    }

    // 4. Fallback Tier 2: Check for direct embed iframe URL (e.g. voe.sx/e/ID)
    const embedFallback = SmartStreamService.getEmbedUrl(trimmed);
    if (embedFallback) {
      console.log("[SmartStreamService] Using embed player fallback for source:", embedFallback);
      return {
        streamUrl: embedFallback,
        isExtracted: false,
        cached: false,
        isEmbed: true
      };
    }

    // 5. Fallback Tier 3: Return raw source URL to attempt native playback
    return {
      streamUrl: trimmed,
      isExtracted: false,
      cached: false,
      isEmbed: false
    };
  }
}
