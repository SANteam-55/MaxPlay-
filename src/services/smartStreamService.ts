/**
 * MaxPlay Smart Stream Service
 * 
 * Handles client-side resolution and caching for dynamically extracted HLS streams.
 * Prevents token expiration (3-hour expiry limit) by managing automated extraction
 * and local caching without exposing secret master credentials in the browser.
 */

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

    // Already a direct MaxPlay backend proxy
    if (lower.includes("/proxy/m3u8")) return false;
    
    // Recognised video hosters that require extraction
    if (
      lower.includes("voe.sx") ||
      lower.includes("voe.") ||
      lower.includes("voe-network") ||
      lower.includes("cloudwindow-route") ||
      lower.includes("node=h0ke")
    ) {
      return true;
    }

    if (isSmartHls && !lower.includes(".m3u8") && !lower.includes(".mp4")) {
      return true;
    }

    return false;
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

  /**
   * Resolves a video source URL into a playable Master m3u8 URL.
   * If the URL is already an m3u8 or mp4, it returns it directly.
   * If it is an extractable source (e.g. VOE), it calls the MaxPlay backend proxy.
   */
  public static async resolveStream(
    sourceUrl: string,
    options: { forceRefresh?: boolean } = {}
  ): Promise<{
    streamUrl: string;
    isExtracted: boolean;
    cached: boolean;
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
        cached: false
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
          expiresAt: cached.expiresAt
        };
      }
    }

    // 2. Call backend proxy endpoint
    const response = await fetch("/api/extract-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: trimmed,
        forceRefresh: options.forceRefresh === true
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error || `Stream extraction failed (${response.status})`);
    }

    const result = await response.json();

    if (!result.ok || !result.m3u8Url) {
      throw new Error(result.error || "Master stream link not found");
    }

    // 3. Save to client cache
    if (result.expiresAt) {
      this.setClientCache(trimmed, result.m3u8Url, result.expiresAt);
    }

    return {
      streamUrl: result.m3u8Url,
      isExtracted: true,
      cached: Boolean(result.cached),
      expiresAt: result.expiresAt
    };
  }
}
