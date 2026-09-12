// DownloadManager Service with queue logic, progress listener, and LocalStorage persistence

export interface DownloadTask {
  taskId: string;
  contentId: string;
  episodeId?: string;
  title: string;
  episodeTitle?: string;
  posterUrl: string;
  quality: string;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  bytesDownloaded: number;
  totalBytes: number;
  downloadSpeedMb: number; // e.g., 2.4 MB/s
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface DownloadedFile {
  id: string;
  contentId: string;
  episodeId?: string;
  title: string;
  subtitle?: string; // e.g. "12 episodes | 3.4GB"
  posterUrl: string;
  fileSizeMb: number;
  episodesCount?: number;
  status: 'Not open' | 'Watched';
  hasError?: boolean;
  category: 'moviebox' | 'local' | 'received';
  downloadedAt: string;
}

const STORAGE_KEY_TASKS = 'maxplay_download_tasks_v2';
const STORAGE_KEY_COMPLETED = 'maxplay_downloaded_files_v2';

class DownloadManager {
  private tasks: DownloadTask[] = [];
  private completedFiles: DownloadedFile[] = [];
  private listeners: Set<(tasks: DownloadTask[]) => void> = new Set();
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
      if (savedTasks) {
        this.tasks = JSON.parse(savedTasks);
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
    
    if (this.listeners.size === 1) {
      this.startBackgroundLoop();
    }

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0 && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    };
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach((cb) => cb([...this.tasks]));
  }

  private startBackgroundLoop() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      let updated = false;

      // Active downloading tasks count
      const activeDownloading = this.tasks.filter((t) => t.status === 'downloading');

      // Max 3 active downloads
      if (activeDownloading.length < 3) {
        const nextQueued = this.tasks.find((t) => t.status === 'queued');
        if (nextQueued) {
          nextQueued.status = 'downloading';
          updated = true;
        }
      }

      // Simulate download progress for active items
      this.tasks.forEach((task) => {
        if (task.status === 'downloading') {
          const increment = Math.floor(Math.random() * 5 * 1024 * 1024 + 2 * 1024 * 1024); // 2-7 MB
          task.bytesDownloaded = Math.min(task.totalBytes, task.bytesDownloaded + increment);
          task.downloadSpeedMb = parseFloat(((increment / (1024 * 1024)) * 2).toFixed(1));
          updated = true;

          if (task.bytesDownloaded >= task.totalBytes) {
            task.status = 'completed';
            task.completedAt = new Date().toISOString();
            
            // Move to completedFiles list
            this.completedFiles.unshift({
              id: task.taskId,
              contentId: task.contentId,
              episodeId: task.episodeId,
              title: task.title,
              subtitle: task.episodeTitle ? `${task.episodeTitle} • ${(task.totalBytes / (1024 * 1024)).toFixed(0)}MB` : `${(task.totalBytes / (1024 * 1024 * 1024)).toFixed(1)}GB`,
              posterUrl: task.posterUrl,
              fileSizeMb: parseFloat((task.totalBytes / (1024 * 1024)).toFixed(1)),
              status: 'Not open',
              category: 'moviebox',
              downloadedAt: new Date().toISOString(),
            });
          }
        }
      });

      if (updated) {
        this.notify();
      }
    }, 800);
  }

  public getTasks(): DownloadTask[] {
    return this.tasks;
  }

  public getCompletedFiles(): DownloadedFile[] {
    return this.completedFiles;
  }

  public addTask(task: Omit<DownloadTask, 'taskId' | 'status' | 'bytesDownloaded' | 'createdAt'>) {
    const newTask: DownloadTask = {
      ...task,
      taskId: `dl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      status: 'queued',
      bytesDownloaded: 0,
      createdAt: new Date().toISOString(),
    };
    this.tasks.unshift(newTask);
    this.notify();
  }

  public togglePauseResume(taskId: string) {
    const task = this.tasks.find((t) => t.taskId === taskId);
    if (!task) return;

    if (task.status === 'downloading') {
      task.status = 'paused';
    } else if (task.status === 'paused' || task.status === 'failed') {
      task.status = 'queued';
    }
    this.notify();
  }

  public cancelTask(taskId: string) {
    this.tasks = this.tasks.filter((t) => t.taskId !== taskId);
    this.notify();
  }

  public removeCompletedFile(id: string) {
    this.completedFiles = this.completedFiles.filter((f) => f.id !== id);
    this.notify();
  }

  public setInitialTasks(initialTasks: DownloadTask[], initialCompleted: DownloadedFile[]) {
    if (this.tasks.length === 0) {
      this.tasks = initialTasks;
    }
    if (this.completedFiles.length === 0) {
      this.completedFiles = initialCompleted;
    }
    this.saveToStorage();
  }
}

export const downloadManager = new DownloadManager();
