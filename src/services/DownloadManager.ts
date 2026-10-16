// DownloadManager Service with REAL chunked binary download engine,
// IndexedDB persistence, background queueing, real speed/bytes tracking,
// and zero-network offline playback.

import { SmartStreamService } from './smartStreamService';
import { saveVideoBlob, getVideoBlob, deleteVideoBlob, getStoredStorageUsage } from '../utils/offlineStorage';

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
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  bytesDownloaded: number;
  totalBytes: number;
  downloadSpeedMb: number; // e.g., 2.4 MB/s
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  storageKey?: string;
  mimeType?: string;
}

export interface DownloadedFile {
  id: string;
  contentId: string;
  episodeId?: string;
  seasonIndex?: number;
  episodeIndex?: number;
  title: string;
  subtitle?: string; // e.g. "Ep 1 • 250MB"
  posterUrl: string;
  quality?: string;
  language?: string;
  fileSizeMb: number;
  episodesCount?: number;
  status: 'Not open' | 'Watched';
  hasError?: boolean;
  category: 'moviebox' | 'local' | 'received';
  downloadedAt: string;
  storageKey?: string;
  mimeType?: string;
}

const STORAGE_KEY_TASKS = 'maxplay_download_tasks_v3';
const STORAGE_KEY_COMPLETED = 'maxplay_downloaded_files_v3';

class DownloadManager {
  private tasks: DownloadTask[] = [];
  private completedFiles: DownloadedFile[] = [];
  private listeners: Set<(tasks: DownloadTask[]) => void> = new Set();
  private activeAbortControllers: Map<string, AbortController> = new Map();
  private isProcessingQueue = false;
  private queueInterval: NodeJS.Timeout | null = null;
  private offlineBlobUrls: Map<string, string> = new Map();

  constructor() {
    this.loadFromStorage();
    this.startQueueWorker();
  }

