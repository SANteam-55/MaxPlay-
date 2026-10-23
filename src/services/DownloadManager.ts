import { ClientHlsDownloader } from './clientHlsDownloader';
import { SmartStreamService } from './smartStreamService';
import { NativeBridgeService } from './nativeBridgeService';

export interface DownloadTask {
  taskId: string;
  contentId: string;
  episodeId?: string;
  seasonIndex?: number;
  episodeIndex?: number;
  title: string;
  episodeTitle?: string;
  posterUrl: string;
  quality: string;
  language?: string;
  videoUrl?: string;
  secondaryVideoUrl?: string;
  selectedServer?: 'server1' | 'server2';
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';
  bytesDownloaded: number;
  totalBytes: number;
  downloadSpeedMb: number;
  storageKey?: string;
  createdAt?: number | string;
}

export interface DownloadedFile {
  id: string;
  contentId?: string;
  episodeId?: string;
  seasonIndex?: number;
  episodeIndex?: number;
  title: string;
  subtitle?: string;
  posterUrl: string;
  quality?: string;
  language?: string;
  fileSizeMb: number;
  episodesCount?: number;
  status: string;
  category?: 'moviebox' | 'local' | 'received' | 'movie' | 'series';
  storageKey?: string;
  videoUrl?: string;
  isVertical?: boolean;
  hasError?: boolean;
  completedAt?: number;
  downloadedAt?: string;
}

const TASKS_STORAGE_KEY = 'maxplay_download_tasks_v2';
const COMPLETED_STORAGE_KEY = 'maxplay_completed_files_v2';

type TaskListener = (tasks: DownloadTask[]) => void;

