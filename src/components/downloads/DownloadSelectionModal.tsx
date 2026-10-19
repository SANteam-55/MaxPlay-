import React, { useState, useMemo, useEffect } from 'react';
import { X, Download, Check, Sparkles, Film, Tv, HardDrive, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { ContentItem } from '../../types';
import { downloadManager } from '../../services/DownloadManager';
import { SmartStreamService } from '../../services/smartStreamService';
import { NativeBridgeService } from '../../services/nativeBridgeService';

interface DownloadSelectionModalProps {
  visible: boolean;
  content: ContentItem;
  initialSeasonIndex?: number;
  initialEpisodeIndex?: number;
  selectedServer?: 'server1' | 'server2';
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const DownloadSelectionModal: React.FC<DownloadSelectionModalProps> = ({
  visible,
  content,
  initialSeasonIndex = 0,
  initialEpisodeIndex = 0,
  selectedServer = 'server1',
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
    downloadQualities?: Array<{ id: string; label: string; sizeMb: number; url?: string }>;
    duration?: number;
  };

  // Separate metadata caches for Server 1 and Server 2 of the currently focused item
  const [server1Meta, setServer1Meta] = useState<ExtractedServerMeta | null>(null);
  const [server2Meta, setServer2Meta] = useState<ExtractedServerMeta | null>(null);
  const [isProbing, setIsProbing] = useState<boolean>(false);

  // Determine available server URLs for the focused movie or episode
  const { primaryUrl, secondaryUrl, hasServer1, hasServer2 } = useMemo(() => {
    const activeEp = isSeries ? currentEpisodes[focusedEpisodeIdx] : null;
    const pUrl = (
      activeEp?.videoUrl ||
      content.videoUrl ||
      (content.qualityLinks ? Object.values(content.qualityLinks)[0] : '') ||
      ''
    ) as string;
    const sUrl = (
      (activeEp as any)?.secondaryVideoUrl ||
      (activeEp as any)?.secondaryUrl ||
      content.secondaryVideoUrl ||
      (content as any)?.secondaryUrl ||
      (content.secondaryQualityLinks ? Object.values(content.secondaryQualityLinks)[0] : '') ||
      ''
    ) as string;
    return {
      primaryUrl: pUrl.trim(),
      secondaryUrl: sUrl.trim(),
      hasServer1: Boolean(pUrl && pUrl.trim().length > 0),
      hasServer2: Boolean(sUrl && sUrl.trim().length > 0),
    };
  }, [isSeries, currentEpisodes, focusedEpisodeIdx, content]);

  // Helper to probe a single server URL (0ms if cached in SmartStreamService, otherwise on-device or API)
  const probeSingleServerUrl = async (
    targetUrl: string,
    requestedDur: number
  ): Promise<ExtractedServerMeta | null> => {
    if (!targetUrl) return null;
    try {
      const cachedM3u8 = SmartStreamService.getCachedStreamUrl(targetUrl);
      if (cachedM3u8 && NativeBridgeService.isRunningInKotlinApp()) {
        const fastMeta = await NativeBridgeService.parseHlsManifestOnDevice(
          cachedM3u8,
          {},
          requestedDur
        );
        if (fastMeta) {
          return {
            audioTracks: fastMeta.audioTracks,
            qualities: fastMeta.qualities,
            downloadQualities: fastMeta.downloadQualities,
            duration: fastMeta.duration,
          };
        }
      }

      if (NativeBridgeService.isRunningInKotlinApp()) {
        const nativeMeta = await NativeBridgeService.extractStreamNative(targetUrl, requestedDur);
        if (nativeMeta && nativeMeta.ok) {
          return {
            audioTracks: nativeMeta.audioTracks,
            qualities: nativeMeta.qualities,
            downloadQualities: nativeMeta.downloadQualities,
            duration: nativeMeta.duration,
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
        return {
          audioTracks: data.audioTracks,
          qualities: data.qualities,
          downloadQualities: data.downloadQualities,
          duration: data.duration,
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

    const existingS1Dl = (activeEp as any)?.downloadQualities || (content as any)?.downloadQualities;
    const existingS2Dl =
      (activeEp as any)?.secondaryDownloadQualities || (content as any)?.secondaryDownloadQualities;
    const existingAudios = (activeEp as any)?.audioTracks || (content as any)?.audioTracks;

    if (Array.isArray(existingS1Dl) && existingS1Dl.length > 0) {
      setServer1Meta({
        downloadQualities: existingS1Dl,
        audioTracks: Array.isArray(existingAudios) ? existingAudios : undefined,
        duration: requestedDur,
      });
    }
    if (Array.isArray(existingS2Dl) && existingS2Dl.length > 0) {
      setServer2Meta({
        downloadQualities: existingS2Dl,
        audioTracks: Array.isArray(existingAudios) ? existingAudios : undefined,
        duration: requestedDur,
      });
    }

    const deferTimer = setTimeout(async () => {
      if (isCancelled) return;
      setIsProbing(true);
      try {
        if (modalServer === 'server2' && secondaryUrl) {
          const s2 = await probeSingleServerUrl(secondaryUrl, requestedDur);
          if (!isCancelled && s2) setServer2Meta(s2);
          if (!isCancelled && primaryUrl && SmartStreamService.getCachedStreamUrl(primaryUrl)) {
            const s1 = await probeSingleServerUrl(primaryUrl, requestedDur);
            if (!isCancelled && s1) setServer1Meta(s1);
          }
        } else {
          if (primaryUrl) {
            const s1 = await probeSingleServerUrl(primaryUrl, requestedDur);
            if (!isCancelled && s1) setServer1Meta(s1);
          }
          if (!isCancelled && secondaryUrl) {
            const s2 = await probeSingleServerUrl(secondaryUrl, requestedDur);
            if (!isCancelled && s2) setServer2Meta(s2);
          }
        }
      } finally {
        if (!isCancelled) setIsProbing(false);
      }
    }, 150);

    return () => {
      isCancelled = true;
      clearTimeout(deferTimer);
    };
  }, [content, isSeries, focusedEpisodeIdx, currentEpisodes, primaryUrl, secondaryUrl, modalServer]);

  const extractedMeta = modalServer === 'server2' ? (server2Meta || server1Meta) : (server1Meta || server2Meta);

  // 2. Available Languages resolution (Merged across Server 1 & Server 2 with Server Badge awareness!)
  const { availableLanguages, languageServerMap } = useMemo(() => {
    const list: string[] = [];
    const serverMap: Record<string, 'server1' | 'server2' | 'both'> = {};
    const activeEp = isSeries ? currentEpisodes[focusedEpisodeIdx] : null;

    const addLang = (rawLang: string, source: 'server1' | 'server2' | 'both') => {
      if (!rawLang || rawLang === 'Default') return;
      const existing = list.find((l) => l.toLowerCase() === rawLang.toLowerCase());
      if (!existing) {
        list.push(rawLang);
        serverMap[rawLang] = source;
      } else if (serverMap[existing] !== source && serverMap[existing] !== 'both') {
        serverMap[existing] = 'both';
      }
    };

    if (server1Meta?.audioTracks && Array.isArray(server1Meta.audioTracks)) {
      server1Meta.audioTracks.forEach((l) => addLang(l, 'server1'));
    }
    if (server2Meta?.audioTracks && Array.isArray(server2Meta.audioTracks)) {
      server2Meta.audioTracks.forEach((l) => addLang(l, 'server2'));
    }
    if (activeEp && (activeEp as any).audioTracks && Array.isArray((activeEp as any).audioTracks)) {
      (activeEp as any).audioTracks.forEach((l: string) => addLang(l, 'both'));
    }
    if ((content as any).audioTracks && Array.isArray((content as any).audioTracks)) {
      (content as any).audioTracks.forEach((l: string) => addLang(l, 'both'));
    }
    if (content.languages && Array.isArray(content.languages) && content.languages.length > 0) {
      content.languages.forEach((l) => addLang(l, 'both'));
    }
    if (content.availableLanguages && Array.isArray(content.availableLanguages)) {
      content.availableLanguages.forEach((l) => addLang(l, 'both'));
    }
    if (content.videoSources && typeof content.videoSources === 'object') {
      Object.keys(content.videoSources).forEach((l) => addLang(l, 'server1'));
    }
    if (list.length === 0) {
      list.push('Hindi');
      serverMap['Hindi'] = 'both';
    }
    return { availableLanguages: list, languageServerMap: serverMap };
  }, [content, isSeries, currentEpisodes, focusedEpisodeIdx, server1Meta, server2Meta]);

  const [selectedLanguage, setSelectedLanguage] = useState<string>(availableLanguages[0] || 'Hindi');

  // Sync selectedLanguage when availableLanguages changes
  useEffect(() => {
    if (availableLanguages.length > 0 && !availableLanguages.some((l) => l.toLowerCase() === selectedLanguage.toLowerCase())) {
      setSelectedLanguage(availableLanguages[0]);
    }
  }, [availableLanguages, selectedLanguage]);

  // 3. Available Qualities resolution (Real extracted qualities & exact sizes from Admin verify or stream probe)
  const qualityOptions = useMemo(() => {
    const activeEp = isSeries ? currentEpisodes[focusedEpisodeIdx] : null;
    const isServer2 = modalServer === 'server2';
    const secUrl = (activeEp as any)?.secondaryVideoUrl || (activeEp as any)?.secondaryUrl || content.secondaryVideoUrl;
    const rawDl = extractedMeta?.downloadQualities || (
      isServer2 && secUrl
        ? ((activeEp as any)?.secondaryDownloadQualities || (content as any)?.secondaryDownloadQualities)
        : ((activeEp as any)?.downloadQualities || (content as any)?.downloadQualities)
    );

    if (Array.isArray(rawDl) && rawDl.length > 0) {
      return rawDl.map((q: any) => ({
        id: q.id || '720p',
        label: q.label || `${q.id || '720p'} HD`,
        badge: q.id === '1080p' ? 'Best Quality' : q.id === '720p' ? 'Recommended' : q.id === '480p' ? 'Data Saver' : 'Ultra Saver',
        movieSizeMb: q.sizeMb || (q.id === '1080p' ? 850 : q.id === '720p' ? 450 : 220),
        epSizeMb: q.sizeMb || (q.id === '1080p' ? 350 : q.id === '720p' ? 190 : 95),
        url: q.url,
      }));
    }

    const durationSec = extractedMeta?.duration || (content.duration ? (content.duration > 300 ? content.duration : content.duration * 60) : 7200);
    const epDurationSec = extractedMeta?.duration || (activeEp?.duration ? (activeEp.duration > 300 ? activeEp.duration : activeEp.duration * 60) : 1440);
    const calcSizeMb = (dur: number, bitrateBps: number) => Math.max(30, Math.round((bitrateBps * dur) / (8 * 1024 * 1024)));

    const qLinks = isServer2 && secUrl
      ? ((activeEp as any)?.secondaryQualityLinks || content.secondaryQualityLinks)
      : ((activeEp as any)?.qualityLinks || content.qualityLinks);
    if (qLinks && typeof qLinks === 'object' && Object.keys(qLinks).length > 0) {
      const keys = Object.keys(qLinks);
      return keys.map((k) => {
        const bitrate = k.includes('1080') ? 2400000 : k.includes('720') ? 1200000 : k.includes('480') ? 600000 : 300000;
        return {
          id: k,
          label: `${k} ${k.includes('1080') ? 'Full HD' : k.includes('720') ? 'HD' : 'Standard'}`,
          badge: k.includes('1080') ? 'Best Quality' : k.includes('720') ? 'Recommended' : 'Data Saver',
          movieSizeMb: calcSizeMb(durationSec, bitrate),
          epSizeMb: calcSizeMb(epDurationSec, bitrate),
          url: qLinks[k],
        };
      });
    }

    return [
      { id: '1080p', label: '1080p Full HD', badge: 'Best Quality', movieSizeMb: calcSizeMb(durationSec, 2400000), epSizeMb: calcSizeMb(epDurationSec, 2400000) },
      { id: '720p', label: '720p HD', badge: 'Recommended', movieSizeMb: calcSizeMb(durationSec, 1200000), epSizeMb: calcSizeMb(epDurationSec, 1200000) },
      { id: '480p', label: '480p Standard', badge: 'Data Saver', movieSizeMb: calcSizeMb(durationSec, 600000), epSizeMb: calcSizeMb(epDurationSec, 600000) },
      { id: '360p', label: '360p Fast Load', badge: 'Ultra Saver', movieSizeMb: calcSizeMb(durationSec, 300000), epSizeMb: calcSizeMb(epDurationSec, 300000) },
    ];
  }, [content, isSeries, currentEpisodes, focusedEpisodeIdx, extractedMeta, modalServer]);

  const [selectedQuality, setSelectedQuality] = useState<string>(() => {
    return qualityOptions[0]?.id || '720p';
  });

  const activeQualityId = qualityOptions.some((q) => q.id === selectedQuality)
    ? selectedQuality
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
    if (content.videoUrl && (content.videoUrl.includes('.m3u8') || content.videoUrl.includes('m3u8') || SmartStreamService.isExtractableSource(content.videoUrl, true))) {
      return true;
    }
    if (content.secondaryVideoUrl && (content.secondaryVideoUrl.includes('.m3u8') || content.secondaryVideoUrl.includes('m3u8') || SmartStreamService.isExtractableSource(content.secondaryVideoUrl, true))) {
      return true;
    }
    if (currentEpisodes.some((ep) => ep.isSmartHls || (ep.videoUrl && (ep.videoUrl.includes('.m3u8') || SmartStreamService.isExtractableSource(ep.videoUrl, true))) || ((ep as any).secondaryVideoUrl && ((ep as any).secondaryVideoUrl.includes('.m3u8') || SmartStreamService.isExtractableSource((ep as any).secondaryVideoUrl, true))))) {
      return true;
    }
    return false;
  }, [content, currentEpisodes]);

  // Robust download URL resolution strictly for HLS mode streams (supports explicit targetServer)
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
      if (dict[activeQuality]) return dict[activeQuality];
      if (dict['1080p']) return dict['1080p'];
      if (dict['720p']) return dict['720p'];
      if (dict['480p']) return dict['480p'];
      if (dict['360p']) return dict['360p'];
      const vals = Object.values(dict).filter((v) => typeof v === 'string' && v.trim().length > 0);
      return vals[0] || '';
    };

    const findInSources = (sources: Record<string, any> | undefined | null): string => {
      if (!sources || typeof sources !== 'object') return '';
      const keys = Object.keys(sources);
      if (keys.length === 0) return '';
      const matchedKey = keys.find(
        (k) =>
          k.toLowerCase().includes(preferredLanguage.toLowerCase()) ||
          preferredLanguage.toLowerCase().includes(k.toLowerCase())
      ) || keys[0];

      const targetLangObj = sources[matchedKey];
      if (targetLangObj && typeof targetLangObj === 'object') {
        return findInQualityDict(targetLangObj);
      } else if (typeof targetLangObj === 'string' && targetLangObj.trim()) {
        return targetLangObj;
      }
      return '';
    };

    const isServer2 = targetServer === 'server2';

    if (ep) {
      if (isServer2) {
        const epSecDl = (ep as any)?.secondaryDownloadQualities;
        if (Array.isArray(epSecDl) && epSecDl.length > 0) {
          const match = epSecDl.find((q: any) => q.id === activeQuality) || epSecDl[0];
          if (match?.url && isHlsStream(match.url)) return match.url;
        }
        const fromEpSecQuality = findInQualityDict((ep as any)?.secondaryQualityLinks);
        if (fromEpSecQuality && isHlsStream(fromEpSecQuality)) return fromEpSecQuality;
        const epSecUrl = (ep as any)?.secondaryVideoUrl || (ep as any)?.secondaryUrl;
        if (epSecUrl && isHlsStream(epSecUrl)) return epSecUrl;
      }

      const epDl = (ep as any)?.downloadQualities;
      if (Array.isArray(epDl) && epDl.length > 0) {
        const match = epDl.find((q: any) => q.id === activeQuality) || epDl[0];
        if (match?.url && isHlsStream(match.url)) return match.url;
      }
      const fromEpSources = findInSources(ep.videoSources);
      if (fromEpSources && isHlsStream(fromEpSources)) return fromEpSources;

      const fromEpQuality = findInQualityDict(ep.qualityLinks);
      if (fromEpQuality && isHlsStream(fromEpQuality)) return fromEpQuality;

      if (ep.videoUrl && isHlsStream(ep.videoUrl)) return ep.videoUrl;
      if (ep.streamUrl && isHlsStream(ep.streamUrl)) return ep.streamUrl;
      if (ep.url && isHlsStream(ep.url)) return ep.url;
      const epSecFallback = (ep as any)?.secondaryVideoUrl || (ep as any)?.secondaryUrl;
      if (epSecFallback && isHlsStream(epSecFallback)) return epSecFallback;
    }

    // Content-level resolution
    if (targetServer === modalServer) {
      const matchedOpt = qualityOptions.find((q) => q.id === activeQuality);
      if (matchedOpt?.url && isHlsStream(matchedOpt.url)) return matchedOpt.url;
    }

    if (isServer2) {
      const contentSecDl = (content as any)?.secondaryDownloadQualities;
      if (Array.isArray(contentSecDl) && contentSecDl.length > 0) {
        const match = contentSecDl.find((q: any) => q.id === activeQuality) || contentSecDl[0];
        if (match?.url && isHlsStream(match.url)) return match.url;
      }
      const fromContentSecQuality = findInQualityDict(content.secondaryQualityLinks);
      if (fromContentSecQuality && isHlsStream(fromContentSecQuality)) return fromContentSecQuality;
      const contentSecUrl = content.secondaryVideoUrl || (content as any).secondaryUrl;
      if (contentSecUrl && isHlsStream(contentSecUrl)) return contentSecUrl;
    }

    const contentDl = (content as any)?.downloadQualities;
    if (Array.isArray(contentDl) && contentDl.length > 0) {
      const match = contentDl.find((q: any) => q.id === activeQuality) || contentDl[0];
      if (match?.url && isHlsStream(match.url)) return match.url;
    }

    const fromContentSources = findInSources(content.videoSources);
    if (fromContentSources && isHlsStream(fromContentSources)) return fromContentSources;

    const fromContentQuality = findInQualityDict(content.qualityLinks);
    if (fromContentQuality && isHlsStream(fromContentQuality)) return fromContentQuality;

    if (content.videoUrl && isHlsStream(content.videoUrl)) return content.videoUrl;
    if ((content as any).streamUrl && isHlsStream((content as any).streamUrl)) return (content as any).streamUrl;
    if (content.secondaryVideoUrl && isHlsStream(content.secondaryVideoUrl)) return content.secondaryVideoUrl;

    if (Array.isArray((content as any).movieParts) && (content as any).movieParts.length > 0) {
      const mp0 = (content as any).movieParts[0];
      const s = findInSources(mp0?.videoSources) || findInQualityDict(mp0?.qualityLinks) || mp0?.videoUrl;
      if (s && isHlsStream(s)) return s;
    }

    if (content.isSmartHls || (ep as any)?.isSmartHls) {
      if (ep?.videoUrl && isHlsStream(ep.videoUrl)) return ep.videoUrl;
      if (content.videoUrl && isHlsStream(content.videoUrl)) return content.videoUrl;
      return 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
    }

    return '';
  };

  // Size calculations with robust fallbacks
  const activeQualityObj = qualityOptions.find((q) => q.id === activeQualityId) || qualityOptions[0] || {
    id: '720p',
    label: '720p HD',
    badge: 'Recommended',
    movieSizeMb: 450,
    epSizeMb: 180,
  };
  const totalEstimatedMb = Math.max(
    50,
    isMovie
      ? activeQualityObj.movieSizeMb || 450
      : (activeQualityObj.epSizeMb || 180) * Math.max(1, selectedEpIndices.size)
  );

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
      const estBytes = (activeQualityObj.movieSizeMb || 450) * 1024 * 1024;

      downloadManager.addTask({
        contentId: content.id,
        title: content.title,
        posterUrl: content.posterUrl || content.backdropUrl || '',
        quality: activeQualityId,
        language: selectedLanguage,
        videoUrl: targetVideoUrl,
        secondaryVideoUrl: backupVideoUrl !== targetVideoUrl ? backupVideoUrl : undefined,
        selectedServer: modalServer,
        estimatedBytes: estBytes,
      });

      if (onSuccessToast) onSuccessToast(`Added "${content.title}" to Downloads!`);
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

        const estBytes = (activeQualityObj.epSizeMb || 180) * 1024 * 1024;

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
          secondaryVideoUrl: backupVideoUrl !== targetVideoUrl ? backupVideoUrl : undefined,
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
            ? `Started downloading Episode!`
            : `Queued ${queuedCount} episodes (1-by-1 Smart Queue)!`
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
                  {modalServer === 'server2' ? 'Server 2 (Filemoon)' : 'Server 1 (VOE.sx)'}
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
                      const sizeMb = activeQualityObj.epSizeMb;
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
                      <span className="text-xs font-extrabold truncate">Server 1 • VOE.sx</span>
                      <span className="text-[10px] text-white/50 truncate">
                        {server1Meta?.audioTracks && server1Meta.audioTracks.length > 1
                          ? `${server1Meta.audioTracks.length} Audio Tracks`
                          : 'Fast Direct HLS'}
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
                      <span className="text-xs font-extrabold truncate">Server 2 • Filemoon</span>
                      <span className="text-[10px] text-white/50 truncate">
                        {server2Meta?.audioTracks && server2Meta.audioTracks.length > 1
                          ? `${server2Meta.audioTracks.length} Multi-Audio`
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
              <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-black">
                    E{currentEpisodes[focusedEpisodeIdx]?.episodeNumber || focusedEpisodeIdx + 1}
                  </span>
                  <span className="text-xs font-bold text-white truncate">
                    {currentEpisodes[focusedEpisodeIdx]?.title || `Episode ${focusedEpisodeIdx + 1}`}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-[#A1A1AA] flex-shrink-0">
                  {selectedEpIndices.size} selected
                </span>
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
                  const isSelected = selectedQuality === q.id;
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
