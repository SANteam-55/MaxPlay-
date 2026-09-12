import React from 'react';

export interface SegmentOption {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  activeId,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex w-full rounded-2xl bg-[#121212] p-1 border border-[#1C1C1E] ${className}`}>
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = activeId === opt.id;

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition cursor-pointer outline-none active:scale-[0.98] ${
              isActive
                ? 'bg-[#1C1C1E] text-white shadow-sm'
                : 'text-[#6B7280] hover:text-white hover:bg-white/5'
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive ? 'bg-[#8B5CF6] text-white' : 'bg-[#1C1C1E] text-[#6B7280]'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
