import React, { useState, useEffect, useMemo } from 'react';
import { Download, Share2, X, RefreshCw, Smartphone, Check, Sparkles, HardDrive } from 'lucide-react';
import { downloadManager, DownloadTask, DownloadedFile } from '../../services/DownloadManager';
import { DownloadItem } from '../../components/downloads/DownloadItem';
import { DownloadedItem } from '../../components/downloads/DownloadedItem';
import { SeriesFolderCard } from '../../components/downloads/SeriesFolderCard';
import { OfflineDetailScreen } from '../content/OfflineDetailScreen';
import { ContentCard } from '../../components/common/ContentCard';
import { NativeBanner } from '../../components/ads/NativeBanner';
import { NativeBridgeService } from '../../services/nativeBridgeService';

import { useContent } from '../../hooks/useContent';

interface DownloadsScreenProps {
  onPlayContent?: (contentId: string) => void;
}

export const DownloadsScreen: React.FC<DownloadsScreenProps> = ({ onPlayContent }) => {
  const { contentList } = useContent();
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [completedFiles, setCompletedFiles] = useState<DownloadedFile[]>([]);
  const [activeFilter, setActiveFilter] = useState<'moviebox' | 'local' | 'received'>('moviebox');
  const [showAdBanner, setShowAdBanner] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<{
    totalGb: number;
    freeGb: number;
    usedByAppMb: number;
  } | null>(null);

  const refreshStorageStats = () => {
    const nativeStats = NativeBridgeService.getDeviceStorageStats();
    if (nativeStats && nativeStats.ok) {
      setStorageInfo({
        totalGb: nativeStats.totalGb || 64,
        freeGb: nativeStats.freeGb || 12,
        usedByAppMb: nativeStats.usedByAppMb || 0,
      });
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      navigator.storage
        .estimate()
        .then((est) => {
          if (est && typeof est.quota === 'number' && typeof est.usage === 'number') {
            const totalGb = Math.max(1, Math.round((est.quota / (1024 * 1024 * 1024)) * 10) / 10);
            const usedByAppMb = Math.round((est.usage / (1024 * 1024)) * 10) / 10;
            const freeGb = Math.max(
              0,
              Math.round(((est.quota - est.usage) / (1024 * 1024 * 1024)) * 10) / 10
            );
            setStorageInfo({ totalGb, freeGb, usedByAppMb });
          }
        })
        .catch(() => {});
    }
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    const unsubscribe = downloadManager.subscribe((updatedTasks) => {
      setTasks(updatedTasks);
      setCompletedFiles(downloadManager.getCompletedFiles());
      refreshStorageStats();
    });

    // Initial set from manager state (assuming it manages its own persistence or empty state)
    setTasks(downloadManager.getTasks());
    setCompletedFiles(downloadManager.getCompletedFiles());
    refreshStorageStats();

    return () => unsubscribe();
  }, []);

  const activeDownloadingTasks = tasks.filter(
    (t) => t.status === 'downloading' || t.status === 'paused' || t.status === 'queued' || t.status === 'failed'
  );

  const filteredCompletedFiles = completedFiles.filter((f) => {
    if (activeFilter === 'local') return f.category === 'local';
    if (activeFilter === 'received') return f.category === 'received';
    return f.category === 'moviebox' || !f.category;
  });

  // Group completed downloads into Series Folders vs Standalone Movies
  const groupedCompleted = useMemo(() => {
    const seriesMap = new Map<string, DownloadedFile[]>();
    const standaloneMovies: DownloadedFile[] = [];

    filteredCompletedFiles.forEach((file) => {
      // If file has an episodeId or episodeIndex, it belongs to a series/anime
      if (file.episodeId || file.episodeIndex !== undefined) {
        const key = file.contentId || file.title;
        if (!seriesMap.has(key)) {
          seriesMap.set(key, []);
        }
        seriesMap.get(key)!.push(file);
      } else {
        standaloneMovies.push(file);
      }
    });

    const seriesList = Array.from(seriesMap.entries()).map(([contentId, episodes]) => ({
      contentId,
      seriesTitle: episodes[0]?.title || 'Series',
      posterUrl: episodes[0]?.posterUrl || '',
      episodes,
    }));

    return {
      seriesList,
      standaloneMovies,
      totalCount: seriesList.length + standaloneMovies.length,
    };
  }, [filteredCompletedFiles]);

  const [offlinePlayingFile, setOfflinePlayingFile] = useState<DownloadedFile | null>(null);
  const [offlineBlobUrl, setOfflineBlobUrl] = useState<string | null>(null);
  const [offlinePlayingEpisodes, setOfflinePlayingEpisodes] = useState<DownloadedFile[]>([]);

  const handlePlayItem = async (file: DownloadedFile, episodesList?: DownloadedFile[]) => {
    const eps = episodesList && episodesList.length > 0
      ? episodesList
      : groupedCompleted.seriesList.find((s) => s.contentId === file.contentId)?.episodes || [file];

    // Immediately open OfflineDetailScreen
    setOfflinePlayingFile(file);
    setOfflinePlayingEpisodes(eps);

    try {
      const blobUrl = await downloadManager.getOfflineVideoUrl(file.id, file.episodeId, file.episodeIndex);
      if (blobUrl) {
        setOfflineBlobUrl(blobUrl);
      }
    } catch (e) {
      console.warn('Could not load offline blob eagerly:', e);
    }
  };

  const handlePauseResume = (taskId: string) => {
    downloadManager.togglePauseResume(taskId);
  };

  const handleCancel = (taskId: string) => {
    downloadManager.cancelTask(taskId);
  };

  const handleDeleteCompleted = (id: string) => {
    downloadManager.removeCompletedFile(id);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const recommendedContent = contentList.filter(c => c.trending).slice(0, 10);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#0A0A0A] p-4 pb-24 md:pb-8 text-left select-none scrollbar-none">
      {/* HEADER */}
      <div className="flex items-center justify-between py-2">
        <h1 className="text-2xl font-black text-white tracking-tight">Downloads</h1>

        {/* Transfer button (top-right) */}
        <button
          onClick={() => setShowTransferModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[#121212] px-3 py-2 text-xs font-bold text-[#10B981] border border-[#10B981]/30 hover:bg-[#10B981]/10 transition cursor-pointer"
        >
          <Share2 className="h-4 w-4" />
          <span>Transfer</span>
        </button>
      </div>

      {/* SECTION 2: DOWNLOADING QUEUE */}
      {activeDownloadingTasks.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              Downloading ({activeDownloadingTasks.length})
            </h3>
            <button
              onClick={() => {
                activeDownloadingTasks.forEach((t) => handlePauseResume(t.taskId));
              }}
              className="text-xs font-semibold text-[#06B6D4] hover:underline cursor-pointer"
            >
              Manage
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {activeDownloadingTasks.map((task) => (
              <DownloadItem
                key={task.taskId}
                task={task}
                onPauseResume={handlePauseResume}
                onCancel={handleCancel}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <NativeBanner />
      </div>

      {/* SECTION 3: DOWNLOADED (COMPLETED) */}
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFilter('moviebox')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeFilter === 'moviebox'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#121212] text-[#A1A1AA] border border-[#1C1C1E]'
              }`}
            >
              MovieBox ({completedFiles.filter((f) => f.category === 'moviebox' || !f.category).length})
            </button>
            <button
              onClick={() => setActiveFilter('local')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeFilter === 'local'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#121212] text-[#A1A1AA] border border-[#1C1C1E]'
              }`}
            >
              Local files ({completedFiles.filter((f) => f.category === 'local').length})
            </button>
            <button
              onClick={() => setActiveFilter('received')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeFilter === 'received'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#121212] text-[#A1A1AA] border border-[#1C1C1E]'
              }`}
            >
              Received ({completedFiles.filter((f) => f.category === 'received').length})
            </button>
          </div>

          <span className="text-[11px] font-semibold text-[#6B7280]">
            {storageInfo ? `${storageInfo.freeGb}GB available` : '3.5GB available'}
          </span>
        </div>

        {/* Downloaded List */}
        {groupedCompleted.totalCount > 0 ? (
          <div className="flex flex-col gap-3">
            {/* Render Series / Anime Folders */}
            {groupedCompleted.seriesList.map((series) => (
              <SeriesFolderCard
                key={series.contentId}
                seriesTitle={series.seriesTitle}
                posterUrl={series.posterUrl}
                episodes={series.episodes}
                onPlayEpisode={(ep) => handlePlayItem(ep, series.episodes)}
                onDeleteEpisode={handleDeleteCompleted}
                onDeleteSeries={(episodes) => {
                  episodes.forEach((ep) => handleDeleteCompleted(ep.id));
                }}
              />
            ))}

            {/* Render Standalone Movies */}
            {groupedCompleted.standaloneMovies.map((file) => (
              <DownloadedItem
                key={file.id}
                item={file}
                onPlay={(item) => handlePlayItem(item)}
                onDelete={handleDeleteCompleted}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-[#121212] py-10 border border-[#1C1C1E] text-center">
            <Download className="h-10 w-10 text-[#3F3F46]" />
            <span className="mt-2 text-sm font-bold text-[#A1A1AA]">No downloads yet</span>
            <span className="mt-0.5 text-xs text-[#6B7280]">
              Save movies and shows for offline viewing
            </span>
          </div>
        )}
      </div>

      {/* SECTION 4: FOR YOU (RECOMMENDATIONS) */}
      <div className="mt-8 flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-[#8B5CF6]" />
          <h3 className="text-sm font-bold text-white">For You</h3>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {recommendedContent.map((item, index) => (
            <div key={`${item.id}-${index}`} className="w-[120px] flex-shrink-0">
              <ContentCard
                item={item}
                onClick={() => onPlayContent && onPlayContent(item.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5: REFRESH BUTTON */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-2xl bg-[#121212] px-6 py-3 text-xs font-bold text-white border border-[#1C1C1E] hover:bg-[#1C1C1E] transition cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 text-[#06B6D4] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh new content</span>
        </button>
      </div>

      {/* DEVICE-TO-DEVICE TRANSFER MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="flex w-full max-w-sm flex-col rounded-3xl bg-[#121212] p-6 border border-[#1C1C1E] text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#10B981]/20 text-[#10B981]">
              <Share2 className="h-7 w-7" />
            </div>
            <h3 className="mt-3 text-lg font-bold text-white">Device Transfer</h3>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              Send or receive downloaded movies with nearby MaxPlay users without internet data.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  triggerToast('Scanning for nearby devices...');
                  setShowTransferModal(false);
                }}
                className="rounded-2xl bg-[#10B981] py-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95 transition cursor-pointer"
              >
                Send Files
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerToast('Receiver mode enabled. Waiting for incoming connection...');
                  setShowTransferModal(false);
                }}
                className="rounded-2xl bg-[#1C1C1E] py-3 text-xs font-extrabold text-white border border-white/20 hover:bg-white/10 active:scale-95 transition cursor-pointer"
              >
                Receive Files
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowTransferModal(false)}
              className="mt-4 text-xs font-semibold text-[#6B7280] hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Offline MaxPlay Detail Screen with Top Player & Episode Grid */}
      {offlinePlayingFile && (
        <OfflineDetailScreen
          initialFile={offlinePlayingFile}
          initialBlobUrl={offlineBlobUrl || undefined}
          allDownloadedEpisodes={offlinePlayingEpisodes}
          onBack={() => {
            setOfflinePlayingFile(null);
            setOfflineBlobUrl(null);
            setOfflinePlayingEpisodes([]);
          }}
        />
      )}
    </div>
  );
};
