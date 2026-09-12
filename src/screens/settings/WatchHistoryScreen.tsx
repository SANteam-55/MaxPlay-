import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Clock, Play } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { HistoryItem as HistoryItemComponent } from '../../components/history/HistoryItem';
import { subscribeToWatchHistory } from '../../services/contentService';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface WatchHistoryScreenProps {
  onBack: () => void;
  onPlayContent?: (contentId: string) => void;
}

export const WatchHistoryScreen: React.FC<WatchHistoryScreenProps> = ({
  onBack,
  onPlayContent,
}) => {
  const { user } = useAuthContext();
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      const unsub = subscribeToWatchHistory(user.uid, (items) => {
        setHistoryItems(items);
      });
      return () => unsub();
    }
  }, [user?.uid]);

  const handleDeleteItem = async (id: string) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, `watchHistory/${user.uid}/items`, id));
    } catch (e) {
      console.error('Delete history item error:', e);
    }
  };

  const handleClearAllConfirm = async () => {
    if (!user?.uid) return;
    try {
      for (const item of historyItems) {
        await deleteDoc(doc(db, `watchHistory/${user.uid}/items`, item.contentId));
      }
    } catch (e) {
      console.error('Clear history error:', e);
    }
    setShowClearConfirm(false);
  };

  // Group items by dateGroup
  const formatDateGroup = (isoString: string) => {
    if (!isoString) return 'Earlier';
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const groupedItems = historyItems.reduce((acc, item) => {
    const group = formatDateGroup(item.watchedAt);
    if (!acc[group]) acc[group] = [];
    acc[group].push({
      id: item.contentId,
      contentId: item.contentId,
      title: item.title,
      type: item.type || 'anime',
      thumbnailUrl: item.thumbnailUrl,
      watchedSeconds: item.watchedSeconds,
      percentWatched: item.percentWatched,
      episodeNum: item.currentEpisode,
      totalEpisodes: item.totalEpisodes,
      dateGroup: group
    });
    return acc;
  }, {} as Record<string, any[]>);

  const dateGroups = Object.keys(groupedItems);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#0A0A0A] p-4 text-left select-none scrollbar-none pb-20">
      {/* HEADER */}
      <div className="flex items-center justify-between py-2 border-b border-[#1C1C1E] pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full p-2 text-white hover:bg-[#121212] transition cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold text-white">Watch History</h2>
        </div>

        {historyItems.length > 0 && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1 rounded-xl bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 active:scale-95 transition cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* LIST GROUPED BY DATE */}
      {historyItems.length > 0 ? (
        <div className="flex flex-col gap-5 mt-2">
          {dateGroups.map((group) => {
            const itemsInGroup = groupedItems[group];

            return (
              <div key={group} className="flex flex-col gap-2.5">
                <h3 className="text-sm font-bold text-[#A1A1AA] pt-2">{group}</h3>
                {itemsInGroup.map((item, index) => (
                  <HistoryItemComponent
                    key={`${item.id}-${index}`}
                    item={item}
                    onPlay={(i: any) => onPlayContent && onPlayContent(i.contentId)}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="my-auto flex flex-col items-center justify-center p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#121212] border border-[#1C1C1E] text-[#06B6D4]">
            <Clock className="h-10 w-10" />
          </div>
          <h3 className="mt-4 text-base font-bold text-white">No watch history</h3>
          <p className="mt-1 text-xs text-[#6B7280] max-w-xs">
            Start watching movies or TV series to see your progress here.
          </p>
        </div>
      )}

      {/* CLEAR CONFIRMATION DIALOG */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="flex w-full max-w-xs flex-col rounded-3xl bg-[#121212] p-5 border border-[#1C1C1E] text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20 text-red-400">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-white">Clear Watch History?</h3>
            <p className="mt-2 text-xs text-[#A1A1AA]">
              This will remove all recorded watch progress from your account.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleClearAllConfirm}
                className="w-full rounded-2xl bg-[#EF4444] py-2.5 text-xs font-bold text-white shadow-lg shadow-red-500/30 hover:bg-red-600 active:scale-95 transition cursor-pointer"
              >
                Yes, Clear All
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="w-full rounded-2xl bg-[#1C1C1E] py-2.5 text-xs font-bold text-[#A1A1AA] hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
