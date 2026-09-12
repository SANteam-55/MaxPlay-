import React from 'react';
import { Check } from 'lucide-react';

interface EpisodePillProps {
  number: string | number;
  isActive?: boolean;
  isWatched?: boolean;
  onPress?: () => void;
}

export const EpisodePill: React.FC<EpisodePillProps> = ({
  number,
  isActive = false,
  isWatched = false,
  onPress,
}) => {
  let bgClass = 'bg-[#121212] text-white';
  if (isActive) {
    bgClass = 'bg-[#8B5CF6] text-white shadow-lg';
  } else if (isWatched) {
    bgClass = 'bg-[#1C1C1E] text-[#A1A1AA]';
  }

  return (
    <button
      onClick={onPress}
      className={`relative flex h-[40px] w-[48px] flex-shrink-0 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-all active:scale-95 ${bgClass}`}
    >
      <span>{number}</span>
      {isWatched && !isActive && (
        <Check className="absolute top-1 right-1 h-3 w-3 text-[#10B981]" />
      )}
    </button>
  );
};
