import React, { useState, useEffect, useRef } from 'react';
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
import { useAuth } from '../hooks/useAuth';
import { STORAGE_KEYS } from '../utils/constants';
import { useGeneralSettings } from '../hooks/useGeneralSettings';
import { MaintenanceScreen } from '../screens/common/MaintenanceScreen';
import { SuspendedAccountModal } from '../components/common/SuspendedAccountModal';
import { motion, AnimatePresence } from 'motion/react';

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const { maintenanceMode, appName } = useGeneralSettings();

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
  
  // Restore saved active tab from PWA storage only if it's an ongoing session (resumed)
  const [activeTab, setActiveTabState] = useState<TabType>(() => {
    if (hasActiveSession) {
      const saved = localStorage.getItem('MAXPLAY_PWA_LAST_TAB') as TabType;
      return (saved && ['home', 'search', 'anime', 'me'].includes(saved)) ? saved : 'home';
    }
    // For a fresh start, always go to home
    localStorage.setItem('MAXPLAY_PWA_LAST_TAB', 'home');
    return 'home';
  });

  const [detailOpenByTab, setDetailOpenByTab] = useState<Record<string, boolean>>({});
  const [exitToastVisible, setExitToastVisible] = useState(false);
  const lastBackPressTime = useRef<number>(0);

  const isCurrentDetailOpen = Boolean(detailOpenByTab[activeTab]);

  // Sync PWA active tab state
  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    localStorage.setItem('MAXPLAY_PWA_LAST_TAB', tab);
    try {
      window.history.pushState({ tab, isDetailOpen: false }, '', `/#${tab}`);
    } catch (_) {}
  };

  // Mark PWA session as active once initialized and set up initial back-buffer state
  useEffect(() => {
    sessionStorage.setItem('MAXPLAY_SESSION_ACTIVE', 'true');
    try {
      // Ensure we always have a dummy history state on PWA start so that a back gesture is intercepted instead of closing the app immediately
      window.history.pushState({ tab: activeTab, isDetailOpen: isCurrentDetailOpen }, '', window.location.hash || `/#${activeTab}`);
    } catch (_) {}
  }, []);

  // Handle Detail Open changes and push history state
  const handleDetailOpenChange = (tab: string, isOpen: boolean) => {
    setDetailOpenByTab(prev => {
      if (prev[tab] === isOpen) return prev;
      return { ...prev, [tab]: isOpen };
    });

    try {
      if (isOpen) {
        window.history.pushState({ tab, isDetailOpen: true }, '', `/#${tab}-detail`);
      }
    } catch (_) {}
  };

  // Hardware/Phone Triangle Back Button Interceptor
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // 1. If a detail modal is open on active tab, close it
      if (isCurrentDetailOpen) {
        setDetailOpenByTab(prev => ({ ...prev, [activeTab]: false }));
        // Put the history state back so the history stack is still populated for subsequent back clicks
        window.history.pushState({ tab: activeTab, isDetailOpen: false }, '', `/#${activeTab}`);
        return;
      }

      // 2. If on a non-home tab (e.g., Search, Me, Anime), go back to Home tab
      if (activeTab !== 'home') {
        setActiveTabState('home');
        localStorage.setItem('MAXPLAY_PWA_LAST_TAB', 'home');
        // Put the history state back for Home tab
        window.history.pushState({ tab: 'home', isDetailOpen: false }, '', '/#home');
        return;
      }

      // 3. If already on Home tab with no details open, handle Double-Back to Exit
      const now = Date.now();
      if (now - lastBackPressTime.current < 2500) {
        // Allow app exit / native back - we don't push state back, so the next back gesture exits the PWA container
        setExitToastVisible(false);
      } else {
        lastBackPressTime.current = now;
        setExitToastVisible(true);
        // Push state back so app doesn't immediately close on first back press
        window.history.pushState({ tab: 'home', isDetailOpen: false }, '', '/#home');
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

  // Handle splash completion
  if (showSplash) {
    return (
      <SplashScreen
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
      <div className={`absolute inset-0 ${isCurrentDetailOpen ? 'pb-0 md:pb-0 md:pl-0' : 'pb-[62px] md:pb-0 md:pl-[80px]'}`}>
        <div className={`h-full w-full ${activeTab === 'home' ? 'block' : 'hidden'}`}>
          <HomeStack
            onSelectContent={(content) => {
              console.log('Selected Content:', content);
            }}
            onOpenSearch={() => setActiveTab('search')}
            onOpenNotifications={() => setActiveTab('me')}
            onDetailOpenChange={(isOpen) => handleDetailOpenChange('home', isOpen)}
          />
        </div>

        <div className={`h-full w-full ${activeTab === 'search' ? 'block' : 'hidden'}`}>
          <SearchStack
            onSelectContent={(content) => {
              console.log('Selected Content:', content);
            }}
            onDetailOpenChange={(isOpen) => handleDetailOpenChange('search', isOpen)}
          />
        </div>

        <div className={`h-full w-full ${activeTab === 'anime' ? 'block' : 'hidden'}`}>
          <AnimeStack
            onOpenSearch={() => setActiveTab('search')}
            onSelectContent={(content) => {
              console.log('Selected Anime Content:', content);
            }}
            onDetailOpenChange={(isOpen) => handleDetailOpenChange('anime', isOpen)}
          />
        </div>

        <div className={`h-full w-full ${activeTab === 'me' ? 'block' : 'hidden'}`}>
          <MeStack
            onLogout={logout}
            onPlayContent={(contentId) => {
              console.log('Play content from Me tab:', contentId);
            }}
            onDetailOpenChange={(isOpen) => handleDetailOpenChange('me', isOpen)}
          />
        </div>
      </div>

      {/* Bottom Tab Bar / Side Tab Bar - Automatically hidden when in Details screen */}
      {!isCurrentDetailOpen && (
        <MainTabNavigator
          activeTab={activeTab}
          onTabChange={setActiveTab}
          downloadBadgeCount={0}
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
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5 bg-[#1C1C1E]/95 backdrop-blur-md border border-white/15 text-white text-xs font-semibold rounded-full shadow-2xl flex items-center gap-2 pointer-events-none"
          >
            <span>📱</span>
            <span>Press back again to exit MaxPlay</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
