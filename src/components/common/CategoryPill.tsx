import React, { ReactNode } from 'react';
import { GRADIENTS } from '../../utils/colors';

interface CategoryPillProps {
  label: string;
  icon?: ReactNode;
  isActive?: boolean;
  onPress?: () => void;
}

export const CategoryPill: React.FC<CategoryPillProps> = ({
  label,
  icon,
  isActive = false,
  onPress,
}) => {
  return (
    <button
      onClick={onPress}
      style={{
        background: isActive ? GRADIENTS.primary : '#1C1C1E',
      }}
      className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 ${
        isActive ? 'text-white shadow-md' : 'text-[#A1A1AA] hover:text-white'
      }`}
    >
      {icon && <span className="text-current">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};
