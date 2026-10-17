import muxjs from 'mux.js';
import { NativeBridgeService } from './nativeBridgeService';

export interface HlsDownloadProgress {
  downloadedBytes: number;
  totalEstimatedBytes: number;
  speedMb: number;
  percent: number;
  statusText: string;
}

interface SegmentInfo {
  url: string;
  duration: number;
  byteRange?: { offset: number; length: number };
}

/**
 * Robust Client-Side HLS Downloader
 * ----------------------------------------------------
 * Works directly in the browser across AI Studio and Vercel.
 * - Downloads HLS segments without serverless timeouts.
 * - Transmuxes MPEG-TS (.ts) to MP4 via mux.js in pure JS.
 * - Directly handles fMP4 (.m4s) streams.
 * - Automatically falls back to lightweight /api/proxy if direct CDN CORS is blocked.
 */
export class ClientHlsDownloader {
  private static proxyRequiredHosts = new Set<string>();

  private static async fetchWithCorsFallback(
    targetUrl: string,
    options: RequestInit = {}
  ): Promise<Response> {
    let host = '';
    try {
      host = new URL(targetUrl).host;
    } catch (_) {}

    // If running inside Native Kotlin APK, fetch directly via Native OkHttp (Zero CORS)
    if (NativeBridgeService.isRunningInKotlinApp()) {
      const nativeBody = await NativeBridgeService.fetchTextCorsFree(
        targetUrl,
        (options.headers as Record<string, string>) || {}
      );
      if (nativeBody !== null) {
        return new Response(nativeBody, { status: 200 });
      }
    }

    // If host is already known to require proxy due to CORS/auth headers, bypass direct fetch timeout immediately!
    if (host && this.proxyRequiredHosts.has(host)) {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
      return fetch(proxyUrl, options);
    }

    try {
      const resp = await fetch(targetUrl, {
        ...options,
        headers: {
          Accept: '*/*',
          ...(options.headers || {}),
        },
      });
      if (resp.ok) return resp;
      if (resp.status === 403 || resp.status === 401 || resp.status === 0) {
        throw new Error(`Direct fetch rejected with HTTP ${resp.status}`);
      }
      return resp;
    } catch (err: any) {
      if (options.signal?.aborted) throw err;
      if (host) {
        this.proxyRequiredHosts.add(host);
      }
      // Fallback via lightweight /api/proxy to bypass CORS
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
      return fetch(proxyUrl, options);
    }
  }

  private static parseByteRange(
    line: string,
    prevOffset: number
  ): { range: { offset: number; length: number }; nextOffset: number } {
    const val = line.replace('#EXT-X-BYTERANGE:', '').trim();
    const parts = val.split('@');
    const length = parseInt(parts[0], 10);
    const offset = parts.length > 1 ? parseInt(parts[1], 10) : prevOffset;
    return {
      range: { offset, length },
      nextOffset: offset + length,
    };
  }

