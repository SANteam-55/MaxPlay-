import React from 'react';

interface LoadingSkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = '100px',
  radius = '10px',
  className = '',
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
      }}
      className={`relative overflow-hidden bg-[#18181B] animate-pulse ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
    </div>
  );
};

// Single Poster Card Skeleton
export const SkeletonContentCard: React.FC<{ width?: number; height?: number }> = ({
  width = 110,
  height = 160,
}) => {
  return (
    <div className="flex flex-col gap-2 shrink-0 select-none">
      <LoadingSkeleton
        width={width}
        height={height}
        radius="14px"
        className="shadow-lg border border-white/5"
      />
      <LoadingSkeleton width={width * 0.8} height={14} radius="6px" />
      <LoadingSkeleton width={width * 0.5} height={10} radius="4px" />
    </div>
  );
};

// Hero Banner Carousel Skeleton
export const SkeletonHeroBanner: React.FC = () => {
  return (
    <div className="relative w-full h-[320px] sm:h-[400px] md:h-[400px] lg:h-[480px] bg-[#0E0E10] overflow-hidden">
      {/* Background Pulsing Shimmer */}
      <LoadingSkeleton width="100%" height="100%" radius="0px" />

      {/* Top Gradient Overlay: Clean natural dark top fade for skeleton */}
      <div className="absolute inset-x-0 top-0 h-40 sm:h-44 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/60 via-[#0A0A0A]/20 to-transparent pointer-events-none" />
      
      {/* Bottom Gradient Overlay: Clean natural dark bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-28 sm:h-36 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent pointer-events-none" />

      {/* Floating Card Glass Skeleton at Bottom */}
      <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-12 z-20 flex gap-4">
        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 w-[260px] md:w-[320px]">
          <LoadingSkeleton width={50} height={70} radius="10px" className="shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <LoadingSkeleton width="80%" height={16} radius="6px" />
            <LoadingSkeleton width="60%" height={12} radius="4px" />
            <LoadingSkeleton width="40%" height={10} radius="4px" />
          </div>
          <LoadingSkeleton width={36} height={36} radius="9999px" className="shrink-0" />
        </div>
      </div>
    </div>
  );
};

// Categories Row Skeleton
export const SkeletonCategoryPills: React.FC = () => {
  return (
    <div className="mt-5 px-4">
      <LoadingSkeleton width={110} height={20} radius="6px" className="mb-3" />
      <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
        <LoadingSkeleton width={80} height={48} radius="12px" className="shrink-0" />
        <LoadingSkeleton width={120} height={48} radius="12px" className="shrink-0" />
        <LoadingSkeleton width={120} height={48} radius="12px" className="shrink-0" />
        <LoadingSkeleton width={120} height={48} radius="12px" className="shrink-0" />
        <LoadingSkeleton width={120} height={48} radius="12px" className="shrink-0" />
      </div>
    </div>
  );
};

// Section Row Skeleton (Header + Horizontal Poster Cards)
export const SkeletonContentRow: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="mt-6 px-4">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <LoadingSkeleton width={22} height={22} radius="6px" />
          <LoadingSkeleton width={140} height={20} radius="6px" />
        </div>
        <LoadingSkeleton width={50} height={14} radius="4px" />
      </div>

      {/* Horizontal Cards Scroll */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonContentCard key={i} width={115} height={165} />
        ))}
      </div>
    </div>
  );
};

// Entire Home Screen Skeleton Loader
export const SkeletonHomeScreen: React.FC = () => {
  return (
    <div className="flex flex-col w-full h-full bg-[#0A0A0A] overflow-hidden select-none">
      <SkeletonHeroBanner />
      <SkeletonCategoryPills />
      <SkeletonContentRow count={5} />
      <SkeletonContentRow count={5} />
      <SkeletonContentRow count={5} />
    </div>
  );
};

// Grid Skeleton Loader (for Anime Screen, Search, Collections)
export const SkeletonGrid: React.FC<{ count?: number; cols?: string }> = ({
  count = 9,
  cols = 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6',
}) => {
  return (
    <div className={`grid ${cols} gap-3 p-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <LoadingSkeleton width="100%" height={150} radius="12px" />
          <LoadingSkeleton width="85%" height={12} radius="4px" />
          <LoadingSkeleton width="50%" height={10} radius="4px" />
        </div>
      ))}
    </div>
  );
};

// Content Detail Screen Skeleton Loader
export const SkeletonDetailScreen: React.FC = () => {
  return (
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden bg-[#0A0A0A] select-none scrollbar-none">
      {/* Top Header / Player Area Skeleton */}
      <div className="relative w-full aspect-video md:max-h-[380px] bg-[#121214] overflow-hidden">
        <LoadingSkeleton width="100%" height="100%" radius="0px" />
        <div className="absolute top-4 left-4 z-10">
          <LoadingSkeleton width={38} height={38} radius="9999px" className="border border-white/10" />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Title & Metadata Skeleton */}
        <div className="flex flex-col gap-2">
          <LoadingSkeleton width="75%" height={26} radius="8px" />
          <div className="flex items-center gap-2">
            <LoadingSkeleton width={48} height={18} radius="6px" />
            <LoadingSkeleton width={40} height={18} radius="6px" />
            <LoadingSkeleton width={60} height={18} radius="6px" />
            <LoadingSkeleton width={50} height={18} radius="6px" />
          </div>
        </div>

        {/* Action Buttons Row Skeleton (Add, Download, Share, Report) */}
        <div className="grid grid-cols-4 gap-3 py-1">
          <LoadingSkeleton height={44} radius="12px" />
          <LoadingSkeleton height={44} radius="12px" />
          <LoadingSkeleton height={44} radius="12px" />
          <LoadingSkeleton height={44} radius="12px" />
        </div>

        {/* Season & Language Selectors Skeleton */}
        <div className="flex items-center gap-3">
          <LoadingSkeleton width={110} height={36} radius="10px" />
          <LoadingSkeleton width={110} height={36} radius="10px" />
        </div>

        {/* Episodes Box / Grid Skeleton */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <LoadingSkeleton width={100} height={18} radius="6px" />
            <LoadingSkeleton width={60} height={14} radius="4px" />
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingSkeleton key={i} width={70} height={50} radius="12px" className="shrink-0" />
            ))}
          </div>
        </div>

        {/* Description Skeleton */}
        <div className="flex flex-col gap-2 pt-1">
          <LoadingSkeleton width="100%" height={14} radius="4px" />
          <LoadingSkeleton width="92%" height={14} radius="4px" />
          <LoadingSkeleton width="65%" height={14} radius="4px" />
        </div>

        {/* Tabs & Recommendation Grid Skeleton */}
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-6 border-b border-[#1C1C1E] pb-2">
            <LoadingSkeleton width={80} height={20} radius="6px" />
            <LoadingSkeleton width={80} height={20} radius="6px" />
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <LoadingSkeleton width="100%" height={140} radius="12px" />
                <LoadingSkeleton width="80%" height={12} radius="4px" />
                <LoadingSkeleton width="50%" height={10} radius="4px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
