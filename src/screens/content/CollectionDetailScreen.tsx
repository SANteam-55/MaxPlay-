import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { ContentItem } from '../../types';
import { useContent } from '../../hooks/useContent';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { Star } from 'lucide-react';

interface CollectionDetailScreenProps {
  collection: any; // { isCollection: true, customTitle, customImage, backdropImage, collectionIds }
  onBack: () => void;
  onSelectContent: (item: ContentItem) => void;
}

const getTagGradient = (index: number) => {
  switch (index) {
    case 0: return 'bg-gradient-to-br from-pink-500 to-rose-600';
    case 1: return 'bg-gradient-to-br from-orange-400 to-orange-600';
    case 2: return 'bg-gradient-to-br from-amber-400 to-amber-600';
    case 3: return 'bg-gradient-to-br from-blue-400 to-blue-600';
    default: return 'bg-gradient-to-br from-gray-500 to-gray-700';
  }
};

export const CollectionDetailScreen: React.FC<CollectionDetailScreenProps> = ({
  collection,
  onBack,
  onSelectContent,
}) => {
  const { contentList, loading } = useContent();
  const [items, setItems] = useState<ContentItem[]>([]);

  useEffect(() => {
    if (collection.collectionIds && Array.isArray(collection.collectionIds)) {
      const resolvedItems = collection.collectionIds.map((id: string) => 
        contentList.find(c => c.id === id)
      ).filter(Boolean) as ContentItem[];
      setItems(resolvedItems);
    }
  }, [collection, contentList]);

  return (
    <div className="absolute inset-0 z-[60] flex h-full w-full flex-col overflow-y-auto overflow-x-hidden bg-[#050505] scrollbar-none pb-4 md:pb-8">
      {/* Top Floating Exit Bar with prominent Back Arrow */}
      <div className="sticky top-0 z-50 flex items-center justify-between w-full pointer-events-none p-3.5 sm:p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
        <button 
          onClick={onBack}
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white hover:bg-black/90 transition shadow-lg cursor-pointer active:scale-95"
          title="Exit Collection"
          aria-label="Exit Collection"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Landscape Header */}
      <div className="relative -mt-[60px] w-full h-[250px] sm:h-[300px] shrink-0">
        <img 
          src={collection.backdropImage || collection.customImage || undefined} 
          alt={collection.customTitle} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
        
        {/* Title overlay */}
        <div className="absolute bottom-4 inset-x-0 px-4">
          <h1 className="text-2xl sm:text-3xl font-black text-white text-center drop-shadow-lg leading-tight">
            {collection.customTitle}
          </h1>
        </div>
      </div>

      {/* Content List */}
      <div className="relative z-10 -mt-6 pt-6 px-4 pb-12 flex flex-col gap-5 bg-[#12131A] rounded-t-[24px] min-h-[50vh] shadow-[0_-10px_30px_rgba(0,0,0,0.5)] w-full md:max-w-4xl xl:max-w-6xl mx-auto md:rounded-t-none">
        {loading || items.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 bg-[#1C1C1E] p-2.5 rounded-xl border border-white/5">
              <LoadingSkeleton width={110} height={160} radius="12px" className="shrink-0" />
              <div className="flex-1 flex flex-col gap-2 justify-center">
                <LoadingSkeleton width="75%" height={16} radius="6px" />
                <LoadingSkeleton width="90%" height={12} radius="4px" />
                <LoadingSkeleton width="40%" height={28} radius="6px" className="mt-2" />
              </div>
            </div>
          ))
        ) : items.map((item, index) => {
          const displayPoster = (item as any).customImage || item.posterUrl;
          return (
            <div 
              key={`${item.id}-${index}`} 
              onClick={() => onSelectContent(item)}
              className="flex gap-4 items-start cursor-pointer transition-opacity hover:opacity-80"
            >
              {/* Poster */}
              <div className="relative w-[100px] aspect-[3/4] shrink-0 rounded-lg overflow-hidden bg-[#1A1A1A] shadow-md">
                <img src={displayPoster || undefined} alt={item.title} className="w-full h-full object-cover" />
                
                {/* Ranking Tag (like in the image TOP 01) */}
                <div className={`absolute top-0 left-0 ${getTagGradient(index)} px-1.5 py-0.5 rounded-br-lg z-10 flex flex-col items-center justify-center leading-none shadow-md`}>
                  <span className="text-[7px] font-black text-white/90 uppercase tracking-wide">TOP</span>
                  <span className="text-[13px] font-black text-white">{String(index + 1).padStart(2, '0')}</span>
                </div>

                {/* Language Tag */}
                {item.language && (
                  <div className="absolute top-0 right-0 bg-black/80 px-1.5 py-0.5 rounded-bl-lg text-[9px] font-semibold text-white shadow-sm">
                    {item.language}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 flex flex-col justify-center overflow-hidden">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h3 className="text-[15px] font-bold text-white truncate leading-tight flex-1 min-w-0" title={item.title}>
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-[12px] font-bold text-white/90">{Number(item.rating || 9.0).toFixed(1)}</span>
                  </div>
                </div>
                
                <p className="text-[11.5px] text-[#9CA3AF] line-clamp-2 mb-2 leading-snug pr-2">
                  {item.description || 'Action packed adventure awaits in this highly rated title.'}
                </p>

                <div>
                  <button className="flex items-center gap-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] hover:opacity-90 text-white px-4 py-1.5 rounded-md transition-all shadow-lg active:scale-95 w-fit mt-1">
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span className="text-[12px] font-bold">Play</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
