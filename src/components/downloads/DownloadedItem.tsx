import React, { useState, useEffect } from 'react';
import { Play, AlertCircle, Trash2, Film } from 'lucide-react';
import { DownloadedFile, downloadManager } from '../../services/DownloadManager';

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
  const isLocalFile =
    item.category === 'local' ||
    Boolean(item.videoUrl && item.videoUrl.includes('/device-video/'));

  const hasGenuineThumb = Boolean(
    item.posterUrl &&
      item.posterUrl.trim().length > 0 &&
      !item.posterUrl.includes('images.unsplash.com/photo-1536440136628-849c177e76a1')
  );

  const [imgFailed, setImgFailed] = useState(false);
  const [isVerticalVideo, setIsVerticalVideo] = useState<boolean>(Boolean(item.isVertical));
  const [fallbackVideoSrc, setFallbackVideoSrc] = useState<string>(item.videoUrl || '');

  useEffect(() => {
    setImgFailed(false);
    setIsVerticalVideo(Boolean(item.isVertical));
    setFallbackVideoSrc(item.videoUrl || '');

    if (isLocalFile && !hasGenuineThumb && !item.videoUrl) {
      let active = true;
      downloadManager
        .getOfflineVideoUrl(item.id, item.episodeId, item.episodeIndex)
        .then((url) => {
          if (active && url) {
            setFallbackVideoSrc(url);
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }
  }, [item.id, item.posterUrl, item.videoUrl, item.isVertical, isLocalFile, hasGenuineThumb, item.episodeId, item.episodeIndex]);

  // For Local Files: Horizontal (16:9) card image by default; switches to Vertical (9:16) if video is vertical
  // For MovieBox / Received: Standard vertical poster card image
  const thumbDimensionsClass = isLocalFile
    ? isVerticalVideo
      ? 'h-[90px] w-[58px] sm:h-[94px] sm:w-[62px]'
      : 'h-[68px] w-[120px] sm:h-[74px] sm:w-[132px]'
    : 'h-[90px] w-[60px]';

  return (
    <div
      onClick={() => !item.hasError && onPlay(item)}
      className="flex items-center gap-3 rounded-2xl bg-[#121212] p-3 border border-[#1C1C1E] transition hover:border-purple-500/40 hover:bg-[#16161D] cursor-pointer group select-none"
    >
      {/* Thumbnail with Play overlay */}
      <div
        className={`relative ${thumbDimensionsClass} flex-shrink-0 overflow-hidden rounded-xl bg-[#1C1C1E] border border-white/5 group-hover:scale-[1.03] transition-all duration-200`}
      >
        {isLocalFile ? (
          hasGenuineThumb && !imgFailed ? (
            <img
              src={item.posterUrl}
              alt={item.title}
              className="h-full w-full object-cover"
              onLoad={(e) => {
                const { naturalWidth, naturalHeight } = e.currentTarget;
                if (naturalWidth > 0 && naturalHeight > 0) {
                  setIsVerticalVideo(naturalHeight > naturalWidth);
                }
              }}
              onError={() => setImgFailed(true)}
            />
          ) : fallbackVideoSrc ? (
            <video
              src={fallbackVideoSrc}
              preload="metadata"
              muted
              playsInline
              className="h-full w-full object-cover pointer-events-none"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth > 0 && v.videoHeight > 0) {
                  setIsVerticalVideo(v.videoHeight > v.videoWidth);
                }
                try {
                  const seekTarget = v.duration && v.duration > 2 ? Math.min(1.5, v.duration * 0.1) : 0.1;
                  v.currentTime = seekTarget;
                } catch {}
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1E1B2E] to-[#121218]">
              <Film className="h-6 w-6 text-purple-400/60" />
            </div>
          )
        ) : (
          <img
            src={item.posterUrl || undefined}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        )}

        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition" />
        {!item.hasError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-black shadow-lg backdrop-blur-xs group-hover:scale-110 transition">
              <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-center min-w-0 pr-2">
        <h4 className="text-sm font-bold text-white truncate line-clamp-1 group-hover:text-purple-300 transition">
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
          <span className="mt-1 text-[11px] font-medium text-[#6B7280] truncate">
            {item.status}
          </span>
        )}
      </div>

      {/* Play Button & Menu */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {!item.hasError && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(item);
            }}
            className="flex items-center justify-center rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            Play
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
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

