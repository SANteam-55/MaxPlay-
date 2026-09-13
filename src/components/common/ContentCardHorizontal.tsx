import React from 'react';
import { Play, MoreVertical } from 'lucide-react';
import { GRADIENTS } from '../../utils/colors';
import { triggerCardPopunder } from '../../utils/adsHelper';
import { useAuth } from '../../hooks/useAuth';

interface ContentCardHorizontalProps {
  thumbnailUrl: string;
  title: string;
  subtitle?: string;
  duration?: string;
  progress?: number; // 0 to 100
  onPress?: () => void;
  onMenuPress?: () => void;
  showPlayButton?: boolean;
}

export const ContentCardHorizontal: React.FC<ContentCardHorizontalProps> = ({
  thumbnailUrl,
  title,
  subtitle,
  duration,
  progress = 0,
  onPress,
  onMenuPress,
  showPlayButton = true,
}) => {
  const { user } = useAuth();
  return (
    <div
      onClick={() => {
        triggerCardPopunder(!!user?.isPremium);
        onPress?.();
      }}
      className="flex cursor-pointer items-center justify-between rounded-xl bg-[#121212] p-2.5 transition-all hover:bg-[#1C1C1E] active:scale-[0.98]"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Thumbnail Container */}
        <div className="relative h-[60px] w-[100px] flex-shrink-0 overflow-hidden rounded-lg bg-[#1C1C1E]">
          <img
            src={thumbnailUrl || undefined}
            alt={title}
            className="h-full w-full object-cover"
          />

          {/* Duration Badge */}
          {duration && (
            <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.2 text-[10px] text-white">
              {duration}
            </div>
          )}

          {/* Progress bar */}
          {progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#3F3F46]">
              <div
                className="h-full"
                style={{
                  width: `${progress}%`,
                  background: GRADIENTS.progress,
                }}
              />
            </div>
          )}
        </div>

        {/* Text Section */}
        <div className="flex flex-col text-left overflow-hidden">
          <h4 className="line-clamp-1 text-[15px] font-medium text-white">
            {title}
          </h4>
          {subtitle && (
            <p className="line-clamp-1 text-[13px] text-[#A1A1AA] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {showPlayButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPress?.();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1C1C1E] text-white transition hover:bg-[#7C3AED]"
          >
            <Play className="h-4 w-4 fill-current ml-0.5" />
          </button>
        )}

        {onMenuPress && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMenuPress();
            }}
            className="p-1.5 text-[#6B7280] hover:text-white"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};
