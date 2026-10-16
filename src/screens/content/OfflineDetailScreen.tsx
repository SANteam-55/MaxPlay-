import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  HardDrive,
  Layers,
  Play,
  Film,
  Tv,
  Sparkles,
  ShieldCheck,
  Headphones,
  List,
  LayoutGrid,
} from 'lucide-react';
import { DownloadedFile, downloadManager } from '../../services/DownloadManager';
import { OfflinePlayer } from '../../components/player/OfflinePlayer';

interface OfflineDetailScreenProps {
  initialFile: DownloadedFile;
  initialBlobUrl?: string;
  allDownloadedEpisodes?: DownloadedFile[];
  onBack: () => void;
}

export const OfflineDetailScreen: React.FC<OfflineDetailScreenProps> = ({
  initialFile,
  initialBlobUrl,
  allDownloadedEpisodes = [],
  onBack,
}) => {
  const [currentFile, setCurrentFile] = useState<DownloadedFile>(initialFile);
  const [currentBlobUrl, setCurrentBlobUrl] = useState<string | undefined>(initialBlobUrl);
  const [episodeViewMode, setEpisodeViewMode] = useState<'grid' | 'list'>('grid');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const fetchUrl = async () => {
      try {
        const url = await downloadManager.getOfflineVideoUrl(currentFile.id, currentFile.episodeId, currentFile.episodeIndex);
        if (!isCancelled && url) {
          setCurrentBlobUrl(url);
        }
      } catch (err) {
        console.warn('Failed to load blobUrl in OfflineDetailScreen:', err);
      }
    };

    fetchUrl();

    return () => {
      isCancelled = true;
    };
  }, [currentFile]);

  // Determine if this item is a movie vs series/anime
  const isMovie = useMemo(() => {
    return (
      currentFile.category === 'movie' ||
      (!currentFile.episodeId && currentFile.episodeIndex === undefined)
    );
  }, [currentFile]);

  // Extract and sort downloaded episodes in ascending numeric order (1, 2, 3...)
  // Handles non-sequential downloads (e.g., 1, 3, 7) seamlessly
  const sortedEpisodes = useMemo(() => {
    if (isMovie || !allDownloadedEpisodes || allDownloadedEpisodes.length === 0) {
      return [];
    }

    const getEpisodeNumber = (ep: DownloadedFile): number => {
      if (ep.episodeIndex !== undefined) return ep.episodeIndex + 1;
      const numMatch = ep.episodeId?.match(/\d+/);
      if (numMatch) return parseInt(numMatch[0], 10);
      const titleMatch = ep.subtitle?.match(/episode\s*(\d+)/i) || ep.title?.match(/episode\s*(\d+)/i);
      if (titleMatch) return parseInt(titleMatch[1], 10);
      return 1;
    };

    return [...allDownloadedEpisodes].sort((a, b) => {
      return getEpisodeNumber(a) - getEpisodeNumber(b);
    });
  }, [isMovie, allDownloadedEpisodes]);

  // Current episode index in sorted list
  const currentEpIndex = useMemo(() => {
    if (sortedEpisodes.length === 0) return -1;
    return sortedEpisodes.findIndex(
      (e) => e.id === currentFile.id || (e.storageKey && e.storageKey === currentFile.storageKey)
    );
  }, [sortedEpisodes, currentFile]);

  const hasNextEpisode = currentEpIndex >= 0 && currentEpIndex < sortedEpisodes.length - 1;

  // Switch to another downloaded episode directly inside this screen
  const handleSelectEpisode = async (ep: DownloadedFile) => {
    try {
      const url = await downloadManager.getOfflineVideoUrl(ep.id, ep.episodeId, ep.episodeIndex);
      if (url) {
        setCurrentFile(ep);
        setCurrentBlobUrl(url);
        // Smoothly scroll player into view
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.warn('Failed to switch offline episode:', err);
    }
  };

  const handleNextEpisode = () => {
    if (hasNextEpisode) {
      handleSelectEpisode(sortedEpisodes[currentEpIndex + 1]);
    }
  };

  // Helper to extract clean episode number label
  const getEpLabel = (ep: DownloadedFile): string => {
    if (ep.episodeIndex !== undefined) {
      return (ep.episodeIndex + 1).toString().padStart(2, '0');
    }
    const numMatch = ep.episodeId?.match(/\d+/);
    if (numMatch) {
      return parseInt(numMatch[0], 10).toString().padStart(2, '0');
    }
    return '01';
  };

  // Build clean player title
  const playerTitle = useMemo(() => {
    if (isMovie) {
      return currentFile.title;
    }
    const epNum = getEpLabel(currentFile);
    return `${currentFile.title} • Ep ${epNum}`;
  }, [isMovie, currentFile]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#09090B] text-white overflow-hidden select-none">
      {/* 1. TOP VIDEO PLAYER SECTION (16:9 Responsive Aspect Ratio) */}
      <div className="w-full bg-black shrink-0 relative z-30 shadow-2xl">
        <div className="w-full max-w-5xl mx-auto aspect-video max-h-[48vh] sm:max-h-[55vh]">
          <OfflinePlayer
            file={currentFile}
            blobUrl={currentBlobUrl}
            title={playerTitle}
            onBack={onBack}
            onNext={hasNextEpisode ? handleNextEpisode : undefined}
          />
        </div>
      </div>

      {/* 2. SCROLLABLE DETAILS CONTENT BELOW PLAYER */}
      <div
        ref={scrollContainerRef}
        className="flex-1 w-full overflow-y-auto overflow-x-hidden bg-[#09090B] text-white font-sans scroll-smooth p-4 sm:p-6 pb-24"
      >
        <div className="w-full max-w-5xl mx-auto space-y-4">
          {/* HERO DETAILS CARD */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#16161D]/90 to-[#0E0E13]/90 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden text-left">
            {/* Ambient Purple Radial Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Offline Vault Pill Indicator */}
            <div className="flex items-center justify-between gap-3 mb-2.5 relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Offline Vault • Zero Network</span>
              </span>

              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs font-bold transition cursor-pointer border border-white/10 active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Downloads</span>
              </button>
            </div>

            {/* Title Header */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-snug truncate">
              {currentFile.title}
            </h1>

            {/* Subtitle / Episode Name */}
            {currentFile.subtitle && (
              <p className="text-xs sm:text-sm font-semibold text-purple-300/90 mt-1">
                {currentFile.subtitle}
              </p>
            )}

            {/* Single-Line Metadata Badges Ribbon */}
            <div className="flex items-center gap-2 text-xs font-semibold mt-3.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-[#8B5CF6]/20 text-[#C4B5FD] border border-[#8B5CF6]/30 font-extrabold text-[10px] uppercase tracking-wider">
                {isMovie ? 'Movie' : 'Series'}
              </span>

              {currentFile.quality && (
                <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 font-extrabold text-[10px] uppercase">
                  {currentFile.quality}
                </span>
              )}

              {currentFile.language && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold text-[10px]">
                  <Headphones className="w-3 h-3" />
                  <span>{currentFile.language}</span>
                </span>
              )}

              {currentFile.fileSizeMb && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/10 text-white/80 border border-white/15 font-bold text-[10px]">
                  <HardDrive className="w-3 h-3 text-emerald-400" />
                  <span>{currentFile.fileSizeMb} MB</span>
                </span>
              )}

              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-bold text-[10px]">
                <CheckCircle2 className="w-3 h-3" />
                <span>Downloaded</span>
              </span>
            </div>
          </div>

          {/* PLAYBACK & EPISODES CONTAINER (For Series / Anime) */}
          {!isMovie && sortedEpisodes.length > 0 && (
            <div className="bg-gradient-to-b from-[#131318] to-[#0C0C10] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl text-left">
              {/* Box Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] shadow-[0_0_8px_#8B5CF6]" />
                  <span className="font-extrabold text-sm sm:text-base text-white">
                    Downloaded Episodes ({sortedEpisodes.length})
                  </span>
                </div>

                {/* View Mode Toggle: Grid vs List */}
                <div className="flex items-center gap-1 bg-[#1A1A22] p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setEpisodeViewMode('grid')}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      episodeViewMode === 'grid'
                        ? 'bg-[#8B5CF6] text-white shadow'
                        : 'text-white/50 hover:text-white'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEpisodeViewMode('list')}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      episodeViewMode === 'list'
                        ? 'bg-[#8B5CF6] text-white shadow'
                        : 'text-white/50 hover:text-white'
                    }`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 1. EPISODE NUMERIC GRID VIEW (Exact arrangement e.g. 01, 02, 03... or non-sequential 01, 03) */}
              {episodeViewMode === 'grid' ? (
                <div className="flex flex-wrap items-center gap-2.5 py-1">
                  {sortedEpisodes.map((ep) => {
                    const isCurrent =
                      ep.id === currentFile.id ||
                      (ep.storageKey && ep.storageKey === currentFile.storageKey);
                    const epLabel = getEpLabel(ep);

                    return (
                      <button
                        key={ep.id}
                        type="button"
                        onClick={() => handleSelectEpisode(ep)}
                        className={`relative h-12 w-12 sm:h-14 sm:w-14 flex flex-col items-center justify-center rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer border select-none ${
                          isCurrent
                            ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white shadow-lg shadow-purple-500/40 ring-2 ring-purple-400 scale-105'
                            : 'bg-[#18181D] text-white/80 border-white/10 hover:bg-white/10 hover:border-white/25 active:scale-95'
                        }`}
                        title={ep.subtitle || `Episode ${epLabel}`}
                      >
                        <span>{epLabel}</span>

                        {/* Animated Equalizer bar on active playing episode */}
                        {isCurrent ? (
                          <div className="flex items-center gap-0.5 mt-1">
                            <div className="w-0.5 h-1.5 bg-white rounded-full animate-pulse" />
                            <div className="w-0.5 h-2.5 bg-white rounded-full" />
                            <div className="w-0.5 h-1.5 bg-white rounded-full animate-pulse" />
                          </div>
                        ) : (
                          <span className="text-[9px] font-medium text-white/40 mt-0.5">
                            {ep.quality || 'HD'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* 2. EPISODE DETAILED LIST VIEW */
                <div className="space-y-2.5">
                  {sortedEpisodes.map((ep) => {
                    const isCurrent =
                      ep.id === currentFile.id ||
                      (ep.storageKey && ep.storageKey === currentFile.storageKey);
                    const epLabel = getEpLabel(ep);

                    return (
                      <div
                        key={ep.id}
                        onClick={() => handleSelectEpisode(ep)}
                        className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-gradient-to-r from-purple-950/60 to-[#161622] border-purple-400/60 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/40'
                            : 'bg-[#15151C] border-white/10 hover:border-white/20 hover:bg-[#1A1A24]'
                        }`}
                      >
                        {/* Thumbnail / Episode Number Box */}
                        <div className="relative w-16 sm:w-20 aspect-video rounded-lg overflow-hidden shrink-0 bg-black/60 border border-white/10 flex items-center justify-center">
                          {ep.posterUrl ? (
                            <img
                              src={ep.posterUrl}
                              alt={ep.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Film className="w-5 h-5 text-purple-400" />
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            {isCurrent ? (
                              <div className="w-6 h-6 rounded-full bg-[#8B5CF6] flex items-center justify-center shadow">
                                <Play className="w-3 h-3 fill-white text-white ml-0.5" />
                              </div>
                            ) : (
                              <span className="text-xs font-black text-white">{epLabel}</span>
                            )}
                          </div>
                        </div>

                        {/* Episode Info */}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <h4
                              className={`text-xs sm:text-sm font-bold truncate ${
                                isCurrent ? 'text-purple-300' : 'text-white'
                              }`}
                            >
                              Episode {epLabel} {ep.subtitle ? `• ${ep.subtitle}` : ''}
                            </h4>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-extrabold text-[9px] border border-purple-500/30">
                                Playing
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-white/50">
                            {ep.quality && <span>{ep.quality}</span>}
                            {ep.language && (
                              <>
                                <span>•</span>
                                <span>{ep.language}</span>
                              </>
                            )}
                            {ep.fileSizeMb && (
                              <>
                                <span>•</span>
                                <span>{ep.fileSizeMb} MB</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Play button right */}
                        <button
                          type="button"
                          className="p-2 rounded-full bg-white/5 hover:bg-purple-600/30 text-white/80 hover:text-white transition cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MOVIE PLAYBACK NOTICE */}
          {isMovie && (
            <div className="p-4 rounded-2xl bg-[#121216] border border-white/10 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Film className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Full Feature Movie</h3>
              </div>
              <p className="text-xs text-white/60">
                This feature film is fully stored in your device&apos;s local vault. You can watch anytime offline with zero data usage.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
