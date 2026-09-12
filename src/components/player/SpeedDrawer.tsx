import React from 'react';
import { Check, X, Gauge, Zap, Snail } from 'lucide-react';

interface SpeedDrawerProps {
  visible: boolean;
  currentSpeed: number;
  onSelectSpeed: (speed: number) => void;
  onClose: () => void;
}

export const SpeedDrawer: React.FC<SpeedDrawerProps> = ({
  visible,
  currentSpeed,
  onSelectSpeed,
  onClose,
}) => {
  if (!visible) return null;

  const speedSections = [
    {
      title: 'Slow Motion',
      icon: Snail,
      options: [
        { value: 0.25, label: '0.25x (Super Slow)' },
        { value: 0.5, label: '0.5x (Slow)' },
        { value: 0.75, label: '0.75x' },
      ],
    },
    {
      title: 'Normal',
      icon: Gauge,
      options: [{ value: 1.0, label: '1.0x (Standard)' }],
    },
    {
      title: 'Fast Forward',
      icon: Zap,
      options: [
        { value: 1.25, label: '1.25x' },
        { value: 1.5, label: '1.5x' },
        { value: 1.75, label: '1.75x' },
        { value: 2.0, label: '2.0x (Fast)' },
        { value: 2.5, label: '2.5x' },
        { value: 3.0, label: '3.0x (Max)' },
      ],
    },
  ];

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[260px] max-w-[85vw] flex-col bg-[#121216] p-4 border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-250 select-none"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8B5CF6]/20 text-[#A78BFA]">
              <Gauge className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Playback Speed</h3>
              <p className="text-[10px] text-white/50">Current: {currentSpeed === 1.0 ? '1x' : `${currentSpeed}x`}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto pr-1 py-1 scrollbar-thin scrollbar-thumb-white/20">
          {speedSections.map((sec) => (
            <div key={sec.title} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                <sec.icon className="h-3 w-3" />
                <span>{sec.title}</span>
              </div>
              <div className="flex flex-col gap-1">
                {sec.options.map((opt) => {
                  const isActive = currentSpeed === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onSelectSpeed(opt.value);
                        onClose();
                      }}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition cursor-pointer active:scale-98 ${
                        isActive
                          ? 'bg-[#8B5CF6] text-white shadow-md shadow-purple-500/30'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isActive && <Check className="h-4 w-4 text-white stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