  /**
   * Resolves the best variant playlist URL based on requested quality
   */
  public static async resolveVariantUrl(
    playlistUrl: string,
    targetQuality: string = '720p',
    signal?: AbortSignal
  ): Promise<{ variantUrl: string; isMaster: boolean }> {
    const resp = await this.fetchWithCorsFallback(playlistUrl, { signal });
    if (!resp.ok) {
      throw new Error(`Failed to fetch playlist (HTTP ${resp.status})`);
    }
    const content = await resp.text();

    // If it's already a media playlist containing segment definitions (#EXTINF)
    if (content.includes('#EXTINF:') && !content.includes('#EXT-X-STREAM-INF:')) {
      return { variantUrl: playlistUrl, isMaster: false };
    }

    // It's a master playlist with multiple variant streams
    const lines = content.split('\n').map((l) => l.trim());
    const variants: { url: string; resolution?: string; bandwidth?: number; height?: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        let uri = '';
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j] && !lines[j].startsWith('#')) {
            uri = lines[j];
            break;
          }
        }
        if (uri) {
          const resMatch = line.match(/RESOLUTION=\d+x(\d+)/i);
          const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
          const height = resMatch ? parseInt(resMatch[1], 10) : undefined;
          const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : undefined;
          const fullUri = new URL(uri, playlistUrl).href;
          variants.push({
            url: fullUri,
            resolution: height ? `${height}p` : undefined,
            bandwidth,
            height,
          });
        }
      }
    }

    if (variants.length === 0) {
      return { variantUrl: playlistUrl, isMaster: false };
    }

    // Match requested quality (e.g. 720p, 1080p, 480p)
    const targetHeight = parseInt(targetQuality.replace(/\D/g, '') || '720', 10);
    let best = variants.find((v) => v.height === targetHeight);

    if (!best) {
      // Find closest height
      let minDiff = Infinity;
      for (const v of variants) {
        const h = v.height || (v.bandwidth ? Math.round(v.bandwidth / 3000) : 720);
        const diff = Math.abs(h - targetHeight);
        if (diff < minDiff) {
          minDiff = diff;
          best = v;
        }
      }
    }

    return {
      variantUrl: best?.url || variants[0].url,
      isMaster: true,
    };
  }

  /**
   * Downloads a complete HLS stream client-side and transmuxes into a single MP4 Blob
   */
  public static async downloadHlsStream(
    masterOrVariantUrl: string,
    quality: string = '720p',
    signal?: AbortSignal,
    onProgress?: (progress: HlsDownloadProgress) => void
  ): Promise<Blob> {
    onProgress?.({
      downloadedBytes: 0,
      totalEstimatedBytes: 50 * 1024 * 1024,
      speedMb: 0,
      percent: 1,
      statusText: 'Analyzing stream qualities...',
    });

    // 1. Resolve to media/variant playlist
    const { variantUrl } = await this.resolveVariantUrl(masterOrVariantUrl, quality, signal);
    if (signal?.aborted) throw new Error('Download aborted');

    // 2. Fetch media playlist and parse segments
    const variantResp = await this.fetchWithCorsFallback(variantUrl, { signal });
    if (!variantResp.ok) {
      throw new Error(`Failed to load media playlist (HTTP ${variantResp.status})`);
    }
    const variantText = await variantResp.text();
    const lines = variantText.split('\n').map((l) => l.trim());

    let initMapUrl: string | null = null;
    let initMapRange: { offset: number; length: number } | undefined;
    const segments: SegmentInfo[] = [];

    let currentDuration = 10;
    let currentByteRange: { offset: number; length: number } | undefined;
    let lastByteOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('#EXT-X-MAP:')) {
        const uriMatch = line.match(/URI=["']([^"']+)["']/i);
        if (uriMatch) {
          initMapUrl = new URL(uriMatch[1], variantUrl).href;
        }
        const rangeMatch = line.match(/BYTERANGE=["']([^"']+)["']/i);
        if (rangeMatch) {
          const { range } = this.parseByteRange(`#EXT-X-BYTERANGE:${rangeMatch[1]}`, 0);
          initMapRange = range;
        }
      } else if (line.startsWith('#EXTINF:')) {
        const durMatch = line.match(/#EXTINF:([\d.]+)/);
        if (durMatch) {
          currentDuration = parseFloat(durMatch[1]);
        }
      } else if (line.startsWith('#EXT-X-BYTERANGE:')) {
        const { range, nextOffset } = this.parseByteRange(line, lastByteOffset);
        currentByteRange = range;
        lastByteOffset = nextOffset;
      } else if (line && !line.startsWith('#')) {
        segments.push({
          url: new URL(line, variantUrl).href,
          duration: currentDuration,
          byteRange: currentByteRange,
        });
        currentByteRange = undefined;
      }
    }

    if (segments.length === 0) {
      throw new Error('No downloadable video segments found in the playlist');
    }

    // 3. Initialize Transmuxer
    const transmuxer = new (muxjs as any).mp4.Transmuxer({ keepOriginalTimestamps: true });
    let initSegment: Uint8Array | null = null;
    const videoParts: Uint8Array[] = [];
    let isPureFmp4 = false;

    transmuxer.on('data', (segment: any) => {
      if (segment.initSegment && !initSegment) {
        initSegment = new Uint8Array(segment.initSegment);
      }
      if (segment.data) {
        videoParts.push(new Uint8Array(segment.data));
      }
    });

    // 4. Download init segment if present (fMP4)
    let fmp4InitBytes: Uint8Array | null = null;
    if (initMapUrl) {
      isPureFmp4 = true;
      const headers: Record<string, string> = {};
      if (initMapRange) {
        headers['Range'] = `bytes=${initMapRange.offset}-${initMapRange.offset + initMapRange.length - 1}`;
      }
      const initResp = await this.fetchWithCorsFallback(initMapUrl, { signal, headers });
      if (initResp.ok) {
        const buf = await initResp.arrayBuffer();
        fmp4InitBytes = new Uint8Array(buf);
      }
    }

    // 5. High-Speed Concurrent Segment Download Pipeline with In-Order Transmuxing (8 Workers)
    const CONCURRENCY = 8;
    let totalDownloadedBytes = 0;
    let completedSegmentsCount = 0;
    let lastReportTime = Date.now();
    let bytesSinceLastReport = 0;
    let currentSpeedMb = 0;

    const totalDurationSec = segments.reduce((acc, s) => acc + (s.duration || 10), 0);
    let estimatedTotalBytes = Math.max(1024 * 1024, Math.round(totalDurationSec * (180 * 1024)));

    const downloadedSegments = new Map<number, Uint8Array>();
    let nextSegmentToDownload = 0;
    let nextSegmentToAssemble = 0;
    let workerError: Error | null = null;

    // Ordered Assembly Drain: strictly feeds transmuxer in 0, 1, 2, ... sequence without premature flush
    const drainAssemblyQueue = () => {
      while (downloadedSegments.has(nextSegmentToAssemble)) {
        const segBytes = downloadedSegments.get(nextSegmentToAssemble)!;
        downloadedSegments.delete(nextSegmentToAssemble); // free raw buffer immediately from RAM

        const isMpegTs = segBytes.length > 0 && segBytes[0] === 0x47;
        if (isMpegTs) {
          transmuxer.push(segBytes);
        } else {
          isPureFmp4 = true;
          videoParts.push(segBytes);
        }
        nextSegmentToAssemble++;
      }
    };

    // Robust Segment Fetcher with 3 Retries via Server Proxy / Direct CDN
    const fetchSegmentWithRetry = async (segUrl: string, headers: Record<string, string>, retries = 3): Promise<Uint8Array> => {
      let lastErr: any = null;
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(segUrl)}`;

      for (let attempt = 1; attempt <= retries; attempt++) {
        if (signal?.aborted) throw new Error('Download aborted by user');

        // Priority 0 (Android APK): Native Kotlin OkHttp Direct Binary Fetch (Zero CORS, Zero Proxy Overhead)
        if (NativeBridgeService.isRunningInKotlinApp()) {
          try {
            const nativeBytes = await NativeBridgeService.fetchBytesCorsFree(segUrl, headers);
            if (nativeBytes && nativeBytes.byteLength > 0) {
              return nativeBytes;
            }
          } catch (e) {
            lastErr = e;
          }
        }

        try {
          // Primary: Proxy download for guaranteed CORS-free & headers-compliant fetch
          const resp = await fetch(proxyUrl, { signal, headers });
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            if (buf.byteLength > 0) return new Uint8Array(buf);
          }
        } catch (e) {
          lastErr = e;
        }

        try {
          // Fallback: Direct CDN fetch
          const directResp = await fetch(segUrl, { signal, headers });
          if (directResp.ok) {
            const buf = await directResp.arrayBuffer();
            if (buf.byteLength > 0) return new Uint8Array(buf);
          }
        } catch (e) {
          lastErr = e;
        }

        // Brief delay before retry
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }

      throw new Error(lastErr?.message || 'Segment download failed after retries');
    };

    const worker = async () => {
      while (nextSegmentToDownload < segments.length && !workerError) {
        if (signal?.aborted) {
          workerError = new Error('Download aborted by user');
          break;
        }

        const idx = nextSegmentToDownload++;
        const seg = segments[idx];
        const headers: Record<string, string> = {};
        if (seg.byteRange) {
          headers['Range'] = `bytes=${seg.byteRange.offset}-${seg.byteRange.offset + seg.byteRange.length - 1}`;
        }

        let segBytes: Uint8Array;
        try {
          segBytes = await fetchSegmentWithRetry(seg.url, headers, 3);
        } catch (fetchErr: any) {
          if (signal?.aborted) {
            workerError = new Error('Download aborted by user');
            break;
          }
          workerError = new Error(`Failed downloading segment ${idx + 1}/${segments.length}: ${fetchErr.message}`);
          break;
        }

        totalDownloadedBytes += segBytes.byteLength;
        bytesSinceLastReport += segBytes.byteLength;
        completedSegmentsCount++;

        // Store into ordered map & drain sequentially into transmuxer
        downloadedSegments.set(idx, segBytes);
        drainAssemblyQueue();

        if (completedSegmentsCount === 4) {
          const avgPerSeg = totalDownloadedBytes / 4;
          estimatedTotalBytes = Math.round(avgPerSeg * segments.length);
        }

        const now = Date.now();
        if (now - lastReportTime >= 300 || completedSegmentsCount === segments.length) {
          const elapsedSec = (now - lastReportTime) / 1000;
          if (elapsedSec > 0) {
            currentSpeedMb = parseFloat(((bytesSinceLastReport / (1024 * 1024)) / elapsedSec).toFixed(1));
          }
          lastReportTime = now;
          bytesSinceLastReport = 0;

          const percent = Math.min(99, Math.max(2, Math.round((completedSegmentsCount / segments.length) * 100)));
          onProgress?.({
            downloadedBytes: totalDownloadedBytes,
            totalEstimatedBytes: Math.max(totalDownloadedBytes, estimatedTotalBytes),
            speedMb: currentSpeedMb,
            percent,
            statusText: `Downloading: ${completedSegmentsCount}/${segments.length} segments (${percent}%) • ${currentSpeedMb} MB/s`,
          });
        }
      }
    };

    // Run CONCURRENCY workers simultaneously for maximum network bandwidth
    const workersCount = Math.min(CONCURRENCY, segments.length);
    const workerPromises = Array.from({ length: workersCount }, () => worker());
    await Promise.all(workerPromises);

    if (workerError) {
      throw workerError;
    }

    // Final drain check to ensure all segments pushed to transmuxer
    drainAssemblyQueue();

    // Flush transmuxer ONCE at the end to generate 1 single clean MP4 container
    if (!isPureFmp4) {
      transmuxer.flush();
    }

    // 6. Build final MP4 Blob
    onProgress?.({
      downloadedBytes: totalDownloadedBytes,
      totalEstimatedBytes: totalDownloadedBytes,
      speedMb: currentSpeedMb,
      percent: 99,
      statusText: 'Assembling offline video file...',
    });

    let finalBlob: Blob;
    if (isPureFmp4) {
      const parts: (Uint8Array | BlobPart)[] = [];
      if (fmp4InitBytes) parts.push(fmp4InitBytes);
      parts.push(...videoParts);
      finalBlob = new Blob(parts as BlobPart[], { type: 'video/mp4' });
    } else {
      // Transmuxed MPEG-TS to MP4
      const parts: (Uint8Array | BlobPart)[] = [];
      if (initSegment) parts.push(initSegment);
      parts.push(...videoParts);

      if (parts.length === 0 || totalDownloadedBytes < 1024) {
        throw new Error('Transmuxing failed: Generated empty video data');
      }
      finalBlob = new Blob(parts as BlobPart[], { type: 'video/mp4' });
    }

    onProgress?.({
      downloadedBytes: finalBlob.size,
      totalEstimatedBytes: finalBlob.size,
      speedMb: 0,
      percent: 100,
      statusText: 'Download Complete',
    });

    return finalBlob;
  }
}
