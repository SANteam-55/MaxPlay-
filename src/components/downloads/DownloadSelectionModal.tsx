import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Download,
  Check,
  Sparkles,
  Film,
  Tv,
  HardDrive,
  CheckSquare,
  Square,
  AlertCircle,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
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

interface QualityOptionItem {
  id: string;
  label: string;
  badge: string;
  movieSizeMb: number;
  epSizeMb: number;
  bandwidth: number;
  url: string;
  isLive: boolean;
  serverSource: 'server1' | 'server2';
}

interface EpisodeResolvedPlan {
  epIndex: number;
  epNumber: number;
  epTitle: string;
  epId: string;
  requestedQuality: string;
  resolvedQuality: string;
  resolvedServer: 'server1' | 'server2';
  language: string;
  targetUrl: string;
  backupUrl?: string;
  sizeMb: number;
  status: 'exact' | 'cross_server_exact' | 'fallback_quality' | 'unavailable';
  isFallbackQuality: boolean;
  isCrossServerAuto: boolean;
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
    const cType = (
      content.type ||
      (content as any).media_type ||
      (content as any).uploadMode ||
      (content as any).category ||
      ''
    )
      .toString()
      .toLowerCase();

    if (cType === 'movie' || cType === 'film' || cType === 'feature') {
      return true;
    }