  private loadFromStorage() {
    try {
      const savedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
      if (savedTasks) {
        this.tasks = JSON.parse(savedTasks);
        // Reset any interrupted 'downloading' tasks to 'queued' on page reload
        this.tasks.forEach((t) => {
          if (t.status === 'downloading') {
            t.status = 'queued';
            t.downloadSpeedMb = 0;
          }
        });
      }
      const savedCompleted = localStorage.getItem(STORAGE_KEY_COMPLETED);
      if (savedCompleted) {
        this.completedFiles = JSON.parse(savedCompleted);
      } else {
        this.completedFiles = [];
      }
    } catch (e) {
      console.warn('Failed to load download manager storage', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(this.tasks));
      localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify(this.completedFiles));
    } catch (e) {
      console.warn('Failed to save download manager storage', e);
    }
  }

  public subscribe(callback: (tasks: DownloadTask[]) => void) {
    this.listeners.add(callback);
    callback(this.getTasks());

    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach((cb) => cb([...this.tasks]));
  }

  private startQueueWorker() {
    if (this.queueInterval) return;
    this.queueInterval = setInterval(() => {
      this.processNextQueuedTask();
    }, 1500);
  }

  private async processNextQueuedTask() {
    if (this.isProcessingQueue) return;

    // Max 1 concurrent heavy download to prevent memory/bandwidth exhaustion on mobile
    const activeCount = this.tasks.filter((t) => t.status === 'downloading').length;
    if (activeCount >= 1) return;

    const nextTask = this.tasks.find((t) => t.status === 'queued');
    if (!nextTask) return;

    this.isProcessingQueue = true;
    try {
      await this.executeDownload(nextTask);
    } catch (err: any) {
      console.error('Download execution error:', err);
      nextTask.status = 'failed';
      nextTask.errorMessage = err?.message || 'Download failed';
      this.notify();
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async executeDownload(task: DownloadTask): Promise<void> {
    task.status = 'downloading';
    task.downloadSpeedMb = 0;
    this.notify();

    const abortController = new AbortController();
    this.activeAbortControllers.set(task.taskId, abortController);

    try {
      let targetUrl = task.videoUrl || '';

      // 1. If URL requires dynamic extraction (VOE / external host)
      if (targetUrl && SmartStreamService.isExtractableSource(targetUrl)) {
        try {
          const resolved = await SmartStreamService.resolveStream(targetUrl);
          if (resolved && resolved.streamUrl) {
            targetUrl = resolved.streamUrl;
          }
        } catch (extractErr) {
          console.warn('[DownloadManager] Stream extraction warning, attempting direct URL:', extractErr);
        }
      }

      if (!targetUrl) {
        throw new Error('No valid video URL available for download');
      }

      // 2. Route all external HTTP(S) or HLS streams through real media downloader proxy to bypass CORS
      let downloadFetchUrl = targetUrl;
      if (
        targetUrl.startsWith('http://') ||
        targetUrl.startsWith('https://') ||
        targetUrl.startsWith('//') ||
        targetUrl.includes('.m3u8') ||
        targetUrl.includes('m3u8') ||
        SmartStreamService.isExtractableSource(targetUrl)
      ) {
        downloadFetchUrl = `/api/download-media?url=${encodeURIComponent(targetUrl)}&quality=${encodeURIComponent(task.quality || '720p')}`;
      }

      const storageKey = task.storageKey || (task.episodeId
        ? `video_${task.contentId}_${task.episodeId}_${task.quality}`
        : `video_${task.contentId}_${task.quality}`);
      task.storageKey = storageKey;

      // 3. Fetch the real binary video stream
      const response = await fetch(downloadFetchUrl, {
        signal: abortController.signal,
        headers: {
          Accept: '*/*',
        },
      });

      if (!response.ok) {
        let errMessage = `Server returned HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData?.error) errMessage = errData.error;
        } catch (_) {}
        throw new Error(errMessage);
      }

      const contentLengthHeader = response.headers.get('content-length');
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : (task.totalBytes || 250 * 1024 * 1024);
      task.totalBytes = Math.max(1024 * 1024, totalBytes);
      const mimeType = 'video/mp4';
      task.mimeType = mimeType;

      const body = response.body;
      if (!body) {
        // Fallback to arrayBuffer if ReadableStream body is unavailable
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength < 1024) {
          throw new Error('Download failed: Incomplete stream received');
        }
        const blob = new Blob([buffer], { type: mimeType });
        await saveVideoBlob(storageKey, blob);
        task.bytesDownloaded = buffer.byteLength;
        task.totalBytes = buffer.byteLength;
      } else {
        const reader = body.getReader();
        const chunks: Uint8Array[] = [];
        let receivedBytes = 0;
        let lastReportTime = Date.now();
        let bytesSinceLastReport = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (value && value.length > 0) {
            chunks.push(value);
            receivedBytes += value.length;
            task.bytesDownloaded = receivedBytes;
            bytesSinceLastReport += value.length;

            const now = Date.now();
            if (now - lastReportTime >= 500) {
              const elapsedSec = (now - lastReportTime) / 1000;
              const speedMb = (bytesSinceLastReport / (1024 * 1024)) / elapsedSec;
              task.downloadSpeedMb = parseFloat(speedMb.toFixed(1));
              lastReportTime = now;
              bytesSinceLastReport = 0;
              this.notify();
            }
          }
        }

        if (receivedBytes < 1024) {
          throw new Error('Download failed: Incomplete or empty video stream received');
        }

        // Assemble chunks and save into IndexedDB
        const finalBlob = new Blob(chunks as any[], { type: mimeType });
        await saveVideoBlob(task.storageKey!, finalBlob);
        task.bytesDownloaded = receivedBytes;
        task.totalBytes = receivedBytes;
      }

      // Mark task completed
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.downloadSpeedMb = 0;

      // Add to completedFiles list
      const completedFile: DownloadedFile = {
        id: task.taskId,
        contentId: task.contentId,
        episodeId: task.episodeId,
        seasonIndex: task.seasonIndex,
        episodeIndex: task.episodeIndex,
        title: task.title,
        subtitle: task.episodeTitle
          ? `${task.episodeTitle} • ${(task.bytesDownloaded / (1024 * 1024)).toFixed(0)}MB`
          : `${(task.bytesDownloaded / (1024 * 1024)).toFixed(0)}MB • ${task.quality}`,
        posterUrl: task.posterUrl,
        quality: task.quality,
        language: task.language,
        fileSizeMb: parseFloat((task.bytesDownloaded / (1024 * 1024)).toFixed(1)),
        status: 'Not open',
        category: 'moviebox',
        downloadedAt: new Date().toISOString(),
        storageKey: task.storageKey,
        mimeType: task.mimeType || 'video/mp4',
      };

      // Avoid duplicates
      this.completedFiles = this.completedFiles.filter((f) => f.storageKey !== task.storageKey);
      this.completedFiles.unshift(completedFile);

      this.notify();
    } catch (err: any) {
      if (err.name === 'AbortError' || abortController.signal.aborted) {
        console.log('[DownloadManager] Download aborted/paused by user');
      } else {
        console.error('[DownloadManager] Download failed:', err);
        task.status = 'failed';
        task.errorMessage = err?.message || 'Download error';
        this.notify();
      }
    } finally {
      this.activeAbortControllers.delete(task.taskId);
    }
  }

  public getTasks(): DownloadTask[] {
    return this.tasks;
  }

  public getCompletedFiles(): DownloadedFile[] {
    return this.completedFiles;
  }

  public addTask(taskData: {
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
    estimatedBytes?: number;
  }) {
    const storageKey = taskData.episodeId
      ? `video_${taskData.contentId}_${taskData.episodeId}_${taskData.quality}`
      : `video_${taskData.contentId}_${taskData.quality}`;

    // Check if task already exists or is completed
    const existingCompleted = this.completedFiles.find((f) => f.storageKey === storageKey);
    if (existingCompleted) {
      return existingCompleted.id;
    }

    const existingTask = this.tasks.find((t) => t.storageKey === storageKey);
    if (existingTask) {
      if (existingTask.status === 'failed' || existingTask.status === 'paused') {
        existingTask.status = 'queued';
        this.notify();
      }
      return existingTask.taskId;
    }

    const newTask: DownloadTask = {
      taskId: `dl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      contentId: taskData.contentId,
      episodeId: taskData.episodeId,
      seasonIndex: taskData.seasonIndex,
      episodeIndex: taskData.episodeIndex,
      title: taskData.title,
      episodeTitle: taskData.episodeTitle,
      posterUrl: taskData.posterUrl,
      quality: taskData.quality,
      language: taskData.language || 'Hindi',
      videoUrl: taskData.videoUrl || '',
      status: 'queued',
      bytesDownloaded: 0,
      totalBytes: taskData.estimatedBytes || 250 * 1024 * 1024,
      downloadSpeedMb: 0,
      createdAt: new Date().toISOString(),
      storageKey,
    };

    this.tasks.unshift(newTask);
    this.notify();
    setTimeout(() => {
      this.processNextQueuedTask();
    }, 50);
    return newTask.taskId;
  }

  public togglePauseResume(taskId: string) {
    const task = this.tasks.find((t) => t.taskId === taskId);
    if (!task) return;

    if (task.status === 'downloading') {
      const controller = this.activeAbortControllers.get(taskId);
      if (controller) {
        controller.abort();
        this.activeAbortControllers.delete(taskId);
      }
      task.status = 'paused';
      task.downloadSpeedMb = 0;
      this.notify();
    } else if (task.status === 'paused' || task.status === 'failed') {
      task.status = 'queued';
      task.errorMessage = undefined;
      this.notify();
      setTimeout(() => {
        this.processNextQueuedTask();
      }, 50);
    }
  }

  public cancelTask(taskId: string) {
    const controller = this.activeAbortControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.activeAbortControllers.delete(taskId);
    }
    this.tasks = this.tasks.filter((t) => t.taskId !== taskId);
    this.notify();
  }

  public async removeCompletedFile(id: string) {
    const file = this.completedFiles.find((f) => f.id === id);
    if (file && file.storageKey) {
      try {
        await deleteVideoBlob(file.storageKey);
        // Revoke any created Object URL
        if (this.offlineBlobUrls.has(file.storageKey)) {
          URL.revokeObjectURL(this.offlineBlobUrls.get(file.storageKey)!);
          this.offlineBlobUrls.delete(file.storageKey);
        }
      } catch (err) {
        console.warn('Error deleting video blob from IndexedDB:', err);
      }
    }
    this.completedFiles = this.completedFiles.filter((f) => f.id !== id);
    this.tasks = this.tasks.filter((t) => t.taskId !== id);
    this.notify();
  }

  /**
   * Retrieves a zero-network playable local Object URL for an offline downloaded item.
   */
  public async getOfflineVideoUrl(contentIdOrTaskId: string, episodeId?: string, episodeIndex?: number): Promise<string | null> {
    let file = this.completedFiles.find((f) => f.id === contentIdOrTaskId);
    if (!file) {
      if (episodeId !== undefined || episodeIndex !== undefined) {
        file = this.completedFiles.find((f) => {
          if (f.contentId !== contentIdOrTaskId) return false;
          if (episodeId && f.episodeId && f.episodeId.toLowerCase() === episodeId.toLowerCase()) return true;
          if (episodeIndex !== undefined && f.episodeIndex === episodeIndex) return true;
          if (episodeId && f.episodeId && f.episodeId.replace(/\D/g, '') === episodeId.replace(/\D/g, '')) return true;
          return false;
        });
      }
      if (!file) {
        file = this.completedFiles.find((f) => f.contentId === contentIdOrTaskId);
      }
    }

    if (!file || !file.storageKey) return null;

    if (this.offlineBlobUrls.has(file.storageKey)) {
      return this.offlineBlobUrls.get(file.storageKey)!;
    }

    try {
      const blob = await getVideoBlob(file.storageKey);
      if (!blob) return null;

      const blobUrl = URL.createObjectURL(blob);
      this.offlineBlobUrls.set(file.storageKey, blobUrl);
      return blobUrl;
    } catch (err) {
      console.error('Failed to get offline video blob:', err);
      return null;
    }
  }

  public isContentDownloaded(contentId: string, episodeId?: string, episodeIndex?: number): boolean {
    return this.completedFiles.some((f) => {
      if (f.contentId !== contentId) return false;
      if (episodeId === undefined && episodeIndex === undefined) return true;
      if (episodeId && f.episodeId && f.episodeId.toLowerCase() === episodeId.toLowerCase()) return true;
      if (episodeIndex !== undefined && f.episodeIndex === episodeIndex) return true;
      if (episodeId && f.episodeId && f.episodeId.replace(/\D/g, '') === episodeId.replace(/\D/g, '')) return true;
      return false;
    });
  }

  public getDownloadedFile(contentId: string, episodeId?: string, episodeIndex?: number): DownloadedFile | undefined {
    return this.completedFiles.find((f) => {
      if (f.contentId !== contentId) return false;
      if (episodeId === undefined && episodeIndex === undefined) return true;
      if (episodeId && f.episodeId && f.episodeId.toLowerCase() === episodeId.toLowerCase()) return true;
      if (episodeIndex !== undefined && f.episodeIndex === episodeIndex) return true;
      if (episodeId && f.episodeId && f.episodeId.replace(/\D/g, '') === episodeId.replace(/\D/g, '')) return true;
      return false;
    });
  }

  public async getTotalUsedStorageBytes(): Promise<number> {
    return getStoredStorageUsage();
  }
}

export const downloadManager = new DownloadManager();
