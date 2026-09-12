export interface VideoChunk {
  url: string;
  sizeMB: number;
  order: number;
  startTime: number; // Global start time in seconds
  duration: number;  // Duration of this chunk in seconds
}

export interface ChunkProgress {
  currentTime: number;      // Total seconds watched across all chunks
  totalDuration: number;    // Total duration of all chunks combined
  percent: number;          // 0 to 100
  chunkIndex: number;       // Current active chunk index
  timeInChunk: number;      // Seconds within current active chunk
  chunkDuration: number;    // Duration of current active chunk
}

export type ChunkEngineEvent = 
  | 'progress' 
  | 'chunkChange' 
  | 'preload' 
  | 'complete' 
  | 'buffer' 
  | 'error';

type EventCallback = (data: any) => void;

export class ChunkEngine {
  private chunks: VideoChunk[] = [];
  private currentChunkIndex: number = 0;
  private preloadThreshold: number = 5; // seconds before end to preload next chunk
  private isPreloading: boolean = false;
  private preloadedChunkIndex: number | null = null;
  private totalDuration: number = 0;
  private currentGlobalTime: number = 0;
  private listeners: Map<ChunkEngineEvent, Set<EventCallback>> = new Map();

  constructor(chunks: VideoChunk[] = []) {
    if (chunks.length > 0) {
      this.initialize(chunks);
    }
  }

  public initialize(chunks: VideoChunk[]): void {
    // Sort chunks by order
    this.chunks = [...chunks].sort((a, b) => a.order - b.order);
    
    // Recalculate start times and total duration
    let accumulatedTime = 0;
    this.chunks.forEach((chunk) => {
      chunk.startTime = accumulatedTime;
      accumulatedTime += chunk.duration;
    });

    this.totalDuration = accumulatedTime;
    this.currentChunkIndex = 0;
    this.currentGlobalTime = 0;
    this.isPreloading = false;
    this.preloadedChunkIndex = null;
  }

  public initializeFromLinks(urls: string[], defaultChunkDurationSec: number = 720): void {
    if (!urls || urls.length === 0) {
      this.chunks = [];
      this.totalDuration = 0;
      return;
    }

    const builtChunks: VideoChunk[] = urls.filter(u => !!u.trim()).map((url, idx) => ({
      url: url.trim(),
      sizeMB: 50,
      order: idx + 1,
      startTime: idx * defaultChunkDurationSec,
      duration: defaultChunkDurationSec,
    }));

    this.initialize(builtChunks);
  }

  public getCurrentChunk(): VideoChunk | null {
    return this.chunks[this.currentChunkIndex] || null;
  }

  public getNextChunk(): VideoChunk | null {
    return this.chunks[this.currentChunkIndex + 1] || null;
  }

  public getChunkForTime(globalTime: number): { chunkIndex: number; offsetInChunk: number } {
    const targetTime = Math.max(0, Math.min(globalTime, this.totalDuration));
    
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      const chunkEnd = chunk.startTime + chunk.duration;
      if (targetTime >= chunk.startTime && (targetTime < chunkEnd || i === this.chunks.length - 1)) {
        return {
          chunkIndex: i,
          offsetInChunk: targetTime - chunk.startTime,
        };
      }
    }

    return { chunkIndex: 0, offsetInChunk: 0 };
  }

  public shouldPreload(timeInChunk: number): boolean {
    const currentChunk = this.getCurrentChunk();
    if (!currentChunk || !this.getNextChunk()) return false;
    const remainingInChunk = currentChunk.duration - timeInChunk;
    return remainingInChunk <= this.preloadThreshold;
  }

  public onChunkProgress(timeInChunk: number): void {
    const currentChunk = this.getCurrentChunk();
    if (!currentChunk) return;

    this.currentGlobalTime = currentChunk.startTime + timeInChunk;
    const percent = this.totalDuration > 0 ? (this.currentGlobalTime / this.totalDuration) * 100 : 0;

    const progressData: ChunkProgress = {
      currentTime: this.currentGlobalTime,
      totalDuration: this.totalDuration,
      percent: Math.min(100, Math.max(0, percent)),
      chunkIndex: this.currentChunkIndex,
      timeInChunk,
      chunkDuration: currentChunk.duration,
    };

    this.emit('progress', progressData);

    // Check if next chunk needs preloading
    if (this.shouldPreload(timeInChunk) && !this.isPreloading && this.preloadedChunkIndex !== this.currentChunkIndex + 1) {
      const nextChunk = this.getNextChunk();
      if (nextChunk) {
        this.isPreloading = true;
        this.preloadedChunkIndex = this.currentChunkIndex + 1;
        this.emit('preload', {
          nextChunk,
          nextChunkIndex: this.currentChunkIndex + 1,
        });
      }
    }
  }

  public onChunkComplete(): void {
    const nextChunk = this.getNextChunk();
    if (nextChunk) {
      const prevIndex = this.currentChunkIndex;
      this.currentChunkIndex++;
      this.isPreloading = false;

      this.emit('chunkChange', {
        fromChunkIndex: prevIndex,
        toChunkIndex: this.currentChunkIndex,
        chunk: nextChunk,
      });
    } else {
      this.emit('complete', {
        totalWatchedTime: this.totalDuration,
      });
    }
  }

  public seekTo(globalTime: number): { chunkIndex: number; offsetInChunk: number; chunkChanged: boolean } {
    const { chunkIndex, offsetInChunk } = this.getChunkForTime(globalTime);
    const chunkChanged = chunkIndex !== this.currentChunkIndex;

    this.currentChunkIndex = chunkIndex;
    this.currentGlobalTime = globalTime;
    this.isPreloading = false;

    if (chunkChanged) {
      this.preloadedChunkIndex = null;
      this.emit('chunkChange', {
        fromChunkIndex: this.currentChunkIndex,
        toChunkIndex: chunkIndex,
        chunk: this.getCurrentChunk(),
        seekOffset: offsetInChunk,
      });
    }

    return { chunkIndex, offsetInChunk, chunkChanged };
  }

  public getTotalDuration(): number {
    return this.totalDuration;
  }

  public getCurrentGlobalTime(): number {
    return this.currentGlobalTime;
  }

  public getChunkCount(): number {
    return this.chunks.length;
  }

  public updateChunkDuration(duration: number): void {
    const currentChunk = this.getCurrentChunk();
    if (currentChunk && duration > 0 && Math.abs(currentChunk.duration - duration) > 1) {
      currentChunk.duration = duration;
      let accumulatedTime = 0;
      this.chunks.forEach((chunk) => {
        chunk.startTime = accumulatedTime;
        accumulatedTime += chunk.duration;
      });
      this.totalDuration = accumulatedTime;
    }
  }

  // Event Emitter
  public on(event: ChunkEngineEvent, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: ChunkEngineEvent, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }
}
