import React from 'react';
import { Sun, Volume2, VolumeX } from 'lucide-react';

interface BrightnessVolumeOverlayProps {
  type: 'brightness' | 'volume' | null;
  value: number; // 0 to 100
  visible: boolean;
}

export const BrightnessVolumeOverlay: React.FC<BrightnessVolumeOverlayProps> = ({
  type,
  value,
  visible,
}) => {
  if (!visible || !type) return null;

  const isBrightness = type === 'brightness';

  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 z-40 flex flex-col items-center rounded-2xl bg-black/75 p-3.5 backdrop-blur-md transition-opacity duration-300 ${
        isBrightness ? 'left-8' : 'right-8'
      }`}
    >
      <div className="mb-2 text-[#8B5CF6]">
        {isBrightness ? (
          <Sun className="h-6 w-6 text-amber-400" />
        ) : value === 0 ? (
          <VolumeX className="h-6 w-6 text-red-400" />
        ) : (
          <Volume2 className="h-6 w-6 text-cyan-400" />
        )}
      </div>

      {/* Vertical Gauge Bar */}
      <div className="relative h-28 w-2 rounded-full bg-white/20 overflow-hidden">
        <div
          style={{ height: `${value}%` }}
          className={`absolute bottom-0 w-full transition-all duration-75 ${
            isBrightness ? 'bg-amber-400' : 'bg-cyan-400'
          }`}
        />
      </div>

      <span className="mt-2 text-[11px] font-bold text-white">
        {Math.round(value)}%
      </span>
    </div>
  );
};
