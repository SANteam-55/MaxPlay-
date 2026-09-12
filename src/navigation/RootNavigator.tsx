import React, { useState } from 'react';
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
import { ContentItem } from '../types';
import { useAuth } from '../hooks/useAuth';
import { STORAGE_KEYS } from '../utils/constants';
import { useGeneralSettings } from '../hooks/useGeneralSettings';
import { MaintenanceScreen } from '../screens/common/MaintenanceScreen';
import { SuspendedAccountModal } from '../components/common/SuspendedAccountModal';


export const RootNavigator: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const { maintenanceMode, appName } = useGeneralSettings();

  
  // Navigation States
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
  });
  const [authScreen, setAuthScreen] = useState<'login' | 'register' | 'forgot'>('login');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [detailOpenByTab, setDetailOpenByTab] = useState<Record<string, boolean>>({});

  const isCurrentDetailOpen = Boolean(detailOpenByTab[activeTab]);

  const handleDetailOpenChange = (tab: string, isOpen: boolean) => {
    setDetailOpenByTab(prev => {
      if (prev[tab] === isOpen) return prev;
      return { ...prev, [tab]: isOpen };
    });
  };

  if (maintenanceMode) {
    return <MaintenanceScreen appName={appName} />;
  }

  // Handle splash completion
  if (showSplash) {
    return (
      <SplashScreen
        onFinish={() => setShowSplash(false)}
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
    </div>
  );
};
