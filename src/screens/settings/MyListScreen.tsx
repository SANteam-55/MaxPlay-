import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bookmark, Play, Star, Trash2 } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useContent } from '../../hooks/useContent';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { subscribeToMyList, toggleMyListItem } from '../../services/contentService';
import { ContentItem } from '../../types';
import { NativeBanner } from '../../components/ads/NativeBanner';

interface MyListScreenProps {
  onBack: () => void;
  onPlayContent?: (contentId: string) => void;
}

export const MyListScreen: React.FC<MyListScreenProps> = ({
  onBack,
  onPlayContent,
}) => {
  const { user } = useAuthContext();
  const { contentList, loading } = useContent();
  const [myListIds, setMyListIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToMyList(user.uid, (ids) => {
      setMyListIds(ids);
    });
    return () => unsub();
  }, [user?.uid]);

  const myListItems = contentList.filter((item) => myListIds.includes(item.id));

  const handleRemoveItem = (contentId: string) => {
    if (!user?.uid) return;
    toggleMyListItem(user.uid, contentId, true);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#0A0A0A] p-4 text-left select-none scrollbar-none pb-20">
      {/* HEADER */}
      <div className="flex items-center justify-between py-2 border-b border-[#1C1C1E] pb-3 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-full p-2 text-white hover:bg-[#121212] transition cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold text-white">My List</h2>
        </div>
      </div>

      <NativeBanner />

      {/* LIST */}
      {loading ? (
        <div className="flex flex-col gap-3 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-[#121212] p-3 border border-[#1C1C1E]">
              <LoadingSkeleton width={60} height={90} radius="12px" className="shrink-0" />
              <div className="flex-1 flex flex-col gap-2 justify-center">
                <LoadingSkeleton width="75%" height={16} radius="6px" />
                <LoadingSkeleton width="50%" height={12} radius="4px" />
                <LoadingSkeleton width="35%" height={10} radius="4px" />
              </div>
            </div>
          ))}
        </div>
      ) : myListItems.length > 0 ? (
        <div className="flex flex-col gap-3 mt-4">
          {myListItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="flex items-center gap-3 rounded-2xl bg-[#121212] p-3 border border-[#1C1C1E] transition hover:border-[#1C1C1E]/80"
            >
              {/* Poster Thumbnail */}
              <div
                onClick={() => onPlayContent && onPlayContent(item.id)}
                className="relative h-[90px] w-[60px] flex-shrink-0 overflow-hidden rounded-xl bg-[#1C1C1E] cursor-pointer group"
              >
                <img
                  src={item.posterUrl || undefined}
                  alt={item.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </div>

              {/* Metadata */}
              <div className="flex flex-1 flex-col justify-center min-w-0 pr-1">
                <h4 className="text-sm font-bold text-white truncate line-clamp-1">
                  {item.title}
                </h4>
                <div className="mt-1 flex items-center gap-2 text-xs text-[#A1A1AA]">
                  <span className="flex items-center text-amber-400 font-bold">
                    <Star className="h-3 w-3 fill-current mr-0.5" />
                    {item.rating}
                  </span>
                  <span>•</span>
                  <span>{item.year}</span>
                  <span>•</span>
                  <span className="uppercase">{item.type}</span>
                </div>

                {/* Genre Tags */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {item.genres?.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-[#1C1C1E] px-1.5 py-0.5 text-[9px] font-semibold text-[#A1A1AA]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => onPlayContent && onPlayContent(item.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white shadow-md hover:scale-105 transition cursor-pointer"
                  title="Watch Now"
                >
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                </button>

                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#6B7280] hover:text-red-400 transition cursor-pointer"
                  title="Remove from list"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="my-auto flex flex-col items-center justify-center p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#121212] border border-[#1C1C1E] text-[#8B5CF6]">
            <Bookmark className="h-10 w-10" />
          </div>
          <h3 className="mt-4 text-base font-bold text-white">Your list is empty</h3>
          <p className="mt-1 text-xs text-[#6B7280] max-w-xs">
            Add movies and shows to watch later by tapping the bookmark button on any title.
          </p>
        </div>
      )}
    </div>
  );
};
