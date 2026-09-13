import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToAnnouncements, getUserComments } from '../../services/contentService';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { LogoPlaceholder } from '../../components/common/LogoPlaceholder';
import {
  ListChecks,
  Clock,
  Bell,
  Settings,
  MessageSquare,
  LogOut,
  ChevronRight,
  MessageCircle,
  X,
  Info,
  Sparkles,
} from 'lucide-react';
import { MenuItem } from '../../components/common/MenuItem';
import { NativeBanner } from '../../components/ads/NativeBanner';
import { SocialBar } from '../../components/ads/SocialBar';
import { adManager } from '../../services/adService';

import { WatchHistoryGrid } from '../../components/profile/WatchHistoryGrid';

interface MeScreenProps {
  onOpenEditProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenHistory?: () => void;
  onOpenMyList?: () => void;
  onOpenMessages?: () => void;
  onOpenMyComments?: () => void;
  onOpenFeedback?: () => void;
  onLogout?: () => void;
  onPlayContent?: (contentId: string) => void;
}

export const MeScreen: React.FC<MeScreenProps> = ({
  onOpenEditProfile,
  onOpenSettings,
  onOpenHistory,
  onOpenMyList,
  onOpenMessages,
  onOpenMyComments,
  onOpenFeedback,
  onLogout,
  onPlayContent,
}) => {
  const { user } = useAuth();
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [showCopied, setShowCopied] = useState(false);
  const [modalInfo, setModalInfo] = useState<{ title: string; body: string } | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [hasUnreadFeedback, setHasUnreadFeedback] = useState(false);
  const [hasUnreadLegal, setHasUnreadLegal] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAnnouncements(user?.uid, (msgs) => {
      try {
        const savedRead = localStorage.getItem('maxplay_read_msgs');
        const readIds = savedRead ? JSON.parse(savedRead) : [];
        const unread = msgs.some(m => !readIds.includes(m.id) && m.isUnread !== false);
        setHasUnreadMessages(unread);
      } catch (e) {
        setHasUnreadMessages(false);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(
      query(collection(db, 'feedbacks'), where('userId', '==', user.uid)),
      (snapshot) => {
        try {
          const saved = localStorage.getItem('maxplay_read_feedbacks');
          const readIds = saved ? JSON.parse(saved) : [];
          let hasUnread = false;
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.adminReply && !readIds.includes(docSnap.id)) {
              hasUnread = true;
            }
          });
          setHasUnreadFeedback(hasUnread);
        } catch (e) {}
      }
    );
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    const checkLegalDocs = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'legal'));
        if (snap.exists()) {
          const data = snap.data();
          const serverUpdated = data.updatedAt;
          const localRead = localStorage.getItem('maxplay_legal_read');
          if (serverUpdated && (!localRead || new Date(serverUpdated) > new Date(localRead))) {
            setHasUnreadLegal(true);
          } else {
            setHasUnreadLegal(false);
          }
        }
      } catch (err) {}
    };
    checkLegalDocs();
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://maxplay.app');
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden bg-[#0A0A0A] p-4 pb-32 md:pb-8 text-left select-none scrollbar-none">
      <SocialBar />
      {/* Profile Row Button */}
      <button
        type="button"
        onClick={onOpenEditProfile}
        className="flex w-full flex-col gap-3 rounded-2xl bg-[#141416] p-4 border border-[#27272A] cursor-pointer hover:border-[#3F3F46] active:bg-[#1C1C1E] transition group text-left outline-none shadow-md"
      >
        <div className="flex w-full items-center gap-4">
          <div className="relative shrink-0">
            <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-[#8B5CF6] shadow-md bg-gradient-to-tr from-[#8B5CF6] via-[#6366F1] to-[#06B6D4] flex items-center justify-center text-lg font-black text-white">
              {user?.photoURL ? (
                <img
                  src={user.photoURL || undefined}
                  alt={user.displayName || 'Profile'}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                (user?.displayName || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-5 px-1.5 items-center justify-center rounded-full bg-[#3B82F6] text-[9px] font-bold text-white shadow-md">
              {user?.isPremium ? 'VIP' : 'Free'}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-extrabold text-white truncate group-hover:text-[#8B5CF6] transition">
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </h2>
              <div className="flex items-center text-xs font-semibold text-[#8B5CF6] group-hover:text-[#A78BFA] transition">
                <span>Edit</span>
                <ChevronRight className="h-4 w-4 ml-0.5" />
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#A1A1AA] flex-wrap">
              <span className="font-mono">ID: {user?.uid ? user.uid.substring(0, 8).toUpperCase() : 'N/A'}</span>
              {user?.age && <span>• {user.age} yrs</span>}
              {user?.gender && <span>• {user.gender}</span>}
            </div>
          </div>
        </div>

        {/* User Bio Excerpt if present */}
        {user?.bio && (
          <div className="pt-2 border-t border-[#27272A]/70 text-xs text-[#D4D4D8] font-normal leading-relaxed line-clamp-2">
            "{user.bio}"
          </div>
        )}
      </button>

      {/* WATCH HISTORY GRID */}
      <WatchHistoryGrid onOpenHistory={onOpenHistory} onPlayContent={onPlayContent} />

      {/* NATIVE BANNER AD */}
      <div className="mt-5">
        <NativeBanner />
      </div>

      {/* SECTION 1: LIBRARY & MEDIA */}
      <div className="mt-5 flex flex-col">
        <div className="px-1 mb-2 text-[11px] font-extrabold tracking-wider text-[#A1A1AA] uppercase flex items-center gap-1.5">
          <span>Library & Media</span>
        </div>
        <div className="flex flex-col rounded-2xl bg-[#141416] border border-[#27272A] overflow-hidden shadow-lg divide-y divide-[#27272A]/50">
          <MenuItem
            icon={ListChecks}
            iconColor="text-[#8B5CF6]"
            iconBgColor="bg-[#8B5CF6]/15"
            title="My List"
            subtitle="Saved movies & series"
            onPress={onOpenMyList}
          />
          <MenuItem
            icon={Clock}
            iconColor="text-[#06B6D4]"
            iconBgColor="bg-[#06B6D4]/15"
            title="Watch History"
            subtitle="Recently watched episodes"
            onPress={onOpenHistory}
          />
          <MenuItem
            icon={Bell}
            iconColor="text-[#10B981]"
            iconBgColor="bg-[#10B981]/15"
            title="Messages"
            subtitle="System alerts & notifications"
            hasNotification={hasUnreadMessages}
            onPress={onOpenMessages}
          />
          <MenuItem
            icon={MessageCircle}
            iconColor="text-[#F59E0B]"
            iconBgColor="bg-[#F59E0B]/15"
            title="My Comments"
            subtitle="Comment history, replies & likes"
            onPress={onOpenMyComments}
          />
        </div>
      </div>

      {/* SECTION 2: APP & SETTINGS */}
      <div className="mt-5 flex flex-col">
        <div className="px-1 mb-2 text-[11px] font-extrabold tracking-wider text-[#A1A1AA] uppercase flex items-center gap-1.5">
          <span>Preferences & Help</span>
        </div>
        <div className="flex flex-col rounded-2xl bg-[#141416] border border-[#27272A] overflow-hidden shadow-lg divide-y divide-[#27272A]/50">
          <MenuItem
            icon={Settings}
            iconColor="text-[#A1A1AA]"
            iconBgColor="bg-[#27272A]"
            title="Settings"
            subtitle="Playback, language & security"
            hasNotification={hasUnreadLegal}
            onPress={onOpenSettings}
          />
          <MenuItem
            icon={MessageSquare}
            iconColor="text-[#8B5CF6]"
            iconBgColor="bg-[#8B5CF6]/15"
            title="Feedback & Support"
            subtitle="Send bug reports or suggestions"
            hasNotification={hasUnreadFeedback}
            onPress={onOpenFeedback || (() => {})}
          />
        </div>
      </div>

      {/* Logout Button */}
      <div className="mt-6">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#141416] p-4 text-sm font-extrabold text-[#EF4444] border border-[#EF4444]/30 hover:bg-[#EF4444]/10 active:scale-[0.98] transition-all cursor-pointer outline-none shadow-lg"
        >
          <LogOut className="h-4 w-4 text-[#EF4444]" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-6 mb-4 flex flex-col items-center gap-1.5 text-center text-xs text-[#A1A1AA]">
        <div className="flex items-center gap-2">
          <span>Official website:</span>
          <span className="font-bold text-[#8B5CF6]">maxplay.app</span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-xs font-semibold text-[#06B6D4] hover:underline cursor-pointer"
          >
            {showCopied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>

      {/* Custom Popup Modal */}
      {modalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="flex w-full max-w-xs flex-col rounded-3xl bg-[#121212] p-5 border border-[#1C1C1E] text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8B5CF6]/20 text-[#8B5CF6]">
              <Info className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-white">{modalInfo.title}</h3>
            <p className="mt-2 text-xs text-[#A1A1AA] leading-relaxed">{modalInfo.body}</p>

            <button
              type="button"
              onClick={() => setModalInfo(null)}
              className="mt-5 w-full rounded-2xl bg-[#8B5CF6] py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-[#7C3AED] active:scale-95 transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
