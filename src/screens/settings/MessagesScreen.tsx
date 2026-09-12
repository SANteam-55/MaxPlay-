import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Bell, 
  CheckCheck, 
  CheckCircle2, 
  Play, 
  Star, 
  Trash2, 
  Film, 
  Tv, 
  Sparkles, 
  AlertTriangle, 
  Radio, 
  ExternalLink,
  Volume2,
  Calendar,
  Layers
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { subscribeToAnnouncements } from '../../services/contentService';
import { AnnouncementMessage } from '../../types';

interface MessagesScreenProps {
  onBack: () => void;
  onPlayContent?: (contentId: string) => void;
}

export const MessagesScreen: React.FC<MessagesScreenProps> = ({ onBack, onPlayContent }) => {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<AnnouncementMessage[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'releases' | 'notices' | 'promos' | 'unread'>('all');
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    // Load local read/dismissed state from localStorage
    try {
      const savedDismissed = localStorage.getItem('maxplay_dismissed_msgs');
      if (savedDismissed) setDismissedIds(JSON.parse(savedDismissed));
      const savedRead = localStorage.getItem('maxplay_read_msgs');
      if (savedRead) setReadIds(JSON.parse(savedRead));
    } catch (e) {}

    const unsub = subscribeToAnnouncements(user?.uid, (msgs) => {
      // Sort messages newest first
      const sorted = [...msgs].sort((a, b) => {
        const tA = new Date(a.createdAt || a.date || 0).getTime();
        const tB = new Date(b.createdAt || b.date || 0).getTime();
        return tB - tA;
      });
      setMessages(sorted);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleMarkAllRead = () => {
    const allIds = messages.map(m => m.id);
    setReadIds(allIds);
    try {
      localStorage.setItem('maxplay_read_msgs', JSON.stringify(allIds));
    } catch (e) {}
  };

  const handleDismissMessage = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem('maxplay_dismissed_msgs', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all announcements from your notification inbox?')) {
      const allIds = messages.map(m => m.id);
      setDismissedIds(allIds);
      try {
        localStorage.setItem('maxplay_dismissed_msgs', JSON.stringify(allIds));
      } catch (e) {}
    }
  };

  const handleCardClick = (msg: AnnouncementMessage) => {
    // Mark as read
    if (!readIds.includes(msg.id)) {
      const updated = [...readIds, msg.id];
      setReadIds(updated);
      try {
        localStorage.setItem('maxplay_read_msgs', JSON.stringify(updated));
      } catch (e) {}
    }
    // If attached content exists, play content
    if (msg.attachedContent?.id && onPlayContent) {
      onPlayContent(msg.attachedContent.id);
    }
  };

  // Filter messages
  const activeMessages = messages.filter(m => !dismissedIds.includes(m.id));

  const filteredMessages = activeMessages.filter(m => {
    const isUnread = !readIds.includes(m.id) && m.isUnread !== false;
    if (filterType === 'unread') return isUnread;
    if (filterType === 'releases') return m.type === 'media_release' || m.type === 'episode_update' || !!m.attachedContent;
    if (filterType === 'notices') return m.type === 'notice' || m.type === 'system';
    if (filterType === 'promos') return m.type === 'promo' || m.type === 'event';
    return true;
  });

  const unreadCount = activeMessages.filter(m => !readIds.includes(m.id) && m.isUnread !== false).length;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#0A0A0C] p-4 text-left select-none scrollbar-none pb-24">
      {/* HEADER */}
      <div className="flex items-center justify-between py-2 border-b border-[#1F1F24] pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-full p-2 text-white hover:bg-[#1A1A1E] transition cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-wide">Announcements</h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] px-2 py-0.5 text-[10px] font-black text-black">
                  {unreadCount} NEW
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#71717A]">Official news, releases & stream updates</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeMessages.length > 0 && (
            <>
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-bold text-[#06B6D4] hover:text-[#22D3EE] transition px-2.5 py-1.5 rounded-lg bg-[#06B6D4]/10 hover:bg-[#06B6D4]/20 cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Read All</span>
              </button>
              <button
                onClick={handleClearAll}
                className="text-xs font-bold text-[#71717A] hover:text-[#EF4444] transition p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                title="Clear all messages"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* FILTER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
        <button
          onClick={() => setFilterType('all')}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
            filterType === 'all'
              ? 'bg-white text-black shadow-md'
              : 'bg-[#18181B] text-[#A1A1AA] hover:bg-[#27272A] hover:text-white'
          }`}
        >
          <span>All</span>
          <span className="text-[10px] opacity-70">({activeMessages.length})</span>
        </button>

        <button
          onClick={() => setFilterType('releases')}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
            filterType === 'releases'
              ? 'bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] text-black shadow-md'
              : 'bg-[#18181B] text-[#A1A1AA] hover:bg-[#27272A] hover:text-white'
          }`}
        >
          <Film className="h-3.5 w-3.5" />
          <span>New Releases</span>
        </button>

        <button
          onClick={() => setFilterType('notices')}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
            filterType === 'notices'
              ? 'bg-[#8B5CF6] text-white shadow-md'
              : 'bg-[#18181B] text-[#A1A1AA] hover:bg-[#27272A] hover:text-white'
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          <span>Notices</span>
        </button>

        <button
          onClick={() => setFilterType('promos')}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
            filterType === 'promos'
              ? 'bg-[#F59E0B] text-black shadow-md'
              : 'bg-[#18181B] text-[#A1A1AA] hover:bg-[#27272A] hover:text-white'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Events</span>
        </button>

        {unreadCount > 0 && (
          <button
            onClick={() => setFilterType('unread')}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
              filterType === 'unread'
                ? 'bg-[#22D3EE] text-black shadow-md'
                : 'bg-[#18181B] text-[#06B6D4] border border-[#06B6D4]/30'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
            <span>Unread ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* MESSAGES FEED */}
      <div className="mt-2 flex flex-col gap-3.5">
        {filteredMessages.length > 0 ? (
          filteredMessages.map((msg) => {
            const isUnread = !readIds.includes(msg.id) && msg.isUnread !== false;
            const sender = msg.sender || {
              name: 'MaxPlay Official',
              handle: '@MaxPlayAdmin',
              avatar: '',
              isVerified: true
            };

            const attached = msg.attachedContent;
            const isEpisodeUpdate = msg.type === 'episode_update';
            const isUrgent = msg.priority === 'urgent';
            const isImportant = msg.priority === 'important';

            return (
              <div
                key={msg.id}
                className={`group relative flex flex-col rounded-2xl bg-[#131316] border transition-all duration-200 overflow-hidden ${
                  isUnread
                    ? 'border-[#06B6D4]/40 shadow-lg shadow-[#06B6D4]/5'
                    : 'border-white/5 hover:border-white/15'
                }`}
              >
                {/* Glowing Active Border Stripe */}
                {isUnread && (
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-[#06B6D4] to-[#8B5CF6]" />
                )}

                <div className="p-4 flex flex-col gap-3">
                  {/* SENDER PROFILE BAR */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar */}
                      <div className="relative h-9 w-9 rounded-full overflow-hidden flex-shrink-0 border border-white/10 bg-gradient-to-br from-[#06B6D4] to-[#8B5CF6] flex items-center justify-center font-black text-white text-xs shadow-md">
                        {sender.avatar ? (
                          <img 
                            src={sender.avatar || undefined} 
                            alt={sender.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{(sender.name || 'M').charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      {/* Name & Handle */}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white truncate">{sender.name || 'MaxPlay Official'}</span>
                          {sender.isVerified !== false && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#06B6D4] fill-[#06B6D4]/20 flex-shrink-0" />
                          )}
                          {isUrgent && (
                            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                              Urgent
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-[#06B6D4] truncate">{sender.handle || '@MaxPlayAdmin'}</span>
                          <span className="text-[10px] text-[#52525B]">·</span>
                          <span className="text-[10px] text-[#71717A]">{msg.date || 'Today'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Dismiss / Read */}
                    <div className="flex items-center gap-1">
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-[#06B6D4] mr-1" title="Unread"></span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissMessage(msg.id);
                        }}
                        className="text-[#52525B] hover:text-[#EF4444] transition p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                        title="Dismiss announcement"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* ANNOUNCEMENT TITLE & BODY */}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-black text-white leading-snug flex items-center gap-1.5">
                      {msg.type === 'media_release' && <Film className="h-4 w-4 text-[#06B6D4] flex-shrink-0" />}
                      {msg.type === 'episode_update' && <Tv className="h-4 w-4 text-[#A78BFA] flex-shrink-0" />}
                      {msg.type === 'notice' && <AlertTriangle className="h-4 w-4 text-[#FBBF24] flex-shrink-0" />}
                      {msg.type === 'promo' && <Sparkles className="h-4 w-4 text-[#F472B6] flex-shrink-0" />}
                      <span>{msg.title}</span>
                    </h3>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed whitespace-pre-line">
                      {msg.body}
                    </p>
                  </div>

                  {/* ATTACHED PROMOTIONAL BANNER */}
                  {msg.bannerUrl && !attached && (
                    <div className="relative w-full rounded-xl overflow-hidden border border-white/10 max-h-48 bg-black/40">
                      <img 
                        src={msg.bannerUrl || undefined} 
                        alt="Promo"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* ATTACHED CINEMA MEDIA SHOWCASE CARD */}
                  {attached && attached.id && (
                    <div 
                      onClick={() => handleCardClick(msg)}
                      className="mt-1 flex flex-row gap-3 bg-[#1A1A1E] hover:bg-[#202026] p-2.5 rounded-xl border border-white/10 hover:border-[#06B6D4]/50 transition-all duration-200 cursor-pointer shadow-md group/card"
                    >
                      {/* Left: Horizontal Poster / Backdrop */}
                      <div className="relative w-24 sm:w-28 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-black border border-white/10">
                        <img 
                          src={attached.backdropUrl || attached.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400'} 
                          alt={attached.title}
                          className="w-full h-full object-cover group-hover/card:scale-105 transition duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400';
                          }}
                        />
                        {/* Type Pill */}
                        <div className="absolute top-1 left-1 bg-black/80 backdrop-blur-sm text-[8px] font-black text-white px-1.5 py-0.2 rounded uppercase">
                          {attached.type || 'Media'}
                        </div>
                        {/* Rating */}
                        {attached.rating && (
                          <div className="absolute bottom-1 left-1 bg-black/80 backdrop-blur-sm text-[9px] font-black text-[#FBBF24] px-1.5 py-0.2 rounded flex items-center gap-0.5">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            <span>{attached.rating}</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Media Info & Instant Watch Action */}
                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs sm:text-sm font-black text-white group-hover/card:text-[#06B6D4] transition truncate">
                              {attached.title}
                            </h4>
                          </div>

                          {/* Metadata Badges */}
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {attached.quality && (
                              <span className="bg-[#06B6D4]/15 text-[#22D3EE] border border-[#06B6D4]/30 text-[9px] font-black px-1.5 py-0.2 rounded">
                                {attached.quality}
                              </span>
                            )}
                            {attached.episodeInfo && (
                              <span className="bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 text-[9px] font-black px-1.5 py-0.2 rounded">
                                {attached.episodeInfo}
                              </span>
                            )}
                            {attached.year && (
                              <span className="text-[10px] text-[#71717A] font-bold">
                                {attached.year}
                              </span>
                            )}
                          </div>

                          {/* Audio Dub Language Info */}
                          {attached.languages && attached.languages.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-[#A1A1AA] truncate">
                              <Volume2 className="h-3 w-3 text-[#34D399] flex-shrink-0" />
                              <span className="truncate">{attached.languages.join(' · ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Watch Now Button */}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] text-[#71717A] font-medium hidden sm:inline">Tap to stream instantly</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(msg);
                            }}
                            className="flex items-center gap-1.5 bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] hover:from-[#22D3EE] hover:to-[#A78BFA] text-black font-black text-[11px] px-3 py-1.2 rounded-lg shadow-md shadow-cyan-500/20 transition transform active:scale-95 cursor-pointer ml-auto"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span>{attached.actionLabel || (isEpisodeUpdate ? 'Play Episode' : 'Watch Now')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CUSTOM ACTION URL LINK (If specified) */}
                  {msg.actionUrl && !attached && (
                    <a
                      href={msg.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-[#06B6D4] hover:underline"
                    >
                      <span>Learn More / Open Link</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          /* EMPTY STATE */
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-[#121215] border border-white/5 mt-4">
            <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center text-[#71717A] mb-3">
              <Bell className="h-8 w-8 text-[#52525B]" />
            </div>
            <span className="text-sm font-black text-white">No announcements found</span>
            <span className="mt-1 text-xs text-[#71717A] max-w-xs">
              {filterType === 'all'
                ? 'All official releases, episode updates and notifications will appear here.'
                : 'No announcements match the selected filter tab.'}
            </span>
            {filterType !== 'all' && (
              <button
                onClick={() => setFilterType('all')}
                className="mt-4 text-xs font-bold text-[#06B6D4] hover:underline cursor-pointer"
              >
                View all announcements
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
