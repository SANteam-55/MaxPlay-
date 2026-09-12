import React from 'react';
import { ChevronDown } from 'lucide-react';

interface FilterChipProps {
  label: string;
  isActive?: boolean;
  onPress?: () => void;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  isActive = false,
  onPress,
}) => {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onPress?.();
      }}
      className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 ${
        isActive
          ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#8B5CF6]'
          : 'border-[#3F3F46] bg-[#121212] text-[#A1A1AA] hover:text-white hover:border-[#6B7280]'
      }`}
    >
      <span>{label}</span>
      <ChevronDown className="h-3.5 w-3.5 opacity-80" />
    </button>
  );
};