class DownloadManagerService {
  private tasks: DownloadTask[] = [];
  private completedFiles: DownloadedFile[] = [];
  private listeners: Set<TaskListener> = new Set();
  private activeTaskIds: Set<string> = new Set();
  private isProcessingQueue: boolean = false;

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const rawTasks = localStorage.getItem(TASKS_STORAGE_KEY);
      if (rawTasks) {
        const parsed = JSON.parse(rawTasks);
        if (Array.isArray(parsed)) {
          // Any interrupted 'downloading' task from a previous session becomes 'paused' (resumable from disk checkpoint!)
          this.tasks = parsed.map((t: DownloadTask) =>
            t.status === 'downloading'
              ? { ...t, status: 'paused', downloadSpeedMb: 0 }
              : t
          );
        }
      }
    } catch (e) {
      console.warn('[DownloadManager] Failed to load tasks:', e);
    }

    try {
      const rawCompleted = localStorage.getItem(COMPLETED_STORAGE_KEY);
      if (rawCompleted) {
        const parsed = JSON.parse(rawCompleted);
        if (Array.isArray(parsed)) {
          this.completedFiles = parsed;
        }
      }
    } catch (e) {
      console.warn('[DownloadManager] Failed to load completed files:', e);
    }
  }

  private saveState() {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(this.tasks));
      localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(this.completedFiles));
    } catch (e) {
      console.warn('[DownloadManager] Failed to save state:', e);
    }
    this.notify();
  }

  private notify() {
    const snapshot = [...this.tasks];
    this.listeners.forEach((cb) => cb(snapshot));
  }

  public subscribe(listener: TaskListener): () => void {
    this.listeners.add(listener);
    listener([...this.tasks]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getTasks(): DownloadTask[] {
    return [...this.tasks];
  }

  public getCompletedFiles(): DownloadedFile[] {
    return [...this.completedFiles];
  }

  private buildStorageKey(params: {
    contentId: string;
    episodeId?: string;
    seasonIndex?: number;
    episodeIndex?: number;
  }): string {
    const sIdx = params.seasonIndex !== undefined ? `_s${params.seasonIndex}` : '';
    const eIdx =
      params.episodeIndex !== undefined
        ? `_e${params.episodeIndex}`
        : params.episodeId
        ? `_${params.episodeId}`
        : '';
    return `dl_${params.contentId}${sIdx}${eIdx}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Adds a Movie or Series Episode to the Download Queue.
   * Strict 1-by-1 Sequential Queue:
   * - If no task is currently downloading, starts immediately.
   * - If another task is downloading, queues cleanly with 0% RAM / 0 WebView overhead
   *   and automatically starts when the active download completes!
   */
  public addTask(params: {
    contentId: string;
    episodeId?: string;
    seasonIndex?: number;
    episodeIndex?: number;
    title: string;
    episodeTitle?: string;
    posterUrl: string;
    quality: string;
    language: string;
    videoUrl: string;
    secondaryVideoUrl?: string;
    selectedServer?: 'server1' | 'server2';
    estimatedBytes?: number;
  }): DownloadTask {
    const storageKey = this.buildStorageKey(params);

    // Check if already in active/queued tasks
    const existingTaskIdx = this.tasks.findIndex((t) => t.storageKey === storageKey);
    if (existingTaskIdx !== -1) {
      const existing = this.tasks[existingTaskIdx];
      if (existing.status === 'downloading' || existing.status === 'queued') {
        this.processQueue();
        return existing;
      }
      // Remove old paused/failed entry to replace/resume cleanly
      this.tasks.splice(existingTaskIdx, 1);
    }

    // Check if native disk already has partial checkpoint segments for this storageKey
    let initialBytes = 0;
    if (NativeBridgeService.supportsNativeOfflineVault()) {
      const cp = NativeBridgeService.getOfflineCheckpointInfoNative(storageKey);
      if (cp && cp.exists && cp.totalBytes > 0) {
        initialBytes = cp.totalBytes;
      }
    }

    const totalEst = Math.max(
      15 * 1024 * 1024,
      params.estimatedBytes || 250 * 1024 * 1024,
      initialBytes + 5 * 1024 * 1024
    );

    const hasActiveDownload = this.activeTaskIds.size > 0;

    const newTask: DownloadTask = {
      taskId: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      contentId: params.contentId,
      episodeId: params.episodeId,
      seasonIndex: params.seasonIndex,
      episodeIndex: params.episodeIndex,
      title: params.title,
      episodeTitle: params.episodeTitle,
      posterUrl: params.posterUrl,
      quality: params.quality || '720p',
      language: params.language || 'Default',
      videoUrl: params.videoUrl,
      secondaryVideoUrl: params.secondaryVideoUrl,
      selectedServer: params.selectedServer || 'server1',
      status: hasActiveDownload ? 'queued' : 'downloading',
      bytesDownloaded: initialBytes,
      totalBytes: totalEst,
      downloadSpeedMb: 0,
      storageKey,
      createdAt: Date.now(),
    };

    // Append to queue so episodes download in natural chronological order (Ep 1 -> Ep 2 -> Ep 3)
    this.tasks.push(newTask);
    this.saveState();
    this.processQueue();
    return newTask;
  }

  /**
   * Ensures strictly 1 download runs at a time, automatically starting the next 'queued' task
   * as soon as the active download completes or is paused/cancelled.
   */
  private processQueue() {
    if (this.isProcessingQueue || this.activeTaskIds.size > 0) return;

    const nextTask =
      this.tasks.find(
        (t) => t.status === 'downloading' && !this.activeTaskIds.has(t.taskId)
      ) ||
      this.tasks.find(
        (t) => t.status === 'queued' && !this.activeTaskIds.has(t.taskId)
      );

    if (!nextTask) return;

    this.isProcessingQueue = true;
    nextTask.status = 'downloading';
    this.saveState();
    this.isProcessingQueue = false;

    this.executeTask(nextTask);
  }

  /**
   * Resolves a raw hoster URL (Server 1 / Server 2) just-in-time when the episode's turn arrives,
   * with automatic failover to the backup server and optional forceRefresh on retry.
   */
  private async resolveStreamForTask(
    task: DownloadTask,
    forceRefresh: boolean = false,
    preferSecondary: boolean = false
  ): Promise<{ streamUrl: string; refererUrl: string }> {
    const tryResolveUrl = async (rawUrl?: string): Promise<{ streamUrl: string; refererUrl: string } | null> => {
      if (!rawUrl || !rawUrl.trim()) return null;
      const trimmed = rawUrl.trim();
      const baseReferer = SmartStreamService.resolveEmbedReferer(trimmed);

      if (!SmartStreamService.isExtractableSource(trimmed, true)) {
        return {
          streamUrl: trimmed,
          refererUrl: baseReferer || SmartStreamService.resolveEmbedReferer(trimmed),
        };
      }
      // Check fast cache first unless forceRefresh is requested on retry
      if (!forceRefresh) {
        const cached = SmartStreamService.getCachedStreamUrl(trimmed);
        if (cached) {
          const cachedMeta = SmartStreamService.getCachedStreamMeta(trimmed);
          return {
            streamUrl: cached,
            refererUrl:
              cachedMeta?.referer ||
              cachedMeta?.headers?.Referer ||
              baseReferer ||
              SmartStreamService.resolveEmbedReferer(cached),
          };
        }
      }

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await SmartStreamService.resolveStream(trimmed, {
            forceRefresh: forceRefresh || attempt > 0,
          });
          if (res && res.streamUrl && !res.isEmbed) {
            const cachedMeta = SmartStreamService.getCachedStreamMeta(trimmed);
            return {
              streamUrl: res.streamUrl,
              refererUrl:
                cachedMeta?.referer ||
                cachedMeta?.headers?.Referer ||
                baseReferer ||
                SmartStreamService.resolveEmbedReferer(res.streamUrl),
            };
          }
        } catch (err) {
          console.warn('[DownloadManager] Just-in-time extraction warning:', err);
        }
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 700));
        }
      }
      return null;
    };

    const firstUrl = preferSecondary && task.secondaryVideoUrl ? task.secondaryVideoUrl : task.videoUrl;
    const secondUrl = preferSecondary && task.secondaryVideoUrl ? task.videoUrl : task.secondaryVideoUrl;

    const primaryResolved = await tryResolveUrl(firstUrl);
    if (primaryResolved && secondUrl && task.language && task.language !== 'Default') {
      try {
        const primaryMeta =
          SmartStreamService.getCachedStreamMeta(firstUrl || '') ||
          (await ClientHlsDownloader.probeMasterPlaylist(primaryResolved.streamUrl, 0));
        if (
          primaryMeta &&
          Array.isArray(primaryMeta.audioTracks) &&
          primaryMeta.audioTracks.length > 0 &&
          !primaryMeta.audioTracks.some(
            (l) => l.toLowerCase() === task.language!.toLowerCase()
          )
        ) {
          const secondaryResolved = await tryResolveUrl(secondUrl);
          if (secondaryResolved) {
            const secMeta =
              SmartStreamService.getCachedStreamMeta(secondUrl) ||
              (await ClientHlsDownloader.probeMasterPlaylist(secondaryResolved.streamUrl, 0));
            if (
              secMeta &&
              Array.isArray(secMeta.audioTracks) &&
              secMeta.audioTracks.some(
                (l) => l.toLowerCase() === task.language!.toLowerCase()
              )
            ) {
              return secondaryResolved;
            }
          }
        }
      } catch {}
    }

    if (primaryResolved) return primaryResolved;

    if (secondUrl) {
      const secondaryResolved = await tryResolveUrl(secondUrl);
      if (secondaryResolved) return secondaryResolved;
    }

    throw new Error('Failed to extract playable HLS stream from Server 1 or Server 2');
  }

  private async executeTask(task: DownloadTask) {
    if (this.activeTaskIds.has(task.taskId)) return;
    this.activeTaskIds.add(task.taskId);

    // Lock the initial estimated bytes so the series total MB never fluctuates between 800MB and 900MB
    const lockedTaskTotalBytes = task.totalBytes > 0 ? task.totalBytes : 250 * 1024 * 1024;

    try {
      let resolvedStreamUrl = '';
      let resolvedRefererUrl = '';
      let result: { totalBytes: number } | null = null;
      let lastError: any = null;

      // 3-Attempt Automatic Silent Retry Loop (with automatic failover to backup server on final attempt)
      for (let attempt = 0; attempt < 3; attempt++) {
        const currentCheck = this.tasks.find((t) => t.taskId === task.taskId);
        if (!currentCheck || currentCheck.status !== 'downloading') {
          return;
        }

        try {
          const resolvedObj = await this.resolveStreamForTask(
            task,
            attempt > 0,
            attempt === 2 && Boolean(task.secondaryVideoUrl)
          );
          resolvedStreamUrl = resolvedObj.streamUrl;
          resolvedRefererUrl = resolvedObj.refererUrl;

          result = await ClientHlsDownloader.downloadStream(
            task.storageKey!,
            resolvedStreamUrl,
            task.quality,
            (info) => {
              const current = this.tasks.find((t) => t.taskId === task.taskId);
              if (!current || current.status !== 'downloading') return;

              current.bytesDownloaded = info.downloadedBytes;
              // Keep totalBytes locked to avoid confusing total MB jumps in series summaries
              if (info.downloadedBytes > current.totalBytes * 0.97) {
                current.totalBytes = Math.max(current.totalBytes, info.totalEstimatedBytes);
              }
              current.downloadSpeedMb =
                Math.round((info.speedBps / (1024 * 1024)) * 10) / 10;
              this.notify();
            },
            task.language || 'Hindi',
            lockedTaskTotalBytes,
            resolvedRefererUrl
          );

          if (result && result.totalBytes > 0) {
            break;
          }
        } catch (attemptErr: any) {
          lastError = attemptErr;
          const afterCheck = this.tasks.find((t) => t.taskId === task.taskId);
          if (!afterCheck || afterCheck.status !== 'downloading') {
            return;
          }
          if (attempt < 2) {
            console.warn(
              `[DownloadManager] Auto-retrying "${task.title}" (attempt ${attempt + 2}/3)...`,
              attemptErr
            );
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
      }

      if (!result) {
        throw lastError || new Error('Download failed after automatic retries');
      }

      // Remove from active tasks list and move to completedFiles
      this.tasks = this.tasks.filter((t) => t.taskId !== task.taskId);

      const finalSizeMb = Math.max(
        1,
        Math.round((result.totalBytes / (1024 * 1024)) * 10) / 10
      );

      const subtitleParts: string[] = [];
      if (task.episodeTitle) subtitleParts.push(task.episodeTitle);
      if (task.language) subtitleParts.push(task.language);
      if (task.quality) subtitleParts.push(task.quality.toUpperCase());
      subtitleParts.push(`${finalSizeMb} MB`);

      const completedItem: DownloadedFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        contentId: task.contentId,
        episodeId: task.episodeId,
        seasonIndex: task.seasonIndex,
        episodeIndex: task.episodeIndex,
        title: task.title,
        subtitle: subtitleParts.join(' • '),
        posterUrl: task.posterUrl,
        quality: task.quality,
        language: task.language,
        fileSizeMb: finalSizeMb,
        status: `${finalSizeMb} MB • ${task.language} • ${task.quality.toUpperCase()}`,
        category: 'moviebox',
        storageKey: task.storageKey,
        videoUrl: resolvedStreamUrl,
        hasError: false,
        completedAt: Date.now(),
      };

      // Deduplicate by storageKey
      this.completedFiles = [
        completedItem,
        ...this.completedFiles.filter((f) => f.storageKey !== task.storageKey),
      ];

      this.saveState();
    } catch (err: any) {
      const current = this.tasks.find((t) => t.taskId === task.taskId);
      if (current && current.status !== 'paused') {
        current.status = 'failed';
        current.downloadSpeedMb = 0;
        this.saveState();
      }
    } finally {
      this.activeTaskIds.delete(task.taskId);
      // Automatically start the next queued episode!
      this.processQueue();
    }
  }

  public togglePauseResume(taskId: string) {
    const task = this.tasks.find((t) => t.taskId === taskId);
    if (!task) return;

    if (task.status === 'downloading') {
      task.status = 'paused';
      task.downloadSpeedMb = 0;
      ClientHlsDownloader.abortDownload(task.storageKey);
      this.activeTaskIds.delete(task.taskId);
      this.saveState();
      // Start next queued item while this one is paused
      this.processQueue();
    } else if (task.status === 'queued') {
      task.status = 'paused';
      task.downloadSpeedMb = 0;
      this.saveState();
    } else {
      // Resume from 'paused' or 'failed' (automatically continues from disk segment checkpoint!)
      const hasActive = this.activeTaskIds.size > 0;
      task.status = hasActive ? 'queued' : 'downloading';
      task.downloadSpeedMb = 0;
      this.saveState();
      this.processQueue();
    }
  }

  public async cancelTask(taskId: string) {
    const task = this.tasks.find((t) => t.taskId === taskId);
    if (task) {
      ClientHlsDownloader.abortDownload(task.storageKey);
      this.activeTaskIds.delete(task.taskId);
      await ClientHlsDownloader.deleteOfflineFile(task.storageKey);
    }
    this.tasks = this.tasks.filter((t) => t.taskId !== taskId);
    this.saveState();
    this.processQueue();
  }

  public async removeCompletedFile(id: string) {
    const target = this.completedFiles.find(
      (f) => f.id === id || f.storageKey === id || f.contentId === id
    );
    const targetStorageKey = target?.storageKey;

    // Immediately remove from in-memory state and persist to localStorage + notify UI subscribers
    // BEFORE awaiting disk deletion so Transfer > Send Direct and all tabs update instantaneously!
    this.completedFiles = this.completedFiles.filter((f) => {
      if (f.id === id || f.storageKey === id || f.contentId === id) return false;
      if (targetStorageKey && f.storageKey === targetStorageKey) return false;
      return true;
    });
    this.saveState();

    if (targetStorageKey) {
      try {
        await ClientHlsDownloader.deleteOfflineFile(targetStorageKey);
      } catch (e) {
        console.warn('[DownloadManager] Failed to delete offline storage file:', e);
      }
    }
  }

  public async removeCompletedFilesBatch(ids: string[]) {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    const storageKeysToDelete = new Set<string>();

    this.completedFiles.forEach((f) => {
      if (
        idSet.has(f.id) ||
        (f.storageKey && idSet.has(f.storageKey)) ||
        (f.contentId && idSet.has(f.contentId))
      ) {
        if (f.storageKey) storageKeysToDelete.add(f.storageKey);
      }
    });

    this.completedFiles = this.completedFiles.filter((f) => {
      if (idSet.has(f.id)) return false;
      if (f.storageKey && (idSet.has(f.storageKey) || storageKeysToDelete.has(f.storageKey))) {
        return false;
      }
      if (f.contentId && idSet.has(f.contentId)) return false;
      return true;
    });
    this.saveState();

    for (const sk of Array.from(storageKeysToDelete)) {
      try {
        await ClientHlsDownloader.deleteOfflineFile(sk);
      } catch {}
    }
  }

  public isDownloaded(
    contentId: string,
    episodeId?: string,
    episodeIndex?: number
  ): boolean {
    return this.completedFiles.some((f) => {
      if (f.contentId !== contentId) return false;
      if (episodeIndex !== undefined && f.episodeIndex !== undefined) {
        return f.episodeIndex === episodeIndex;
      }
      if (episodeId && f.episodeId) {
        return f.episodeId === episodeId;
      }
      return !episodeId && episodeIndex === undefined;
    });
  }

  public async getOfflineVideoUrl(
    idOrContentId: string,
    episodeId?: string,
    episodeIndex?: number
  ): Promise<string | null> {
    const match = this.completedFiles.find((f) => {
      if (f.id === idOrContentId || f.storageKey === idOrContentId) return true;
      if (f.contentId === idOrContentId) {
        if (episodeIndex !== undefined && f.episodeIndex !== undefined) {
          return f.episodeIndex === episodeIndex;
        }
        if (episodeId && f.episodeId) {
          return f.episodeId === episodeId;
        }
        if (!episodeId && episodeIndex === undefined) {
          return true;
        }
      }
      return false;
    });

    if (!match || !match.storageKey) return null;

    const blobOrLocalUrl = await ClientHlsDownloader.getOfflineBlobUrl(match.storageKey);
    if (blobOrLocalUrl) {
      if (match.hasError) {
        match.hasError = false;
        this.saveState();
      }
      return blobOrLocalUrl;
    }

    return match.videoUrl || null;
  }

  /**
   * Registers an imported `.maxplay` transfer package (`category: 'received'`) or local video (`category: 'local'`)
   * directly into `completedFiles` so it appears in the Downloads screen tabs immediately.
   */
  public addImportedCompletedFile(params: {
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
    category: 'received' | 'local' | 'moviebox';
    storageKey: string;
    isVertical?: boolean;
  }): DownloadedFile {
    const newItem: DownloadedFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      contentId: params.contentId || `imp_${Date.now()}`,
      episodeId: params.episodeId,
      seasonIndex: params.seasonIndex,
      episodeIndex: params.episodeIndex,
      title: params.title,
      subtitle:
        params.subtitle ||
        `${params.fileSizeMb} MB • ${params.language || 'Default'} • ${(params.quality || 'HD').toUpperCase()}`,
      posterUrl:
        params.posterUrl ||
        (params.category === 'local'
          ? ''
          : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&auto=format&fit=crop&q=80'),
      quality: params.quality || '720p',
      language: params.language || 'Default',
      fileSizeMb: params.fileSizeMb,
      status: `${params.fileSizeMb} MB • ${params.category === 'received' ? 'Received via MaxPlay' : 'Local Video'}`,
      category: params.category,
      storageKey: params.storageKey,
      isVertical: params.isVertical,
      hasError: false,
      completedAt: Date.now(),
    };

    this.completedFiles = [
      newItem,
      ...this.completedFiles.filter((f) => f.storageKey !== params.storageKey),
    ];
    this.saveState();
    return newItem;
  }
}

export const downloadManager = new DownloadManagerService();
export const DownloadManager = downloadManager;
