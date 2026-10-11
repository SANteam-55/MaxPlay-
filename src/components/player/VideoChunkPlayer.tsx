import Hls from "hls.js";
import React, { useRef, useEffect } from 'react';
import { VideoChunk } from '../../services/ChunkEngine';
import { SmartStreamService } from '../../services/smartStreamService';

interface VideoChunkPlayerProps {
  currentChunk: VideoChunk | null;
  nextChunk: VideoChunk | null;
  isPreloadingNext: boolean;
  isPlaying: boolean;
  playbackRate: number;
  initialOffsetInChunk?: number;
  seekOffsetInChunk?: number | null;
  onTimeUpdate: (timeInChunk: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  onChunkEnded: () => void;
  onBuffering: (isBuffering: boolean) => void;
  onError: (error: string) => void;
}

export const VideoChunkPlayer: React.FC<VideoChunkPlayerProps> = ({
  currentChunk,
  nextChunk,
  isPreloadingNext,
  isPlaying,
  playbackRate,
  initialOffsetInChunk = 0,
  seekOffsetInChunk = null,
  onTimeUpdate,
  onLoadedMetadata,
  onChunkEnded,
  onBuffering,
  onError,
}) => {
  const primaryVideoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const initializedChunkUrlRef = useRef<string | null>(null);
  const bufferTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Play / Pause synchronization
  useEffect(() => {
    if (!primaryVideoRef.current) return;

    primaryVideoRef.current.playbackRate = playbackRate;
    if (isPlaying) {
      const promise = primaryVideoRef.current.play();
      if (promise !== undefined) {
        promise.catch((err) => {
          if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
            console.warn('Chunk playback error:', err);
          }
        });
      }
    } else {
      primaryVideoRef.current.pause();
    }
  }, [isPlaying, playbackRate, currentChunk?.url]);

  // Cleanup HLS
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);

  // Handle source initialization
  useEffect(() => {
    if (!currentChunk?.url || !primaryVideoRef.current) return;

    let isCancelled = false;

    if (initializedChunkUrlRef.current !== currentChunk.url) {
      initializedChunkUrlRef.current = currentChunk.url;
      onBuffering(true);

      const setupPlayback = (playUrl: string) => {
        if (isCancelled || !primaryVideoRef.current) return;

        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }

        const attemptPlay = () => {
          if (isPlaying && primaryVideoRef.current) {
            const promise = primaryVideoRef.current.play();
            if (promise !== undefined) {
              promise.catch((err) => {
                if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                  onError('Failed to start playback');
                }
              });
            }
          }
        };

        const isHls = playUrl.toLowerCase().includes('.m3u8');

        if (isHls && Hls.isSupported()) {
          primaryVideoRef.current.removeAttribute('src');
          primaryVideoRef.current.load();

          const hls = new Hls({
            startPosition: seekOffsetInChunk !== null ? seekOffsetInChunk : (initialOffsetInChunk > 0 ? initialOffsetInChunk : -1),
            maxBufferLength: 30,
            enableWorker: true,
          });
          hlsRef.current = hls;

          hls.loadSource(playUrl);
          hls.attachMedia(primaryVideoRef.current);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            attemptPlay();
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  onError('Fatal media streaming error occurred.');
                  break;
              }
            }
          });
        } else if (isHls && primaryVideoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          primaryVideoRef.current.src = playUrl;
          primaryVideoRef.current.load();
          attemptPlay();
        } else {
          // Direct MP4 / WebM video stream
          primaryVideoRef.current.src = playUrl;
          primaryVideoRef.current.load();
          attemptPlay();
        }
      };

      if (SmartStreamService.isExtractableSource(currentChunk.url)) {
        SmartStreamService.resolveStream(currentChunk.url)
          .then((res) => setupPlayback(res.streamUrl))
          .catch((err) => {
            const fallback = SmartStreamService.getEmbedUrl(currentChunk.url);
            if (fallback) {
              setupPlayback(fallback);
            } else {
              onError(err?.message || 'Stream extraction failed');
            }
          });
      } else {
        setupPlayback(currentChunk.url);
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [currentChunk?.url]);

  // Handle explicit user seeking
  useEffect(() => {
    if (primaryVideoRef.current && seekOffsetInChunk !== null && seekOffsetInChunk !== undefined) {
      primaryVideoRef.current.currentTime = seekOffsetInChunk;
    }
  }, [seekOffsetInChunk]);

  const handleLoadedData = () => {
    if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    onBuffering(false);

    if (primaryVideoRef.current && initialOffsetInChunk > 0) {
      if (Math.abs(primaryVideoRef.current.currentTime - initialOffsetInChunk) > 1) {
        primaryVideoRef.current.currentTime = initialOffsetInChunk;
      }
    }
  };

  const handleWaiting = () => {
    if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    bufferTimerRef.current = setTimeout(() => {
      if (primaryVideoRef.current && primaryVideoRef.current.readyState < 3) {
        onBuffering(true);
      }
    }, 300);
  };

  const handlePlaying = () => {
    if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    onBuffering(false);
  };

  return (
    <div className="relative h-full w-full bg-black overflow-hidden flex items-center justify-center">
      {/* Primary Active Video Element */}
      {currentChunk ? (
        <video
          ref={primaryVideoRef}
          src={(currentChunk?.url && !currentChunk.url.toLowerCase().includes('.m3u8')) ? currentChunk.url : undefined}
          referrerPolicy="no-referrer"
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-contain pointer-events-none"
          onLoadedMetadata={() => {
            if (primaryVideoRef.current && onLoadedMetadata && primaryVideoRef.current.duration > 0) {
              onLoadedMetadata(primaryVideoRef.current.duration);
            }
          }}
          onLoadedData={handleLoadedData}
          onCanPlay={handleLoadedData}
          onTimeUpdate={() => {
            if (primaryVideoRef.current) {
              onTimeUpdate(primaryVideoRef.current.currentTime);
              if (primaryVideoRef.current.readyState >= 3) {
                onBuffering(false);
              }
            }
          }}
          onEnded={() => {
            onChunkEnded();
          }}
          onWaiting={handleWaiting}
          onPlaying={handlePlaying}
          onError={() => onError('Failed to load video stream')}
        />
      ) : (
        <div className="text-sm text-[#A1A1AA]">No video stream source</div>
      )}
    </div>
  );
};
