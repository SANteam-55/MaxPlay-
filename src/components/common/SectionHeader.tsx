import React, { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  actionText?: string;
  onActionPress?: () => void;
  icon?: ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionText = 'See All',
  onActionPress,
  icon,
}) => {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-[#8B5CF6]">{icon}</span>}
        <h2 className="text-[17px] font-semibold text-white">{title}</h2>
      </div>

      {onActionPress && (
        <button
          onClick={onActionPress}
          className="flex items-center gap-0.5 text-[12px] font-medium text-[#8B5CF6] transition hover:opacity-80 cursor-pointer"
        >
          <span>{actionText}</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
