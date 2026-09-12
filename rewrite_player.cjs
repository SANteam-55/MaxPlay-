const fs = require('fs');

const code = `import React, { useState, useRef, useEffect, useMemo } from 'react';
import Hls from 'hls.js';
import { Loader2, AlertTriangle, Play } from 'lucide-react';
import { PlayerControls } from './PlayerControls';
import { GestureHandler } from './GestureHandler';

interface InlinePlayerProps {
  videoUrl?: string;
  qualityLinks?: Record<string, string>;
  videoSources?: Record<string, any>;
  chunks?: any[];
  posterUrl?: string;
  title?: string;
  initialTime?: number;
  autoPlay?: boolean;
  activeLanguage?: string;
  onLanguageChange?: (lang: string) => void;
  onProgress?: (time: number, isFinished?: boolean) => void;
  onComplete?: () => void;
  onNext?: () => void;
  onBack?: () => void;
}

export const InlinePlayer: React.FC<InlinePlayerProps> = ({
  videoUrl,
  qualityLinks,
  videoSources,
  posterUrl,
  title,
  initialTime = 0,
  autoPlay = false,
  activeLanguage,
  onLanguageChange,
  onProgress,
  onComplete,
  onNext,
  onBack,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Derive final active URL (Simplify: pick 1080p if available, else first working link)
  const activeVideoUrl = useMemo(() => {
    if (qualityLinks) {
      if (qualityLinks['1080p']) return qualityLinks['1080p'];
      if (qualityLinks['720p']) return qualityLinks['720p'];
      const firstKey = Object.keys(qualityLinks)[0];
      if (firstKey) return qualityLinks[firstKey];
    }
    if (videoUrl) return videoUrl;
    return '';
  }, [qualityLinks, videoUrl, activeLanguage]);

  // Setup HLS or Native Video
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeVideoUrl) return;

    setIsLoading(true);
    setPlaybackError(null);

    // Destroy old HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = activeVideoUrl.toLowerCase().includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ startPosition: initialTime });
      hlsRef.current = hls;
      hls.loadSource(activeVideoUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoPlay || hasStarted) {
          video.play().catch(e => console.warn('Autoplay blocked:', e));
        }
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) setPlaybackError('Stream failed to load.');
      });
    } else {
      // Native playback (MP4 or Safari HLS)
      video.src = activeVideoUrl;
      video.currentTime = initialTime;
      video.load();
      if (autoPlay || hasStarted) {
        video.play().then(() => setIsLoading(false)).catch(e => {
          console.warn('Native autoplay blocked:', e);
          setIsLoading(false);
        });
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [activeVideoUrl]); // Only re-run when actual source URL changes

  // Fullscreen listener
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      setHasStarted(true);
      video.play().catch(console.error);
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  return (
    <div className="relative w-full h-full bg-black group overflow-hidden flex items-center justify-center">
      <GestureHandler
        onSingleTap={() => setShowControls(prev => !prev)}
        onDoubleTapRewind={() => handleSeek(Math.max(0, currentTime - 10))}
        onDoubleTapForward={() => handleSeek(Math.min(duration, currentTime + 10))}
      >
        {/* The Native Video Tag */}
        <video
          ref={videoRef}
          playsInline
          className="w-full h-full object-contain cursor-pointer"
          onClick={handlePlayPause}
          onPlay={() => { setIsPlaying(true); setHasStarted(true); setIsLoading(false); }}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={(e) => {
            const t = e.currentTarget.currentTime;
            setCurrentTime(t);
            onProgress?.(t);
          }}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
          onEnded={() => {
            setIsPlaying(false);
            setShowControls(true);
            onProgress?.(currentTime, true);
            onComplete?.();
          }}
          onError={() => {
            setIsLoading(false);
            setPlaybackError('Failed to load video.');
          }}
        />

        {/* Poster Overlay */}
        {!hasStarted && !isPlaying && activeVideoUrl && (
          <div 
            onClick={handlePlayPause}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 bg-cover bg-center cursor-pointer transition-all duration-300"
            style={{ backgroundImage: posterUrl ? \`url(\${posterUrl})\` : undefined }}
          >
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative z-30 flex items-center justify-center w-20 h-20 bg-purple-600 rounded-full hover:scale-110 transition-transform">
              <Play className="w-10 h-10 fill-white translate-x-1" />
            </div>
          </div>
        )}

        {/* Buffering Loader */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 pointer-events-none">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          </div>
        )}

        {/* Error Overlay */}
        {(playbackError || !activeVideoUrl) && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-6 text-center text-white">
            <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
            <p className="font-semibold text-lg">{playbackError || 'No Video Stream Available'}</p>
          </div>
        )}

        {/* Custom Controls */}
        {hasStarted && (
          <PlayerControls
            isVisible={showControls}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            title={title}
            isFullscreen={isFullscreen}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onRewind10={() => handleSeek(Math.max(0, currentTime - 10))}
            onForward10={() => handleSeek(Math.min(duration, currentTime + 10))}
            onNext={onNext}
            onFullscreenToggle={handleFullscreen}
            onBack={isFullscreen ? handleFullscreen : onBack}
          />
        )}
      </GestureHandler>
    </div>
  );
};
`
fs.writeFileSync('src/components/player/InlinePlayer.tsx', code);
console.log('Written to src/components/player/InlinePlayer.tsx');
