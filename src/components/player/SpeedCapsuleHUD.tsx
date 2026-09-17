import React from 'react';
import { Zap, FastForward, Rewind, Play } from 'lucide-react';

interface SpeedCapsuleHUDProps {
  visible: boolean;
  speed: number;
  progress: number;
}

export const SpeedCapsuleHUD: React.FC<SpeedCapsuleHUDProps> = ({
  visible,
  speed,
  progress,
}) => {
  if (!visible) return null;

  // Determine styling based on speed range
  const isSuperFast = speed > 2.2;
  const isFast = speed > 1.2 && speed <= 2.2;
  const isNormal = speed >= 0.9 && speed <= 1.2;
  const isSlow = speed < 0.9;

  let speedLabel = `${speed.toFixed(1)}x Fast`;
  let themeColor = 'purple';

  if (isSuperFast) {
    speedLabel = `${speed.toFixed(1)}x Super Fast`;
    themeColor = 'amber';
  } else if (isFast) {
    speedLabel = `${speed.toFixed(1)}x Fast`;
    themeColor = 'purple';
  } else if (isNormal) {
    speedLabel = '1.0x Normal';
    themeColor = 'white';
  } else if (isSlow) {
    speedLabel = `${speed.toFixed(1)}x Slow`;
    themeColor = 'cyan';
  }

  return (
    <div className="absolute top-6 sm:top-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in zoom-in-95 duration-200 select-none">
      <div className="flex flex-col items-center gap-2">
        {/* Live Active Speed Badge */}
        <div
          className={`px-4 py-1.5 rounded-full border shadow-xl backdrop-blur-2xl flex items-center gap-2 transition-all duration-150 ${
            isSuperFast
              ? 'bg-amber-950/85 border-amber-400/70 shadow-[0_0_20px_rgba(245,158,11,0.5)] text-amber-300'
              : isFast
              ? 'bg-purple-950/85 border-purple-400/70 shadow-[0_0_20px_rgba(168,85,247,0.5)] text-purple-300'
              : isNormal
              ? 'bg-black/85 border-white/30 shadow-[0_0_15px_rgba(0,0,0,0.6)] text-white'
              : 'bg-cyan-950/85 border-cyan-400/70 shadow-[0_0_20px_rgba(6,182,212,0.5)] text-cyan-300'
          }`}
        >
          {isSuperFast ? (
            <Zap className="w-4 h-4 fill-amber-400 text-amber-400 animate-pulse" />
          ) : isFast ? (
            <FastForward className="w-4 h-4 fill-purple-400 text-purple-400" />
          ) : isNormal ? (
            <Play className="w-3.5 h-3.5 fill-white text-white" />
          ) : (
            <Rewind className="w-4 h-4 fill-cyan-400 text-cyan-400" />
          )}
          <span className="font-black text-xs sm:text-sm tracking-wide">
            {speedLabel}
          </span>
        </div>

        {/* PlayIt-Style Horizontal Pill / Capsule Bar */}
        <div className="w-[270px] sm:w-[320px] bg-black/80 backdrop-blur-2xl border border-white/25 rounded-full px-4 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.75)] flex flex-col gap-2">
          {/* Slider Track with Sliding Glowing Dot */}
          <div className="relative w-full h-2 bg-white/15 rounded-full flex items-center">
            {/* Active progress fill */}
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                isSuperFast
                  ? 'bg-gradient-to-r from-purple-500 via-orange-500 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.7)]'
                  : isFast
                  ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.7)]'
                  : isNormal
                  ? 'bg-white/40'
                  : 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.7)]'
              }`}
              style={{ width: `${progress}%` }}
            />

            {/* Sliding Dot (Thumb Indicator) that follows touch position */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white transition-all duration-75 flex items-center justify-center shadow-lg ${
                isSuperFast
                  ? 'border-2 border-amber-400 shadow-[0_0_14px_#fbbf24] ring-2 ring-amber-400/40'
                  : isFast
                  ? 'border-2 border-purple-400 shadow-[0_0_14px_#c084fc] ring-2 ring-purple-400/40'
                  : isNormal
                  ? 'border-2 border-white shadow-[0_0_10px_#ffffff]'
                  : 'border-2 border-cyan-400 shadow-[0_0_14px_#38bdf8] ring-2 ring-cyan-400/40'
              }`}
              style={{ left: `${progress}%` }}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isSuperFast
                    ? 'bg-amber-500'
                    : isFast
                    ? 'bg-purple-600'
                    : isNormal
                    ? 'bg-zinc-800'
                    : 'bg-cyan-600'
                }`}
              />
            </div>
          </div>

          {/* Speed Milestones: 0.5x (Slow) ➔ 1.0x (Normal) ➔ 2.0x (Fast) ➔ 3.0x (Super Fast) */}
          <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-bold px-0.5 select-none">
            <div
              className={`flex flex-col items-center transition-transform duration-150 ${
                isSlow ? 'scale-110 text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]' : 'text-white/50'
              }`}
            >
              <span>0.5x</span>
              <span className="text-[8px] font-medium -mt-0.5">Slow</span>
            </div>

            <div
              className={`flex flex-col items-center transition-transform duration-150 ${
                isNormal ? 'scale-110 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]' : 'text-white/50'
              }`}
            >
              <span>1.0x</span>
              <span className="text-[8px] font-medium -mt-0.5">Normal</span>
            </div>

            <div
              className={`flex flex-col items-center transition-transform duration-150 ${
                isFast ? 'scale-110 text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.9)]' : 'text-white/50'
              }`}
            >
              <span>2.0x</span>
              <span className="text-[8px] font-medium -mt-0.5">Fast</span>
            </div>

            <div
              className={`flex flex-col items-center transition-transform duration-150 ${
                isSuperFast ? 'scale-110 text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]' : 'text-white/50'
              }`}
            >
              <span>3.0x</span>
              <span className="text-[8px] font-medium -mt-0.5">Max</span>
            </div>
          </div>
        </div>

        {/* Action Hint */}
        <span className="text-[9px] sm:text-[10px] text-white/70 font-medium tracking-wider drop-shadow-md">
          Slide left/right to adjust • Release to normal
        </span>
      </div>
    </div>
  );
};
