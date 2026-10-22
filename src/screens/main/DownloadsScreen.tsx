import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Download,
  Share2,
  X,
  RefreshCw,
  Check,
  Sparkles,
  HardDrive,
  Upload,
  FolderOpen,
  FileDown,
  Send,
  Film,
  Loader2,
} from 'lucide-react';
import { downloadManager, DownloadTask, DownloadedFile } from '../../services/DownloadManager';
import { ClientHlsDownloader } from '../../services/clientHlsDownloader';
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
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTab, setTransferTab] = useState<'send' | 'receive'>('send');
  const [selectedSendFileId, setSelectedSendFileId] = useState<string | null>(null);
  const [transferStatus, setTransferStatus] = useState<{
    active: boolean;
    mode: 'send' | 'receive' | 'local';
    progress: number;
    message: string;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSeed, setRefreshSeed] = useState<number>(() => {
    try {
      const saved = parseInt(sessionStorage.getItem('maxplay_dl_rec_seed') || '1', 10);
      return isNaN(saved) || saved < 1 ? 1 : saved;
    } catch {
      return 1;
    }
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<{
    totalGb: number;
    freeGb: number;
    usedByAppMb: number;
  } | null>(null);

  const receiveInputRef = useRef<HTMLInputElement | null>(null);
  const localVideoInputRef = useRef<HTMLInputElement | null>(null);

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
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    const unsubscribe = downloadManager.subscribe((updatedTasks) => {
      setTasks(updatedTasks);
      setCompletedFiles(downloadManager.getCompletedFiles());
      refreshStorageStats();
    });

    setTasks(downloadManager.getTasks());
    setCompletedFiles(downloadManager.getCompletedFiles());
    refreshStorageStats();

    return () => unsubscribe();
  }, []);

  const [offlinePlayingFile, setOfflinePlayingFile] = useState<DownloadedFile | null>(null);
  const [offlineBlobUrl, setOfflineBlobUrl] = useState<string | null>(null);
  const [offlinePlayingEpisodes, setOfflinePlayingEpisodes] = useState<DownloadedFile[]>([]);

  // Register hardware Back button handler for DownloadsScreen sub-views
  useEffect(() => {
    (window as any).__handleDownloadsScreenBack = () => {
      if (offlinePlayingFile) {
        setOfflinePlayingFile(null);
        setOfflineBlobUrl(null);
        setOfflinePlayingEpisodes([]);
        return true;
      }
      if (showTransferModal) {
        setShowTransferModal(false);
        return true;
      }
      return false;
    };
    return () => {
      delete (window as any).__handleDownloadsScreenBack;
    };
  }, [offlinePlayingFile, showTransferModal]);

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

  const handlePlayItem = async (file: DownloadedFile, episodesList?: DownloadedFile[]) => {
    const eps =
      episodesList && episodesList.length > 0
        ? episodesList
        : groupedCompleted.seriesList.find((s) => s.contentId === file.contentId)?.episodes || [file];

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

  // Real Recommendations from catalog — strictly excluding sample/mock placeholder items and persisting across tab switches
  const recommendedContent = useMemo(() => {
    if (!contentList || contentList.length === 0) return [];
    const mockIds = new Set([
      'one-piece-egghead',
      'naruto-shippuden-classic',
      'avatar-way-of-water',
      'dune-part-two',
      'stranger-things-s5',
      'breaking-bad-remastered',
      'solo-leveling-arise',
    ]);
    const realItems = contentList.filter(
      (c) =>
        !mockIds.has(c.id) &&
        !(c.posterUrl && c.posterUrl.includes('images.unsplash.com'))
    );
    const pool = realItems.length > 0 ? [...realItems] : [...contentList];

    // Deterministic Fisher-Yates shuffle based on persisted refreshSeed (always >= 1)
    let seed = Math.max(1, refreshSeed) * 9301 + 49297;
    for (let i = pool.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = Math.floor((seed / 233280) * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 12);
  }, [contentList, refreshSeed]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setRefreshSeed((prev) => {
        const next = prev + 1;
        try {
          sessionStorage.setItem('maxplay_dl_rec_seed', String(next));
        } catch {}
        return next;
      });
      setIsRefreshing(false);
      triggerToast('Refreshed recommendations with new content!');
    }, 450);
  };

  // Export & Send a downloaded item as a protected .maxplay container (only visible in MaxPlay Downloads tab)
  const handleSendMaxPlayFile = async (file: DownloadedFile) => {
    try {
      setTransferStatus({
        active: true,
        mode: 'send',
        progress: 10,
        message: `Packaging "${file.title}" into encrypted .maxplay container...`,
      });

      const metadataPayload = {
        id: file.id,
        storageKey: file.storageKey,
        contentId: file.contentId,
        title: file.title,
        subtitle: file.subtitle,
        posterUrl: file.posterUrl,
        quality: file.quality,
        language: file.language || 'Default',
        fileSizeMb: file.fileSizeMb || 50,
        episodeId: file.episodeId,
        seasonIndex: file.seasonIndex,
        episodeIndex: file.episodeIndex,
      };

      const cleanTitle = String(file.title || 'MaxPlay_Video')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 45);
      const epSuffix =
        file.episodeIndex !== undefined ? `_Ep${Number(file.episodeIndex) + 1}` : '';
      const nativeFileName = `${cleanTitle}${epSuffix}.maxplay`;

      // Priority 1: In Native Android APK, package directly on disk & launch native Android Share Sheet (Quick Share / Bluetooth / WhatsApp)
      if (
        NativeBridgeService.isRunningInKotlinApp() &&
        NativeBridgeService.hasOfflineItemNative(file.storageKey)
      ) {
        setTransferStatus({
          active: true,
          mode: 'send',
          progress: 65,
          message: `Packing native segments for "${file.title}"...`,
        });
        const nativeRes = NativeBridgeService.exportAndShareMaxPlayNative(
          file.storageKey,
          nativeFileName,
          metadataPayload
        );
        if (nativeRes && nativeRes.ok) {
          setTransferStatus(null);
          setShowTransferModal(false);
          triggerToast(`Sharing "${nativeFileName}" via Android Share!`);
          return;
        }
      }

      // Priority 2: Universal Container Export (Native Vault fetch or IndexedDB chunks)
      const exported = await ClientHlsDownloader.exportToMaxPlayContainer(
        file.storageKey,
        metadataPayload,
        (pct, statusText) => {
          setTransferStatus({
            active: true,
            mode: 'send',
            progress: pct,
            message: statusText || `Packaging .maxplay transfer file (${pct}%)...`,
          });
        }
      );

      if (!exported) {
        setTransferStatus(null);
        triggerToast('Could not package offline segments for this item.');
        return;
      }

      setTransferStatus({
        active: true,
        mode: 'send',
        progress: 100,
        message: `Ready! Sending ${exported.fileName}...`,
      });

      const shareFile = new File([exported.blob], exported.fileName, {
        type: 'application/octet-stream',
      });

      if (
        typeof navigator !== 'undefined' &&
        (navigator as any).canShare &&
        (navigator as any).canShare({ files: [shareFile] })
      ) {
        try {
          await (navigator as any).share({
            title: `${file.title} (MaxPlay Offline File)`,
            text: 'Import this .maxplay file inside MaxPlay > Downloads > Transfer > Receive Files.',
            files: [shareFile],
          });
          setTransferStatus(null);
          setShowTransferModal(false);
          triggerToast('Transfer completed!');
          return;
        } catch {}
      }

      // Fallback: Trigger direct download of the .maxplay container file
      const url = URL.createObjectURL(exported.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exported.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      setTransferStatus(null);
      setShowTransferModal(false);
      triggerToast(`Saved "${exported.fileName}"! Share it via Quick Share/Bluetooth to another phone.`);
    } catch (err) {
      console.error('Send transfer failed:', err);
      setTransferStatus(null);
      triggerToast('Failed to export .maxplay file.');
    }
  };

  // Receive & Import a .maxplay file into the 'received' category
  const handleReceiveFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      setTransferStatus({
        active: true,
        mode: 'receive',
        progress: 5,
        message: `Verifying MaxPlay container "${file.name}"...`,
      });

      const imported = await ClientHlsDownloader.importFromMaxPlayContainer(
        file,
        (pct, statusText) => {
          setTransferStatus({
            active: true,
            mode: 'receive',
            progress: pct,
            message: statusText || `Unpacking offline segments into MaxPlay Vault (${pct}%)...`,
          });
        }
      );

      if (!imported) {
        setTransferStatus(null);
        triggerToast('Invalid file! Only .maxplay files exported from MaxPlay can be received.');
        return;
      }

      const fileSizeMb =
        imported.metadata.fileSizeMb ||
        imported.metadata.sizeMb ||
        Math.max(1, Math.round((imported.totalBytes / (1024 * 1024)) * 10) / 10);

      downloadManager.addImportedCompletedFile({
        contentId: imported.metadata.contentId,
        episodeId: imported.metadata.episodeId,
        seasonIndex: imported.metadata.seasonIndex,
        episodeIndex: imported.metadata.episodeIndex,
        title: imported.metadata.title || file.name.replace(/\.maxplay$/i, ''),
        subtitle: imported.metadata.subtitle,
        posterUrl: imported.metadata.posterUrl,
        quality: imported.metadata.quality || '720p',
        language: imported.metadata.language || imported.metadata.audioLang || 'Default',
        fileSizeMb,
        category: 'received',
        storageKey: imported.storageKey,
      });

      setTransferStatus(null);
      setShowTransferModal(false);
      setActiveFilter('received');
      triggerToast(`Received "${imported.metadata.title}" into Received tab!`);
    } catch (err) {
      console.error('Receive transfer failed:', err);
      setTransferStatus(null);
      triggerToast('Failed to receive .maxplay file.');
    }
  };

  // Import a local video file (.mp4 / .mkv / .webm) into the 'local' category
  const handleLocalVideoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      setTransferStatus({
        active: true,
        mode: 'local',
        progress: 10,
        message: `Importing local video "${file.name}"...`,
      });

      const imported = await ClientHlsDownloader.importLocalVideoFile(file, (pct, statusText) => {
        setTransferStatus({
          active: true,
          mode: 'local',
          progress: pct,
          message: statusText || `Saving local video to MaxPlay Offline Player (${pct}%)...`,
        });
      });

      if (!imported) {
        setTransferStatus(null);
        triggerToast('Could not import local video file.');
        return;
      }

      downloadManager.addImportedCompletedFile({
        title: imported.title,
        quality: imported.quality,
        language: imported.language,
        fileSizeMb: imported.fileSizeMb,
        category: 'local',
        storageKey: imported.storageKey,
      });

      setTransferStatus(null);
      setActiveFilter('local');
      triggerToast(`Imported "${imported.title}" to Local files!`);
    } catch (err) {
      console.error('Local import failed:', err);
      setTransferStatus(null);
      triggerToast('Failed to import local video.');
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden bg-[#0A0A0A] p-4 pb-24 md:pb-8 text-left select-none scrollbar-none">
      {/* Hidden File Inputs for Receive (.maxplay) and Local Video Import */}
      <input
        ref={receiveInputRef}
        type="file"
        accept=".maxplay,application/octet-stream"
        className="hidden"
        onChange={handleReceiveFileSelected}
      />
      <input
        ref={localVideoInputRef}
        type="file"
        accept="video/*,.mp4,.mkv,.webm,.mov"
        className="hidden"
        onChange={handleLocalVideoSelected}
      />

      {/* HEADER */}
      <div className="flex items-center justify-between py-2">
        <h1 className="text-2xl font-black text-white tracking-tight">Downloads</h1>

        <div className="flex items-center gap-2">
          {/* Import Local Video Quick Button */}
          <button
            type="button"
            onClick={() => localVideoInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl bg-[#141418] px-3 py-2 text-xs font-bold text-purple-300 border border-purple-500/30 hover:bg-purple-500/10 transition cursor-pointer active:scale-95"
            title="Import video from phone storage"
          >
            <FolderOpen className="h-3.5 w-3.5 text-purple-400" />
            <span className="hidden xs:inline">Import Local</span>
          </button>

          {/* Transfer button (top-right) */}
          <button
            type="button"
            onClick={() => {
              setSelectedSendFileId(completedFiles[0]?.id || null);
              setShowTransferModal(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-[#121212] px-3 py-2 text-xs font-bold text-[#10B981] border border-[#10B981]/30 hover:bg-[#10B981]/10 transition cursor-pointer active:scale-95"
          >
            <Share2 className="h-4 w-4" />
            <span>Transfer</span>
          </button>
        </div>
      </div>

      {/* LIVE TRANSFER / IMPORT PROGRESS INDICATOR BAR */}
      {transferStatus && transferStatus.active && (
        <div className="mt-3 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-[#121820] to-[#121216] p-3.5 border border-emerald-500/40 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Loader2 className="h-4 w-4 text-emerald-400 animate-spin shrink-0" />
              <span className="text-xs font-bold text-white truncate">{transferStatus.message}</span>
            </div>
            <span className="text-xs font-black text-emerald-400 shrink-0">{transferStatus.progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-black/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-200 rounded-full"
              style={{ width: `${Math.min(100, Math.max(5, transferStatus.progress))}%` }}
            />
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK BANNER */}
      {toastMsg && (
        <div className="mt-3 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#18181B] border border-emerald-500/40 px-4 py-1.5 text-xs font-bold text-emerald-300 shadow-lg">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      {/* SECTION 2: DOWNLOADING QUEUE */}
      {activeDownloadingTasks.length > 0 && (
        <div className="mt-5 flex flex-col gap-3">
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
      <div className="mt-5 flex flex-col gap-3">
        {/* Filter Tabs + Aligned Available Storage Pill */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-0.5 max-w-full">
            <button
              type="button"
              onClick={() => setActiveFilter('moviebox')}
              className={`shrink-0 rounded-xl px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                activeFilter === 'moviebox'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#121212] text-[#A1A1AA] border border-[#1C1C1E]'
              }`}
            >
              MovieBox ({completedFiles.filter((f) => f.category === 'moviebox' || !f.category).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('local')}
              className={`shrink-0 rounded-xl px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                activeFilter === 'local'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#121212] text-[#A1A1AA] border border-[#1C1C1E]'
              }`}
            >
              Local files ({completedFiles.filter((f) => f.category === 'local').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('received')}
              className={`shrink-0 rounded-xl px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                activeFilter === 'received'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#121212] text-[#A1A1AA] border border-[#1C1C1E]'
              }`}
            >
              Received ({completedFiles.filter((f) => f.category === 'received').length})
            </button>
          </div>

          {/* Properly Aligned Storage Indicator Badge */}
          <div className="flex items-center gap-1.5 rounded-xl bg-[#121216] border border-white/10 px-2.5 py-1 text-[11px] font-bold text-[#A1A1AA] shrink-0 ml-auto">
            <HardDrive className="h-3.5 w-3.5 text-[#06B6D4] shrink-0" />
            <span>
              {storageInfo ? `${storageInfo.freeGb} GB Free` : '3.5 GB Free'}
            </span>
          </div>
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
          <div className="flex flex-col items-center justify-center rounded-2xl bg-[#121212] py-10 px-4 border border-[#1C1C1E] text-center">
            {activeFilter === 'local' ? (
              <>
                <Film className="h-10 w-10 text-purple-400/70" />
                <span className="mt-2 text-sm font-bold text-white">No local video files imported yet</span>
                <span className="mt-0.5 text-xs text-[#6B7280] max-w-xs">
                  Import MP4, MKV, or WebM videos from your phone storage to play them smoothly in MaxPlay.
                </span>
                <button
                  type="button"
                  onClick={() => localVideoInputRef.current?.click()}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-purple-600/30 active:scale-95 transition cursor-pointer"
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>Select Video from Phone</span>
                </button>
              </>
            ) : activeFilter === 'received' ? (
              <>
                <FileDown className="h-10 w-10 text-emerald-400/70" />
                <span className="mt-2 text-sm font-bold text-white">No received MaxPlay files yet</span>
                <span className="mt-0.5 text-xs text-[#6B7280] max-w-xs">
                  Files shared from another phone using MaxPlay Transfer (.maxplay format) appear exclusively here.
                </span>
                <button
                  type="button"
                  onClick={() => receiveInputRef.current?.click()}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-[#10B981] px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
                >
                  <Upload className="h-4 w-4" />
                  <span>Receive .maxplay File</span>
                </button>
              </>
            ) : (
              <>
                <Download className="h-10 w-10 text-[#3F3F46]" />
                <span className="mt-2 text-sm font-bold text-[#A1A1AA]">No downloads yet</span>
                <span className="mt-0.5 text-xs text-[#6B7280]">
                  Save movies and shows for offline viewing
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4: FOR YOU (REAL CATALOG RECOMMENDATIONS) */}
      <div className="mt-8 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-[#8B5CF6]" />
            <h3 className="text-sm font-bold text-white">Recommended For You</h3>
          </div>
          <span className="text-[11px] text-[#71717A]">Tap any title to watch or download</span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {recommendedContent.map((item, index) => (
            <div
              key={`${item.id}-${refreshSeed}-${index}`}
              onClick={() => onPlayContent?.(item.id)}
              className="w-[120px] flex-shrink-0 cursor-pointer"
            >
              <ContentCard
                item={item}
                onPress={() => onPlayContent?.(item.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5: REFRESH BUTTON */}
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-2xl bg-[#121212] px-6 py-3 text-xs font-bold text-white border border-[#1C1C1E] hover:bg-[#1C1C1E] active:scale-95 transition cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 text-[#06B6D4] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh new content'}</span>
        </button>
      </div>

      {/* DEVICE-TO-DEVICE MAXPLAY TRANSFER MODAL (.maxplay Container Engine) */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="flex w-full max-w-md flex-col rounded-3xl bg-[#121216] p-5 sm:p-6 border border-white/10 text-left shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#10B981]/20 text-[#10B981]">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">MaxPlay Transfer</h3>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Share offline downloads (.maxplay) — plays only in MaxPlay
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="p-1.5 rounded-full bg-white/5 text-[#A1A1AA] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs: Send vs Receive */}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#0A0A0C] p-1 border border-white/5">
              <button
                type="button"
                onClick={() => setTransferTab('send')}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition cursor-pointer ${
                  transferTab === 'send'
                    ? 'bg-[#10B981] text-black shadow-md'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send Files</span>
              </button>
              <button
                type="button"
                onClick={() => setTransferTab('receive')}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition cursor-pointer ${
                  transferTab === 'receive'
                    ? 'bg-[#06B6D4] text-black shadow-md'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>Receive Files</span>
              </button>
            </div>

            {/* Live Status inside Modal if active */}
            {transferStatus && transferStatus.active && (
              <div className="mt-4 rounded-xl bg-black/50 p-3 border border-emerald-500/30">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300 mb-1.5">
                  <span className="truncate">{transferStatus.message}</span>
                  <span>{transferStatus.progress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-200"
                    style={{ width: `${transferStatus.progress}%` }}
                  />
                </div>
              </div>
            )}

            {transferTab === 'send' ? (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-xs text-[#A1A1AA]">
                  Select a downloaded movie or episode below to package and send as an encrypted <span className="text-emerald-400 font-bold">.maxplay</span> file:
                </p>

                {completedFiles.length > 0 ? (
                  <div className="max-h-56 overflow-y-auto flex flex-col gap-2 pr-1 scrollbar-none">
                    {completedFiles.map((file) => {
                      const isSelected = selectedSendFileId === file.id;
                      return (
                        <div
                          key={file.id}
                          onClick={() => setSelectedSendFileId(file.id)}
                          className={`flex items-center justify-between gap-3 rounded-xl p-2.5 border transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/15 border-emerald-500/50'
                              : 'bg-[#18181D] border-white/5 hover:border-white/15'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={file.posterUrl || undefined}
                              alt={file.title}
                              className="h-11 w-8 rounded-lg object-cover bg-black shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">
                                {file.title}
                                {file.episodeNumber ? ` • Ep ${file.episodeNumber}` : ''}
                              </h4>
                              <p className="text-[10px] text-[#A1A1AA]">
                                {file.quality?.toUpperCase() || 'HD'} • {file.audioLang || 'Multi'} • {file.sizeMb} MB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendMaxPlayFile(file);
                            }}
                            className="shrink-0 rounded-lg bg-[#10B981] px-3 py-1.5 text-[11px] font-extrabold text-black hover:brightness-110 active:scale-95 cursor-pointer"
                          >
                            Send
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[#18181D] p-6 text-center border border-white/5">
                    <p className="text-xs font-bold text-[#A1A1AA]">
                      No downloaded files available to send yet.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center text-center bg-[#18181D] rounded-2xl p-5 border border-white/5">
                <FileDown className="h-10 w-10 text-[#06B6D4] mb-2" />
                <h4 className="text-sm font-bold text-white">Receive a .maxplay File</h4>
                <p className="mt-1 text-xs text-[#A1A1AA] leading-relaxed">
                  Once your friend sends you a <span className="text-cyan-400 font-bold">.maxplay</span> file via Quick Share, Bluetooth, or file sharing, tap below to import it directly into your MaxPlay Received tab.
                </p>
                <button
                  type="button"
                  onClick={() => receiveInputRef.current?.click()}
                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#06B6D4] to-[#10B981] py-3 text-xs font-black text-black shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition cursor-pointer"
                >
                  Select Received .maxplay File
                </button>
              </div>
            )}
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
