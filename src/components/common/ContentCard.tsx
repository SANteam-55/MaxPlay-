import React from 'react';
import { Star, Pencil } from 'lucide-react';
import { ContentItem } from '../../types';

interface ContentCardProps {
  item: ContentItem;
  onPress?: (item: ContentItem) => void;
  onEdit?: (item: ContentItem) => void;
  width?: number;
  height?: number;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  onPress,
  onEdit,
  width = 120,
  height = 180,
}) => {
  return (
    <div
      onClick={() => onPress?.(item)}
      className="group relative cursor-pointer flex-shrink-0 transition-transform duration-200 active:scale-95"
      style={{ width }}
    >
      {/* Poster Container */}
      <div
        className="relative overflow-hidden rounded-xl bg-[#1C1C1E]"
        style={{ width, height }}
      >
        <img
          src={(item as any).customImage || item.posterUrl || undefined}
          alt={(item as any).customTitle || item.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Edit Button (if onEdit callback provided) */}
        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-[#8B5CF6] text-white shadow-lg hover:bg-[#7C3AED] transition active:scale-90 cursor-pointer"
            title="Edit Content Details"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Language Badge (top right) */}
        {item.language && (
          <div className="absolute top-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
            {item.language}
          </div>
        )}

        {/* Rating Badge (bottom left) */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span>{Number(item.rating || 9.0).toFixed(1)}</span>
        </div>
      </div>

      {/* Info section below poster */}
      <div className="mt-2 text-left">
        <h3 className="line-clamp-2 text-[13px] font-medium text-white group-hover:text-[#8B5CF6] transition-colors">
          {item.title}
        </h3>
        <p className="mt-0.5 text-[11px] text-[#6B7280]">
          {item.year} {item.genres?.[0] ? `• ${item.genres[0]}` : ''}
        </p>
      </div>
    </div>
  );
};
