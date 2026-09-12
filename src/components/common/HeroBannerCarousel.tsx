import React, { useState, useEffect, useRef } from 'react';
import { Play, Tv, Swords, Zap, Clapperboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ContentItem } from '../../types';
import { 
  extractAmbientPalette, 
  getCachedPalette, 
  AmbientColorPalette, 
  NEUTRAL_AMBIENT_PALETTE 
} from '../../utils/colorExtractor';

interface HeroBannerCarouselProps {
  banners: ContentItem[];
  onSelectContent?: (content: ContentItem) => void;
  onPaletteChange?: (palette: AmbientColorPalette) => void;
}

const DEFAULT_FALLBACK_IMG = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200';

export const HeroBannerCarousel: React.FC<HeroBannerCarouselProps> = ({
  banners,
  onSelectContent,
  onPaletteChange,
}) => {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const touchStartX = useRef<number | null>(null);

  const safeBanners = Array.isArray(banners) ? banners.filter(b => b && (b.backdropUrl || b.posterUrl || b.title)) : [];
  const safeBannersCount = safeBanners.length;

  const currentIndex = safeBannersCount > 0 ? ((page % safeBannersCount) + safeBannersCount) % safeBannersCount : 0;
  const currentItem = safeBanners[currentIndex] || safeBanners[0];
  const nextItem = safeBanners[(currentIndex + 1) % (safeBannersCount || 1)];

  // Dynamic ambient color palette state extracted from the current image
  const [palette, setPalette] = useState<AmbientColorPalette>(() => {
    const imgUrl = currentItem?.backdropUrl || currentItem?.posterUrl || '';
    return getCachedPalette(imgUrl) || NEUTRAL_AMBIENT_PALETTE;
  });

  const onPaletteChangeRef = useRef(onPaletteChange);
  useEffect(() => {
    onPaletteChangeRef.current = onPaletteChange;
  });

  // Extract ambient color when current banner item changes
  useEffect(() => {
    if (!currentItem) return;
    const imgUrl = currentItem.backdropUrl || currentItem.posterUrl || '';
    let isMounted = true;

    // 1. Check if real extracted color is already cached:
    const cached = getCachedPalette(imgUrl);
    if (cached) {
      setPalette(cached);
      onPaletteChangeRef.current?.(cached);
      return;
    }

    // 2. Extract real color from image without emitting any dummy/flashing colors
    extractAmbientPalette(imgUrl).then((pal) => {
      if (isMounted) {
        setPalette(pal);
        onPaletteChangeRef.current?.(pal);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentIndex, currentItem?.id, currentItem?.backdropUrl, currentItem?.posterUrl]);

  // Preload next image safely
  useEffect(() => {
    if (safeBannersCount <= 1) return;
    const nextIdx = ((page % safeBannersCount) + safeBannersCount + 1) % safeBannersCount;
    const imgUrl = safeBanners[nextIdx]?.backdropUrl || safeBanners[nextIdx]?.posterUrl;
    if (imgUrl) {
      const img = new Image();
      img.src = imgUrl;
    }
  }, [page, safeBannersCount, safeBanners]);

  // Initial preload safely
  useEffect(() => {
    safeBanners.slice(0, 2).forEach(item => {
      const imgUrl = item?.backdropUrl || item?.posterUrl;
      if (imgUrl) {
        const img = new Image();
        img.src = imgUrl;
      }
    });
  }, [safeBanners]);

  // Auto-advance timer with clean slide direction
  useEffect(() => {
    if (safeBannersCount <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setPage((prev) => prev + 1);
    }, 6000);
    return () => clearInterval(timer);
  }, [safeBannersCount]);

  // Handle image load error safely
  const handleImageError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (safeBannersCount <= 1) return;
    setDirection(1);
    setPage((prev) => prev + 1);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (safeBannersCount <= 1) return;
    setDirection(-1);
    setPage((prev) => prev - 1);
  };

  // Touch Swipe Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchStartX.current - touchEndX;

    if (deltaX > 40) {
      handleNext();
    } else if (deltaX < -40) {
      handlePrev();
    }
    touchStartX.current = null;
  };

  if (!currentItem || safeBannersCount === 0) {
    return null;
  }

  const getTypeIcon = (type?: string) => {
    if (type === 'tv') return <Tv className="w-3.5 h-3.5 text-[#A78BFA] shrink-0" />;
    if (type === 'anime') return <Swords className="w-3.5 h-3.5 text-[#F43F5E] shrink-0" />;
    if (type === 'short_tv') return <Zap className="w-3.5 h-3.5 text-[#10B981] shrink-0" />;
    return <Clapperboard className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" />;
  };

  const getGenreText = (item: ContentItem) => {
    if (item.genres && item.genres.length > 0) return item.genres[0];
    if (item.category) return item.category;
    if (item.type === 'anime') return 'Anime';
    if (item.type === 'tv') return 'Series';
    if (item.type === 'short_tv') return 'Short TV';
    return 'Drama';
  };

  const renderCardContent = (item: ContentItem, isActive: boolean) => {
    return (
      <>
        {/* Left: Mini Portrait Poster Card overlapping the top */}
        <div className="absolute -top-4 left-3 md:-top-6 md:left-4 rounded-lg overflow-hidden border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.5)] bg-[#1A1A1A]">
          <img src={item.posterUrl || DEFAULT_FALLBACK_IMG} className="w-[45px] h-[65px] md:w-[60px] md:h-[85px] object-cover" alt={item.title} />
        </div>
        
        {/* Center: Title & Metadata */}
        <div className="flex-1 min-w-0 py-1 pl-[64px] md:pl-[86px] flex flex-col justify-center">
          <h3 className={`text-[13px] sm:text-[14px] md:text-[16px] font-bold text-white truncate drop-shadow-md ${!isActive ? 'opacity-90' : ''}`}>
            {item.title}
          </h3>
          <div className="text-[11px] md:text-[13px] font-semibold text-zinc-300 flex items-center gap-1.5 mt-0.5 truncate">
            {getTypeIcon(item.type)}
            <span className="text-white/40 font-light">|</span>
            <span>{item.year || 2026}</span>
            <span className="text-white/40 font-light">|</span>
            <span className="truncate">{getGenreText(item)}</span>
          </div>
        </div>

        {/* Right: Round Play Button (Signature Purple Gradient) */}
        <div className="shrink-0 flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] shadow-[0_4px_14px_rgba(139,92,246,0.6)] hover:scale-105 active:scale-95 transition-transform ml-1 cursor-pointer">
          <Play className="w-4 h-4 md:w-5 md:h-5 fill-white text-white ml-0.5 md:ml-1" />
        </div>
      </>
    );
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      zIndex: 0,
    }),
    center: {
      x: '0%',
      zIndex: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100%' : '100%',
      zIndex: 0,
    }),
  };

  const hasFailed = failedImages[currentItem.id];
  const rawImg = currentItem.backdropUrl || currentItem.posterUrl || DEFAULT_FALLBACK_IMG;
  const bannerImg = hasFailed ? DEFAULT_FALLBACK_IMG : rawImg;

  return (
    <div 
      className="relative h-full w-full overflow-hidden bg-[#0A0A0A] select-none group touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={page}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'tween', duration: 0.55, ease: [0.25, 1, 0.5, 1] },
          }}
          onClick={() => onSelectContent?.(currentItem)}
          className="absolute inset-0 h-full w-full cursor-pointer"
        >
          {/* Slide Background Image */}
          <img
            src={bannerImg}
            alt={currentItem.title || 'Featured'}
            loading="eager"
            decoding="async"
            onError={() => handleImageError(currentItem.id)}
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-1000 group-hover:scale-105"
          />
          
          {/* Smooth Multi-Stop Bottom Cinema Gradient Fade: 100% natural, seamless merge with #0A0A0A */}
          <div 
            className="absolute inset-x-0 bottom-0 h-36 sm:h-44 pointer-events-none z-10"
            style={{
              background: 'linear-gradient(to top, #0A0A0A 0%, rgba(10, 10, 10, 0.95) 18%, rgba(10, 10, 10, 0.70) 40%, rgba(10, 10, 10, 0.32) 65%, rgba(10, 10, 10, 0.08) 85%, transparent 100%)'
            }}
          />

          {/* Custom Glassmorphism Carousel Card (Positioned cleanly near the bottom) */}
          <div className="absolute bottom-4 left-0 right-0 z-20 flex gap-4 pl-4 md:bottom-8 md:pl-12 md:gap-6 overflow-hidden pointer-events-auto">
            
            {/* Current Item Card */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onSelectContent?.(currentItem);
              }}
              className="flex items-center shrink-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2 pr-3 cursor-pointer w-[250px] md:w-[320px] md:p-3 md:pr-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative mt-4 transition-transform hover:scale-[1.02] active:scale-95"
            > 
              {renderCardContent(currentItem, true)}
            </div>

            {/* Next Item Card (Peeking) */}
            {safeBannersCount > 1 && nextItem && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="flex items-center shrink-0 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-2 pr-3 cursor-pointer w-[250px] md:w-[320px] md:p-3 md:pr-4 opacity-60 relative mt-4 hover:opacity-100 hover:bg-white/10 hover:border-white/20 transition-all"
              > 
                {renderCardContent(nextItem, false)}
              </div>
            )}

          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

