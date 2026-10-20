/**
 * MaxPlay Smart Stream Service
 * 
 * Handles client-side resolution and caching for dynamically extracted HLS streams.
 * Prevents token expiration (3-hour expiry limit) by managing automated extraction
 * and local caching without exposing secret master credentials in the browser.
 */

import { NativeBridgeService } from "./nativeBridgeService";

export interface CachedStreamMetadata {
  qualities?: string[];
  qualityLinks?: Record<string, string>;
  downloadQualities?: {
    id: string;
    label: string;
    sizeMb: number;
    url?: string;
    bandwidth?: number;
  }[];
  audioTracks?: string[];
  duration?: number;
}

interface ClientCachedStream {
  m3u8Url: string;
  expiresAt: number;
  cachedAt: number;
  meta?: CachedStreamMetadata;
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

    // Recognised video hosters that require extraction (Voe, Filemoon, Byse, StreamWish, VidHide, etc.)
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
      lower.includes("byseraguci.") ||
      lower.includes("byse") ||
      lower.includes("n1mwq.") ||
      lower.includes("f16px.") ||
      lower.includes("1azayf9w.") ||
      lower.includes("8mhlloqo.") ||
      lower.includes("96ar.com") ||
      lower.includes("xcoic.com") ||
      lower.includes("l1afav.net") ||
      lower.includes("streamwish.") ||
      lower.includes("hlswish.") ||
      lower.includes("playerwish.") ||
      lower.includes("vidhide.") ||
      lower.includes("dood.") ||
      lower.includes("streamtape.") ||
      /https?:\/\/[^\/]+\/(?:e|d|bkg)\/[a-z0-9_-]{6,}/i.test(lower)
    ) {
      return true;
    }

    if (isSmartHls && !lower.includes(".m3u8") && !lower.includes(".mp4")) {
      return true;
    }

    return false;
  }

  /**
   * Helper to retrieve iframe embed URL for external hosters like VOE / Filemoon / Byse.
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
      lower.includes("byseraguci.") ||
      lower.includes("byse") ||
      lower.includes("n1mwq.") ||
      lower.includes("f16px.") ||
      lower.includes("1azayf9w.") ||
      lower.includes("8mhlloqo.") ||
      lower.includes("96ar.com") ||
      lower.includes("xcoic.com") ||
      lower.includes("l1afav.net")
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
   * Sanitizes a raw stream URL, stripping accidental labels like " 1080p" or "1080p: "
   * while preserving valid URLs, blob:, filesystem:, and relative API paths.
   */
  public static sanitizeStreamUrl(rawUrl?: string | null): string {
    if (!rawUrl || typeof rawUrl !== "string") return "";
    const trimmed = rawUrl.trim();
    if (!trimmed) return "";
    if (
      trimmed.startsWith("blob:") ||
      trimmed.startsWith("filesystem:") ||
      trimmed.startsWith("data:") ||
      trimmed.startsWith("/")
    ) {
      return trimmed;
    }
    const httpMatch = trimmed.match(/https?:\/\/[^\s"'<>]+/i);
    if (httpMatch && httpMatch[0]) {
      return httpMatch[0].trim();
    }
    return trimmed.split(/\s+/)[0];
  }

  /**
   * Generates a collision-free cache key for a source URL (including hash + tail of URL).
   */
  private static getCacheKey(sourceUrl: string): string {
    const clean = this.sanitizeStreamUrl(sourceUrl) || sourceUrl.trim();
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < clean.length; i++) {
      const c = clean.charCodeAt(i);
      h1 ^= c;
      h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 ^= c;
      h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
    }
    const tail = clean.replace(/[^a-zA-Z0-9]/g, "").slice(-24);
    return `${CACHE_PREFIX}v2_${h1.toString(36)}_${h2.toString(36)}_${tail}`;
  }

  /**
   * Retrieves client-side cached stream URL if still valid.
   */
  private static getClientCache(sourceUrl: string): ClientCachedStream | null {
    try {
      const cleanUrl = this.sanitizeStreamUrl(sourceUrl);
      if (!cleanUrl) return null;
      const key = this.getCacheKey(cleanUrl);
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
        this.clearClientCache(cleanUrl);
        return null;
      }

      // Ensure at least 5 minutes buffer before expiry
      if (data && data.m3u8Url && data.expiresAt > now + 5 * 60 * 1000) {
        return data;
      }
      // Stale or expired
      this.clearClientCache(cleanUrl);
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Stores stream URL and optional extracted metadata in client session & local storage.
   */
  private static setClientCache(
    sourceUrl: string,
    m3u8Url: string,
    expiresAt: number,
    meta?: CachedStreamMetadata
  ): void {
    try {
      const cleanUrl = this.sanitizeStreamUrl(sourceUrl);
      if (!cleanUrl) return;
      const key = this.getCacheKey(cleanUrl);
      const existing = this.getClientCache(cleanUrl);
      const data: ClientCachedStream = {
        m3u8Url,
        expiresAt,
        cachedAt: Date.now(),
        meta: meta || existing?.meta,
      };
      sessionStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("[SmartStreamService] Failed to write cache:", e);
    }
  }

  /**
   * Public synchronous lookup for already-resolved cached stream URL (0ms for Download Modal).
   */
  public static getCachedStreamUrl(sourceUrl: string): string | null {
    const cleanUrl = this.sanitizeStreamUrl(sourceUrl);
    if (!cleanUrl) return null;
    const cached = this.getClientCache(cleanUrl);
    return cached?.m3u8Url || null;
  }

  /**
   * Public synchronous lookup for already-parsed stream metadata (qualities, audioTracks, downloadQualities).
   */
  public static getCachedStreamMeta(sourceUrl: string): CachedStreamMetadata | null {
    const cleanUrl = this.sanitizeStreamUrl(sourceUrl);
    if (!cleanUrl) return null;
    const cached = this.getClientCache(cleanUrl);
    return cached?.meta || null;
  }

  /**
   * Updates cached stream metadata for a source URL (or direct m3u8 URL).
   */
  public static setCachedStreamMeta(sourceUrl: string, meta: CachedStreamMetadata): void {
    const cleanUrl = this.sanitizeStreamUrl(sourceUrl);
    if (!cleanUrl) return;
    const existing = this.getClientCache(cleanUrl);
    const m3u8Url = existing?.m3u8Url || cleanUrl;
    const expiresAt = existing?.expiresAt || Date.now() + 170 * 60 * 1000;
    this.setClientCache(cleanUrl, m3u8Url, expiresAt, {
      ...(existing?.meta || {}),
      ...meta,
    });
  }

  /**
   * Invalidate cached token for a source URL (e.g. when playback error happens).
   */
  public static clearClientCache(sourceUrl: string): void {
    try {
      const cleanUrl = this.sanitizeStreamUrl(sourceUrl);
      if (!cleanUrl) return;
      const key = this.getCacheKey(cleanUrl);
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
   * Non-blocking background stream pre-warmer for instant playback and server switching.
   */
  public static prefetchStream(sourceUrl?: string): void {
    if (!sourceUrl || typeof sourceUrl !== "string") return;
    const trimmed = this.sanitizeStreamUrl(sourceUrl);
    if (!trimmed || !this.isExtractableSource(trimmed)) return;
    if (this.getClientCache(trimmed) || this.inFlightMap.has(trimmed)) return;
    this.resolveStream(trimmed, { forceRefresh: false }).catch(() => {});
  }

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
    const trimmed = this.sanitizeStreamUrl(sourceUrl);
    if (!trimmed) {
      throw new Error("Missing video source URL");
    }

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
    const isKotlinApp = NativeBridgeService.isRunningInKotlinApp();

    // 1.5 Priority Tier (Android APK): Inbuilt Native Kotlin Scraper & Headless Sniffer (Zero CORS)
    if (isKotlinApp) {
      try {
        const nativeRes = await NativeBridgeService.extractStreamNative(trimmed);
        if (nativeRes && nativeRes.ok && nativeRes.m3u8Url) {
          const ttlMs = 170 * 60 * 1000;
          const expiresAt = Date.now() + ttlMs;
          this.setClientCache(trimmed, nativeRes.m3u8Url, expiresAt, {
            qualities: nativeRes.qualities,
            qualityLinks: nativeRes.qualityLinks,
            downloadQualities: nativeRes.downloadQualities,
            audioTracks: nativeRes.audioTracks,
            duration: nativeRes.duration,
          });
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
          forceRefresh: options.forceRefresh === true,
          fast: true
        })
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        const chosenM3u8 = isKotlinApp
          ? (result.rawM3u8Url || result.m3u8Url)
          : result.m3u8Url;

        if (result.ok && chosenM3u8) {
          if (isKotlinApp && result.headers?.Referer) {
            NativeBridgeService.fetchTextCorsFree(chosenM3u8, result.headers).catch(() => {});
          }
          if (result.expiresAt) {
            const meta: CachedStreamMetadata | undefined =
              result.downloadQualities || result.audioTracks || result.qualities
                ? {
                    qualities: result.qualities,
                    qualityLinks: result.qualityLinks,
                    downloadQualities: result.downloadQualities,
                    audioTracks: result.audioTracks,
                    duration: result.duration,
                  }
                : undefined;
            this.setClientCache(trimmed, chosenM3u8, result.expiresAt, meta);
          }
          return {
            streamUrl: chosenM3u8,
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

  /**
   * Smart Network & Device RAM Auto-Quality Selector:
   * - Respects explicit user preference if set (`1080p`, `720p`, `480p`, `360p`).
   * - When set to `auto` / `Auto`, checks `navigator.connection` and `navigator.deviceMemory`:
   *   - Weak network (`2g`, `3g`, `< 2.5 Mbps`) or `<= 4GB RAM` -> prefers `480p` / `720p` for instant 0-buffer start.
   *   - Normal 4G (`2.5 - 6 Mbps`) -> prefers `720p`.
   *   - Fast Wi-Fi / 5G (`> 6 Mbps`) -> prefers `1080p` / `720p`.
   */
  public static getOptimalInitialQuality(availableQualities: string[]): string {
    if (!availableQualities || availableQualities.length === 0) return "auto";
    const normalizedMap = new Map<string, string>();
    for (const q of availableQualities) {
      normalizedMap.set(q.toLowerCase().trim(), q);
    }

    // 1. Check saved user preference
    try {
      const savedPref = (
        localStorage.getItem("maxplay_preferred_quality") ||
        localStorage.getItem("maxplay_default_quality") ||
        ""
      )
        .toLowerCase()
        .trim();
      if (savedPref && savedPref !== "auto") {
        const directMatch = normalizedMap.get(savedPref) || normalizedMap.get(`${savedPref}p`);
        if (directMatch) return directMatch;
      }
    } catch {}

    // 2. Smart Network & RAM Detection
    let priorityOrder = ["720p", "1080p", "480p", "360p"];
    try {
      const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
      const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
      const effType: string = (conn?.effectiveType || "").toLowerCase();
      const downlink: number = typeof conn?.downlink === "number" ? conn.downlink : 0;
      const saveData: boolean = Boolean(conn?.saveData);
      const deviceRamGb: number = typeof nav?.deviceMemory === "number" ? nav.deviceMemory : 8;

      if (
        saveData ||
        effType === "slow-2g" ||
        effType === "2g" ||
        effType === "3g" ||
        (downlink > 0 && downlink < 2.5)
      ) {
        // Weak network: start with 480p or 360p for instant playback
        priorityOrder = ["480p", "360p", "720p", "1080p"];
      } else if (deviceRamGb <= 4 || (downlink >= 2.5 && downlink <= 6.5)) {
        // 4GB RAM phone or normal 4G: start with 720p or 480p for smooth lag-free playback
        priorityOrder = ["720p", "480p", "1080p", "360p"];
      } else if (downlink > 6.5) {
        // Fast Wi-Fi / 5G: start with 1080p or 720p
        priorityOrder = ["1080p", "720p", "480p", "360p"];
      }
    } catch {}

    for (const target of priorityOrder) {
      const match = normalizedMap.get(target);
      if (match) return match;
    }

    return availableQualities[0];
  }

  /**
   * Resolves the best source URL for a server that may have separate per-quality links
   * (`1080p`, `720p`, `480p`, `360p`) or a single default URL.
   */
  public static selectSourceUrlForQuality(
    defaultUrlOrLinks?: string | Record<string, string>,
    qualityLinksOrFallback?: Record<string, string> | string,
    requestedQuality?: string
  ): {
    url: string;
    quality: string;
    chosenUrl: string;
    chosenQuality: string;
    availableQualities: string[];
    cleanQualityLinks: Record<string, string>;
  } {
    const defaultUrl =
      typeof defaultUrlOrLinks === "string"
        ? this.sanitizeStreamUrl(defaultUrlOrLinks)
        : typeof qualityLinksOrFallback === "string"
        ? this.sanitizeStreamUrl(qualityLinksOrFallback)
        : "";
    const qualityLinks =
      defaultUrlOrLinks && typeof defaultUrlOrLinks === "object"
        ? defaultUrlOrLinks
        : qualityLinksOrFallback && typeof qualityLinksOrFallback === "object"
        ? qualityLinksOrFallback
        : undefined;

    const cleanLinks: Record<string, string> = {};
    if (qualityLinks && typeof qualityLinks === "object") {
      const order = ["1080p", "720p", "480p", "360p"];
      for (const k of Object.keys(qualityLinks)) {
        const val = qualityLinks[k];
        if (typeof val === "string" && val.trim().length > 0 && k.toLowerCase() !== "default") {
          const sanitized = this.sanitizeStreamUrl(val);
          if (sanitized) cleanLinks[k] = sanitized;
        }
      }
      // Sort keys in standard resolution order
      const sortedKeys = Object.keys(cleanLinks).sort((a, b) => {
        const ia = order.indexOf(a.toLowerCase());
        const ib = order.indexOf(b.toLowerCase());
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
      const orderedLinks: Record<string, string> = {};
      for (const k of sortedKeys) {
        orderedLinks[k] = cleanLinks[k];
      }
      Object.keys(cleanLinks).forEach((k) => delete cleanLinks[k]);
      Object.assign(cleanLinks, orderedLinks);
    }

    const availableQualities = Object.keys(cleanLinks);
    if (availableQualities.length === 0) {
      const fallback = this.sanitizeStreamUrl(defaultUrl);
      const q = requestedQuality || "auto";
      return {
        url: fallback,
        quality: q,
        chosenUrl: fallback,
        chosenQuality: q,
        availableQualities: [],
        cleanQualityLinks: {},
      };
    }

    // If user explicitly picked a quality (e.g. 480p or 720p) and it exists in cleanLinks
    if (requestedQuality && requestedQuality.toLowerCase() !== "auto") {
      const reqLower = requestedQuality.toLowerCase().trim();
      const exactKey = availableQualities.find(
        (q) => q.toLowerCase() === reqLower || q.toLowerCase() === `${reqLower}p`
      );
      if (exactKey && cleanLinks[exactKey]) {
        return {
          url: cleanLinks[exactKey],
          quality: exactKey,
          chosenUrl: cleanLinks[exactKey],
          chosenQuality: exactKey,
          availableQualities,
          cleanQualityLinks: cleanLinks,
        };
      }
    }

    // Otherwise auto-select optimal quality for user's network & RAM
    const optimalQ = this.getOptimalInitialQuality(availableQualities);
    const chosenUrl =
      cleanLinks[optimalQ] ||
      cleanLinks[availableQualities[0]] ||
      this.sanitizeStreamUrl(defaultUrl);

    return {
      url: chosenUrl,
      quality: optimalQ,
      chosenUrl,
      chosenQuality: optimalQ,
      availableQualities,
      cleanQualityLinks: cleanLinks,
    };
  }

  /**
   * Clears all cached stream extraction tokens from sessionStorage and localStorage.
   */
  public static clearAllStreamCache(): number {
    let removed = 0;
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) {
          sessionStorage.removeItem(k);
          removed++;
        }
      }
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(k);
          removed++;
        }
      }
    } catch {}
    return removed;
  }
}

