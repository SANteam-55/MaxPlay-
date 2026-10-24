import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { MainTabNavigator, TabType } from './MainTabNavigator';
import { HomeStack } from './HomeStack';
import { SearchStack } from './SearchStack';
import { MeStack } from './MeStack';
import { AnimeStack } from './AnimeStack';
import { DownloadsScreen } from '../screens/main/DownloadsScreen';
import { downloadManager } from '../services/DownloadManager';
import { useContent } from '../hooks/useContent';
import { useAuth } from '../hooks/useAuth';
import { STORAGE_KEYS } from '../utils/constants';
import { useGeneralSettings } from '../hooks/useGeneralSettings';
import { MaintenanceScreen } from '../screens/common/MaintenanceScreen';
import { SuspendedAccountModal } from '../components/common/SuspendedAccountModal';
import { subscribeToAnnouncements } from '../services/contentService';
import { NativeBridgeService } from '../services/nativeBridgeService';
import { adManager } from '../services/adService';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, X, Download, ShieldAlert, ArrowUp, Bell } from 'lucide-react';

export const RootNavigator: React.FC = () => {
  const { user, isAuthenticated, logout, isLoading: isAuthLoading } = useAuth();
  const {
    maintenanceMode,
    appName,
    forceUpdate,
    currentApkVersion,
    formattedCurrentVersion,
    latestApkVersion,
    formattedLatestVersion,
    apkDownloadUrl,
    updateTitle,
    updateReleaseNotes,
    updateBannerUrl,
    adminUpdateMessage,
  } = useGeneralSettings();

  // Offline Auto-Detection
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [forceApkProgress, setForceApkProgress] = useState<{
    status: string;
    progress: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowOfflineModal(true);
    };
    const handleOnline = () => {
      setIsOffline(false);
      setShowOfflineModal(false);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
      setShowOfflineModal(true);
    }

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Request Web Notification permission upfront and handle tapping native status-bar notifications
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch {}

    const handleOpenMessagesFromNotification = () => {
      setActiveTabState('me');
      localStorage.setItem('MAXPLAY_PWA_LAST_TAB', 'me');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('MAXPLAY_OPEN_ME_MESSAGES'));
      }, 120);
    };

    window.addEventListener('MAXPLAY_OPEN_MESSAGES_SCREEN', handleOpenMessagesFromNotification);
    return () => {
      window.removeEventListener('MAXPLAY_OPEN_MESSAGES_SCREEN', handleOpenMessagesFromNotification);
    };
  }, []);

  // PWA State Lock - Check if user is resuming an existing session or standalone mode
  const isPwaStandalone = typeof window !== 'undefined' && 
    (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
  
  const hasActiveSession = typeof window !== 'undefined' && Boolean(sessionStorage.getItem('MAXPLAY_SESSION_ACTIVE'));

  // Skip splash screen if resuming PWA or session already active
  const [showSplash, setShowSplash] = useState(!hasActiveSession);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
  });
  const [authScreen, setAuthScreen] = useState<'login' | 'register' | 'forgot'>('login');
  
  const { contentList } = useContent();
  const [downloadBadgeCount, setDownloadBadgeCount] = useState<number>(0);

  // In-App Push Notification Banner state (appears alongside native Android Status-Bar Notification)
  const [inAppNotif, setInAppNotif] = useState<{
    id: string;
    title: string;
    body: string;
    imageUrl?: string;
  } | null>(null);
  const latestAnnouncementsRef = useRef<any[]>([]);

  // Real Phone Status-Bar + In-App Push Notifications for Me > Messages (Announcements)
  useEffect(() => {
    if (showSplash) return;
    let isFirstSnapshot = true;

    const processAnnouncements = (rawMsgs: any[], forceNotifyLatest = false) => {
      if (!rawMsgs || rawMsgs.length === 0) {
        isFirstSnapshot = false;
        return;
      }
      latestAnnouncementsRef.current = rawMsgs;

      try {
        // Always sort newest-first by createdAt / date so index 0 is guaranteed to be the latest Admin message!
        const sortedMsgs = [...rawMsgs].sort((a, b) => {
          const tA = new Date(a.createdAt || a.date || 0).getTime() || 0;
          const tB = new Date(b.createdAt || b.date || 0).getTime() || 0;
          return tB - tA;
        });

        const rawSeen = localStorage.getItem('maxplay_notified_msg_ids_v2');
        const seenIds: string[] = rawSeen ? JSON.parse(rawSeen) : [];
        const seenSet = new Set(seenIds);

        const rawRead = localStorage.getItem('maxplay_read_msgs');
        const readIds: string[] = rawRead ? JSON.parse(rawRead) : [];
        const readSet = new Set(readIds);

        const newMessages = sortedMsgs.filter(
          (m) => m.id && !seenSet.has(m.id) && !readSet.has(m.id) && m.isUnread !== false
        );

        const listToNotify =
          newMessages.length > 0
            ? isFirstSnapshot
              ? [newMessages[0]]
              : newMessages
            : forceNotifyLatest && sortedMsgs[0] && !readSet.has(sortedMsgs[0].id)
            ? [sortedMsgs[0]]
            : [];

        if (listToNotify.length > 0) {
          listToNotify.forEach((m) => {
            if (m && m.title) {
              const attachedImg =
                m.bannerUrl ||
                (m as any).imageUrl ||
                (m as any).image ||
                m.attachedContent?.backdropUrl ||
                m.attachedContent?.posterUrl ||
                '';
              const bodyText = m.body || 'New update in MaxPlay Messages';

              NativeBridgeService.showNativeNotification(m.title, bodyText, attachedImg);

              setInAppNotif({
                id: m.id,
                title: m.title,
                body: bodyText,
                imageUrl: attachedImg,
              });
            }
          });

          const updatedSeen = Array.from(
            new Set([...seenIds, ...sortedMsgs.map((m) => m.id).filter(Boolean)])
          ).slice(-200);
          localStorage.setItem('maxplay_notified_msg_ids_v2', JSON.stringify(updatedSeen));
        }
      } catch {}
      isFirstSnapshot = false;
    };

    const unsub = subscribeToAnnouncements(user?.uid, (msgs) => {
      processAnnouncements(msgs, false);
    });

    const handlePermissionGranted = () => {
      if (latestAnnouncementsRef.current.length > 0) {
        processAnnouncements(latestAnnouncementsRef.current, true);
      }
    };
    window.addEventListener('MAXPLAY_NOTIFICATION_PERMISSION_GRANTED', handlePermissionGranted);

    return () => {
      unsub();
      window.removeEventListener('MAXPLAY_NOTIFICATION_PERMISSION_GRANTED', handlePermissionGranted);
    };
  }, [user?.uid, showSplash]);

  // Auto-dismiss in-app push notification banner after 7 seconds
  useEffect(() => {
    if (!inAppNotif) return;
    const timer = setTimeout(() => {
      setInAppNotif(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [inAppNotif]);

  // Subscribe to real-time active downloads for badge
  useEffect(() => {
    const unsub = downloadManager.subscribe((tasks) => {
      const active = tasks.filter((t) => t.status === 'downloading' || t.status === 'queued').length;
      setDownloadBadgeCount(active);
    });
    return () => unsub();
  }, []);

  // Restore saved active tab from PWA storage only if it's an ongoing session (resumed)
  const [activeTab, setActiveTabState] = useState<TabType>(() => {
    if (hasActiveSession) {
      const saved = localStorage.getItem('MAXPLAY_PWA_LAST_TAB') as TabType;
      return (saved && ['home', 'downloads', 'anime', 'me', 'search'].includes(saved)) ? saved : 'home';
    }
    // For a fresh start, always go to home
    localStorage.setItem('MAXPLAY_PWA_LAST_TAB', 'home');
    return 'home';
  });

  const [detailOpenByTab, setDetailOpenByTab] = useState<Record<string, boolean>>({
    home: false,
    downloads: false,
    search: false,
    anime: false,
    me: false,
  });
  const [exitToastVisible, setExitToastVisible] = useState(false);
  const lastBackPressTime = useRef<number>(0);

  const isCurrentDetailOpen = Boolean(detailOpenByTab[activeTab]);

  // Keep phone Status Bar simple black (#0A0A0A) on all non-Home tabs or when any Detail/Filter screen is open
  useEffect(() => {
    const isHomeTopScreen = activeTab === 'home' && !isCurrentDetailOpen && !showSplash && isAuthenticated;
    (window as any).__maxplayIsHomeTopVisible = isHomeTopScreen;
    if (!isHomeTopScreen) {
      NativeBridgeService.setNativeStatusBarColor('#0A0A0A');
    } else {
      window.dispatchEvent(new CustomEvent('MAXPLAY_STATUSBAR_RECHECK'));
    }
  }, [activeTab, isCurrentDetailOpen, showSplash, isAuthenticated]);

  // Sync PWA active tab state without triggering hash-anchor scroll-to-top
  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    localStorage.setItem('MAXPLAY_PWA_LAST_TAB', tab);
    try {
      const cleanUrl = window.location.pathname + window.location.search;
      window.history.pushState({ tab, isDetailOpen: false }, '', cleanUrl);
    } catch (_) {}
  };

  // Mark PWA session as active once initialized and set up initial back-buffer state
  useEffect(() => {
    sessionStorage.setItem('MAXPLAY_SESSION_ACTIVE', 'true');
    try {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
      const cleanUrl = window.location.pathname + window.location.search;
      window.history.pushState({ tab: activeTab, isDetailOpen: isCurrentDetailOpen }, '', cleanUrl);
    } catch (_) {}
  }, []);

  // Handle Detail Open changes and push history state without hash jump
  const handleDetailOpenChange = useCallback((tab: string, isOpen: boolean) => {
    setDetailOpenByTab(prev => {
      if (prev[tab] === isOpen) return prev;
      return { ...prev, [tab]: isOpen };
    });

    try {
      if (isOpen) {
        const cleanUrl = window.location.pathname + window.location.search;
        window.history.pushState({ tab, isDetailOpen: true }, '', cleanUrl);
      }
    } catch (_) {}
  }, []);

  const handleHomeDetailChange = useCallback((isOpen: boolean) => handleDetailOpenChange('home', isOpen), [handleDetailOpenChange]);
  const handleSearchDetailChange = useCallback((isOpen: boolean) => handleDetailOpenChange('search', isOpen), [handleDetailOpenChange]);
  const handleAnimeDetailChange = useCallback((isOpen: boolean) => handleDetailOpenChange('anime', isOpen), [handleDetailOpenChange]);
  const handleMeDetailChange = useCallback((isOpen: boolean) => handleDetailOpenChange('me', isOpen), [handleDetailOpenChange]);

  // Universal Hardware/Phone Triangle Back Button Interceptor (Web/PWA popstate + Native Android APK Bridge)
  useEffect(() => {
    const executeBackNavigation = (): 'HANDLED' | 'EXIT_CONFIRMED' => {
      const cleanUrl = window.location.pathname + window.location.search;

      // 0. If Popunder Ad Shield overlay is open, close it and return to Video Player / Details Screen
      if (adManager.isAdOverlayOpen()) {
        adManager.closeAdOverlay();
        try {
          window.history.pushState({ tab: activeTab, isDetailOpen: isCurrentDetailOpen }, '', cleanUrl);
        } catch {}
        return 'HANDLED';
      }

      // 1. If Video Player is in Fullscreen mode, exit fullscreen first
      if (
        (window as any).__isMaxPlayPlayerFullscreen &&
        typeof (window as any).__exitMaxPlayPlayerFullscreen === 'function'
      ) {
        (window as any).__exitMaxPlayPlayerFullscreen();
        try {
          window.history.pushState({ tab: activeTab, isDetailOpen: isCurrentDetailOpen }, '', cleanUrl);
        } catch {}
        return 'HANDLED';
      }

      // 2. If on Downloads tab and OfflineDetailScreen or Transfer modal is open, pop it back to Downloads tab
      if (
        activeTab === 'downloads' &&
        typeof (window as any).__handleDownloadsScreenBack === 'function' &&
        (window as any).__handleDownloadsScreenBack()
      ) {
        try {
          window.history.pushState({ tab: 'downloads', isDetailOpen: false }, '', cleanUrl);
        } catch {}
        return 'HANDLED';
      }

      // 3. If a detail modal or sub-screen (e.g., Me > Settings, Me > Messages, ContentDetail) is open on active tab, pop it back to parent tab!
      if (isCurrentDetailOpen) {
        const eventName = `MAXPLAY_POP_STACK_${activeTab.toUpperCase()}`;
        window.dispatchEvent(new CustomEvent(eventName));
        try {
          window.history.pushState({ tab: activeTab, isDetailOpen: false }, '', cleanUrl);
        } catch {}
        return 'HANDLED';
      }

      // 4. If on a non-home tab (e.g., Search, Downloads, Me, Anime), go back to Home tab
      if (activeTab !== 'home') {
        setActiveTabState('home');
        localStorage.setItem('MAXPLAY_PWA_LAST_TAB', 'home');
        try {
          window.history.pushState({ tab: 'home', isDetailOpen: false }, '', cleanUrl);
        } catch {}
        return 'HANDLED';
      }

      // 5. Already on Home tab with no sub-screens open: Double-Back confirmation to exit
      const now = Date.now();
      if (now - lastBackPressTime.current < 2500) {
        setExitToastVisible(false);
        return 'EXIT_CONFIRMED';
      } else {
        lastBackPressTime.current = now;
        setExitToastVisible(true);
        try {
          window.history.pushState({ tab: 'home', isDetailOpen: false }, '', cleanUrl);
        } catch {}
        setTimeout(() => setExitToastVisible(false), 2500);
        return 'HANDLED';
      }
    };

    // Expose to Android Native Kotlin MainActivity.onBackPressedDispatcher
    window.__handleMaxPlayHardwareBack = executeBackNavigation;

    const handlePopState = () => {
      executeBackNavigation();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeTab, isCurrentDetailOpen]);

  // Page visibility listener for PWA resume (Prevents app reset when minimizing/switching apps)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App resumed from background - restore tab state without resetting
        const savedTab = localStorage.getItem('MAXPLAY_PWA_LAST_TAB') as TabType;
        if (savedTab && ['home', 'downloads', 'search', 'anime', 'me'].includes(savedTab)) {
          setActiveTabState(savedTab);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  if (maintenanceMode) {
    return <MaintenanceScreen appName={appName} />;
  }

  // Non-dismissible Admin Force-Update Gate: blocks old APK versions when Admin enables forceUpdate / sends a mandatory update message
  if (forceUpdate) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#09090b] p-5 text-center select-none overflow-y-auto">
        <div className="relative flex w-full max-w-md flex-col items-center rounded-3xl bg-gradient-to-b from-[#240d12] via-[#121216] to-[#0c0c10] p-6 border border-red-500/50 shadow-[0_0_60px_rgba(239,68,68,0.35)]">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-lg shadow-red-600/40 border border-red-400/50">
            <span className="absolute -inset-1 rounded-2xl bg-red-500/40 animate-ping opacity-75 pointer-events-none" />
            <ShieldAlert className="relative z-10 h-8 w-8 stroke-[2.4]" />
          </div>

          <span className="mt-4 rounded-full bg-red-500/20 border border-red-500/40 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-red-300 animate-pulse">
            Mandatory APK Update Required • {formattedLatestVersion}
          </span>

          <h1 className="mt-3 text-xl sm:text-2xl font-black text-white tracking-tight">
            {updateTitle || `Update ${appName} to Continue`}
          </h1>

          {/* Version Comparison Box */}
          <div className="mt-4 grid w-full grid-cols-2 gap-2.5 rounded-2xl bg-black/60 p-3 border border-white/10 text-left">
            <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                Check Update Version
              </span>
              <span className="mt-0.5 block text-sm font-black text-zinc-200">
                {formattedCurrentVersion || `v${currentApkVersion}`}
              </span>
            </div>
            <div className="rounded-xl bg-red-500/15 p-2.5 border border-red-500/40">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-red-300">
                Admin Required APK
              </span>
              <span className="mt-0.5 block text-sm font-black text-red-400">
                {formattedLatestVersion || `v${latestApkVersion || 'Latest'}`}
              </span>
            </div>
          </div>

          {/* Admin Message & Release Notes */}
          <div className="mt-3.5 w-full rounded-2xl bg-white/[0.04] p-3.5 border border-white/10 text-left">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-400">
                {adminUpdateMessage ? 'Official Admin Update Message' : 'Release Notes'}
              </span>
              {adminUpdateMessage?.date && (
                <span className="text-[10px] text-zinc-400">{adminUpdateMessage.date}</span>
              )}
            </div>
            <p className="text-xs text-[#D4D4D8] leading-relaxed whitespace-pre-line">
              {updateReleaseNotes ||
                `Your current version (${formattedCurrentVersion}) is outdated. Admin requires updating to ${formattedLatestVersion} to continue streaming movies, series, and anime.`}
            </p>
            {updateBannerUrl && (
              <div className="mt-3 w-full max-h-40 rounded-xl overflow-hidden bg-black/50 border border-white/10">
                <img
                  src={updateBannerUrl}
                  alt="Admin Update Banner"
                  className="w-full max-h-40 object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {forceApkProgress && (
            <div className="mt-4 w-full rounded-xl bg-black/60 border border-red-500/30 p-3 space-y-1.5 text-left">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-zinc-200 truncate pr-2">{forceApkProgress.message}</span>
                <span className="text-emerald-400 font-black tabular-nums shrink-0">
                  {forceApkProgress.progress}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-emerald-400 transition-all duration-200"
                  style={{ width: `${Math.max(4, forceApkProgress.progress)}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={forceApkProgress?.status === 'downloading'}
            onClick={() => {
              NativeBridgeService.triggerApkUpdate(
                apkDownloadUrl,
                formattedLatestVersion,
                updateTitle || `MaxPlay ${formattedLatestVersion} Mandatory Update`,
                (state) => setForceApkProgress(state)
              );
            }}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-600/40 hover:brightness-110 active:scale-95 transition cursor-pointer disabled:opacity-75"
          >
            <Download className="h-4 w-4 stroke-[2.5]" />
            <span>
              {forceApkProgress?.status === 'downloading'
                ? `Downloading APK (${forceApkProgress.progress}%)...`
                : forceApkProgress?.status === 'installing'
                ? 'Launching Android Installer...'
                : `Update App Now (${formattedLatestVersion})`}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Handle splash completion and authentication verification barrier
  if (showSplash || (isAuthLoading && !isAuthenticated)) {
    return (
      <SplashScreen
        isVerifyingAuth={isAuthLoading}
        onFinish={() => {
          setShowSplash(false);
          sessionStorage.setItem('MAXPLAY_SESSION_ACTIVE', 'true');
        }}
      />
    );
  }

  // Handle onboarding
  if (showOnboarding) {
    return (
      <OnboardingScreen
        onComplete={() => {
          localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
          setShowOnboarding(false);
        }}
      />
    );
  }

  // Handle Auth screens if not authenticated
  if (!isAuthenticated) {
    if (authScreen === 'register') {
      return (
        <RegisterScreen
          onNavigateToLogin={() => setAuthScreen('login')}
          onSuccess={() => setActiveTab('home')}
        />
      );
    }
    if (authScreen === 'forgot') {
      return (
        <ForgotPasswordScreen
          onBack={() => setAuthScreen('login')}
        />
      );
    }
    return (
      <LoginScreen
        onNavigateToRegister={() => setAuthScreen('register')}
        onNavigateToForgotPassword={() => setAuthScreen('forgot')}
        onSuccess={() => setActiveTab('home')}
      />
    );
  }

  // Handle Main App Tab Navigator
  return (
    <div className="relative h-full w-full bg-[#0A0A0A] overflow-hidden">
      {/* Account Suspended Overlay Modal */}
      <SuspendedAccountModal />

      {/* Persistent Active Tab Screens */}
      <div className={`absolute inset-0 ${isCurrentDetailOpen ? 'pb-0 md:pb-0 md:pl-0' : 'pb-[calc(58px+max(env(safe-area-inset-bottom,0px),8px))] md:pb-0 md:pl-[80px]'}`}>
        <div className={`h-full w-full ${activeTab === 'home' ? 'block' : 'hidden'}`}>
          <HomeStack
            onSelectContent={(content) => {
              console.log('Selected Content:', content);
            }}
            onOpenSearch={() => setActiveTab('search')}
            onOpenNotifications={() => setActiveTab('me')}
            onDetailOpenChange={handleHomeDetailChange}
          />
        </div>

        <div className={`h-full w-full ${activeTab === 'downloads' ? 'block' : 'hidden'}`}>
          <DownloadsScreen
            onPlayContent={(contentId) => {
              const item = contentList.find((c) => c.id === contentId);
              if (item) {
                setActiveTab('home');
                window.dispatchEvent(new CustomEvent('MAXPLAY_SELECT_CONTENT', { detail: item }));
              }
            }}
          />
        </div>

        <div className={`h-full w-full ${activeTab === 'search' ? 'block' : 'hidden'}`}>
          <SearchStack
            onSelectContent={(content) => {
              console.log('Selected Content:', content);
            }}
            onDetailOpenChange={handleSearchDetailChange}
          />
        </div>

        <div className={`h-full w-full ${activeTab === 'anime' ? 'block' : 'hidden'}`}>
          <AnimeStack
            onOpenSearch={() => setActiveTab('search')}
            onSelectContent={(content) => {
              console.log('Selected Anime Content:', content);
            }}
            onDetailOpenChange={handleAnimeDetailChange}
          />
        </div>

        <div className={`h-full w-full ${activeTab === 'me' ? 'block' : 'hidden'}`}>
          <MeStack
            onLogout={logout}
            onPlayContent={(contentId) => {
              console.log('Play content from Me tab:', contentId);
            }}
            onDetailOpenChange={handleMeDetailChange}
          />
        </div>
      </div>

      {/* Bottom Tab Bar / Side Tab Bar - Automatically hidden when in Details screen */}
      {!isCurrentDetailOpen && (
        <MainTabNavigator
          activeTab={activeTab}
          onTabChange={setActiveTab}
          downloadBadgeCount={downloadBadgeCount}
        />
      )}

      {/* Double Back-button Exit Toast Popup */}
      <AnimatePresence>
        {exitToastVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-[calc(72px+max(env(safe-area-inset-bottom,0px),8px))] left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5 bg-[#1C1C1E]/95 backdrop-blur-md border border-white/15 text-white text-xs font-semibold rounded-full shadow-2xl flex items-center gap-2 pointer-events-none"
          >
            <span>📱</span>
            <span>Press back again to exit MaxPlay</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-Time In-App Push Notification Banner for Admin Announcements (with Attached Image) */}
      <AnimatePresence>
        {inAppNotif && (
          <motion.div
            initial={{ opacity: 0, y: -32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -32, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 z-[99998]"
          >
            <div
              onClick={() => {
                setInAppNotif(null);
                setActiveTabState('me');
                localStorage.setItem('MAXPLAY_PWA_LAST_TAB', 'me');
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('MAXPLAY_OPEN_ME_MESSAGES'));
                }, 120);
              }}
              className="flex flex-col gap-2.5 bg-[#14141D]/95 backdrop-blur-xl p-3.5 rounded-2xl border border-purple-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.85)] cursor-pointer hover:border-purple-400/70 transition"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#06B6D4] text-white shrink-0 shadow-md">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-xs font-extrabold text-white truncate">{inAppNotif.title}</span>
                    <span className="text-[11px] text-[#D4D4D8] line-clamp-2 leading-snug">{inAppNotif.body}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInAppNotif(null);
                  }}
                  className="p-1 rounded-lg text-[#71717A] hover:text-white cursor-pointer shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {inAppNotif.imageUrl && (
                <div className="w-full h-28 rounded-xl overflow-hidden bg-black/50 border border-white/10">
                  <img
                    src={inAppNotif.imageUrl}
                    alt={inAppNotif.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Mode Alert Banner */}
      <AnimatePresence>
        {showOfflineModal && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 z-[9999]"
          >
            <div className="flex items-center justify-between gap-3 bg-[#181820]/95 backdrop-blur-md p-3.5 rounded-2xl border border-amber-500/40 shadow-2xl shadow-black/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 flex-shrink-0">
                  <WifiOff className="h-4 w-4" />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-xs font-bold text-white truncate">You are Offline</span>
                  <span className="text-[10px] text-[#A1A1AA] truncate">Watch your downloaded content without internet</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowOfflineModal(false);
                    setActiveTab('downloads');
                  }}
                  className="rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] px-3 py-1.5 text-xs font-bold text-white shadow-md cursor-pointer hover:opacity-90 active:scale-95"
                >
                  Downloads
                </button>
                <button
                  type="button"
                  onClick={() => setShowOfflineModal(false)}
                  className="p-1 rounded-lg text-[#71717A] hover:text-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