    const seasons = content.seasonsData;
    const hasEpisodesInSeasons =
      Array.isArray(seasons) &&
      seasons.some((s) => Array.isArray(s?.episodes) && s.episodes.length > 0);
    const hasEpisodesList =
      Array.isArray(content.episodesList) && content.episodesList.length > 0;

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
    if (content.type === 'series' && content.episodes && content.episodes > 0) {
      const count = content.episodes;
      return Array.from({ length: count }, (_, i) => ({
        id: `ep-${i + 1}`,
        episodeNumber: i + 1,
        title: `Episode ${i + 1}`,
        duration: content.duration || 1440,
        videoUrl: i === 0 ? content.videoUrl || '' : '',
      }));
    }
    return [];
  }, [isSeries, seasonsData, selectedSeasonIdx, content]);

  // Active reference episode for initial probe only (does NOT change on every checkbox tap so UI stays 0ms instant)
  const [focusedEpisodeIdx] = useState<number>(() => {
    return initialEpisodeIndex < currentEpisodes.length ? initialEpisodeIndex : 0;
  });

  // Selected episodes set for batch downloading
  const [selectedEpIndices, setSelectedEpIndices] = useState<Set<number>>(() => {
    const set = new Set<number>();
    const startIdx = initialEpisodeIndex < currentEpisodes.length ? initialEpisodeIndex : 0;
    set.add(startIdx);
    return set;
  });

  // Reset selected episodes when switching seasons
  const handleSelectSeason = (sIdx: number) => {
    setSelectedSeasonIdx(sIdx);
    setSelectedEpIndices(new Set([0]));
    setShowSummaryReview(false);
  };

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

  const [server1Meta, setServer1Meta] = useState<ExtractedServerMeta | null>(null);
  const [server2Meta, setServer2Meta] = useState<ExtractedServerMeta | null>(null);
  const [isProbing, setIsProbing] = useState<boolean>(false);

  const isQualityKey = (val: string): boolean => {
    if (!val || typeof val !== 'string') return false;
    return /^(\d{3,4}p|4k|2k|8k|hd|fhd|uhd|sd|auto)$/i.test(val.trim());
  };

  // Sanitize a qualityLinks dictionary and heal accidental 1080p clones when Admin only verified 720p/480p/360p
  const sanitizeQualityDict = (
    rawDict: Record<string, string> | undefined | null,
    savedArr: any[] | undefined | null
  ): Record<string, string> => {
    if (!rawDict || typeof rawDict !== 'object') return {};
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawDict)) {
      const cleanK = k.trim();
      const cleanV = SmartStreamService.sanitizeStreamUrl(v);
      if (cleanK && cleanV && isQualityKey(cleanK) && cleanK.toLowerCase() !== 'auto') {
        cleaned[cleanK] = cleanV;
      }
    }
    if (cleaned['1080p']) {
      const otherKeys = Object.keys(cleaned).filter((k) => k !== '1080p');
      const isDuplicateOfLower = otherKeys.some((k) => cleaned[k] === cleaned['1080p']);
      const savedHasOtherOnly =
        Array.isArray(savedArr) &&
        savedArr.length > 0 &&
        !savedArr.some((q: any) => String(q?.id || '').trim().toLowerCase() === '1080p');
      if (isDuplicateOfLower || (savedHasOtherOnly && otherKeys.length > 0)) {
        delete cleaned['1080p'];
      }
    }
    return cleaned;
  };

  /**
   * STRICT URL EXTRACTOR:
   * - When `ep` is provided (Series Episode), NEVER falls back to root `content.videoUrl` / `content.qualityLinks`
   *   (because root `content` links belong to Episode 1 and would cause cross-episode audio/video contamination!).
   * - When `ep` is null (Movie), extracts from `content`.
   */
  const extractUrlsFromItem = (
    ep: any | null,
    useActivePlayerFallback: boolean
  ): { primaryUrl: string; secondaryUrl: string } => {
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

    let pUrl = '';
    let sUrl = '';

    if (ep) {
      // Strictly inspect THIS episode only — never fall back to root content!
      const epPart0 =
        Array.isArray(ep?.videoLinks) && ep.videoLinks.length > 0 && typeof ep.videoLinks[0] === 'object'
          ? ep.videoLinks[0]
          : null;

      pUrl =
        firstFromDict(ep.qualityLinks) ||
        ep.videoUrl ||
        ep.streamUrl ||
        ep.url ||
        firstFromSources(ep.videoSources) ||
        firstFromDict(epPart0?.qualityLinks) ||
        epPart0?.videoUrl ||
        firstFromSources(epPart0?.videoSources) ||
        (typeof ep?.videoLinks?.[0] === 'string' ? ep.videoLinks[0] : '') ||
        '';

      sUrl =
        firstFromDict(ep.secondaryServerQualityLinks) ||
        firstFromDict(ep.secondaryQualityLinks) ||
        ep.secondaryServerUrl ||
        ep.secondaryVideoUrl ||
        ep.secondaryUrl ||
        firstFromDict(epPart0?.secondaryServerQualityLinks) ||
        firstFromDict(epPart0?.secondaryQualityLinks) ||
        epPart0?.secondaryServerUrl ||
        epPart0?.secondaryVideoUrl ||
        epPart0?.secondaryUrl ||
        '';
    } else {
      // Movie: inspect content-level fields
      const contentPart0 =
        Array.isArray((content as any)?.videoLinks) &&
        (content as any).videoLinks.length > 0 &&
        typeof (content as any).videoLinks[0] === 'object'
          ? (content as any).videoLinks[0]
          : null;
      const moviePart0 =
        Array.isArray((content as any)?.movieParts) &&
        (content as any).movieParts.length > 0 &&
        typeof (content as any).movieParts[0] === 'object'
          ? (content as any).movieParts[0]
          : null;

      pUrl =
        firstFromDict(content.qualityLinks) ||
        firstFromDict(contentPart0?.qualityLinks) ||
        firstFromDict(moviePart0?.qualityLinks) ||
        contentPart0?.videoUrl ||
        moviePart0?.videoUrl ||
        content.videoUrl ||
        (content as any).streamUrl ||
        firstFromSources(content.videoSources) ||
        firstFromSources(contentPart0?.videoSources) ||
        firstFromSources(moviePart0?.videoSources) ||
        (typeof (content as any)?.videoLinks?.[0] === 'string' ? (content as any).videoLinks[0] : '') ||
        '';

      sUrl =
        firstFromDict((content as any).secondaryServerQualityLinks) ||
        firstFromDict(content.secondaryQualityLinks) ||
        firstFromDict(contentPart0?.secondaryServerQualityLinks) ||
        firstFromDict(contentPart0?.secondaryQualityLinks) ||
        firstFromDict(moviePart0?.secondaryServerQualityLinks) ||
        firstFromDict(moviePart0?.secondaryQualityLinks) ||
        contentPart0?.secondaryServerUrl ||
        contentPart0?.secondaryVideoUrl ||
        contentPart0?.secondaryUrl ||
        moviePart0?.secondaryServerUrl ||
        moviePart0?.secondaryVideoUrl ||
        moviePart0?.secondaryUrl ||
        (content as any).secondaryServerUrl ||
        content.secondaryVideoUrl ||
        (content as any).secondaryUrl ||
        '';

      if (useActivePlayerFallback) {
        if (!pUrl && activePrimaryUrl) pUrl = activePrimaryUrl;
        if (!sUrl && activeSecondaryUrl) sUrl = activeSecondaryUrl;
      }
    }

    return {
      primaryUrl: SmartStreamService.sanitizeStreamUrl(pUrl),
      secondaryUrl: SmartStreamService.sanitizeStreamUrl(sUrl),
    };
  };

  // Determine available server URLs across Movie or Season Episodes
  const { primaryUrl, secondaryUrl, hasServer1, hasServer2 } = useMemo(() => {
    if (isMovie) {
      const { primaryUrl: pUrl, secondaryUrl: sUrl } = extractUrlsFromItem(null, true);
      return {
        primaryUrl: pUrl,
        secondaryUrl: sUrl,
        hasServer1: Boolean(pUrl && pUrl.length > 0),
        hasServer2: Boolean(sUrl && sUrl.length > 0),
      };
    }

    const activeEp = currentEpisodes[focusedEpisodeIdx] || currentEpisodes[0] || null;
    const { primaryUrl: fPUrl, secondaryUrl: fSUrl } = extractUrlsFromItem(activeEp, false);

    let anyS1 = Boolean(fPUrl);
    let anyS2 = Boolean(fSUrl);
    for (const ep of currentEpisodes) {
      if (anyS1 && anyS2) break;
      const u = extractUrlsFromItem(ep, false);
      if (u.primaryUrl) anyS1 = true;
      if (u.secondaryUrl) anyS2 = true;
    }

    return {
      primaryUrl: fPUrl,
      secondaryUrl: fSUrl,
      hasServer1: anyS1,
      hasServer2: anyS2,
    };
  }, [isMovie, currentEpisodes, focusedEpisodeIdx, content, activePrimaryUrl, activeSecondaryUrl]);

  // Helper to probe a single server URL (0ms if cached in SmartStreamService)
  const probeSingleServerUrl = async (
    targetUrl: string,
    requestedDur: number
  ): Promise<ExtractedServerMeta | null> => {
    if (!targetUrl) return null;
    const scopedMetaKey = `${content.id}_s${selectedSeasonIdx}_e${focusedEpisodeIdx}_${targetUrl}`;
    try {
      const cachedMeta = SmartStreamService.getCachedStreamMeta(scopedMetaKey);
      if (
        cachedMeta &&
        Array.isArray(cachedMeta.downloadQualities) &&
        cachedMeta.downloadQualities.length > 0
      ) {
        return {
          audioTracks: cachedMeta.audioTracks,
          qualities: cachedMeta.qualities,
          downloadQualities: cachedMeta.downloadQualities,
          duration: cachedMeta.duration || requestedDur,
          isLiveProbed: true,
        };
      }

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
    } catch (err) {
      console.warn('[DownloadModal] Server probe warning:', err);
    }
    return null;
  };

  // Probe ONLY when no Admin-verified downloadQualities exist (instant 0ms when verified!)
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

    const existingS1Dl = isSeries
      ? (activeEp as any)?.downloadQualities || epPart0?.downloadQualities
      : (content as any)?.downloadQualities || contentPart0?.downloadQualities;
    const existingS2Dl = isSeries
      ? (activeEp as any)?.secondaryDownloadQualities || epPart0?.secondaryDownloadQualities
      : (content as any)?.secondaryDownloadQualities || contentPart0?.secondaryDownloadQualities;
    const existingAudios =
      (activeEp as any)?.audioTracks ||
      epPart0?.audioTracks ||
      (content as any)?.audioTracks ||
      contentPart0?.audioTracks;

    const hasVerifiedS1 = Array.isArray(existingS1Dl) && existingS1Dl.length > 0;
    const hasVerifiedS2 = Array.isArray(existingS2Dl) && existingS2Dl.length > 0;

    if (hasVerifiedS1) {
      setServer1Meta({
        downloadQualities: existingS1Dl,
        audioTracks: Array.isArray(existingAudios) ? existingAudios : undefined,
        duration: requestedDur,
        isLiveProbed: true,
      });
    }
    if (hasVerifiedS2) {
      setServer2Meta({
        downloadQualities: existingS2Dl,
        audioTracks: Array.isArray(existingAudios) ? existingAudios : undefined,
        duration: requestedDur,
        isLiveProbed: true,
      });
    }

    // If Admin already verified qualities, skip slow live network probing!
    if ((modalServer === 'server1' && hasVerifiedS1) || (modalServer === 'server2' && hasVerifiedS2)) {
      setIsProbing(false);
      return;
    }

    const deferTimer = setTimeout(async () => {
      if (isCancelled) return;
      setIsProbing(true);
      try {
        if (modalServer === 'server2' && secondaryUrl && !hasVerifiedS2) {
          const s2 = await probeSingleServerUrl(secondaryUrl, requestedDur);
          if (!isCancelled && s2) setServer2Meta(s2);
        } else if (modalServer === 'server1' && primaryUrl && !hasVerifiedS1) {
          const s1 = await probeSingleServerUrl(primaryUrl, requestedDur);
          if (!isCancelled && s1) setServer1Meta(s1);
        }
      } finally {
        if (!isCancelled) setIsProbing(false);
      }
    }, 60);

    return () => {
      isCancelled = true;
      clearTimeout(deferTimer);
    };
  }, [content, isSeries, focusedEpisodeIdx, currentEpisodes, primaryUrl, secondaryUrl, modalServer]);

  // 2. Unified Available Languages Filter (Applies smoothly to BOTH Server 1 and Server 2 without forcing server jumps!)
  const availableLanguages = useMemo(() => {
    const list: string[] = [];

    const addLang = (rawLang: string) => {
      if (!rawLang || typeof rawLang !== 'string') return;
      // Split comma/slash separated language strings e.g. "Hindi, English"
      const parts = rawLang.split(/[,/|•+]+/).map((s) => s.trim()).filter(Boolean);
      for (const part of parts) {
        if (isQualityKey(part)) continue;
        const cleaned = ClientHlsDownloader.normalizeLanguageLabel(part, part) || part.trim();
        if (
          !cleaned ||
          cleaned === 'Default' ||
          cleaned === 'Default Audio' ||
          cleaned.toLowerCase() === 'unknown' ||
          isQualityKey(cleaned)
        ) {
          continue;
        }
        if (!list.some((l) => l.toLowerCase() === cleaned.toLowerCase())) {
          list.push(cleaned);
        }
      }
    };

    // Collect from live/verified server meta
    if (Array.isArray(server1Meta?.audioTracks)) {
      server1Meta!.audioTracks!.forEach(addLang);
    }
    if (Array.isArray(server2Meta?.audioTracks)) {
      server2Meta!.audioTracks!.forEach(addLang);
    }

    // Collect across episodes in the active season (both Server 1 & Server 2 metadata)
    if (isSeries) {
      for (const ep of currentEpisodes) {
        if (Array.isArray((ep as any)?.audioTracks)) (ep as any).audioTracks.forEach(addLang);
        if (Array.isArray((ep as any)?.secondaryAudioTracks)) (ep as any).secondaryAudioTracks.forEach(addLang);
        if (Array.isArray((ep as any)?.languages)) (ep as any).languages.forEach(addLang);
        if (typeof (ep as any)?.language === 'string') addLang((ep as any).language);
        if (ep?.videoSources && typeof ep.videoSources === 'object') {
          Object.keys(ep.videoSources).forEach(addLang);
        }
      }
    }

    // Collect from content-level metadata
    if (Array.isArray((content as any).audioTracks)) {
      (content as any).audioTracks.forEach(addLang);
    }
    if (Array.isArray((content as any).secondaryAudioTracks)) {
      (content as any).secondaryAudioTracks.forEach(addLang);
    }
    if (content.videoSources && typeof content.videoSources === 'object') {
      Object.keys(content.videoSources).forEach(addLang);
    }
    if (Array.isArray(content.languages) && content.languages.length > 0) {
      content.languages.forEach(addLang);
    }
    if (Array.isArray(content.availableLanguages)) {
      content.availableLanguages.forEach(addLang);
    }
    if (typeof (content as any).language === 'string') {
      addLang((content as any).language);
    }

    if (list.length === 0) {
      list.push('Hindi');
    }
    return list;
  }, [content, isSeries, currentEpisodes, server1Meta, server2Meta]);

  const [selectedLanguage, setSelectedLanguage] = useState<string>(availableLanguages[0] || 'Hindi');

  useEffect(() => {
    if (
      availableLanguages.length > 0 &&
      !availableLanguages.some((l) => l.toLowerCase() === selectedLanguage.toLowerCase())
    ) {
      setSelectedLanguage(availableLanguages[0]);
    }
  }, [availableLanguages, selectedLanguage]);

  /**
   * Helper: Builds the exact map of available qualities `{ [qId]: { id, url, sizeMb, bandwidth } }`
   * for a single item (`ep` for Series, or `null` for Movie) on a specific server (`server1` or `server2`).
   * STRICTLY isolated per episode so Episode N never inherits Episode 1's qualities or URLs!
   */
  const getItemServerQualityMap = (
    ep: any | null,
    serverId: 'server1' | 'server2',
    liveMetaForItem: ExtractedServerMeta | null = null
  ): Map<string, { id: string; url: string; sizeMb: number; bandwidth: number; label: string; badge: string }> => {
    const map = new Map<
      string,
      { id: string; url: string; sizeMb: number; bandwidth: number; label: string; badge: string }
    >();

    const isS2 = serverId === 'server2';

    let linksDict: Record<string, string> | undefined;
    let savedDlArr: any[] | undefined;
    let singleFallbackUrl = '';

    if (ep) {
      const epPart0 =
        Array.isArray(ep?.videoLinks) && ep.videoLinks.length > 0 && typeof ep.videoLinks[0] === 'object'
          ? ep.videoLinks[0]
          : null;

      linksDict = isS2
        ? (ep as any)?.secondaryServerQualityLinks ||
          (ep as any)?.secondaryQualityLinks ||
          epPart0?.secondaryServerQualityLinks ||
          epPart0?.secondaryQualityLinks
        : ep?.qualityLinks || epPart0?.qualityLinks;

      savedDlArr = isS2
        ? (ep as any)?.secondaryDownloadQualities || epPart0?.secondaryDownloadQualities
        : (ep as any)?.downloadQualities || epPart0?.downloadQualities;

      const urls = extractUrlsFromItem(ep, false);
      singleFallbackUrl = isS2 ? urls.secondaryUrl : urls.primaryUrl;
    } else {
      const contentPart0 =
        Array.isArray((content as any)?.videoLinks) &&
        (content as any).videoLinks.length > 0 &&
        typeof (content as any).videoLinks[0] === 'object'
          ? (content as any).videoLinks[0]
          : null;
      const moviePart0 =
        Array.isArray((content as any)?.movieParts) &&
        (content as any).movieParts.length > 0 &&
        typeof (content as any).movieParts[0] === 'object'
          ? (content as any).movieParts[0]
          : null;

      linksDict = isS2
        ? (content as any).secondaryServerQualityLinks ||
          content.secondaryQualityLinks ||
          contentPart0?.secondaryServerQualityLinks ||
          contentPart0?.secondaryQualityLinks ||
          moviePart0?.secondaryServerQualityLinks ||
          moviePart0?.secondaryQualityLinks
        : content.qualityLinks || contentPart0?.qualityLinks || moviePart0?.qualityLinks;

      savedDlArr = isS2
        ? (content as any)?.secondaryDownloadQualities || contentPart0?.secondaryDownloadQualities
        : (content as any)?.downloadQualities || contentPart0?.downloadQualities;

      const urls = extractUrlsFromItem(null, true);
      singleFallbackUrl = isS2 ? urls.secondaryUrl : urls.primaryUrl;
    }

    const cleanedLinks = sanitizeQualityDict(linksDict, savedDlArr);
    const hasExplicitBoxes = Object.keys(cleanedLinks).length > 0;

    // 1. Add Admin-configured explicit quality links (1080p, 720p, 480p, 360p)
    if (hasExplicitBoxes) {
      for (const [cleanKey, cleanLink] of Object.entries(cleanedLinks)) {
        map.set(cleanKey, {
          id: cleanKey,
          url: cleanLink,
          sizeMb: 0,
          bandwidth: 0,
          label: `${cleanKey} ${
            cleanKey.includes('1080')
              ? 'Full HD'
              : cleanKey.includes('720')
              ? 'HD'
              : cleanKey.includes('480')
              ? 'Standard'
              : 'Data Saver'
          }`,
          badge: cleanKey.includes('1080')
            ? 'Full HD'
            : cleanKey.includes('720')
            ? 'HD'
            : cleanKey.includes('480')
            ? 'Standard'
            : 'Data Saver',
        });
      }
    }

    // 2. Merge Admin-verified downloadQualities (real MB size saved from Admin Verify button)
    if (Array.isArray(savedDlArr)) {
      for (const q of savedDlArr) {
        const qId = String(q?.id || '').trim();
        if (!isQualityKey(qId) || qId.toLowerCase() === 'auto') continue;
        const existing = map.get(qId);
        if (hasExplicitBoxes && !existing) continue;
        const realMb = Number(q?.sizeMb) > 0 ? Math.round(Number(q.sizeMb)) : existing?.sizeMb || 0;
        const cleanUrl = SmartStreamService.sanitizeStreamUrl(existing?.url || q?.url || singleFallbackUrl || '');
        if (!cleanUrl) continue;
        map.set(qId, {
          id: qId,
          url: cleanUrl,
          sizeMb: realMb,
          bandwidth: Number(q?.bandwidth || existing?.bandwidth || 0),
          label:
            q?.label ||
            existing?.label ||
            `${qId} ${qId.includes('1080') ? 'Full HD' : qId.includes('720') ? 'HD' : 'Standard'}`,
          badge: realMb > 0 ? 'Verified HLS • Real Size' : existing?.badge || 'Verified Stream',
        });
      }
    }

    // 3. Merge live probed HLS manifest variants (only when applicable to this item)
    if (liveMetaForItem && Array.isArray(liveMetaForItem.downloadQualities)) {
      const allowNewVariants = map.size === 0;
      for (const q of liveMetaForItem.downloadQualities) {
        const qId = String(q?.id || '').trim();
        if (!isQualityKey(qId) || qId.toLowerCase() === 'auto') continue;
        const existing = map.get(qId);
        if (!existing && !allowNewVariants) continue;
        const realMb =
          existing?.sizeMb && existing.sizeMb > 0
            ? existing.sizeMb
            : Number(q?.sizeMb) > 0
            ? Math.round(Number(q.sizeMb))
            : 0;
        const cleanUrl = SmartStreamService.sanitizeStreamUrl(existing?.url || q?.url || singleFallbackUrl || '');
        if (!cleanUrl) continue;
        map.set(qId, {
          id: qId,
          url: cleanUrl,
          sizeMb: realMb,
          bandwidth: Number(q?.bandwidth || existing?.bandwidth || 0),
          label:
            q?.label ||
            existing?.label ||
            `${qId} ${qId.includes('1080') ? 'Full HD' : qId.includes('720') ? 'HD' : 'Standard'}`,
          badge:
            realMb > 0
              ? qId.includes('1080')
                ? 'Verified • Full HD'
                : qId.includes('720')
                ? 'Verified • HD'
                : 'Verified • Data Saver'
              : existing?.badge || 'Live Stream',
        });
      }
    }

    // 4. If single URL exists without explicit boxes or verified array yet, check SmartStreamService cache or provide single entry
    if (map.size === 0 && singleFallbackUrl) {
      const cachedMeta = SmartStreamService.getCachedStreamMeta(singleFallbackUrl);
      if (cachedMeta && Array.isArray(cachedMeta.downloadQualities) && cachedMeta.downloadQualities.length > 0) {
        for (const q of cachedMeta.downloadQualities) {
          const qId = String(q?.id || '').trim();
          if (!isQualityKey(qId) || qId.toLowerCase() === 'auto') continue;
          map.set(qId, {
            id: qId,
            url: SmartStreamService.sanitizeStreamUrl(q?.url || singleFallbackUrl),
            sizeMb: Number(q?.sizeMb) > 0 ? Math.round(Number(q.sizeMb)) : 0,
            bandwidth: Number(q?.bandwidth || 0),
            label: `${qId} Stream`,
            badge: 'HLS Stream',
          });
        }
      }
    }

    return map;
  };

  // 3. Movie Quality Options & Series Global Quality Pill Filter Options
  const { qualityOptions, crossServerQualityOptions, seriesGlobalQualities } = useMemo(() => {
    const isServer2 = modalServer === 'server2';

    if (isMovie) {
      const s1Map = hasServer1 ? getItemServerQualityMap(null, 'server1', server1Meta) : new Map();
      const s2Map = hasServer2 ? getItemServerQualityMap(null, 'server2', server2Meta) : new Map();

      const toOptions = (
        m: Map<string, { id: string; url: string; sizeMb: number; bandwidth: number; label: string; badge: string }>,
        srv: 'server1' | 'server2'
      ): QualityOptionItem[] =>
        Array.from(m.values())
          .map((v) => ({
            id: v.id,
            label: v.label,
            badge: v.badge,
            movieSizeMb: v.sizeMb,
            epSizeMb: v.sizeMb,
            bandwidth: v.bandwidth,
            url: v.url,
            isLive: true,
            serverSource: srv,
          }))
          .sort((a, b) => (parseInt(b.id, 10) || 0) - (parseInt(a.id, 10) || 0));

      const s1Opts = toOptions(s1Map, 'server1');
      const s2Opts = toOptions(s2Map, 'server2');

      return {
        qualityOptions: isServer2 ? s2Opts : s1Opts,
        crossServerQualityOptions: isServer2 ? s1Opts : s2Opts,
        seriesGlobalQualities: [] as string[],
      };
    }

    // For Series: Aggregate all available qualities across all episodes in the current season (on both Server 1 & Server 2)
    // so the top Pill Filter Bar always shows every quality that exists in the season (e.g. 1080p, 720p, 480p, 360p).
    const allQualitiesSet = new Set<string>();
    const activeServerMap = new Map<string, QualityOptionItem>();
    const otherServerMap = new Map<string, QualityOptionItem>();

    currentEpisodes.forEach((ep, idx) => {
      const isFocused = idx === focusedEpisodeIdx;
      const s1Map = getItemServerQualityMap(ep, 'server1', isFocused ? server1Meta : null);
      const s2Map = getItemServerQualityMap(ep, 'server2', isFocused ? server2Meta : null);

      for (const [qId, val] of s1Map.entries()) {
        allQualitiesSet.add(qId);
        const targetMap = isServer2 ? otherServerMap : activeServerMap;
        const existing = targetMap.get(qId);
        if (!existing || (val.sizeMb > 0 && existing.epSizeMb === 0)) {
          targetMap.set(qId, {
            id: qId,
            label: val.label,
            badge: val.badge,
            movieSizeMb: val.sizeMb,
            epSizeMb: val.sizeMb,
            bandwidth: val.bandwidth,
            url: val.url,
            isLive: true,
            serverSource: 'server1',
          });
        }
      }

      for (const [qId, val] of s2Map.entries()) {
        allQualitiesSet.add(qId);
        const targetMap = isServer2 ? activeServerMap : otherServerMap;
        const existing = targetMap.get(qId);
        if (!existing || (val.sizeMb > 0 && existing.epSizeMb === 0)) {
          targetMap.set(qId, {
            id: qId,
            label: val.label,
            badge: val.badge,
            movieSizeMb: val.sizeMb,
            epSizeMb: val.sizeMb,
            bandwidth: val.bandwidth,
            url: val.url,
            isLive: true,
            serverSource: 'server2',
          });
        }
      }
    });

    if (allQualitiesSet.size === 0) {
      ['1080p', '720p', '480p', '360p'].forEach((q) => allQualitiesSet.add(q));
    }

    const sortedGlobalQualities = Array.from(allQualitiesSet).sort(
      (a, b) => (parseInt(b, 10) || 0) - (parseInt(a, 10) || 0)
    );

    const activeOpts = Array.from(activeServerMap.values()).sort(
      (a, b) => (parseInt(b.id, 10) || 0) - (parseInt(a.id, 10) || 0)
    );
    const otherOpts = Array.from(otherServerMap.values()).sort(
      (a, b) => (parseInt(b.id, 10) || 0) - (parseInt(a.id, 10) || 0)
    );

    return {
      qualityOptions: activeOpts,
      crossServerQualityOptions: otherOpts,
      seriesGlobalQualities: sortedGlobalQualities,
    };
  }, [
    content,
    isSeries,
    isMovie,
    currentEpisodes,
    focusedEpisodeIdx,
    server1Meta,
    server2Meta,
    modalServer,
    hasServer1,
    hasServer2,
  ]);

  const [selectedQuality, setSelectedQuality] = useState<string>(() => {
    try {
      const savedDlQ = localStorage.getItem('maxplay_download_quality');
      if (savedDlQ && savedDlQ !== 'auto') return savedDlQ;
      const savedVidQ = localStorage.getItem('maxplay_video_quality');
      if (savedVidQ && savedVidQ !== 'auto') return savedVidQ;
    } catch {}
    if (isSeries && seriesGlobalQualities.length > 0) {
      return seriesGlobalQualities[0];
    }
    return qualityOptions[0]?.id || crossServerQualityOptions[0]?.id || '720p';
  });

  // Active quality ID (for Series, matches seriesGlobalQualities; for Movies, matches qualityOptions)
  const activeQualityId = useMemo(() => {
    if (isSeries) {
      const match = seriesGlobalQualities.find(
        (q) => q.toLowerCase() === selectedQuality.toLowerCase()
      );
      return match || seriesGlobalQualities[0] || '720p';
    }
    const match = qualityOptions.find((q) => q.id.toLowerCase() === selectedQuality.toLowerCase());
    return match?.id || qualityOptions[0]?.id || crossServerQualityOptions[0]?.id || '720p';
  }, [isSeries, seriesGlobalQualities, qualityOptions, crossServerQualityOptions, selectedQuality]);

  /**
   * 4. SMART PER-EPISODE RESOLUTION ENGINE (Scenarios A, B, and C):
   * Evaluates every episode in `currentEpisodes` against the user's global filter:
   * - `modalServer` ('server1' | 'server2')
   * - `activeQualityId` (e.g. '1080p')
   * - `selectedLanguage` (e.g. 'Hindi')
   *
   * Rules:
   * - Scenario A (Exact Match on Selected Server):
   *   Episode has `activeQualityId` on `modalServer` -> Downloads from `modalServer` at `activeQualityId`.
   * - Scenario B (Cross-Server Same-Quality Auto-Switch):
   *   Episode does NOT have `activeQualityId` on `modalServer`, BUT has `activeQualityId` on `otherServer` ->
   *   Automatically switches that episode to `otherServer` at `activeQualityId` (with `selectedLanguage`).
   * - Scenario C (Lower Quality Fallback + Red Confirmation Alert):
   *   Neither `Server 1` nor `Server 2` has `activeQualityId` for this episode ->
   *   Automatically selects the best available fallback quality (e.g. `720p` or `480p`), marks `isFallbackQuality = true`
   *   so the Confirmation Screen highlights it in RED with an inline "Unselect" button!
   */
  const episodeResolutionPlans = useMemo<EpisodeResolvedPlan[]>(() => {
    if (!isSeries) return [];
    const primarySrv: 'server1' | 'server2' = modalServer;
    const otherSrv: 'server1' | 'server2' = modalServer === 'server1' ? 'server2' : 'server1';
    const targetQ = activeQualityId;
    const targetQNum = parseInt(targetQ, 10) || 720;

    return currentEpisodes.map((ep, idx) => {
      const epNum = ep?.episodeNumber || idx + 1;
      const epTitle = ep?.title || `Episode ${epNum}`;
      const epId = ep?.id || `ep-${epNum}`;
      const isFocused = idx === focusedEpisodeIdx;

      const s1Map = getItemServerQualityMap(ep, 'server1', isFocused ? server1Meta : null);
      const s2Map = getItemServerQualityMap(ep, 'server2', isFocused ? server2Meta : null);
      const epUrls = extractUrlsFromItem(ep, false);

      const primaryMap = primarySrv === 'server1' ? s1Map : s2Map;
      const otherMap = otherSrv === 'server1' ? s1Map : s2Map;
      const primarySingleUrl = primarySrv === 'server1' ? epUrls.primaryUrl : epUrls.secondaryUrl;
      const otherSingleUrl = otherSrv === 'server1' ? epUrls.primaryUrl : epUrls.secondaryUrl;

      const findExactInMap = (
        m: Map<string, { id: string; url: string; sizeMb: number; bandwidth: number; label: string; badge: string }>,
        qKey: string
      ) => {
        if (m.has(qKey)) return m.get(qKey)!;
        for (const [k, v] of m.entries()) {
          if (k.toLowerCase() === qKey.toLowerCase()) return v;
        }
        return null;
      };

      const pickBestFallbackFromMap = (
        m: Map<string, { id: string; url: string; sizeMb: number; bandwidth: number; label: string; badge: string }>
      ) => {
        const list = Array.from(m.values()).sort(
          (a, b) => (parseInt(b.id, 10) || 0) - (parseInt(a.id, 10) || 0)
        );
        if (list.length === 0) return null;
        // Prefer highest quality below targetQNum (e.g. if 1080p requested, pick 720p -> 480p -> 360p)
        const lowerList = list.filter((item) => (parseInt(item.id, 10) || 0) < targetQNum);
        return lowerList[0] || list[0];
      };

      // Case 1: Exact match on user's selected server
      const exactPrimary = findExactInMap(primaryMap, targetQ);
      if (exactPrimary) {
        const exactBackup = findExactInMap(otherMap, targetQ) || pickBestFallbackFromMap(otherMap);
        return {
          epIndex: idx,
          epNumber: epNum,
          epTitle,
          epId,
          requestedQuality: targetQ,
          resolvedQuality: exactPrimary.id,
          resolvedServer: primarySrv,
          language: selectedLanguage,
          targetUrl: exactPrimary.url,
          backupUrl:
            exactBackup?.url && exactBackup.url !== exactPrimary.url ? exactBackup.url : undefined,
          sizeMb: exactPrimary.sizeMb,
          status: 'exact',
          isFallbackQuality: false,
          isCrossServerAuto: false,
        };
      }

      // Case 2: Exact match is NOT on selected server, but IS available on the other server!
      const exactOther = findExactInMap(otherMap, targetQ);
      if (exactOther) {
        const fallbackPrimary = pickBestFallbackFromMap(primaryMap);
        return {
          epIndex: idx,
          epNumber: epNum,
          epTitle,
          epId,
          requestedQuality: targetQ,
          resolvedQuality: exactOther.id,
          resolvedServer: otherSrv,
          language: selectedLanguage,
          targetUrl: exactOther.url,
          backupUrl:
            fallbackPrimary?.url && fallbackPrimary.url !== exactOther.url
              ? fallbackPrimary.url
              : undefined,
          sizeMb: exactOther.sizeMb,
          status: 'cross_server_exact',
          isFallbackQuality: false,
          isCrossServerAuto: true,
        };
      }

      // Case 3: Neither Server 1 nor Server 2 has `targetQ` in explicit quality maps.
      // Check if either server has lower/other explicit qualities (Fallback Quality Scenario)
      const fallbackPrimary = pickBestFallbackFromMap(primaryMap);
      const fallbackOther = pickBestFallbackFromMap(otherMap);

      if (fallbackPrimary || fallbackOther) {
        // Choose primary server's best fallback if available, otherwise other server's best fallback
        const chosen = fallbackPrimary || fallbackOther!;
        const chosenServer: 'server1' | 'server2' = fallbackPrimary ? primarySrv : otherSrv;
        const backupCandidate = fallbackPrimary ? fallbackOther : fallbackPrimary;

        return {
          epIndex: idx,
          epNumber: epNum,
          epTitle,
          epId,
          requestedQuality: targetQ,
          resolvedQuality: chosen.id,
          resolvedServer: chosenServer,
          language: selectedLanguage,
          targetUrl: chosen.url,
          backupUrl:
            backupCandidate?.url && backupCandidate.url !== chosen.url
              ? backupCandidate.url
              : undefined,
          sizeMb: chosen.sizeMb,
          status: 'fallback_quality',
          isFallbackQuality: chosen.id.toLowerCase() !== targetQ.toLowerCase(),
          isCrossServerAuto: chosenServer !== primarySrv,
        };
      }

      // Case 4: Legacy single-URL episode (no explicit qualityLinks map configured)
      if (primarySingleUrl || otherSingleUrl) {
        const usePrimary = Boolean(primarySingleUrl);
        const resolvedSrv = usePrimary ? primarySrv : otherSrv;
        const tUrl = usePrimary ? primarySingleUrl : otherSingleUrl;
        const bUrl = usePrimary ? otherSingleUrl : primarySingleUrl;
        return {
          epIndex: idx,
          epNumber: epNum,
          epTitle,
          epId,
          requestedQuality: targetQ,
          resolvedQuality: targetQ,
          resolvedServer: resolvedSrv,
          language: selectedLanguage,
          targetUrl: tUrl,
          backupUrl: bUrl && bUrl !== tUrl ? bUrl : undefined,
          sizeMb: 0,
          status: usePrimary ? 'exact' : 'cross_server_exact',
          isFallbackQuality: false,
          isCrossServerAuto: !usePrimary,
        };
      }

      return {
        epIndex: idx,
        epNumber: epNum,
        epTitle,
        epId,
        requestedQuality: targetQ,
        resolvedQuality: targetQ,
        resolvedServer: primarySrv,
        language: selectedLanguage,
        targetUrl: '',
        sizeMb: 0,
        status: 'unavailable',
        isFallbackQuality: false,
        isCrossServerAuto: false,
      };
    });
  }, [
    isSeries,
    currentEpisodes,
    modalServer,
    activeQualityId,
    selectedLanguage,
    focusedEpisodeIdx,
    server1Meta,
    server2Meta,
  ]);

  // Toggle an episode in the vertical list (0ms instant, no network re-probing!)
  const toggleEpisode = (idx: number) => {
    setSelectedEpIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        if (next.size > 1) next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  // Unselect an episode directly from the Confirmation Screen (e.g. when user sees Red fallback warning)
  const unselectEpisodeFromConfirmation = (idx: number) => {
    setSelectedEpIndices((prev) => {
      const next = new Set(prev);
      next.delete(idx);
      if (next.size === 0) {
        setShowSummaryReview(false);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEpIndices.size === currentEpisodes.length) {
      setSelectedEpIndices(new Set([0]));
    } else {
      setSelectedEpIndices(new Set(currentEpisodes.map((_, i) => i)));
    }
  };

  // Check if content or episodes support HLS mode
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

  // Movie download URL resolver (Strictly for Movies)
  const resolveMovieDownloadUrl = (
    activeQuality: string,
    targetServer: 'server1' | 'server2'
  ): string => {
    const isS2 = targetServer === 'server2';
    const mMap = getItemServerQualityMap(null, targetServer, isS2 ? server2Meta : server1Meta);
    for (const [k, v] of mMap.entries()) {
      if (k.toLowerCase() === activeQuality.toLowerCase() && v.url) {
        return v.url;
      }
    }
    const firstEntry = Array.from(mMap.values())[0];
    if (firstEntry?.url) return firstEntry.url;
    const urls = extractUrlsFromItem(null, true);
    return isS2 ? urls.secondaryUrl : urls.primaryUrl;
  };

  const activeQualityObj =
    qualityOptions.find((q) => q.id.toLowerCase() === activeQualityId.toLowerCase()) ||
    qualityOptions[0] || {
      id: activeQualityId,
      label: `${activeQualityId}`,
      badge: 'HLS Stream',
      movieSizeMb: 0,
      epSizeMb: 0,
      bandwidth: 0,
      isLive: false,
    };

  const totalEstimatedMb = useMemo(() => {
    if (isMovie) {
      return Math.max(0, Number(activeQualityObj.movieSizeMb || 0));
    }
    let sum = 0;
    selectedEpIndices.forEach((idx) => {
      const plan = episodeResolutionPlans[idx];
      if (plan && plan.sizeMb > 0) {
        sum += plan.sizeMb;
      }
    });
    return Math.max(0, sum);
  }, [isMovie, activeQualityObj, selectedEpIndices, episodeResolutionPlans]);

  // Count how many selected episodes had to fall back to a lower quality or auto-switch servers
  const selectedPlansSummary = useMemo(() => {
    const sorted = Array.from(selectedEpIndices)
      .map(Number)
      .sort((a, b) => a - b)
      .map((idx) => episodeResolutionPlans[idx])
      .filter(Boolean);

    const fallbackCount = sorted.filter((p) => p.isFallbackQuality).length;
    const crossServerCount = sorted.filter((p) => p.isCrossServerAuto && !p.isFallbackQuality).length;
    return { sorted, fallbackCount, crossServerCount };
  }, [selectedEpIndices, episodeResolutionPlans]);

  const handleStartDownload = () => {
    if (!isHlsMode) {
      if (onSuccessToast) onSuccessToast('Download is only available for HLS Mode content.');
      return;
    }

    const backupServer: 'server1' | 'server2' = modalServer === 'server1' ? 'server2' : 'server1';

    if (isMovie) {
      const targetVideoUrl = resolveMovieDownloadUrl(activeQualityId, modalServer);
      const backupVideoUrl = resolveMovieDownloadUrl(activeQualityId, backupServer);
      if (!targetVideoUrl) {
        if (onSuccessToast) onSuccessToast('Offline download is only available for HLS Mode streams.');
        return;
      }
      const estBytes = totalEstimatedMb * 1024 * 1024;

      try {
        localStorage.setItem('maxplay_download_quality', activeQualityId);
      } catch {}

      downloadManager.addTask({
        contentId: content.id,
        title: content.title,
        posterUrl: content.posterUrl || content.backdropUrl || '',
        quality: activeQualityId,
        language: selectedLanguage,
        videoUrl: targetVideoUrl,
        secondaryVideoUrl:
          backupVideoUrl && backupVideoUrl !== targetVideoUrl ? backupVideoUrl : undefined,
        selectedServer: modalServer,
        estimatedBytes: estBytes,
      });

      if (onSuccessToast) {
        onSuccessToast(
          `Added "${content.title}" (${selectedLanguage} • ${activeQualityId.toUpperCase()}) to Downloads!`
        );
      }
    } else {
      // Queue each selected episode using its exact resolved plan (strictly isolated per episode!)
      let queuedCount = 0;
      try {
        localStorage.setItem('maxplay_download_quality', activeQualityId);
      } catch {}

      selectedPlansSummary.sorted.forEach((plan) => {
        if (!plan || !plan.targetUrl) return;
        const estBytes = (plan.sizeMb > 0 ? plan.sizeMb : 180) * 1024 * 1024;

        downloadManager.addTask({
          contentId: content.id,
          episodeId: plan.epId,
          seasonIndex: selectedSeasonIdx,
          episodeIndex: plan.epIndex,
          title: content.title,
          episodeTitle: plan.epTitle,
          posterUrl: content.posterUrl || content.backdropUrl || '',
          quality: plan.resolvedQuality,
          language: plan.language,
          videoUrl: plan.targetUrl,
          secondaryVideoUrl:
            plan.backupUrl && plan.backupUrl !== plan.targetUrl ? plan.backupUrl : undefined,
          selectedServer: plan.resolvedServer,
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
            ? `Started downloading Episode (${selectedLanguage} • ${selectedPlansSummary.sorted[0].resolvedQuality.toUpperCase()})!`
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
        className="flex flex-col w-full max-w-lg max-h-[90vh] bg-[#121216] border border-[#27272A] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 select-none text-left"
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
                    : 'Series Smart Download'}
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
                Offline download is exclusively configured for HLS Mode streams.
              </p>
            </div>
          </div>
        )}

        {/* SUMMARY REVIEW SCREEN (Shown before starting series download) */}
        {showSummaryReview ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
            {/* Top Filter Summary Pill Box */}
            <div className="p-3.5 rounded-2xl bg-[#181822] border border-purple-500/30 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">
                  Selected Filter Configuration
                </span>
                <span className="text-[11px] font-extrabold text-emerald-400">
                  {totalEstimatedMb > 0
                    ? `Total: ${
                        totalEstimatedMb >= 1000
                          ? `${(totalEstimatedMb / 1024).toFixed(2)} GB`
                          : `${totalEstimatedMb} MB`
                      }`
                    : 'Verified HLS Stream'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-xs font-bold text-purple-300">
                  Primary: {modalServer === 'server2' ? 'Server 2' : 'Server 1'}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-xs font-bold text-sky-300">
                  Audio: {selectedLanguage}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-300">
                  Target: {activeQualityId.toUpperCase()}
                </span>
                {isSeries && (
                  <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-white">
                    {selectedPlansSummary.sorted.length} Episode
                    {selectedPlansSummary.sorted.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Red Alert Banner if any episode lacks the requested quality on both servers */}
            {selectedPlansSummary.fallbackCount > 0 && (
              <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/50 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-red-200 leading-relaxed">
                  <span className="font-extrabold text-red-300 block">
                    Quality Notice ({selectedPlansSummary.fallbackCount} Episode
                    {selectedPlansSummary.fallbackCount > 1 ? 's' : ''})
                  </span>
                  Aapne filter mein{' '}
                  <span className="font-extrabold text-white underline">
                    {activeQualityId.toUpperCase()}
                  </span>{' '}
                  select kiya tha, jo niche red-marked episode ke liye Server 1 aur Server 2 dono par
                  available nahi hai. Isliye best available quality auto-select ho gayi hai. Agar aap
                  use download nahi karna chahte, to wahin se{' '}
                  <span className="font-bold text-red-300">Unselect</span> kar sakte hain.
                </div>
              </div>
            )}

            {/* Info Banner if any episode auto-matched exact quality on the other server */}
            {selectedPlansSummary.crossServerCount > 0 && (
              <div className="p-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/35 flex items-center gap-2 text-[11px] text-amber-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>
                  <strong className="text-amber-300">
                    {selectedPlansSummary.crossServerCount} Episode
                    {selectedPlansSummary.crossServerCount > 1 ? 's' : ''}
                  </strong>{' '}
                  auto-matched <strong className="text-white">{activeQualityId.toUpperCase()}</strong>{' '}
                  ({selectedLanguage}) from{' '}
                  <strong className="text-amber-300">
                    {modalServer === 'server1' ? 'Server 2' : 'Server 1'}
                  </strong>
                  .
                </span>
              </div>
            )}

            {/* Vertical Confirmation Queue List */}
            <div>
              <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2 block">
                {isMovie
                  ? 'Item to Download'
                  : `Episodes Ready to Download (${selectedPlansSummary.sorted.length})`}
              </label>

              <div className="space-y-2 max-h-[260px] overflow-y-auto p-1.5 bg-[#0E0E12] rounded-2xl border border-[#27272A]/60">
                {isMovie ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#16161C] border border-[#27272A]">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-xs font-bold text-white truncate">{content.title}</span>
                      <span className="text-[10px] text-[#A1A1AA] mt-0.5">
                        {selectedLanguage} • {activeQualityId.toUpperCase()} •{' '}
                        {modalServer === 'server2' ? 'Server 2' : 'Server 1'}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-400 flex-shrink-0">
                      {totalEstimatedMb > 0
                        ? totalEstimatedMb >= 1000
                          ? `${(totalEstimatedMb / 1024).toFixed(2)} GB`
                          : `${totalEstimatedMb} MB`
                        : 'HLS Ready'}
                    </span>
                  </div>
                ) : (
                  selectedPlansSummary.sorted.map((plan, queuePos) => {
                    const isRedWarning = plan.isFallbackQuality;
                    const isCrossAuto = plan.isCrossServerAuto && !plan.isFallbackQuality;

                    return (
                      <div
                        key={plan.epId || plan.epIndex}
                        className={`flex flex-col gap-1.5 p-2.5 px-3 rounded-xl border transition ${
                          isRedWarning
                            ? 'bg-red-950/30 border-red-500/70 shadow-sm shadow-red-950/40'
                            : isCrossAuto
                            ? 'bg-amber-950/20 border-amber-500/40'
                            : 'bg-[#16161C] border-[#27272A]/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              className={`flex h-6 w-7 flex-shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-black border ${
                                isRedWarning
                                  ? 'bg-red-500/25 border-red-500/50 text-red-200'
                                  : 'bg-purple-600/30 border-purple-500/40 text-purple-300'
                              }`}
                            >
                              E{plan.epNumber}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-white truncate">
                                {plan.epTitle}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                {/* Quality Pill */}
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                                    isRedWarning
                                      ? 'bg-red-500/30 text-red-200 border border-red-400/50'
                                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  }`}
                                >
                                  {plan.resolvedQuality.toUpperCase()}
                                </span>
                                {/* Language Pill */}
                                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                                  {plan.language}
                                </span>
                                {/* Server Pill */}
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    plan.resolvedServer === 'server2'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  }`}
                                >
                                  {plan.resolvedServer === 'server2' ? 'Server 2' : 'Server 1'}
                                  {plan.isCrossServerAuto ? ' (Auto)' : ''}
                                </span>
                                {/* Size Pill */}
                                <span className="text-[10px] font-extrabold text-emerald-400">
                                  {plan.sizeMb > 0
                                    ? plan.sizeMb >= 1000
                                      ? `${(plan.sizeMb / 1024).toFixed(2)} GB`
                                      : `${plan.sizeMb} MB`
                                    : queuePos === 0
                                    ? 'Next'
                                    : `#${queuePos + 1}`}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Inline Unselect button on every row (highlighted in Red for fallback episodes!) */}
                          <button
                            type="button"
                            onClick={() => unselectEpisodeFromConfirmation(plan.epIndex)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer shrink-0 ${
                              isRedWarning
                                ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
                                : 'bg-white/5 hover:bg-red-500/20 text-[#A1A1AA] hover:text-red-300 border border-white/10'
                            }`}
                            title="Unselect this episode"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Unselect</span>
                          </button>
                        </div>

                        {/* Red Warning Explanation inside the episode card when quality fell back */}
                        {isRedWarning && (
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-red-300 bg-red-950/60 px-2.5 py-1 rounded-lg border border-red-500/30">
                            <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
                            <span>
                              {plan.requestedQuality.toUpperCase()} not available for E{plan.epNumber}{' '}
                              — auto-selected{' '}
                              <strong className="text-white">
                                {plan.resolvedQuality.toUpperCase()}
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          /* REGULAR SELECTION BODY */
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {/* 1. SERVER SOURCE PILL SWITCHER (Separated Server 1 & Server 2) */}
            {(hasServer1 || hasServer2) && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider">
                    1. Select Server
                  </label>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    Smart Cross-Server Match Active
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!hasServer1}
                    onClick={() => setModalServer('server1')}
                    className={`flex items-center justify-between py-2 px-3 rounded-full border text-left transition cursor-pointer ${
                      modalServer === 'server1'
                        ? 'bg-purple-500/20 border-purple-500 text-white shadow-sm shadow-purple-500/20'
                        : hasServer1
                        ? 'bg-[#181820] border-[#27272A] text-[#A1A1AA] hover:text-white'
                        : 'bg-[#141418] border-[#1F1F24] text-white/25 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                      <span className="text-xs font-extrabold truncate">Server 1 (Primary)</span>
                    </div>
                    {modalServer === 'server1' && (
                      <Check className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!hasServer2}
                    onClick={() => setModalServer('server2')}
                    className={`flex items-center justify-between py-2 px-3 rounded-full border text-left transition cursor-pointer ${
                      modalServer === 'server2'
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-sm shadow-amber-500/20'
                        : hasServer2
                        ? 'bg-[#181820] border-[#27272A] text-[#A1A1AA] hover:text-white'
                        : 'bg-[#141418] border-[#1F1F24] text-white/25 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-xs font-extrabold truncate">Server 2 (Backup)</span>
                    </div>
                    {modalServer === 'server2' && (
                      <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 2. AUDIO LANGUAGE FILTER PILLS (Works identically for both Server 1 and Server 2) */}
            <div>
              <label className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>2. Audio Language Filter</span>
                <span className="text-[10px] text-sky-400 font-semibold">
                  Applies to {modalServer === 'server2' ? 'Server 2' : 'Server 1'}
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {availableLanguages.map((lang) => {
                  const isSelected = selectedLanguage.toLowerCase() === lang.toLowerCase();
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSelectedLanguage(lang)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border ${
                        isSelected
                          ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-white shadow-sm shadow-sky-500/20'
                          : 'bg-[#181820] border-[#27272A] text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      <span>{lang}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-[#38BDF8]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. QUALITY FILTER (Pill-Shaped Filter for Series, Detailed Quality Cards for Movie) */}
            {isSeries ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider">
                    3. Target Quality Filter
                  </label>
                  <span className="text-[11px] text-emerald-400 font-extrabold">
                    {totalEstimatedMb > 0
                      ? `Selected Total: ${
                          totalEstimatedMb >= 1000
                            ? `${(totalEstimatedMb / 1024).toFixed(2)} GB`
                            : `${totalEstimatedMb} MB`
                        }`
                      : 'Verified Metadata'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {seriesGlobalQualities.map((qId) => {
                    const isSelected = activeQualityId.toLowerCase() === qId.toLowerCase();
                    return (
                      <button
                        key={qId}
                        type="button"
                        onClick={() => setSelectedQuality(qId)}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-extrabold transition cursor-pointer border ${
                          isSelected
                            ? 'bg-[#8B5CF6]/25 border-[#8B5CF6] text-white shadow-sm shadow-purple-500/20'
                            : 'bg-[#181820] border-[#27272A] text-[#A1A1AA] hover:text-white hover:bg-[#20202A]'
                        }`}
                      >
                        <span>{qId.toUpperCase()}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-purple-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* MOVIE QUALITY CARDS (Preserved as requested for Movies) */
              <div>
                <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>
                      Available Qualities ({modalServer === 'server2' ? 'Server 2' : 'Server 1'})
                    </span>
                    {isProbing && (
                      <span className="text-[10px] text-sky-400 font-semibold flex items-center gap-1 animate-pulse">
                        <Sparkles className="h-3 w-3" /> Reading sizes...
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-extrabold">
                    {totalEstimatedMb > 0
                      ? totalEstimatedMb >= 1000
                        ? `${(totalEstimatedMb / 1024).toFixed(2)} GB`
                        : `${totalEstimatedMb} MB`
                      : 'HLS Ready'}
                  </span>
                </label>

                {qualityOptions.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {qualityOptions.map((q) => {
                      const isSelected = activeQualityId.toLowerCase() === q.id.toLowerCase();
                      const rawMb = q.movieSizeMb;
                      const sizeText =
                        rawMb > 0
                          ? rawMb >= 1000
                            ? `${(rawMb / 1024).toFixed(2)} GB`
                            : `${rawMb} MB`
                          : isProbing
                          ? 'Reading MB...'
                          : 'Verified Link';

                      return (
                        <button
                          key={`${modalServer}-${q.id}`}
                          type="button"
                          onClick={() => setSelectedQuality(q.id)}
                          className={`flex flex-col p-2.5 rounded-2xl border text-left transition cursor-pointer relative ${
                            isSelected
                              ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white shadow-md shadow-purple-600/10'
                              : 'bg-[#181820] border-[#27272A] text-[#A1A1AA] hover:bg-[#1E1E28]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-extrabold text-white">
                                {q.id.toUpperCase()}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                  modalServer === 'server2'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                }`}
                              >
                                {modalServer === 'server2' ? 'S2' : 'S1'}
                              </span>
                            </div>
                            {isSelected && <Check className="h-3.5 w-3.5 text-[#8B5CF6]" />}
                          </div>
                          <span className="text-[10px] text-[#A1A1AA] mt-0.5">{q.badge}</span>
                          <span className="text-[11px] font-bold text-emerald-400 mt-1">
                            {sizeText}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-[#16161C] border border-[#27272A] text-xs text-[#A1A1AA]">
                    {isProbing
                      ? 'Reading stream qualities...'
                      : 'No separate qualities configured on this server.'}
                  </div>
                )}

                {crossServerQualityOptions.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-[#27272A]/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300/90">
                        Also Available on{' '}
                        {modalServer === 'server1'
                          ? 'Server 2 (Tap to Switch)'
                          : 'Server 1 (Tap to Switch)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {crossServerQualityOptions.map((q) => {
                        const otherServer = modalServer === 'server1' ? 'server2' : 'server1';
                        const rawMb = q.movieSizeMb;
                        const sizeText =
                          rawMb > 0
                            ? rawMb >= 1000
                              ? `${(rawMb / 1024).toFixed(2)} GB`
                              : `${rawMb} MB`
                            : 'Verified Link';

                        return (
                          <button
                            key={`${otherServer}-${q.id}`}
                            type="button"
                            onClick={() => {
                              setModalServer(otherServer);
                              setSelectedQuality(q.id);
                            }}
                            className="flex flex-col p-2 rounded-xl border border-dashed border-amber-500/35 bg-[#16161E] hover:bg-amber-500/10 hover:border-amber-400 text-left transition cursor-pointer"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-extrabold text-white">
                                {q.id.toUpperCase()}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/30">
                                {otherServer === 'server2' ? 'Server 2' : 'Server 1'}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 mt-1">
                              {sizeText}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. MOVIE SINGLE CARD OR SERIES VERTICAL SCROLLABLE EPISODE LIST */}
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
                      <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-extrabold text-[10px] border border-sky-500/30">
                        {selectedLanguage}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-extrabold text-[10px] border border-purple-500/30">
                        {activeQualityId.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] border border-emerald-500/30">
                        {modalServer === 'server2' ? 'Server 2' : 'Server 1'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-400 flex-shrink-0">
                    {totalEstimatedMb > 0
                      ? totalEstimatedMb >= 1000
                        ? `${(totalEstimatedMb / 1024).toFixed(2)} GB`
                        : `${totalEstimatedMb} MB`
                      : 'HLS Ready'}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                {/* Season Selector Pills if multiple seasons exist */}
                {seasonsData.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
                    {seasonsData.map((season, sIdx) => (
                      <button
                        key={season.id || sIdx}
                        type="button"
                        onClick={() => handleSelectSeason(sIdx)}
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                          selectedSeasonIdx === sIdx
                            ? 'bg-pink-500/20 border-pink-500 text-white'
                            : 'bg-[#181820] border-[#27272A] text-[#A1A1AA] hover:text-white'
                        }`}
                      >
                        {season.title || `Season ${season.seasonNumber || sIdx + 1}`}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider">
                      4. Select Episodes
                    </label>
                    <span className="text-[10px] text-purple-300 font-extrabold bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                      {selectedEpIndices.size} / {currentEpisodes.length} Selected
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
                        <span>Unselect All</span>
                      </>
                    ) : (
                      <>
                        <Square className="h-3.5 w-3.5" />
                        <span>Select All ({currentEpisodes.length})</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Vertical Scrollable Episode List with Live Applied Filter Badges */}
                <div className="space-y-1.5 max-h-[240px] overflow-y-auto p-1.5 bg-[#0E0E12] rounded-2xl border border-[#27272A]/60">
                  {episodeResolutionPlans.map((plan) => {
                    const isSelected = selectedEpIndices.has(plan.epIndex);
                    const isFallback = plan.isFallbackQuality;
                    const isCrossAuto = plan.isCrossServerAuto && !plan.isFallbackQuality;

                    return (
                      <button
                        key={plan.epId || plan.epIndex}
                        type="button"
                        onClick={() => toggleEpisode(plan.epIndex)}
                        className={`w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? isFallback
                              ? 'bg-red-950/25 border-red-500/60 text-white'
                              : 'bg-purple-500/15 border-purple-500/60 text-white shadow-sm'
                            : 'bg-[#16161C] border-[#27272A]/70 text-[#A1A1AA] hover:text-white hover:bg-[#1C1C24]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Checkbox Icon */}
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                              isSelected
                                ? isFallback
                                  ? 'bg-red-500 border-red-400 text-white'
                                  : 'bg-[#8B5CF6] border-purple-400 text-white'
                                : 'bg-[#121216] border-[#3F3F46] text-transparent'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </div>

                          {/* Episode Badge */}
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-[11px] font-extrabold text-white shrink-0">
                            E{plan.epNumber}
                          </span>

                          {/* Episode Title & Applied Filter Badges */}
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-bold text-white truncate">
                              {plan.epTitle}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {/* Resolved Quality Badge */}
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold border ${
                                  isFallback
                                    ? 'bg-red-500/25 text-red-300 border-red-500/40'
                                    : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                }`}
                              >
                                {isFallback
                                  ? `${plan.resolvedQuality.toUpperCase()} (${plan.requestedQuality.toUpperCase()} N/A)`
                                  : plan.resolvedQuality.toUpperCase()}
                              </span>

                              {/* Applied Language Badge */}
                              <span className="px-1.5 py-0.2 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[9px] font-bold">
                                {plan.language}
                              </span>

                              {/* Resolved Server Badge */}
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold border ${
                                  isCrossAuto
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : plan.resolvedServer === 'server2'
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {plan.resolvedServer === 'server2' ? 'S2' : 'S1'}
                                {isCrossAuto ? ' Auto' : ''}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Episode Verified Size in MB */}
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-[11px] font-extrabold text-emerald-400">
                            {plan.sizeMb > 0
                              ? plan.sizeMb >= 1000
                                ? `${(plan.sizeMb / 1024).toFixed(2)} GB`
                                : `${plan.sizeMb} MB`
                              : 'Ready'}
                          </span>
                        </div>
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
                <span>Back / Edit</span>
              </button>

              <button
                type="button"
                disabled={isSeries && selectedPlansSummary.sorted.length === 0}
                onClick={handleStartDownload}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-teal-900/40 hover:opacity-95 active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>
                  Confirm & Download ({isMovie ? 'Movie' : `${selectedPlansSummary.sorted.length} Ep`})
                </span>
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
                  {totalEstimatedMb > 0
                    ? `Total: ${
                        totalEstimatedMb >= 1000
                          ? `${(totalEstimatedMb / 1024).toFixed(2)} GB`
                          : `${totalEstimatedMb} MB`
                      }`
                    : isProbing
                    ? 'Reading stream size...'
                    : 'Verified HLS Stream'}
                </span>
              </div>

              <button
                type="button"
                disabled={!isHlsMode || (isSeries && selectedEpIndices.size === 0)}
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
                  isHlsMode && (!isSeries || selectedEpIndices.size > 0)
                    ? 'bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#EC4899] shadow-purple-900/40 hover:opacity-95 active:scale-95 cursor-pointer'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                }`}
              >
                <Download className="h-4 w-4" />
                <span>
                  {isHlsMode
                    ? isMovie
                      ? 'Download Movie'
                      : `Download (${selectedEpIndices.size} Ep${
                          selectedEpIndices.size > 1 ? 's' : ''
                        })`
                    : 'Download Unavailable'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
