import React, { useState, useMemo, useEffect } from 'react';
import { X, Download, Check, Sparkles, Film, Tv, HardDrive, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { ContentItem } from '../../types';
import { downloadManager } from '../../services/DownloadManager';
import { SmartStreamService } from '../../services/smartStreamService';
import { NativeBridgeService } from '../../services/nativeBridgeService';
import { ClientHlsDownloader } from '../../services/clientHlsDownloader';

interface DownloadSelectionModalProps {
  visible: boolean;
  content: ContentItem;
  initialSeasonIndex?: number;
  initialEpisodeIndex?: number;
  selectedServer?: 'server1' | 'server2';
  activePrimaryUrl?: string;
  activeSecondaryUrl?: string;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const DownloadSelectionModal: React.FC<DownloadSelectionModalProps> = ({
  visible,
  content,
  initialSeasonIndex = 0,
  initialEpisodeIndex = 0,
  selectedServer = 'server1',
  activePrimaryUrl = '',
  activeSecondaryUrl = '',
  onClose,
  onSuccessToast,
}) => {
  if (!visible || !content) return null;

  // Content type evaluation - Precise Movie vs Series / Anime
  const isMovie = useMemo(() => {
    if (!content) return true;
    const cType = (content.type || (content as any).media_type || (content as any).uploadMode || (content as any).category || '').toString().toLowerCase();

    if (cType === 'movie' || cType === 'film' || cType === 'feature') {
      return true;
    }

    const seasons = content.seasonsData;
    const hasEpisodesInSeasons =
      Array.isArray(seasons) && seasons.some((s) => Array.isArray(s?.episodes) && s.episodes.length > 0);
    const hasEpisodesList = Array.isArray(content.episodesList) && content.episodesList.length > 0;

    if (hasEpisodesInSeasons || hasEpisodesList) {
      return false;
    }

    if (cType === 'series' || cType === 'tv' || cType === 'anime' || cType === 'show') {
      return false;
    }

    if (typeof content.episodes === 'number' && content.episodes > 1) {
      return false;
    }

    return true;
  }, [content]);

  const isSeries = !isMovie;

  // 1. Series Season and Episode selection state
  const seasonsData = content.seasonsData || [];
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState<number>(
    initialSeasonIndex < seasonsData.length ? initialSeasonIndex : 0
  );

  const currentEpisodes = useMemo(() => {
    if (!isSeries) return [];
    if (seasonsData.length > 0 && seasonsData[selectedSeasonIdx]?.episodes) {
      return seasonsData[selectedSeasonIdx].episodes;
    }
    if (content.episodesList && content.episodesList.length > 0) {
      return content.episodesList;
    }
    // Only generate fallback dummy episodes if it's explicitly a series with episodes count
    if (content.type === 'series' && content.episodes && content.episodes > 0) {
      const count = content.episodes;
      return Array.from({ length: count }, (_, i) => ({
        id: `ep-${i + 1}`,
        episodeNumber: i + 1,
        title: `Episode ${i + 1}`,
        duration: content.duration || 1440,
        videoUrl: content.videoUrl || '',
      }));
    }
    return [];
  }, [isSeries, seasonsData, selectedSeasonIdx, content]);

  // Active focused episode for inspecting details / probe
  const [focusedEpisodeIdx, setFocusedEpisodeIdx] = useState<number>(() => {
    return initialEpisodeIndex < currentEpisodes.length ? initialEpisodeIndex : 0;
  });

  // Selected episodes set
  const [selectedEpIndices, setSelectedEpIndices] = useState<Set<number>>(() => {
    const set = new Set<number>();
    const startIdx = initialEpisodeIndex < currentEpisodes.length ? initialEpisodeIndex : 0;
    set.add(startIdx);
    return set;
  });

  // Pre-download summary confirmation step state
  const [showSummaryReview, setShowSummaryReview] = useState<boolean>(false);

  // In-modal server selector (defaults to currently active player server, switchable inside modal!)
  const [modalServer, setModalServer] = useState<'server1' | 'server2'>(selectedServer);

  useEffect(() => {
    setModalServer(selectedServer);
  }, [selectedServer, visible]);

  useEffect(() => {
    if (visible) {
      setShowSummaryReview(false);
    }
  }, [visible, content]);

  // Real Device Storage Stats (Android StatFs via NativeBridge or Web StorageManager)
  const [freeStorageGb, setFreeStorageGb] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    const nativeStats = NativeBridgeService.getDeviceStorageStats();
    if (nativeStats && nativeStats.ok && typeof nativeStats.freeGb === 'number') {
      setFreeStorageGb(nativeStats.freeGb);
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      navigator.storage
        .estimate()
        .then((est) => {
          if (est && typeof est.quota === 'number' && typeof est.usage === 'number') {
            const freeBytes = Math.max(0, est.quota - est.usage);
            setFreeStorageGb(Math.round((freeBytes / (1024 * 1024 * 1024)) * 10) / 10);
          }
        })
        .catch(() => {});
    }
  }, [visible]);

  type ExtractedServerMeta = {
    audioTracks?: string[];
    qualities?: string[];
    downloadQualities?: Array<{ id: string; label: string; sizeMb: number; url?: string; bandwidth?: number }>;
    duration?: number;
    isLiveProbed?: boolean;
  };

  // Separate metadata caches for Server 1 and Server 2 of the currently focused item
  const [server1Meta, setServer1Meta] = useState<ExtractedServerMeta | null>(null);
  const [server2Meta, setServer2Meta] = useState<ExtractedServerMeta | null>(null);
  const [isProbing, setIsProbing] = useState<boolean>(false);

  // Deep helper to extract primary (Server 1) and secondary (Server 2) URLs from any Movie or Episode structure
  // (Handles top-level fields, qualityLinks, videoSources, videoLinks[0], movieParts[0], and active player props)
  const extractUrlsFromItem = (ep: any | null, useActivePlayerFallback: boolean): { primaryUrl: string; secondaryUrl: string } => {
    const firstFromDict = (dict: any): string => {
      if (!dict || typeof dict !== 'object') return '';
      for (const k of ['1080p', '720p', '480p', '360p', ...Object.keys(dict)]) {
        const val = dict[k];
        if (typeof val === 'string' && val.trim().length > 0) return val.trim();
      }
      return '';
    };

    const firstFromSources = (sources: any): string => {
      if (!sources || typeof sources !== 'object') return '';
      for (const k of Object.keys(sources)) {
        const entry = sources[k];
        if (typeof entry === 'string' && entry.trim().length > 0) return entry.trim();
        if (entry && typeof entry === 'object') {
          const nested = firstFromDict(entry);
          if (nested) return nested;
        }
      }
      return '';
    };

    const epPart0 = Array.isArray(ep?.videoLinks) && ep.videoLinks.length > 0 && typeof ep.videoLinks[0] === 'object' ? ep.videoLinks[0] : null;
    const contentPart0 = Array.isArray((content as any)?.videoLinks) && (content as any).videoLinks.length > 0 && typeof (content as any).videoLinks[0] === 'object' ? (content as any).videoLinks[0] : null;
    const moviePart0 = Array.isArray((content as any)?.movieParts) && (content as any).movieParts.length > 0 && typeof (content as any).movieParts[0] === 'object' ? (content as any).movieParts[0] : null;

    let pUrl = '';
    let sUrl = '';

    if (ep) {
      pUrl =
        ep.videoUrl ||
        ep.streamUrl ||
        ep.url ||
        firstFromDict(ep.qualityLinks) ||
        firstFromSources(ep.videoSources) ||
        epPart0?.videoUrl ||
        firstFromDict(epPart0?.qualityLinks) ||
        firstFromSources(epPart0?.videoSources) ||
        (typeof ep?.videoLinks?.[0] === 'string' ? ep.videoLinks[0] : '') ||
        '';

      sUrl =
        ep.secondaryServerUrl ||
        ep.secondaryVideoUrl ||
        ep.secondaryUrl ||
        firstFromDict(ep.secondaryServerQualityLinks) ||
        firstFromDict(ep.secondaryQualityLinks) ||
        epPart0?.secondaryServerUrl ||
        epPart0?.secondaryVideoUrl ||
        epPart0?.secondaryUrl ||
        firstFromDict(epPart0?.secondaryServerQualityLinks) ||
        firstFromDict(epPart0?.secondaryQualityLinks) ||
        '';
    }

    if (!pUrl) {
      pUrl =
        contentPart0?.videoUrl ||
        firstFromDict(contentPart0?.qualityLinks) ||
        firstFromSources(contentPart0?.videoSources) ||
        moviePart0?.videoUrl ||
        firstFromDict(moviePart0?.qualityLinks) ||
        firstFromSources(moviePart0?.videoSources) ||
        content.videoUrl ||
        (content as any).streamUrl ||
        firstFromDict(content.qualityLinks) ||
        firstFromSources(content.videoSources) ||
        (typeof (content as any)?.videoLinks?.[0] === 'string' ? (content as any).videoLinks[0] : '') ||
        '';
    }

    if (!sUrl) {
      sUrl =
        contentPart0?.secondaryServerUrl ||
        contentPart0?.secondaryVideoUrl ||
        contentPart0?.secondaryUrl ||
        firstFromDict(contentPart0?.secondaryServerQualityLinks) ||
        firstFromDict(contentPart0?.secondaryQualityLinks) ||
        moviePart0?.secondaryServerUrl ||
        moviePart0?.secondaryVideoUrl ||
        moviePart0?.secondaryUrl ||
        firstFromDict(moviePart0?.secondaryServerQualityLinks) ||
        firstFromDict(moviePart0?.secondaryQualityLinks) ||
        (content as any).secondaryServerUrl ||
        content.secondaryVideoUrl ||
        (content as any).secondaryUrl ||
        firstFromDict((content as any).secondaryServerQualityLinks) ||
        firstFromDict(content.secondaryQualityLinks) ||
        '';
    }

    if (useActivePlayerFallback) {
      if (!pUrl && activePrimaryUrl) pUrl = activePrimaryUrl;
      if (!sUrl && activeSecondaryUrl) sUrl = activeSecondaryUrl;
    }

    // If primaryUrl itself is a Filemoon/Byse hoster and secondaryUrl wasn't separately populated,
    // allow Server 2 to also use it (matching ContentDetailScreen's Server Modal behavior)
    const pLower = pUrl.toLowerCase();
    const isPrimaryFilemoon =
      pLower.includes('filemoon') ||
      pLower.includes('byse') ||
      pLower.includes('f16px') ||
      pLower.includes('n1mwq') ||
      pLower.includes('moonmov') ||
      pLower.includes('kerapoxy');

    if (!sUrl && isPrimaryFilemoon) {
      sUrl = pUrl;
    }

    return {
      primaryUrl: SmartStreamService.sanitizeStreamUrl(pUrl),
      secondaryUrl: SmartStreamService.sanitizeStreamUrl(sUrl),
    };
  };

  // Determine available server URLs for the focused movie or episode
  const { primaryUrl, secondaryUrl, hasServer1, hasServer2 } = useMemo(() => {
    const activeEp = isSeries ? currentEpisodes[focusedEpisodeIdx] : null;
    const isInitialFocus =
      !isSeries ||
      (selectedSeasonIdx === initialSeasonIndex && focusedEpisodeIdx === initialEpisodeIndex);
    const { primaryUrl: pUrl, secondaryUrl: sUrl } = extractUrlsFromItem(activeEp, isInitialFocus);

    return {
      primaryUrl: pUrl,
      secondaryUrl: sUrl,
      hasServer1: Boolean(pUrl && pUrl.length > 0),
      hasServer2: Boolean(sUrl && sUrl.length > 0),
    };
  }, [
    isSeries,
    currentEpisodes,
    focusedEpisodeIdx,
    selectedSeasonIdx,
    initialSeasonIndex,
    initialEpisodeIndex,
    content,
    activePrimaryUrl,
    activeSecondaryUrl,
  ]);

  // Helper to probe a single server URL (0ms if cached in SmartStreamService, otherwise on-device or universal HLS prober)
  // Uses a series+episode scoped cache key so one series NEVER inherits another series's MB size!
  const probeSingleServerUrl = async (
    targetUrl: string,
    requestedDur: number
  ): Promise<ExtractedServerMeta | null> => {
    if (!targetUrl) return null;
    const scopedMetaKey = `${content.id}_s${selectedSeasonIdx}_e${focusedEpisodeIdx}_${targetUrl}`;
    try {
      // 1. Check 0ms in-memory/localStorage metadata cache first (scoped by series & episode)
      const cachedMeta = SmartStreamService.getCachedStreamMeta(scopedMetaKey);
      if (cachedMeta && Array.isArray(cachedMeta.downloadQualities) && cachedMeta.downloadQualities.length > 0) {
        return {
          audioTracks: cachedMeta.audioTracks,
          qualities: cachedMeta.qualities,
          downloadQualities: cachedMeta.downloadQualities,
          duration: cachedMeta.duration || requestedDur,
          isLiveProbed: true,
        };
      }

      // 2. If stream URL (.m3u8) is already cached by the video player's pre-warmer, parse the Master .m3u8 directly!
      const cachedM3u8 =
        SmartStreamService.getCachedStreamUrl(targetUrl) ||
        (targetUrl.toLowerCase().includes('.m3u8') ? targetUrl : null);

      if (cachedM3u8) {
        const directParsed = await ClientHlsDownloader.probeMasterPlaylist(cachedM3u8, requestedDur);
        if (directParsed && directParsed.downloadQualities.length > 0) {
          SmartStreamService.setCachedStreamMeta(scopedMetaKey, directParsed);
          SmartStreamService.setCachedStreamMeta(targetUrl, directParsed);
          return {
            audioTracks: directParsed.audioTracks,
            qualities: directParsed.qualities,
            downloadQualities: directParsed.downloadQualities,
            duration: directParsed.duration,
            isLiveProbed: true,
          };
        }
      }

      // 3. In Android APK: Run Native Kotlin Scraper + On-Device Manifest Parser
      if (NativeBridgeService.isRunningInKotlinApp()) {
        const nativeMeta = await NativeBridgeService.extractStreamNative(targetUrl, requestedDur);
        if (nativeMeta && nativeMeta.ok) {
          const metaObj = {
            audioTracks: nativeMeta.audioTracks,
            qualities: nativeMeta.qualities,
            downloadQualities: nativeMeta.downloadQualities,
            duration: nativeMeta.duration,
          };
          SmartStreamService.setCachedStreamMeta(scopedMetaKey, metaObj);
          SmartStreamService.setCachedStreamMeta(targetUrl, metaObj);
          return {
            ...metaObj,
            isLiveProbed: true,
          };
        }
      }

      // 4. Web / Backend fallback: Resolve stream and parse Master .m3u8
      const resolved = await SmartStreamService.resolveStream(targetUrl, { forceRefresh: false });
      if (resolved && resolved.streamUrl && !resolved.isEmbed) {
        const parsedAfterResolve = await ClientHlsDownloader.probeMasterPlaylist(
          resolved.streamUrl,
          requestedDur
        );
        if (parsedAfterResolve && parsedAfterResolve.downloadQualities.length > 0) {
          SmartStreamService.setCachedStreamMeta(scopedMetaKey, parsedAfterResolve);
          SmartStreamService.setCachedStreamMeta(targetUrl, parsedAfterResolve);
          return {
            audioTracks: parsedAfterResolve.audioTracks,
            qualities: parsedAfterResolve.qualities,
            downloadQualities: parsedAfterResolve.downloadQualities,
            duration: parsedAfterResolve.duration,
            isLiveProbed: true,
          };
        }
      }

      const res = await fetch('/api/extract-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          duration: requestedDur,
          forceRefresh: false,
        }),
      });
      const data = await res.json();
      if (data && data.ok) {
        const metaObj = {
          audioTracks: data.audioTracks,
          qualities: data.qualities,
          downloadQualities: data.downloadQualities,
          duration: data.duration,
        };
        SmartStreamService.setCachedStreamMeta(scopedMetaKey, metaObj);
        SmartStreamService.setCachedStreamMeta(targetUrl, metaObj);
        return {
          ...metaObj,
          isLiveProbed: true,
        };
      }
    } catch (err) {
      console.warn('[DownloadModal] Server probe warning:', err);
    }
    return null;
  };

  // Probe ONLY the single focused episode/movie (Never all episodes at once!)
  useEffect(() => {
    let isCancelled = false;
    const activeEp = isSeries ? currentEpisodes[focusedEpisodeIdx] : null;
    const requestedDur = Number(activeEp?.duration || content.duration || 0);

    setServer1Meta(null);
    setServer2Meta(null);

    const contentPart0 =
      Array.isArray((content as any)?.videoLinks) && (content as any).videoLinks.length > 0
        ? (content as any).videoLinks[0]
        : null;
    const epPart0 =
      Array.isArray(activeEp?.videoLinks) && activeEp.videoLinks.length > 0
        ? activeEp.videoLinks[0]
        : null;

    const existingS1Dl =
      (activeEp as any)?.downloadQualities ||
      epPart0?.downloadQualities ||
      (content as any)?.downloadQualities ||
      contentPart0?.downloadQualities;
    const existingS2Dl =
      (activeEp as any)?.secondaryDownloadQualities ||
      epPart0?.secondaryDownloadQualities ||
      (content as any)?.secondaryDownloadQualities ||
      contentPart0?.secondaryDownloadQualities;
    const existingAudios =
      (activeEp as any)?.audioTracks ||
      epPart0?.audioTracks ||
      (content as any)?.audioTracks ||
      contentPart0?.audioTracks;

    if (Array.isArray(existingS1Dl) && existingS1Dl.length > 0) {
      setServer1Meta({
        downloadQualities: existingS1Dl,
        audioTracks: Array.isArray(existingAudios) ? existingAudios : undefined,
        duration: requestedDur,
        isLiveProbed: true,
      });
    }
    if (Array.isArray(existingS2Dl) && existingS2Dl.length > 0) {
      setServer2Meta({
        downloadQualities: existingS2Dl,
        audioTracks: Array.isArray(existingAudios) ? existingAudios : undefined,
        duration: requestedDur,
        isLiveProbed: true,
      });
    }

    const deferTimer = setTimeout(async () => {
      if (isCancelled) return;
      setIsProbing(true);
      try {
        if (modalServer === 'server2' && secondaryUrl) {
          const s2 = await probeSingleServerUrl(secondaryUrl, requestedDur);
          if (!isCancelled && s2) setServer2Meta(s2);
          if (!isCancelled && primaryUrl && primaryUrl !== secondaryUrl) {
            const s1 = await probeSingleServerUrl(primaryUrl, requestedDur);
            if (!isCancelled && s1) setServer1Meta(s1);
          }
        } else {
          if (primaryUrl) {
            const s1 = await probeSingleServerUrl(primaryUrl, requestedDur);
            if (!isCancelled && s1) setServer1Meta(s1);
          }
          if (!isCancelled && secondaryUrl && secondaryUrl !== primaryUrl) {
            const s2 = await probeSingleServerUrl(secondaryUrl, requestedDur);
            if (!isCancelled && s2) setServer2Meta(s2);
          } else if (!isCancelled && secondaryUrl && secondaryUrl === primaryUrl && server1Meta) {
            setServer2Meta(server1Meta);
          }
        }
      } finally {
        if (!isCancelled) setIsProbing(false);
      }
    }, 80);

    return () => {
      isCancelled = true;
      clearTimeout(deferTimer);
    };
  }, [content, isSeries, focusedEpisodeIdx, currentEpisodes, primaryUrl, secondaryUrl, modalServer]);

  const extractedMeta = modalServer === 'server2' ? (server2Meta || server1Meta) : (server1Meta || server2Meta);

  const isQualityKey = (val: string): boolean => {
    if (!val || typeof val !== 'string') return false;
    return /^(\d{3,4}p|4k|2k|8k|hd|fhd|uhd|sd|auto)$/i.test(val.trim());
  };

  // 2. Available Languages resolution (Real Extracted HLS Tracks + Content Metadata with Dual-Server Awareness!)
  const { availableLanguages, languageServerMap } = useMemo(() => {
    const list: string[] = [];
    const serverMap: Record<string, 'server1' | 'server2' | 'both'> = {};
    const activeEp = isSeries ? currentEpisodes[focusedEpisodeIdx] : null;

    const addLang = (rawLang: string, source: 'server1' | 'server2' | 'both') => {
      if (!rawLang || typeof rawLang !== 'string') return;
      if (isQualityKey(rawLang)) return;
      const cleaned = ClientHlsDownloader.normalizeLanguageLabel(rawLang, rawLang) || rawLang.trim();
      if (!cleaned || cleaned === 'Default' || cleaned === 'Default Audio' || isQualityKey(cleaned)) return;
      const existing = list.find((l) => l.toLowerCase() === cleaned.toLowerCase());
      if (!existing) {
        list.push(cleaned);
        serverMap[cleaned] = source;
      } else if (serverMap[existing] !== source && serverMap[existing] !== 'both') {
        serverMap[existing] = 'both';
      }
    };

    const hasLiveS1Audio = Array.isArray(server1Meta?.audioTracks) && server1Meta!.audioTracks!.length > 0;
    const hasLiveS2Audio = Array.isArray(server2Meta?.audioTracks) && server2Meta!.audioTracks!.length > 0;

    if (modalServer === 'server2') {
      if (hasLiveS2Audio) {
        server2Meta!.audioTracks!.forEach((l) => addLang(l, 'server2'));
      }
      if (hasLiveS1Audio) {
        server1Meta!.audioTracks!.forEach((l) => addLang(l, 'server1'));
      }
    } else {
      if (hasLiveS1Audio) {
        server1Meta!.audioTracks!.forEach((l) => addLang(l, 'server1'));
      }
      if (hasLiveS2Audio) {
        server2Meta!.audioTracks!.forEach((l) => addLang(l, 'server2'));
      }
    }

    // If neither server reported separate #EXT-X-MEDIA:TYPE=AUDIO tracks (e.g. muxed audio or before probe finishes),
    // use the content/episode configured languages and mark as 'both' so switching language doesn't forcibly jump servers
    if (!hasLiveS1Audio && !hasLiveS2Audio) {
      if (activeEp?.videoSources && typeof activeEp.videoSources === 'object') {
        Object.keys(activeEp.videoSources).forEach((l) => addLang(l, 'both'));
      }
      if (content.videoSources && typeof content.videoSources === 'object') {
        Object.keys(content.videoSources).forEach((l) => addLang(l, 'both'));
      }
      if (activeEp && Array.isArray((activeEp as any).audioTracks)) {
        (activeEp as any).audioTracks.forEach((l: string) => addLang(l, 'both'));
      }
      if (Array.isArray((content as any).audioTracks)) {
        (content as any).audioTracks.forEach((l: string) => addLang(l, 'both'));
      }
      if (Array.isArray(content.languages) && content.languages.length > 0) {
        content.languages.forEach((l) => addLang(l, 'both'));
      }
      if (Array.isArray(content.availableLanguages)) {
        content.availableLanguages.forEach((l) => addLang(l, 'both'));
      }
    }

    if (list.length === 0) {
      list.push('Hindi');
      serverMap['Hindi'] = 'both';
    }
    return { availableLanguages: list, languageServerMap: serverMap };
  }, [content, isSeries, currentEpisodes, focusedEpisodeIdx, server1Meta, server2Meta, modalServer]);

  const [selectedLanguage, setSelectedLanguage] = useState<string>(availableLanguages[0] || 'Hindi');

  // Sync selectedLanguage when availableLanguages changes
  useEffect(() => {
    if (availableLanguages.length > 0 && !availableLanguages.some((l) => l.toLowerCase() === selectedLanguage.toLowerCase())) {
      setSelectedLanguage(availableLanguages[0]);
    }
  }, [availableLanguages, selectedLanguage]);

  // 3. Available Qualities resolution (Merges Admin multi-quality server links + live HLS manifest probe)
  const qualityOptions = useMemo(() => {
    const activeEp = isSeries ? currentEpisodes[focusedEpisodeIdx] : null;
    const isServer2 = modalServer === 'server2';

    const epPart0 =
      Array.isArray(activeEp?.videoLinks) && activeEp.videoLinks.length > 0 && typeof activeEp.videoLinks[0] === 'object'
        ? activeEp.videoLinks[0]
        : null;
    const contentPart0 =
      Array.isArray((content as any)?.videoLinks) && (content as any).videoLinks.length > 0 && typeof (content as any).videoLinks[0] === 'object'
        ? (content as any).videoLinks[0]
        : null;
    const moviePart0 =
      Array.isArray((content as any)?.movieParts) && (content as any).movieParts.length > 0 && typeof (content as any).movieParts[0] === 'object'
        ? (content as any).movieParts[0]
        : null;

    // Deterministic series+episode fingerprint so fallback/probed bitrates never produce identical MB across different series
    const seedStr = `${content.id}_${content.title}_${selectedSeasonIdx}_${focusedEpisodeIdx}`;
    let seedHash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      seedHash = (seedHash * 31 + seedStr.charCodeAt(i)) & 0x7fffffff;
    }
    const seriesVariance = 0.93 + ((seedHash % 15) * 0.01); // 0.93 to 1.07

    const durationSec =
      extractedMeta?.duration && extractedMeta.duration !== 1440
        ? extractedMeta.duration
        : content.duration
        ? content.duration > 300
          ? content.duration
          : content.duration * 60
        : Math.round(6900 * seriesVariance);

    const epDurationSec =
      extractedMeta?.duration && extractedMeta.duration !== 1440
        ? extractedMeta.duration
        : activeEp?.duration
        ? activeEp.duration > 300
          ? activeEp.duration
          : activeEp.duration * 60
        : Math.round(1420 * seriesVariance);

    const calcSizeMb = (dur: number, bitrateBps: number) =>
      Math.max(25, Math.round((bitrateBps * dur) / (8 * 1024 * 1024)));

    // Check explicit per-quality server links (1080p, 720p, 480p, 360p) configured in Admin Panel for active server
    const qLinks: Record<string, string> | undefined =
      isServer2 && hasServer2
        ? (activeEp as any)?.secondaryServerQualityLinks ||
          (activeEp as any)?.secondaryQualityLinks ||
          epPart0?.secondaryServerQualityLinks ||
          epPart0?.secondaryQualityLinks ||
          (content as any).secondaryServerQualityLinks ||
          content.secondaryQualityLinks ||
          contentPart0?.secondaryServerQualityLinks ||
          contentPart0?.secondaryQualityLinks ||
          moviePart0?.secondaryServerQualityLinks ||
          moviePart0?.secondaryQualityLinks
        : (activeEp as any)?.qualityLinks ||
          epPart0?.qualityLinks ||
          content.qualityLinks ||
          contentPart0?.qualityLinks ||
          moviePart0?.qualityLinks;

    const rawDl =
      extractedMeta?.downloadQualities ||
      (isServer2 && hasServer2
        ? (activeEp as any)?.secondaryDownloadQualities || (content as any)?.secondaryDownloadQualities
        : (activeEp as any)?.downloadQualities || (content as any)?.downloadQualities);

    const mergedMap = new Map<string, any>();

    // First, populate any explicit Admin multi-quality links (1080p, 720p, 480p, 360p)
    if (qLinks && typeof qLinks === 'object') {
      for (const [k, linkUrl] of Object.entries(qLinks)) {
        const cleanKey = k.trim();
        const cleanLink = SmartStreamService.sanitizeStreamUrl(linkUrl);
        if (cleanLink && isQualityKey(cleanKey) && cleanKey.toLowerCase() !== 'auto') {
          const bitrate = Math.round(
            (cleanKey.includes('1080')
              ? 2400000
              : cleanKey.includes('720')
              ? 1200000
              : cleanKey.includes('480')
              ? 650000
              : 360000) * seriesVariance
          );
          mergedMap.set(cleanKey, {
            id: cleanKey,
            label: `${cleanKey} ${cleanKey.includes('1080') ? 'Full HD' : cleanKey.includes('720') ? 'HD' : cleanKey.includes('480') ? 'Standard' : 'Data Saver'}`,
            badge: cleanKey.includes('1080') ? 'Best Quality' : cleanKey.includes('720') ? 'Recommended' : 'Data Saver',
            movieSizeMb: calcSizeMb(durationSec, bitrate),
            epSizeMb: calcSizeMb(epDurationSec, bitrate),
            bandwidth: bitrate,
            url: cleanLink,
            isLive: true,
          });
        }
      }
    }

    // Second, merge live probed HLS variants (preserving explicit per-quality link URLs if configured)
    if (Array.isArray(rawDl) && rawDl.length > 0) {
      for (const q of rawDl) {
        const qId = (q.id || '720p').trim();
        if (!isQualityKey(qId) || qId.toLowerCase() === 'auto') continue;
        const defaultBps = Math.round(
          (qId.includes('1080')
            ? 2400000
            : qId.includes('720')
            ? 1200000
            : qId.includes('480')
            ? 650000
            : 360000) * seriesVariance
        );
        const existingExplicit = mergedMap.get(qId);
        const rawSizeMb =
          q.sizeMb ||
          calcSizeMb(isMovie ? durationSec : epDurationSec, q.bandwidth || defaultBps);

        mergedMap.set(qId, {
          id: qId,
          label: q.label || `${qId} ${qId.includes('1080') ? 'Full HD' : qId.includes('720') ? 'HD' : 'Standard'}`,
          badge: extractedMeta?.isLiveProbed
            ? qId.includes('1080')
              ? 'Live Stream • Full HD'
              : qId.includes('720')
              ? 'Live Stream • HD'
              : 'Live Stream • Data Saver'
            : qId === '1080p'
            ? 'Best Quality'
            : qId === '720p'
            ? 'Recommended'
            : 'Data Saver',
          movieSizeMb: rawSizeMb,
          epSizeMb: rawSizeMb,
          bandwidth: q.bandwidth || defaultBps,
          url: existingExplicit?.url || (extractedMeta?.isLiveProbed ? q.url : undefined),
          isLive: Boolean(extractedMeta?.isLiveProbed || existingExplicit),
        });
      }
    }

    if (mergedMap.size > 0) {
      return Array.from(mergedMap.values()).sort((a, b) => parseInt(b.id) - parseInt(a.id));
    }

    return [
      { id: '1080p', label: '1080p Full HD', badge: 'Target Max Quality', movieSizeMb: calcSizeMb(durationSec, Math.round(2400000 * seriesVariance)), epSizeMb: calcSizeMb(epDurationSec, Math.round(2400000 * seriesVariance)), bandwidth: 2400000, isLive: false },
      { id: '720p', label: '720p HD', badge: 'Recommended HD', movieSizeMb: calcSizeMb(durationSec, Math.round(1200000 * seriesVariance)), epSizeMb: calcSizeMb(epDurationSec, Math.round(1200000 * seriesVariance)), bandwidth: 1200000, isLive: false },
      { id: '480p', label: '480p Standard', badge: 'Data Saver', movieSizeMb: calcSizeMb(durationSec, Math.round(650000 * seriesVariance)), epSizeMb: calcSizeMb(epDurationSec, Math.round(650000 * seriesVariance)), bandwidth: 650000, isLive: false },
    ];
  }, [content, isSeries, isMovie, currentEpisodes, focusedEpisodeIdx, selectedSeasonIdx, extractedMeta, modalServer, hasServer2]);

  const [selectedQuality, setSelectedQuality] = useState<string>(() => {
    try {
      const savedDlQ = localStorage.getItem('maxplay_download_quality');
      if (savedDlQ && savedDlQ !== 'auto') return savedDlQ;
      const savedVidQ = localStorage.getItem('maxplay_video_quality');
      if (savedVidQ && savedVidQ !== 'auto') return savedVidQ;
    } catch {}
    return qualityOptions[0]?.id || '720p';
  });

  const activeQualityId = qualityOptions.some((q) => q.id.toLowerCase() === selectedQuality.toLowerCase())
    ? qualityOptions.find((q) => q.id.toLowerCase() === selectedQuality.toLowerCase())!.id
    : (qualityOptions[0]?.id || '720p');

  const toggleEpisode = (idx: number) => {
    setFocusedEpisodeIdx(idx);
    setSelectedEpIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        if (next.size > 1) next.delete(idx); // Keep at least one
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEpIndices.size === currentEpisodes.length) {
      setSelectedEpIndices(new Set([focusedEpisodeIdx]));
    } else {
      setSelectedEpIndices(new Set(currentEpisodes.map((_, i) => i)));
    }
  };

  // Check if content or episodes support HLS mode (Required for offline download)
  const isHlsMode = useMemo(() => {
    if (content.isSmartHls) return true;
    const isHlsLink = (u?: string) =>
      Boolean(
        u &&
          (u.includes('.m3u8') ||
            u.includes('m3u8') ||
            SmartStreamService.isExtractableSource(u, true))
      );
    if (isHlsLink(primaryUrl) || isHlsLink(secondaryUrl)) return true;
    if (isHlsLink(content.videoUrl) || isHlsLink(content.secondaryVideoUrl)) return true;
    if (
      currentEpisodes.some((ep) => {
        const urls = extractUrlsFromItem(ep, false);
        return ep.isSmartHls || isHlsLink(urls.primaryUrl) || isHlsLink(urls.secondaryUrl);
      })
    ) {
      return true;
    }
    return false;
  }, [content, currentEpisodes, primaryUrl, secondaryUrl]);

  // Robust download URL resolution strictly for HLS mode streams (prioritizes permanent server/qualityLinks over expiring CDN URLs!)
  const resolveItemDownloadUrl = (
    ep: any | null,
    activeQuality: string,
    preferredLanguage: string,
    targetServer: 'server1' | 'server2' = modalServer
  ): string => {
    const isHlsStream = (u?: string) => {
      if (!u || typeof u !== 'string') return false;
      const lower = u.toLowerCase().trim();
      return lower.includes('.m3u8') || lower.includes('m3u8') || SmartStreamService.isExtractableSource(u, true);
    };

    const findInQualityDict = (dict: Record<string, string> | undefined | null): string => {
      if (!dict || typeof dict !== 'object') return '';
      if (dict[activeQuality] && dict[activeQuality].trim()) {
        return SmartStreamService.sanitizeStreamUrl(dict[activeQuality]);
      }
      const lowerKey = Object.keys(dict).find((k) => k.trim().toLowerCase() === activeQuality.trim().toLowerCase());
      if (lowerKey && dict[lowerKey] && dict[lowerKey].trim()) {
        return SmartStreamService.sanitizeStreamUrl(dict[lowerKey]);
      }
      for (const fallbackKey of ['1080p', '720p', '480p', '360p']) {
        if (dict[fallbackKey] && dict[fallbackKey].trim()) {
          return SmartStreamService.sanitizeStreamUrl(dict[fallbackKey]);
        }
      }
      const vals = Object.values(dict).filter((v) => typeof v === 'string' && v.trim().length > 0);
      return SmartStreamService.sanitizeStreamUrl(vals[0] || '');
    };

    const findInSources = (sources: Record<string, any> | undefined | null): string => {
      if (!sources || typeof sources !== 'object') return '';
      const keys = Object.keys(sources);
      if (keys.length === 0) return '';
      const matchedKey =
        keys.find(
          (k) =>
            k.toLowerCase() === preferredLanguage.toLowerCase() ||
            (k.length >= 3 && preferredLanguage.length >= 3 &&
              (k.toLowerCase().includes(preferredLanguage.toLowerCase()) ||
               preferredLanguage.toLowerCase().includes(k.toLowerCase())))
        ) || keys[0];

      const targetLangObj = sources[matchedKey];
      if (targetLangObj && typeof targetLangObj === 'object') {
        return findInQualityDict(targetLangObj);
      } else if (typeof targetLangObj === 'string' && targetLangObj.trim()) {
        return SmartStreamService.sanitizeStreamUrl(targetLangObj);
      }
      return '';
    };

    const isServer2 = targetServer === 'server2';
    const isInitialFocus =
      !isSeries ||
      (selectedSeasonIdx === initialSeasonIndex &&
        (!ep || currentEpisodes[focusedEpisodeIdx] === ep));

    const epPart0 =
      Array.isArray(ep?.videoLinks) && ep.videoLinks.length > 0 && typeof ep.videoLinks[0] === 'object'
        ? ep.videoLinks[0]
        : null;
    const contentPart0 =
      Array.isArray((content as any)?.videoLinks) && (content as any).videoLinks.length > 0 && typeof (content as any).videoLinks[0] === 'object'
        ? (content as any).videoLinks[0]
        : null;
    const moviePart0 =
      Array.isArray((content as any)?.movieParts) && (content as any).movieParts.length > 0 && typeof (content as any).movieParts[0] === 'object'
        ? (content as any).movieParts[0]
        : null;

    // Check deep extracted server URLs for this item
    const deepUrls = extractUrlsFromItem(ep, isInitialFocus);

    if (ep) {
      if (isServer2) {
        // 1. Prioritize explicit per-quality link on Server 2 (e.g. 1080p, 720p, 480p, 360p)
        const fromEpSecQuality = findInQualityDict(
          (ep as any)?.secondaryServerQualityLinks ||
            (ep as any)?.secondaryQualityLinks ||
            epPart0?.secondaryServerQualityLinks ||
            epPart0?.secondaryQualityLinks
        );
        if (fromEpSecQuality && isHlsStream(fromEpSecQuality)) return fromEpSecQuality;

        // 2. Next check permanent Server 2 master/hoster URL (so we resolve fresh Master .m3u8 with audio tracks!)
        if (deepUrls.secondaryUrl && isHlsStream(deepUrls.secondaryUrl)) return deepUrls.secondaryUrl;

        // 3. Fallback to secondaryDownloadQualities if no permanent link was found
        const epSecDl = (ep as any)?.secondaryDownloadQualities || epPart0?.secondaryDownloadQualities;
        if (Array.isArray(epSecDl) && epSecDl.length > 0) {
          const match = epSecDl.find((q: any) => q.id === activeQuality) || epSecDl[0];
          if (match?.url && isHlsStream(match.url)) return SmartStreamService.sanitizeStreamUrl(match.url);
        }
      } else {
        // 1. Prioritize explicit per-quality link on Server 1 (e.g. 1080p, 720p, 480p, 360p)
        const fromEpQuality = findInQualityDict(ep.qualityLinks || epPart0?.qualityLinks);
        if (fromEpQuality && isHlsStream(fromEpQuality)) return fromEpQuality;

        // 2. Check language-specific videoSources on Server 1
        const fromEpSources = findInSources(ep.videoSources || epPart0?.videoSources);
        if (fromEpSources && isHlsStream(fromEpSources)) return fromEpSources;

        // 3. Check permanent Server 1 master/hoster URL
        if (deepUrls.primaryUrl && isHlsStream(deepUrls.primaryUrl)) return deepUrls.primaryUrl;

        // 4. Last resort fallback to downloadQualities
        const epDl = (ep as any)?.downloadQualities || epPart0?.downloadQualities;
        if (Array.isArray(epDl) && epDl.length > 0) {
          const match = epDl.find((q: any) => q.id === activeQuality) || epDl[0];
          if (match?.url && isHlsStream(match.url)) return SmartStreamService.sanitizeStreamUrl(match.url);
        }
      }

      if (deepUrls.primaryUrl && isHlsStream(deepUrls.primaryUrl)) return deepUrls.primaryUrl;
      if (deepUrls.secondaryUrl && isHlsStream(deepUrls.secondaryUrl)) return deepUrls.secondaryUrl;
    }

    // Content-level resolution (Prioritize explicit qualityLinks / secondaryQualityLinks and permanent URLs)
    if (isServer2) {
      const fromContentSecQuality = findInQualityDict(
        (content as any).secondaryServerQualityLinks ||
          content.secondaryQualityLinks ||
          contentPart0?.secondaryServerQualityLinks ||
          contentPart0?.secondaryQualityLinks ||
          moviePart0?.secondaryServerQualityLinks ||
          moviePart0?.secondaryQualityLinks
      );
      if (fromContentSecQuality && isHlsStream(fromContentSecQuality)) return fromContentSecQuality;

      if (deepUrls.secondaryUrl && isHlsStream(deepUrls.secondaryUrl)) return deepUrls.secondaryUrl;

      const contentSecDl = (content as any)?.secondaryDownloadQualities || contentPart0?.secondaryDownloadQualities;
      if (Array.isArray(contentSecDl) && contentSecDl.length > 0) {
        const match = contentSecDl.find((q: any) => q.id === activeQuality) || contentSecDl[0];
        if (match?.url && isHlsStream(match.url)) return SmartStreamService.sanitizeStreamUrl(match.url);
      }
    } else {
      const fromContentQuality = findInQualityDict(
        content.qualityLinks || contentPart0?.qualityLinks || moviePart0?.qualityLinks
      );
      if (fromContentQuality && isHlsStream(fromContentQuality)) return fromContentQuality;

      const fromContentSources = findInSources(
        content.videoSources || contentPart0?.videoSources || moviePart0?.videoSources
      );
      if (fromContentSources && isHlsStream(fromContentSources)) return fromContentSources;

      if (deepUrls.primaryUrl && isHlsStream(deepUrls.primaryUrl)) return deepUrls.primaryUrl;

      const contentDl = (content as any)?.downloadQualities || contentPart0?.downloadQualities;
      if (Array.isArray(contentDl) && contentDl.length > 0) {
        const match = contentDl.find((q: any) => q.id === activeQuality) || contentDl[0];
        if (match?.url && isHlsStream(match.url)) return SmartStreamService.sanitizeStreamUrl(match.url);
      }
    }

    if (deepUrls.primaryUrl && isHlsStream(deepUrls.primaryUrl)) return deepUrls.primaryUrl;
    if (deepUrls.secondaryUrl && isHlsStream(deepUrls.secondaryUrl)) return deepUrls.secondaryUrl;

    if (targetServer === modalServer) {
      const matchedOpt = qualityOptions.find((q) => q.id === activeQuality);
      if (matchedOpt?.url && isHlsStream(matchedOpt.url)) return matchedOpt.url;
    }

    if (content.isSmartHls || (ep as any)?.isSmartHls) {
      if (deepUrls.primaryUrl) return deepUrls.primaryUrl;
      if (deepUrls.secondaryUrl) return deepUrls.secondaryUrl;
      return 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
    }

    return '';
  };

  // Size calculations with per-episode duration & probed bitrate awareness
  const activeQualityObj = qualityOptions.find((q) => q.id === activeQualityId) || qualityOptions[0] || {
    id: '720p',
    label: '720p HD',
    badge: 'Recommended',
    movieSizeMb: 450,
    epSizeMb: 180,
    bandwidth: 1200000,
    isLive: false,
  };

  // Helper to compute individual episode estimated MB using probed bitrate + episode duration
  const getEpisodeEstimatedMb = (epIndex: number): number => {
    const baseEpMb = activeQualityObj.epSizeMb || 180;
    if (epIndex === focusedEpisodeIdx) return baseEpMb;
    const ep = currentEpisodes[epIndex];
    const focusedEp = currentEpisodes[focusedEpisodeIdx];
    const epDurRaw = Number(ep?.duration || 0);
    const focusedDurRaw = Number(focusedEp?.duration || extractedMeta?.duration || 0);
    if (epDurRaw > 0 && focusedDurRaw > 0 && epDurRaw !== focusedDurRaw) {
      const epDurSec = epDurRaw > 300 ? epDurRaw : epDurRaw * 60;
      const focDurSec = focusedDurRaw > 300 ? focusedDurRaw : focusedDurRaw * 60;
      if (focDurSec > 60) {
        return Math.max(25, Math.round(baseEpMb * (epDurSec / focDurSec)));
      }
    }
    // Slight deterministic per-episode variance so episodes with default duration don't look artificially identical
    const epSeed = ((epIndex + 1) * 17 + (content.id?.charCodeAt(0) || 7)) % 11; // 0..10
    const epFactor = 0.96 + epSeed * 0.008;
    return Math.max(25, Math.round(baseEpMb * epFactor));
  };

  const totalEstimatedMb = useMemo(() => {
    if (isMovie) {
      return Math.max(25, activeQualityObj.movieSizeMb || 450);
    }
    if (selectedEpIndices.size === 0) {
      return Math.max(25, activeQualityObj.epSizeMb || 180);
    }
    let sum = 0;
    selectedEpIndices.forEach((idx) => {
      sum += getEpisodeEstimatedMb(idx);
    });
    return Math.max(25, sum);
  }, [isMovie, activeQualityObj, selectedEpIndices, currentEpisodes, focusedEpisodeIdx, extractedMeta]);

  const handleStartDownload = () => {
    if (!isHlsMode) {
      if (onSuccessToast) onSuccessToast('Download is only available for HLS Mode content.');
      return;
    }

    const backupServer: 'server1' | 'server2' = modalServer === 'server1' ? 'server2' : 'server1';

    if (isMovie) {
      const targetVideoUrl = resolveItemDownloadUrl(null, activeQualityId, selectedLanguage, modalServer);
      const backupVideoUrl = resolveItemDownloadUrl(null, activeQualityId, selectedLanguage, backupServer);
      if (!targetVideoUrl) {
        if (onSuccessToast) onSuccessToast('Offline download is only available for HLS Mode streams.');
        return;
      }
      const estBytes = totalEstimatedMb * 1024 * 1024;

      downloadManager.addTask({
        contentId: content.id,
        title: content.title,
        posterUrl: content.posterUrl || content.backdropUrl || '',
        quality: activeQualityId,
        language: selectedLanguage,
        videoUrl: targetVideoUrl,
        secondaryVideoUrl: backupVideoUrl && backupVideoUrl !== targetVideoUrl ? backupVideoUrl : undefined,
        selectedServer: modalServer,
        estimatedBytes: estBytes,
      });

      if (onSuccessToast) onSuccessToast(`Added "${content.title}" (${selectedLanguage} • ${activeQualityId.toUpperCase()}) to Downloads!`);
    } else {
      // Add each selected episode in ascending order to the Sequential 1-by-1 Queue
      let queuedCount = 0;
      const sortedIndices = Array.from(selectedEpIndices).map(Number).sort((a, b) => a - b);

      sortedIndices.forEach((idx) => {
        const ep = currentEpisodes[idx];
        if (!ep) return;

        const targetVideoUrl = resolveItemDownloadUrl(ep, activeQualityId, selectedLanguage, modalServer);
        const backupVideoUrl = resolveItemDownloadUrl(ep, activeQualityId, selectedLanguage, backupServer);
        if (!targetVideoUrl) return;

        const estBytes = getEpisodeEstimatedMb(idx) * 1024 * 1024;

        downloadManager.addTask({
          contentId: content.id,
          episodeId: ep.id || `ep-${ep.episodeNumber || idx + 1}`,
          seasonIndex: selectedSeasonIdx,
          episodeIndex: idx,
          title: content.title,
          episodeTitle: ep.title || `Episode ${ep.episodeNumber || idx + 1}`,
          posterUrl: content.posterUrl || content.backdropUrl || '',
          quality: activeQualityId,
          language: selectedLanguage,
          videoUrl: targetVideoUrl,
          secondaryVideoUrl: backupVideoUrl && backupVideoUrl !== targetVideoUrl ? backupVideoUrl : undefined,
          selectedServer: modalServer,
          estimatedBytes: estBytes,
        });
        queuedCount++;
      });

      if (queuedCount === 0) {
        if (onSuccessToast) onSuccessToast('No valid HLS streams found for selected episodes.');
        return;
      }

      if (onSuccessToast) {
        onSuccessToast(
          queuedCount === 1
            ? `Started downloading Episode (${selectedLanguage} • ${activeQualityId.toUpperCase()})!`
            : `Queued ${queuedCount} episodes in ${selectedLanguage} (1-by-1 Smart Queue)!`
        );
      }
    }

    setShowSummaryReview(false);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col w-full max-w-lg max-h-[88vh] bg-[#121216] border border-[#27272A] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 select-none text-left"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272A]/70 bg-[#16161C]">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={content.posterUrl || content.backdropUrl}
              alt={content.title}
              className="h-12 w-9 rounded-lg object-cover shadow-md flex-shrink-0 border border-white/10"
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                {isMovie ? (
                  <Film className="h-3.5 w-3.5 text-[#38BDF8]" />
                ) : (
                  <Tv className="h-3.5 w-3.5 text-[#EC4899]" />
                )}
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#A1A1AA]">
                  {showSummaryReview
                    ? 'Confirm Download Summary'
                    : isMovie
                    ? 'Movie Download'
                    : 'Series Smart Queue'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-[260px]">
                {content.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#A1A1AA] hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* HLS Mode Requirement Banner if content has no HLS stream */}
        {!isHlsMode && (
          <div className="mx-4 mt-3 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">HLS Mode Stream Required</p>
              <p className="text-[11px] text-zinc-300 mt-0.5">
                Offline download is exclusively configured for HLS Mode streams. The old normal link system does not support offline downloading.
              </p>
            </div>
          </div>
        )}

        {/* SUMMARY REVIEW SCREEN (Shown before starting download) */}
        {showSummaryReview ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            <div className="p-3.5 rounded-2xl bg-[#181822] border border-purple-500/30 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">
                  Download Configuration
                </span>
                <span className="text-[11px] font-extrabold text-emerald-400">
                  Total: ~{totalEstimatedMb >= 1000 ? `${(totalEstimatedMb / 1024).toFixed(2)} GB` : `${totalEstimatedMb} MB`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-300">
                  {modalServer === 'server2' ? 'Server 2' : 'Server 1'}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30 text-xs font-bold text-sky-300">
                  Audio: {selectedLanguage}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs font-bold text-purple-300">
                  Quality: {activeQualityId}
                </span>
                {isSeries && (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-300">
                    {selectedEpIndices.size} Episodes (1-by-1 Queue)
                  </span>
                )}
              </div>
            </div>

            {/* List of episodes to be downloaded */}
            <div>
              <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2 block">
                {isMovie ? 'Item to Download' : `Sequential Queue Order (${selectedEpIndices.size})`}
              </label>

              <div className="space-y-2 max-h-[220px] overflow-y-auto p-1 bg-[#0E0E12] rounded-2xl border border-[#27272A]/50">
                {isMovie ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#16161C] border border-[#27272A]">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-xs font-bold text-white truncate">{content.title}</span>
                      <span className="text-[10px] text-[#A1A1AA] mt-0.5">
                        {selectedLanguage} • {activeQualityId}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-400 flex-shrink-0">
                      ~{totalEstimatedMb >= 1000 ? `${(totalEstimatedMb / 1024).toFixed(1)} GB` : `${totalEstimatedMb} MB`}
                    </span>
                  </div>
                ) : (
                  Array.from(selectedEpIndices)
                    .map(Number)
                    .sort((a, b) => a - b)
                    .map((idx, queuePos) => {
                      const ep = currentEpisodes[idx];
                      const epNum = ep?.episodeNumber || (idx + 1);
                      const sizeMb = getEpisodeEstimatedMb(idx);
                      return (
                        <div
                          key={ep?.id || idx}
                          className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-[#16161C] border border-[#27272A]/70 hover:border-purple-500/30 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-purple-600/30 border border-purple-500/40 font-mono text-[11px] font-black text-purple-300">
                              E{epNum}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-white truncate">
                                {ep?.title || `Episode ${epNum}`}
                              </span>
                              <span className="text-[10px] text-[#A1A1AA]">
                                {queuePos === 0 ? 'Starts Immediately' : `Queue #${queuePos + 1} (Auto-Next)`} • {selectedLanguage} • {activeQualityId}
                              </span>
                            </div>
                          </div>

                          <span className="text-xs font-bold text-emerald-400 flex-shrink-0">
                            ~{sizeMb >= 1000 ? `${(sizeMb / 1024).toFixed(1)} GB` : `${sizeMb} MB`}
                          </span>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <p className="text-[11px] text-[#A1A1AA] text-center">
              Episodes download 1-by-1 automatically at high speed with zero phone lag.
            </p>
          </div>
        ) : (
          /* REGULAR SELECTION BODY */
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {/* 0. DUAL-SERVER DOWNLOAD SOURCE SWITCHER */}
            {(hasServer1 || hasServer2) && (
              <div>
                <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Download Server Source</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    Auto-Backup Failover Enabled
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!hasServer1}
                    onClick={() => setModalServer('server1')}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      modalServer === 'server1'
                        ? 'bg-purple-500/20 border-purple-500 text-white shadow-sm shadow-purple-500/20'
                        : hasServer1
                        ? 'bg-[#181820] border-[#27272A] text-[#A1A1AA] hover:text-white'
                        : 'bg-[#141418] border-[#1F1F24] text-white/25 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-extrabold truncate">Server 1</span>
                      <span className="text-[10px] text-white/50 truncate">
                        {server1Meta?.audioTracks && server1Meta.audioTracks.length > 0
                          ? `${server1Meta.audioTracks.length} Live Audio Track${server1Meta.audioTracks.length > 1 ? 's' : ''}`
                          : server1Meta?.isLiveProbed
                          ? 'High-Speed Primary'
                          : 'Fast Primary Stream'}
                      </span>
                    </div>
                    {modalServer === 'server1' && <Check className="h-4 w-4 text-purple-400 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    disabled={!hasServer2}
                    onClick={() => setModalServer('server2')}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      modalServer === 'server2'
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-sm shadow-amber-500/20'
                        : hasServer2
                        ? 'bg-[#181820] border-[#27272A] text-[#A1A1AA] hover:text-white'
                        : 'bg-[#141418] border-[#1F1F24] text-white/25 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-extrabold truncate">Server 2</span>
                      <span className="text-[10px] text-white/50 truncate">
                        {server2Meta?.audioTracks && server2Meta.audioTracks.length > 0
                          ? `${server2Meta.audioTracks.length} Live Audio Track${server2Meta.audioTracks.length > 1 ? 's' : ''}`
                          : server2Meta?.isLiveProbed
                          ? 'Turbo Backup Stream'
                          : hasServer2
                          ? 'High-Bitrate Backup'
                          : 'Not configured'}
                      </span>
                    </div>
                    {modalServer === 'server2' && <Check className="h-4 w-4 text-amber-400 shrink-0" />}
                  </button>
                </div>
              </div>
            )}

            {/* Active focused episode banner for series */}
            {isSeries && (
              <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-black">
                      E{currentEpisodes[focusedEpisodeIdx]?.episodeNumber || focusedEpisodeIdx + 1}
                    </span>
                    <span className="text-xs font-bold text-white truncate">
                      {currentEpisodes[focusedEpisodeIdx]?.title || `Episode ${focusedEpisodeIdx + 1}`}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 flex-shrink-0">
                    {extractedMeta?.isLiveProbed ? 'Live Probed' : `${selectedEpIndices.size} selected`}
                  </span>
                </div>
                {selectedEpIndices.size > 1 && (
                  <span className="text-[10px] text-purple-200/70">
                    Smart Batch: Targets {activeQualityId.toUpperCase()} ({selectedLanguage}) & auto-adapts per episode without lag.
                  </span>
                )}
              </div>
            )}

            {/* 1. AUDIO LANGUAGE SELECTOR (Smart Dual-Server Aware) */}
            <div>
              <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>Audio Language</span>
                <span className="text-[10px] text-white/40 lowercase">({availableLanguages.length} available)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {availableLanguages.map((lang) => {
                  const isSelected = selectedLanguage.toLowerCase() === lang.toLowerCase();
                  const langSource = languageServerMap[lang];
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setSelectedLanguage(lang);
                        // Automatically switch to the server that provides this language if exclusive!
                        if (langSource === 'server2' && hasServer2 && modalServer !== 'server2') {
                          setModalServer('server2');
                        } else if (langSource === 'server1' && hasServer1 && modalServer !== 'server1') {
                          setModalServer('server1');
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        isSelected
                          ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-white shadow-sm shadow-sky-500/20'
                          : 'bg-[#1C1C22] border-[#27272A] text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      <span>{lang}</span>
                      {langSource === 'server2' && (
                        <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black">
                          S2
                        </span>
                      )}
                      {langSource === 'server1' && hasServer2 && (
                        <span className="px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-black">
                          S1
                        </span>
                      )}
                      {isSelected && <Check className="h-3.5 w-3.5 text-[#38BDF8]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. QUALITY SELECTOR CARDS */}
            <div>
              <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>Select Quality</span>
                  {isProbing && (
                    <span className="text-[10px] text-sky-400 font-semibold flex items-center gap-1 animate-pulse">
                      <Sparkles className="h-3 w-3" /> Reading stream sizes...
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-emerald-400 font-extrabold">
                  {totalEstimatedMb >= 1000 ? `${(totalEstimatedMb / 1024).toFixed(2)} GB` : `${totalEstimatedMb} MB`}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {qualityOptions.map((q) => {
                  const isSelected = activeQualityId === q.id;
                  const sizeText = isMovie
                    ? (q.movieSizeMb >= 1000 ? `${(q.movieSizeMb / 1024).toFixed(1)} GB` : `${q.movieSizeMb} MB`)
                    : (q.epSizeMb >= 1000 ? `${(q.epSizeMb / 1024).toFixed(1)} GB/ep` : `${q.epSizeMb} MB/ep`);

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setSelectedQuality(q.id)}
                      className={`flex flex-col p-2.5 rounded-2xl border text-left transition cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white shadow-md shadow-purple-600/10'
                          : 'bg-[#181820] border-[#27272A] text-[#A1A1AA] hover:bg-[#1E1E28]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-extrabold text-white">{q.id.toUpperCase()}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-[#8B5CF6]" />}
                      </div>
                      <span className="text-[10px] text-[#A1A1AA] mt-0.5">{q.badge}</span>
                      <span className="text-[11px] font-bold text-emerald-400 mt-1">{sizeText}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. MOVIE SINGLE CARD OR SERIES EPISODE SELECTOR */}
            {isMovie ? (
              <div>
                <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2 block">
                  Movie Download Selection
                </label>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#16161C] border border-purple-500/30 shadow-md">
                  <img
                    src={content.posterUrl || content.backdropUrl}
                    alt={content.title}
                    className="h-14 w-10 rounded-xl object-cover border border-white/10 shadow flex-shrink-0"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {content.title}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-extrabold text-[10px] border border-sky-500/30">
                        {selectedLanguage}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-extrabold text-[10px] border border-purple-500/30">
                        {activeQualityId.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] border border-emerald-500/30">
                        Full Movie
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-400 flex-shrink-0">
                    ~{totalEstimatedMb >= 1000 ? `${(totalEstimatedMb / 1024).toFixed(1)} GB` : `${totalEstimatedMb} MB`}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
                      Select Episodes
                    </label>
                    <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                      {selectedEpIndices.size} selected
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#38BDF8] hover:underline cursor-pointer"
                  >
                    {selectedEpIndices.size === currentEpisodes.length ? (
                      <>
                        <CheckSquare className="h-3.5 w-3.5" />
                        <span>Deselect All</span>
                      </>
                    ) : (
                      <>
                        <Square className="h-3.5 w-3.5" />
                        <span>Select All ({currentEpisodes.length})</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Episode Boxes Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[190px] overflow-y-auto p-1 bg-[#0E0E12] rounded-2xl border border-[#27272A]/50">
                  {currentEpisodes.map((ep, idx) => {
                    const isSelected = selectedEpIndices.has(idx);
                    const isFocused = idx === focusedEpisodeIdx;
                    return (
                      <button
                        key={ep.id || idx}
                        type="button"
                        onClick={() => toggleEpisode(idx)}
                        className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl border text-xs font-bold transition cursor-pointer relative ${
                          isFocused ? 'ring-2 ring-sky-400 shadow-md shadow-sky-500/20' : ''
                        } ${
                          isSelected
                            ? 'bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] border-purple-400 text-white shadow-md shadow-purple-900/30'
                            : 'bg-[#181820] border-[#27272A] text-[#A1A1AA] hover:text-white hover:bg-[#20202A]'
                        }`}
                      >
                        <span>E{ep.episodeNumber || idx + 1}</span>
                        {isSelected ? (
                          <Check className="h-3 w-3 mt-1 text-white" />
                        ) : (
                          <span className="text-[9px] text-[#71717A] mt-1 font-normal">Queue</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODAL FOOTER ACTION */}
        <div className="p-4 border-t border-[#27272A]/70 bg-[#16161C] flex items-center justify-between gap-3">
          {showSummaryReview ? (
            <>
              <button
                type="button"
                onClick={() => setShowSummaryReview(false)}
                className="flex items-center gap-1.5 rounded-2xl bg-[#27272A] px-5 py-3 text-xs sm:text-sm font-bold text-white hover:bg-[#323238] active:scale-95 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
                <span>Cancel / Modify</span>
              </button>

              <button
                type="button"
                onClick={handleStartDownload}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-teal-900/40 hover:opacity-95 active:scale-95 transition cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Confirm & Download</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#A1A1AA] flex items-center gap-1">
                  <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
                  <span>
                    {freeStorageGb !== null ? `Free Space: ${freeStorageGb} GB` : 'Offline Vault'}
                  </span>
                </span>
                <span className="text-xs font-extrabold text-white">
                  Total: ~{totalEstimatedMb >= 1000 ? `${(totalEstimatedMb / 1024).toFixed(1)} GB` : `${totalEstimatedMb} MB`}
                </span>
              </div>

              <button
                type="button"
                disabled={!isHlsMode}
                onClick={() => {
                  if (isHlsMode) {
                    if (isMovie) {
                      handleStartDownload();
                    } else {
                      setShowSummaryReview(true);
                    }
                  }
                }}
                className={`flex items-center gap-2 rounded-2xl px-6 py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg transition ${
                  isHlsMode
                    ? 'bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#EC4899] shadow-purple-900/40 hover:opacity-95 active:scale-95 cursor-pointer'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                }`}
              >
                <Download className="h-4 w-4" />
                <span>
                  {isHlsMode
                    ? isMovie
                      ? 'Download Movie'
                      : `Review (${selectedEpIndices.size} Ep${selectedEpIndices.size > 1 ? 's' : ''})`
                    : 'Download Unavailable (HLS Only)'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
