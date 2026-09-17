import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  ArrowLeft,
  HelpCircle,
  Settings2,
  Cast,
  Maximize,
  Minimize,
  Lock,
  Unlock,
  SkipForward,
  Headphones,
  PictureInPicture2,
} from 'lucide-react';
import { formatDuration } from '../../utils/helpers';
import { ProgressBar } from './ProgressBar';

interface PlayerControlsProps {
  isVisible: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  title?: string;
  isFullscreen?: boolean;
  currentQuality?: string;
  currentLanguage?: string;
  playbackRate?: number;
  isLocked?: boolean;
  onLockChange?: (locked: boolean) => void;
  onLanguagePress?: () => void;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onRewind10: () => void;
  onForward10: () => void;
  onNext?: () => void;
  onFullscreenToggle: () => void;
  onPipToggle?: () => void;
  onBack?: () => void;
  onSettingsPress?: () => void;
  onQualityPress?: () => void;
  onSpeedPress?: () => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  skipMarkers?: {
    intro?: { start: number; end: number };
    outro?: { start: number; end: number };
    credits?: { start: number; end: number };
  };
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isVisible,
  isPlaying,
  currentTime,
  duration,
  title,
  isFullscreen = false,
  currentQuality,
  currentLanguage,
  playbackRate = 1.0,
  isLocked: externalIsLocked,
  onLockChange,
  onPlayPause,
  onSeek,
  onRewind10,
  onForward10,
  onNext,
  onFullscreenToggle,
  onPipToggle,
  onBack,
  onSettingsPress,
  onQualityPress,
  onLanguagePress,
  onSpeedPress,
  onScrubStart,
  onScrubEnd,
  skipMarkers,
}) => {
  const [internalIsLocked, setInternalIsLocked] = useState(false);
  const isLocked = externalIsLocked !== undefined ? externalIsLocked : internalIsLocked;

  const [showUnlockBtn, setShowUnlockBtn] = useState(false);
  const unlockTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const triggerShowUnlock = () => {
    setShowUnlockBtn(true);
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = setTimeout(() => {
      setShowUnlockBtn(false);
    }, 1500);
  };

  const handleLock = () => {
    if (onLockChange) {
      onLockChange(true);
    } else {
      setInternalIsLocked(true);
    }
    triggerShowUnlock();
  };

  const handleUnlock = () => {
    if (onLockChange) {
      onLockChange(false);
    } else {
      setInternalIsLocked(false);
    }
    setShowUnlockBtn(false);
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
  };

  React.useEffect(() => {
    return () => {
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    };
  }, []);

  // When player is locked, render the lock/unlock overlay
  if (isLocked) {
    return (
      <div
        onClick={triggerShowUnlock}
        className="absolute inset-0 z-40 flex items-center pointer-events-auto select-none bg-black/1"
      >
        {showUnlockBtn && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleUnlock();
            }}
            className="absolute left-3 sm:left-6 md:left-8 top-1/2 -translate-y-1/2 z-50 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/80 hover:bg-black/95 border border-white/50 hover:border-white/80 text-white shadow-2xl transition-all hover:scale-110 active:scale-90 cursor-pointer animate-in fade-in zoom-in-90 duration-150"
            title="Locked - Tap to Unlock"
          >
            <Lock className="h-5 w-5 text-white animate-pulse" />
          </button>
        )}
      </div>
    );
  }

  if (!isVisible) return null;

  return (
    <div 
      className="absolute inset-0 z-20 flex flex-col justify-between bg-black/45 p-3 sm:p-4 transition-opacity duration-300 select-none pointer-events-none"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 w-full pointer-events-auto">
        <div className={`flex items-center gap-2.5 min-w-0 flex-1 ${!onBack ? 'pl-12' : ''}`}>
          {onBack && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBack();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBack();
              }}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-black/80 hover:bg-black text-white border border-white/35 hover:border-white/70 shadow-2xl cursor-pointer shrink-0 transition-all hover:scale-105 active:scale-90"
              title="Go Back / Exit"
              aria-label="Exit player"
            >
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
            </button>
          )}
          {title && (
            <span
              className="truncate text-xs sm:text-sm font-semibold text-white drop-shadow ml-1"
              title={title}
            >
              {title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSettingsPress?.();
            }}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full cursor-pointer transition active:scale-95"
            title="Settings"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full cursor-pointer transition active:scale-95"
            title="Help"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Lock Button (Inactive Lock state: Open Lock icon on left) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleLock();
        }}
        className="absolute left-3 sm:left-6 md:left-8 top-1/2 -translate-y-1/2 z-30 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/60 hover:bg-black/85 border border-white/25 hover:border-white/50 text-white shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer pointer-events-auto"
        title="Lock Controls"
      >
        <Unlock className="h-5 w-5 text-white" />
      </button>

      {/* CENTER CONTROLS TRIPLET: Rewind 10s, Play/Pause, Forward 10s (Symmetrical & Dead-Centered) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center gap-6 sm:gap-10 md:gap-14 select-none pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRewind10();
          }}
          className="relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/60 hover:bg-black/85 border border-white/25 hover:border-white/50 text-white shadow-xl transition-all hover:scale-110 active:scale-90 cursor-pointer"
          title="Rewind 10s"
        >
          <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">10</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlayPause();
          }}
          className="flex h-15 w-15 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-2xl shadow-purple-600/50 border border-purple-400/40 transition-all hover:scale-105 active:scale-90 cursor-pointer"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="h-7 w-7 sm:h-8 sm:w-8 fill-current" />
          ) : (
            <Play className="h-7 w-7 sm:h-8 sm:w-8 fill-current ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onForward10();
          }}
          className="relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/60 hover:bg-black/85 border border-white/25 hover:border-white/50 text-white shadow-xl transition-all hover:scale-110 active:scale-90 cursor-pointer"
          title="Forward 10s"
        >
          <RotateCw className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">10</span>
        </button>
      </div>

      {/* Next Episode / Part Button positioned independently on the far right */}
      {onNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/50 text-white hover:scale-110 active:scale-90 transition cursor-pointer hover:bg-[#8B5CF6]/50 pointer-events-auto border border-white/20"
          title="Next Part / Episode"
        >
          <SkipForward className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      )}

      {/* Bottom Bar */}
      <div className="flex flex-col gap-1 pointer-events-auto w-full">
        {/* Progress bar */}
        <div className="relative flex items-center">
          <ProgressBar
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
            onScrubStart={onScrubStart}
            onScrubEnd={onScrubEnd}
            skipMarkers={skipMarkers}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/90 mt-1">
          <div className="flex items-center gap-2">
            <span className="tabular-nums font-medium">{formatDuration(currentTime)}</span>
            <span className="text-white/40">/</span>
            <span className="tabular-nums text-white/70">{duration > 0 ? formatDuration(duration) : '--:--'}</span>

            {/* Playback Speed Badge Button right next to timestamp */}
            {onSpeedPress && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSpeedPress();
                }}
                className="flex items-center justify-center h-[22px] px-2 ml-1 rounded-md bg-white/10 hover:bg-[#8B5CF6]/30 border border-white/20 text-white hover:text-[#C4B5FD] transition cursor-pointer active:scale-95 select-none min-w-[34px]"
                title="Change Playback Speed"
              >
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-white leading-none">
                  {playbackRate === 1.0 ? '1X' : `${playbackRate}X`}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* TV / Cast Icon */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="p-1 text-white/80 hover:text-white transition cursor-pointer flex items-center justify-center"
              title="Cast to TV"
              aria-label="Cast to TV"
            >
              <Cast className="h-4 w-4" />
            </button>

            {/* Language Selector Button */}
            {onLanguagePress && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLanguagePress();
                }}
                className="flex items-center gap-1.5 h-[26px] px-2 rounded-md bg-white/10 hover:bg-[#8B5CF6]/30 border border-white/20 text-white hover:text-[#C4B5FD] transition cursor-pointer active:scale-95 select-none"
                title="Audio Language"
              >
                <Headphones className="h-3.5 w-3.5 text-[#38BDF8]" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-white leading-none">
                  {currentLanguage ? currentLanguage.toUpperCase() : 'AUDIO'}
                </span>
              </button>
            )}

            {/* Quality Switching Button */}
            {onQualityPress && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQualityPress();
                }}
                className="flex items-center justify-center h-[26px] px-2 rounded-md bg-white/10 hover:bg-[#8B5CF6]/30 border border-white/20 text-white hover:text-[#C4B5FD] transition cursor-pointer active:scale-95 select-none min-w-[50px]"
                title="Switch Quality"
              >
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-white leading-none">
                  {currentQuality ? currentQuality.toUpperCase() : 'AUTO'}
                </span>
              </button>
            )}

            {/* Picture in Picture Button */}
            {onPipToggle && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPipToggle();
                }}
                className="p-1 text-white/80 hover:text-white transition cursor-pointer"
                title="Picture in Picture"
              >
                <PictureInPicture2 className="h-4 w-4" />
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFullscreenToggle();
              }}
              className="p-1 text-white/80 hover:text-white transition cursor-pointer"
              title="Fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
