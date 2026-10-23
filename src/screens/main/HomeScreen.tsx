import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Bell, Flame, Sparkles, Film, Filter, ArrowUp, Tv, Clapperboard, Swords, Smile, Heart, Zap, Star, Trophy, Crown, Clock, Compass, Rocket, PlaySquare, Gamepad2, Ghost, Map as MapIcon, PlayCircle, Download, X, CheckCircle2 } from 'lucide-react';
import { LogoPlaceholder } from '../../components/common/LogoPlaceholder';
import { SectionHeader } from '../../components/common/SectionHeader';
import { ContentCard } from '../../components/common/ContentCard';
import { HeroBannerCarousel } from '../../components/common/HeroBannerCarousel';
import { SkeletonHeroBanner, SkeletonCategoryPills, SkeletonContentRow } from '../../components/common/LoadingSkeleton';
import { CATEGORY_TABS } from '../../utils/constants';
import { useContent } from '../../hooks/useContent';
import { ContentItem } from '../../types';
import { adManager } from '../../services/adService';
import { useAuth } from '../../hooks/useAuth';
import { useGeneralSettings } from '../../hooks/useGeneralSettings';
import { subscribeToSearchSettings } from '../../services/contentService';
import { ThreeColumnRow } from '../../components/home/ThreeColumnRow';
import { NetworkGridRow } from '../../components/home/NetworkGridRow';
import { getDefaultRowsForScreen } from '../../utils/screenRowDefaults';
import { DEFAULT_NETWORK_PRESETS } from '../../utils/networkPresets';
import { NetworkItem } from '../../types';
import { AmbientColorPalette, getCachedPalette, NEUTRAL_AMBIENT_PALETTE, rgbToStatusBarHex } from '../../utils/colorExtractor';
import { NativeBridgeService } from '../../services/nativeBridgeService';

