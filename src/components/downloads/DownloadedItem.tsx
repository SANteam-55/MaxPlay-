import React from 'react';
import { Play, AlertCircle, MoreVertical, Trash2 } from 'lucide-react';
import { DownloadedFile } from '../../services/DownloadManager';

interface DownloadedItemProps {
  item: DownloadedFile;
  onPlay: (item: DownloadedFile) => void;
  onDelete?: (id: string) => void;
}

export const DownloadedItem: React.FC<DownloadedItemProps> = ({
  item,
  onPlay,
  onDelete,
}) => {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#121212] p-3 border border-[#1C1C1E] transition hover:border-[#1C1C1E]/80">
      {/* Thumbnail with Play overlay */}
      <div
        onClick={() => !item.hasError && onPlay(item)}
        className="relative h-[90px] w-[60px] flex-shrink-0 overflow-hidden rounded-xl bg-[#1C1C1E] cursor-pointer group"
      >
        <img
          src={item.posterUrl || undefined}
          alt={item.title}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition" />
        {!item.hasError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-black shadow-lg backdrop-blur-xs group-hover:scale-110 transition">
              <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-center min-w-0 pr-2">
        <h4 className="text-sm font-bold text-white truncate line-clamp-1">
          {item.title}
        </h4>
        <p className="text-xs text-[#A1A1AA] mt-1 truncate">
          {item.subtitle}
        </p>

        {item.hasError ? (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-amber-400">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Local file doesn't exist</span>
          </div>
        ) : (
          <span className="mt-1 text-[11px] font-medium text-[#6B7280]">
            {item.status}
          </span>
        )}
      </div>

      {/* Play Button & Menu */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {!item.hasError && (
          <button
            onClick={() => onPlay(item)}
            className="flex items-center justify-center rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            Play
          </button>
        )}

        {onDelete && (
          <button
            onClick={() => onDelete(item.id)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#6B7280] hover:bg-red-500/20 hover:text-red-400 transition cursor-pointer"
            title="Delete file"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
