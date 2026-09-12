import Hls from "hls.js";
import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  HelpCircle,
  Settings,
  Lock,
  Unlock,
  RotateCcw,
  RotateCw,
  Play,
  Pause,
  Maximize2,
  Subtitles,
  Gauge,
  ShieldCheck,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { saveUserProgress } from '../../services/contentService';
import { useAuthContext } from '../../context/AuthContext';
import { ChunkEngine, ChunkProgress } from '../../services/ChunkEngine';
import { SubtitleEngine } from '../../services/SubtitleEngine';
import { VideoChunkPlayer } from '../../components/player/VideoChunkPlayer';
import { ProgressBar } from '../../components/player/ProgressBar';
import { SubtitleOverlay } from '../../components/player/SubtitleOverlay';
import { BrightnessVolumeOverlay } from '../../components/player/BrightnessVolumeOverlay';
import { GestureHandler } from '../../components/player/GestureHandler';
import { SpeedDrawer } from '../../components/player/SpeedDrawer';
import { QualityDrawer } from '../../components/player/QualityDrawer';
import { LanguageDrawer } from '../../components/player/LanguageDrawer';
import { MOCK_PLAYER_EPISODE, PlayerEpisodeData } from '../../data/mockPlayer';
import { STORAGE_KEYS } from '../../utils/constants';

interface FullscreenPlayerScreenProps {
  episodeData?: PlayerEpisodeData;
  initialTime?: number; // Resume time in seconds
  onBack?: (currentTime?: number) => void;
  onSaveProgress?: (time: number, total: number) => void;
}

