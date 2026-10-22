import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Smartphone,
  Wifi,
  Play,
  Copy,
} from 'lucide-react';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { downloadManager, DownloadTask, DownloadedFile } from '../../services/DownloadManager';
import { ClientHlsDownloader } from '../../services/clientHlsDownloader';
import { SmartStreamService } from '../../services/smartStreamService';
import { DownloadItem } from '../../components/downloads/DownloadItem';
import { DownloadedItem } from '../../components/downloads/DownloadedItem';
import { SeriesFolderCard } from '../../components/downloads/SeriesFolderCard';
import { OfflineDetailScreen } from '../content/OfflineDetailScreen';
import { ContentCard } from '../../components/common/ContentCard';
import { NativeBanner } from '../../components/ads/NativeBanner';
import { NativeBridgeService, DeviceLocalVideoItem } from '../../services/nativeBridgeService';
import { useContent } from '../../hooks/useContent';

interface DownloadsScreenProps {
  onPlayContent?: (contentId: string) => void;
}

interface DirectTransferSession {
  code: string;
  senderIp?: string;
  senderPort?: number;
  contentId?: string;
  episodeId?: string;
  seasonIndex?: number;
  episodeIndex?: number;
  title: string;
  subtitle?: string;
  posterUrl?: string;
  quality?: string;
  language?: string;
  fileSizeMb: number;
  storageKey: string;
  videoUrl?: string;
  secondaryVideoUrl?: string;
  status: 'waiting' | 'transferring' | 'completed';
  progress?: number;
  createdAt: number;
}

