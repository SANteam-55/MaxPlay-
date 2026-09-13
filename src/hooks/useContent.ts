import { useState, useEffect, useCallback, useRef } from 'react';
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

const saveToCache = (key: string, value: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

export function useContent() {
  const initialContent = useRef(loadFromCache<ContentItem[]>('maxplay_content_cache', []));
  const initialBanners = useRef(loadFromCache<any[]>('maxplay_hero_banners_cache', []));
  const initialRows = useRef(loadFromCache<Record<string, any[]>>('maxplay_home_rows_cache', {}));
  const initialScreensCats = useRef(loadFromCache<Record<string, any[]>>('maxplay_screens_categories_cache', {}));
  const initialCats = useRef(loadFromCache<any[]>('maxplay_categories_cache', []));

  const hasCache = initialContent.current.length > 0 || initialBanners.current.length > 0;

  const [contentList, setContentList] = useState<ContentItem[]>(initialContent.current);
  const [dbHeroBanners, setDbHeroBanners] = useState<any[]>(initialBanners.current);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>(initialCats.current);
  const [screensCategories, setScreensCategories] = useState<Record<string, any[]>>(initialScreensCats.current);
  const [homeRowsByScreen, setHomeRowsByScreen] = useState<Record<string, any[]>>(initialRows.current);

  useEffect(() => {
    let isMounted = true;
    let contentReceived = false;
    let bannersReceived = false;
    let rowsReceived = false;
    let screensCatsReceived = false;

    const checkAllLoaded = () => {
      if (!isMounted) return;
      // Release loading as soon as content or banners are ready, or if all completed
      if (contentReceived || bannersReceived || (rowsReceived && screensCatsReceived)) {
        setLoading(false);
      }
    };

    // Safety fallback: release skeleton if network is slow
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1500);

    // 1. Subscribe to Firestore Home Rows
    const unsubscribeRows = subscribeToHomeRows((rowsByScreen) => {
      if (!isMounted) return;
      rowsReceived = true;
      if (rowsByScreen && typeof rowsByScreen === 'object') {
        setHomeRowsByScreen(rowsByScreen);
        saveToCache('maxplay_home_rows_cache', rowsByScreen);
      }
      checkAllLoaded();
    });
    
    // 2. Subscribe to Firestore Screens Categories
    const unsubscribeScreensCats = subscribeToScreensCategories((cats) => {
      if (!isMounted) return;
      screensCatsReceived = true;
      if (cats && typeof cats === 'object') {
        setScreensCategories(cats);
        saveToCache('maxplay_screens_categories_cache', cats);
      }
      checkAllLoaded();
    });

    // 3. Subscribe to Firestore Categories
    const unsubscribeCats = subscribeToCategories((cats) => {
      if (!isMounted) return;
      if (cats && Array.isArray(cats)) {
        setCategories(cats);
        saveToCache('maxplay_categories_cache', cats);
      }
    });
  
    // 4. Subscribe to Firestore Content (Real items)
    const unsubscribeContent = subscribeToContent((items) => {
      if (!isMounted) return;
      contentReceived = true;
      if (items && Array.isArray(items)) {
        setContentList(items);
        saveToCache('maxplay_content_cache', items);
        setLoading(false);
      }
      checkAllLoaded();
    });

    // 5. Subscribe to Firestore Hero Banners
    const unsubscribeHero = subscribeToHeroBanners((banners) => {
      if (!isMounted) return;
      bannersReceived = true;
      if (banners && Array.isArray(banners)) {
        const valid = banners.filter(b => b && (b.title || b.imageUrl || b.backdropUrl || b.contentId));
        setDbHeroBanners(valid);
        saveToCache('maxplay_hero_banners_cache', valid);
        if (valid.length > 0) {
          setLoading(false);
        }
      }
      checkAllLoaded();
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      unsubscribeContent();
      unsubscribeHero();
      unsubscribeCats();
      unsubscribeScreensCats();
      unsubscribeRows();
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTimeout(() => setLoading(false), 500);
    } catch (e) {
      setError('Failed to refresh content');
      setLoading(false);
    }
  }, []);

  // Filter content subsets
  const getSubset = (filterFn: (item: ContentItem) => boolean, limit = 10) => {
    const filtered = contentList.filter(filterFn);
    return filtered.slice(0, limit);
  };

  // Construct Hero Banner Slides dynamically from Firestore DB heroBanners collection or real contentList
  const customHeroSlides: ContentItem[] = dbHeroBanners
    .filter(b => b && (b.title || b.imageUrl || b.backdropUrl || b.contentId))
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((b, i) => {
      const targetByContentId = b.contentId ? contentList.find(c => c.id === b.contentId) : null;
      const targetById = b.id ? contentList.find(c => c.id === b.id) : null;
      const targetByTitle = b.title ? contentList.find(c => c.title && c.title.toLowerCase() === b.title.toLowerCase()) : null;
      const target = targetByContentId || targetById || targetByTitle;

      const rawImg = b.imageUrl || b.backdropUrl || target?.backdropUrl || target?.posterUrl || '';
      const bannerImg = (rawImg && rawImg.trim() !== '') ? rawImg : (target?.backdropUrl || target?.posterUrl || '');
      const slideId = b.contentId || target?.id || b.id || `hero-slide-${i + 1}`;

      return {
        id: slideId,
        screenCategory: b.category || target?.category || 'Trending',
        title: (b.title && b.title.trim() !== '') ? b.title : (target?.title || 'Featured Content'),
        type: (b.type || target?.type || 'movie') as any,
        description: (b.subtitle && b.subtitle.trim() !== '') ? b.subtitle : (target?.description || ''),
        posterUrl: target?.posterUrl || target?.backdropUrl || b.imageUrl || bannerImg,
        backdropUrl: bannerImg,
        rating: target?.rating || 9.8,
        year: target?.year || 2025,
        country: target?.country || 'India',
        genres: (target?.genres && target.genres.length > 0) ? target.genres : ['Trending'],
        featured: true,
        trending: true,
        videoUrl: target?.videoUrl || '',
        videoLinks: target?.videoLinks || [],
        seasonsData: target?.seasonsData,
        episodesList: target?.episodesList
      };
    })
    .filter(slide => slide.backdropUrl || slide.posterUrl);

  // If custom hero slides exist from Firestore heroBanners collection, use them
  // Otherwise if contentList has items, use top featured/trending items
  let finalHeroBanner: ContentItem[] = [];
  if (customHeroSlides.length > 0) {
    finalHeroBanner = customHeroSlides;
  } else if (contentList.length > 0) {
    const featuredItems = contentList.filter(c => c.featured || c.trending || c.backdropUrl).slice(0, 5);
    finalHeroBanner = featuredItems.length > 0 ? featuredItems : contentList.slice(0, 5);
  }

  const heroBanner = finalHeroBanner;
  const trending = getSubset(item => !!item.trending, 10);
  const cinema = getSubset(item => item.type === 'movie' || item.type === 'tv', 10);
  const forYou = contentList.slice().reverse();

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
