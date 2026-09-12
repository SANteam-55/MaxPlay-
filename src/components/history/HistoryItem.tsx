import React from 'react';
import { Play, MoreVertical, Tv, Trash2 } from 'lucide-react';
import { WatchHistoryItem } from '../../data/mockHistory';

interface HistoryItemProps {
  item: any;
  onPlay: (item: any) => void;
  onDelete?: (id: string) => void;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({
  item,
  onPlay,
  onDelete,
}) => {
  const formatTime = (secs: number) => {
    if (!secs) return '00:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const isSeries = item.type === 'tv' || item.type === 'anime';

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#121212] p-3 border border-[#1C1C1E] transition hover:border-[#1C1C1E]/80">
      {/* Thumbnail 120x68 (16:9) with progress bar overlay */}
      <div
        onClick={() => onPlay(item)}
        className="relative h-[68px] w-[120px] flex-shrink-0 overflow-hidden rounded-xl bg-[#1C1C1E] cursor-pointer group"
      >
        <img
          src={item.thumbnailUrl || item.posterUrl || undefined}
          alt={item.title}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition" />

        {/* TV Badge */}
        {isSeries && (
          <div className="absolute top-1 left-1 flex items-center rounded-md bg-black/60 px-1 py-0.5 text-[9px] font-semibold text-white backdrop-blur-xs">
            <Tv className="h-2.5 w-2.5 mr-0.5 text-[#06B6D4]" />
            <span>TV</span>
          </div>
        )}

        {/* Duration Badge */}
        <div className="absolute bottom-1.5 right-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
          {formatTime(item.watchedSeconds)}
        </div>

        {/* Bottom Progress Bar Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/40">
          <div
            style={{ width: `${item.percentWatched || 0}%` }}
            className="h-full bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6]"
          />
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-center min-w-0 pr-1">
        <h4 className="text-sm font-bold text-white truncate line-clamp-1">
          {item.title}
        </h4>
        {isSeries && item.episodeNum && (
          <span className="text-xs font-semibold text-[#8B5CF6] mt-0.5">
            {`Ep ${item.episodeNum} / ${item.totalEpisodes || '?'}`}
          </span>
        )}
        <span className="mt-1 text-[11px] font-medium text-[#A1A1AA]">
          {item.percentWatched >= 98
            ? 'Finished'
            : `${item.percentWatched || 0}% watched`}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onPlay(item)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white hover:scale-105 transition cursor-pointer active:scale-90 shadow-md"
          title="Play from history"
        >
          <Play className="h-4 w-4 fill-current ml-0.5" />
        </button>

        {onDelete && (
          <button
            onClick={() => onDelete(item.id)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#6B7280] hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
            title="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
