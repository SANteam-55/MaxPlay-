import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  subscribeToContent,
  subscribeToHeroBanners,
  subscribeToCategories,
  subscribeToScreensCategories,
  subscribeToHomeRows
} from '../services/contentService';
import { ContentItem } from '../types';

const loadFromCache = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToCacheAsync = (key: string, value: any) => {
  if (typeof window === 'undefined') return;
  setTimeout(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, 0);
};

// Singleton In-Memory Content Store & Shared Listener Pool
// Prevents re-parsing localStorage and opening 5 duplicate Firestore listeners on every screen/tab switch!
interface GlobalContentState {
  contentList: ContentItem[];
  dbHeroBanners: any[];
  categories: any[];
  screensCategories: Record<string, any[]>;
  homeRowsByScreen: Record<string, any[]>;
  loading: boolean;
  initialized: boolean;
}

const initialContentCache = loadFromCache<ContentItem[]>('maxplay_content_cache', []);
const initialBannersCache = loadFromCache<any[]>('maxplay_hero_banners_cache', []);
const initialRowsCache = loadFromCache<Record<string, any[]>>('maxplay_home_rows_cache', {});
const initialScreensCatsCache = loadFromCache<Record<string, any[]>>('maxplay_screens_categories_cache', {});
const initialCatsCache = loadFromCache<any[]>('maxplay_categories_cache', []);

const hasInitialCache = initialContentCache.length > 0 || initialBannersCache.length > 0;

const globalState: GlobalContentState = {
  contentList: initialContentCache,
  dbHeroBanners: initialBannersCache,
  categories: initialCatsCache,
  screensCategories: initialScreensCatsCache,
  homeRowsByScreen: initialRowsCache,
  loading: !hasInitialCache,
  initialized: false,
};

const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((listener) => {
    try {
      listener();
    } catch {}
  });
}

function ensureGlobalSubscriptions() {
  if (globalState.initialized || typeof window === 'undefined') return;
  globalState.initialized = true;

  let contentReceived = false;
  let bannersReceived = false;
  let rowsReceived = false;
  let screensCatsReceived = false;

  const checkAllLoaded = () => {
    if (contentReceived || bannersReceived || (rowsReceived && screensCatsReceived)) {
      if (globalState.loading) {
        globalState.loading = false;
        notifySubscribers();
      }
    }
  };

  setTimeout(() => {
    if (globalState.loading) {
      globalState.loading = false;
      notifySubscribers();
    }
  }, 1200);

  // 1. Subscribe to Firestore Home Rows
  subscribeToHomeRows((rowsByScreen) => {
    rowsReceived = true;
    if (rowsByScreen && typeof rowsByScreen === 'object') {
      globalState.homeRowsByScreen = rowsByScreen;
      saveToCacheAsync('maxplay_home_rows_cache', rowsByScreen);
    }
    checkAllLoaded();
    notifySubscribers();
  });

  // 2. Subscribe to Firestore Screens Categories
  subscribeToScreensCategories((cats) => {
    screensCatsReceived = true;
    if (cats && typeof cats === 'object') {
      globalState.screensCategories = cats;
      saveToCacheAsync('maxplay_screens_categories_cache', cats);
    }
    checkAllLoaded();
    notifySubscribers();
  });

  // 3. Subscribe to Firestore Categories
  subscribeToCategories((cats) => {
    if (cats && Array.isArray(cats)) {
      globalState.categories = cats;
      saveToCacheAsync('maxplay_categories_cache', cats);
      notifySubscribers();
    }
  });

  // 4. Subscribe to Firestore Content (Real items)
  subscribeToContent((items) => {
    contentReceived = true;
    if (items && Array.isArray(items)) {
      globalState.contentList = items;
      globalState.loading = false;
      saveToCacheAsync('maxplay_content_cache', items);
    }
    checkAllLoaded();
    notifySubscribers();
  });

  // 5. Subscribe to Firestore Hero Banners
  subscribeToHeroBanners((banners) => {
    bannersReceived = true;
    if (banners && Array.isArray(banners)) {
      const valid = banners.filter(
        (b) => b && (b.title || b.imageUrl || b.backdropUrl || b.contentId)
      );
      globalState.dbHeroBanners = valid;
      saveToCacheAsync('maxplay_hero_banners_cache', valid);
      if (valid.length > 0) {
        globalState.loading = false;
      }
    }
    checkAllLoaded();
    notifySubscribers();
  });
}

