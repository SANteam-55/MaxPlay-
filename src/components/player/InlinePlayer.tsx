import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  Loader2, 
  AlertTriangle, 
  Play, 
  SkipForward, 
  FastForward,
  Sun,
  SunMedium,
  Volume2,
  Volume1,
  VolumeX,
  Zap,
  ArrowLeft
} from 'lucide-react';
import { PlayerControls } from './PlayerControls';
import { GestureHandler } from './GestureHandler';
import { SpeedDrawer } from './SpeedDrawer';
import { QualityDrawer } from './QualityDrawer';
import { AudioLangDrawer } from './AudioLangDrawer';
import { SpeedCapsuleHUD } from './SpeedCapsuleHUD';
import { adManager } from '../../services/adService';
import { useAuth } from '../../context/AuthContext';
import { SmartStreamService } from '../../services/smartStreamService';
import { NativeBridgeService } from '../../services/nativeBridgeService';
import { ClientHlsDownloader } from '../../services/clientHlsDownloader';

const isQualityLabelKey = (val?: string): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^(\d{3,4}p|4k|2k|8k|hd|fhd|uhd|sd|auto)$/i.test(val.trim());
};

const findMatchingHlsLevelIndex = (levels: any[], qualStr?: string): number => {
  if (!levels || levels.length === 0 || !qualStr || qualStr.toLowerCase() === 'auto') return -1;
  const cleanQ = qualStr.toLowerCase().trim();
  const targetHeight = parseInt(cleanQ.replace(/\D/g, ''), 10);

  // 1. Exact classified label match (handles cinematic widescreen 1920x800 = 1080p, 1280x534 = 720p, 854x356 = 480p, 640x268 = 360p)
  const classifiedIdx = levels.findIndex((lvl: any) => {
    const label = ClientHlsDownloader.classifyResolutionLabel(
      lvl.width || 0,
      lvl.height || 0,
      lvl.bitrate || 0
    ).toLowerCase();
    return label === cleanQ;
  });
  if (classifiedIdx !== -1) return classifiedIdx;

  // 2. Exact height match
  if (!isNaN(targetHeight) && targetHeight > 0) {
    const exactHeightIdx = levels.findIndex((lvl: any) => lvl.height === targetHeight);
    if (exactHeightIdx !== -1) return exactHeightIdx;

    // 3. Closest nominal height match
    let bestIdx = 0;
    let bestDiff = Infinity;
    levels.forEach((lvl: any, idx: number) => {
      const label = ClientHlsDownloader.classifyResolutionLabel(
        lvl.width || 0,
        lvl.height || 0,
        lvl.bitrate || 0
      );
      const nomH = parseInt(label.replace(/\D/g, ''), 10) || lvl.height || 720;
      const diff = Math.abs(nomH - targetHeight);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }
  return -1;
};

// Comprehensive ISO 639 & friendly language label mapper
export const formatLanguageLabel = (name?: string, lang?: string, index?: number): string => {
  const code = (lang || '').toLowerCase().trim();
  const rawName = (name || '').trim();

  const ISO_MAP: Record<string, string> = {
    hin: 'Hindi',
    hi: 'Hindi',
    eng: 'English',
    en: 'English',
    jpn: 'Japanese',
    ja: 'Japanese',
    tam: 'Tamil',
    ta: 'Tamil',
    tel: 'Telugu',
    te: 'Telugu',
    mal: 'Malayalam',
    ml: 'Malayalam',
    kan: 'Kannada',
    kn: 'Kannada',
    kor: 'Korean',
    ko: 'Korean',
    spa: 'Spanish',
    es: 'Spanish',
    fra: 'French',
    fr: 'French',
    deu: 'German',
    de: 'German',
    ita: 'Italian',
    it: 'Italian',
    rus: 'Russian',
    ru: 'Russian',
    por: 'Portuguese',
    pt: 'Portuguese',
    ara: 'Arabic',
    ar: 'Arabic',
    zho: 'Chinese',
    zh: 'Chinese',
  };

  if (ISO_MAP[code]) return ISO_MAP[code];

  if (rawName) {
    const lower = rawName.toLowerCase();
    for (const [key, val] of Object.entries(ISO_MAP)) {
      if (lower === key || lower.includes(val.toLowerCase()) || lower.includes(key)) {
        return val;
      }
    }
    return rawName;
  }

  return code.toUpperCase() || `Audio Track ${(index ?? 0) + 1}`;
};

interface InlinePlayerProps {
  videoUrl?: string;
  qualityLinks?: Record<string, string>;
  videoSources?: Record<string, any>;
  availableLanguages?: string[];
  chunks?: any[];
  posterUrl?: string;
  title?: string;
  streamKey?: string;
  initialTime?: number;
  autoPlay?: boolean;
  activeLanguage?: string;
  activeQuality?: string;
  onLanguageChange?: (lang: string) => void;
  onQualityChange?: (qual: string) => void;
  onProgress?: (time: number, isFinished?: boolean, totalDuration?: number) => void;
  onPause?: (time: number, totalDuration?: number) => void;
  onDuration?: (duration: number) => void;
  onComplete?: () => void;
  onNext?: () => void;
  onBack?: () => void;
  timeOffset?: number;
  globalDuration?: number;
  onGlobalSeek?: (targetTime: number) => void;
  skipMarkers?: any;
  isSmartHls?: boolean;
  crossServerQualities?: string[];
  onDiscoveredAudioTracks?: (tracks: string[]) => void;
  onDiscoveredQualities?: (qualities: string[]) => void;
}

export const InlinePlayer: React.FC<InlinePlayerProps> = ({
  videoUrl,
  qualityLinks,
  videoSources,
  availableLanguages: propAvailableLanguages,
  posterUrl,
  title,
  streamKey,
  initialTime = 0,
  autoPlay = false,
  activeLanguage,
  activeQuality = 'auto',
  onLanguageChange,
  onQualityChange,
  onProgress,
  onPause,
  onDuration,
  onComplete,
  onNext,
  onBack,
  timeOffset = 0,
  globalDuration,
  onGlobalSeek,
  skipMarkers,
  isSmartHls,
  crossServerQualities = [],
  onDiscoveredAudioTracks,
  onDiscoveredQualities,
}) => {
  const { user } = useAuth();
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const prevStreamKeyRef = useRef<string | undefined>(streamKey);
  
  // Gesture and volume states (synced with real Android hardware inside APK)
  const [brightness, setBrightness] = useState<number>(() => {
    const nativeB = NativeBridgeService.getNativeBrightness();
    return nativeB !== null && nativeB > 0 ? nativeB : 100;
  });
  const [volume, setVolume] = useState<number>(() => {
    const nativeV = NativeBridgeService.getNativeVolume();
    return nativeV !== null && nativeV >= 0 ? nativeV : 100;
  });
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const [capsuleSpeed, setCapsuleSpeed] = useState<number>(2.0);
  const [capsuleProgress, setCapsuleProgress] = useState<number>(66.66);
  const prevSpeedRef = useRef<number>(1);

  // Basic states
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Advanced features states
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [currentLanguage, setCurrentLanguage] = useState<string>(activeLanguage || '');
  const [currentQuality, setCurrentQuality] = useState<string>(activeQuality || 'auto');

  // Smart Stream & Dynamic HLS states
  const [resolvedStreamUrl, setResolvedStreamUrl] = useState<string>('');
  const [isResolvingStream, setIsResolvingStream] = useState<boolean>(false);
  const [hlsQualities, setHlsQualities] = useState<string[]>([]);
  const [hlsAudioTracks, setHlsAudioTracks] = useState<{ id: number; name: string; lang: string }[]>([]);
  const [actualQuality, setActualQuality] = useState<string>('');
  const isHlsStreamRef = useRef<boolean>(false);
  const streamRetryAttemptedRef = useRef<boolean>(false);
  
  // Menu drawers state
  const [activeMenu, setActiveMenu] = useState<'language' | 'quality' | 'speed' | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressEmitRef = useRef<number>(0);
  const lastTimeStateUpdateRef = useRef<number>(0);
  const recoverDecodingErrorDateRef = useRef<number>(0);

  // Normalize skipMarkers from any structure or format (numbers, strings, mm:ss)
  const normalizedSkipMarkers = useMemo(() => {
    let parsedMarkers = skipMarkers;
    
    if (typeof parsedMarkers === 'string') {
      try {
        parsedMarkers = JSON.parse(parsedMarkers);
      } catch (e) {
        console.warn('Failed to parse skipMarkers string:', e);
        return undefined;
      }
    }

    if (!parsedMarkers || typeof parsedMarkers !== 'object') return undefined;

    const parseSec = (val: any) => {
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      if (typeof val === 'string') {
        if (val.includes(':')) {
          const parts = val.split(':').map(p => Number(p.trim()));
          if (parts.some(isNaN)) return 0;
          if (parts.length === 2) return (parts[0] * 60) + parts[1];
          if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
        }
        const n = Number(val.trim());
        return isNaN(n) ? 0 : n;
      }
      return 0;
    };

    const res: { intro?: { start: number; end: number }; outro?: { start: number; end: number }; credits?: { start: number; end: number } } = {};

    if (Array.isArray(parsedMarkers)) {
      parsedMarkers.forEach((m: any) => {
        if (!m || !m.type) return;
        const s = parseSec(m.start ?? m.startTime);
        const e = parseSec(m.end ?? m.endTime);
        if (e > s && e > 0) {
          const t = m.type.toLowerCase();
          if (t.includes('intro')) res.intro = { start: s, end: e };
          if (t.includes('outro')) res.outro = { start: s, end: e };
          if (t.includes('credit')) res.credits = { start: s, end: e };
        }
      });
    } else {
      const introStart = parseSec(parsedMarkers.intro?.start ?? (parsedMarkers as any).introStart ?? (parsedMarkers as any).intro_start);
      const introEnd = parseSec(parsedMarkers.intro?.end ?? (parsedMarkers as any).introEnd ?? (parsedMarkers as any).intro_end);
      const outroStart = parseSec(parsedMarkers.outro?.start ?? (parsedMarkers as any).outroStart ?? (parsedMarkers as any).outro_start);
      const outroEnd = parseSec(parsedMarkers.outro?.end ?? (parsedMarkers as any).outroEnd ?? (parsedMarkers as any).outro_end);
      const creditsStart = parseSec(parsedMarkers.credits?.start ?? (parsedMarkers as any).creditsStart ?? (parsedMarkers as any).credits_start);
      const creditsEnd = parseSec(parsedMarkers.credits?.end ?? (parsedMarkers as any).creditsEnd ?? (parsedMarkers as any).credits_end);

      if (introEnd > introStart && introEnd > 0) res.intro = { start: introStart, end: introEnd };
      if (outroEnd > outroStart && outroEnd > 0) res.outro = { start: outroStart, end: outroEnd };
      if (creditsEnd > creditsStart && creditsEnd > 0) res.credits = { start: creditsStart, end: creditsEnd };
    }

    return Object.keys(res).length > 0 ? res : undefined;
  }, [skipMarkers]);

  // Active Skip Marker based on current global playback time
  const activeSkipMarker = useMemo(() => {
    if (!normalizedSkipMarkers) return null;
    const currentGlobal = timeOffset + currentTime;
    const { intro, outro, credits } = normalizedSkipMarkers;
    
    console.log('[SkipDebug] Current Global Time:', currentGlobal, 'Markers:', normalizedSkipMarkers);

    if (intro && currentGlobal >= intro.start && currentGlobal < intro.end) {
      return { type: 'intro', label: 'Skip Intro', end: intro.end };
    }
    if (outro && currentGlobal >= outro.start && currentGlobal < outro.end) {
      return { type: 'outro', label: 'Skip Outro', end: outro.end };
    }
    if (credits && currentGlobal >= credits.start && currentGlobal < credits.end) {
      return { type: 'credits', label: 'Skip Credits', end: credits.end };
    }
    return null;
  }, [normalizedSkipMarkers, timeOffset, currentTime]);

  // Crunchyroll / Netflix style 5-second auto-popup on entering Intro / Outro marker
  const [autoShowSkip, setAutoShowSkip] = useState(false);
  const autoHideSkipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveMarkerKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeSkipMarker || isLocked) {
      if (lastActiveMarkerKeyRef.current !== null) {
        lastActiveMarkerKeyRef.current = null;
        setAutoShowSkip(false);
        if (autoHideSkipTimeoutRef.current) {
          clearTimeout(autoHideSkipTimeoutRef.current);
          autoHideSkipTimeoutRef.current = null;
        }
      }
      return;
    }

    const markerKey = `${activeSkipMarker.type}_${activeSkipMarker.end}`;
    if (lastActiveMarkerKeyRef.current !== markerKey) {
      lastActiveMarkerKeyRef.current = markerKey;
      setAutoShowSkip(true);

      if (autoHideSkipTimeoutRef.current) {
        clearTimeout(autoHideSkipTimeoutRef.current);
      }
      // Stay visible for 5 seconds automatically, then gracefully hide if user didn't open controls
      autoHideSkipTimeoutRef.current = setTimeout(() => {
        setAutoShowSkip(false);
      }, 5000);
    }
  }, [activeSkipMarker, isLocked]);

  useEffect(() => {
    return () => {
      if (autoHideSkipTimeoutRef.current) {
        clearTimeout(autoHideSkipTimeoutRef.current);
      }
    };
  }, []);

  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
    if (isPlaying && !activeMenu && !isLocked) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  }, [isPlaying, activeMenu, isLocked]);

  // Handle gestures
  const showIndicator = (type: 'brightness' | 'volume') => {
    if (type === 'brightness') {
      setShowBrightnessIndicator(true);
      setShowVolumeIndicator(false);
    } else {
      setShowVolumeIndicator(true);
      setShowBrightnessIndicator(false);
    }
    
    if (indicatorTimeoutRef.current) clearTimeout(indicatorTimeoutRef.current);
    indicatorTimeoutRef.current = setTimeout(() => {
      setShowBrightnessIndicator(false);
      setShowVolumeIndicator(false);
    }, 1500);
  };

  const handleBrightnessChange = useCallback((delta: number) => {
    setBrightness((prev) => {
      const newVal = Math.round(Math.max(10, Math.min(200, prev + delta)));
      // Control real Android phone screen brightness inside APK (0-100%)
      if (NativeBridgeService.isRunningInKotlinApp()) {
        NativeBridgeService.setNativeBrightness(Math.min(100, Math.max(5, newVal)));
      }
      return newVal;
    });
    showIndicator('brightness');
  }, []);

  const handleVolumeChange = useCallback((delta: number) => {
    setVolume((prev) => {
      const newVal = Math.round(Math.max(0, Math.min(200, prev + delta)));
      // Control real Android phone hardware media volume inside APK (0-100%)
      if (NativeBridgeService.isRunningInKotlinApp()) {
        NativeBridgeService.setNativeVolume(Math.min(100, Math.max(0, newVal)));
      }
      return newVal;
    });
    showIndicator('volume');
  }, []);

  // Apply volume changes directly to native HTML5 video element (when running in APK, hardware AudioManager handles 0-100% so keep HTML5 video at 1.0 unless muted)
  useEffect(() => {
    if (!videoRef.current) return;
    if (NativeBridgeService.isRunningInKotlinApp()) {
      videoRef.current.volume = volume === 0 ? 0 : 1;
      videoRef.current.muted = volume === 0;
    } else {
      const clampedVolume = Math.min(1, Math.max(0, volume / 100));
      videoRef.current.volume = clampedVolume;
      videoRef.current.muted = volume === 0;
    }
  }, [volume]);

  const handleLongPressStart = useCallback(() => {
    if (videoRef.current && !isFastForwarding) {
      prevSpeedRef.current = videoRef.current.playbackRate || 1;
      videoRef.current.playbackRate = 2.0;
      setPlaybackRate(2.0);
      setCapsuleSpeed(2.0);
      setCapsuleProgress(66.66);
      setIsFastForwarding(true);
    }
  }, [isFastForwarding]);

  const handleLongPressMove = useCallback((deltaX: number) => {
    // Starting anchor progress is 66.66% (2.0x Fast)
    // Left drag (negative deltaX) moves down towards 0.5x Slow (0%)
    // Right drag (positive deltaX) moves up towards 3.0x Max (100%)
    const newProgress = Math.max(0, Math.min(100, 66.66 + deltaX * 0.35));

    let calcSpeed = 1.0;
    if (newProgress <= 33.33) {
      // 0% to 33.33% maps smoothly from 0.5x to 1.0x
      calcSpeed = 0.5 + (newProgress / 33.33) * 0.5;
    } else if (newProgress <= 66.66) {
      // 33.33% to 66.66% maps smoothly from 1.0x to 2.0x
      calcSpeed = 1.0 + ((newProgress - 33.33) / 33.33) * 1.0;
    } else {
      // 66.66% to 100% maps smoothly from 2.0x to 3.0x
      calcSpeed = 2.0 + ((newProgress - 66.66) / 33.34) * 1.0;
    }

    // Snap cleanly near standard milestone points (0.5x, 1.0x, 2.0x, 3.0x)
    let finalSpeed = Math.round(calcSpeed * 10) / 10;
    if (Math.abs(calcSpeed - 0.5) < 0.08) finalSpeed = 0.5;
    else if (Math.abs(calcSpeed - 1.0) < 0.08) finalSpeed = 1.0;
    else if (Math.abs(calcSpeed - 2.0) < 0.08) finalSpeed = 2.0;
    else if (Math.abs(calcSpeed - 3.0) < 0.08) finalSpeed = 3.0;

    finalSpeed = Math.max(0.5, Math.min(3.0, finalSpeed));

    setCapsuleProgress(newProgress);
    setCapsuleSpeed(finalSpeed);

    if (videoRef.current) {
      videoRef.current.playbackRate = finalSpeed;
    }
    setPlaybackRate(finalSpeed);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    // Release resets back to normal speed (1.0x) smoothly
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.0;
    }
    setPlaybackRate(1.0);
    setIsFastForwarding(false);
    setCapsuleSpeed(2.0);
    setCapsuleProgress(66.66);
  }, []);

  // Keep controls timer in sync with playback state and menus
  useEffect(() => {
    if (showControls && isPlaying && !activeMenu && !isLocked) {
      resetControlsTimeout();
    } else if (!isPlaying || activeMenu || isLocked) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    };
  }, [showControls, isPlaying, activeMenu, isLocked, resetControlsTimeout]);

  // Sync active video playing state with Native Android PiP Bridge and In-App Miniplayer state
  useEffect(() => {
    const autoPipEnabled = localStorage.getItem('maxplay_auto_miniplayer') !== 'false';
    NativeBridgeService.setAutoPipEnabled(autoPipEnabled);
    NativeBridgeService.setVideoPlayingState(Boolean(isPlaying && resolvedStreamUrl));
  }, [isPlaying, resolvedStreamUrl]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__maxplayActivePlaybackState = {
        streamUrl: resolvedStreamUrl,
        currentTime: videoRef.current?.currentTime || currentTime || 0,
        isPlaying: Boolean(isPlaying || (videoRef.current && !videoRef.current.paused)),
        isIframe: Boolean(isIframe),
      };
    }
  }, [resolvedStreamUrl, currentTime, isPlaying, isIframe]);

  useEffect(() => {
    return () => {
      NativeBridgeService.setVideoPlayingState(false);
    };
  }, []);

  // Prevent default browser context menu (Back, Forward, Reload, Print, Share, etc.) during player interactions
  useEffect(() => {
    const handlePreventContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const container = playerContainerRef.current;
    if (container) {
      container.addEventListener('contextmenu', handlePreventContextMenu, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('contextmenu', handlePreventContextMenu);
      }
    };
  }, []);

  const handleControlInteraction = useCallback(() => {
    if (showControls && !isLocked) {
      resetControlsTimeout();
    }
  }, [showControls, isLocked, resetControlsTimeout]);

  const toggleControls = useCallback(() => {
    if (isLocked) {
      return;
    }
    if (activeMenu) {
      setActiveMenu(null);
      return;
    }
    setShowControls((prev) => !prev);
  }, [activeMenu, isLocked]);

  // Derive available languages for current videoSources, dynamic HLS audio tracks, or passed content languages
  const availableLanguages = useMemo(() => {
    const list: string[] = [];
    const addLang = (raw?: string) => {
      if (!raw || typeof raw !== 'string') return;
      const clean = raw.trim();
      if (
        !clean ||
        clean.toLowerCase() === 'default' ||
        clean.toLowerCase() === 'default audio' ||
        isQualityLabelKey(clean)
      ) {
        return;
      }
      const normalized = ClientHlsDownloader.normalizeLanguageLabel(clean, clean) || clean;
      if (!normalized || isQualityLabelKey(normalized)) return;
      if (!list.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) {
        list.push(normalized);
      }
    };

    // 1. Dynamic HLS audio tracks from master playlist
    if (hlsAudioTracks.length > 0) {
      hlsAudioTracks.forEach((t) => addLang(t.name));
    }

    // 2. Multi-language videoSources (only valid language keys, never quality keys)
    if (videoSources && typeof videoSources === 'object') {
      Object.keys(videoSources).forEach((k) => {
        if (isQualityLabelKey(k)) return;
        const val = videoSources[k];
        if (typeof val === 'string' && val.trim().length > 0) {
          addLang(k);
        } else if (val && typeof val === 'object' && Object.keys(val).length > 0) {
          addLang(k);
        }
      });
    }

    // 3. Known content languages from props (e.g. ['Hindi', 'English', 'Japanese'])
    if (propAvailableLanguages && Array.isArray(propAvailableLanguages) && propAvailableLanguages.length > 0) {
      propAvailableLanguages.forEach((l) => addLang(l));
    }

    return list;
  }, [videoSources, hlsAudioTracks, propAvailableLanguages]);

  // Keep currentLanguage in sync with activeLanguage prop and immediately switch live HLS audio track when changed from Details Screen!
  useEffect(() => {
    let targetLang = currentLanguage;
    if (activeLanguage && availableLanguages.some((l) => l.toLowerCase() === activeLanguage.toLowerCase())) {
      const matched = availableLanguages.find((l) => l.toLowerCase() === activeLanguage.toLowerCase()) || activeLanguage;
      setCurrentLanguage(matched);
      targetLang = matched;
    } else if (availableLanguages.length > 0) {
      const fallback = availableLanguages[0];
      setCurrentLanguage(fallback);
      targetLang = fallback;
      if (onLanguageChange && fallback !== activeLanguage) {
        onLanguageChange(fallback);
      }
    }

    const hls = hlsRef.current;
    if (hls && isHlsStreamRef.current && hlsAudioTracks.length > 0 && targetLang) {
      let matchIdx = hlsAudioTracks.findIndex((t) =>
        ClientHlsDownloader.matchesTargetLanguage(
          { name: (t as any).rawName || t.name, language: t.lang || '', friendly: t.name },
          targetLang
        )
      );
      if (matchIdx === -1 && availableLanguages.length > 0) {
        const orderIdx = availableLanguages.findIndex(
          (l) => l.toLowerCase().trim() === targetLang.toLowerCase().trim()
        );
        if (orderIdx !== -1 && orderIdx < hlsAudioTracks.length) {
          matchIdx = orderIdx;
        }
      }
      if (matchIdx !== -1 && hls.audioTrack !== matchIdx) {
        hls.audioTrack = matchIdx;
        if (videoRef.current && videoRef.current.readyState >= 1 && videoRef.current.currentTime > 0.2) {
          try {
            videoRef.current.currentTime = videoRef.current.currentTime + 0.01;
          } catch {}
        }
      }
    }
  }, [activeLanguage, availableLanguages, hlsAudioTracks]);

  const [switchingQualityLabel, setSwitchingQualityLabel] = useState<string | null>(null);
  const [qualitySwitchDoneBadge, setQualitySwitchDoneBadge] = useState<string | null>(null);
  const [isInNativePip, setIsInNativePip] = useState<boolean>(false);
  const prevActiveQualityPropRef = useRef<string | undefined>(activeQuality);
  const switchFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const doneBadgeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerQualitySwitchBanner = useCallback((targetQual: string) => {
    const cleanQ = (targetQual || 'Auto').toUpperCase();
    setSwitchingQualityLabel(cleanQ);
    if (switchFeedbackTimerRef.current) clearTimeout(switchFeedbackTimerRef.current);
    switchFeedbackTimerRef.current = setTimeout(() => {
      setSwitchingQualityLabel(null);
      setQualitySwitchDoneBadge(`Quality switched to ${cleanQ}`);
      if (doneBadgeTimerRef.current) clearTimeout(doneBadgeTimerRef.current);
      doneBadgeTimerRef.current = setTimeout(() => {
        setQualitySwitchDoneBadge(null);
      }, 2200);
    }, 950);
  }, []);

  // Listen for Native Android PiP mode changes so ONLY the video player fills 100% of the PiP window!
  useEffect(() => {
    const handleNativePipChange = (inPip: boolean) => {
      setIsInNativePip(Boolean(inPip));
      if (inPip) {
        setShowControls(false);
        setActiveMenu(null);
      }
    };
    window.__onMaxPlayPipModeChanged = handleNativePipChange;

    const handleResizeCheck = () => {
      // Android PiP floating window is typically <= 300px wide and <= 220px tall
      if (window.innerWidth <= 300 && window.innerHeight <= 220) {
        setIsInNativePip(true);
        setShowControls(false);
      } else if (window.innerWidth > 320 && window.innerHeight > 400) {
        setIsInNativePip(false);
      }
    };
    window.addEventListener('resize', handleResizeCheck);
    return () => {
      window.removeEventListener('resize', handleResizeCheck);
      if (window.__onMaxPlayPipModeChanged === handleNativePipChange) {
        delete window.__onMaxPlayPipModeChanged;
      }
    };
  }, []);

  // Keep currentQuality in sync with activeQuality prop AND immediately switch live HLS level when changed from Details Screen!
  useEffect(() => {
    if (!activeQuality) return;
    const isExternalQualitySwitch =
      prevActiveQualityPropRef.current !== undefined &&
      prevActiveQualityPropRef.current.toLowerCase() !== activeQuality.toLowerCase();
    prevActiveQualityPropRef.current = activeQuality;

    if (isExternalQualitySwitch && hasStarted) {
      if (videoRef.current && videoRef.current.currentTime > 0.5) {
        savedSwitchTimeRef.current = videoRef.current.currentTime;
      }
      if ((videoRef.current && !videoRef.current.paused) || isPlaying) {
        wasPlayingBeforeSwitchRef.current = true;
      }
      triggerQualitySwitchBanner(activeQuality);
    }

    setCurrentQuality(activeQuality);

    const hls = hlsRef.current;
    if (hls && isHlsStreamRef.current && hls.levels && hls.levels.length > 0) {
      if (activeQuality.toLowerCase() === 'auto') {
        hls.currentLevel = -1;
        hls.nextLevel = -1;
      } else {
        const levelIdx = findMatchingHlsLevelIndex(hls.levels, activeQuality);
        if (levelIdx !== -1 && hls.currentLevel !== levelIdx) {
          hls.nextLevel = levelIdx;
          hls.currentLevel = levelIdx;
          hls.loadLevel = levelIdx;
        }
      }
    }
  }, [activeQuality, hasStarted, isPlaying, triggerQualitySwitchBanner]);

  // Derive available qualities based on Admin multi-quality server links AND dynamic HLS levels
  // Strictly filters out any language names so languages NEVER leak into the Quality Box!
  const availableQualities = useMemo(() => {
    let links: Record<string, string> | null = null;

    if (videoSources && typeof videoSources === 'object' && Object.keys(videoSources).length > 0) {
      const langKey =
        currentLanguage && videoSources[currentLanguage]
          ? currentLanguage
          : availableLanguages.length > 0 && videoSources[availableLanguages[0]]
          ? availableLanguages[0]
          : Object.keys(videoSources)[0];
      const langVal = langKey ? videoSources[langKey] : null;
      if (langVal && typeof langVal === 'object') {
        links = { ...langVal, ...(qualityLinks && typeof qualityLinks === 'object' ? qualityLinks : {}) };
      }
    }

    if (!links && qualityLinks && typeof qualityLinks === 'object' && Object.keys(qualityLinks).length > 0) {
      links = qualityLinks;
    }

    const combinedSet = new Set<string>();
    if (links && typeof links === 'object') {
      Object.keys(links).forEach((q) => {
        const cleanQ = q.trim();
        if (
          cleanQ.toLowerCase() !== 'default' &&
          cleanQ.toLowerCase() !== 'auto' &&
          isQualityLabelKey(cleanQ) &&
          links![q] &&
          String(links![q]).trim().length > 0
        ) {
          combinedSet.add(cleanQ);
        }
      });
    }
    if (hlsQualities.length > 0) {
      hlsQualities.forEach((q) => {
        const cleanQ = q.trim();
        if (cleanQ.toLowerCase() !== 'auto' && isQualityLabelKey(cleanQ)) {
          combinedSet.add(cleanQ);
        }
      });
    }

    if (combinedSet.size > 0 || (crossServerQualities && crossServerQualities.length > 0)) {
      const sortedCurrent = Array.from(combinedSet).sort((a, b) => (parseInt(b) || 0) - (parseInt(a) || 0));
      const crossList = (crossServerQualities || []).filter(
        (cq) => cq && /\[(S1|S2)\]/i.test(cq)
      );
      return ['auto', ...sortedCurrent, ...crossList];
    }

    return ['auto'];
  }, [videoSources, qualityLinks, currentLanguage, availableLanguages, hlsQualities, crossServerQualities]);

  // Pick the optimal video URL based on active server qualityLinks, language, and quality
  const activeVideoUrl = useMemo(() => {
    let links: Record<string, string> | null = null;
    let langStringUrl = '';

    if (videoSources && typeof videoSources === 'object' && Object.keys(videoSources).length > 0) {
      const langKey =
        currentLanguage && videoSources[currentLanguage]
          ? currentLanguage
          : availableLanguages.length > 0 && videoSources[availableLanguages[0]]
          ? availableLanguages[0]
          : Object.keys(videoSources)[0];
      const langVal = langKey ? videoSources[langKey] : null;
      if (langVal && typeof langVal === 'object') {
        // Explicit qualityLinks for the active server always takes priority over legacy videoSources
        links = { ...langVal, ...(qualityLinks && typeof qualityLinks === 'object' ? qualityLinks : {}) };
      } else if (typeof langVal === 'string' && langVal.trim().length > 0) {
        langStringUrl = SmartStreamService.sanitizeStreamUrl(langVal);
      }
    }

    if (!links && qualityLinks && typeof qualityLinks === 'object' && Object.keys(qualityLinks).length > 0) {
      links = qualityLinks;
    }

    if (links && typeof links === 'object' && Object.keys(links).length > 0) {
      const smartSelected = SmartStreamService.selectSourceUrlForQuality(
        videoUrl || langStringUrl,
        links,
        currentQuality
      );
      const candidate = smartSelected.chosenUrl || smartSelected.url;

      // Only override candidate with videoUrl if candidate is an expired temporary token AND user did not configure separate hoster links
      if (
        videoUrl &&
        Object.keys(links).length === 1 &&
        SmartStreamService.isExtractableSource(videoUrl, isSmartHls) &&
        candidate &&
        !SmartStreamService.isExtractableSource(candidate, isSmartHls) &&
        (candidate.includes('?t=') ||
          candidate.includes('sprintcdn') ||
          candidate.includes('owphbf') ||
          candidate.includes('/proxy/m3u8') ||
          candidate.includes('voe-network') ||
          candidate.includes('master.m3u8'))
      ) {
        return SmartStreamService.sanitizeStreamUrl(videoUrl);
      }

      if (candidate) return SmartStreamService.sanitizeStreamUrl(candidate);
    }

    if (videoUrl) return SmartStreamService.sanitizeStreamUrl(videoUrl);
    if (langStringUrl) return langStringUrl;
    return '';
  }, [qualityLinks, videoSources, videoUrl, currentLanguage, currentQuality, availableLanguages, isSmartHls]);


  const [embedFallbackUrl, setEmbedFallbackUrl] = useState<string>('');

  // Reset embed fallback when active source URL changes
  useEffect(() => {
    setEmbedFallbackUrl('');
  }, [activeVideoUrl]);

  const { isIframe, iframeUrl } = useMemo(() => {
    if (embedFallbackUrl) {
      return { isIframe: true, iframeUrl: embedFallbackUrl };
    }
    if (!activeVideoUrl) return { isIframe: false, iframeUrl: '' };
    try {
      const urlStr = activeVideoUrl;
      const lower = urlStr.toLowerCase();
      
      if (lower.includes('youtube.com/watch?v=')) {
        const v = new URL(urlStr).searchParams.get('v');
        return { isIframe: true, iframeUrl: `https://www.youtube.com/embed/${v}?autoplay=1&rel=0` };
      }
      if (lower.includes('youtu.be/')) {
        const v = urlStr.split('youtu.be/')[1].split('?')[0];
        return { isIframe: true, iframeUrl: `https://www.youtube.com/embed/${v}?autoplay=1&rel=0` };
      }
      if (lower.includes('drive.google.com/file/d/')) {
        return { isIframe: true, iframeUrl: urlStr.replace('/view', '/preview') };
      }
      if (lower.includes('vimeo.com/')) {
        const v = urlStr.split('vimeo.com/')[1].split('?')[0];
        if (!isNaN(Number(v))) {
          return { isIframe: true, iframeUrl: `https://player.vimeo.com/video/${v}?autoplay=1` };
        }
      }
      if (lower.includes('dailymotion.com/video/')) {
        const v = urlStr.split('video/')[1].split('?')[0];
        return { isIframe: true, iframeUrl: `https://www.dailymotion.com/embed/video/${v}?autoplay=1` };
      }
      if (lower.includes('/embed/') || lower.includes('/iframe/')) {
        return { isIframe: true, iframeUrl: urlStr };
      }
    } catch (e) {
      console.warn("Error parsing iframe url", e);
    }
    return { isIframe: false, iframeUrl: '' };
  }, [activeVideoUrl, embedFallbackUrl]);

  const lastActiveUrlRef = useRef<string>('');
  const isSwitchingSourceRef = useRef<boolean>(false);
  const targetSeekTimeRef = useRef<number>(initialTime);
  const savedSwitchTimeRef = useRef<number>(0);
  const wasPlayingBeforeSwitchRef = useRef<boolean>(false);
  const networkStruggleCountRef = useRef<number>(0);
  const isInitialSeekDoneRef = useRef<boolean>(initialTime <= 0);

  // Smart Network Auto-Downgrade helper: steps down to the next available weaker quality when internet struggles
  const tryStepDownToWeakerQuality = useCallback((): boolean => {
    const ladder = ['1080p', '720p', '480p', '360p'];
    const currQ = (currentQuality === 'auto' ? actualQuality : currentQuality) || '1080p';
    const currIdx = ladder.findIndex((q) => currQ.toLowerCase().includes(q.replace('p', '')));
    const startIdx = currIdx !== -1 ? currIdx + 1 : 1;

    for (let i = startIdx; i < ladder.length; i++) {
      const candidateQ = ladder[i];
      if (availableQualities.some((q) => q.toLowerCase() === candidateQ.toLowerCase())) {
        console.warn(`[SmartPlayer] Weak connection detected on ${currQ}. Auto-stepping down to ${candidateQ}...`);
        setCurrentQuality(candidateQ);
        if (onQualityChange) onQualityChange(candidateQ);
        if (hlsRef.current && hlsRef.current.levels && hlsRef.current.levels.length > 0) {
          const lvlIdx = findMatchingHlsLevelIndex(hlsRef.current.levels, candidateQ);
          if (lvlIdx !== -1) {
            hlsRef.current.currentLevel = lvlIdx;
            hlsRef.current.loadLevel = lvlIdx;
          }
        }
        return true;
      }
    }
    return false;
  }, [currentQuality, actualQuality, availableQualities, onQualityChange]);

  // Resolve Smart Stream URL (VOE / external hosters via backend proxy with 3-hour cache)
  useEffect(() => {
    if (!activeVideoUrl) {
      setResolvedStreamUrl('');
      setIsResolvingStream(false);
      return;
    }

    // Preserve current playback position BEFORE resolving new quality/server link
    if (prevStreamKeyRef.current === streamKey) {
      const liveVideoTime = videoRef.current?.currentTime || 0;
      const bestTime = Math.max(liveVideoTime, currentTime, savedSwitchTimeRef.current);
      if (bestTime > 0.5) {
        savedSwitchTimeRef.current = bestTime;
      }
      if ((videoRef.current && !videoRef.current.paused) || isPlaying || hasStarted) {
        wasPlayingBeforeSwitchRef.current = true;
      }
    }

    streamRetryAttemptedRef.current = false;

    if (isIframe) {
      setResolvedStreamUrl(activeVideoUrl);
      setIsResolvingStream(false);
      return;
    }

    if (!SmartStreamService.isExtractableSource(activeVideoUrl, isSmartHls)) {
      setResolvedStreamUrl(activeVideoUrl);
      setIsResolvingStream(false);
      return;
    }

    let isMounted = true;
    setIsResolvingStream(true);
    setIsLoading(true);

    SmartStreamService.resolveStream(activeVideoUrl, { forceRefresh: false })
      .then((res) => {
        if (!isMounted) return;
        if (res.isEmbed) {
          setEmbedFallbackUrl(res.streamUrl);
          setResolvedStreamUrl('');
        } else {
          setResolvedStreamUrl(res.streamUrl);
          setEmbedFallbackUrl('');
        }
        setIsResolvingStream(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Smart stream extraction error:', err);
        // If targeted quality link failed to extract, try stepping down to a weaker quality link automatically!
        if (tryStepDownToWeakerQuality()) {
          return;
        }
        const fallback = SmartStreamService.getEmbedUrl(activeVideoUrl);
        if (fallback) {
          setEmbedFallbackUrl(fallback);
          setResolvedStreamUrl('');
          setIsResolvingStream(false);
          setIsLoading(false);
          setPlaybackError(null);
        } else {
          setIsResolvingStream(false);
          setIsLoading(false);
          setPlaybackError(err.message || 'Failed to extract video stream. Please try again.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeVideoUrl, isIframe, isSmartHls]);

  // Handle streamKey changes: When switching between Episode Parts or Episodes,
  // do NOT retain previous part timestamp; start from initialTime!
  useEffect(() => {
    if (streamKey !== prevStreamKeyRef.current) {
      prevStreamKeyRef.current = streamKey;
      lastActiveUrlRef.current = '';
      savedSwitchTimeRef.current = 0;
      wasPlayingBeforeSwitchRef.current = false;
      networkStruggleCountRef.current = 0;
      setCurrentTime(initialTime);
      targetSeekTimeRef.current = initialTime;
      isInitialSeekDoneRef.current = initialTime <= 0;
      setAutoShowSkip(false);
      if (lastActiveMarkerKeyRef.current !== null) {
        lastActiveMarkerKeyRef.current = null;
      }
      if (videoRef.current) {
        try {
          videoRef.current.currentTime = initialTime;
        } catch (e) {
          console.warn('streamKey change seek error:', e);
        }
      }
    }
  }, [streamKey, initialTime]);

  // Setup HLS or Native Video
  useEffect(() => {
    if (isIframe) {
      setIsLoading(false);
      setHasStarted(true);
      setIsPlaying(true);
      return;
    }
    const video = videoRef.current;
    if (!video || !resolvedStreamUrl) return;

    // Check if this is a quality/language/server switch on the same streamKey
    const isSameStreamSwitch =
      prevStreamKeyRef.current === streamKey &&
      Boolean(lastActiveUrlRef.current && lastActiveUrlRef.current !== resolvedStreamUrl);
    lastActiveUrlRef.current = resolvedStreamUrl;

    let targetStartTime = initialTime;
    const bestSavedTime = Math.max(video.currentTime || 0, savedSwitchTimeRef.current || 0);
    if (isSameStreamSwitch && bestSavedTime > 0.5) {
      targetStartTime = bestSavedTime;
      isSwitchingSourceRef.current = true;
    } else {
      targetStartTime = initialTime;
      isInitialSeekDoneRef.current = initialTime <= 0;
    }
    targetSeekTimeRef.current = targetStartTime;

    setIsLoading(true);
    setPlaybackError(null);

    // Destroy old HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = resolvedStreamUrl.toLowerCase().includes('.m3u8');
    isHlsStreamRef.current = isHls;

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        startPosition: targetStartTime > 0 ? targetStartTime : -1,
        enableWorker: true,
        lowLatencyMode: false,
        startFragPrefetch: true,
        backBufferLength: 30,
        maxBufferLength: 45,
        maxMaxBufferLength: 90,
        maxBufferSize: 60 * 1000 * 1000,
        fragLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
      });
      hlsRef.current = hls;
      hls.loadSource(resolvedStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsLoading(false);
        video.playbackRate = playbackRate;

        // 1. Auto-detect available qualities from HLS master manifest using widescreen-aware classifier
        if (data && data.levels && data.levels.length > 0) {
          const classifiedLabels = data.levels.map((lvl: any) =>
            ClientHlsDownloader.classifyResolutionLabel(lvl.width || 0, lvl.height || 0, lvl.bitrate || 0)
          );
          const uniqueQualities = Array.from(new Set(classifiedLabels)).sort(
            (a, b) => (parseInt(b) || 0) - (parseInt(a) || 0)
          );
          if (uniqueQualities.length > 0) {
            setHlsQualities(uniqueQualities);
            if (onDiscoveredQualities) {
              onDiscoveredQualities(uniqueQualities);
            }
          }

          // Immediately lock onto the user's targeted/selected quality level!
          const desiredQ = currentQuality || activeQuality || 'auto';
          if (desiredQ && desiredQ.toLowerCase() !== 'auto') {
            const targetLevelIdx = findMatchingHlsLevelIndex(data.levels, desiredQ);
            if (targetLevelIdx !== -1) {
              hls.currentLevel = targetLevelIdx;
              hls.loadLevel = targetLevelIdx;
              hls.startLevel = targetLevelIdx;
            }
          }
        }

        // 2. Auto-detect audio tracks from HLS
        if (hls.audioTracks && hls.audioTracks.length > 0) {
          const parsedAudio = hls.audioTracks.map((t, idx) => ({
            id: idx,
            name: formatLanguageLabel(t.name, t.lang, idx),
            rawName: t.name || '',
            lang: t.lang || '',
          }));
          setHlsAudioTracks(parsedAudio);
          if (onDiscoveredAudioTracks) {
            onDiscoveredAudioTracks(
              Array.from(new Set(parsedAudio.map((a) => a.name).filter(Boolean)))
            );
          }

          const req = (currentLanguage || activeLanguage || '').trim();
          if (req) {
            const matchIdx = parsedAudio.findIndex((a) =>
              ClientHlsDownloader.matchesTargetLanguage(
                { name: a.rawName, language: a.lang, friendly: a.name },
                req
              )
            );
            if (matchIdx !== -1 && hls.audioTrack !== matchIdx) {
              hls.audioTrack = matchIdx;
            }
          }
        }

        if (targetSeekTimeRef.current > 0.5 && Math.abs((video.currentTime || 0) - targetSeekTimeRef.current) > 1.5) {
          try {
            video.currentTime = targetSeekTimeRef.current;
          } catch {}
        }

        setTimeout(() => {
          isInitialSeekDoneRef.current = true;
          isSwitchingSourceRef.current = false;
          targetSeekTimeRef.current = 0;
          savedSwitchTimeRef.current = 0;
        }, 450);

        if (autoPlay || hasStarted || isPlaying || wasPlayingBeforeSwitchRef.current) {
          wasPlayingBeforeSwitchRef.current = false;
          setHasStarted(true);
          video.play().catch((e) => console.warn('Autoplay blocked:', e));
        }
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
        if (data.audioTracks && data.audioTracks.length > 0) {
          const parsedAudio = data.audioTracks.map((t: any, idx: number) => ({
            id: idx,
            name: formatLanguageLabel(t.name, t.lang, idx),
            rawName: t.name || '',
            lang: t.lang || '',
          }));
          setHlsAudioTracks(parsedAudio);
          if (onDiscoveredAudioTracks) {
            onDiscoveredAudioTracks(
              Array.from(new Set(parsedAudio.map((a: any) => a.name).filter(Boolean)))
            );
          }

          const req = (currentLanguage || activeLanguage || '').trim();
          if (req) {
            const matchIdx = parsedAudio.findIndex((a: any) =>
              ClientHlsDownloader.matchesTargetLanguage(
                { name: a.rawName, language: a.lang, friendly: a.name },
                req
              )
            );
            if (matchIdx !== -1 && hls.audioTrack !== matchIdx) {
              hls.audioTrack = matchIdx;
            }
          }
        }
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_event, data) => {
        if (hls.audioTracks && hls.audioTracks[data.id]) {
          const trk = hls.audioTracks[data.id];
          const friendly = formatLanguageLabel(trk.name, trk.lang, data.id);
          setCurrentLanguage(friendly);
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        if (hls.levels && hls.levels[data.level]) {
          const lvl = hls.levels[data.level];
          const label = ClientHlsDownloader.classifyResolutionLabel(
            lvl.width || 0,
            lvl.height || 0,
            lvl.bitrate || 0
          );
          setActualQuality(label);
          setSwitchingQualityLabel((prev) => {
            if (prev) {
              if (switchFeedbackTimerRef.current) clearTimeout(switchFeedbackTimerRef.current);
              setQualitySwitchDoneBadge(`Quality switched to ${label.toUpperCase()}`);
              if (doneBadgeTimerRef.current) clearTimeout(doneBadgeTimerRef.current);
              doneBadgeTimerRef.current = setTimeout(() => setQualitySwitchDoneBadge(null), 2200);
            }
            return null;
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        // Non-fatal buffer stall / fragment timeout detection -> Smart Auto-Downgrade to weaker quality!
        if (
          !data.fatal &&
          (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR ||
            data.details === Hls.ErrorDetails.FRAG_LOAD_TIMEOUT ||
            data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR)
        ) {
          networkStruggleCountRef.current += 1;
          if (networkStruggleCountRef.current >= 2) {
            networkStruggleCountRef.current = 0;
            tryStepDownToWeakerQuality();
          }
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // First try stepping down to a weaker quality if user's connection can't sustain high bitrate
              if (networkStruggleCountRef.current >= 1 && tryStepDownToWeakerQuality()) {
                networkStruggleCountRef.current = 0;
                hls.startLoad();
                return;
              }
              networkStruggleCountRef.current += 1;

              // Smart retry if 3-hour stream token expired
              if (
                SmartStreamService.isExtractableSource(activeVideoUrl, isSmartHls) &&
                !streamRetryAttemptedRef.current
              ) {
                streamRetryAttemptedRef.current = true;
                console.warn('HLS token expired or network rejected. Auto-renewing stream link...');
                setIsLoading(true);
                SmartStreamService.clearClientCache(activeVideoUrl);
                SmartStreamService.resolveStream(activeVideoUrl, { forceRefresh: true })
                  .then((res) => {
                    if (res.isEmbed) {
                      setEmbedFallbackUrl(res.streamUrl);
                      setResolvedStreamUrl('');
                    } else {
                      setResolvedStreamUrl(res.streamUrl);
                      setEmbedFallbackUrl('');
                    }
                  })
                  .catch((e) => {
                    if (tryStepDownToWeakerQuality()) return;
                    const fallback = SmartStreamService.getEmbedUrl(activeVideoUrl);
                    if (fallback) {
                      setEmbedFallbackUrl(fallback);
                      setResolvedStreamUrl('');
                      setIsLoading(false);
                      setPlaybackError(null);
                    } else {
                      setIsLoading(false);
                      setPlaybackError('Stream token expired. Renewal failed: ' + e.message);
                    }
                  });
                return;
              }
              console.warn('fatal network error encountered, try to recover');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('fatal media error encountered, try to recover');
              const now = performance.now();
              if (now - recoverDecodingErrorDateRef.current > 3000) {
                recoverDecodingErrorDateRef.current = now;
                hls.recoverMediaError();
              } else {
                console.warn('media error recurring, swapping audio codec to prevent decode crash');
                hls.swapAudioCodec();
                hls.recoverMediaError();
              }
              break;
            default:
              if (tryStepDownToWeakerQuality()) return;
              setIsLoading(false);
              isSwitchingSourceRef.current = false;
              setPlaybackError('Stream failed to load: ' + data.type);
              break;
          }
        }
      });
    } else {
      // Native HTML5 playback
      video.src = resolvedStreamUrl;
      video.playbackRate = playbackRate;

      const performNativeSeek = () => {
        if (targetSeekTimeRef.current > 0 && videoRef.current) {
          try {
            videoRef.current.currentTime = targetSeekTimeRef.current;
          } catch (e) {
            console.warn('Native seek error:', e);
          }
        }
        setTimeout(() => {
          isInitialSeekDoneRef.current = true;
          isSwitchingSourceRef.current = false;
          targetSeekTimeRef.current = 0;
        }, 400);
      };

      const onCanPlay = () => {
        setIsLoading(false);
        performNativeSeek();

        if (autoPlay || hasStarted || isPlaying) {
          video.play().catch(e => {
            console.warn('Native autoplay blocked:', e);
          });
        }
      };

      video.addEventListener('loadedmetadata', performNativeSeek, { once: true });
      video.addEventListener('canplay', onCanPlay, { once: true });
      video.load();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [resolvedStreamUrl, streamKey]); 

  // Fullscreen listener with cross-browser / mobile vendor support
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  // Picture in Picture listeners to keep exact playback state synchronized without resetting
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPip = () => {
      setCurrentTime(video.currentTime);
      setIsPlaying(!video.paused);
      targetSeekTimeRef.current = 0;
      isInitialSeekDoneRef.current = true;
    };

    const handleLeavePip = () => {
      const curTime = video.currentTime;
      setCurrentTime(curTime);
      setIsPlaying(!video.paused);
      targetSeekTimeRef.current = 0;
      isInitialSeekDoneRef.current = true;
      if (!video.paused) {
        video.play().catch(console.warn);
      }
    };

    video.addEventListener('enterpictureinpicture', handleEnterPip);
    video.addEventListener('leavepictureinpicture', handleLeavePip);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPip);
      video.removeEventListener('leavepictureinpicture', handleLeavePip);
    };
  }, []);

  // Direct, instant Play / Pause handler
  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      setHasStarted(true);
      setIsPlaying(true);
      video.play().catch((err) => {
        console.warn('Video play error:', err);
        setIsPlaying(false);
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      // Force destroy hls instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      // Force kill video element and release resources
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
    };
  }, []);

  const handleSeek = (time: number) => {
    const isGlobal = (globalDuration !== undefined && globalDuration > 0) || timeOffset > 0;
    const globalTarget = Math.max(0, time);
    const currentPartDur = duration || 0;

    // Check if seek target crosses into a previous or next episode part
    const isOutsideCurrentPart = isGlobal && Boolean(onGlobalSeek) && (
      globalTarget < timeOffset || (currentPartDur > 0 && globalTarget >= timeOffset + currentPartDur)
    );

    if (isOutsideCurrentPart && onGlobalSeek) {
      onGlobalSeek(globalTarget);
      return;
    }

    const localTarget = Math.max(0, isGlobal ? globalTarget - timeOffset : globalTarget);

    if (videoRef.current) {
      try {
        videoRef.current.currentTime = localTarget;
      } catch (e) {
        console.warn('Seek error:', e);
      }
      setCurrentTime(localTarget);
      targetSeekTimeRef.current = 0;
      isInitialSeekDoneRef.current = true;
    }

    if (onGlobalSeek) {
      onGlobalSeek(globalTarget);
    }
  };

  const handleFullscreen = async () => {
    const container = playerContainerRef.current;
    if (!container) return;

    const isCurrentlyFs = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    if (!isCurrentlyFs) {
      try {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        } else if ((container as any).mozRequestFullScreen) {
          await (container as any).mozRequestFullScreen();
        } else if ((container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen();
        } else {
          // Fallback to CSS fullscreen overlay keeping custom controls
          setIsFullscreen(true);
        }

        NativeBridgeService.setNativeLandscapeOrientation(true);
        if (screen.orientation && (screen.orientation as any).lock) {
          ((screen.orientation as any).lock as any)('landscape').catch(() => {});
        } else if ((screen as any).lockOrientation) {
          (screen as any).lockOrientation('landscape');
        } else if ((screen as any).mozLockOrientation) {
          (screen as any).mozLockOrientation('landscape');
        } else if ((screen as any).msLockOrientation) {
          (screen as any).msLockOrientation('landscape');
        }
      } catch (err) {
        console.error("Fullscreen error", err);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }

        NativeBridgeService.setNativeLandscapeOrientation(false);
        if (screen.orientation && screen.orientation.unlock) {
          ((screen.orientation as any).unlock as any)();
        } else if ((screen as any).unlockOrientation) {
          (screen as any).unlockOrientation();
        }
      } catch (err) {
        console.error("Exit fullscreen error", err);
      }
    }
  };
  
  // Expose fullscreen exit helper for Android hardware back button
  useEffect(() => {
    (window as any).__isMaxPlayPlayerFullscreen = isFullscreen;
    (window as any).__exitMaxPlayPlayerFullscreen = () => {
      if (isFullscreen) {
        handleFullscreen();
        return true;
      }
      return false;
    };
    return () => {
      (window as any).__isMaxPlayPlayerFullscreen = false;
    };
  }, [isFullscreen]);

  const handlePipToggle = async () => {
    // Expand ONLY the video player to 100% of the screen BEFORE entering native Android PiP
    // so the floating PiP window shows ONLY the video player and never the entire Details Screen!
    if (NativeBridgeService.isRunningInKotlinApp()) {
      setIsInNativePip(true);
      setShowControls(false);
      setActiveMenu(null);
      requestAnimationFrame(() => {
        NativeBridgeService.enterNativePipMode();
      });
      return;
    }
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
    handleControlInteraction();
  };
  
  const changeLanguage = (lang: string) => {
    if (videoRef.current && videoRef.current.currentTime > 0.5) {
      savedSwitchTimeRef.current = videoRef.current.currentTime;
    }
    if ((videoRef.current && !videoRef.current.paused) || isPlaying || hasStarted) {
      wasPlayingBeforeSwitchRef.current = true;
    }

    setCurrentLanguage(lang);
    if (onLanguageChange) onLanguageChange(lang);

    // 1. If HLS stream has internal audio tracks, switch audio track immediately
    if (hlsRef.current && isHlsStreamRef.current && hlsAudioTracks.length > 0) {
      const trackIdx = hlsAudioTracks.findIndex((t) =>
        ClientHlsDownloader.matchesTargetLanguage(
          { name: (t as any).rawName || t.name, language: t.lang || '', friendly: t.name },
          lang
        )
      );

      if (trackIdx !== -1) {
        hlsRef.current.audioTrack = trackIdx;
      } else {
        const matchNum = lang.match(/(\d+)/);
        if (matchNum) {
          const idx = parseInt(matchNum[1], 10) - 1;
          if (idx >= 0 && idx < hlsAudioTracks.length) {
            hlsRef.current.audioTrack = idx;
          }
        }
      }
    }

    // 2. If HTML5 Video has native audioTracks
    if (videoRef.current && (videoRef.current as any).audioTracks) {
      const nativeTracks = (videoRef.current as any).audioTracks;
      for (let i = 0; i < nativeTracks.length; i++) {
        const track = nativeTracks[i];
        const isMatch = ClientHlsDownloader.matchesTargetLanguage(
          { name: track.label || '', language: track.language || '' },
          lang
        );
        track.enabled = isMatch;
      }
    }

    setActiveMenu(null);
    handleControlInteraction();
  };
  
  const changeQuality = (qual: string) => {
    // Capture current playback position before switching quality link/level
    if (videoRef.current && videoRef.current.currentTime > 0.5) {
      savedSwitchTimeRef.current = videoRef.current.currentTime;
    }
    if ((videoRef.current && !videoRef.current.paused) || isPlaying || hasStarted) {
      wasPlayingBeforeSwitchRef.current = true;
    }

    triggerQualitySwitchBanner(qual);
    setCurrentQuality(qual);
    prevActiveQualityPropRef.current = qual;
    try {
      localStorage.setItem('maxplay_preferred_quality', qual);
    } catch {}
    if (onQualityChange) onQualityChange(qual);

    // If HLS stream has internal multi-quality levels, switch level immediately using widescreen-aware matcher
    if (hlsRef.current && isHlsStreamRef.current && hlsRef.current.levels && hlsRef.current.levels.length > 0) {
      if (qual.toLowerCase() === 'auto') {
        hlsRef.current.currentLevel = -1;
        hlsRef.current.nextLevel = -1;
      } else {
        const levelIdx = findMatchingHlsLevelIndex(hlsRef.current.levels, qual);
        if (levelIdx !== -1) {
          hlsRef.current.nextLevel = levelIdx;
          hlsRef.current.currentLevel = levelIdx;
          hlsRef.current.loadLevel = levelIdx;
        }
      }
    }

    setActiveMenu(null);
    handleControlInteraction();
  };

  const isSkipButtonVisible = Boolean(
    hasStarted &&
    activeSkipMarker &&
    !isLocked &&
    (showControls || autoShowSkip)
  );

  const handleSkipIntroOutro = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeSkipMarker) return;
    handleSeek(activeSkipMarker.end);
    setAutoShowSkip(false);
    if (autoHideSkipTimeoutRef.current) {
      clearTimeout(autoHideSkipTimeoutRef.current);
      autoHideSkipTimeoutRef.current = null;
    }
    handleControlInteraction();
  };

  return (
    <div 
      ref={playerContainerRef}
      className={
        isInNativePip
          ? "fixed inset-0 z-[99999] w-screen h-screen bg-black overflow-hidden flex items-center justify-center select-none no-callout"
          : "relative w-full h-full bg-black group overflow-hidden flex items-center justify-center select-none no-callout"
      }
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClickCapture={() => {
        adManager.handlePlayerAction(!!user?.isPremium);
      }}
      onMouseMove={handleControlInteraction}
      onTouchMove={handleControlInteraction}
    >
      <GestureHandler
        isLocked={isLocked}
        onToggleControls={toggleControls}
        onChangeBrightness={handleBrightnessChange}
        onChangeVolume={handleVolumeChange}
        onLongPressStart={handleLongPressStart}
        onLongPressMove={handleLongPressMove}
        onLongPressEnd={handleLongPressEnd}
        onDoubleTapRewind={() => {
          const currentGlobal = timeOffset + currentTime;
          const targetGlobal = Math.max(0, currentGlobal - 10);
          handleSeek(targetGlobal);
          handleControlInteraction();
        }}
        onDoubleTapForward={() => {
          const currentGlobal = timeOffset + currentTime;
          const maxDur = (globalDuration !== undefined && globalDuration > 0) ? globalDuration : (duration || 999999);
          const targetGlobal = Math.min(maxDur, currentGlobal + 10);
          handleSeek(targetGlobal);
          handleControlInteraction();
        }}
      >
        
        {isIframe ? (
          <iframe 
            src={iframeUrl} 
            className="absolute inset-0 w-full h-full border-0 pointer-events-auto"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video 
            referrerPolicy="no-referrer"
            ref={videoRef}
            playsInline
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ filter: `brightness(${brightness}%)` }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          onPlay={() => { 
            setIsPlaying(true); 
            setHasStarted(true); 
            setIsLoading(false);
            if (!isInitialSeekDoneRef.current && targetSeekTimeRef.current > 0 && videoRef.current) {
              if (Math.abs(videoRef.current.currentTime - targetSeekTimeRef.current) > 2) {
                try {
                  videoRef.current.currentTime = targetSeekTimeRef.current;
                } catch (e) {
                  console.warn('Seek on play error:', e);
                }
              }
            }
            isInitialSeekDoneRef.current = true;
            targetSeekTimeRef.current = 0;
          }}
          onPause={() => {
            setIsPlaying(false);
            const t = videoRef.current?.currentTime ?? currentTime;
            const d = videoRef.current?.duration || duration || 0;
            if (targetSeekTimeRef.current > 2 && t < 1 && !isInitialSeekDoneRef.current) {
              return;
            }
            if (!isSwitchingSourceRef.current) {
              onPause?.(t, d);
            }
          }}
          onTimeUpdate={(e) => {
            const t = e.currentTarget.currentTime;
            const d = e.currentTarget.duration || duration || 0;
            const now = Date.now();
            // 4GB RAM Optimization: Throttle React state updates to 250ms when controls are open, and 950ms when controls are hidden
            const minInterval = showControls || normalizedSkipMarkers ? 250 : 950;
            if (now - lastTimeStateUpdateRef.current >= minInterval) {
              lastTimeStateUpdateRef.current = now;
              setCurrentTime(t);
            }
            // Ignore time updates during initial seek phase if time is near 0 but target was > 2
            if (targetSeekTimeRef.current > 2 && t < 1 && !isInitialSeekDoneRef.current) {
              return;
            }
            if (!isSwitchingSourceRef.current && (now - lastProgressEmitRef.current >= 1500)) {
              lastProgressEmitRef.current = now;
              onProgress?.(t, false, d);
            }
          }}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration || 0;
            setDuration(d);
            onDuration?.(d);
          }}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
          onEnded={() => {
            setIsPlaying(false);
            setShowControls(true);
            const d = videoRef.current?.duration || duration || 0;
            onProgress?.(currentTime, true, d);
            onPause?.(currentTime, d);
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
            console.error("Video Error Details:", err ? err.code : "null", "URL:", activeVideoUrl);
            setPlaybackError('Failed to load video: ' + msg);
          }}
        />
        )}

        {!isIframe && !hasStarted && !isPlaying && activeVideoUrl && (
          <div 
            onClick={() => {
              handlePlayPause();
              handleControlInteraction();
            }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 bg-cover bg-center cursor-pointer transition-all duration-300 pointer-events-auto"
            style={{ backgroundImage: posterUrl ? `url(${posterUrl})` : undefined }}
          >
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative z-30 flex items-center justify-center w-18 h-18 sm:w-20 sm:h-20 bg-[#8B5CF6] rounded-full hover:scale-110 active:scale-95 transition-transform shadow-lg shadow-purple-600/30">
              <Play className="w-9 h-9 sm:w-10 sm:h-10 fill-white translate-x-0.5" />
            </div>
          </div>
        )}

        {!isIframe && (isLoading || isResolvingStream || Boolean(switchingQualityLabel)) && !isInNativePip && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 pointer-events-none gap-2.5">
            <Loader2 className="w-12 h-12 text-[#8B5CF6] animate-spin" />
            {switchingQualityLabel ? (
              <span className="text-xs sm:text-sm font-bold text-white tracking-wide bg-black/80 px-4 py-1.5 rounded-full border border-[#8B5CF6]/50 backdrop-blur-md shadow-xl animate-pulse">
                Your quality is switching to {switchingQualityLabel}...
              </span>
            ) : isResolvingStream ? (
              <span className="text-xs font-medium text-white/80 tracking-wide bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                Securing stream link...
              </span>
            ) : null}
          </div>
        )}

        {qualitySwitchDoneBadge && !switchingQualityLabel && !isInNativePip && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-emerald-600/90 text-white text-[11px] font-bold px-3.5 py-1 rounded-full border border-emerald-300/40 shadow-lg backdrop-blur-md">
              ✓ {qualitySwitchDoneBadge}
            </div>
          </div>
        )}

        {!isIframe && (playbackError || !activeVideoUrl) && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-6 text-center text-white pointer-events-auto">
            <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
            <p className="font-semibold text-lg mb-2">{playbackError || 'No Video Stream Available'}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => { setPlaybackError(null); handlePlayPause(); handleControlInteraction(); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition active:scale-95 cursor-pointer">Retry</button>
              {activeVideoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    const fallback = SmartStreamService.getEmbedUrl(activeVideoUrl) || activeVideoUrl;
                    setEmbedFallbackUrl(fallback);
                    setResolvedStreamUrl('');
                    setPlaybackError(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition active:scale-95 cursor-pointer text-center flex items-center shadow-lg shadow-emerald-900/30"
                >
                  Play in Web Player
                </button>
              )}
              {activeVideoUrl && (
                <a href={activeVideoUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg text-sm font-medium transition active:scale-95 cursor-pointer text-center flex items-center">
                  Open Externally
                </a>
              )}
            </div>
          </div>
        )}

        {/* Dedicated Top-Left Exit Button when PlayerControls are not mounted (unstarted, error, or iframe) */}
        {onBack && (!hasStarted || playbackError || isIframe) && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBack();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            className="absolute top-3 left-3 sm:top-4 sm:left-4 z-40 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-black/80 hover:bg-black text-white border border-white/35 hover:border-white/70 shadow-2xl cursor-pointer pointer-events-auto transition-all hover:scale-105 active:scale-90 backdrop-blur-md"
            title="Exit details screen"
            aria-label="Go Back"
          >
            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
          </button>
        )}

        {/* CRUNCHYROLL / NETFLIX SINGLE UNIFIED SKIP INTRO / OUTRO BUTTON */}
        {isSkipButtonVisible && activeSkipMarker && (
          <div className="absolute right-4 sm:right-8 bottom-16 sm:bottom-20 z-40 pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={handleSkipIntroOutro}
              className="bg-black/90 hover:bg-[#8B5CF6] text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm border border-white/30 hover:border-purple-300 backdrop-blur-md shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer group shadow-purple-950/40"
            >
              <SkipForward className="h-4 w-4 text-[#8B5CF6] group-hover:text-white transition-colors" />
              <span className="tracking-wide">{activeSkipMarker.label}</span>
            </button>
          </div>
        )}

        {/* PlayIt-Style Long-Press Speed Capsule HUD */}
        <SpeedCapsuleHUD 
          visible={isFastForwarding} 
          speed={capsuleSpeed} 
          progress={capsuleProgress} 
        />

        {/* Brightness Indicator HUD */}
        <div 
          className={`absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-40 transition-all duration-300 pointer-events-none ${
            showBrightnessIndicator 
              ? 'opacity-100 scale-100 translate-x-0' 
              : 'opacity-0 scale-95 -translate-x-2'
          }`}
        >
          <div className="bg-black/85 backdrop-blur-xl border border-white/20 rounded-2xl px-3 py-4 flex flex-col items-center gap-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] min-w-[56px]">
            <div className="p-1.5 rounded-full bg-amber-500/20 text-amber-300">
              {brightness > 100 ? (
                <Sun className="w-5 h-5 animate-pulse text-amber-300" />
              ) : (
                <SunMedium className="w-5 h-5 text-amber-300" />
              )}
            </div>
            <div className="w-2 sm:w-2.5 h-28 bg-white/15 rounded-full overflow-hidden flex flex-col-reverse p-0.5 shadow-inner">
              <div 
                className="w-full bg-gradient-to-t from-amber-400 via-amber-300 to-yellow-100 rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(251,191,36,0.7)]" 
                style={{ height: `${Math.min(100, Math.max(5, (brightness - 10) / 190 * 100))}%` }}
              />
            </div>
            <span className="font-mono text-xs font-bold text-white tracking-wider tabular-nums">
              {brightness}%
            </span>
            <span className="text-[9px] uppercase font-semibold tracking-widest text-white/50 -mt-1">
              Light
            </span>
          </div>
        </div>

        {/* Volume Indicator HUD */}
        <div 
          className={`absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 transition-all duration-300 pointer-events-none ${
            showVolumeIndicator 
              ? 'opacity-100 scale-100 translate-x-0' 
              : 'opacity-0 scale-95 translate-x-2'
          }`}
        >
          <div className={`backdrop-blur-xl border rounded-2xl px-3 py-4 flex flex-col items-center gap-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] min-w-[56px] transition-colors duration-200 ${
            volume > 100 
              ? 'bg-black/90 border-orange-500/60 shadow-[0_0_25px_rgba(249,115,22,0.35)]' 
              : 'bg-black/85 border-white/20'
          }`}>
            <div className={`p-1.5 rounded-full transition-colors duration-200 ${
              volume > 100 
                ? 'bg-orange-500/25 text-orange-400' 
                : volume === 0 
                  ? 'bg-red-500/20 text-red-400' 
                  : 'bg-cyan-500/20 text-cyan-300'
            }`}>
              {volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : volume > 100 ? (
                <Zap className="w-5 h-5 animate-pulse text-orange-400" />
              ) : volume > 50 ? (
                <Volume2 className="w-5 h-5 text-cyan-300" />
              ) : (
                <Volume1 className="w-5 h-5 text-cyan-300" />
              )}
            </div>
            <div className="w-2 sm:w-2.5 h-28 bg-white/15 rounded-full overflow-hidden flex flex-col-reverse p-0.5 shadow-inner">
              <div 
                className={`w-full rounded-full transition-all duration-75 ${
                  volume > 100 
                    ? 'bg-gradient-to-t from-amber-500 via-orange-500 to-rose-500 shadow-[0_0_12px_rgba(249,115,22,0.9)]' 
                    : 'bg-gradient-to-t from-cyan-500 via-blue-400 to-teal-200 shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                }`} 
                style={{ height: `${Math.min(100, Math.max(volume === 0 ? 0 : 5, volume / 2))}%` }}
              />
            </div>
            <span className={`font-mono text-xs font-bold tracking-wider tabular-nums ${
              volume > 100 ? 'text-orange-400 drop-shadow-[0_0_6px_rgba(249,115,22,0.8)]' : 'text-white'
            }`}>
              {volume}%
            </span>
            {volume > 100 ? (
              <span className="text-[8px] uppercase font-black tracking-widest text-orange-400 bg-orange-500/20 border border-orange-500/40 px-1.5 py-0.5 rounded-full -mt-1 animate-pulse">
                BOOST
              </span>
            ) : (
              <span className="text-[9px] uppercase font-semibold tracking-widest text-white/50 -mt-1">
                Vol
              </span>
            )}
          </div>
        </div>

        {!isIframe && hasStarted && !isInNativePip && (
          <PlayerControls
            isVisible={showControls && !activeMenu}
            isPlaying={isPlaying}
            currentTime={timeOffset + currentTime}
            duration={globalDuration !== undefined ? globalDuration : duration}
            title={title}
            skipMarkers={normalizedSkipMarkers}
            isFullscreen={isFullscreen}
            isLocked={isLocked}
            onLockChange={setIsLocked}
            currentLanguage={currentLanguage}
            currentQuality={currentQuality}
            playbackRate={playbackRate}
            onPlayPause={() => {
              handlePlayPause();
              handleControlInteraction();
            }}
            onSeek={(t) => {
              handleSeek(t);
              handleControlInteraction();
            }}
            onRewind10={() => {
              const currentGlobal = timeOffset + currentTime;
              handleSeek(Math.max(0, currentGlobal - 10));
              handleControlInteraction();
            }}
            onForward10={() => {
              const currentGlobal = timeOffset + currentTime;
              const maxDur = globalDuration !== undefined ? globalDuration : duration;
              handleSeek(Math.min(maxDur, currentGlobal + 10));
              handleControlInteraction();
            }}
            onNext={onNext ? () => {
              onNext();
              handleControlInteraction();
            } : undefined}
            onFullscreenToggle={() => {
              handleFullscreen();
              handleControlInteraction();
            }}
            onPipToggle={() => {
              handlePipToggle();
              handleControlInteraction();
            }}
            onSpeedPress={() => {
              setActiveMenu(prev => prev === 'speed' ? null : 'speed');
            }}
            onLanguagePress={availableLanguages.length > 0 ? () => {
              setActiveMenu(prev => prev === 'language' ? null : 'language');
            } : undefined}
            onQualityPress={availableQualities.length > 0 ? () => {
              setActiveMenu(prev => prev === 'quality' ? null : 'quality');
            } : undefined}
            onBack={isFullscreen ? () => {
              handleFullscreen();
              handleControlInteraction();
            } : onBack}
            onScrubStart={() => {
              if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
                controlsTimeoutRef.current = null;
              }
            }}
            onScrubEnd={() => {
              handleControlInteraction();
            }}
          />
        )}

        {/* SLEEK RIGHT-SIDE SLIDE-OVER DRAWERS */}
        <SpeedDrawer
          visible={activeMenu === 'speed'}
          currentSpeed={playbackRate}
          onSelectSpeed={changePlaybackRate}
          onClose={() => setActiveMenu(null)}
        />

        <QualityDrawer
          visible={activeMenu === 'quality'}
          currentQuality={currentQuality}
          availableQualities={availableQualities.filter(q => q !== 'auto')}
          isAutoMode={currentQuality === 'auto'}
          actualQuality={actualQuality}
          onSelectQuality={changeQuality}
          onClose={() => setActiveMenu(null)}
        />

        <AudioLangDrawer
          visible={activeMenu === 'language'}
          currentLanguage={currentLanguage}
          availableLanguages={availableLanguages}
          onSelectLanguage={changeLanguage}
          onClose={() => setActiveMenu(null)}
        />
      </GestureHandler>
    </div>
  );
};

