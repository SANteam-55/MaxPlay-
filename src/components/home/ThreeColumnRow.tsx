import React, { useState, useEffect, useRef } from 'react';
import { Star, Sparkles } from 'lucide-react';
import { ContentItem } from '../../types';

interface ThreeColumnRowProps {
  title: string;
  icon?: React.ReactNode;
  items: ContentItem[];
  onSelectContent: (item: ContentItem) => void;
  onSeeAll?: () => void;
}

export const ThreeColumnRow: React.FC<ThreeColumnRowProps> = ({
  title,
  icon,
  items,
  onSelectContent,
  onSeeAll,
}) => {
  const [displayCount, setDisplayCount] = useState<number>(9);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDisplayCount(9);
  }, [items]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prevCount) => Math.min(prevCount + 9, items.length));
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [items.length]);

  if (!items || items.length === 0) return null;

  const displayedItems = items.slice(0, displayCount);

  return (
    <div className="mt-5 px-4">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {icon || <Sparkles className="h-5 w-5 text-[#8B5CF6]" />}
          <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
            {title}
          </h2>
        </div>

        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="text-xs font-bold text-[#8B5CF6] hover:text-[#A78BFA] transition cursor-pointer px-1 py-0.5"
          >
            See All
          </button>
        )}
      </div>

      {/* 3-COLUMN VERTICAL GRID (3 CARDS PER ROW, FLOWING DOWNWARD) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 pt-1">
        {displayedItems.map((item, idx) => {
          const displayPoster =
            (item as any).customImage ||
            item.posterUrl ||
            'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300';
          const displayTitle = (item as any).customTitle || item.title;
          const rating = item.rating || 9.0;
          const yearOrGenre = item.year || item.genres?.[0] || item.category || 'HD';

          return (
            <div
              key={`${item.id}-${idx}`}
              onClick={() => onSelectContent(item)}
              className="group relative flex flex-col cursor-pointer transition-transform duration-200 active:scale-95 select-none"
            >
              {/* Poster Box */}
              <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-[#1C1C1E] border border-white/5 shadow-md shadow-black/40">
                <img
                  src={displayPoster || undefined}
                  alt={displayTitle}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Gradient Shadow Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                {/* Top Tags */}
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 pointer-events-none">
                  {/* Rating Badge */}
                  <div className="flex items-center gap-0.5 rounded-md bg-black/70 backdrop-blur-xs px-1.5 py-0.5 text-[10px] font-bold text-white border border-white/10 shadow">
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    <span>{Number(rating).toFixed(1)}</span>
                  </div>
                </div>

                {/* Bottom Type / Year pill inside poster */}
                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                  <span className="text-[10px] font-medium text-white/90 drop-shadow truncate">
                    {yearOrGenre}
                  </span>
                </div>
              </div>

              {/* Title & Metadata below poster */}
              <div className="mt-1.5 px-0.5 text-left">
                <h3 className="line-clamp-2 text-xs sm:text-sm font-semibold text-white group-hover:text-[#A78BFA] transition-colors leading-tight">
                  {displayTitle}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* LAZY LOADING SENTINEL */}
      {displayCount < items.length && (
        <div ref={observerTarget} className="w-full h-10 mt-4 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};
