import React from 'react';
import { Check, X, ShieldCheck, Sparkles, Zap } from 'lucide-react';

interface QualityDrawerProps {
  visible: boolean;
  currentQuality: string; // '480p' | '720p' | '1080p' | '360p'
  availableQualities: string[];
  isAutoMode?: boolean;
  actualQuality?: string;
  onSelectQuality: (quality: string) => void;
  onClose: () => void;
}

export const QualityDrawer: React.FC<QualityDrawerProps> = ({
  visible,
  currentQuality,
  availableQualities,
  isAutoMode = false,
  actualQuality,
  onSelectQuality,
  onClose,
}) => {
  if (!visible) return null;

  const getQualityBadge = (q: string) => {
    const lower = q.toLowerCase();
    if (lower.includes('1080')) return { label: 'Full HD', color: 'bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]/40' };
    if (lower.includes('720')) return { label: 'HD', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' };
    if (lower.includes('480')) return { label: 'SD', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
    if (lower.includes('360')) return { label: 'Fast Load', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' };
    return { label: 'Auto', color: 'bg-zinc-700/50 text-zinc-300 border-zinc-600' };
  };

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[260px] sm:w-[280px] flex-col bg-[#121212]/95 backdrop-blur-md p-4 border-l border-[#1C1C1E] shadow-2xl animate-in slide-in-from-right duration-200 select-none"
      >
        <div className="flex items-center justify-between border-b border-[#1C1C1E] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#8B5CF6]" />
            <h3 className="text-sm font-bold text-white tracking-wide">Video Quality</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#A1A1AA] hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close quality selector"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto py-1">
          {/* Auto Quality Option */}
          <button
            onClick={() => {
              onSelectQuality('auto');
              onClose();
            }}
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer border ${
              isAutoMode
                ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/50 text-white shadow-md shadow-purple-500/10'
                : 'border-transparent text-[#A1A1AA] hover:bg-[#1C1C1E] hover:text-white'
            }`}
          >
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold tracking-wide">AUTO</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold border bg-[#8B5CF6]/20 text-[#C4B5FD] border-[#8B5CF6]/40 flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5 text-amber-400" />
                  Fast Start & Adaptive
                </span>
              </div>
              {isAutoMode && actualQuality && (
                <span className="text-[10px] font-medium text-[#A1A1AA]">
                  Current Stream: <span className="text-white uppercase font-bold">{actualQuality}</span>
                </span>
              )}
            </div>
            {isAutoMode && <Check className="h-4 w-4 text-[#8B5CF6]" />}
          </button>

          <div className="my-1 border-t border-white/5" />

          {availableQualities.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#71717A]">
              No individual quality links available
            </div>
          ) : (
            availableQualities.map((q) => {
              const isActive = !isAutoMode && currentQuality.toLowerCase() === q.toLowerCase();
              const badge = getQualityBadge(q);

              return (
                <button
                  key={q}
                  onClick={() => {
                    onSelectQuality(q);
                    onClose();
                  }}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/50 text-white shadow-md shadow-purple-500/10'
                      : 'border-transparent text-[#A1A1AA] hover:bg-[#1C1C1E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-extrabold tracking-wide">{q.toUpperCase()}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  {isActive && <Check className="h-4 w-4 text-[#8B5CF6]" />}
                </button>
              );
            })
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-[#1C1C1E] flex items-center justify-center gap-1.5 text-[10px] text-[#71717A]">
          <Sparkles className="h-3 w-3 text-[#8B5CF6]" />
          <span>Auto selects lowest on start for 0-lag play</span>
        </div>
      </div>
    </div>
  );
};
