import React from 'react';
import { Play, Pause, ArrowDown, Clock, MoreVertical, X } from 'lucide-react';
import { DownloadTask } from '../../services/DownloadManager';

interface DownloadItemProps {
  task: DownloadTask;
  onPauseResume: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onMenu?: (task: DownloadTask) => void;
}

export const DownloadItem: React.FC<DownloadItemProps> = ({
  task,
  onPauseResume,
  onCancel,
  onMenu,
}) => {
  const percent = Math.min(
    100,
    Math.round((task.bytesDownloaded / task.totalBytes) * 100) || 0
  );

  const downloadedMb = (task.bytesDownloaded / (1024 * 1024)).toFixed(1);
  const totalMb = (task.totalBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="group relative flex items-center gap-3 rounded-2xl bg-[#121212] p-3 border border-[#1C1C1E] transition hover:border-[#1C1C1E]/80">
      {/* Thumbnail */}
      <div className="relative h-[90px] w-[60px] flex-shrink-0 overflow-hidden rounded-xl bg-[#1C1C1E]">
        <img
          src={task.posterUrl || undefined}
          alt={task.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Content Metadata & Progress */}
      <div className="flex flex-1 flex-col justify-center min-w-0 pr-2">
        <h4 className="text-sm font-bold text-white truncate line-clamp-1">
          {task.title}
        </h4>
        {task.episodeTitle && (
          <p className="text-xs font-semibold text-[#8B5CF6] mt-0.5">
            {task.episodeTitle}
          </p>
        )}

        {/* Progress Bar Track */}
        <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-[#1C1C1E]">
          <div
            style={{ width: `${percent}%` }}
            className={`h-full transition-all duration-300 ${
              task.status === 'downloading'
                ? 'bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6]'
                : task.status === 'paused'
                ? 'bg-amber-500'
                : 'bg-gray-600'
            }`}
          />
        </div>

        {/* Progress Bytes & Status */}
        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          <span className="font-medium text-[#A1A1AA]">
            {downloadedMb}MB / {totalMb}MB
          </span>
          <span
            className={`font-semibold capitalize ${
              task.status === 'downloading'
                ? 'text-[#10B981]'
                : task.status === 'paused'
                ? 'text-amber-400'
                : 'text-[#A1A1AA]'
            }`}
          >
            {task.status === 'downloading' ? `${task.downloadSpeedMb} MB/s` : task.status}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onPauseResume(task.taskId)}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition cursor-pointer active:scale-90 ${
            task.status === 'downloading'
              ? 'bg-[#1C1C1E] text-white hover:bg-[#27272A]'
              : task.status === 'paused'
              ? 'bg-[#10B981] text-white hover:bg-emerald-600 shadow-md shadow-emerald-600/20'
              : 'bg-[#1C1C1E] text-[#A1A1AA]'
          }`}
          title={task.status === 'downloading' ? 'Pause' : 'Resume'}
        >
          {task.status === 'downloading' ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : task.status === 'paused' ? (
            <ArrowDown className="h-4 w-4 stroke-[3]" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
        </button>

        <button
          onClick={() => onCancel(task.taskId)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#6B7280] hover:bg-red-500/20 hover:text-red-400 transition cursor-pointer"
          title="Cancel download"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
