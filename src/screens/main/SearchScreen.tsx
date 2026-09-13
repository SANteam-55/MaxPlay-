import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mic, Flame, Trash2, X, Play, Star } from 'lucide-react';
import { SearchBar } from '../../components/common/SearchBar';
import { SectionHeader } from '../../components/common/SectionHeader';
import { RankBadge } from '../../components/common/RankBadge';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { NativeBanner } from '../../components/ads/NativeBanner';
import { useContent } from '../../hooks/useContent';
import { ContentItem } from '../../types';
import { STORAGE_KEYS } from '../../utils/constants';
import { subscribeToSearchSettings } from '../../services/contentService';
import { adManager } from '../../services/adService';
import { useAuth } from '../../hooks/useAuth';

interface SearchScreenProps {
  onBack?: () => void;
  onSelectContent?: (content: ContentItem) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  onBack,
  onSelectContent,
}) => {
  const { user } = useAuth();
  const { contentList, loading } = useContent();

  const handleContentClick = (item: ContentItem) => {
    adManager.handleContentCardClick(!!user?.isPremium);
    onSelectContent?.(item);
  };
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeHotTab, setActiveHotTab] = useState<'movies' | 'series' | 'short_tv' | 'music'>('movies');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'movie_series' | 'anime'>('all');
  const [searchConfig, setSearchConfig] = useState<{ everyoneSearching: string[]; popularSearches: string[] }>(() => {
    try {
      const raw = localStorage.getItem('maxplay_search_config_cache');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      everyoneSearching: [],
      popularSearches: []
    };
  });

  // Subscribe to Search Settings from Firestore
  useEffect(() => {
    const unsub = subscribeToSearchSettings((data) => {
      setSearchConfig(data);
      try {
        localStorage.setItem('maxplay_search_config_cache', JSON.stringify(data));
      } catch {}
    });
    return () => unsub();
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      } else {
        setRecentSearches([]);
      }
    } catch (e) {
      // fallback
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    const filtered = recentSearches.filter((item) => item.toLowerCase() !== term.toLowerCase());
    const updated = [term, ...filtered].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updated));
  };

  const removeRecentItem = (term: string) => {
    const updated = recentSearches.filter((item) => item !== term);
    setRecentSearches(updated);
    localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updated));
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem(STORAGE_KEYS.RECENT_SEARCHES);
  };

  const handleSearchSubmit = () => {
    if (query) {
      saveRecentSearch(query);
    }
  };

  // Strictly show admin-configured search tags only
  const trendingPills = (searchConfig.everyoneSearching && searchConfig.everyoneSearching.length > 0)
    ? searchConfig.everyoneSearching
    : (searchConfig.popularSearches && searchConfig.popularSearches.length > 0)
      ? searchConfig.popularSearches
      : [];

  // Hot lists selection from real Firestore items
  const hotListItems = contentList
    .filter(item => item.searchHotSection === activeHotTab)
    .sort((a, b) => (a.searchHotPosition || 0) - (b.searchHotPosition || 0));

  // Search Results filtering from real Firestore content
  const filteredResults = contentList.filter((item) => {
    const matchesQuery = item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.genres?.some((g) => g.toLowerCase().includes(query.toLowerCase())) ||
      item.description?.toLowerCase().includes(query.toLowerCase());

    if (!matchesQuery) return false;

    if (activeFilterTab === 'movie_series') {
      return item.type === 'movie' || item.type === 'tv';
    }
    if (activeFilterTab === 'anime') {
      return item.type === 'anime';
    }
    return true;
  });

  const dynamicPlaceholder = (searchConfig.everyoneSearching && searchConfig.everyoneSearching.length > 0)
    ? `Search "${searchConfig.everyoneSearching[0]}"...`
    : "Search movies, series & anime...";

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden bg-[#0A0A0A] p-4 pb-24 md:pb-8 text-left select-none scrollbar-none">
      {/* Search Header Bar */}
      <div className="flex items-center gap-2 mb-4">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 text-[#A1A1AA] hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        <div className="flex-1">
          <SearchBar
            value={query}
            onChangeText={(text) => {
              setQuery(text);
            }}
            onSubmit={handleSearchSubmit}
            placeholder={dynamicPlaceholder}
            autoFocus
          />
        </div>

        <button className="p-2 text-[#6B7280] hover:text-[#8B5CF6] transition">
          <Mic className="h-5 w-5" />
        </button>
      </div>

      {query ? (
        /* Results View */
        <div className="flex flex-col gap-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-4 overflow-x-auto border-b border-[#1C1C1E] pb-2 scrollbar-none">
            {[
              { id: 'all', label: 'All' },
              { id: 'movie_series', label: 'Movie/Series' },
              { id: 'anime', label: 'Anime' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilterTab(f.id as any)}
                className={`py-1 text-xs font-semibold whitespace-nowrap transition border-b-2 cursor-pointer ${
                  activeFilterTab === f.id
                    ? 'border-[#8B5CF6] text-white'
                    : 'border-transparent text-[#6B7280] hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Results List */}
          <div className="flex flex-col gap-3">
            {filteredResults.length > 0 ? (
              filteredResults.map((item, idx) => (
                <div
                  key={item.id || idx}
                  onClick={() => {
                    saveRecentSearch(item.title);
                    onSelectContent?.(item);
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-xl bg-[#121212] p-2.5 transition hover:bg-[#1C1C1E]"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img
                      src={item.posterUrl || undefined}
                      alt={item.title}
                      className="h-[68px] w-[50px] flex-shrink-0 rounded-lg object-cover"
                    />

                    <div className="flex flex-col text-left overflow-hidden">
                      <h4 className="line-clamp-1 text-sm font-semibold text-white">
                        {item.title}
                      </h4>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[#6B7280]">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-amber-400 font-bold">{item.rating}</span>
                        <span>•</span>
                        <span>{item.year}</span>
                        <span>•</span>
                        <span>{item.country}</span>
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-[#A1A1AA]">
                        {item.genres?.join(', ')}
                      </p>
                    </div>
                  </div>

                  <Play className="h-5 w-5 text-[#6B7280] flex-shrink-0 ml-2 hover:text-[#8B5CF6]" />
                </div>
              ))
            ) : (
              <div className="py-16 text-center">
                <p className="text-sm text-[#A1A1AA]">No results found for "{query}"</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Discovery View */
        <div className="flex flex-col gap-6">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">Recent</span>
                <button
                  onClick={clearAllRecent}
                  className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#EF4444] transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <div
                    key={term}
                    className="flex items-center gap-2 rounded-full bg-[#1C1C1E] px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-white transition"
                  >
                    <span
                      onClick={() => setQuery(term)}
                      className="cursor-pointer"
                    >
                      {term}
                    </span>
                    <button
                      onClick={() => removeRecentItem(term)}
                      className="text-[#6B7280] hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trending Searches Pills */}
          <div>
            <SectionHeader
              title="Everyone is searching"
              icon={<Flame className="h-5 w-5 text-amber-500 fill-amber-500" />}
            />
            {loading ? (
              <div className="flex flex-wrap gap-2 mt-1">
                <LoadingSkeleton width={90} height={32} radius="9999px" />
                <LoadingSkeleton width={120} height={32} radius="9999px" />
                <LoadingSkeleton width={80} height={32} radius="9999px" />
                <LoadingSkeleton width={140} height={32} radius="9999px" />
                <LoadingSkeleton width={100} height={32} radius="9999px" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-1">
                {trendingPills.map((pill) => (
                  <button
                    key={pill}
                    onClick={() => {
                      setQuery(pill);
                      saveRecentSearch(pill);
                    }}
                    className="flex cursor-pointer items-center rounded-full bg-[#1C1C1E] px-4 py-2 text-xs font-semibold text-[#A1A1AA] transition hover:bg-[#8B5CF6] hover:text-white active:scale-95"
                  >
                    {pill}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hot Lists Tabbed */}
          <div>
            <div className="flex items-center gap-6 border-b border-[#1C1C1E] pb-2 overflow-x-auto scrollbar-none">
              {[
                { id: 'movies', label: 'Hot Movies' },
                { id: 'series', label: 'Hot Series' },
                { id: 'short_tv', label: 'Hot Short TV' },
                { id: 'music', label: 'Hot Music' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveHotTab(tab.id as any)}
                  className={`py-1 text-xs font-semibold whitespace-nowrap transition border-b-2 cursor-pointer ${
                    activeHotTab === tab.id
                      ? 'border-[#8B5CF6] text-white'
                      : 'border-transparent text-[#6B7280] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Hot Items List */}
            <div className="mt-3 flex flex-col gap-2.5">
              {/* NATIVE BANNER AD */}
              <NativeBanner />
              
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-[#121212] p-2.5">
                    <LoadingSkeleton width={24} height={24} radius="6px" />
                    <LoadingSkeleton width={50} height={68} radius="8px" className="shrink-0" />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <LoadingSkeleton width="70%" height={14} radius="4px" />
                      <LoadingSkeleton width="50%" height={12} radius="4px" />
                      <LoadingSkeleton width="40%" height={10} radius="4px" />
                    </div>
                  </div>
                ))
              ) : hotListItems.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  onClick={() => onSelectContent?.(item)}
                  className="flex cursor-pointer items-center justify-between rounded-xl bg-[#121212] p-2.5 transition hover:bg-[#1C1C1E]"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Rank Badge */}
                    <RankBadge rank={item.searchHotPosition || index + 1} />

                    {/* Thumbnail */}
                    <img
                      src={item.posterUrl || undefined}
                      alt={item.title}
                      className="h-[68px] w-[50px] flex-shrink-0 rounded-lg object-cover"
                    />

                    {/* Meta info */}
                    <div className="flex flex-col text-left overflow-hidden">
                      <h4 className="line-clamp-1 text-sm font-semibold text-white">
                        {item.title}
                      </h4>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-[#6B7280]">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-amber-400 font-bold">{item.rating}</span>
                        <span>•</span>
                        <span>{item.year}</span>
                        <span>•</span>
                        <span>{item.country}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-[#A1A1AA]">
                        {item.genres?.join(', ')}
                      </p>
                    </div>
                  </div>

                  <Play className="h-5 w-5 text-[#6B7280] flex-shrink-0 ml-2 hover:text-[#8B5CF6]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
