import React, { useState } from 'react';
import { Sparkles, Search, Tv, Flame, Star, Filter, RefreshCw, Zap } from 'lucide-react';
import { ContentCard } from '../../components/common/ContentCard';
import { SkeletonGrid } from '../../components/common/LoadingSkeleton';
import { useContent } from '../../hooks/useContent';
import { ContentItem } from '../../types';
import { NativeBanner } from '../../components/ads/NativeBanner';
import { adManager } from '../../services/adService';
import { useAuth } from '../../hooks/useAuth';

interface AnimeScreenProps {
  onSelectContent?: (item: ContentItem) => void;
  onOpenSearch?: () => void;
}

export const AnimeScreen: React.FC<AnimeScreenProps> = ({
  onSelectContent,
  onOpenSearch,
}) => {
  const { user } = useAuth();
  const { contentList, loading } = useContent();
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [activeSort, setActiveSort] = useState<'rating' | 'newest' | 'trending'>('rating');

  const handleContentClick = (item: ContentItem) => {
    adManager.handleContentCardClick(!!user?.isPremium);
    onSelectContent?.(item);
  };

  // Filter items that are anime
  const animeItems = contentList.filter((item) => {
    // Check if type is anime, or category is anime, or genre contains anime
    const isAnimeType = item.type === 'anime';
    const isAnimeCat = (item as any).category?.toLowerCase() === 'anime';
    const isAnimeGenre = item.genres?.some(g => g.toLowerCase().includes('anime'));
    const isJapanCountry = item.country?.toLowerCase() === 'japan';

    return isAnimeType || isAnimeCat || isAnimeGenre || isJapanCountry;
  });

  // Fallback: If no strict anime found, show full list so user gets cards
  const displaySource = animeItems.length > 0 ? animeItems : contentList;

  // Filter by selected genre pill
  const filteredAnime = displaySource.filter((item) => {
    if (selectedGenre === 'All') return true;
    if (selectedGenre === 'Dubbed') {
      return item.languages?.some(l => l.toLowerCase().includes('hindi') || l.toLowerCase().includes('dub')) || true;
    }
    if (selectedGenre === 'Movies') {
      return item.type === 'movie';
    }
    return item.genres?.some(g => g.toLowerCase() === selectedGenre.toLowerCase());
  });

  // Sort
  const sortedAnime = [...filteredAnime].sort((a, b) => {
    if (activeSort === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (activeSort === 'newest') return (b.year || 0) - (a.year || 0);
    if (activeSort === 'trending') return (b.views ? 1 : -1);
    return 0;
  });

  const ANIME_GENRES = ['All', 'Action', 'Fantasy', 'Dark Fantasy', 'Supernatural', 'Romance', 'Dubbed', 'Movies'];

  return (
    <div className="flex h-full w-full flex-col overflow-x-hidden bg-[#0A0A0A] text-left select-none overflow-y-auto scrollbar-none pb-24 md:pb-8">
      {/* Header Bar */}
      <div className="sticky top-0 z-30 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#1C1C1E] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Animated Glowing Icon */}
            <div className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-[#8B5CF6] via-[#EC4899] to-[#06B6D4] p-0.5 shadow-[0_0_15px_rgba(139,92,246,0.5)] animate-pulse">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#0A0A0A]">
                <Sparkles className="h-5 w-5 text-[#A78BFA] animate-spin" style={{ animationDuration: '6s' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1">
                  Anime <span className="bg-gradient-to-r from-[#A78BFA] via-[#F472B6] to-[#38BDF8] bg-clip-text text-transparent">Hub</span>
                </h1>
                <span className="rounded-full bg-[#8B5CF6]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#A78BFA] border border-[#8B5CF6]/40">
                  ⛩️ JAPAN
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#A1A1AA]">
                {sortedAnime.length} Titles Ready to Stream
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSearch}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1C1C1E] text-[#A1A1AA] hover:text-white hover:bg-[#27272A] transition cursor-pointer border border-[#27272A]"
            title="Search Anime"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* Category Pills Slider */}
        <div className="flex items-center gap-2 pt-3 overflow-x-auto scrollbar-none">
          {ANIME_GENRES.map((genre) => {
            const isActive = selectedGenre === genre;
            return (
              <button
                key={genre}
                type="button"
                onClick={() => setSelectedGenre(genre)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-lg shadow-[#8B5CF6]/30 scale-105'
                    : 'bg-[#1C1C1E] text-[#A1A1AA] hover:text-white hover:bg-[#27272A] border border-[#27272A]'
                }`}
              >
                {genre === 'All' && <Flame className="h-3.5 w-3.5 text-[#F472B6]" />}
                {genre === 'Dubbed' && <Zap className="h-3.5 w-3.5 text-[#38BDF8]" />}
                <span>{genre}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Sort Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 text-xs text-[#A1A1AA] bg-[#0F0F12]">
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-[#8B5CF6]" />
          <span>Showing: <strong className="text-white font-semibold">{selectedGenre} Anime</strong></span>
        </div>

        <div className="flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-lg border border-[#27272A]">
          <button
            type="button"
            onClick={() => setActiveSort('rating')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
              activeSort === 'rating' ? 'bg-[#8B5CF6] text-white' : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            Top Rated
          </button>
          <button
            type="button"
            onClick={() => setActiveSort('newest')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
              activeSort === 'newest' ? 'bg-[#8B5CF6] text-white' : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            Newest
          </button>
        </div>
      </div>

      <div className="px-4">
        <NativeBanner />
      </div>

      {/* Grid Content Area */}
      <div className="flex-1 px-4 pt-3">
        {loading ? (
          <SkeletonGrid count={9} cols="grid-cols-3 sm:grid-cols-4 md:grid-cols-6" />
        ) : sortedAnime.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {sortedAnime.map((item, index) => (
              <ContentCard
                key={`${item.id}-${index}`}
                item={item}
                width={105}
                height={155}
                onPress={handleContentClick}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Tv className="h-10 w-10 text-[#3F3F46]" />
            <p className="text-sm font-semibold text-[#A1A1AA]">
              No anime found in '{selectedGenre}'
            </p>
            <button
              type="button"
              onClick={() => setSelectedGenre('All')}
              className="flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2 text-xs font-bold text-white hover:bg-[#7C3AED] transition cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Show All Anime</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
