import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Bell,
  Globe,
  Tv,
  Shield,
  PictureInPicture,
  RefreshCw,
  Info,
  FileText,
  LogOut,
  ChevronRight,
  DownloadCloud,
  CheckCircle2,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { LegalDocScreen, LegalDocType } from './LegalDocScreen';
import { MaxPlayLogo } from '../../components/common/MaxPlayLogo';
import { NativeBanner } from '../../components/ads/NativeBanner';

interface SettingsScreenProps {
  onBack: () => void;
  onLogout?: () => void;
  onOpenFeedback?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, onLogout, onOpenFeedback }) => {
  const { logout } = useAuth();

  // Full Screen Legal Doc viewer state
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType | null>(null);

  // Settings State persisted in LocalStorage
  const [familyMode, setFamilyMode] = useState(() => {
    return localStorage.getItem('maxplay_family_mode') === 'true';
  });
  const [autoMiniplayer, setAutoMiniplayer] = useState(() => {
    return localStorage.getItem('maxplay_auto_miniplayer') === 'true';
  });

  const [preferredLang, setPreferredLang] = useState(() => localStorage.getItem('maxplay_preferred_lang') || 'English');
  const [preferredQuality, setPreferredQuality] = useState(() => localStorage.getItem('maxplay_preferred_quality') || 'Auto');

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [modalInfo, setModalInfo] = useState<{ title: string; body: string } | null>(null);
  
  // Custom Settings Modals
  const [showLangModal, setShowLangModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Global Admin Settings
  const [appLanguages, setAppLanguages] = useState<string[]>(['English', 'Hindi']);
  const [appVersion, setAppVersion] = useState('v2.5.0');
  const [apkUrl, setApkUrl] = useState('');

  const [legalContent, setLegalContent] = useState<any>({
    aboutUs: '',
    privacyPolicy: '',
    userAgreement: ''
  });
  const [hasUnreadLegal, setHasUnreadLegal] = useState(false);

  useEffect(() => {
    const fetchGeneralSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'general'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.appLanguages && Array.isArray(data.appLanguages)) {
            setAppLanguages(data.appLanguages);
          } else if (data.appLanguages) {
            setAppLanguages(data.appLanguages.split(',').map((l: string) => l.trim()));
          }
          if (data.appVersion) setAppVersion(data.appVersion);
          if (data.downloadUrl) setApkUrl(data.downloadUrl);
        }
      } catch (e) {
        console.log('Error fetching general settings', e);
      }
    };

    const fetchLegalContent = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'legal'));
        if (snap.exists()) {
          const data = snap.data();
          setLegalContent(data as any);
          
          const serverUpdated = data.updatedAt;
          const localRead = localStorage.getItem('maxplay_legal_read');
          if (serverUpdated && (!localRead || new Date(serverUpdated) > new Date(localRead))) {
            setHasUnreadLegal(true);
          } else {
            setHasUnreadLegal(false);
          }
        }
      } catch (e) {
        console.log('Error fetching legal content', e);
      }
    };

    fetchGeneralSettings();
    fetchLegalContent();
  }, []);

  const toggleFamilyMode = () => {
    const val = !familyMode;
    setFamilyMode(val);
    localStorage.setItem('maxplay_family_mode', String(val));
  };

  const toggleAutoMiniplayer = () => {
    const val = !autoMiniplayer;
    setAutoMiniplayer(val);
    localStorage.setItem('maxplay_auto_miniplayer', String(val));
  };

  const handleSetLang = (lang: string) => {
    setPreferredLang(lang);
    localStorage.setItem('maxplay_preferred_lang', lang);
    setShowLangModal(false);
  };

  const handleSetQuality = (q: string) => {
    setPreferredQuality(q);
    localStorage.setItem('maxplay_preferred_quality', q);
    setShowQualityModal(false);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  };

  // If a legal or informational document is active, render the full-screen view
  if (activeLegalDoc) {
    return (
      <LegalDocScreen
        initialDoc={activeLegalDoc}
        onBack={() => setActiveLegalDoc(null)}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#0A0A0A] p-4 text-left select-none scrollbar-none pb-20">
      {/* HEADER */}
      <div className="flex items-center gap-3 py-2 border-b border-[#1C1C1E] pb-3 mb-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-2 text-white hover:bg-[#121212] transition cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-white">Settings</h2>
      </div>

      <NativeBanner />

      {/* SECTION 1: Your app and preferences */}
      <div className="mt-4 flex flex-col gap-2">
        <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider px-1">
          Your app and preferences
        </span>

        <div className="flex flex-col rounded-2xl bg-[#121212] border border-[#1C1C1E] divide-y divide-[#1C1C1E] overflow-hidden">
          {/* Notifications */}
          <button
            type="button"
            onClick={() =>
              setModalInfo({
                title: 'Notification Preferences',
                body: 'Push notifications for new episode updates, recommendations, and system alerts are enabled.',
              })
            }
            className="flex items-center justify-between p-4 hover:bg-[#1C1C1E]/50 transition cursor-pointer text-left outline-none"
          >
            <div className="flex items-center gap-3 text-white">
              <Bell className="h-5 w-5 text-[#8B5CF6]" />
              <span className="text-sm font-medium">Notifications</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#6B7280]" />
          </button>

          {/* Language Selection */}
          <button
            type="button"
            onClick={() => setShowLangModal(true)}
            className="flex items-center justify-between p-4 hover:bg-[#1C1C1E]/50 transition cursor-pointer text-left outline-none w-full gap-4"
          >
            <div className="flex items-center gap-3 text-white min-w-0 shrink-0">
              <Globe className="h-5 w-5 text-[#06B6D4] shrink-0" />
              <span className="text-sm font-medium truncate">Language</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280] min-w-0">
              <span className="truncate max-w-[120px] sm:max-w-[160px] text-right">{preferredLang}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </div>
          </button>

          {/* Watch Quality Options */}
          <button
            type="button"
            onClick={() => setShowQualityModal(true)}
            className="flex items-center justify-between p-4 hover:bg-[#1C1C1E]/50 transition cursor-pointer text-left outline-none w-full gap-4"
          >
            <div className="flex items-center gap-3 text-white min-w-0 shrink-0">
              <Tv className="h-5 w-5 text-[#10B981] shrink-0" />
              <span className="text-sm font-medium truncate">Quality Watch</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280] min-w-0">
              <span className="truncate max-w-[120px] sm:max-w-[160px] text-right">{preferredQuality}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </div>
          </button>

          {/* Family Mode */}
          <div className="flex flex-col p-4 gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <Shield className="h-5 w-5 text-[#3B82F6]" />
                <span className="text-sm font-medium">Family Mode</span>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={toggleFamilyMode}
                className={`relative flex h-[30px] w-[50px] items-center rounded-full p-1 transition cursor-pointer ${
                  familyMode ? 'bg-[#8B5CF6]' : 'bg-[#1C1C1E]'
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                    familyMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-[#6B7280] pl-8">
              This helps hide potentially mature videos. No filter is 100% accurate.
            </p>
          </div>

          {/* Auto activate Miniplayer */}
          <div className="flex flex-col p-4 gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <PictureInPicture className="h-5 w-5 text-amber-400" />
                <span className="text-sm font-medium">Auto activate Miniplayer</span>
              </div>

              <button
                type="button"
                onClick={toggleAutoMiniplayer}
                className={`relative flex h-[30px] w-[50px] items-center rounded-full p-1 transition cursor-pointer ${
                  autoMiniplayer ? 'bg-[#8B5CF6]' : 'bg-[#1C1C1E]'
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                    autoMiniplayer ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-[#6B7280] pl-8">
              When enabled, navigating away from the app during playback will automatically trigger Picture-in-Picture.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: More info and support */}
      <div className="mt-6 flex flex-col gap-2">
        <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider px-1">
          More info and support
        </span>

        <div className="flex flex-col rounded-2xl bg-[#121212] border border-[#1C1C1E] divide-y divide-[#1C1C1E] overflow-hidden">
          {/* Check update */}
          <button
            type="button"
            onClick={() => setShowUpdateModal(true)}
            className="flex items-center justify-between p-4 hover:bg-[#1C1C1E]/50 transition cursor-pointer text-left outline-none"
          >
            <div className="flex items-center gap-3 text-white">
              <RefreshCw className="h-5 w-5 text-[#10B981]" />
              <span className="text-sm font-medium">Check update</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#10B981]/20 px-2 py-0.5 text-[10px] font-bold text-[#10B981]">
                {appVersion}
              </span>
              <ChevronRight className="h-4 w-4 text-[#6B7280]" />
            </div>
          </button>

          {/* About us */}
          <button
            type="button"
            onClick={() => setActiveLegalDoc('about')}
            className="flex items-center justify-between p-4 hover:bg-[#1C1C1E]/50 transition cursor-pointer text-left outline-none relative"
          >
            <div className="flex items-center gap-3 text-white relative">
              <Info className="h-5 w-5 text-[#8B5CF6]" />
              <span className="text-sm font-medium">About us</span>
              {hasUnreadLegal && (
                <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-[#EF4444] animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#8B5CF6]/15 px-2 py-0.5 text-[10px] font-bold text-[#A78BFA] border border-[#8B5CF6]/20">
                SAN TEAM
              </span>
              <ChevronRight className="h-4 w-4 text-[#6B7280]" />
            </div>
          </button>

          {/* Privacy Policy */}
          <button
            type="button"
            onClick={() => setActiveLegalDoc('privacy')}
            className="flex items-center justify-between p-4 hover:bg-[#1C1C1E]/50 transition cursor-pointer text-left outline-none relative"
          >
            <div className="flex items-center gap-3 text-white relative">
              <FileText className="h-5 w-5 text-[#06B6D4]" />
              <span className="text-sm font-medium">Privacy Policy</span>
              {hasUnreadLegal && (
                <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-[#EF4444] animate-pulse" />
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-[#6B7280]" />
          </button>

          {/* User Agreement */}
          <button
            type="button"
            onClick={() => setActiveLegalDoc('agreement')}
            className="flex items-center justify-between p-4 hover:bg-[#1C1C1E]/50 transition cursor-pointer text-left outline-none relative"
          >
            <div className="flex items-center gap-3 text-white relative">
              <FileText className="h-5 w-5 text-[#F59E0B]" />
              <span className="text-sm font-medium">User Agreement</span>
              {hasUnreadLegal && (
                <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-[#EF4444] animate-pulse" />
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-[#6B7280]" />
          </button>

          {/* Feedback & Bug Report */}
          {onOpenFeedback && (
            <button
              type="button"
              onClick={onOpenFeedback}
              className="flex items-center justify-between p-4 hover:bg-[#1C1C1E]/50 transition cursor-pointer text-left outline-none"
            >
              <div className="flex items-center gap-3 text-white">
                <FileText className="h-5 w-5 text-[#8B5CF6]" />
                <span className="text-sm font-medium">Send Feedback & Bug Reports</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#8B5CF6]/15 px-2 py-0.5 text-[10px] font-bold text-[#A78BFA] border border-[#8B5CF6]/20">
                  Support Hub
                </span>
                <ChevronRight className="h-4 w-4 text-[#6B7280]" />
              </div>
            </button>
          )}

          {/* Log out */}
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center justify-between p-4 hover:bg-red-500/10 transition cursor-pointer text-[#EF4444] text-left outline-none"
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-bold">Log out</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#EF4444]" />
          </button>
        </div>

        {/* Brand Footer */}
        <div className="mt-8 flex flex-col items-center justify-center gap-2 pb-6 text-center">
          <MaxPlayLogo size="sm" withText={true} glow={true} />
          <p className="text-[11px] text-[#71717A]">
            Official MaxPlay Streaming • {appVersion}
          </p>
          <p className="text-[10px] text-[#52525B]">
            Engineered & Maintained by <span className="text-[#A1A1AA] font-semibold">SAN TEAM</span>
          </p>
        </div>
      </div>

      {/* LANGUAGE MODAL */}
      {showLangModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
          <div className="flex w-full sm:max-w-xs flex-col rounded-t-3xl sm:rounded-3xl bg-[#121212] border border-[#1C1C1E] shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
            <div className="flex items-center justify-between p-5 border-b border-[#1C1C1E]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-[#06B6D4]" /> Select Language
              </h3>
              <button onClick={() => setShowLangModal(false)} className="text-[#A1A1AA] hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col p-2 max-h-[50vh] overflow-y-auto">
              {appLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleSetLang(lang)}
                  className={`flex items-center justify-between p-4 rounded-xl transition cursor-pointer ${
                    preferredLang === lang ? 'bg-[#06B6D4]/10' : 'hover:bg-[#1C1C1E]'
                  }`}
                >
                  <span className={`text-sm font-medium ${preferredLang === lang ? 'text-[#06B6D4]' : 'text-white'}`}>
                    {lang}
                  </span>
                  {preferredLang === lang && <CheckCircle2 className="h-5 w-5 text-[#06B6D4]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QUALITY MODAL */}
      {showQualityModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
          <div className="flex w-full sm:max-w-xs flex-col rounded-t-3xl sm:rounded-3xl bg-[#121212] border border-[#1C1C1E] shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
            <div className="flex items-center justify-between p-5 border-b border-[#1C1C1E]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tv className="h-5 w-5 text-[#10B981]" /> Watch Quality
              </h3>
              <button onClick={() => setShowQualityModal(false)} className="text-[#A1A1AA] hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col p-2 max-h-[50vh] overflow-y-auto">
              {['Auto', '1080p', '720p', '480p', '360p'].map((q) => (
                <button
                  key={q}
                  onClick={() => handleSetQuality(q)}
                  className={`flex items-center justify-between p-4 rounded-xl transition cursor-pointer ${
                    preferredQuality === q ? 'bg-[#10B981]/10' : 'hover:bg-[#1C1C1E]'
                  }`}
                >
                  <span className={`text-sm font-medium ${preferredQuality === q ? 'text-[#10B981]' : 'text-white'}`}>
                    {q}
                  </span>
                  {preferredQuality === q && <CheckCircle2 className="h-5 w-5 text-[#10B981]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* UPDATE MODAL */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="flex w-full max-w-sm flex-col rounded-3xl bg-[#121212] p-6 border border-[#1C1C1E] text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#10B981]/20 text-[#10B981]">
              <RefreshCw className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-white">App Update Status</h3>
            <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed">
              You are running the official MaxPlay Media Platform version <strong className="text-white">{appVersion}</strong>.
            </p>
            
            {apkUrl && (
              <div className="mt-6 flex flex-col gap-3">
                <a
                  href={apkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#10B981] py-3.5 text-sm font-bold text-black shadow-lg shadow-emerald-500/20 hover:bg-[#059669] active:scale-95 transition cursor-pointer"
                >
                  <DownloadCloud className="h-5 w-5" />
                  Download Latest APK
                </a>
              </div>
            )}
            
            <button
              type="button"
              onClick={() => setShowUpdateModal(false)}
              className="mt-4 w-full rounded-2xl bg-[#1C1C1E] py-3 text-sm font-bold text-[#A1A1AA] hover:text-white transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION DIALOG */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="flex w-full max-w-xs flex-col rounded-3xl bg-[#121212] p-6 border border-[#1C1C1E] text-center shadow-2xl">
            <h3 className="text-lg font-bold text-white">Log Out?</h3>
            <p className="mt-2 text-xs text-[#A1A1AA]">
              Are you sure you want to log out of your MaxPlay account?
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="w-full rounded-2xl bg-[#EF4444] py-3 text-xs font-bold text-white shadow-lg shadow-red-500/30 hover:bg-red-600 transition cursor-pointer"
              >
                Confirm Log Out
              </button>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full rounded-2xl bg-[#1C1C1E] py-3 text-xs font-bold text-[#A1A1AA] hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}      {/* Custom Info Modal */}
      {modalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="flex w-full max-w-sm flex-col rounded-3xl bg-[#121212] p-6 border border-[#1C1C1E] text-left shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-bold text-white">{modalInfo.title}</h3>
               <button onClick={() => setModalInfo(null)} className="p-2 hover:bg-[#1C1C1E] rounded-full transition">
                 <X className="h-5 w-5 text-[#A1A1AA]" />
               </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto pr-2 scrollbar-none">
              <p className="text-sm text-[#A1A1AA] leading-relaxed whitespace-pre-wrap">{modalInfo.body}</p>
            </div>

            <button
              type="button"
              onClick={() => setModalInfo(null)}
              className="mt-6 w-full rounded-2xl bg-[#8B5CF6] py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20 hover:bg-[#7C3AED] active:scale-95 transition cursor-pointer"
            >
              Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
