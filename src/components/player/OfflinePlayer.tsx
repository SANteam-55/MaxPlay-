import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sun,
  SunMedium,
  Volume2,
  Volume1,
  VolumeX,
  Zap,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { PlayerControls } from './PlayerControls';
import { GestureHandler } from './GestureHandler';
import { SpeedDrawer } from './SpeedDrawer';
import { QualityDrawer } from './QualityDrawer';
import { AudioLangDrawer } from './AudioLangDrawer';
import { SpeedCapsuleHUD } from './SpeedCapsuleHUD';
import { DownloadedFile } from '../../services/DownloadManager';

interface OfflinePlayerProps {
  file: DownloadedFile;
  blobUrl?: string | null;
  title?: string;
  onBack?: () => void;
  onNext?: () => void;
  onFullscreenToggle?: () => void;
  isExternalFullscreen?: boolean;
}

export const OfflinePlayer: React.FC<OfflinePlayerProps> = ({
  file,
  blobUrl,
  title,
  onBack,
  onNext,
  onFullscreenToggle,
  isExternalFullscreen = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(isExternalFullscreen);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Gesture & HUD States
  const [brightness, setBrightness] = useState<number>(100);
  const [volume, setVolume] = useState<number>(100);
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState<boolean>(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState<boolean>(false);
  const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fast-Forward Long Press Pill (2X Speed Capsule)
  const [isFastForwarding, setIsFastForwarding] = useState<boolean>(false);
  const [capsuleSpeed, setCapsuleSpeed] = useState<number>(2.0);
  const [capsuleProgress, setCapsuleProgress] = useState<number>(66.66);
  const prevSpeedRef = useRef<number>(1.0);

  // UI Drawer State
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'speed' | 'quality' | 'language'>('none');
  const [showControls, setShowControls] = useState<boolean>(true);

  // Auto-hide controls timer
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetHideTimer = useCallback(() => {
    if (activeDrawer !== 'none' || isLocked) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      return;
    }
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  }, [activeDrawer, isLocked, isPlaying]);

  // Synchronize controls timer
  useEffect(() => {
    if (showControls && isPlaying && !isLocked && activeDrawer === 'none') {
      resetHideTimer();
    } else if (!showControls) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    }
  }, [showControls, isPlaying, isLocked, activeDrawer, resetHideTimer]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (indicatorTimeoutRef.current) clearTimeout(indicatorTimeoutRef.current);
    };
  }, []);

  // Update fullscreen state when parent changes or fullscreen event fires
  useEffect(() => {
    setIsFullscreen(isExternalFullscreen);
  }, [isExternalFullscreen]);

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFs);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Sync volume with native HTML5 video element
  useEffect(() => {
    if (!videoRef.current) return;
    const clampedVolume = Math.min(1, Math.max(0, volume / 100));
    videoRef.current.volume = clampedVolume;
    videoRef.current.muted = volume === 0;
  }, [volume]);

  // Indicator HUD Trigger Helper
  const showIndicator = (type: 'brightness' | 'volume') => {
    if (type === 'brightness') {
      setShowBrightnessIndicator(true);
      setShowVolumeIndicator(false);
    } else {
      setShowVolumeIndicator(true);
      setShowBrightnessIndicator(false);
    }

    if (indicatorTimeoutRef.current) clearTimeout(indicatorTimeoutRef.current);
    indicatorTimeoutRef.current = setTimeout(() => {
      setShowBrightnessIndicator(false);
      setShowVolumeIndicator(false);
    }, 1500);
  };

  // Gesture Callbacks
  const handleBrightnessChange = useCallback((delta: number) => {
    setBrightness((prev) => {
      const newVal = Math.max(10, Math.min(200, prev + delta));
      return Math.round(newVal);
    });
    showIndicator('brightness');
  }, []);

  const handleVolumeChange = useCallback((delta: number) => {
    setVolume((prev) => {
      const newVal = Math.max(0, Math.min(200, prev + delta));
      return Math.round(newVal);
    });
    showIndicator('volume');
  }, []);

  // Long Press Fast-Forward Gesture (Speed Capsule HUD)
  const handleLongPressStart = useCallback(() => {
    if (videoRef.current && !isFastForwarding) {
      prevSpeedRef.current = videoRef.current.playbackRate || 1.0;
      videoRef.current.playbackRate = 2.0;
      setPlaybackRate(2.0);
      setCapsuleSpeed(2.0);
      setCapsuleProgress(66.66);
      setIsFastForwarding(true);
    }
  }, [isFastForwarding]);

  const handleLongPressMove = useCallback((deltaX: number) => {
    const newProgress = Math.max(0, Math.min(100, 66.66 + deltaX * 0.35));

    let calcSpeed = 1.0;
    if (newProgress <= 33.33) {
      calcSpeed = 0.5 + (newProgress / 33.33) * 0.5;
    } else if (newProgress <= 66.66) {
      calcSpeed = 1.0 + ((newProgress - 33.33) / 33.33) * 1.0;
    } else {
      calcSpeed = 2.0 + ((newProgress - 66.66) / 33.34) * 1.0;
    }

    let finalSpeed = Math.round(calcSpeed * 10) / 10;
    if (Math.abs(calcSpeed - 0.5) < 0.08) finalSpeed = 0.5;
    else if (Math.abs(calcSpeed - 1.0) < 0.08) finalSpeed = 1.0;
    else if (Math.abs(calcSpeed - 2.0) < 0.08) finalSpeed = 2.0;
    else if (Math.abs(calcSpeed - 3.0) < 0.08) finalSpeed = 3.0;

    setCapsuleSpeed(finalSpeed);
    setCapsuleProgress(newProgress);
    if (videoRef.current) {
      videoRef.current.playbackRate = finalSpeed;
    }
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (isFastForwarding) {
      setIsFastForwarding(false);
      const restored = prevSpeedRef.current || 1.0;
      setPlaybackRate(restored);
      if (videoRef.current) {
        videoRef.current.playbackRate = restored;
      }
    }
  }, [isFastForwarding]);

  // Toggle controls visibility on single tap
  const handleToggleControls = useCallback(() => {
    if (isLocked) return;
    if (activeDrawer !== 'none') {
      setActiveDrawer('none');
      return;
    }
    setShowControls((prev) => !prev);
    resetHideTimer();
  }, [isLocked, activeDrawer, resetHideTimer]);

  // Play / Pause toggler
  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    setShowControls(true);
    resetHideTimer();
  }, [resetHideTimer]);

  // Seek handler
  const handleSeek = useCallback((targetTime: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
    setShowControls(true);
    resetHideTimer();
  }, [resetHideTimer]);

  // Rewind 10s
  const handleRewind10 = useCallback(() => {
    if (!videoRef.current) return;
    const target = Math.max(0, videoRef.current.currentTime - 10);
    videoRef.current.currentTime = target;
    setCurrentTime(target);
    setShowControls(true);
    resetHideTimer();
  }, [resetHideTimer]);

  // Forward 10s
  const handleForward10 = useCallback(() => {
    if (!videoRef.current) return;
    const maxDur = duration > 0 ? duration : (videoRef.current.duration || 10000);
    const target = Math.min(maxDur, videoRef.current.currentTime + 10);
    videoRef.current.currentTime = target;
    setCurrentTime(target);
    setShowControls(true);
    resetHideTimer();
  }, [duration, resetHideTimer]);

  // Speed change from SpeedDrawer
  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackRate(speed);
    prevSpeedRef.current = speed;
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setActiveDrawer('none');
    setShowControls(true);
    resetHideTimer();
  }, [resetHideTimer]);

  // Fullscreen toggle
  const handleToggleFullscreen = useCallback(() => {
    if (onFullscreenToggle) {
      onFullscreenToggle();
      return;
    }

    if (!containerRef.current) return;
    const doc = document as any;
    const isFs = Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (!isFs) {
      const el = containerRef.current as any;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }

      // Lock screen orientation to landscape / horizontal mode
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
      } catch (err) {
        console.warn('Orientation lock notice:', err);
      }

      setIsFullscreen(true);
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }

      try {
        if (screen.orientation && screen.orientation.unlock) {
          ((screen.orientation as any).unlock as any)();
        } else if ((screen as any).unlockOrientation) {
          (screen as any).unlockOrientation();
        }
      } catch (err) {
        console.warn('Orientation unlock notice:', err);
      }

      setIsFullscreen(false);
    }
  }, [onFullscreenToggle]);

  // Video element event listeners
  const onTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const onLoadedMetadata = () => {
    if (!videoRef.current) return;
    setIsLoading(false);
    setPlaybackError(null);
    const dur = videoRef.current.duration;
    if (dur && !isNaN(dur) && dur > 0) {
      setDuration(dur);
    }
    videoRef.current.playbackRate = playbackRate;
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  const displayTitle = title || file.title || 'Offline Video';
  const displayQuality = (file.quality || '720p').toUpperCase();
  const displayLanguage = file.language || 'Default';

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-black select-none ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen' : 'h-full aspect-video rounded-2xl'
      }`}
    >
      <GestureHandler
        isLocked={isLocked}
        onToggleControls={handleToggleControls}
        onChangeBrightness={handleBrightnessChange}
        onChangeVolume={handleVolumeChange}
        onLongPressStart={handleLongPressStart}
        onLongPressMove={handleLongPressMove}
        onLongPressEnd={handleLongPressEnd}
        onDoubleTapRewind={handleRewind10}
        onDoubleTapForward={handleForward10}
      >
        {/* HTML5 Native Video Tag reading from IndexedDB Blob or stream fallback */}
        {blobUrl ? (
          <video
            ref={videoRef}
            src={blobUrl}
            autoPlay
            playsInline
            style={{ filter: `brightness(${brightness}%)` }}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => setIsLoading(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              if (onNext) onNext();
            }}
            onError={(e: any) => {
              setIsLoading(false);
              setPlaybackError('Offline video stream error. Please re-download or check storage.');
            }}
            className="w-full h-full object-contain pointer-events-none"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-4 text-center">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-2" />
            <span className="text-xs font-bold text-white/80">Loading offline file...</span>
          </div>
        )}

        {/* Loading Spinner Overlay */}
        {isLoading && blobUrl && !playbackError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-2" />
            <span className="text-xs font-bold text-white/80">Loading video...</span>
          </div>
        )}

        {/* Error Overlay */}
        {playbackError && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-6 text-center text-white pointer-events-auto">
            <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
            <p className="font-semibold text-sm mb-3">{playbackError}</p>
            <button
              onClick={() => {
                setPlaybackError(null);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
              className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-lg shadow-purple-900/40"
            >
              Retry Playback
            </button>
          </div>
        )}

        {/* BRIGHTNESS INDICATOR HUD */}
        <div
          className={`absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-40 transition-all duration-300 pointer-events-none ${
            showBrightnessIndicator
              ? 'opacity-100 scale-100 translate-x-0'
              : 'opacity-0 scale-95 -translate-x-2'
          }`}
        >
          <div className="bg-black/85 backdrop-blur-xl border border-white/20 rounded-2xl px-3 py-4 flex flex-col items-center gap-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] min-w-[56px]">
            <div className="p-1.5 rounded-full bg-amber-500/20 text-amber-300">
              {brightness > 100 ? (
                <Sun className="w-5 h-5 animate-pulse text-amber-300" />
              ) : (
                <SunMedium className="w-5 h-5 text-amber-300" />
              )}
            </div>
            <div className="w-2 sm:w-2.5 h-28 bg-white/15 rounded-full overflow-hidden flex flex-col-reverse p-0.5 shadow-inner">
              <div
                className="w-full bg-gradient-to-t from-amber-400 via-amber-300 to-yellow-100 rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(251,191,36,0.7)]"
                style={{ height: `${Math.min(100, Math.max(5, (brightness - 10) / 190 * 100))}%` }}
              />
            </div>
            <span className="font-mono text-xs font-bold text-white tracking-wider tabular-nums">
              {brightness}%
            </span>
            <span className="text-[9px] uppercase font-semibold tracking-widest text-white/50 -mt-1">
              Light
            </span>
          </div>
        </div>

        {/* VOLUME INDICATOR HUD */}
        <div
          className={`absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 transition-all duration-300 pointer-events-none ${
            showVolumeIndicator
              ? 'opacity-100 scale-100 translate-x-0'
              : 'opacity-0 scale-95 translate-x-2'
          }`}
        >
          <div
            className={`backdrop-blur-xl border rounded-2xl px-3 py-4 flex flex-col items-center gap-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] min-w-[56px] transition-colors duration-200 ${
              volume > 100
                ? 'bg-black/90 border-orange-500/60 shadow-[0_0_25px_rgba(249,115,22,0.35)]'
                : 'bg-black/85 border-white/20'
            }`}
          >
            <div
              className={`p-1.5 rounded-full transition-colors duration-200 ${
                volume > 100
                  ? 'bg-orange-500/25 text-orange-400'
                  : volume === 0
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-cyan-500/20 text-cyan-300'
              }`}
            >
              {volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : volume > 100 ? (
                <Zap className="w-5 h-5 animate-pulse text-orange-400" />
              ) : volume > 50 ? (
                <Volume2 className="w-5 h-5 text-cyan-300" />
              ) : (
                <Volume1 className="w-5 h-5 text-cyan-300" />
              )}
            </div>
            <div className="w-2 sm:w-2.5 h-28 bg-white/15 rounded-full overflow-hidden flex flex-col-reverse p-0.5 shadow-inner">
              <div
                className={`w-full rounded-full transition-all duration-75 ${
                  volume > 100
                    ? 'bg-gradient-to-t from-amber-500 via-orange-500 to-rose-500 shadow-[0_0_12px_rgba(249,115,22,0.9)]'
                    : 'bg-gradient-to-t from-cyan-500 via-blue-400 to-teal-200 shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                }`}
                style={{ height: `${Math.min(100, Math.max(volume === 0 ? 0 : 5, volume / 2))}%` }}
              />
            </div>
            <span
              className={`font-mono text-xs font-bold tracking-wider tabular-nums ${
                volume > 100 ? 'text-orange-400 drop-shadow-[0_0_6px_rgba(249,115,22,0.8)]' : 'text-white'
              }`}
            >
              {volume}%
            </span>
            {volume > 100 ? (
              <span className="text-[8px] uppercase font-black tracking-widest text-orange-400 bg-orange-500/20 border border-orange-500/40 px-1.5 py-0.5 rounded-full -mt-1 animate-pulse">
                BOOST
              </span>
            ) : (
              <span className="text-[9px] uppercase font-semibold tracking-widest text-white/50 -mt-1">
                Vol
              </span>
            )}
          </div>
        </div>

        {/* LONG PRESS FAST-FORWARD SPEED CAPSULE HUD */}
        <SpeedCapsuleHUD
          visible={isFastForwarding}
          speed={capsuleSpeed}
          progress={capsuleProgress}
        />

        {/* FULL CONTROLS OVERLAY */}
        <PlayerControls
          isVisible={showControls && activeDrawer === 'none'}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          title={displayTitle}
          isFullscreen={isFullscreen}
          currentQuality={displayQuality}
          currentLanguage={displayLanguage}
          playbackRate={playbackRate}
          isLocked={isLocked}
          onLockChange={(locked) => {
            setIsLocked(locked);
            if (locked) setShowControls(false);
          }}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onRewind10={handleRewind10}
          onForward10={handleForward10}
          onNext={onNext}
          onFullscreenToggle={handleToggleFullscreen}
          onBack={onBack}
          onSettingsPress={() => setActiveDrawer('language')}
          onSpeedPress={() => setActiveDrawer('speed')}
          onQualityPress={() => setActiveDrawer('quality')}
          onLanguagePress={() => setActiveDrawer('language')}
        />

        {/* SPEED SELECTOR DRAWER */}
        <SpeedDrawer
          visible={activeDrawer === 'speed'}
          currentSpeed={playbackRate}
          onSelectSpeed={handleSpeedChange}
          onClose={() => setActiveDrawer('none')}
        />

        {/* QUALITY DRAWER (Displays Downloaded Quality) */}
        <QualityDrawer
          visible={activeDrawer === 'quality'}
          currentQuality={displayQuality.toLowerCase()}
          availableQualities={[displayQuality.toLowerCase()]}
          onSelectQuality={() => {
            setActiveDrawer('none');
          }}
          onClose={() => setActiveDrawer('none')}
        />

        {/* AUDIO & LANGUAGE DRAWER (Displays Downloaded Language) */}
        <AudioLangDrawer
          visible={activeDrawer === 'language'}
          currentLanguage={displayLanguage}
          availableLanguages={[`${displayLanguage} (Downloaded)`]}
          onSelectLanguage={() => {
            setActiveDrawer('none');
          }}
          onClose={() => setActiveDrawer('none')}
        />
      </GestureHandler>
    </div>
  );
};
