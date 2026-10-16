import React, { useState, useMemo, useEffect } from 'react';
import { X, Download, Check, Sparkles, Film, Tv, HardDrive, CheckSquare, Square } from 'lucide-react';
import { ContentItem } from '../../types';
import { downloadManager } from '../../services/DownloadManager';

interface DownloadSelectionModalProps {
  visible: boolean;
  content: ContentItem;
  initialSeasonIndex?: number;
  initialEpisodeIndex?: number;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const DownloadSelectionModal: React.FC<DownloadSelectionModalProps> = ({
  visible,
  content,
  initialSeasonIndex = 0,
  initialEpisodeIndex = 0,
  onClose,
  onSuccessToast,
}) => {
  if (!visible || !content) return null;

  const isSeries = content.type === 'series' || content.type === 'anime' || (content.seasons && content.seasons > 0);
  const isMovie = !isSeries;

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
    // Fallback generate episode items if episodes count is known
    const count = content.episodes || 12;
    return Array.from({ length: count }, (_, i) => ({
      id: `ep-${i + 1}`,
      episodeNumber: i + 1,
      title: `Episode ${i + 1}`,
      duration: content.duration || 1440,
      videoUrl: content.videoUrl || '',
    }));
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

  // Dynamic real-time extracted metadata state
  const [extractedMeta, setExtractedMeta] = useState<{
    audioTracks?: string[];
    qualities?: string[];
    downloadQualities?: Array<{ id: string; label: string; sizeMb: number; url?: string }>;
    duration?: number;
  } | null>(null);
  const [isProbing, setIsProbing] = useState<boolean>(false);

  // Background probe for real HLS audio tracks, qualities and exact MB calculations of the focused episode
  useEffect(() => {
    let isCancelled = false;
    const activeEp = isSeries ? currentEpisodes[focusedEpisodeIdx] : null;
    const targetUrl = (activeEp?.videoUrl || content.videoUrl || (content.qualityLinks ? Object.values(content.qualityLinks)[0] : '')) as string;

    const existingDl = (activeEp as any)?.downloadQualities || (content as any)?.downloadQualities;
    const existingAudios = (activeEp as any)?.audioTracks || (content as any)?.audioTracks;

    if (Array.isArray(existingDl) && existingDl.length > 0 && Array.isArray(existingAudios) && existingAudios.length > 0) {
      setExtractedMeta({
        downloadQualities: existingDl,
        audioTracks: existingAudios,
        duration: activeEp?.duration || content.duration || 0,
      });
      return;
    }

    if (!targetUrl || typeof targetUrl !== 'string') return;

    setIsProbing(true);
    fetch('/api/extract-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: targetUrl,
        duration: activeEp?.duration || content.duration || 0,
        forceRefresh: false,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.ok) {
          setExtractedMeta({
            audioTracks: data.audioTracks,
            qualities: data.qualities,
            downloadQualities: data.downloadQualities,
            duration: data.duration,
          });
        }
      })
      .catch((err) => {
        console.warn('[DownloadModal] Stream probe warning:', err);
      })
      .finally(() => {
        if (!isCancelled) setIsProbing(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [content, isSeries, focusedEpisodeIdx, currentEpisodes]);

  // 2. Available Languages resolution (Dynamic from extracted metadata or content)
  const availableLanguages = useMemo(() => {
    const list: string[] = [];
    const activeEp = isSeries ? currentEpisodes[focusedEpisodeIdx] : null;

    if (extractedMeta?.audioTracks && Array.isArray(extractedMeta.audioTracks)) {
      extractedMeta.audioTracks.forEach((l) => l && l !== 'Default' && !list.includes(l) && list.push(l));
    }
    if (activeEp && (activeEp as any).audioTracks && Array.isArray((activeEp as any).audioTracks)) {
      (activeEp as any).audioTracks.forEach((l: string) => l && l !== 'Default' && !list.includes(l) && list.push(l));
    }
    if ((content as any).audioTracks && Array.isArray((content as any).audioTracks)) {
      (content as any).audioTracks.forEach((l: string) => l && l !== 'Default' && !list.includes(l) && list.push(l));
    }
    if (content.languages && Array.isArray(content.languages) && content.languages.length > 0) {
      content.languages.forEach((l) => l && l !== 'Default' && !list.includes(l) && list.push(l));
    }
    if (content.availableLanguages && Array.isArray(content.availableLanguages)) {
      content.availableLanguages.forEach((l) => l && l !== 'Default' && !list.includes(l) && list.push(l));
    }
    if (content.videoSources && typeof content.videoSources === 'object') {
      Object.keys(content.videoSources).forEach((l) => l && l !== 'Default' && !list.includes(l) && list.push(l));
    }
    if (list.length === 0) list.push('Hindi');
    return list;
  }, [content, isSeries, currentEpisodes, focusedEpisodeIdx, extractedMeta]);

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
    const rawDl = extractedMeta?.downloadQualities || (activeEp as any)?.downloadQualities || (content as any)?.downloadQualities;

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

    const qLinks = (activeEp as any)?.qualityLinks || content.qualityLinks;
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
  }, [content, isSeries, currentEpisodes, focusedEpisodeIdx, extractedMeta]);

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

  // Robust download URL resolution for any movie, episode, or series item
  const resolveItemDownloadUrl = (
    ep: any | null,
    activeQuality: string,
    preferredLanguage: string
  ): string => {
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

    if (ep) {
      const epDl = (ep as any)?.downloadQualities;
      if (Array.isArray(epDl) && epDl.length > 0) {
        const match = epDl.find((q: any) => q.id === activeQuality) || epDl[0];
        if (match?.url) return match.url;
      }
      const fromEpSources = findInSources(ep.videoSources);
      if (fromEpSources) return fromEpSources;

      const fromEpQuality = findInQualityDict(ep.qualityLinks);
      if (fromEpQuality) return fromEpQuality;

      if (ep.videoUrl) return ep.videoUrl;
      if (ep.streamUrl) return ep.streamUrl;
      if (ep.url) return ep.url;
    }

    // Content-level resolution
    const matchedOpt = qualityOptions.find((q) => q.id === activeQuality);
    if (matchedOpt?.url) return matchedOpt.url;

    const contentDl = (content as any)?.downloadQualities;
    if (Array.isArray(contentDl) && contentDl.length > 0) {
      const match = contentDl.find((q: any) => q.id === activeQuality) || contentDl[0];
      if (match?.url) return match.url;
    }

    const fromContentSources = findInSources(content.videoSources);
    if (fromContentSources) return fromContentSources;

    const fromContentQuality = findInQualityDict(content.qualityLinks);
    if (fromContentQuality) return fromContentQuality;

    if (content.videoUrl) return content.videoUrl;
    if ((content as any).streamUrl) return (content as any).streamUrl;
    if ((content as any).url) return (content as any).url;

    if (Array.isArray((content as any).movieParts) && (content as any).movieParts.length > 0) {
      const mp0 = (content as any).movieParts[0];
      const s = findInSources(mp0?.videoSources) || findInQualityDict(mp0?.qualityLinks) || mp0?.videoUrl;
      if (s) return s;
    }

    return 'https://media.w3.org/2010/05/sintel/trailer.mp4';
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
    if (isMovie) {
      const targetVideoUrl = resolveItemDownloadUrl(null, activeQualityId, selectedLanguage);
      const estBytes = (activeQualityObj.movieSizeMb || 450) * 1024 * 1024;

      downloadManager.addTask({
        contentId: content.id,
        title: content.title,
        posterUrl: content.posterUrl || content.backdropUrl || '',
        quality: activeQualityId,
        language: selectedLanguage,
        videoUrl: targetVideoUrl,
        estimatedBytes: estBytes,
      });

      if (onSuccessToast) onSuccessToast(`Added "${content.title}" to Downloads!`);
    } else {
      // Add each selected episode to queue
      selectedEpIndices.forEach((idx) => {
        const ep = currentEpisodes[idx];
        if (!ep) return;

        const targetVideoUrl = resolveItemDownloadUrl(ep, activeQualityId, selectedLanguage);
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
          estimatedBytes: estBytes,
        });
      });

      if (onSuccessToast) {
        onSuccessToast(`Queued ${selectedEpIndices.size} episodes in Downloads!`);
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
                    : 'Series Download'}
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
                <span className="px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30 text-xs font-bold text-sky-300">
                  Audio: {selectedLanguage}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs font-bold text-purple-300">
                  Quality: {activeQualityId}
                </span>
                {isSeries && (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-300">
                    {selectedEpIndices.size} Episodes Selected
                  </span>
                )}
              </div>
            </div>

            {/* List of episodes to be downloaded */}
            <div>
              <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2 block">
                {isMovie ? 'Item to Download' : `Selected Episodes (${selectedEpIndices.size})`}
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
                    .map((idx) => {
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
                                {selectedLanguage} • {activeQualityId}
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
              Please verify your selected episodes and tracks. Tap Cancel to modify if needed.
            </p>
          </div>
        ) : (
          /* REGULAR SELECTION BODY */
          <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
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

            {/* 1. AUDIO LANGUAGE SELECTOR */}
            <div>
              <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>Audio Language</span>
                <span className="text-[10px] text-white/40 lowercase">({availableLanguages.length} available)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {availableLanguages.map((lang) => {
                  const isSelected = selectedLanguage.toLowerCase() === lang.toLowerCase();
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSelectedLanguage(lang)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        isSelected
                          ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-white shadow-sm shadow-sky-500/20'
                          : 'bg-[#1C1C22] border-[#27272A] text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      <span>{lang}</span>
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
                      <Sparkles className="h-3 w-3" /> Calculating exact sizes...
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

            {/* 3. SERIES / ANIME EPISODE SELECTOR */}
            {isSeries && (
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
                          <span className="text-[9px] text-[#71717A] mt-1 font-normal">Free</span>
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
                  <span>Offline Download</span>
                </span>
                <span className="text-xs font-extrabold text-white">
                  Total: ~{totalEstimatedMb >= 1000 ? `${(totalEstimatedMb / 1024).toFixed(1)} GB` : `${totalEstimatedMb} MB`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowSummaryReview(true)}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#EC4899] px-6 py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-purple-900/40 hover:opacity-95 active:scale-95 transition cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>
                  {isMovie
                    ? 'Review & Download'
                    : `Review (${selectedEpIndices.size} Ep${selectedEpIndices.size > 1 ? 's' : ''})`}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
