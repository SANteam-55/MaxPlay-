import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  ArrowLeft,
  Maximize,
  Minimize,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Gauge,
  Sparkles,
  Check,
  SkipForward,
  SkipBack,
  Layers,
  X,
} from 'lucide-react';
import { DownloadedFile } from '../../services/DownloadManager';

interface OfflineCustomPlayerModalProps {
  file: DownloadedFile;
  blobUrl: string;
  allEpisodes?: DownloadedFile[];
  onSelectEpisode?: (ep: DownloadedFile) => void;
  onClose: () => void;
}

export const OfflineCustomPlayerModal: React.FC<OfflineCustomPlayerModalProps> = ({
  file,
  blobUrl,
  allEpisodes,
  onSelectEpisode,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Series Episodes sequence handling
  const sortedEpisodes = useMemo(() => {
    if (!allEpisodes || allEpisodes.length === 0) return [];
    return [...allEpisodes].sort((a, b) => {
      const numA = a.episodeIndex !== undefined ? a.episodeIndex : (parseInt(a.episodeId?.replace(/\D/g, '') || '0', 10) || 0);
      const numB = b.episodeIndex !== undefined ? b.episodeIndex : (parseInt(b.episodeId?.replace(/\D/g, '') || '0', 10) || 0);
      return numA - numB;
    });
  }, [allEpisodes]);

  const currentEpisodeIdx = useMemo(() => {
    if (sortedEpisodes.length === 0) return -1;
    return sortedEpisodes.findIndex((e) => e.id === file.id || (e.storageKey && e.storageKey === file.storageKey));
  }, [sortedEpisodes, file]);

  const hasNextEpisode = currentEpisodeIdx >= 0 && currentEpisodeIdx < sortedEpisodes.length - 1;
  const hasPrevEpisode = currentEpisodeIdx > 0;

  const handleNextEpisode = () => {
    if (hasNextEpisode && onSelectEpisode) {
      onSelectEpisode(sortedEpisodes[currentEpisodeIdx + 1]);
    }
  };

  const handlePrevEpisode = () => {
    if (hasPrevEpisode && onSelectEpisode) {
      onSelectEpisode(sortedEpisodes[currentEpisodeIdx - 1]);
    }
  };

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Controls & Lock state
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showUnlockBtn, setShowUnlockBtn] = useState<boolean>(false);
  const [showSpeedDrawer, setShowSpeedDrawer] = useState<boolean>(false);
  const [showEpisodesDrawer, setShowEpisodesDrawer] = useState<boolean>(false);
  const [seekFeedback, setSeekFeedback] = useState<'rewind' | 'forward' | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unlockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seekFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  // Reset & trigger auto-hide for controls
  const resetControlsTimer = useCallback(() => {
    if (isLocked) return;
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      setShowSpeedDrawer(false);
    }, 3500);
  }, [isLocked]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current);
      if (seekFeedbackTimeoutRef.current) clearTimeout(seekFeedbackTimeoutRef.current);
    };
  }, [resetControlsTimer]);

  // Video playback listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => {
      if (video.duration && isFinite(video.duration)) {
        setDuration(video.duration);
      }
    };
    const onDurationChange = () => {
      if (video.duration && isFinite(video.duration)) {
        setDuration(video.duration);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onEnded = () => {
      if (hasNextEpisode && onSelectEpisode) {
        handleNextEpisode();
      } else {
        setIsPlaying(false);
        setShowControls(true);
      }
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('ended', onEnded);
    };
  }, [hasNextEpisode, onSelectEpisode, handleNextEpisode]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    resetControlsTimer();
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(time, duration || 0));
    video.currentTime = clamped;
    setCurrentTime(clamped);
    resetControlsTimer();
  };

  const handleRewind10 = () => {
    handleSeek(currentTime - 10);
    setSeekFeedback('rewind');
    if (seekFeedbackTimeoutRef.current) clearTimeout(seekFeedbackTimeoutRef.current);
    seekFeedbackTimeoutRef.current = setTimeout(() => setSeekFeedback(null), 600);
  };

  const handleForward10 = () => {
    handleSeek(currentTime + 10);
    setSeekFeedback('forward');
    if (seekFeedbackTimeoutRef.current) clearTimeout(seekFeedbackTimeoutRef.current);
    seekFeedbackTimeoutRef.current = setTimeout(() => setSeekFeedback(null), 600);
  };

  const handleSpeedSelect = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setShowSpeedDrawer(false);
    resetControlsTimer();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
    resetControlsTimer();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
    resetControlsTimer();
  };

  const cycleAspectRatio = () => {
    if (aspectRatio === 'contain') setAspectRatio('cover');
    else if (aspectRatio === 'cover') setAspectRatio('fill');
    else setAspectRatio('contain');
    resetControlsTimer();
  };

  const handleLockToggle = () => {
    setIsLocked(true);
    setShowControls(false);
    setShowUnlockBtn(true);
    if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current);
    unlockTimeoutRef.current = setTimeout(() => setShowUnlockBtn(false), 2000);
  };

  const handleUnlockClick = () => {
    setIsLocked(false);
    setShowControls(true);
    setShowUnlockBtn(false);
    resetControlsTimer();
  };

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleRewind10();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleForward10();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'Escape') {
        if (!document.fullscreenElement) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentTime, duration]);

  // Touch screen click logic (Single tap: toggle controls; Double tap: seek)
  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLocked) {
      setShowUnlockBtn(true);
      if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current);
      unlockTimeoutRef.current = setTimeout(() => setShowUnlockBtn(false), 2500);
      return;
    }

    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftSide = clickX < rect.width / 2;

    if (now - lastTapTimeRef.current < 300) {
      // Double tap detected
      if (isLeftSide) {
        handleRewind10();
      } else {
        handleForward10();
      }
    } else {
      // Single tap
      setShowControls((prev) => !prev);
      if (!showControls) resetControlsTimer();
    }
    lastTapTimeRef.current = now;
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden"
    >
      {/* VIDEO ELEMENT */}
      <div
        onClick={handleScreenClick}
        className="relative w-full h-full flex items-center justify-center cursor-pointer"
      >
        <video
          ref={videoRef}
          src={blobUrl}
          autoPlay
          playsInline
          className={`w-full h-full ${
            aspectRatio === 'contain'
              ? 'object-contain'
              : aspectRatio === 'cover'
              ? 'object-cover'
              : 'object-fill'
          }`}
        />

        {/* DOUBLE TAP RIPPLE INDICATORS */}
        {seekFeedback === 'rewind' && (
          <div className="absolute left-1/4 top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-white bg-black/60 backdrop-blur-md rounded-full w-24 h-24 pointer-events-none animate-in zoom-in-75 duration-150">
            <RotateCcw className="w-8 h-8 text-[#06B6D4]" />
            <span className="text-xs font-black mt-1">-10s</span>
          </div>
        )}
        {seekFeedback === 'forward' && (
          <div className="absolute right-1/4 top-1/2 -translate-y-1/2 translate-x-1/2 flex flex-col items-center justify-center text-white bg-black/60 backdrop-blur-md rounded-full w-24 h-24 pointer-events-none animate-in zoom-in-75 duration-150">
            <RotateCw className="w-8 h-8 text-[#06B6D4]" />
            <span className="text-xs font-black mt-1">+10s</span>
          </div>
        )}

        {/* BUFFERING SPINNER */}
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-14 w-14 rounded-full border-4 border-white/20 border-t-[#8B5CF6] animate-spin" />
          </div>
        )}
      </div>

      {/* LOCK OVERLAY BUTTON */}
      {isLocked && showUnlockBtn && (
        <div className="absolute top-6 left-6 z-40 animate-in fade-in duration-200">
          <button
            type="button"
            onClick={handleUnlockClick}
            className="flex items-center gap-2 rounded-2xl bg-black/80 backdrop-blur-md px-5 py-2.5 text-xs font-bold text-white border border-white/20 shadow-2xl hover:bg-black/90 active:scale-95 transition cursor-pointer"
          >
            <Unlock className="w-4 h-4 text-amber-400" />
            <span>Screen Locked (Tap to Unlock)</span>
          </button>
        </div>
      )}

      {/* CONTROLS OVERLAY */}
      {!isLocked && showControls && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 flex flex-col justify-between pointer-events-auto transition-opacity duration-200"
        >
          {/* TOP BAR */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/95 via-black/60 to-transparent">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
                title="Back to Downloads"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex flex-col min-w-0 text-left">
                <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>MaxPlay Offline Player</span>
                  {file.quality && (
                    <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[9px] border border-emerald-500/30">
                      {file.quality}
                    </span>
                  )}
                  {file.language && (
                    <span className="bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded text-[9px] border border-sky-500/30">
                      {file.language}
                    </span>
                  )}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-[260px] sm:max-w-md">
                  {file.title} {file.subtitle ? `• ${file.subtitle}` : ''}
                </h3>
              </div>
            </div>

            {/* Top Right Actions */}
            <div className="flex items-center gap-2">
              {sortedEpisodes.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowEpisodesDrawer(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-[11px] font-bold transition cursor-pointer border border-purple-500/30 shadow-md"
                  title="View Episodes"
                >
                  <Layers className="w-3.5 h-3.5 text-purple-300" />
                  <span>Episodes ({sortedEpisodes.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={cycleAspectRatio}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition cursor-pointer border border-white/10"
                title="Aspect Ratio"
              >
                {aspectRatio === 'contain' ? 'Fit' : aspectRatio === 'cover' ? 'Fill' : 'Stretch'}
              </button>

              <button
                type="button"
                onClick={handleLockToggle}
                className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
                title="Lock Controls"
              >
                <Lock className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CENTER CONTROLS */}
          <div className="flex items-center justify-center gap-4 sm:gap-10 my-auto">
            {sortedEpisodes.length > 1 && (
              <button
                type="button"
                disabled={!hasPrevEpisode}
                onClick={handlePrevEpisode}
                className={`p-3 rounded-full bg-black/40 text-white transition ${
                  hasPrevEpisode
                    ? 'hover:bg-black/60 hover:text-purple-400 cursor-pointer active:scale-95'
                    : 'opacity-30 cursor-not-allowed'
                }`}
                title="Previous Episode"
              >
                <SkipBack className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
              </button>
            )}

            <button
              type="button"
              onClick={handleRewind10}
              className="flex flex-col items-center justify-center p-3 rounded-full bg-black/40 hover:bg-black/60 text-white hover:text-[#06B6D4] transition cursor-pointer group"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-7 h-7 sm:w-8 sm:h-8 group-hover:scale-110 transition" />
              <span className="text-[10px] font-bold mt-0.5">10</span>
            </button>

            <button
              type="button"
              onClick={togglePlayPause}
              className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#EC4899] text-white shadow-2xl shadow-purple-900/50 hover:scale-110 active:scale-95 transition cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 sm:w-9 sm:h-9 fill-current" />
              ) : (
                <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-current ml-1" />
              )}
            </button>

            <button
              type="button"
              onClick={handleForward10}
              className="flex flex-col items-center justify-center p-3 rounded-full bg-black/40 hover:bg-black/60 text-white hover:text-[#06B6D4] transition cursor-pointer group"
              title="Forward 10 seconds"
            >
              <RotateCw className="w-7 h-7 sm:w-8 sm:h-8 group-hover:scale-110 transition" />
              <span className="text-[10px] font-bold mt-0.5">10</span>
            </button>

            {sortedEpisodes.length > 1 && (
              <button
                type="button"
                disabled={!hasNextEpisode}
                onClick={handleNextEpisode}
                className={`p-3 rounded-full bg-black/40 text-white transition ${
                  hasNextEpisode
                    ? 'hover:bg-black/60 hover:text-purple-400 cursor-pointer active:scale-95'
                    : 'opacity-30 cursor-not-allowed'
                }`}
                title="Next Episode"
              >
                <SkipForward className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
              </button>
            )}
          </div>

          {/* BOTTOM CONTROLS & TIMELINE */}
          <div className="flex flex-col p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
            {/* PROGRESS SCRUBBER */}
            <div className="relative flex items-center w-full h-6 group cursor-pointer mb-2">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.5}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#8B5CF6] hover:h-2.5 transition-all"
              />
            </div>

            {/* BOTTOM BAR ACTIONS */}
            <div className="flex items-center justify-between">
              {/* Time display */}
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <span className="text-white font-mono">{formatTime(currentTime)}</span>
                <span className="text-white/40">/</span>
                <span className="text-white/60 font-mono">{formatTime(duration)}</span>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-3">
                {/* Speed button & drawer */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSpeedDrawer((prev) => !prev)}
                    className="flex items-center gap-1 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition cursor-pointer"
                  >
                    <Gauge className="w-3.5 h-3.5 text-sky-400" />
                    <span>{playbackRate}x</span>
                  </button>

                  {showSpeedDrawer && (
                    <div className="absolute bottom-10 right-0 z-50 flex flex-col rounded-2xl bg-[#1C1C22] border border-white/15 p-2 shadow-2xl min-w-[110px] animate-in fade-in zoom-in-95 duration-150">
                      {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => handleSpeedSelect(rate)}
                          className={`flex items-center justify-between px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                            playbackRate === rate
                              ? 'bg-purple-600/30 text-purple-300'
                              : 'text-white/80 hover:bg-white/10'
                          }`}
                        >
                          <span>{rate}x</span>
                          {playbackRate === rate && <Check className="w-3.5 h-3.5 text-purple-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Volume / Mute */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {/* Fullscreen */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFFLINE EPISODES DRAWER */}
      {showEpisodesDrawer && (
        <div
          onClick={() => setShowEpisodesDrawer(false)}
          className="absolute inset-0 z-50 flex items-end sm:items-center justify-end bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col w-full sm:max-w-md max-h-[80vh] bg-[#14141A] border border-[#27272A] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden p-4 text-left"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-bold text-white">Downloaded Episodes ({sortedEpisodes.length})</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowEpisodesDrawer(false)}
                className="p-1 text-[#A1A1AA] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1 scrollbar-thin">
              {sortedEpisodes.map((ep, idx) => {
                const epNum = ep.episodeIndex !== undefined ? ep.episodeIndex + 1 : idx + 1;
                const isCurrent = ep.id === file.id || (ep.storageKey && ep.storageKey === file.storageKey);
                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => {
                      if (onSelectEpisode) onSelectEpisode(ep);
                      setShowEpisodesDrawer(false);
                    }}
                    className={`flex items-center justify-between w-full p-3 rounded-xl border text-left transition cursor-pointer ${
                      isCurrent
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm shadow-purple-600/30'
                        : 'bg-[#1C1C24] border-[#27272A] text-[#A1A1AA] hover:bg-[#252530] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-lg font-mono text-[11px] font-black ${
                        isCurrent ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70'
                      }`}>
                        E{epNum}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate">
                          {ep.subtitle?.split('•')[0]?.trim() || `Episode ${epNum}`}
                        </span>
                        <span className="text-[10px] text-white/50">
                          {ep.quality || '720p'} • {ep.language || 'Hindi'} • {ep.fileSizeMb ? `${Math.round(ep.fileSizeMb)}MB` : ''}
                        </span>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="text-[10px] font-extrabold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                        Playing
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