export const FullscreenPlayerScreen: React.FC<FullscreenPlayerScreenProps> = ({
  episodeData = MOCK_PLAYER_EPISODE,
  initialTime = 0,
  onBack,
  onSaveProgress,
}) => {
  // Engine Instances
  const chunkEngineRef = useRef<ChunkEngine>(new ChunkEngine());
  const subtitleEngineRef = useRef<SubtitleEngine>(new SubtitleEngine());

  // Player State
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentQuality, setCurrentQuality] = useState('720p');
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [aspectRatioMode, setAspectRatioMode] = useState<'contain' | 'cover' | 'fill'>('contain');

  // Subtitle & Audio state
  const [subtitleEnabled, setSubtitleEnabled] = useState(true);
  const [selectedAudioId, setSelectedAudioId] = useState(episodeData.audioTracks[0]?.id || 'aud-ja');
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(episodeData.subtitles[0]?.id || 'sub-en');
  const [activeSubtitleText, setActiveSubtitleText] = useState<string | null>(null);
  const [subtitleFontSize, setSubtitleFontSize] = useState(16);
  const [subtitleDelayMs, setSubtitleDelayMs] = useState(0);

  // Time & Progress State
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [totalDuration, setTotalDuration] = useState(episodeData.duration);
  const [seekOffset, setSeekOffset] = useState<number | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // UI Overlays & Drawers
  const [showControls, setShowControls] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [showUnlockBtn, setShowUnlockBtn] = useState(false);
  const unlockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'speed' | 'quality' | 'language'>('none');

  // Gestures Overlay State
  const [overlayType, setOverlayType] = useState<'brightness' | 'volume' | null>(null);
  const [overlayValue, setOverlayValue] = useState(50);
  const [showOverlay, setShowOverlay] = useState(false);

  // Preloading Next Chunk state
  const [isPreloadingNext, setIsPreloadingNext] = useState(false);
  const [nextChunk, setNextChunk] = useState(chunkEngineRef.current.getNextChunk());

  // Controls Auto-Hide timer
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useAuthContext();

  const triggerShowUnlock = () => {
    setShowUnlockBtn(true);
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = setTimeout(() => {
      setShowUnlockBtn(false);
    }, 1000);
  };

  const handleLock = () => {
    setIsLocked(true);
    setShowControls(false);
    triggerShowUnlock();
  };

  const handleUnlock = () => {
    setIsLocked(false);
    setShowUnlockBtn(false);
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    setShowControls(true);
    resetHideTimer();
  };

  const resetHideTimer = () => {
    if (activeDrawer !== 'none') {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      return;
    }
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isPlaying && !isLocked) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  };

  const handleToggleControls = () => {
    if (isLocked) {
      triggerShowUnlock();
      return;
    }
    if (activeDrawer !== 'none') {
      setActiveDrawer('none');
      return;
    }
    
    setShowControls((prev) => {
      const next = !prev;
      return next;
    });
  };

  // Sync timers when showControls or isPlaying changes
  useEffect(() => {
    if (showControls && isPlaying && !isLocked && activeDrawer === 'none') {
      resetHideTimer();
    } else if (!showControls) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    }
  }, [showControls, isPlaying, isLocked, activeDrawer]);

  useEffect(() => {
    // Attempt to lock orientation to landscape on mount
    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        ((screen.orientation as any).lock as any)('landscape').catch(() => {});
      } else if ((screen as any).lockOrientation) {
        (screen as any).lockOrientation('landscape');
      } else if ((screen as any).mozLockOrientation) {
        (screen as any).mozLockOrientation('landscape');
      } else if ((screen as any).msLockOrientation) {
        (screen as any).msLockOrientation('landscape');
      }
    } catch (e) {
      console.warn("Full(screen.orientation as any).lock failed", e);
    }

    return () => {
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      
      // Attempt to unlock orientation on unmount
      try {
        if (screen.orientation && screen.orientation.unlock) {
          ((screen.orientation as any).unlock as any)();
        } else if ((screen as any).unlockOrientation) {
          (screen as any).unlockOrientation();
        }
      } catch (e) {}
    };
  }, []);

  // Initialize Chunks & Engine
  useEffect(() => {
    const rawChunks = (
      episodeData.qualities[currentQuality] ||
      episodeData.qualities['720p'] ||
      episodeData.chunks ||
      []
    ).filter((c) => c && c.url && typeof c.url === 'string' && c.url.trim().length > 0);
    if (rawChunks.length > 0) {
      chunkEngineRef.current.initialize(rawChunks);
    } else if (episodeData.videoLinks && episodeData.videoLinks.length > 0) {
      chunkEngineRef.current.initializeFromLinks(episodeData.videoLinks);
    } else if ((episodeData as any).hiddenLinks && (episodeData as any).hiddenLinks.length > 0) {
      chunkEngineRef.current.initializeFromLinks([episodeData.videoUrl || '', ...(episodeData as any).hiddenLinks]);
    } else if (episodeData.videoUrl) {
      chunkEngineRef.current.initializeFromLinks([episodeData.videoUrl]);
    }

    const estimatedDuration = chunkEngineRef.current.getTotalDuration() || episodeData.duration || 1440;
    setTotalDuration(estimatedDuration);

    let targetTime = initialTime;
    if (estimatedDuration > 0 && initialTime >= estimatedDuration - 5) {
      targetTime = 0;
    }

    if (targetTime > 0) {
      chunkEngineRef.current.seekTo(targetTime);
    }

    // Subscribe to ChunkEngine events
    const unsubProgress = chunkEngineRef.current.on('progress', (data: ChunkProgress) => {
      setCurrentTime(data.currentTime);
      
      // Check Subtitles
      if (subtitleEnabled) {
        const cue = subtitleEngineRef.current.getActiveCue(data.currentTime);
        setActiveSubtitleText(cue ? cue.text : null);
      } else {
        setActiveSubtitleText(null);
      }

      // Save watch progress to Firestore and localStorage every 5s
      if (Math.floor(data.currentTime) % 5 === 0) {
        try {
          if (user?.uid) {
            saveUserProgress(user.uid, episodeData.contentId || episodeData.id, {
              title: episodeData.title,
              currentTime: data.currentTime,
              totalWatchedSeconds: data.currentTime,
              totalDuration: data.totalDuration,
              percentWatched: Math.round((data.currentTime / (data.totalDuration || 1)) * 100),
              thumbnailUrl: episodeData.posterUrl
            });
          }
          const watchHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY) || '[]');
          const updated = [
            {
              id: episodeData.id,
              contentId: episodeData.contentId,
              title: episodeData.title,
              currentTime: data.currentTime,
              totalDuration: data.totalDuration,
              lastWatchedAt: new Date().toISOString(),
            },
            ...watchHistory.filter((i: any) => i.id !== episodeData.id),
          ];
          localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(updated.slice(0, 20)));
          onSaveProgress?.(data.currentTime, data.totalDuration);
        } catch (e) {
          // ignore
        }
      }
    });

    const unsubPreload = chunkEngineRef.current.on('preload', ({ nextChunk }: any) => {
      setIsPreloadingNext(true);
      setNextChunk(nextChunk);
    });

    const unsubChange = chunkEngineRef.current.on('chunkChange', () => {
      setIsPreloadingNext(false);
      setNextChunk(chunkEngineRef.current.getNextChunk());
    });

    const unsubComplete = chunkEngineRef.current.on('complete', () => {
      setIsPlaying(false);
      setShowControls(true);
    });

    return () => {
      unsubProgress();
      unsubPreload();
      unsubChange();
      unsubComplete();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [currentQuality, episodeData.id]);

  // Load active subtitle track
  useEffect(() => {
    if (selectedSubtitleId) {
      const sub = episodeData.subtitles.find((s) => s.id === selectedSubtitleId);
      if (sub && sub.content) {
        subtitleEngineRef.current.parseSRT(sub.content);
      }
    }
  }, [selectedSubtitleId]);

  // Update subtitle delay
  useEffect(() => {
    subtitleEngineRef.current.setDelayMs(subtitleDelayMs);
  }, [subtitleDelayMs]);

  // Handle Play/Pause Toggle
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    resetHideTimer();
  };

  // Rewind / Forward 10s
  const handleRewind10 = () => {
    const newTime = Math.max(0, currentTime - 10);
    const result = chunkEngineRef.current.seekTo(newTime);
    setCurrentTime(newTime);
    setSeekOffset(result.offsetInChunk);
    resetHideTimer();
  };

  const handleForward10 = () => {
    const newTime = Math.min(totalDuration, currentTime + 10);
    const result = chunkEngineRef.current.seekTo(newTime);
    setCurrentTime(newTime);
    setSeekOffset(result.offsetInChunk);
    resetHideTimer();
  };

  // Seek / Scrub
  const handleSeek = (targetTime: number) => {
    const result = chunkEngineRef.current.seekTo(targetTime);
    setCurrentTime(targetTime);
    setSeekOffset(result.offsetInChunk);
    resetHideTimer();
  };

  // Gesture Brightness / Volume handlers
  const overlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerOverlay = (type: 'brightness' | 'volume', delta: number) => {
    setOverlayType(type);
    setOverlayValue((prev) => Math.max(0, Math.min(100, prev + delta)));
    setShowOverlay(true);

    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => {
      setShowOverlay(false);
    }, 1200);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);

    const pad = (num: number) => (num < 10 ? `0${num}` : `${num}`);
    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(s)}`;
    }
    return `${pad(mins)}:${pad(s)}`;
  };

  const currentChunk = chunkEngineRef.current.getCurrentChunk();
  const chunkForOffset = chunkEngineRef.current.getChunkForTime(currentTime);

  return (
    <div 
      className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-black overflow-hidden select-none"
      onMouseMove={() => resetHideTimer()}
      onTouchMove={() => resetHideTimer()}
    >
      <GestureHandler
        isLocked={isLocked}
        onToggleControls={handleToggleControls}
        onDoubleTapRewind={handleRewind10}
        onDoubleTapForward={handleForward10}
        onChangeBrightness={(delta) => triggerOverlay('brightness', delta)}
        onChangeVolume={(delta) => triggerOverlay('volume', delta)}
      >
        {/* Main Video Chunk Player */}
        <div
          className={`h-full w-full ${
            aspectRatioMode === 'cover'
              ? 'object-cover'
              : aspectRatioMode === 'fill'
              ? 'object-fill'
              : 'object-contain'
          }`}
        >
          <VideoChunkPlayer
            currentChunk={currentChunk}
            nextChunk={nextChunk}
            isPreloadingNext={isPreloadingNext}
            isPlaying={isPlaying}
            playbackRate={playbackRate}
            initialOffsetInChunk={initialTime}
            seekOffsetInChunk={seekOffset}
            onLoadedMetadata={(dur) => {
              chunkEngineRef.current.updateChunkDuration(dur);
              setTotalDuration(chunkEngineRef.current.getTotalDuration());
            }}
            onTimeUpdate={(timeInChunk) => {
              if (seekOffset !== null) setSeekOffset(null);
              chunkEngineRef.current.onChunkProgress(timeInChunk);
            }}
            onChunkEnded={() => {
              chunkEngineRef.current.onChunkComplete();
            }}
            onBuffering={(buffering) => setIsBuffering(buffering)}
            onError={(err) => setErrorMessage(err)}
          />
        </div>

        {/* Subtitle Overlay */}
        <SubtitleOverlay
          text={activeSubtitleText}
          fontSize={subtitleFontSize}
          bottomOffset={showControls ? 95 : 40}
        />

        {/* Brightness & Volume HUD Overlay */}
        <BrightnessVolumeOverlay
          type={overlayType}
          value={overlayValue}
          visible={showOverlay}
        />

        {/* Buffering Spinning Arrow Loader */}
        {isBuffering && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs pointer-events-none">
            <div className="flex flex-col items-center gap-2.5 p-4 sm:p-5 rounded-2xl bg-black/75 border border-white/10 shadow-2xl backdrop-blur-md">
              <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-[#8B5CF6] drop-shadow-[0_0_12px_rgba(139,92,246,0.6)]" />
              <span className="text-xs font-bold text-white/90 tracking-wide">
                Buffering...
              </span>
            </div>
          </div>
        )}

        {/* Error State Overlay */}
        {errorMessage && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/85 p-6 text-center">
            <p className="text-sm font-bold text-red-400 mb-2">{errorMessage}</p>
            <button
              onClick={() => {
                setErrorMessage(null);
                const chunks = episodeData.qualities[currentQuality] || [];
                chunkEngineRef.current.initialize(chunks);
              }}
              className="flex items-center gap-2 rounded-xl bg-[#8B5CF6] px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-[#7C3AED] transition cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry Chunk Stream</span>
            </button>
          </div>
        )}

        {/* LOCK MODE: NO BLUR, transparent click-catcher, unlock button on left with 1s auto-hide */}
        {isLocked && (
          <div
            onClick={triggerShowUnlock}
            className="absolute inset-0 z-40 pointer-events-auto select-none bg-transparent"
          >
            {showUnlockBtn && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnlock();
                }}
                className="absolute left-4 sm:left-8 md:left-12 top-1/2 -translate-y-1/2 z-50 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/75 hover:bg-black/90 border border-white/40 hover:border-white/70 text-white shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer animate-in fade-in duration-150"
                title="Locked - Tap to Unlock"
              >
                {/* Active Lock state: Closed Lock icon */}
                <Lock className="h-5 w-5 text-white" />
              </button>
            )}
          </div>
        )}

        {/* FULL CONTROLS OVERLAY */}
        {!isLocked && showControls && (
          <div className="absolute inset-0 z-40 flex flex-col justify-between bg-gradient-to-b from-black/80 via-transparent to-black/90 p-4 pointer-events-none transition-opacity duration-300">
            {/* TOP BAR */}
            <div className="flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-3">
                {onBack && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBack(currentTime);
                    }}
                    className="p-1 text-white hover:text-white/80 transition cursor-pointer active:scale-95"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </button>
                )}
                <h2 className="text-sm font-medium text-white line-clamp-1 max-w-[65vw]">
                  {episodeData.title}
                </h2>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetHideTimer();
                    alert('MaxPlay Player Help: Double tap sides to seek 10s. Drag vertically on screen for volume/brightness.');
                  }}
                  className="flex flex-col items-center text-white/90 hover:text-white transition cursor-pointer active:scale-95"
                >
                  <HelpCircle className="h-5 w-5" />
                  <span className="text-[10px] font-normal text-white mt-0.5">Help</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDrawer('language');
                  }}
                  className="flex flex-col items-center text-white/90 hover:text-white transition cursor-pointer active:scale-95"
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-[10px] font-normal text-white mt-0.5">Setting</span>
                </button>
              </div>
            </div>

            {/* Dedicated Lock Button on Middle-Left Edge (Inactive: Open Lock icon) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLock();
              }}
              className="absolute left-4 sm:left-8 md:left-12 top-1/2 -translate-y-1/2 z-30 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/50 hover:bg-black/75 border border-white/25 hover:border-white/50 text-white shadow-xl backdrop-blur-xs transition-all hover:scale-105 active:scale-95 cursor-pointer pointer-events-auto"
              title="Lock Controls"
            >
              <Unlock className="h-5 w-5 text-white" />
            </button>

            {/* EXACT CENTER CONTROLS TRIPLET: Rewind 10s, Play/Pause, Forward 10s (Symmetrical & Dead-Centered) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center gap-8 sm:gap-12 md:gap-16 select-none pointer-events-auto">
              {/* Rewind 10s */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRewind10();
                  resetHideTimer();
                }}
                className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 border border-white/25 hover:border-white/50 text-white shadow-xl backdrop-blur-xs transition-all hover:scale-110 active:scale-90 cursor-pointer"
                title="Rewind 10s"
              >
                <RotateCcw className="h-6 w-6 sm:h-7 sm:w-7" />
                <span className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-[10px] font-bold">10</span>
              </button>

              {/* Play / Pause Signature Purple Center Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayPause();
                  resetHideTimer();
                }}
                className="flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-2xl shadow-purple-600/40 border border-purple-400/30 transition-all hover:scale-105 active:scale-90 cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8 sm:h-9 sm:w-9 fill-current" />
                ) : (
                  <Play className="h-8 w-8 sm:h-9 sm:w-9 fill-current ml-0.5" />
                )}
              </button>

              {/* Forward 10s */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleForward10();
                  resetHideTimer();
                }}
                className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 border border-white/25 hover:border-white/50 text-white shadow-xl backdrop-blur-xs transition-all hover:scale-110 active:scale-90 cursor-pointer"
                title="Forward 10s"
              >
                <RotateCw className="h-6 w-6 sm:h-7 sm:w-7" />
                <span className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-[10px] font-bold">10</span>
              </button>
            </div>

            {/* BOTTOM BAR */}
            <div className="flex flex-col gap-2 pointer-events-auto">
              {/* Row 1: Scrubber Progress */}
              <div className="w-full">
                <ProgressBar
                  currentTime={currentTime}
                  duration={totalDuration}
                  buffered={isPreloadingNext ? 85 : 45}
                  onSeek={(t) => {
                    handleSeek(t);
                    resetHideTimer();
                  }}
                  onScrubStart={() => {
                    if (hideTimerRef.current) {
                      clearTimeout(hideTimerRef.current);
                      hideTimerRef.current = null;
                    }
                  }}
                  onScrubEnd={() => {
                    resetHideTimer();
                  }}
                />
              </div>

              {/* Row 2: Controls Toolbar */}
              <div className="flex items-center justify-between pt-0.5">
                {/* Left Play/Pause Button & Time + Speed Badge */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPause();
                      resetHideTimer();
                    }}
                    className="p-1 text-white hover:text-white/80 transition cursor-pointer active:scale-95"
                  >
                    {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
                  </button>

                  <div className="flex items-center gap-1.5 text-xs text-white/90">
                    <span className="font-medium tabular-nums">{formatTime(currentTime)}</span>
                    <span className="text-white/40">/</span>
                    <span className="text-white/70 tabular-nums">{formatTime(totalDuration)}</span>

                    {/* Speed Badge Button right next to timestamp */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDrawer('speed');
                      }}
                      className="flex items-center justify-center h-[22px] px-2 ml-1 rounded-md bg-white/10 hover:bg-[#8B5CF6]/30 border border-white/20 text-white hover:text-[#C4B5FD] transition cursor-pointer active:scale-95 select-none font-bold text-[10px] tracking-wider"
                      title="Change Playback Speed"
                    >
                      {playbackRate === 1.0 ? '1X' : `${playbackRate}X`}
                    </button>
                  </div>
                </div>

                {/* Right Group Buttons: Fit | Language | Quality */}
                <div className="flex items-center gap-4 sm:gap-6">
                  {/* Fit / Aspect Ratio button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetHideTimer();
                      const modes: ('contain' | 'cover' | 'fill')[] = ['contain', 'cover', 'fill'];
                      const nextMode = modes[(modes.indexOf(aspectRatioMode) + 1) % modes.length];
                      setAspectRatioMode(nextMode);
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-white hover:text-white/80 transition cursor-pointer active:scale-95"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>Fit</span>
                  </button>

                  {/* Audio & Language Drawer Trigger */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDrawer('language');
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-white hover:text-white/80 transition cursor-pointer active:scale-95"
                  >
                    <Subtitles className="h-3.5 w-3.5" />
                    <span>Language</span>
                  </button>

                  {/* Quality Drawer Trigger */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDrawer('quality');
                    }}
                    className="flex items-center justify-center h-[24px] px-2 rounded-md bg-white/10 hover:bg-[#8B5CF6]/30 border border-white/20 text-xs font-bold text-white hover:text-[#C4B5FD] transition cursor-pointer active:scale-95"
                  >
                    <span>{currentQuality.toUpperCase()}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SPEED SELECTOR DRAWER */}
        <SpeedDrawer
          visible={activeDrawer === 'speed'}
          currentSpeed={playbackRate}
          onSelectSpeed={(speed) => setPlaybackRate(speed)}
          onClose={() => setActiveDrawer('none')}
        />

        {/* QUALITY SELECTOR DRAWER */}
        <QualityDrawer
          visible={activeDrawer === 'quality'}
          currentQuality={currentQuality}
          availableQualities={Object.keys(episodeData.qualities)}
          onSelectQuality={(q) => setCurrentQuality(q)}
          onClose={() => setActiveDrawer('none')}
        />

        {/* LANGUAGE & AUDIO & SUBTITLE DRAWER */}
        <LanguageDrawer
          visible={activeDrawer === 'language'}
          audioTracks={episodeData.audioTracks}
          subtitles={episodeData.subtitles}
          selectedAudioId={selectedAudioId}
          selectedSubtitleId={selectedSubtitleId}
          subtitleEnabled={subtitleEnabled}
          subtitleFontSize={subtitleFontSize}
          subtitleDelayMs={subtitleDelayMs}
          onSelectAudio={(id) => setSelectedAudioId(id)}
          onSelectSubtitle={(id) => setSelectedSubtitleId(id)}
          onToggleSubtitle={(enabled) => setSubtitleEnabled(enabled)}
          onChangeFontSize={(size) => setSubtitleFontSize(size)}
          onChangeDelayMs={(delay) => setSubtitleDelayMs(delay)}
          onClose={() => setActiveDrawer('none')}
        />
      </GestureHandler>
    </div>
  );
};
