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
   * Normalizes raw HLS audio track NAME / LANGUAGE attributes into friendly language names.
   */
  public static normalizeLanguageLabel(rawName: string, rawLang: string): string {
    const combined = `${rawLang} ${rawName}`.toLowerCase().trim();
    if (!combined) return '';
    if (combined.includes('hin') || /\bhi\b/.test(combined)) return 'Hindi';
    if (combined.includes('eng') || /\ben\b/.test(combined)) return 'English';
    if (combined.includes('jpn') || combined.includes('jap') || /\bja\b/.test(combined)) return 'Japanese';
    if (combined.includes('tam') || /\bta\b/.test(combined)) return 'Tamil';
    if (combined.includes('tel') || /\bte\b/.test(combined)) return 'Telugu';
    if (combined.includes('mal') || /\bml\b/.test(combined)) return 'Malayalam';
    if (combined.includes('kan') || /\bkn\b/.test(combined)) return 'Kannada';
    if (combined.includes('kor') || /\bko\b/.test(combined)) return 'Korean';
    if (combined.includes('spa') || /\bes\b/.test(combined)) return 'Spanish';
    if (combined.includes('fre') || combined.includes('fra') || /\bfr\b/.test(combined)) return 'French';
    if (combined.includes('rus') || /\bru\b/.test(combined)) return 'Russian';
    if (combined.includes('ind') || /\bid\b/.test(combined)) return 'Indonesian';
    if (combined.includes('ara') || /\bar\b/.test(combined)) return 'Arabic';
    if (combined.includes('por') || /\bpt\b/.test(combined)) return 'Portuguese';
    if (combined.includes('ger') || combined.includes('deu') || /\bde\b/.test(combined)) return 'German';
    if (combined.includes('ita') || /\bit\b/.test(combined)) return 'Italian';
    return (rawName || rawLang).trim();
  }

  /**
   * Checks whether an HLS audio track matches the user's selected language.
   */
  private static matchesTargetLanguage(
    track: { name: string; language: string; friendly: string },
    targetLanguage?: string
  ): boolean {
    if (!targetLanguage || targetLanguage === 'Default') return false;
    const target = targetLanguage.toLowerCase().trim();
    const friendly = track.friendly.toLowerCase();
    const rawName = track.name.toLowerCase();
    const rawLang = track.language.toLowerCase();

    if (friendly === target || rawName === target || rawLang === target) return true;
    if (friendly.includes(target) || target.includes(friendly)) return true;
    if (rawName && (rawName.includes(target) || target.includes(rawName))) return true;

    const normalizedTarget = this.normalizeLanguageLabel(targetLanguage, targetLanguage).toLowerCase();
    if (normalizedTarget && friendly === normalizedTarget) return true;
    return false;
  }

  /**
   * Fast universal Master/Media HLS Playlist prober for both Android APK and Web Browser.
   * Extracts real available video qualities, bitrates, estimated MB sizes, and real #EXT-X-MEDIA:TYPE=AUDIO tracks.
   */
  public static async probeMasterPlaylist(
    m3u8Url: string,
    requestedDurationSec: number = 0
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
  } | null> {
    try {
      const rawMasterUrl = unwrapProxyUrl(m3u8Url);
      if (!rawMasterUrl) return null;

      if (NativeBridgeService.isRunningInKotlinApp()) {
        const nativeParsed = await NativeBridgeService.parseHlsManifestOnDevice(
          rawMasterUrl,
          {},
          requestedDurationSec
        );
        if (nativeParsed && nativeParsed.downloadQualities.length > 0) {
          return nativeParsed;
        }
      }

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(wrapProxyUrl(rawMasterUrl), { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return null;

      const text = await res.text();
      if (!text || !text.includes('#EXTM3U')) return null;

      const qualities: string[] = [];
      const qualityLinks: Record<string, string> = {};
      const bandwidthsByQuality: Record<string, number> = {};
      const audioTracks: string[] = [];

      const lines = text.split(/\r?\n/).map((l) => l.trim());

      // 1. Parse #EXT-X-MEDIA:TYPE=AUDIO
      for (const line of lines) {
        if (line.startsWith('#EXT-X-MEDIA:') && line.includes('TYPE=AUDIO')) {
          const nameMatch = line.match(/NAME="([^"]+)"/i) || line.match(/NAME=([^\s,]+)/i);
          const langMatch = line.match(/LANGUAGE="([^"]+)"/i) || line.match(/LANGUAGE=([^\s,]+)/i);
          const rawName = (nameMatch ? nameMatch[1] : '').trim();
          const rawLang = (langMatch ? langMatch[1] : '').trim();
          const friendly = this.normalizeLanguageLabel(rawName, rawLang);
          if (friendly && !audioTracks.includes(friendly)) {
            audioTracks.push(friendly);
          }
        }
      }

      // 2. Parse #EXT-X-STREAM-INF video variants
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
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
            if (lines[j] && !lines[j].startsWith('#')) {
              nextUrl = lines[j];
              break;
            }
          }

          if (nextUrl) {
            const resolvedUrl = resolveRelativeUrl(rawMasterUrl, nextUrl);
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

      // 3. Duration calculation
      let detectedDuration = requestedDurationSec > 0 ? requestedDurationSec : 0;
      if (text.includes('#EXTINF:')) {
        let segSum = 0;
        const extinfRegex = /#EXTINF:([\d.]+)/g;
        let eMatch: RegExpExecArray | null;
        while ((eMatch = extinfRegex.exec(text)) !== null) {
          segSum += parseFloat(eMatch[1]) || 0;
        }
        if (segSum > 5) {
          detectedDuration = Math.round(segSum);
        }
      }

      const finalDuration =
        detectedDuration > 0
          ? detectedDuration > 300
            ? detectedDuration
            : detectedDuration * 60
          : requestedDurationSec > 0
          ? requestedDurationSec > 300
            ? requestedDurationSec
            : requestedDurationSec * 60
          : 1440;

      if (qualities.length === 0) {
        qualities.push('1080p', '720p');
        qualityLinks['1080p'] = rawMasterUrl;
        qualityLinks['720p'] = rawMasterUrl;
      }

      const downloadQualities: {
        id: string;
        label: string;
        sizeMb: number;
        url: string;
        bandwidth: number;
      }[] = [];

      for (const q of qualities) {
        const url = qualityLinks[q] || rawMasterUrl;
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
        audioTracks,
        duration: finalDuration,
      };
    } catch {
      return null;
    }
  }

  /**
   * Resolves a Master Playlist to a specific quality video variant URL AND matching separate audio rendition URL (if any).
   */
  private static async resolveMediaPlaylist(
    masterUrl: string,
    targetQuality: string,
    targetLanguage: string,
    signal: AbortSignal
  ): Promise<{
    videoPlaylistUrl: string;
    audioPlaylistUrl: string | null;
    matchedAudioLabel: string;
  }> {
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

    // If it already has segments (#EXTINF), it IS a media playlist directly
    if (text.includes('#EXTINF:')) {
      return {
        videoPlaylistUrl: rawMasterUrl,
        audioPlaylistUrl: null,
        matchedAudioLabel: targetLanguage || 'Default',
      };
    }

    const lines = text.split(/\r?\n/).map((l) => l.trim());

    // 1. Parse all #EXT-X-MEDIA:TYPE=AUDIO renditions
    interface AudioRendition {
      groupId: string;
      name: string;
      language: string;
      friendly: string;
      uri: string;
      isDefault: boolean;
    }
    const audioRenditions: AudioRendition[] = [];

    for (const line of lines) {
      if (line.startsWith('#EXT-X-MEDIA:') && line.includes('TYPE=AUDIO')) {
        const groupMatch = line.match(/GROUP-ID="([^"]+)"/i) || line.match(/GROUP-ID=([^\s,]+)/i);
        const nameMatch = line.match(/NAME="([^"]+)"/i) || line.match(/NAME=([^\s,]+)/i);
        const langMatch = line.match(/LANGUAGE="([^"]+)"/i) || line.match(/LANGUAGE=([^\s,]+)/i);
        const uriMatch = line.match(/URI="([^"]+)"/i) || line.match(/URI=([^\s,]+)/i);
        const defMatch = line.match(/DEFAULT=(YES|TRUE)/i);

        const groupId = (groupMatch ? groupMatch[1] : '').trim();
        const rawName = (nameMatch ? nameMatch[1] : '').trim();
        const rawLang = (langMatch ? langMatch[1] : '').trim();
        const rawUri = (uriMatch ? uriMatch[1] : '').trim();
        const friendly = this.normalizeLanguageLabel(rawName, rawLang);

        audioRenditions.push({
          groupId,
          name: rawName,
          language: rawLang,
          friendly,
          uri: rawUri ? resolveRelativeUrl(rawMasterUrl, rawUri) : '',
          isDefault: Boolean(defMatch),
        });
      }
    }

    // 2. Parse #EXT-X-STREAM-INF video variants
    const variants: { height: number; bandwidth: number; audioGroup: string; url: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
        const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
        const audioGroupMatch = line.match(/AUDIO="([^"]+)"/i) || line.match(/AUDIO=([^\s,]+)/i);
        const height = resMatch ? parseInt(resMatch[2], 10) : 0;
        const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;
        const audioGroup = (audioGroupMatch ? audioGroupMatch[1] : '').trim();

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
            audioGroup,
            url: resolveRelativeUrl(rawMasterUrl, nextUri),
          });
        }
      }
    }

    if (variants.length === 0) {
      return {
        videoPlaylistUrl: rawMasterUrl,
        audioPlaylistUrl: null,
        matchedAudioLabel: targetLanguage || 'Default',
      };
    }

    // Pick closest height to targetQuality (e.g. if user requested 1080p on a series where Ep 5 maxes at 720p, automatically selects 720p)
    const reqHeight = parseInt(targetQuality.replace(/\D/g, ''), 10) || 720;
    variants.sort(
      (a, b) => Math.abs(a.height - reqHeight) - Math.abs(b.height - reqHeight)
    );
    const chosenVariant = variants[0];

    // 3. Resolve matching #EXT-X-MEDIA:TYPE=AUDIO rendition for targetLanguage
    let chosenAudio: AudioRendition | undefined;
    if (audioRenditions.length > 0) {
      const groupFiltered = chosenVariant.audioGroup
        ? audioRenditions.filter((a) => !a.groupId || a.groupId === chosenVariant.audioGroup)
        : audioRenditions;
      const pool = groupFiltered.length > 0 ? groupFiltered : audioRenditions;

      // Match user's selected language first
      chosenAudio =
        pool.find((a) => this.matchesTargetLanguage(a, targetLanguage)) ||
        audioRenditions.find((a) => this.matchesTargetLanguage(a, targetLanguage)) ||
        pool.find((a) => a.isDefault) ||
        pool[0];
    }

    return {
      videoPlaylistUrl: chosenVariant.url,
      audioPlaylistUrl: chosenAudio && chosenAudio.uri ? chosenAudio.uri : null,
      matchedAudioLabel: chosenAudio?.friendly || targetLanguage || 'Default',
    };
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
   * Downloads an HLS stream (including separate #EXT-X-MEDIA:TYPE=AUDIO track if selected) or direct MP4 file
   * with 6x parallel segment fetching and True Checkpoint Resume.
   */
  public static async downloadStream(
    storageKey: string,
    streamUrl: string,
    quality: string,
    onProgress: (info: HlsDownloadProgress) => void,
    language: string = 'Hindi'
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

      // HLS Stream Download Flow (Video Variant + Optional Separate Audio Rendition)
      const { videoPlaylistUrl, audioPlaylistUrl, matchedAudioLabel } =
        await this.resolveMediaPlaylist(cleanUrl, quality, language, signal);

      const { segments: videoSegments, totalDurationSec } = await this.parseSegments(
        videoPlaylistUrl,
        signal
      );

      if (videoSegments.length === 0) {
        throw new Error('No video segments found in HLS playlist');
      }

      let audioSegments: string[] = [];
      const canStoreSeparateAudio =
        !useNativeDisk || NativeBridgeService.supportsNativeAudioVault();

      if (audioPlaylistUrl && audioPlaylistUrl !== videoPlaylistUrl && canStoreSeparateAudio) {
        try {
          const parsedAudio = await this.parseSegments(audioPlaylistUrl, signal);
          if (parsedAudio.segments.length > 0) {
            audioSegments = parsedAudio.segments;
          }
        } catch (audioErr) {
          console.warn('[ClientHlsDownloader] Separate audio playlist fetch fallback:', audioErr);
        }
      }

      const totalVideoSegments = videoSegments.length;
      const totalAudioSegments = audioSegments.length;
      const totalSegments = totalVideoSegments + totalAudioSegments;

      let completedSegments = 0;
      let sessionDownloadedBytes = 0;

      // Check existing checkpoint on Native Disk for True Resume
      const alreadyDoneVideoSet = new Set<number>();
      const alreadyDoneAudioSet = new Set<number>();

      if (useNativeDisk) {
        const checkpoint = NativeBridgeService.getOfflineCheckpointInfoNative(storageKey);
        if (checkpoint && checkpoint.exists) {
          checkpoint.completedIndices.forEach((idx) => {
            if (idx >= 0 && idx < totalVideoSegments) {
              alreadyDoneVideoSet.add(idx);
            }
          });
          checkpoint.completedAudioIndices.forEach((idx) => {
            if (idx >= 0 && idx < totalAudioSegments) {
              alreadyDoneAudioSet.add(idx);
            }
          });
          completedSegments = alreadyDoneVideoSet.size + alreadyDoneAudioSet.size;
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

      // Build unified task items list: video segments first, or interleaved with audio segments
      interface SegmentJob {
        isAudio: boolean;
        segIndex: number;
        url: string;
      }
      const jobs: SegmentJob[] = [];
      for (let i = 0; i < totalVideoSegments; i++) {
        jobs.push({ isAudio: false, segIndex: i, url: videoSegments[i] });
      }
      for (let i = 0; i < totalAudioSegments; i++) {
        jobs.push({ isAudio: true, segIndex: i, url: audioSegments[i] });
      }

      // 6x parallel segment workers (optimal throughput without overwhelming mobile sockets)
      const CONCURRENCY = useNativeDisk ? 6 : 5;
      let nextJobIdx = 0;

      const worker = async () => {
        while (nextJobIdx < jobs.length) {
          if (signal.aborted) throw new Error('Download aborted');
          const job = jobs[nextJobIdx++];

          // Skip already checkpointed segments in 0ms!
          if (!job.isAudio && alreadyDoneVideoSet.has(job.segIndex)) {
            continue;
          }
          if (job.isAudio && alreadyDoneAudioSet.has(job.segIndex)) {
            continue;
          }

          let segBytes = 0;
          let success = false;

          for (let attempt = 0; attempt < 3; attempt++) {
            if (signal.aborted) throw new Error('Download aborted');
            try {
              if (useNativeDisk) {
                const diskRes = await NativeBridgeService.downloadSegmentToDiskNative(
                  storageKey,
                  job.segIndex,
                  unwrapProxyUrl(job.url),
                  '',
                  job.isAudio
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
                const resp = await fetch(wrapProxyUrl(job.url), { signal });
                if (!resp.ok) throw new Error(`Segment HTTP ${resp.status}`);
                const buf = await resp.arrayBuffer();
                if (buf && buf.byteLength > 0) {
                  const chunkKey = job.isAudio
                    ? `${storageKey}_aud_chunk_${job.segIndex}`
                    : `${storageKey}_chunk_${job.segIndex}`;
                  await putChunk(chunkKey, buf);
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
            throw new Error(
              `${job.isAudio ? 'Audio' : 'Video'} segment ${job.segIndex} failed after retries`
            );
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
        { length: Math.min(CONCURRENCY, jobs.length) },
        () => worker()
      );
      await Promise.all(workers);

      if (useNativeDisk) {
        NativeBridgeService.saveOfflineManifestNative(
          storageKey,
          totalVideoSegments,
          totalDurationSec,
          false,
          totalAudioSegments,
          matchedAudioLabel || language
        );
      } else {
        await putChunk(`${storageKey}_totalChunks`, totalVideoSegments);
        await putChunk(`${storageKey}_totalAudioChunks`, totalAudioSegments);
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
   * - In Web Browser: Builds an in-memory HLS `.m3u8` Blob playlist (including separate audio track if present) over IndexedDB segment blobs.
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

      // Multi-segment HLS stream in Browser IndexedDB
      const totalDurationSec = (await getChunk<number>(`${storageKey}_durationSec`)) || totalChunks * 4;
      const totalAudioChunks = (await getChunk<number>(`${storageKey}_totalAudioChunks`)) || 0;
      const avgDur = Math.max(1.5, Math.min(12, totalDurationSec / totalChunks));
      const targetDur = Math.ceil(avgDur + 2);
      const createdUrls: string[] = [];

      const videoM3u8Lines: string[] = [
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
          videoM3u8Lines.push(`#EXTINF:${avgDur.toFixed(3)},`);
          videoM3u8Lines.push(segUrl);
        }
      }

      if (createdUrls.length === 0) return null;
      videoM3u8Lines.push('#EXT-X-ENDLIST');

      const videoPlaylistBlob = new Blob([videoM3u8Lines.join('\n')], {
        type: 'application/vnd.apple.mpegurl',
      });
      const videoPlaylistUrl = URL.createObjectURL(videoPlaylistBlob);
      createdUrls.push(videoPlaylistUrl);

      // If separate audio rendition chunks exist, build audio playlist blob + Master playlist blob
      if (totalAudioChunks > 0) {
        const avgAudDur = Math.max(1.5, Math.min(12, totalDurationSec / totalAudioChunks));
        const audTargetDur = Math.ceil(avgAudDur + 2);
        const audioM3u8Lines: string[] = [
          '#EXTM3U',
          '#EXT-X-VERSION:3',
          `#EXT-X-TARGETDURATION:${audTargetDur}`,
          '#EXT-X-MEDIA-SEQUENCE:0',
          '#EXT-X-PLAYLIST-TYPE:VOD',
        ];
        let addedAudio = 0;
        for (let i = 0; i < totalAudioChunks; i++) {
          const audChunk = await getChunk<ArrayBuffer>(`${storageKey}_aud_chunk_${i}`);
          if (audChunk) {
            const audBlob = new Blob([audChunk], { type: 'video/mp2t' });
            const audUrl = URL.createObjectURL(audBlob);
            createdUrls.push(audUrl);
            audioM3u8Lines.push(`#EXTINF:${avgAudDur.toFixed(3)},`);
            audioM3u8Lines.push(audUrl);
            addedAudio++;
          }
        }
        if (addedAudio > 0) {
          audioM3u8Lines.push('#EXT-X-ENDLIST');
          const audioPlaylistBlob = new Blob([audioM3u8Lines.join('\n')], {
            type: 'application/vnd.apple.mpegurl',
          });
          const audioPlaylistUrl = URL.createObjectURL(audioPlaylistBlob);
          createdUrls.push(audioPlaylistUrl);

          const masterLines = [
            '#EXTM3U',
            '#EXT-X-VERSION:3',
            `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="offline_audio",NAME="Selected Audio",DEFAULT=YES,AUTOSELECT=YES,URI="${audioPlaylistUrl}"`,
            '#EXT-X-STREAM-INF:BANDWIDTH=2000000,AUDIO="offline_audio"',
            videoPlaylistUrl,
          ];
          const masterBlob = new Blob([masterLines.join('\n')], {
            type: 'application/vnd.apple.mpegurl',
          });
          const masterUrl = URL.createObjectURL(masterBlob);
          createdUrls.push(masterUrl);
          this.activeBlobUrls.set(storageKey, createdUrls);
          return masterUrl;
        }
      }

      this.activeBlobUrls.set(storageKey, createdUrls);
      return videoPlaylistUrl;
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
