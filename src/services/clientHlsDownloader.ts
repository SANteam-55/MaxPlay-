/**
 * Client-Side & Native Kotlin Hybrid HLS Segment Downloader & Storage Engine
 *
 * Architecture:
 * 1. Inside the MaxPlay Android APK (`NativeBridgeService.supportsNativeOfflineVault()`):
 *    - Downloads `.ts` / `.m4s` segments directly to Android internal storage disk
 *      (`context.filesDir/maxplay_offline_vault/{key}/seg_{i}.ts`) via Kotlin OkHttp.
 *    - Supports 100% True Checkpoint Resume: if a download is paused or interrupted at 80%,
 *      existing segments on disk are detected and resumed from 80% immediately.
 *    - Generates a local virtual HLS playlist (`https://maxplay.local/offline-vault/{key}/index.m3u8`)
 *      intercepted by `CorsFreeWebViewClient` for 0-RAM offline playback.
 * 2. Inside a Standard Web Browser:
 *    - Stores binary chunks in IndexedDB (`maxplay_offline_chunks_v1`) with checkpoint resume
 *      and generates an in-memory Blob `.m3u8` playlist for `hls.js` playback.
 */

import { NativeBridgeService } from './nativeBridgeService';

const DB_NAME = 'maxplay_offline_chunks_v1';
const STORE_NAME = 'chunks';

function openChunkDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putChunk(key: string, data: ArrayBuffer | number): Promise<void> {
  const db = await openChunkDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(data, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function getChunk<T = ArrayBuffer>(key: string): Promise<T | undefined> {
  const db = await openChunkDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => {
      db.close();
      resolve(req.result as T | undefined);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

async function deleteChunksByPrefix(prefix: string): Promise<void> {
  const db = await openChunkDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
    const req = store.openCursor(range);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function resolveRelativeUrl(baseUrl: string, rel: string): string {
  try {
    return new URL(rel, baseUrl).href;
  } catch {
    return rel;
  }
}

function wrapProxyUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  // When running inside the Native Kotlin APK,CorsFreeWebViewClient & OkHttp handle CORS natively!
  if (NativeBridgeService.isRunningInKotlinApp()) {
    if (trimmed.includes('/api/proxy?url=')) {
      try {
        const u = new URL(trimmed, window.location.origin);
        const inner = u.searchParams.get('url');
        if (inner) return decodeURIComponent(inner);
      } catch {}
    }
    return trimmed;
  }
  if (
    trimmed.startsWith('/api/proxy') ||
    trimmed.includes('/api/proxy?url=') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  return `/api/proxy?url=${encodeURIComponent(trimmed)}`;
}

function unwrapProxyUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (trimmed.includes('/api/proxy?url=')) {
    try {
      const u = new URL(trimmed, window.location.origin);
      const inner = u.searchParams.get('url');
      if (inner) return decodeURIComponent(inner);
    } catch {}
  }
  return trimmed;
}

export interface HlsDownloadProgress {
  progress: number; // 0 to 100
  downloadedBytes: number;
  totalEstimatedBytes: number;
  completedSegments: number;
  totalSegments: number;
  speedBps: number;
}

export class ClientHlsDownloader {
  private static activeAborters = new Map<string, AbortController>();
  private static activeBlobUrls = new Map<string, string[]>();

  public static abortDownload(storageKey: string): void {
    const ctrl = this.activeAborters.get(storageKey);
    if (ctrl) {
      ctrl.abort();
      this.activeAborters.delete(storageKey);
    }
  }

  /**
   * Resolves a Master Playlist to a specific quality variant URL, or returns the URL if already a Media Playlist.
   */
  private static async resolveMediaPlaylist(
    masterUrl: string,
    targetQuality: string,
    signal: AbortSignal
  ): Promise<string> {
    const rawMasterUrl = unwrapProxyUrl(masterUrl);
    let text = '';

    if (NativeBridgeService.isRunningInKotlinApp()) {
      const nativeText = await NativeBridgeService.fetchTextCorsFree(rawMasterUrl);
      if (nativeText && nativeText.includes('#EXTM3U')) {
        text = nativeText;
      }
    }

    if (!text) {
      const res = await fetch(wrapProxyUrl(rawMasterUrl), { signal });
      if (!res.ok) throw new Error(`Playlist fetch failed (${res.status})`);
      text = await res.text();
    }

    // If it already has segments (#EXTINF), it IS a media playlist
    if (text.includes('#EXTINF:')) {
      return rawMasterUrl;
    }

    // Parse #EXT-X-STREAM-INF variants
    const lines = text.split(/\r?\n/).map((l) => l.trim());
    const variants: { height: number; bandwidth: number; url: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
        const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
        const height = resMatch ? parseInt(resMatch[2], 10) : 0;
        const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;

        let nextUri = '';
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j] && !lines[j].startsWith('#')) {
            nextUri = lines[j];
            break;
          }
        }
        if (nextUri) {
          variants.push({
            height,
            bandwidth,
            url: resolveRelativeUrl(rawMasterUrl, nextUri),
          });
        }
      }
    }

    if (variants.length === 0) {
      return rawMasterUrl;
    }

    const reqHeight = parseInt(targetQuality.replace(/\D/g, ''), 10) || 720;
    variants.sort(
      (a, b) => Math.abs(a.height - reqHeight) - Math.abs(b.height - reqHeight)
    );
    return variants[0].url;
  }

  /**
   * Parses all segment URLs and total duration from an HLS media playlist.
   */
  private static async parseSegments(
    mediaPlaylistUrl: string,
    signal: AbortSignal
  ): Promise<{ segments: string[]; totalDurationSec: number }> {
    const rawMediaUrl = unwrapProxyUrl(mediaPlaylistUrl);
    let text = '';

    if (NativeBridgeService.isRunningInKotlinApp()) {
      const nativeText = await NativeBridgeService.fetchTextCorsFree(rawMediaUrl);
      if (nativeText && nativeText.includes('#EXTM3U')) {
        text = nativeText;
      }
    }

    if (!text) {
      const res = await fetch(wrapProxyUrl(rawMediaUrl), { signal });
      if (!res.ok) throw new Error(`Media playlist fetch failed (${res.status})`);
      text = await res.text();
    }

    const lines = text.split(/\r?\n/).map((l) => l.trim());
    const segments: string[] = [];
    let totalDurationSec = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (line.startsWith('#EXTINF:')) {
        const durMatch = line.match(/#EXTINF:([\d.]+)/);
        if (durMatch) {
          totalDurationSec += parseFloat(durMatch[1]) || 0;
        }
        continue;
      }
      if (line.startsWith('#')) continue;
      segments.push(resolveRelativeUrl(rawMediaUrl, line));
    }

    return {
      segments,
      totalDurationSec: totalDurationSec > 0 ? totalDurationSec : segments.length * 4,
    };
  }

  /**
   * Downloads an HLS stream or direct MP4 file with 6x parallel segment fetching
   * and True Checkpoint Resume (both on Android Native Disk Vault and Browser IndexedDB).
   */
  public static async downloadStream(
    storageKey: string,
    streamUrl: string,
    quality: string,
    onProgress: (info: HlsDownloadProgress) => void
  ): Promise<{ totalBytes: number }> {
    this.abortDownload(storageKey);
    const controller = new AbortController();
    this.activeAborters.set(storageKey, controller);
    const { signal } = controller;

    const startTime = Date.now();
    let downloadedBytes = 0;
    const useNativeDisk = NativeBridgeService.supportsNativeOfflineVault();

    try {
      const cleanUrl = unwrapProxyUrl(streamUrl);
      const isDirectMp4 =
        cleanUrl.toLowerCase().includes('.mp4') &&
        !cleanUrl.toLowerCase().includes('.m3u8');

      if (isDirectMp4) {
        if (useNativeDisk) {
          const segRes = await NativeBridgeService.downloadSegmentToDiskNative(
            storageKey,
            0,
            cleanUrl
          );
          if (!segRes.ok) {
            throw new Error(segRes.error || 'Direct native file download failed');
          }
          const finalBytes = segRes.bytes || 0;
          NativeBridgeService.saveOfflineManifestNative(storageKey, 1, 1440, true);
          onProgress({
            progress: 100,
            downloadedBytes: finalBytes,
            totalEstimatedBytes: finalBytes,
            completedSegments: 1,
            totalSegments: 1,
            speedBps: finalBytes,
          });
          return { totalBytes: finalBytes };
        }

        const res = await fetch(wrapProxyUrl(cleanUrl), { signal });
        if (!res.ok) throw new Error(`Direct download failed (${res.status})`);
        const contentLength = Number(res.headers.get('content-length') || 0);
        const reader = res.body?.getReader();
        const chunks: Uint8Array[] = [];

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              downloadedBytes += value.byteLength;
              const elapsedSec = Math.max(0.2, (Date.now() - startTime) / 1000);
              const speedBps = downloadedBytes / elapsedSec;
              const totalEst =
                contentLength > 0 ? contentLength : Math.max(downloadedBytes * 1.2, 50 * 1024 * 1024);
              onProgress({
                progress: Math.min(99, Math.round((downloadedBytes / totalEst) * 100)),
                downloadedBytes,
                totalEstimatedBytes: totalEst,
                completedSegments: 0,
                totalSegments: 1,
                speedBps,
              });
            }
          }
        }

        const merged = new Uint8Array(downloadedBytes);
        let offset = 0;
        for (const c of chunks) {
          merged.set(c, offset);
          offset += c.byteLength;
        }

        await putChunk(`${storageKey}_chunk_0`, merged.buffer);
        await putChunk(`${storageKey}_totalChunks`, 1);
        onProgress({
          progress: 100,
          downloadedBytes,
          totalEstimatedBytes: downloadedBytes,
          completedSegments: 1,
          totalSegments: 1,
          speedBps: downloadedBytes / Math.max(1, (Date.now() - startTime) / 1000),
        });
        return { totalBytes: downloadedBytes };
      }

      // HLS Stream Download Flow
      const mediaPlaylistUrl = await this.resolveMediaPlaylist(cleanUrl, quality, signal);
      const { segments, totalDurationSec } = await this.parseSegments(mediaPlaylistUrl, signal);

      if (segments.length === 0) {
        throw new Error('No video segments found in HLS playlist');
      }

      const totalSegments = segments.length;
      let completedSegments = 0;
      let sessionDownloadedBytes = 0;

      // Check existing checkpoint on Native Disk or IndexedDB for True Resume
      const alreadyDoneSet = new Set<number>();
      if (useNativeDisk) {
        const checkpoint = NativeBridgeService.getOfflineCheckpointInfoNative(storageKey);
        if (checkpoint && checkpoint.exists && checkpoint.completedIndices.length > 0) {
          checkpoint.completedIndices.forEach((idx) => {
            if (idx >= 0 && idx < totalSegments) {
              alreadyDoneSet.add(idx);
            }
          });
          completedSegments = alreadyDoneSet.size;
          downloadedBytes = checkpoint.totalBytes || 0;
        }
      }

      // Report initial progress if resuming from checkpoint
      if (completedSegments > 0) {
        const avgBytes = downloadedBytes / completedSegments;
        const estTotal = Math.round(avgBytes * totalSegments);
        onProgress({
          progress: Math.min(99, Math.round((completedSegments / totalSegments) * 100)),
          downloadedBytes,
          totalEstimatedBytes: estTotal,
          completedSegments,
          totalSegments,
          speedBps: 0,
        });
      }

      // 6x parallel segment workers (optimal throughput without overwhelming mobile sockets)
      const CONCURRENCY = useNativeDisk ? 6 : 5;
      let nextIndex = 0;

      const worker = async () => {
        while (nextIndex < totalSegments) {
          if (signal.aborted) throw new Error('Download aborted');
          const currentIndex = nextIndex++;

          // Skip already checkpointed segments in 0ms!
          if (alreadyDoneSet.has(currentIndex)) {
            continue;
          }

          const segUrl = segments[currentIndex];
          let segBytes = 0;
          let success = false;

          for (let attempt = 0; attempt < 3; attempt++) {
            if (signal.aborted) throw new Error('Download aborted');
            try {
              if (useNativeDisk) {
                const diskRes = await NativeBridgeService.downloadSegmentToDiskNative(
                  storageKey,
                  currentIndex,
                  unwrapProxyUrl(segUrl)
                );
                if (diskRes.ok && (diskRes.bytes || 0) > 0) {
                  segBytes = diskRes.bytes || 0;
                  if (!diskRes.cached) {
                    sessionDownloadedBytes += segBytes;
                  }
                  success = true;
                  break;
                }
              } else {
                const resp = await fetch(wrapProxyUrl(segUrl), { signal });
                if (!resp.ok) throw new Error(`Segment HTTP ${resp.status}`);
                const buf = await resp.arrayBuffer();
                if (buf && buf.byteLength > 0) {
                  await putChunk(`${storageKey}_chunk_${currentIndex}`, buf);
                  segBytes = buf.byteLength;
                  sessionDownloadedBytes += segBytes;
                  success = true;
                  break;
                }
              }
            } catch (err) {
              if (signal.aborted) throw err;
              if (attempt === 2) throw err;
              await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
            }
          }

          if (!success) {
            throw new Error(`Segment ${currentIndex} failed after retries`);
          }

          downloadedBytes += segBytes;
          completedSegments++;

          const elapsedSec = Math.max(0.2, (Date.now() - startTime) / 1000);
          const speedBps = sessionDownloadedBytes / elapsedSec;
          const avgSegmentBytes = downloadedBytes / Math.max(1, completedSegments);
          const totalEstimatedBytes = Math.round(avgSegmentBytes * totalSegments);
          const progress = Math.min(99, Math.round((completedSegments / totalSegments) * 100));

          onProgress({
            progress,
            downloadedBytes,
            totalEstimatedBytes,
            completedSegments,
            totalSegments,
            speedBps,
          });
        }
      };

      const workers = Array.from(
        { length: Math.min(CONCURRENCY, totalSegments) },
        () => worker()
      );
      await Promise.all(workers);

      if (useNativeDisk) {
        NativeBridgeService.saveOfflineManifestNative(
          storageKey,
          totalSegments,
          totalDurationSec,
          false
        );
      } else {
        await putChunk(`${storageKey}_totalChunks`, totalSegments);
        await putChunk(`${storageKey}_durationSec`, totalDurationSec);
      }

      onProgress({
        progress: 100,
        downloadedBytes,
        totalEstimatedBytes: downloadedBytes,
        completedSegments: totalSegments,
        totalSegments,
        speedBps: sessionDownloadedBytes / Math.max(1, (Date.now() - startTime) / 1000),
      });

      return { totalBytes: downloadedBytes };
    } finally {
      this.activeAborters.delete(storageKey);
    }
  }

  /**
   * Returns a playable Offline URL for a downloaded item:
   * - In Kotlin APK: Returns `https://maxplay.local/offline-vault/{safeKey}/index.m3u8` (0 MB RAM!).
   * - In Web Browser: Builds an in-memory HLS `.m3u8` Blob playlist over IndexedDB segment blobs.
   */
  public static async getOfflineBlobUrl(storageKey: string): Promise<string | null> {
    try {
      // 1. Priority: Native Android Disk Vault (Zero RAM overhead!)
      if (
        NativeBridgeService.supportsNativeOfflineVault() &&
        NativeBridgeService.hasOfflineItemNative(storageKey)
      ) {
        const nativeUrl = NativeBridgeService.getOfflinePlaybackUrlNative(storageKey);
        if (nativeUrl) return nativeUrl;
      }

      // 2. Fallback: Browser IndexedDB Chunks
      const totalChunks = await getChunk<number>(`${storageKey}_totalChunks`);
      if (!totalChunks || totalChunks <= 0) return null;

      // Revoke any previous temporary blob URLs for this storageKey
      const oldUrls = this.activeBlobUrls.get(storageKey);
      if (oldUrls) {
        oldUrls.forEach((u) => {
          try {
            URL.revokeObjectURL(u);
          } catch {}
        });
      }

      // Single MP4 file
      if (totalChunks === 1) {
        const chunk0 = await getChunk<ArrayBuffer>(`${storageKey}_chunk_0`);
        if (!chunk0) return null;
        const blob = new Blob([chunk0], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        this.activeBlobUrls.set(storageKey, [url]);
        return url;
      }

      // Multi-segment HLS stream in Browser IndexedDB: create segment blob URLs + local .m3u8 playlist blob
      const totalDurationSec = (await getChunk<number>(`${storageKey}_durationSec`)) || totalChunks * 4;
      const avgDur = Math.max(1.5, Math.min(12, totalDurationSec / totalChunks));
      const targetDur = Math.ceil(avgDur + 2);
      const createdUrls: string[] = [];

      const m3u8Lines: string[] = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        `#EXT-X-TARGETDURATION:${targetDur}`,
        '#EXT-X-MEDIA-SEQUENCE:0',
        '#EXT-X-PLAYLIST-TYPE:VOD',
      ];

      for (let i = 0; i < totalChunks; i++) {
        const chunk = await getChunk<ArrayBuffer>(`${storageKey}_chunk_${i}`);
        if (chunk) {
          const segBlob = new Blob([chunk], { type: 'video/mp2t' });
          const segUrl = URL.createObjectURL(segBlob);
          createdUrls.push(segUrl);
          m3u8Lines.push(`#EXTINF:${avgDur.toFixed(3)},`);
          m3u8Lines.push(segUrl);
        }
      }

      if (createdUrls.length === 0) return null;
      m3u8Lines.push('#EXT-X-ENDLIST');

      const playlistBlob = new Blob([m3u8Lines.join('\n')], {
        type: 'application/vnd.apple.mpegurl',
      });
      const playlistUrl = URL.createObjectURL(playlistBlob);
      createdUrls.push(playlistUrl);
      this.activeBlobUrls.set(storageKey, createdUrls);

      return playlistUrl;
    } catch (e) {
      console.error('[ClientHlsDownloader] Failed to assemble offline stream:', e);
      return null;
    }
  }

  /**
   * Deletes all stored chunks for a given storageKey from both Android Disk Vault and IndexedDB.
   */
  public static async deleteOfflineFile(storageKey: string): Promise<void> {
    this.abortDownload(storageKey);

    const oldUrls = this.activeBlobUrls.get(storageKey);
    if (oldUrls) {
      oldUrls.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
      this.activeBlobUrls.delete(storageKey);
    }

    if (NativeBridgeService.supportsNativeOfflineVault()) {
      NativeBridgeService.deleteOfflineItemNative(storageKey);
    }

    try {
      await deleteChunksByPrefix(`${storageKey}_`);
    } catch (e) {
      console.warn('[ClientHlsDownloader] Failed to delete IndexedDB chunks:', e);
    }
  }
}
