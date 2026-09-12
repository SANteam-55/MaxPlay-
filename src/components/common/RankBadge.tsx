import React from 'react';

interface RankBadgeProps {
  rank: number;
}

export const RankBadge: React.FC<RankBadgeProps> = ({ rank }) => {
  let bgStyle = 'bg-[#1C1C1E] text-white';

  if (rank === 1) {
    bgStyle = 'bg-[#EF4444] text-white shadow-md shadow-red-500/30';
  } else if (rank === 2) {
    bgStyle = 'bg-[#F97316] text-white shadow-md shadow-orange-500/30';
  } else if (rank === 3) {
    bgStyle = 'bg-[#F59E0B] text-white shadow-md shadow-amber-500/30';
  }

  return (
    <div
      className={`flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-md text-[12px] font-bold ${bgStyle}`}
    >
      {rank}
    </div>
  );
};