export function useContent() {
  ensureGlobalSubscriptions();

  const [, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onUpdate = () => setTick((t) => t + 1);
    subscribers.add(onUpdate);
    return () => {
      subscribers.delete(onUpdate);
    };
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
  }, []);

  const contentList = globalState.contentList;
  const dbHeroBanners = globalState.dbHeroBanners;
  const categories = globalState.categories;
  const screensCategories = globalState.screensCategories;
  const homeRowsByScreen = globalState.homeRowsByScreen;
  const loading = globalState.loading;

  const { heroBanner, trending, cinema, forYou } = useMemo(() => {
    const customHeroSlides: ContentItem[] = dbHeroBanners
      .filter((b) => b && (b.title || b.imageUrl || b.backdropUrl || b.contentId))
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((b, i) => {
        const targetByContentId = b.contentId ? contentList.find((c) => c.id === b.contentId) : null;
        const targetById = b.id ? contentList.find((c) => c.id === b.id) : null;
        const targetByTitle = b.title
          ? contentList.find((c) => c.title && c.title.toLowerCase() === b.title.toLowerCase())
          : null;
        const target = targetByContentId || targetById || targetByTitle;

        const rawImg = b.imageUrl || b.backdropUrl || target?.backdropUrl || target?.posterUrl || '';
        const bannerImg =
          rawImg && rawImg.trim() !== '' ? rawImg : target?.backdropUrl || target?.posterUrl || '';
        const slideId = b.contentId || target?.id || b.id || `hero-slide-${i + 1}`;

        return {
          id: slideId,
          screenCategory: b.category || target?.category || 'Trending',
          title: b.title && b.title.trim() !== '' ? b.title : target?.title || 'Featured Content',
          type: (b.type || target?.type || 'movie') as any,
          description: b.subtitle && b.subtitle.trim() !== '' ? b.subtitle : target?.description || '',
          posterUrl: target?.posterUrl || target?.backdropUrl || b.imageUrl || bannerImg,
          backdropUrl: bannerImg,
          fadeColor: b.fadeColor || '',
          rating: target?.rating || 9.8,
          year: target?.year || 2025,
          country: target?.country || 'India',
          genres: target?.genres && target.genres.length > 0 ? target.genres : ['Trending'],
          featured: true,
          trending: true,
          videoUrl: target?.videoUrl || '',
          videoLinks: target?.videoLinks || [],
          seasonsData: target?.seasonsData,
          episodesList: target?.episodesList,
        };
      })
      .filter((slide) => slide.backdropUrl || slide.posterUrl);

    let finalHeroBanner: ContentItem[] = [];
    if (customHeroSlides.length > 0) {
      finalHeroBanner = customHeroSlides;
    } else if (contentList.length > 0) {
      const featuredItems = contentList
        .filter((c) => c.featured || c.trending || c.backdropUrl)
        .slice(0, 5);
      finalHeroBanner = featuredItems.length > 0 ? featuredItems : contentList.slice(0, 5);
    }

    return {
      heroBanner: finalHeroBanner,
      trending: contentList.filter((item) => !!item.trending).slice(0, 10),
      cinema: contentList.filter((item) => item.type === 'movie' || item.type === 'tv').slice(0, 10),
      forYou: contentList.slice().reverse(),
    };
  }, [contentList, dbHeroBanners]);

  return {
    categories,
    screensCategories,
    homeRowsByScreen,
    contentList,
    heroBanner,
    trending,
    cinema,
    forYou,
    loading,
    error,
    refresh,
  };
}
