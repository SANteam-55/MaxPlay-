const fs = require('fs');
const code = `import React, { useState, useRef, useEffect, useMemo } from 'react';
import Hls from 'hls.js';
import { Loader2, AlertTriangle, Play, X, Check } from 'lucide-react';
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
  
  // Basic states
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Advanced features states
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [currentLanguage, setCurrentLanguage] = useState<string>(activeLanguage || '');
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  
  // Menu modals state
  const [activeMenu, setActiveMenu] = useState<'language' | 'quality' | 'speed' | null>(null);

  // Derive available languages
  const availableLanguages = useMemo(() => {
    if (videoSources && typeof videoSources === 'object') {
      return Object.keys(videoSources);
    }
    return [];
  }, [videoSources]);

  // Set initial language if not set
  useEffect(() => {
    if (!currentLanguage && availableLanguages.length > 0) {
      setCurrentLanguage(activeLanguage || availableLanguages[0]);
    }
  }, [availableLanguages, currentLanguage, activeLanguage]);

  // Derive available qualities based on selected language
  const availableQualities = useMemo(() => {
    let links: Record<string, string> | null = null;
    
    if (videoSources && currentLanguage && videoSources[currentLanguage]) {
      links = videoSources[currentLanguage];
    } else if (qualityLinks) {
      links = qualityLinks;
    }

    if (links && typeof links === 'object') {
      return ['auto', ...Object.keys(links)]; // 'auto' will pick best
    }
    return ['auto'];
  }, [videoSources, qualityLinks, currentLanguage]);

  // Pick the best default quality if 'auto' is selected, or explicitly selected
  const activeVideoUrl = useMemo(() => {
    let links: Record<string, string> | null = null;
    
    if (videoSources && currentLanguage && videoSources[currentLanguage]) {
      links = videoSources[currentLanguage];
    } else if (qualityLinks) {
      links = qualityLinks;
    }

    if (links && typeof links === 'object') {
      if (currentQuality !== 'auto' && links[currentQuality]) {
        return links[currentQuality];
      }
      
      // Auto selection logic
      if (links['1080p']) return links['1080p'];
      if (links['720p']) return links['720p'];
      const firstKey = Object.keys(links)[0];
      if (firstKey) return links[firstKey];
    }

    if (videoUrl) return videoUrl;
    return '';
  }, [qualityLinks, videoSources, videoUrl, currentLanguage, currentQuality]);

  // Setup HLS or Native Video
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeVideoUrl) return;

    // Save current time to resume smoothly
    const savedTime = video.currentTime > 0 ? video.currentTime : initialTime;

    setIsLoading(true);
    setPlaybackError(null);

    // Destroy old HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = activeVideoUrl.toLowerCase().includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ startPosition: savedTime });
      hlsRef.current = hls;
      hls.loadSource(activeVideoUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.playbackRate = playbackRate;
        if (autoPlay || hasStarted) {
          video.play().catch(e => console.warn('Autoplay blocked:', e));
        }
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
            setIsLoading(false);
            setPlaybackError('Stream failed to load: ' + data.type);
        }
      });
    } else {
      // Native playback
      video.src = activeVideoUrl;
      video.currentTime = savedTime;
      video.playbackRate = playbackRate;
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
  }, [activeVideoUrl]); 

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
  
  const handlePipToggle = async () => {
    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else if (videoRef.current && document.pictureInPictureEnabled) {
            await videoRef.current.requestPictureInPicture();
        }
    } catch (e) {
        console.error("PiP error", e);
    }
  };

  const changePlaybackRate = (rate: number) => {
      setPlaybackRate(rate);
      if (videoRef.current) {
          videoRef.current.playbackRate = rate;
      }
      setActiveMenu(null);
  };
  
  const changeLanguage = (lang: string) => {
      setCurrentLanguage(lang);
      setCurrentQuality('auto');
      if (onLanguageChange) onLanguageChange(lang);
      setActiveMenu(null);
  };
  
  const changeQuality = (qual: string) => {
      setCurrentQuality(qual);
      setActiveMenu(null);
  };

  // Modals UI
  const renderMenuModal = () => {
      if (!activeMenu) return null;
      
      let title = "";
      let options: {label: string, value: any, active: boolean}[] = [];
      let onSelect = (val: any) => {};
      
      if (activeMenu === 'speed') {
          title = "Playback Speed";
          options = [0.5, 0.75, 1, 1.25, 1.5, 2].map(r => ({ label: r === 1 ? 'Normal' : \`\${r}x\`, value: r, active: playbackRate === r }));
          onSelect = changePlaybackRate;
      } else if (activeMenu === 'language') {
          title = "Audio Language";
          options = availableLanguages.map(l => ({ label: l, value: l, active: currentLanguage === l }));
          onSelect = changeLanguage;
      } else if (activeMenu === 'quality') {
          title = "Video Quality";
          options = availableQualities.map(q => ({ label: q === 'auto' ? 'Auto' : q, value: q, active: currentQuality === q }));
          onSelect = changeQuality;
      }

      return (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => setActiveMenu(null)}>
              <div className="bg-[#111] border border-white/10 rounded-2xl w-64 max-h-[80%] overflow-y-auto shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-4 border-b border-white/10">
                      <h3 className="text-white font-semibold">{title}</h3>
                      <button onClick={() => setActiveMenu(null)} className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="flex flex-col p-2">
                      {options.map((opt, i) => (
                          <button 
                              key={i} 
                              onClick={() => onSelect(opt.value)}
                              className={\`flex items-center justify-between p-3 rounded-xl transition \${opt.active ? 'bg-purple-600/20 text-purple-400' : 'text-white/80 hover:bg-white/5'}\`}
                          >
                              <span className="font-medium text-sm">{opt.label}</span>
                              {opt.active && <Check className="w-4 h-4" />}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="relative w-full h-full bg-black group overflow-hidden flex items-center justify-center">
      {renderMenuModal()}
      <GestureHandler
        isLocked={false}
        onToggleControls={() => { if (!activeMenu) setShowControls(prev => !prev); }}
        onDoubleTapRewind={() => handleSeek(Math.max(0, currentTime - 10))}
        onDoubleTapForward={() => handleSeek(Math.min(duration, currentTime + 10))}
        onChangeBrightness={() => {}}
        onChangeVolume={() => {}}
      >
        <video referrerPolicy="no-referrer"
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
          onError={(e: any) => {
            setIsLoading(false);
            const err = e.currentTarget.error;
            let msg = "Unknown Error";
            if (err) {
              switch (err.code) {
                case 1: msg = "Aborted"; break;
                case 2: msg = "Network Error"; break;
                case 3: msg = "Decode Error"; break;
                case 4: msg = "Format Not Supported / URL Expired"; break;
                default: msg = "Code " + err.code;
              }
              if (err.message) msg += " (" + err.message + ")";
            }
            console.error("Video Error Details:", err ? err.code : "null");
            setPlaybackError('Failed to load video: ' + msg);
          }}
        />

        {!hasStarted && !isPlaying && activeVideoUrl && (
          <div 
            onClick={handlePlayPause}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 bg-cover bg-center cursor-pointer transition-all duration-300"
            style={{ backgroundImage: posterUrl ? \`url(\${posterUrl})\` : undefined }}
          >
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative z-30 flex items-center justify-center w-20 h-20 bg-[#8B5CF6] rounded-full hover:scale-110 transition-transform shadow-lg shadow-purple-600/30">
              <Play className="w-10 h-10 fill-white translate-x-1" />
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 pointer-events-none">
            <Loader2 className="w-12 h-12 text-[#8B5CF6] animate-spin" />
          </div>
        )}

        {(playbackError || !activeVideoUrl) && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-6 text-center text-white pointer-events-auto">
            <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
            <p className="font-semibold text-lg mb-2">{playbackError || 'No Video Stream Available'}</p>
            <button onClick={() => { setPlaybackError(null); handlePlayPause(); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition">Retry</button>
          </div>
        )}

        {hasStarted && (
          <PlayerControls
            isVisible={showControls && !activeMenu}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            title={title}
            isFullscreen={isFullscreen}
            currentLanguage={currentLanguage}
            currentQuality={currentQuality}
            playbackRate={playbackRate}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onRewind10={() => handleSeek(Math.max(0, currentTime - 10))}
            onForward10={() => handleSeek(Math.min(duration, currentTime + 10))}
            onNext={onNext}
            onFullscreenToggle={handleFullscreen}
            onPipToggle={handlePipToggle}
            onSpeedPress={() => setActiveMenu('speed')}
            onLanguagePress={availableLanguages.length > 0 ? () => setActiveMenu('language') : undefined}
            onQualityPress={availableQualities.length > 0 ? () => setActiveMenu('quality') : undefined}
            onBack={isFullscreen ? handleFullscreen : onBack}
          />
        )}
      </GestureHandler>
    </div>
  );
};
`
fs.writeFileSync('src/components/player/InlinePlayer.tsx', code);
