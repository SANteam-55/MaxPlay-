import React from 'react';
import { ChevronRight } from 'lucide-react';

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconBgColor?: string;
  title: string;
  subtitle?: string;
  count?: string | number;
  hasNotification?: boolean;
  onPress?: () => void;
  className?: string;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  icon: Icon,
  iconColor = 'text-[#8B5CF6]',
  iconBgColor,
  title,
  subtitle,
  count,
  hasNotification,
  onPress,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`flex w-full items-center justify-between p-3.5 px-4 hover:bg-[#1F1F23] active:bg-[#27272A] transition-all text-left cursor-pointer border-b border-[#27272A]/50 last:border-b-0 outline-none group ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105 flex-shrink-0 ${
            iconBgColor || 'bg-[#1C1C1E]'
          }`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
              {title}
            </span>
            {hasNotification && (
              <span className="h-2 w-2 rounded-full bg-[#EF4444] flex-shrink-0 animate-pulse" />
            )}
          </div>
          {subtitle && (
            <span className="text-xs text-[#A1A1AA] truncate mt-0.5">{subtitle}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {count !== undefined && (
          <span className="rounded-lg bg-[#27272A] px-2 py-0.5 text-xs font-bold text-[#A1A1AA]">
            {count}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-[#6B7280] group-hover:text-white group-hover:translate-x-0.5 transition" />
      </div>
    </button>
  );
};
