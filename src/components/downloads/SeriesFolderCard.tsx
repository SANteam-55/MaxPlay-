import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Play,
  Trash2,
  Tv,
  Film,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import { DownloadedFile } from '../../services/DownloadManager';

interface SeriesFolderCardProps {
  seriesTitle: string;
  posterUrl: string;
  episodes: DownloadedFile[];
  onPlayEpisode: (item: DownloadedFile) => void;
  onDeleteEpisode: (id: string) => void;
  onDeleteSeries?: (files: DownloadedFile[]) => void;
}

export const SeriesFolderCard: React.FC<SeriesFolderCardProps> = ({
  seriesTitle,
  posterUrl,
  episodes,
  onPlayEpisode,
  onDeleteEpisode,
  onDeleteSeries,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Sort episodes logically by episodeIndex or episode number
  const sortedEpisodes = [...episodes].sort((a, b) => {
    const numA = a.episodeIndex !== undefined ? a.episodeIndex : (parseInt(a.episodeId?.replace(/\D/g, '') || '0', 10) || 0);
    const numB = b.episodeIndex !== undefined ? b.episodeIndex : (parseInt(b.episodeId?.replace(/\D/g, '') || '0', 10) || 0);
    return numA - numB;
  });

  const totalMb = episodes.reduce((acc, ep) => acc + (ep.fileSizeMb || 0), 0);
  const formattedTotalSize = totalMb >= 1000 ? `${(totalMb / 1024).toFixed(1)} GB` : `${Math.round(totalMb)} MB`;

  const handlePlayFirstOrLatest = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sortedEpisodes.length > 0) {
      onPlayEpisode(sortedEpisodes[0]);
    }
  };

  const handleDeleteAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete all ${episodes.length} episodes of "${seriesTitle}" from device storage?`)) {
      if (onDeleteSeries) {
        onDeleteSeries(episodes);
      } else {
        episodes.forEach((ep) => onDeleteEpisode(ep.id));
      }
    }
  };

  return (
    <div className="flex flex-col rounded-2xl bg-[#121216] border border-[#27272A] overflow-hidden transition shadow-lg hover:border-[#3F3F46]">
      {/* MAIN FOLDER HEADER CARD */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-white/[0.02] transition"
      >
        {/* Poster with stacked folder appearance */}
        <div className="relative h-[92px] w-[62px] flex-shrink-0 rounded-xl overflow-hidden bg-[#181820] border border-white/10 shadow-md group">
          <img
            src={posterUrl}
            alt={seriesTitle}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Episode count badge on thumbnail */}
          <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center bg-purple-600/90 backdrop-blur-xs rounded py-0.5 text-[9px] font-black text-white">
            {episodes.length} Eps
          </div>
        </div>

        {/* Series Info */}
        <div className="flex flex-1 flex-col justify-center min-w-0 pr-1 text-left">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-[10px] font-extrabold text-purple-300 uppercase tracking-wider">
              {isExpanded ? <FolderOpen className="h-3 w-3 text-purple-400" /> : <Folder className="h-3 w-3 text-purple-400" />}
              <span>Series Folder</span>
            </span>
          </div>

          <h4 className="text-sm sm:text-base font-extrabold text-white truncate max-w-[220px] sm:max-w-xs">
            {seriesTitle}
          </h4>

          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#A1A1AA]">
            <span className="flex items-center gap-1 font-semibold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{episodes.length} {episodes.length === 1 ? 'Episode' : 'Episodes'}</span>
            </span>
            <span className="text-white/20">•</span>
            <span className="flex items-center gap-1 font-semibold text-sky-400">
              <HardDrive className="h-3.5 w-3.5" />
              <span>{formattedTotalSize}</span>
            </span>
          </div>
        </div>

        {/* Action buttons (Play latest & Expand Toggle) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handlePlayFirstOrLatest}
            className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:scale-105 active:scale-95 transition cursor-pointer"
            title="Play first episode"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span className="hidden sm:inline">Play</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteAll}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#71717A] hover:bg-red-500/20 hover:text-red-400 transition cursor-pointer"
            title="Delete whole series"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <div className="p-1 rounded-lg text-[#A1A1AA] hover:text-white transition">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* EXPANDED EPISODES LIST */}
      {isExpanded && (
        <div className="flex flex-col border-t border-[#27272A] bg-[#0E0E12] divide-y divide-[#1C1C22] animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-4 py-2 bg-[#16161C] text-[11px] font-bold text-[#A1A1AA]">
            <span>Downloaded Episodes ({sortedEpisodes.length})</span>
            <span className="text-white/40">Sequence Order</span>
          </div>

          {sortedEpisodes.map((ep, idx) => {
            const epNum = ep.episodeIndex !== undefined ? ep.episodeIndex + 1 : (idx + 1);
            const sizeLabel = ep.fileSizeMb >= 1000 ? `${(ep.fileSizeMb / 1024).toFixed(1)} GB` : `${Math.round(ep.fileSizeMb)} MB`;

            return (
              <div
                key={ep.id}
                onClick={() => onPlayEpisode(ep)}
                className="flex items-center justify-between p-3 px-4 hover:bg-white/[0.06] transition group text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {/* Episode Number Badge */}
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1C1C24] border border-white/10 font-mono text-xs font-black text-purple-400 group-hover:border-purple-500/40 group-hover:bg-purple-500/20 transition">
                    E{epNum}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md group-hover:text-purple-300 transition">
                      {ep.subtitle?.split('•')[0]?.trim() || `Episode ${epNum}`}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#A1A1AA]">
                      {ep.quality && (
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                          {ep.quality}
                        </span>
                      )}
                      {ep.language && (
                        <span className="text-sky-400 font-bold bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                          {ep.language}
                        </span>
                      )}
                      <span className="font-medium text-white/50">{sizeLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Episode Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayEpisode(ep);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90 active:scale-95 transition cursor-pointer"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Watch</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteEpisode(ep.id);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[#71717A] hover:bg-red-500/20 hover:text-red-400 transition cursor-pointer"
                    title={`Delete Episode ${epNum}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
