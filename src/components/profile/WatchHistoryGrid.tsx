import React, { useEffect, useState } from 'react';
import { subscribeToWatchHistory } from '../../services/contentService';
import { useAuth } from '../../hooks/useAuth';
import { ChevronRight, PlayCircle } from 'lucide-react';

interface WatchHistoryGridProps {
  onOpenHistory?: () => void;
  onPlayContent?: (contentId: string) => void;
}

export const WatchHistoryGrid: React.FC<WatchHistoryGridProps> = ({ onOpenHistory, onPlayContent }) => {
  const { user } = useAuth();
  const [historyItems, setHistoryItems] = useState<any[]>([]);

  useEffect(() => {
    if (user?.uid) {
      const unsub = subscribeToWatchHistory(user.uid, (items) => {
        // limit to 10 for the grid
        setHistoryItems(items.slice(0, 10));
      });
      return () => unsub();
    }
  }, [user]);

  if (historyItems.length === 0) return null;

  const handleCardClick = (contentId: string) => {
    if (onPlayContent) {
      onPlayContent(contentId);
    }
  };

  return (
    <div className="mt-5 flex flex-col">
      <div className="px-1 mb-3 flex items-center justify-between">
        <span className="text-[11px] font-extrabold tracking-wider text-[#A1A1AA] uppercase">Watch History</span>
        {onOpenHistory && (
          <button 
            onClick={onOpenHistory} 
            className="flex items-center text-[#A1A1AA] hover:text-white transition cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex w-full overflow-x-auto gap-3 pb-2 scrollbar-none snap-x snap-mandatory">
        {historyItems.map((item, index) => {
          const isMovie = item.type === 'movie';
          const totalEps = item.totalEpisodes || 1;
          const currentEp = item.currentEpisode || 1;
          
          let progressText = isMovie ? 'Resume Playing' : `Ep ${currentEp} / ${totalEps}`;
          if (item.percentWatched >= 98) {
            progressText = isMovie ? 'Completed' : `Completed Ep ${currentEp}`;
          }

          return (
            <button
              key={item.contentId || index}
              onClick={() => handleCardClick(item.contentId)}
              className="relative flex-none w-[180px] h-[100px] sm:w-[220px] sm:h-[124px] rounded-xl overflow-hidden group snap-start cursor-pointer border border-[#27272A] hover:border-[#3F3F46] transition-all bg-[#141416]"
            >
              <img 
                src={item.thumbnailUrl || undefined} 
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                <PlayCircle className="w-10 h-10 text-white" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-white truncate text-left drop-shadow-md">
                  {item.title}
                </span>
                
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-bold text-[#A1A1AA] uppercase">
                      {progressText}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-mono text-white">
                      {item.percentWatched || 0}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-[#27272A] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] rounded-full" 
                      style={{ width: `${Math.max(2, Math.min(100, item.percentWatched || 0))}%` }}
                    />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