export const DownloadsScreen: React.FC<DownloadsScreenProps> = ({ onPlayContent }) => {
  const { contentList } = useContent();
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [completedFiles, setCompletedFiles] = useState<DownloadedFile[]>([]);
  const [deviceScannedVideos, setDeviceScannedVideos] = useState<DeviceLocalVideoItem[]>([]);
  const [isScanningLocalVideos, setIsScanningLocalVideos] = useState(false);

  const [activeFilter, setActiveFilter] = useState<'moviebox' | 'local' | 'received'>('moviebox');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTab, setTransferTab] = useState<'send' | 'receive'>('send');
  const [selectedSendFileId, setSelectedSendFileId] = useState<string | null>(null);

  // Direct App-to-App Transfer States
  const [activeSendSession, setActiveSendSession] = useState<DirectTransferSession | null>(null);
  const [receiveCodeInput, setReceiveCodeInput] = useState('');
  const [nearbySessions, setNearbySessions] = useState<DirectTransferSession[]>([]);
  const [isSearchingSessions, setIsSearchingSessions] = useState(false);

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
  const sendSessionUnsubRef = useRef<(() => void) | null>(null);

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

  // Automatic Phone Storage Video Scanner Pipeline
  const scanPhoneLocalVideos = useCallback((askPermission = false) => {
    if (!NativeBridgeService.isRunningInKotlinApp()) return;
    setIsScanningLocalVideos(true);
    try {
      const scanned = NativeBridgeService.scanDeviceLocalVideos(askPermission);
      setDeviceScannedVideos(scanned);
    } catch {}
    setTimeout(() => setIsScanningLocalVideos(false), 250);
  }, []);

  useEffect(() => {
    const unsubscribe = downloadManager.subscribe((updatedTasks) => {
      setTasks(updatedTasks);
      setCompletedFiles(downloadManager.getCompletedFiles());
      refreshStorageStats();
    });

    setTasks(downloadManager.getTasks());
    setCompletedFiles(downloadManager.getCompletedFiles());
    refreshStorageStats();
    scanPhoneLocalVideos(false);

    const handlePermissionGranted = () => {
      scanPhoneLocalVideos(false);
    };
    window.addEventListener('MAXPLAY_LOCAL_VIDEOS_PERMISSION_GRANTED', handlePermissionGranted);

    return () => {
      unsubscribe();
      window.removeEventListener('MAXPLAY_LOCAL_VIDEOS_PERMISSION_GRANTED', handlePermissionGranted);
      if (sendSessionUnsubRef.current) {
        sendSessionUnsubRef.current();
      }
      NativeBridgeService.stopDirectTransferServerNative();
    };
  }, [scanPhoneLocalVideos]);

  // Re-scan phone local videos whenever user switches to the 'local' filter tab
  useEffect(() => {
    if (activeFilter === 'local') {
      scanPhoneLocalVideos(true);
    }
  }, [activeFilter, scanPhoneLocalVideos]);

  // Auto-discover nearby/active Direct Transfer sessions when Receive tab is open
  const fetchActiveTransferSessions = useCallback(async () => {
    setIsSearchingSessions(true);
    try {
      const snap = await getDocs(collection(db, 'downloads', 'p2p_sessions', 'tasks'));
      const now = Date.now();
      const valid: DirectTransferSession[] = [];
      snap.forEach((d) => {
        const data = d.data() as DirectTransferSession;
        if (data && data.code && data.title && now - (data.createdAt || 0) < 20 * 60 * 1000) {
          valid.push(data);
        }
      });
      valid.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setNearbySessions(valid.slice(0, 6));
    } catch {}
    setIsSearchingSessions(false);
  }, []);

  useEffect(() => {
    if (showTransferModal && transferTab === 'receive') {
      fetchActiveTransferSessions();
    }
  }, [showTransferModal, transferTab, fetchActiveTransferSessions]);

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

  // Convert scanned phone storage videos into playable DownloadedFile items for the 'Local files' pipeline
  const scannedLocalFilesAsDownloaded: DownloadedFile[] = useMemo(() => {
    const formatDuration = (sec: number) => {
      if (!sec || sec <= 0) return '';
      const mins = Math.floor(sec / 60);
      const remSec = sec % 60;
      if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        return `${hrs}h ${remMins}m`;
      }
      return `${mins}m ${remSec}s`;
    };

    return deviceScannedVideos.map((vid) => {
      const durText = formatDuration(vid.durationSec);
      return {
        id: `dev_vid_${vid.id}`,
        contentId: `dev_vid_${vid.id}`,
        title: vid.title,
        subtitle: `${vid.folderName || 'Phone Storage'}${durText ? ` • ${durText}` : ''} • ${vid.sizeMb} MB`,
        posterUrl:
          'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&auto=format&fit=crop&q=80',
        quality: vid.resolution || 'HD',
        language: vid.folderName || 'Phone Video',
        fileSizeMb: vid.sizeMb,
        status: `${vid.sizeMb} MB • ${vid.folderName || 'Phone Storage'} • ${vid.resolution || 'HD'}`,
        category: 'local',
        storageKey: `dev_vid_${vid.id}`,
        videoUrl: vid.playbackUrl,
        hasError: false,
        completedAt: (vid.dateModified || 0) * 1000,
      };
    });
  }, [deviceScannedVideos]);

  const manualLocalFiles = useMemo(
    () => completedFiles.filter((f) => f.category === 'local'),
    [completedFiles]
  );

  const totalLocalFilesCount = manualLocalFiles.length + scannedLocalFilesAsDownloaded.length;

  const filteredCompletedFiles = useMemo(() => {
    if (activeFilter === 'local') {
      return [...manualLocalFiles, ...scannedLocalFilesAsDownloaded];
    }
    if (activeFilter === 'received') {
      return completedFiles.filter((f) => f.category === 'received');
    }
    return completedFiles.filter((f) => f.category === 'moviebox' || !f.category);
  }, [activeFilter, completedFiles, manualLocalFiles, scannedLocalFilesAsDownloaded]);

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

    if (file.videoUrl && file.videoUrl.includes('/device-video/')) {
      setOfflineBlobUrl(file.videoUrl);
      return;
    }

    try {
      const blobUrl = await downloadManager.getOfflineVideoUrl(file.id, file.episodeId, file.episodeIndex);
      if (blobUrl) {
        setOfflineBlobUrl(blobUrl);
      } else if (file.videoUrl) {
        setOfflineBlobUrl(file.videoUrl);
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
    if (id.startsWith('dev_vid_')) {
      setDeviceScannedVideos((prev) => prev.filter((v) => `dev_vid_${v.id}` !== id));
      triggerToast('Removed from MaxPlay local list');
      return;
    }
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

  // ============================================================================
  // DIRECT APP-TO-APP TRANSFER (MaxPlay -> MaxPlay with 6-Digit Code & Live P2P)
  // ============================================================================
  const handleStartDirectSendSession = async (file: DownloadedFile) => {
    try {
      if (sendSessionUnsubRef.current) {
        sendSessionUnsubRef.current();
        sendSessionUnsubRef.current = null;
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));

      // Resolve catalog source URLs so receiver can also use universal relay fallback if on different networks
      let resolvedVideoUrl = file.videoUrl || '';
      let resolvedSecondaryUrl = '';
      if (file.contentId) {
        const catItem = contentList.find((c) => c.id === file.contentId);
        if (catItem) {
          if (file.episodeIndex !== undefined && catItem.seasons) {
            const sIdx = file.seasonIndex || 0;
            const ep = catItem.seasons[sIdx]?.episodes?.[file.episodeIndex];
            if (ep) {
              resolvedVideoUrl = ep.videoUrl || resolvedVideoUrl;
              resolvedSecondaryUrl = (ep as any).secondaryVideoUrl || '';
            }
          } else {
            resolvedVideoUrl = catItem.videoUrl || resolvedVideoUrl;
            resolvedSecondaryUrl = (catItem as any).secondaryVideoUrl || '';
          }
        }
      }

      const metadataPayload = {
        id: file.id,
        storageKey: file.storageKey || `dl_${file.contentId || file.id}`,
        contentId: file.contentId || '',
        title: file.title,
        subtitle: file.subtitle || '',
        posterUrl: file.posterUrl || '',
        quality: file.quality || '720p',
        language: file.language || 'Default',
        fileSizeMb: file.fileSizeMb || 50,
        episodeId: file.episodeId || '',
        seasonIndex: file.seasonIndex ?? 0,
        episodeIndex: file.episodeIndex,
      };

      // Start Native LAN P2P HTTP Server on Sender phone (port 48821) if running in APK
      let senderIp = '';
      let senderPort = 48821;
      if (file.storageKey && NativeBridgeService.isRunningInKotlinApp()) {
        const serverRes = NativeBridgeService.startDirectTransferServerNative(
          file.storageKey,
          code,
          metadataPayload
        );
        if (serverRes && serverRes.ok) {
          senderIp = serverRes.ip || '';
          senderPort = serverRes.port || 48821;
        }
      }

      const sessionObj: DirectTransferSession = {
        code,
        senderIp,
        senderPort,
        contentId: file.contentId || '',
        episodeId: file.episodeId || '',
        seasonIndex: file.seasonIndex,
        episodeIndex: file.episodeIndex,
        title: file.title,
        subtitle: file.subtitle || '',
        posterUrl: file.posterUrl || '',
        quality: file.quality || '720p',
        language: file.language || 'Default',
        fileSizeMb: file.fileSizeMb || 50,
        storageKey: file.storageKey || `dl_${file.id}`,
        videoUrl: resolvedVideoUrl,
        secondaryVideoUrl: resolvedSecondaryUrl,
        status: 'waiting',
        progress: 0,
        createdAt: Date.now(),
      };

      setActiveSendSession(sessionObj);

      // Register in Firestore `/downloads/p2p_sessions/tasks/{code}` so the Receiver MaxPlay app connects instantly
      const sessionRef = doc(db, 'downloads', 'p2p_sessions', 'tasks', code);
      await setDoc(sessionRef, sessionObj);

      // Listen for live progress updates from the Receiver MaxPlay app
      sendSessionUnsubRef.current = onSnapshot(sessionRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as DirectTransferSession;
        setActiveSendSession(data);
        if (data.status === 'transferring') {
          setTransferStatus({
            active: true,
            mode: 'send',
            progress: data.progress || 25,
            message: `Sending "${file.title}" directly to receiver MaxPlay app...`,
          });
        } else if (data.status === 'completed') {
          setTransferStatus(null);
          triggerToast(`Direct Transfer of "${file.title}" completed!`);
        }
      });

      triggerToast(`Direct Transfer ready! Enter code ${code} on the other MaxPlay app.`);
    } catch (err) {
      console.error('Failed to start direct transfer session:', err);
      triggerToast('Could not start transfer session. Check connection.');
    }
  };

  const handleReceiveDirectBySession = async (session: DirectTransferSession) => {
    try {
      const cleanCode = session.code.trim();
      const targetStorageKey =
        session.storageKey || `dl_recv_${session.contentId || cleanCode}_${Date.now()}`;

      setTransferStatus({
        active: true,
        mode: 'receive',
        progress: 8,
        message: `Connecting to Sender MaxPlay app for "${session.title}"...`,
      });

      const sessionRef = doc(db, 'downloads', 'p2p_sessions', 'tasks', cleanCode);
      try {
        await setDoc(sessionRef, { ...session, status: 'transferring', progress: 12 }, { merge: true });
      } catch {}

      let transferredOk = false;
      let transferredBytes = (session.fileSizeMb || 50) * 1024 * 1024;

      // Path 1: Direct Phone-to-Phone LAN P2P Socket Stream (Zero Mobile Data!)
      if (
        NativeBridgeService.isRunningInKotlinApp() &&
        session.senderIp &&
        session.senderIp !== '127.0.0.1'
      ) {
        const p2pRes = await NativeBridgeService.receiveDirectTransferFromPeerNative(
          session.senderIp,
          session.senderPort || 48821,
          cleanCode,
          targetStorageKey,
          (pct, msg) => {
            setTransferStatus({
              active: true,
              mode: 'receive',
              progress: pct,
              message: msg,
            });
            if (pct % 20 === 0) {
              setDoc(sessionRef, { status: 'transferring', progress: pct }, { merge: true }).catch(
                () => {}
              );
            }
          }
        );
        if (p2pRes && p2pRes.ok) {
          transferredOk = true;
          if (p2pRes.totalBytes && p2pRes.totalBytes > 0) {
            transferredBytes = p2pRes.totalBytes;
          }
        }
      }

      // Path 2: Automatic App-to-App Direct Relay Stream (Works even across different networks / mobile data!)
      if (!transferredOk) {
        let candidateUrl = session.videoUrl || '';
        let secondaryUrl = session.secondaryVideoUrl || '';

        if (!candidateUrl && session.contentId) {
          const catItem = contentList.find((c) => c.id === session.contentId);
          if (catItem) {
            if (session.episodeIndex !== undefined && catItem.seasons) {
              const ep =
                catItem.seasons[session.seasonIndex || 0]?.episodes?.[session.episodeIndex];
              candidateUrl = ep?.videoUrl || '';
              secondaryUrl = (ep as any)?.secondaryVideoUrl || '';
            } else {
              candidateUrl = catItem.videoUrl || '';
              secondaryUrl = (catItem as any).secondaryVideoUrl || '';
            }
          }
        }

        const rawSource = candidateUrl || secondaryUrl;
        if (rawSource) {
          setTransferStatus({
            active: true,
            mode: 'receive',
            progress: 18,
            message: `Receiving "${session.title}" via MaxPlay Direct Relay...`,
          });

          let playUrl = rawSource;
          let refererUrl = SmartStreamService.resolveEmbedReferer(rawSource);
          if (SmartStreamService.isExtractableSource(rawSource, true)) {
            const resolved = await SmartStreamService.resolveStream(rawSource);
            if (resolved && resolved.streamUrl) {
              playUrl = resolved.streamUrl;
            }
          }

          const dlRes = await ClientHlsDownloader.downloadStream(
            targetStorageKey,
            playUrl,
            session.quality || '720p',
            (info) => {
              const pct = Math.min(
                98,
                Math.max(
                  20,
                  Math.round(
                    (info.downloadedBytes / Math.max(1, info.totalEstimatedBytes)) * 100
                  )
                )
              );
              const mbNow = Math.round((info.downloadedBytes / (1024 * 1024)) * 10) / 10;
              setTransferStatus({
                active: true,
                mode: 'receive',
                progress: pct,
                message: `Receiving "${session.title}" into MaxPlay (${mbNow} MB)...`,
              });
            },
            session.language || 'Hindi',
            transferredBytes,
            refererUrl
          );

          if (dlRes && dlRes.totalBytes > 0) {
            transferredOk = true;
            transferredBytes = dlRes.totalBytes;
          }
        }
      }

      if (!transferredOk) {
        setTransferStatus(null);
        triggerToast(
          'Could not connect to sender phone. Make sure both phones are on the same Wi-Fi/Hotspot or online.'
        );
        return;
      }

      const finalSizeMb = Math.max(
        1,
        Math.round((transferredBytes / (1024 * 1024)) * 10) / 10
      );

      downloadManager.addImportedCompletedFile({
        contentId: session.contentId,
        episodeId: session.episodeId,
        seasonIndex: session.seasonIndex,
        episodeIndex: session.episodeIndex,
        title: session.title,
        subtitle: session.subtitle,
        posterUrl: session.posterUrl,
        quality: session.quality || '720p',
        language: session.language || 'Default',
        fileSizeMb: finalSizeMb,
        category: 'received',
        storageKey: targetStorageKey,
      });

      try {
        await setDoc(
          sessionRef,
          { status: 'completed', progress: 100 },
          { merge: true }
        );
        setTimeout(() => {
          deleteDoc(sessionRef).catch(() => {});
        }, 5000);
      } catch {}

      setTransferStatus(null);
      setShowTransferModal(false);
      setReceiveCodeInput('');
      setActiveFilter('received');
      triggerToast(`Received "${session.title}" directly into Received tab!`);
    } catch (err) {
      console.error('Direct App-to-App receive failed:', err);
      setTransferStatus(null);
      triggerToast('Direct transfer interrupted. Please try again.');
    }
  };

  const handleReceiveByCodeSubmit = async () => {
    const clean = receiveCodeInput.replace(/\D/g, '').trim();
    if (clean.length < 6) {
      triggerToast('Please enter the 6-digit MaxPlay Transfer Code.');
      return;
    }
    try {
      setTransferStatus({
        active: true,
        mode: 'receive',
        progress: 5,
        message: `Looking up Transfer Code ${clean}...`,
      });
      const snap = await getDoc(doc(db, 'downloads', 'p2p_sessions', 'tasks', clean));
      if (!snap.exists()) {
        setTransferStatus(null);
        triggerToast('Invalid or expired Transfer Code! Ask sender to tap Send Direct again.');
        return;
      }
      const session = snap.data() as DirectTransferSession;
      await handleReceiveDirectBySession(session);
    } catch {
      setTransferStatus(null);
      triggerToast('Could not verify Transfer Code.');
    }
  };

  // Receive & Import a .maxplay file into the 'received' category (legacy backup option)
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
          {/* Local Video Scanner / Import Quick Button */}
          <button
            type="button"
            onClick={() => {
              setActiveFilter('local');
              if (NativeBridgeService.isRunningInKotlinApp()) {
                scanPhoneLocalVideos(true);
                triggerToast('Scanned phone storage for local videos!');
              } else {
                localVideoInputRef.current?.click();
              }
            }}
            className="flex items-center gap-1.5 rounded-xl bg-[#141418] px-3 py-2 text-xs font-bold text-purple-300 border border-purple-500/30 hover:bg-purple-500/10 transition cursor-pointer active:scale-95"
            title="Scan or import video from phone storage"
          >
            <FolderOpen className="h-3.5 w-3.5 text-purple-400" />
            <span className="hidden xs:inline">Local Videos</span>
          </button>

          {/* Direct App-to-App Transfer button (top-right) */}
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
              Local files ({totalLocalFilesCount})
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

        {/* Local Files Quick Action Bar when viewing Local files tab */}
        {activeFilter === 'local' && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-[#13131A] border border-purple-500/20 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Smartphone className="h-4 w-4 text-purple-400 shrink-0" />
              <span className="text-[11px] font-semibold text-zinc-300 truncate">
                {deviceScannedVideos.length > 0
                  ? `${deviceScannedVideos.length} videos auto-detected from phone storage`
                  : 'Auto-scans all MP4/MKV videos in your phone storage'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {NativeBridgeService.isRunningInKotlinApp() && (
                <button
                  type="button"
                  onClick={() => scanPhoneLocalVideos(true)}
                  className="flex items-center gap-1 rounded-lg bg-purple-500/20 border border-purple-500/40 px-2.5 py-1 text-[11px] font-bold text-purple-300 hover:bg-purple-500/30 active:scale-95 transition cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${isScanningLocalVideos ? 'animate-spin' : ''}`} />
                  <span>Rescan</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => localVideoInputRef.current?.click()}
                className="flex items-center gap-1 rounded-lg bg-white/10 border border-white/15 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/15 active:scale-95 transition cursor-pointer"
              >
                <FolderOpen className="h-3 w-3 text-purple-300" />
                <span>Pick File</span>
              </button>
            </div>
          </div>
        )}

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

            {/* Render Standalone Movies & Local Phone Videos */}
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
                <span className="mt-2 text-sm font-bold text-white">
                  No local videos found yet
                </span>
                <span className="mt-0.5 text-xs text-[#6B7280] max-w-xs">
                  Allow video storage access to automatically list all videos on your phone, or pick any video file to play in MaxPlay.
                </span>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                  {NativeBridgeService.isRunningInKotlinApp() && (
                    <button
                      type="button"
                      onClick={() => scanPhoneLocalVideos(true)}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-purple-600/30 active:scale-95 transition cursor-pointer"
                    >
                      <RefreshCw className={`h-4 w-4 ${isScanningLocalVideos ? 'animate-spin' : ''}`} />
                      <span>Scan Phone Videos</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => localVideoInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-xl bg-[#1C1C24] border border-purple-500/40 px-4 py-2.5 text-xs font-extrabold text-purple-200 active:scale-95 transition cursor-pointer"
                  >
                    <FolderOpen className="h-4 w-4 text-purple-400" />
                    <span>Select Video from Phone</span>
                  </button>
                </div>
              </>
            ) : activeFilter === 'received' ? (
              <>
                <FileDown className="h-10 w-10 text-emerald-400/70" />
                <span className="mt-2 text-sm font-bold text-white">No received MaxPlay downloads yet</span>
                <span className="mt-0.5 text-xs text-[#6B7280] max-w-xs">
                  Movies and episodes transferred directly from another MaxPlay app appear here ready for offline playback.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTransferTab('receive');
                    setShowTransferModal(true);
                  }}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-[#10B981] px-4 py-2.5 text-xs font-extrabold text-black shadow-lg shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
                >
                  <Wifi className="h-4 w-4" />
                  <span>Receive Direct from MaxPlay</span>
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

      {/* DIRECT APP-TO-APP MAXPLAY TRANSFER MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="flex w-full max-w-md flex-col rounded-3xl bg-[#121216] p-5 sm:p-6 border border-white/10 text-left shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                  <Wifi className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Direct App-to-App Transfer</h3>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Send downloads directly from one MaxPlay app to another
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

            {/* Mode Switcher Tabs: Send Direct vs Receive Direct */}
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
                <span>Send Direct</span>
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
                <span>Receive Direct</span>
              </button>
            </div>

            {/* Live Status inside Modal if active */}
            {transferStatus && transferStatus.active && (
              <div className="mt-4 rounded-xl bg-black/60 p-3 border border-emerald-500/40">
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
                {/* Active 6-Digit Direct Transfer Code Box */}
                {activeSendSession && (
                  <div className="rounded-2xl bg-gradient-to-b from-emerald-950/60 to-[#14181D] p-4 border border-emerald-500/40 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>
                        {activeSendSession.status === 'completed'
                          ? 'Transfer Completed!'
                          : activeSendSession.status === 'transferring'
                          ? `Sending to Receiver (${activeSendSession.progress || 25}%)...`
                          : 'Ready to Connect • Enter Code on Receiver MaxPlay'}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-center gap-2">
                      <div className="rounded-xl bg-black/70 px-5 py-2.5 border border-emerald-500/40 font-mono text-2xl font-black tracking-[0.25em] text-white shadow-inner">
                        {activeSendSession.code.slice(0, 3)} {activeSendSession.code.slice(3)}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(activeSendSession.code);
                          triggerToast('Transfer code copied!');
                        }}
                        className="p-2.5 rounded-xl bg-white/10 text-emerald-300 hover:bg-white/15 cursor-pointer"
                        title="Copy Code"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="mt-2 text-[11px] text-zinc-300 truncate font-semibold">
                      Sharing: {activeSendSession.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-zinc-400">
                      On the other phone, open <span className="text-white font-bold">MaxPlay &gt; Downloads &gt; Transfer &gt; Receive Direct</span>
                    </p>
                  </div>
                )}

                <p className="text-xs text-[#A1A1AA]">
                  Tap <span className="text-emerald-400 font-bold">Send Direct</span> on any downloaded movie or episode to beam it directly to another MaxPlay app:
                </p>

                {completedFiles.filter((f) => f.category !== 'local').length > 0 ? (
                  <div className="max-h-56 overflow-y-auto flex flex-col gap-2 pr-1 scrollbar-none">
                    {completedFiles
                      .filter((f) => f.category !== 'local')
                      .map((file) => {
                        const isSelected = selectedSendFileId === file.id;
                        const epLabel =
                          file.episodeIndex !== undefined ? ` • Ep ${file.episodeIndex + 1}` : '';
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
                                  {epLabel}
                                </h4>
                                <p className="text-[10px] text-[#A1A1AA]">
                                  {file.quality?.toUpperCase() || 'HD'} • {file.language || 'Default'} • {file.fileSizeMb} MB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartDirectSendSession(file);
                              }}
                              className="shrink-0 rounded-lg bg-[#10B981] px-3 py-1.5 text-[11px] font-extrabold text-black hover:brightness-110 active:scale-95 cursor-pointer"
                            >
                              Send Direct
                            </button>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[#18181D] p-6 text-center border border-white/5">
                    <p className="text-xs font-bold text-[#A1A1AA]">
                      No downloaded MovieBox files available to send yet.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {/* 1. Enter 6-Digit Transfer Code */}
                <div className="rounded-2xl bg-[#18181D] p-4 border border-white/10">
                  <label className="block text-xs font-bold text-white mb-1.5">
                    Enter 6-Digit MaxPlay Transfer Code
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={7}
                      value={receiveCodeInput}
                      onChange={(e) => setReceiveCodeInput(e.target.value)}
                      placeholder="e.g. 482915"
                      className="flex-1 rounded-xl bg-black/70 border border-cyan-500/40 px-3.5 py-2.5 text-center font-mono text-base font-black tracking-widest text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={handleReceiveByCodeSubmit}
                      className="shrink-0 rounded-xl bg-gradient-to-r from-[#06B6D4] to-[#10B981] px-4 py-2.5 text-xs font-black text-black shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition cursor-pointer"
                    >
                      Connect
                    </button>
                  </div>
                </div>

                {/* 2. Auto-Discovered Active MaxPlay Transfers */}
                <div className="rounded-2xl bg-[#18181D] p-3.5 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Wifi className="h-3.5 w-3.5" />
                      <span>Active Nearby MaxPlay Transfers</span>
                    </span>
                    <button
                      type="button"
                      onClick={fetchActiveTransferSessions}
                      className="text-[11px] font-bold text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`h-3 w-3 ${isSearchingSessions ? 'animate-spin' : ''}`} />
                      <span>Scan</span>
                    </button>
                  </div>

                  {nearbySessions.length > 0 ? (
                    <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1 scrollbar-none">
                      {nearbySessions.map((sess) => (
                        <div
                          key={sess.code}
                          className="flex items-center justify-between gap-2.5 rounded-xl bg-black/50 p-2.5 border border-cyan-500/25"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {sess.posterUrl ? (
                              <img
                                src={sess.posterUrl}
                                alt={sess.title}
                                className="h-10 w-7 rounded object-cover shrink-0"
                              />
                            ) : (
                              <Film className="h-6 w-6 text-cyan-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">{sess.title}</h4>
                              <p className="text-[10px] text-cyan-300 font-semibold">
                                Code: {sess.code} • {sess.quality || 'HD'} • {sess.fileSizeMb} MB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleReceiveDirectBySession(sess)}
                            className="shrink-0 rounded-lg bg-[#06B6D4] px-3 py-1.5 text-[11px] font-black text-black hover:brightness-110 active:scale-95 cursor-pointer"
                          >
                            Receive
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500 py-2 text-center">
                      Tap &ldquo;Send Direct&rdquo; on the sender phone&apos;s MaxPlay app to see it appear here automatically.
                    </p>
                  )}
                </div>
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
