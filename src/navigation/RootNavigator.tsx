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
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, X } from 'lucide-react';

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, logout, isLoading: isAuthLoading } = useAuth();
  const { maintenanceMode, appName } = useGeneralSettings();

  // Offline Auto-Detection
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);

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

  // Hardware/Phone Triangle Back Button Interceptor
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const cleanUrl = window.location.pathname + window.location.search;
      // 1. If a detail modal or sub-screen is open on active tab, pop it
      if (isCurrentDetailOpen) {
        const eventName = `MAXPLAY_POP_STACK_${activeTab.toUpperCase()}`;
        window.dispatchEvent(new CustomEvent(eventName));
        return;
      }

      // 2. If on a non-home tab (e.g., Search, Me, Anime), go back to Home tab
      if (activeTab !== 'home') {
        setActiveTabState('home');
        localStorage.setItem('MAXPLAY_PWA_LAST_TAB', 'home');
        window.history.pushState({ tab: 'home', isDetailOpen: false }, '', cleanUrl);
        return;
      }

      // 3. If already on Home tab with no details open, handle Double-Back to Exit
      const now = Date.now();
      if (now - lastBackPressTime.current < 2500) {
        setExitToastVisible(false);
      } else {
        lastBackPressTime.current = now;
        setExitToastVisible(true);
        window.history.pushState({ tab: 'home', isDetailOpen: false }, '', cleanUrl);
        setTimeout(() => setExitToastVisible(false), 2500);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab, isCurrentDetailOpen]);

  // Page visibility listener for PWA resume (Prevents app reset when minimizing/switching apps)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App resumed from background - restore tab state without resetting
        const savedTab = localStorage.getItem('MAXPLAY_PWA_LAST_TAB') as TabType;
        if (savedTab && ['home', 'search', 'anime', 'me'].includes(savedTab)) {
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
