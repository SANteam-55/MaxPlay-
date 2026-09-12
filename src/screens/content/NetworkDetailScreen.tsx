import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, Star, Play, Film, Tv, Sparkles, Filter, Clapperboard, Layers, CheckCircle2, Share2, Info } from 'lucide-react';
import { ContentItem, NetworkItem } from '../../types';
import { useContent } from '../../hooks/useContent';
import { ContentCard } from '../../components/common/ContentCard';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { extractAmbientPalette, AmbientColorPalette } from '../../utils/colorExtractor';

interface NetworkDetailScreenProps {
  network: NetworkItem;
  onBack: () => void;
  onSelectContent: (item: ContentItem) => void;
}

type CategoryTab = 'all' | 'movies' | 'series';

export const NetworkDetailScreen: React.FC<NetworkDetailScreenProps> = ({
  network,
  onBack,
  onSelectContent,
}) => {
  const { contentList, loading } = useContent();
  const [activeTab, setActiveTab] = useState<CategoryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [palette, setPalette] = useState<AmbientColorPalette | null>(null);

  React.useEffect(() => {
    if (network.logoUrl || network.bannerUrl) {
      extractAmbientPalette(network.logoUrl || network.bannerUrl || '').then(setPalette);
    }
  }, [network.logoUrl, network.bannerUrl]);

  // Resolve content items assigned or matched to this network
  const allNetworkItems = useMemo(() => {
    if (!contentList || contentList.length === 0) return [];

    // 1. If explicit contentIds are attached
    if (network.contentIds && Array.isArray(network.contentIds) && network.contentIds.length > 0) {
      const explicitIds = new Set(network.contentIds.map(c => typeof c === 'string' ? c : (c as any).id));
      const explicitItems = contentList.filter(item => explicitIds.has(item.id));
      if (explicitItems.length > 0) return explicitItems;
    }

    // 2. Dynamic tag / name matching fallback
    const targetTag = (network.tagFilter || network.name || '').toLowerCase();
    const matched = contentList.filter(item => {
      const titleLower = (item.title || '').toLowerCase();
      const descLower = (item.description || '').toLowerCase();
      const catLower = (item.category || '').toLowerCase();
      const genres = Array.isArray(item.genres) ? item.genres.map(g => g.toLowerCase()) : [];

      return (
        titleLower.includes(targetTag) ||
        descLower.includes(targetTag) ||
        catLower.includes(targetTag) ||
        genres.some(g => g.includes(targetTag))
      );
    });

    if (matched.length > 0) return matched;

    // 3. No items matched or assigned
    return [];
  }, [network, contentList]);

  // Separate into Movies vs Series
  const { moviesList, seriesList } = useMemo(() => {
    // If explicit movieIds or seriesIds were specified
    const explicitMovieIds = new Set(network.movieIds || []);
    const explicitSeriesIds = new Set(network.seriesIds || []);

    const movies: ContentItem[] = [];
    const series: ContentItem[] = [];

    allNetworkItems.forEach(item => {
      const isMovie = explicitMovieIds.has(item.id) ||
        item.type === 'movie' ||
        (item.category && item.category.toLowerCase().includes('movie')) ||
        (item.videoLinks && item.videoLinks.length > 0 && !item.seasons);

      const isSeries = explicitSeriesIds.has(item.id) ||
        item.type === 'tv' ||
        item.type === 'series' ||
        item.type === 'anime' ||
        item.type === 'short_tv' ||
        (item.seasons && item.seasons > 0) ||
        (item.category && (item.category.toLowerCase().includes('series') || item.category.toLowerCase().includes('tv') || item.category.toLowerCase().includes('anime')));

      if (isMovie && !isSeries) {
        movies.push(item);
      } else if (isSeries) {
        series.push(item);
      } else {
        // Default assignment
        if (item.type === 'movie') movies.push(item);
        else series.push(item);
      }
    });

    return { moviesList: movies, seriesList: series };
  }, [allNetworkItems, network]);

  // Current tab filtered items + search query
  const displayedItems = useMemo(() => {
    let source = allNetworkItems;
    if (activeTab === 'movies') source = moviesList;
    if (activeTab === 'series') source = seriesList;

    if (!searchQuery.trim()) return source;

    const q = searchQuery.toLowerCase().trim();
    return source.filter(item =>
      (item.title || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.genres || []).some(g => g.toLowerCase().includes(q))
    );
  }, [activeTab, allNetworkItems, moviesList, seriesList, searchQuery]);

  const logoUrl = network.logoUrl || network.bannerUrl || 'https://via.placeholder.com/300';
  const bannerUrl = network.bannerUrl || network.logoUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200';
  const glowColor = palette ? palette.primary : '#8B5CF6';

  return (
    <div className="absolute inset-0 z-[60] flex h-full w-full flex-col overflow-x-hidden bg-[#0A0A0E] text-left select-none pb-20 md:pb-8">
      {/* Sticky Header Bar */}
      <header className="flex-none flex items-center justify-between px-4 py-3 bg-[#0A0A0E]/90 backdrop-blur-xl border-b border-white/10 shadow-lg z-50">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer border border-white/10"
            title="Go Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg overflow-hidden bg-black/60 border border-white/15 p-0.5 shrink-0 flex items-center justify-center">
              <img src={logoUrl || undefined} alt="" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-extrabold text-white truncate max-w-[180px] sm:max-w-[260px]">
              {network.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition active:scale-95 cursor-pointer border ${
              showSearch
                ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
            }`}
            title="Search in Network"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* NEW SCROLLABLE CONTAINER */}
      <div className="flex-1 overflow-y-auto scrollbar-none w-full">
        {/* Expandable Search Input Bar */}
        {showSearch && (
          <div className="px-4 py-2.5 bg-[#121218] border-b border-white/10 transition-all duration-200">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-[#A1A1AA]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search within ${network.name}...`}
                className="w-full bg-[#1C1C24] border border-white/15 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-xs text-[#A1A1AA] hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Network Hero Showcase Banner */}
        <div 
          className="relative w-full overflow-hidden pb-6 pt-4 px-4 border-b border-white/5 transition-colors duration-700"
          style={{
            background: `linear-gradient(to bottom, ${palette ? `rgba(${palette.primaryRgb.join(',')}, 0.15)` : '#181822'}, #0A0A0E)`
          }}
        >
          {/* Subtle Backdrop Image Glow */}
          <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
            <img src={bannerUrl || undefined} alt="" className="w-full h-full object-cover blur-3xl scale-110 opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0E] via-[#0A0A0E]/80 to-transparent" />
          </div>

          {/* Color matching fade effect behind logo */}
          <div 
            className="absolute top-4 left-1/2 -translate-x-1/2 sm:left-24 sm:translate-x-0 w-[160px] h-[160px] rounded-full blur-[60px] opacity-40 pointer-events-none transition-all duration-700"
            style={{ background: palette ? palette.primary : '#8B5CF6' }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 max-w-4xl mx-auto">
          {/* Main Logo Squircle Card */}
          <div 
            className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-3xl p-3 bg-gradient-to-b from-[#242432] to-[#12121A] border-2 border-white/20 shrink-0 flex items-center justify-center transition-all duration-500"
            style={{ boxShadow: `0 8px 30px ${palette ? palette.glowHalo : 'rgba(139,92,246,0.3)'}` }}
          >
            <img
              src={logoUrl || undefined}
              alt={network.name}
              className="max-h-full max-w-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
            />
            <div 
              className="absolute -bottom-2 -right-2 rounded-full p-1 shadow-lg"
              style={{ background: `linear-gradient(to right, ${glowColor}, #06B6D4)` }}
            >
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Network Information */}
          <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <span 
                className="border text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider"
                style={{ 
                  backgroundColor: palette ? `rgba(${palette.primaryRgb.join(',')}, 0.2)` : 'rgba(139,92,246,0.2)',
                  borderColor: palette ? `rgba(${palette.primaryRgb.join(',')}, 0.4)` : 'rgba(139,92,246,0.4)',
                  color: palette ? `rgb(${palette.primaryRgb.map(c => Math.min(255, c + 50)).join(',')})` : '#C084FC'
                }}
              >
                Official Network
              </span>
              <span className="bg-white/10 text-white/80 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                {allNetworkItems.length} Titles Available
              </span>
            </div>

            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
              {network.name}
            </h1>

            <p className="mt-1.5 text-xs text-[#A1A1AA] max-w-xl leading-relaxed line-clamp-2 sm:line-clamp-3">
              {network.description || 'Watch all your favorite movies, exclusive shows, and trending animation releases curated directly from this official network.'}
            </p>

            {/* Quick Stat Badges */}
            <div className="mt-3 flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-white">
                <Film className="h-3.5 w-3.5 text-[#8B5CF6]" />
                <span>{moviesList.length} Movies</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-white">
                <Tv className="h-3.5 w-3.5 text-[#06B6D4]" />
                <span>{seriesList.length} Series & Shows</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 CATEGORY TABS (All, Movies, Series) */}
      <div className="sticky top-0 bg-[#0A0A0E]/95 backdrop-blur-md px-4 py-3 border-b border-white/10 z-40">
        <div className="flex items-center justify-between gap-2 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 p-1 bg-[#16161E] rounded-xl border border-white/10 w-full sm:w-auto">
            {/* Tab: ALL */}
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white shadow-lg'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>All ({allNetworkItems.length})</span>
            </button>

            {/* Tab: MOVIES */}
            <button
              type="button"
              onClick={() => setActiveTab('movies')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'movies'
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white shadow-lg'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Film className="h-3.5 w-3.5" />
              <span>Movies ({moviesList.length})</span>
            </button>

            {/* Tab: SERIES */}
            <button
              type="button"
              onClick={() => setActiveTab('series')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'series'
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white shadow-lg'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Tv className="h-3.5 w-3.5" />
              <span>Series ({seriesList.length})</span>
            </button>
          </div>

          <span className="hidden sm:inline-block text-xs font-semibold text-[#71717A]">
            Showing {displayedItems.length} titles
          </span>
        </div>
      </div>

      {/* Main Content Grid Area (Scrollable) */}
      <main className="p-4 w-full">
        <div className="max-w-6xl mx-auto w-full pb-10">
          {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <LoadingSkeleton width="100%" height={160} radius="12px" />
                <LoadingSkeleton width="80%" height={14} radius="4px" />
                <LoadingSkeleton width="50%" height={12} radius="4px" />
              </div>
            ))}
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#71717A] mb-3">
              <Film className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-white">No Titles Found</h3>
            <p className="text-xs text-[#A1A1AA] mt-1 max-w-sm">
              {searchQuery
                ? `No titles matching "${searchQuery}" in ${activeTab.toUpperCase()}.`
                : `No titles currently assigned to ${network.name} in this category.`}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-1.5 rounded-lg bg-[#8B5CF6] text-white text-xs font-bold shadow-md hover:bg-[#7C3AED]"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {displayedItems.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex flex-col">
                <ContentCard
                  item={item}
                  onPress={() => onSelectContent(item)}
                />
              </div>
            ))}
          </div>
        )}
        </div>
      </main>
      </div>
    </div>
  );
};