interface HomeScreenProps {
  onSelectContent?: (content: ContentItem) => void;
  onSelectNetwork?: (network: NetworkItem) => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  onSeeAllCategory?: (category: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectContent,
  onSelectNetwork,
  onOpenSearch,
  onOpenNotifications,
  onSeeAllCategory,
}) => {
  const { user } = useAuth();
  const {
    hasApkUpdate,
    currentApkVersion,
    formattedCurrentVersion,
    latestApkVersion,
    formattedLatestVersion,
    apkDownloadUrl,
    updateTitle,
    updateReleaseNotes,
    updateBannerUrl,
    adminUpdateMessage,
    forceUpdate,
    triggerManualUpdateCheck,
  } = useGeneralSettings();
  const [showApkUpdateModal, setShowApkUpdateModal] = useState(false);
  const [isCheckingUpdateManual, setIsCheckingUpdateManual] = useState(false);
  const [apkUpdateProgress, setApkUpdateProgress] = useState<{
    status: string;
    progress: number;
    message: string;
  } | null>(null);
  const { heroBanner, trending, cinema, forYou, categories, screensCategories, homeRowsByScreen, contentList, loading } = useContent();
  const [activeTab, setActiveTab] = useState('Trending');

  // Automatically show APK Update popup when a newer version is available in Admin messages/settings, plus periodic reminders until updated
  useEffect(() => {
    if (!hasApkUpdate) {
      return;
    }
    const timer = setTimeout(() => {
      setShowApkUpdateModal(true);
    }, 1200);

    const interval = setInterval(() => {
      setShowApkUpdateModal(true);
    }, 4 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [hasApkUpdate, latestApkVersion]);
  
  const handleContentClick = useCallback((item: ContentItem) => {
    onSelectContent?.(item);
    const isPrem = !!user?.isPremium;
    setTimeout(() => {
      adManager.handleContentCardClick(isPrem);
    }, 50);
  }, [onSelectContent, user?.isPremium]);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Dynamic color palette matching current hero banner image (default neutral cinema tone to prevent flash)
  const [bannerPalette, setBannerPalette] = useState<AmbientColorPalette>(() => {
    return NEUTRAL_AMBIENT_PALETTE;
  });

  // Cached admin search tags for zero-delay instant display on page load
  const [searchTags, setSearchTags] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('maxplay_search_tags_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [tagIndex, setTagIndex] = useState(0);

  // Subscribe to Search Settings from Firestore
  useEffect(() => {
    const unsub = subscribeToSearchSettings((data) => {
      let tags: string[] = [];
      if (data?.everyoneSearching) {
        if (Array.isArray(data.everyoneSearching)) {
          tags = data.everyoneSearching.flatMap(item =>
            typeof item === 'string' ? item.split(',').map(s => s.trim()).filter(Boolean) : []
          );
        } else if (typeof data.everyoneSearching === 'string') {
          tags = (data.everyoneSearching as string).split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      if (tags.length === 0 && data?.popularSearches) {
        if (Array.isArray(data.popularSearches)) {
          tags = data.popularSearches.flatMap(item =>
            typeof item === 'string' ? item.split(',').map(s => s.trim()).filter(Boolean) : []
          );
        } else if (typeof data.popularSearches === 'string') {
          tags = (data.popularSearches as string).split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      if (tags.length > 0) {
        setSearchTags(tags);
        try {
          localStorage.setItem('maxplay_search_tags_cache', JSON.stringify(tags));
        } catch {}
      }
    });
    return () => unsub();
  }, []);

  // Smooth cyclic interval that steps through admin search tags without resetting or jumping
  useEffect(() => {
    if (searchTags.length <= 1) return;

    const interval = setInterval(() => {
      setTagIndex((prev) => (prev + 1) % searchTags.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [searchTags.length]);

  const activePlaceholder = searchTags.length > 0
    ? searchTags[tagIndex % searchTags.length]
    : 'Search movies, series & anime...';

  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const savedScrollTopRef = React.useRef<number>(0);

  // Handle scroll event to toggle sticky header background and record exact scroll position
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    savedScrollTopRef.current = top;
    try {
      sessionStorage.setItem('MAXPLAY_HOME_SCROLL_TOP', String(top));
    } catch (_) {}
    const nextScrolled = top > 8;
    setIsScrolled((prev) => (prev === nextScrolled ? prev : nextScrolled));
  }, []);

  // Restore exact scroll position when returning from ContentDetailScreen via Back button
  useEffect(() => {
    const handleSaveScroll = () => {
      if (scrollContainerRef.current) {
        savedScrollTopRef.current = scrollContainerRef.current.scrollTop;
      }
    };
    const handleRestoreScroll = () => {
      const targetTop =
        savedScrollTopRef.current ||
        Number(sessionStorage.getItem('MAXPLAY_HOME_SCROLL_TOP') || 0);
      if (scrollContainerRef.current && targetTop > 0) {
        scrollContainerRef.current.scrollTop = targetTop;
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = targetTop;
          }
        });
      }
    };
    window.addEventListener('MAXPLAY_SAVE_SCROLL_HOME', handleSaveScroll);
    window.addEventListener('MAXPLAY_RESTORE_SCROLL_HOME', handleRestoreScroll);
    return () => {
      window.removeEventListener('MAXPLAY_SAVE_SCROLL_HOME', handleSaveScroll);
      window.removeEventListener('MAXPLAY_RESTORE_SCROLL_HOME', handleRestoreScroll);
    };
  }, []);

  // Filter content based on active tab
  const getFilteredContent = useCallback((list: ContentItem[]) => {
    if (!list) return [];
    if (activeTab === 'Trending') return list;
    
    let targetType = '';
    if (activeTab === 'LIVE') targetType = 'live';
    else if (activeTab === 'Movies') targetType = 'movie';
    else if (activeTab === 'TV') targetType = 'tv';
    else if (activeTab === 'Anime') targetType = 'anime';
    else if (activeTab === 'Short TV') targetType = 'short_tv';

    const lowerTab = activeTab.toLowerCase();
    
    const filtered = list.filter(item => {
      const typeMatch = item.type?.toLowerCase() === targetType || item.type?.toLowerCase() === lowerTab;
      
      const genreMatch = item.genres?.some((g: string) => {
        const gl = g.toLowerCase();
        if (targetType === 'short_tv') return gl === 'short tv' || gl === 'short_tv' || gl.includes('short');
        if (targetType === 'tv') return gl === 'tv' || gl === 'series' || gl === 'tv series';
        if (targetType === 'movie') return gl === 'movie' || gl === 'movies' || gl === 'film' || gl === 'cinema';
        return gl === lowerTab || gl === targetType;
      });

      const catMatch = item.category?.toLowerCase() === lowerTab || item.category?.toLowerCase() === targetType;
      
      const rowMatch = item.homeRows?.some((r: string) => {
        const rl = r.toLowerCase();
        if (targetType === 'short_tv') return rl === 'short tv' || rl === 'short_tv' || rl.includes('short');
        if (targetType === 'tv') return rl === 'tv' || rl === 'series' || rl === 'tv series';
        if (targetType === 'movie') return rl === 'movie' || rl === 'movies';
        return rl === lowerTab || rl === targetType;
      });

      return typeMatch || genreMatch || catMatch || rowMatch;
    });

    if (filtered.length > 0) return filtered;

    // Graceful fallback if no content has been tagged specifically for this screen yet
    return list;
  }, [activeTab]);

  const filteredHeroBanner = useMemo(() => {
    let banners = (heroBanner as any[]).filter(
      (b) => b.screenCategory === activeTab || (!b.screenCategory && activeTab === 'Trending')
    ).slice(0, 5);
    if (banners.length === 0 && (heroBanner as any[]).length > 0) {
      banners = (heroBanner as any[]).slice(0, 5);
    }
    return banners;
  }, [heroBanner, activeTab]);

  const filteredContentList = useMemo(() => getFilteredContent(contentList as ContentItem[]), [getFilteredContent, contentList]);
  const filteredTrending = useMemo(() => getFilteredContent(trending as ContentItem[]), [getFilteredContent, trending]);
  const filteredCinema = useMemo(() => getFilteredContent(cinema as ContentItem[]), [getFilteredContent, cinema]);
  const filteredForYou = useMemo(() => getFilteredContent(forYou as ContentItem[]), [getFilteredContent, forYou]);

  // Only activate banner color fade when data is loaded, hero banner exists, and Hero Banner is aligned at the top (!isScrolled)
  const hasBannerData = !loading && filteredHeroBanner.length > 0;

  const topGlowRgb = useMemo<[number, number, number]>(() => {
    const raw = bannerPalette.primaryRgb || bannerPalette.topCenterRgb || [18, 18, 24];
    const isNeutral = raw[0] === 18 && raw[1] === 18 && raw[2] === 24;
    if (isNeutral) return [10, 10, 10];
    return [raw[0], raw[1], raw[2]];
  }, [bannerPalette]);

  // Sync phone top Status Bar color with the EXACT Hero Banner fade color ONLY when on Home at top position; otherwise simple black (#0A0A0A)
  useEffect(() => {
    const applyStatusBar = () => {
      const isHomeVisible = (window as any).__maxplayIsHomeTopVisible !== false;
      const isNeutral = topGlowRgb[0] === 10 && topGlowRgb[1] === 10 && topGlowRgb[2] === 10;
      if (isHomeVisible && hasBannerData && !isScrolled && !isNeutral) {
        const exactHex = rgbToStatusBarHex(topGlowRgb, 1.0);
        NativeBridgeService.setNativeStatusBarColor(exactHex);
      } else {
        NativeBridgeService.setNativeStatusBarColor('#0A0A0A');
      }
    };

    applyStatusBar();
    window.addEventListener('MAXPLAY_STATUSBAR_RECHECK', applyStatusBar);
    return () => {
      window.removeEventListener('MAXPLAY_STATUSBAR_RECHECK', applyStatusBar);
      NativeBridgeService.setNativeStatusBarColor('#0A0A0A');
    };
  }, [hasBannerData, isScrolled, topGlowRgb]);

  return (
    <div 
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden bg-[#0A0A0A] pb-24 md:pb-8 text-left select-none scrollbar-none relative"
    >
      {/* Sticky Header Box (Header + Category Tabs: Search Bar + Trending, LIVE, Movies, TV, Anime) */}
      <div className="sticky top-0 left-0 right-0 z-50 pt-3 pb-3 px-4">
        {/* Hero Banner Top Color Fade: Matches the exact Sticky Header Box height (from 0px Status Bar down to the bottom of Trending/LIVE/Movies tabs where it becomes 100% invisible) */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ease-in-out ${
            hasBannerData && !isScrolled ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: `linear-gradient(to bottom, rgb(${topGlowRgb.join(',')}) 0%, rgba(${topGlowRgb.join(',')}, 0.85) 28%, rgba(${topGlowRgb.join(',')}, 0.48) 62%, rgba(${topGlowRgb.join(',')}, 0.14) 86%, rgba(${topGlowRgb.join(',')}, 0) 100%)`
          }}
        />

        {/* Default Clean Dark Top Vignette when loading */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ease-in-out ${
            !isScrolled && !hasBannerData ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'linear-gradient(to bottom, rgba(10, 10, 10, 0.88) 0%, rgba(10, 10, 10, 0.45) 55%, rgba(10, 10, 10, 0) 100%)'
          }}
        />

        {/* Solid Black Header Box Background (Smoothly appears on scroll, hidden when Hero Banner is aligned at top) */}
        <div 
          className={`absolute inset-0 bg-[#0A0A0A] border-b border-white/10 shadow-2xl pointer-events-none transition-opacity duration-300 ease-in-out ${
            isScrolled ? 'opacity-100' : 'opacity-0'
          }`} 
        />

        {/* Header content sitting above backdrops */}
        <div className="relative z-10">
          {/* Top bar (Logo & Search & Notif) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <LogoPlaceholder size="sm" />
            </div>
            
            <div 
              onClick={onOpenSearch}
              className="flex-1 relative flex items-center h-9 bg-white/15 backdrop-blur-md rounded-full pl-9 pr-20 border border-white/5 cursor-pointer hover:bg-white/20 transition-colors overflow-hidden group"
            >
               <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                 <Search className="h-4 w-4 text-[#A1A1AA] group-hover:text-white transition-colors" />
               </div>
               
               {/* Animated Rotating Search Placeholder (Smooth non-jumping cross-fade) */}
               <div className="relative w-full h-full overflow-hidden pointer-events-none">
                 <AnimatePresence mode="wait">
                   <motion.div
                     key={activePlaceholder}
                     initial={{ opacity: 0, y: 7 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -7 }}
                     transition={{ duration: 0.32, ease: 'easeOut' }}
                     className="absolute inset-0 flex items-center text-sm text-[#e4e4e7] truncate select-none font-normal text-left"
                   >
                     {activePlaceholder}
                   </motion.div>
                 </AnimatePresence>
               </div>

               <button 
                 type="button"
                 onClick={(e) => {
                   e.stopPropagation();
                   onOpenSearch?.();
                 }}
                 className="absolute right-1 top-1/2 -translate-y-1/2 text-[#a78bfa] font-bold text-[13px] px-3 py-1 rounded-full hover:bg-white/10 transition cursor-pointer z-10"
               >
                 Search
               </button>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerManualUpdateCheck();
                setShowApkUpdateModal(true);
              }}
              title={
                hasApkUpdate
                  ? `New APK Update Available (${formattedLatestVersion}) - Tap to Update`
                  : `Check App Update (${formattedCurrentVersion})`
              }
              className={`relative flex shrink-0 items-center justify-center h-9 w-9 rounded-full transition cursor-pointer ${
                hasApkUpdate
                  ? 'bg-red-600 text-white border-2 border-red-200 shadow-[0_0_22px_rgba(239,68,68,1)] animate-pulse hover:bg-red-500'
                  : 'bg-white/15 backdrop-blur-md text-white hover:bg-white/25 border border-white/10'
              }`}
            >
              {hasApkUpdate && (
                <>
                  <span className="absolute -inset-1.5 rounded-full bg-red-500/60 animate-ping pointer-events-none" />
                  <span className="absolute -top-1 -right-1 z-20 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[8px] font-black text-red-600 shadow">
                    !
                  </span>
                </>
              )}
              <ArrowUp className="relative z-10 h-4 w-4 text-white stroke-[2.6]" />
            </button>
          </div>

          {/* Hot Tabs */}
          <div className="flex items-center gap-6 mt-3 overflow-x-auto scrollbar-none pl-1">
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    adManager.handleHomeCategoryClick(tab, !!user?.isPremium);
                    setActiveTab(tab);
                  }}
                  className={`relative flex items-center gap-1 pb-1 text-[16px] whitespace-nowrap transition cursor-pointer ${
                    isActive ? 'text-white font-bold' : 'text-[#d4d4d8] font-medium hover:text-white'
                  }`}
                >
                  <span>{tab}</span>
                  {tab === 'LIVE' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                  )}
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-[#a78bfa]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hero Banner Area */}
      <div className="-mt-[112px] relative w-full h-[320px] sm:h-[400px] md:h-[400px] lg:h-[480px] shrink-0 bg-[#0A0A0A] overflow-hidden">
        {loading ? (
          <SkeletonHeroBanner />
        ) : filteredHeroBanner.length > 0 ? (
          <HeroBannerCarousel 
            banners={filteredHeroBanner}
            onSelectContent={handleContentClick}
            onPaletteChange={setBannerPalette}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-[#141414] text-[#A1A1AA] text-sm pt-28">
            No banners available for {activeTab}
          </div>
        )}
      </div>

      {/* Categories Row */}
      {loading ? (
        <SkeletonCategoryPills />
      ) : (() => {
        const screenCats = screensCategories?.[activeTab];
        let dbCategories = [];
        if (screenCats && screenCats.length > 0) {
          dbCategories = screenCats.sort((a,b)=>(a.order||0)-(b.order||0));
        } else if (categories && categories.length > 0) {
          dbCategories = categories;
        } else {
          // Derive dynamically from real contentList
          const genreMap = new Map<string, string>();
          (contentList || []).forEach((c) => {
            if (c.genres && Array.isArray(c.genres)) {
              c.genres.forEach(g => {
                if (g && !genreMap.has(g.toLowerCase())) {
                  genreMap.set(g.toLowerCase(), c.posterUrl || c.backdropUrl || '');
                }
              });
            }
          });
          dbCategories = Array.from(genreMap.entries()).slice(0, 6).map(([name, image], idx) => ({
            id: `cat-auto-${idx}`,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            image
          }));
        }
        
        const displayCategories = [
          { id: 'cat-all', name: 'All' },
          ...dbCategories.filter((c: any) => c.name !== 'All')
        ];

        return (
          <div className="mt-5 px-4">
            <h2 className="text-[17px] font-bold text-white mb-3">Categories</h2>
            
            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
              {displayCategories.map((cat: any) => {
                if (cat.name === 'All') {
                  return (
                    <div
                      key={cat.id}
                      onClick={() => onSeeAllCategory?.(cat.name)}
                      className="relative flex h-[50px] w-[90px] flex-shrink-0 cursor-pointer items-center justify-between px-3 overflow-hidden rounded-xl bg-gradient-to-br from-[#1C1C1E] to-[#121212] transition hover:scale-105 active:scale-95 border border-white/10 shadow-md"
                    >
                      <span className="text-sm font-semibold text-white">All</span>
                      <Filter className="h-4 w-4 text-[#A1A1AA]" />
                    </div>
                  );
                }

                return (
                  <div
                    key={cat.id || cat.name}
                    onClick={() => onSeeAllCategory?.(cat.name)}
                    className="relative flex h-[50px] w-[130px] flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-[#1C1C1E] transition hover:scale-105 active:scale-95 border border-white/5"
                  >
                    <img
                      src={cat.image || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300'}
                      alt={cat.name}
                      className="absolute inset-0 h-full w-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
                    <span className="relative z-10 text-sm font-semibold text-white drop-shadow-md">
                      {cat.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      
      {/* Top 10 Content Row (Filtered by Active Tab) */}
      {(() => {
        if (loading) return null;
        const top10 = filteredContentList
          .filter((item: any) => item.isTop10)
          .sort((a: any, b: any) => (a.top10Rank || 99) - (b.top10Rank || 99))
          .slice(0, 10);

        if (top10.length === 0) return null;

        return (
          <div className="mt-5 px-4">
            <SectionHeader
              title={`Top 10 in ${activeTab}`}
              icon={<Trophy className="h-5 w-5 text-amber-400" />}
            />
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {top10.map((item: any, index: number) => (
                <div key={`${item.id}-${index}`} className="relative flex items-end">
                  {/* Big Number */}
                  <span className="absolute -left-3 -bottom-4 text-[80px] font-black text-[#1C1C1E] leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] z-0" style={{ WebkitTextStroke: '2px #3F3F46' }}>
                    {index + 1}
                  </span>
                  <div className="z-10 ml-8">
                    <ContentCard item={item} onPress={handleContentClick} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Upcoming Releases Row (Filtered by Active Tab) */}
      {(() => {
        if (loading) return null;
        const upcoming = filteredContentList
          .filter((item: any) => item.isUpcoming)
          .sort((a: any, b: any) => new Date(a.releaseDate || '').getTime() - new Date(b.releaseDate || '').getTime())
          .slice(0, 10);

        if (upcoming.length === 0) return null;

        return (
          <div className="mt-5 px-4">
            <SectionHeader
              title="Coming Soon"
              icon={<Bell className="h-5 w-5 text-[#8B5CF6]" />}
            />
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {upcoming.map((item: any, index: number) => (
                <div key={`${item.id}-${index}`} className="flex flex-col gap-1">
                  <ContentCard item={item} onPress={handleContentClick} />
                  {item.releaseDate && (
                    <div className="text-center mt-1">
                      <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider bg-[#1C1C1E] px-2 py-0.5 rounded-full border border-white/5">
                        {new Date(item.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Dynamic Home Rows Section */}
      {loading ? (
        <>
          <SkeletonContentRow count={5} />
          <SkeletonContentRow count={5} />
          <SkeletonContentRow count={5} />
        </>
      ) : (() => {
        const userConfigured = homeRowsByScreen?.[activeTab];
        const currentScreenRows = (userConfigured && userConfigured.length > 0)
          ? userConfigured
          : getDefaultRowsForScreen(activeTab);

        return currentScreenRows.map((row: any) => {
          let rowContent = [];
          
          if (row.mode === 'custom_pick') {
             rowContent = (row.contentIds || []).map((cObj: any) => {
               if (cObj && typeof cObj === 'object' && (cObj.isCollection || cObj.collectionIds || cObj.id?.startsWith('col_'))) {
                 return { ...cObj, isCollection: true };
               }
               const cId = typeof cObj === 'string' ? cObj : cObj?.id;
               const original = contentList.find((c: any) => c.id === cId);
               if (!original) {
                 if (cObj && typeof cObj === 'object' && (cObj.customTitle || cObj.title || cObj.customImage || cObj.imageUrl)) {
                   return {
                     id: cId || `item-${Math.random()}`,
                     title: cObj.customTitle || cObj.title || 'Featured Content',
                     posterUrl: cObj.customImage || cObj.imageUrl || '',
                     backdropUrl: cObj.backdropImage || cObj.customImage || cObj.imageUrl || '',
                     ...cObj
                   };
                 }
                 return null;
               }
               
               if (typeof cObj === 'object') {
                 return {
                   ...original,
                   customImage: cObj.customImage,
                   customTitle: cObj.customTitle
                 };
               }
               return original;
             }).filter(Boolean);
          } else {
            if (row.tagFilter) {
              const tagLower = row.tagFilter.trim().toLowerCase();
              if (tagLower === 'all' || tagLower === '') {
                rowContent = (filteredContentList && filteredContentList.length > 0) ? filteredContentList : contentList;
              } else {
                rowContent = (filteredContentList || contentList || []).filter((item: any) => {
                  const type = (item.type || '').toLowerCase();
                  const category = (item.category || '').toLowerCase();
                  const genres = Array.isArray(item.genres) ? item.genres.map((g: string) => g.toLowerCase()) : [];
                  const language = (item.language || '').toLowerCase();
                  const title = (item.title || '').toLowerCase();

                  if (tagLower === 'movie' || tagLower === 'movies') {
                    return type === 'movie' || category.includes('movie') || (item.videoLinks && item.videoLinks.length > 0 && !item.seasons);
                  }
                  if (tagLower === 'tv' || tagLower === 'series') {
                    return type === 'tv' || type === 'series' || category === 'tv' || category === 'series' || category === 'tv series' || genres.includes('tv') || genres.includes('series') || (item.seasons && item.seasons.length > 0);
                  }
                  if (tagLower === 'anime') {
                    return type === 'anime' || category.includes('anime') || genres.includes('anime') || title.includes('anime');
                  }
                  if (tagLower === 'short tv' || tagLower === 'short_tv') {
                    return type === 'short_tv' || category === 'short tv' || category === 'short_tv' || category.includes('short') || genres.some((g: string) => g.includes('short'));
                  }
                  if (tagLower === 'hindi dubbed' || tagLower === 'hindi') {
                    return language.includes('hindi') || category.includes('hindi') || title.includes('hindi');
                  }

                  return (
                    category === tagLower ||
                    category.includes(tagLower) ||
                    type === tagLower ||
                    genres.some((g: string) => g.toLowerCase().includes(tagLower)) ||
                    title.includes(tagLower)
                  );
                });
              }
            } else {
              rowContent = (filteredContentList || []).filter((item: any) => item.homeRows && Array.isArray(item.homeRows) && item.homeRows.includes(row.id));
            }
          }
          
          if (rowContent.length === 0 && row.mode !== 'custom_pick') {
            const titleLower = (row.title || '').toLowerCase();
            const idLower = (row.id || '').toLowerCase();
            
            if (idLower.includes('trending') || titleLower.includes('trending')) {
              rowContent = filteredTrending;
            } else if (idLower.includes('cinema') || titleLower.includes('cinema')) {
              rowContent = filteredCinema;
            } else if (idLower.includes('foryou') || titleLower.includes('for you')) {
              rowContent = filteredForYou;
            } else {
              rowContent = (filteredContentList || []).filter((item: any) => 
                (item.category && item.category.toLowerCase() === titleLower) ||
                (item.genres && Array.isArray(item.genres) && item.genres.some((g: string) => g.toLowerCase().includes(titleLower))) ||
                (item.type && titleLower.includes(item.type.toLowerCase()))
              );
              if (rowContent.length === 0) {
                rowContent = filteredContentList.slice(0, 12);
              }
            }
          }

          const titleLower = (row.title || '').toLowerCase();
          const idLower = (row.id || '').toLowerCase();

          if (row.style === 'seasonal_card') {
            const actualCols = rowContent.filter((item: any) => item.isCollection);
            if (actualCols.length > 0) {
              rowContent = actualCols;
            } else if (rowContent.length > 0) {
              const virtualCollection = {
                id: `vcol-${row.id || titleLower.replace(/\s+/g, '-') || 'default-col'}`,
                isCollection: true,
                title: row.title || 'Featured Collection',
                customTitle: row.title || 'Featured Collection',
                collectionIds: rowContent.slice(0, 6).map((c: any) => c.id),
              };
              rowContent = [virtualCollection];
            }
          } else if ((row.style === 'landscape_text' || row.style === 'landscape') && rowContent.some((item: any) => item.isCollection)) {
            rowContent = rowContent.filter((item: any) => item.isCollection);
          }
          if (rowContent.length === 0) return null;

          let icon = <Sparkles className="h-5 w-5 text-[#8B5CF6]" />;
          
          if (row.icon) {
            switch(row.icon) {
              case 'Sparkles': icon = <Sparkles className="h-5 w-5 text-[#8B5CF6]" />; break;
              case 'Flame': icon = <Flame className="h-5 w-5 text-amber-500 fill-amber-500" />; break;
              case 'Zap': icon = <Zap className="h-5 w-5 text-[#10B981]" />; break;
              case 'Trophy': icon = <Trophy className="h-5 w-5 text-[#FBBF24]" />; break;
              case 'Crown': icon = <Crown className="h-5 w-5 text-[#F59E0B]" />; break;
              case 'Swords': icon = <Swords className="h-5 w-5 text-[#F43F5E]" />; break;
              case 'Smile': icon = <Smile className="h-5 w-5 text-[#EAB308]" />; break;
              case 'Heart': icon = <Heart className="h-5 w-5 text-[#EC4899]" />; break;
              case 'Ghost': icon = <Ghost className="h-5 w-5 text-[#9CA3AF]" />; break;
              case 'Rocket': icon = <Rocket className="h-5 w-5 text-[#3B82F6]" />; break;
              case 'Map': icon = <MapIcon className="h-5 w-5 text-[#10B981]" />; break;
              case 'Gamepad2': icon = <Gamepad2 className="h-5 w-5 text-[#8B5CF6]" />; break;
              case 'Tv': icon = <Tv className="h-5 w-5 text-[#06B6D4]" />; break;
              case 'Clapperboard': icon = <Clapperboard className="h-5 w-5 text-[#8B5CF6]" />; break;
              case 'Film': icon = <Film className="h-5 w-5 text-[#8B5CF6]" />; break;
              case 'PlayCircle': icon = <PlayCircle className="h-5 w-5 text-[#3B82F6]" />; break;
              case 'PlaySquare': icon = <PlaySquare className="h-5 w-5 text-[#EF4444]" />; break;
              case 'Clock': icon = <Clock className="h-5 w-5 text-[#F59E0B]" />; break;
              case 'Compass': icon = <Compass className="h-5 w-5 text-[#10B981]" />; break;
              case 'Star': icon = <Star className="h-5 w-5 text-[#FBBF24]" />; break;
            }
          } else if (idLower.includes('trending') || titleLower.includes('trending') || titleLower.includes('hot') || titleLower.includes('popular')) {
            icon = <Flame className="h-5 w-5 text-amber-500 fill-amber-500" />;
          } else if (titleLower.includes('continue') || titleLower.includes('watching')) {
            icon = <PlayCircle className="h-5 w-5 text-[#3B82F6]" />;
          } else if (titleLower.includes('new') || titleLower.includes('recent') || titleLower.includes('added') || titleLower.includes('latest')) {
            icon = <Zap className="h-5 w-5 text-[#10B981]" />;
          } else if (titleLower.includes('anime')) {
            icon = <Swords className="h-5 w-5 text-[#F43F5E]" />;
          } else if (titleLower.includes('action')) {
            icon = <Swords className="h-5 w-5 text-[#F59E0B]" />;
          } else if (titleLower.includes('comedy') || titleLower.includes('funny')) {
            icon = <Smile className="h-5 w-5 text-[#EAB308]" />;
          } else if (titleLower.includes('romance') || titleLower.includes('love')) {
            icon = <Heart className="h-5 w-5 text-[#EC4899]" />;
          } else if (titleLower.includes('horror') || titleLower.includes('scary')) {
            icon = <Ghost className="h-5 w-5 text-[#9CA3AF]" />;
          } else if (titleLower.includes('sci-fi') || titleLower.includes('space') || titleLower.includes('science')) {
            icon = <Rocket className="h-5 w-5 text-[#3B82F6]" />;
          } else if (titleLower.includes('adventure') || titleLower.includes('explore')) {
            icon = <MapIcon className="h-5 w-5 text-[#10B981]" />;
          } else if (titleLower.includes('game') || titleLower.includes('gaming')) {
            icon = <Gamepad2 className="h-5 w-5 text-[#8B5CF6]" />;
          } else if (titleLower.includes('top') || titleLower.includes('award') || titleLower.includes('best') || titleLower.includes('must watch')) {
            icon = <Trophy className="h-5 w-5 text-[#FBBF24]" />;
          } else if (titleLower.includes('premium') || titleLower.includes('exclusive')) {
            icon = <Crown className="h-5 w-5 text-[#F59E0B]" />;
          } else if (titleLower.includes('tv') || titleLower.includes('shows') || titleLower.includes('series')) {
            icon = <Tv className="h-5 w-5 text-[#06B6D4]" />;
          } else if (idLower.includes('cinema') || titleLower.includes('cinema') || titleLower.includes('movies') || titleLower.includes('films')) {
            icon = <Film className="h-5 w-5 text-[#8B5CF6]" />;
          } else if (idLower.includes('foryou') || titleLower.includes('for you') || titleLower.includes('recommended') || titleLower.includes('picks')) {
            icon = <Sparkles className="h-5 w-5 text-[#06B6D4]" />;
          } else {
            if (activeTab === 'Movies') {
              icon = <Clapperboard className="h-5 w-5 text-[#8B5CF6]" />;
            } else if (activeTab === 'TV') {
              icon = <Tv className="h-5 w-5 text-[#06B6D4]" />;
            } else if (activeTab === 'Anime') {
              icon = <Swords className="h-5 w-5 text-[#F43F5E]" />;
            } else if (activeTab === 'Short TV') {
              icon = <Zap className="h-5 w-5 text-[#10B981]" />;
            } else if (activeTab === 'LIVE') {
              icon = <PlaySquare className="h-5 w-5 text-[#EF4444]" />;
            }
          }

          const style = row.style || 'default';
          const isDefaultStyle = style === 'default';
          const targetCategory = row.tagFilter || row.targetFilter || row.categoryFilter || (row.title ? row.title.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim() : 'All');

          // Network / Brand Grid Section (4-column squircle grid layout)
          if (style === 'network_grid' || style === 'networks') {
            let networks: NetworkItem[] = [];
            if (row.contentIds && Array.isArray(row.contentIds) && row.contentIds.length > 0) {
              networks = row.contentIds.map((item: any) => {
                if (typeof item === 'object' && (item.isNetwork || item.logoUrl || item.name)) {
                  return {
                    id: item.id || `net-${Math.random()}`,
                    isNetwork: true,
                    name: item.name || item.customTitle || item.title || 'Network',
                    logoUrl: item.logoUrl || item.customImage || item.posterUrl || '',
                    bannerUrl: item.bannerUrl || item.backdropUrl || item.backdropImage || '',
                    description: item.description || '',
                    contentIds: item.contentIds || item.collectionIds || [],
                    movieIds: item.movieIds || [],
                    seriesIds: item.seriesIds || [],
                    tagFilter: item.tagFilter || ''
                  };
                }
                return null;
              }).filter(Boolean) as NetworkItem[];
            }

            if (networks.length === 0) {
              networks = DEFAULT_NETWORK_PRESETS;
            }

            return (
              <NetworkGridRow
                key={row.id || row.title}
                title={row.title || 'Networks'}
                icon={icon}
                networks={networks}
                onSelectNetwork={(network) => onSelectNetwork?.(network)}
                onSeeAll={onSeeAllCategory ? () => onSeeAllCategory(targetCategory || 'All') : undefined}
              />
            );
          }

          // Three Column Mode Section (3-col vertical grid with no horizontal scroll)
          if (style === 'three_column' || style === 'three_column_grid') {
            return (
              <ThreeColumnRow
                key={row.id || row.title}
                title={row.title}
                icon={icon}
                items={rowContent}
                onSelectContent={(item) => handleContentClick(item)}
                onSeeAll={onSeeAllCategory ? () => onSeeAllCategory(targetCategory || 'All') : undefined}
              />
            );
          }

          return (
            <div key={row.id || row.title} className="mt-5 px-4">
              <SectionHeader
                title={row.title}
                icon={icon}
                onActionPress={isDefaultStyle && onSeeAllCategory ? () => onSeeAllCategory(targetCategory || 'All') : undefined}
              />
              <div className="flex gap-3 overflow-x-auto pb-4 pt-1 scrollbar-none">
                {rowContent.map((item: any, index: number) => {
                  if (style === 'seasonal_card') {
                    const collectionIds = item.collectionIds || [];
                    const resolved = collectionIds.map((id: string) => contentList.find((c: any) => c.id === id)).filter(Boolean);
                    
                    const p1 = resolved[0]?.posterUrl || item.customImage || item.posterUrl || 'https://via.placeholder.com/100x140/1a1a1a/666666';
                    const p2 = resolved[1]?.posterUrl || resolved[0]?.backdropUrl || item.backdropUrl || p1;
                    const p3 = resolved[2]?.posterUrl || resolved[1]?.backdropUrl || item.backdropUrl || p1;

                    const displayTitle = item.customTitle || item.title || 'Winter 2026';
                    const titleParts = displayTitle.split(' ');
                    const titleRender = titleParts.length > 1 
                      ? <>{titleParts[0]}<br/>{titleParts.slice(1).join(' ')}</>
                      : displayTitle;

                    return (
                      <div 
                        key={`${item.id}-${index}`} 
                        onClick={() => handleContentClick(item)} 
                        className="relative shrink-0 w-[230px] sm:w-[240px] h-[115px] rounded-[18px] overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform shadow-xl border border-white/10 group bg-[#121212] isolate"
                      >
                        {/* Blurred Poster Background */}
                        {p1 && <img src={p1} alt="bg" className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-70 group-hover:scale-140 transition-transform duration-700" />}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-black/70" />
                        
                        {/* Card Contents */}
                        <div className="absolute inset-0 flex items-center justify-between pl-2.5 pr-0 py-2">
                          {/* Left: 3 Overlapping Poster Stack */}
                          <div className="relative w-[100px] h-[98px] shrink-0 my-auto">
                            {/* Card 3 (Back) */}
                            <div className="absolute w-[62px] h-[86px] left-[26px] top-[6px] z-[1] rounded-lg overflow-hidden shadow-[0_4px_10px_rgba(0,0,0,0.8)] border border-white/10 opacity-75 bg-[#121212]">
                              {p3 && <img src={p3} className="w-full h-full object-cover" alt="" />}
                            </div>
                            {/* Card 2 (Middle) */}
                            <div className="absolute w-[64px] h-[90px] left-[13px] top-[3px] z-[2] rounded-lg overflow-hidden shadow-[0_6px_14px_rgba(0,0,0,0.85)] border border-white/15 opacity-90 bg-[#121212]">
                              {p2 && <img src={p2} className="w-full h-full object-cover" alt="" />}
                            </div>
                            {/* Card 1 (Front) */}
                            <div className="absolute w-[66px] h-[96px] left-0 top-0 z-[3] rounded-xl overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.9)] border border-white/25 bg-[#121212]">
                              {p1 && <img src={p1} className="w-full h-full object-cover" alt="" />}
                            </div>
                          </div>
                          
                          {/* Right: Title & Bottom HOT LIST Bar */}
                          <div className="flex-1 flex flex-col justify-between h-full pl-1">
                            {/* Title Area */}
                            <div className="flex-1 flex items-center justify-center pt-1 pr-2">
                              <h3 className="text-[17px] font-black text-white text-center leading-[1.1] italic tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                                {titleRender}
                              </h3>
                            </div>
                            
                            {/* HOT LIST Grey Bar */}
                            <div className="w-full bg-[#52525B]/50 backdrop-blur-md py-1 px-2 border-t border-l border-white/15 rounded-tl-lg rounded-br-[17px] flex items-center justify-center text-center">
                              <span className="text-[11px] font-black text-white italic tracking-widest uppercase drop-shadow">HOT LIST</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (style === 'landscape_text') {
                    const displayBg = item.customImage || item.backdropUrl || item.posterUrl;
                    const displayTitle = item.customTitle || item.title;
                    return (
                      <div key={`${item.id}-${index}`} onClick={() => handleContentClick(item)} className="relative shrink-0 w-[240px] h-[135px] rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform border border-white/5 shadow-lg">
                        <img src={displayBg} alt={displayTitle} className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                    );
                  } else if (style === 'classic_anime') {
                    const displayPoster = item.customImage || item.posterUrl;
                    const displayTitle = item.customTitle || item.title;
                    return (
                      <div 
                        key={`${item.id}-${index}`} 
                        onClick={() => handleContentClick(item)} 
                        className="group relative shrink-0 w-[90px] sm:w-[100px] cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform"
                      >
                        <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-[#1A1A1A]">
                          <img 
                            src={displayPoster} 
                            alt={displayTitle} 
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                          />
                        </div>
                        <div className="mt-2 text-left">
                          <h3 className="truncate block text-[13px] font-medium text-white group-hover:text-[#8B5CF6] transition-colors" title={displayTitle}>
                            {displayTitle}
                          </h3>
                        </div>
                      </div>
                    );
                  } else {
                    return <ContentCard key={`${item.id}-${index}`} item={item} onPress={handleContentClick} />;
                  }
                })}
              </div>
            </div>
          );
        });
      })()}

      {/* APK UPDATE CHECKER MODAL (Triggered by blinking red ArrowUp button & Admin Update Messages) */}
      <AnimatePresence>
        {showApkUpdateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              className={`relative flex w-full max-w-md flex-col rounded-3xl p-5 sm:p-6 border text-left shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-none ${
                hasApkUpdate
                  ? 'bg-gradient-to-b from-[#1f1014] via-[#131217] to-[#0b0b0f] border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.35)]'
                  : 'bg-[#121216] border-white/10'
              }`}
            >
              {!forceUpdate && (
                <button
                  type="button"
                  onClick={() => setShowApkUpdateModal(false)}
                  className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-white/70 hover:text-white cursor-pointer z-10"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {hasApkUpdate ? (
                <>
                  {/* Top Blinking Red Header */}
                  <div className="flex items-center gap-3.5 pr-7">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-lg shadow-red-600/50 border border-red-300/50 animate-pulse">
                      <span className="absolute -inset-1 rounded-2xl bg-red-500/30 animate-ping pointer-events-none" />
                      <ArrowUp className="relative z-10 h-7 w-7 stroke-[2.8]" />
                    </div>
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-500/40 px-2.5 py-0.5 text-[10px] font-black text-red-300 uppercase tracking-wider">
                        <span className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
                        <span>
                          {forceUpdate
                            ? `Mandatory Force Update • ${formattedLatestVersion}`
                            : `New APK Update Available • ${formattedLatestVersion}`}
                        </span>
                      </div>
                      <h3 className="mt-1 text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
                        {updateTitle || `Update MaxPlay to ${formattedLatestVersion}`}
                      </h3>
                    </div>
                  </div>

                  {/* Version Comparison Strip (Synced with Me > Settings > Check Update) */}
                  <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-2xl bg-black/50 p-3 border border-red-500/25">
                    <div className="flex flex-col rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Settings &gt; Check Update
                      </span>
                      <span className="mt-0.5 font-mono text-sm font-black text-zinc-200 tabular-nums">
                        {formattedCurrentVersion} (Current)
                      </span>
                    </div>
                    <div className="flex flex-col rounded-xl bg-red-500/10 p-2.5 border border-red-500/30">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-300">
                        Admin Latest Release
                      </span>
                      <span className="mt-0.5 font-mono text-sm font-black text-emerald-400 tabular-nums">
                        {formattedLatestVersion} (New APK)
                      </span>
                    </div>
                  </div>

                  {/* Detailed Admin Announcement / Release Notes Box */}
                  <div className="mt-3.5 rounded-2xl bg-white/[0.04] p-3.5 border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-red-600 to-purple-600 text-[10px] font-black text-white shrink-0">
                          {(adminUpdateMessage?.senderName || 'M').charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-extrabold text-white">
                            {adminUpdateMessage?.senderName || 'MaxPlay Official'}
                          </span>
                          <span className="ml-1.5 text-[10px] font-mono text-red-300">
                            {adminUpdateMessage?.senderHandle || '@MaxPlayAdmin'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-400 shrink-0">
                        {adminUpdateMessage?.date || 'Official APK'}
                      </span>
                    </div>

                    <div className="max-h-40 overflow-y-auto pr-1 text-xs text-zinc-200 leading-relaxed whitespace-pre-line scrollbar-none">
                      {updateReleaseNotes ||
                        `Admin has released a newer version (${formattedLatestVersion}) above your current version (${formattedCurrentVersion}). Please download and install the latest MaxPlay APK to enjoy all new features and improvements.`}
                    </div>

                    {updateBannerUrl && (
                      <div className="w-full rounded-xl overflow-hidden border border-white/10 bg-black/50 max-h-44">
                        <img
                          src={updateBannerUrl}
                          alt={updateTitle}
                          referrerPolicy="no-referrer"
                          className="w-full max-h-44 object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Primary Action CTA: Hidden APK Link + Native Android Self-Updater */}
                  <div className="mt-4 flex flex-col gap-2.5">
                    {apkUpdateProgress && (
                      <div className="rounded-xl bg-black/60 border border-red-500/30 p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-zinc-200 truncate pr-2">
                            {apkUpdateProgress.message}
                          </span>
                          <span className="text-emerald-400 font-black tabular-nums shrink-0">
                            {apkUpdateProgress.progress}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-emerald-400 transition-all duration-200"
                            style={{ width: `${Math.max(4, apkUpdateProgress.progress)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={apkUpdateProgress?.status === 'downloading'}
                      onClick={() => {
                        NativeBridgeService.triggerApkUpdate(
                          apkDownloadUrl,
                          formattedLatestVersion,
                          updateTitle || `MaxPlay ${formattedLatestVersion} Update`,
                          (state) => setApkUpdateProgress(state)
                        );
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-600/40 hover:brightness-110 active:scale-95 transition cursor-pointer disabled:opacity-75"
                    >
                      <Download className="h-4 w-4 stroke-[2.6]" />
                      <span>
                        {apkUpdateProgress?.status === 'downloading'
                          ? `Downloading Update (${apkUpdateProgress.progress}%)...`
                          : apkUpdateProgress?.status === 'installing'
                          ? 'Launching Android App Installer...'
                          : `Update App Now (${formattedLatestVersion})`}
                      </span>
                    </button>

                    {!forceUpdate && (
                      <button
                        type="button"
                        onClick={() => setShowApkUpdateModal(false)}
                        className="w-full rounded-xl py-2 text-[11px] font-semibold text-zinc-400 hover:text-white transition cursor-pointer text-center"
                      >
                        Remind me later (Red icon will keep blinking)
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* Up-to-Date Status View when user taps the Upload Icon manually */
                <div className="flex flex-col items-center text-center py-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <span className="mt-3 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    App Up To Date • {formattedCurrentVersion}
                  </span>
                  <h3 className="mt-2 text-lg font-black text-white">
                    You Have the Latest MaxPlay Version
                  </h3>
                  <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                    Your current version in <strong className="text-white">Me &gt; Settings &gt; Check update</strong> is{' '}
                    <strong className="text-emerald-400">{formattedCurrentVersion}</strong>. Whenever Admin sends an update message with a version higher than {formattedCurrentVersion}, the upload icon will blink red automatically.
                  </p>
                  <div className="mt-4 flex w-full gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setIsCheckingUpdateManual(true);
                        await triggerManualUpdateCheck();
                        setTimeout(() => setIsCheckingUpdateManual(false), 500);
                      }}
                      className="flex-1 rounded-xl bg-white/10 hover:bg-white/15 py-2.5 text-xs font-bold text-white border border-white/10 transition cursor-pointer"
                    >
                      {isCheckingUpdateManual ? 'Checking Admin Messages...' : 'Check Again Now'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowApkUpdateModal(false)}
                      className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-xs font-black text-black transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
