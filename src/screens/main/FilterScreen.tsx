import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Check, RefreshCw } from 'lucide-react';
import { FilterChip } from '../../components/common/FilterChip';
import { ContentCard } from '../../components/common/ContentCard';
import { SkeletonGrid } from '../../components/common/LoadingSkeleton';
import { BottomSheet } from '../../components/common/BottomSheet';
import { GradientButton } from '../../components/common/GradientButton';
import { ContentItem } from '../../types';

import { useContent } from '../../hooks/useContent';

interface FilterScreenProps {
  initialFilter?: string;
  onBack?: () => void;
  onOpenSearch?: () => void;
  onSelectContent?: (item: ContentItem) => void;
}

export const FilterScreen: React.FC<FilterScreenProps> = ({
  onBack,
  onOpenSearch,
  onSelectContent,
  initialFilter,
}) => {
  const { contentList, loading } = useContent();
  const [activeType, setActiveType] = useState<'all' | 'movie' | 'tv' | 'anime'>('all');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['All']);
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');

  // BottomSheet Visibility
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  

  useEffect(() => {
    if (initialFilter) {
      const lower = initialFilter.toLowerCase().trim();
      if (['all', 'movie', 'tv', 'anime'].includes(lower)) {
         setActiveType(lower as any);
      } else if (lower === 'short tv' || lower === 'short_tv') {
         setActiveType('tv' as any);
      } else if (lower === 'trending') {
         // Default to all
         setActiveType('all');
      } else {
         if (initialFilter !== 'All' && initialFilter !== 'For You' && initialFilter !== 'Cinema') {
            setSelectedGenres([initialFilter]);
         }
      }
    }
  }, [initialFilter]);


  // Extract unique genres, countries, years from real data
  const FILTER_GENRES = ['All', ...Array.from(new Set(contentList.flatMap(c => c.genres || []))).sort()];
  const FILTER_COUNTRIES = ['All', ...Array.from(new Set(contentList.map(c => c.country || 'Unknown'))).sort()];
  const FILTER_YEARS = ['All', ...Array.from(new Set(contentList.map(c => String(c.year || '2024')))).sort((a, b) => Number(b) - Number(a))];

  // Filtered results
  const filteredData = contentList.filter((item) => {
    // 1. Type Match
    if (activeType !== 'all') {
      if (activeType === 'anime') {
        const isAnimeType = item.type?.toLowerCase() === 'anime';
        const isAnimeGenre = item.genres?.some((g: string) => g.toLowerCase().includes('anime'));
        const isAnimeCategory = item.category?.toLowerCase().includes('anime');
        if (!isAnimeType && !isAnimeGenre && !isAnimeCategory) return false;
      } else if (item.type !== activeType) {
        return false;
      }
    }

    // 2. Genre / Category / Tag Match
    if (!selectedGenres.includes('All')) {
      const itemGenres = item.genres || [];
      const itemCategory = item.category || '';
      const itemType = item.type || '';
      const itemTitle = item.title || '';
      const hasGenre = selectedGenres.some(g => {
        const target = g.toLowerCase().trim();
        const inGenres = itemGenres.some((ig: string) => ig.toLowerCase().includes(target) || target.includes(ig.toLowerCase()));
        const inCategory = itemCategory.toLowerCase().includes(target);
        const inType = itemType.toLowerCase().includes(target);
        const inTitle = itemTitle.toLowerCase().includes(target);
        return inGenres || inCategory || inType || inTitle;
      });
      if (!hasGenre) return false;
    }

    // 3. Country Match
    if (selectedCountry !== 'All') {
      const itemCountry = (item.country || '').toLowerCase();
      const targetCountry = selectedCountry.toLowerCase();
      if (!itemCountry.includes(targetCountry) && targetCountry !== itemCountry) {
        return false;
      }
    }

    // 4. Year Match
    if (selectedYear !== 'All' && String(item.year) !== selectedYear) {
      return false;
    }

    return true;
  });

  const toggleGenreSelection = (genre: string) => {
    if (genre === 'All') {
      setSelectedGenres(['All']);
      return;
    }
    const filteredOutAll = selectedGenres.filter((g) => g !== 'All');
    if (filteredOutAll.some(g => g.toLowerCase() === genre.toLowerCase())) {
      const updated = filteredOutAll.filter((g) => g.toLowerCase() !== genre.toLowerCase());
      setSelectedGenres(updated.length ? updated : ['All']);
    } else {
      setSelectedGenres([...filteredOutAll, genre]);
    }
  };

  
  return (
    <div
      className="flex h-full w-full flex-col bg-[#0A0A0A] text-left select-none"
      onClick={() => setOpenDropdown(null)}
    >
      {/* Top Header & Filter Controls Bar */}
      <div className="flex-shrink-0 bg-[#0A0A0A] border-b border-[#1C1C1E] z-30">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 text-[#A1A1AA] hover:text-white transition cursor-pointer rounded-lg hover:bg-[#1C1C1E]"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-lg font-bold text-white">Filter</h1>
          </div>
          <button
            type="button"
            onClick={onOpenSearch}
            className="p-1.5 text-[#A1A1AA] hover:text-[#8B5CF6] transition cursor-pointer rounded-lg hover:bg-[#1C1C1E]"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>

        {/* Section Tabs: All, Movie, TV, Anime (Directly Above Filter Buttons) */}
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'All' },
            { id: 'movie', label: 'Movie' },
            { id: 'tv', label: 'TV' },
            { id: 'anime', label: 'Anime' },
          ].map((type) => {
            const isActive = activeType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveType(type.id as any);
                  setOpenDropdown(null);
                }}
                className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20'
                    : 'bg-[#1C1C1E] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
                }`}
              >
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Filter Chips: Genre, Country, Year, Reset (Directly Below Section Tabs) */}
        <div className="relative z-20 flex flex-wrap items-center gap-2.5 px-4 py-2.5">
          <div className="relative">
            <FilterChip
              label={`Genre: ${
                selectedGenres.includes('All') ? 'All' : selectedGenres.join(', ')
              }`}
              isActive={!selectedGenres.includes('All')}
              onPress={() => setOpenDropdown(openDropdown === 'genre' ? null : 'genre')}
            />
            {openDropdown === 'genre' && (
              <div
                className="absolute top-full mt-1 left-0 w-48 max-h-60 overflow-y-auto rounded-xl bg-[#1C1C1E] border border-[#27272A] shadow-xl z-50 p-2 scrollbar-none"
                onClick={(e) => e.stopPropagation()}
              >
                {FILTER_GENRES.map((genre) => {
                  const isSelected = selectedGenres.some(
                    (g) => g.toLowerCase() === String(genre).toLowerCase()
                  );
                  return (
                    <button
                      key={String(genre)}
                      type="button"
                      onClick={() => toggleGenreSelection(String(genre))}
                      className="flex w-full items-center justify-between rounded-lg p-2 text-xs text-white hover:bg-[#27272A] transition cursor-pointer"
                    >
                      <span>{genre}</span>
                      {isSelected && <Check className="h-3 w-3 text-[#8B5CF6]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="relative">
            <FilterChip
              label={`Country: ${selectedCountry}`}
              isActive={selectedCountry !== 'All'}
              onPress={() => setOpenDropdown(openDropdown === 'country' ? null : 'country')}
            />
            {openDropdown === 'country' && (
              <div
                className="absolute top-full mt-1 left-0 w-40 max-h-60 overflow-y-auto rounded-xl bg-[#1C1C1E] border border-[#27272A] shadow-xl z-50 p-2 scrollbar-none"
                onClick={(e) => e.stopPropagation()}
              >
                {FILTER_COUNTRIES.map((country) => {
                  const isSelected =
                    selectedCountry.toLowerCase() === String(country).toLowerCase();
                  return (
                    <button
                      key={String(country)}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(String(country));
                        setOpenDropdown(null);
                      }}
                      className="flex w-full items-center justify-between rounded-lg p-2 text-xs text-white hover:bg-[#27272A] transition cursor-pointer"
                    >
                      <span>{country}</span>
                      {isSelected && <Check className="h-3 w-3 text-[#8B5CF6]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="relative">
            <FilterChip
              label={`Year: ${selectedYear}`}
              isActive={selectedYear !== 'All'}
              onPress={() => setOpenDropdown(openDropdown === 'year' ? null : 'year')}
            />
            {openDropdown === 'year' && (
              <div
                className="absolute top-full mt-1 left-0 w-32 max-h-60 overflow-y-auto rounded-xl bg-[#1C1C1E] border border-[#27272A] shadow-xl z-50 p-2 scrollbar-none"
                onClick={(e) => e.stopPropagation()}
              >
                {FILTER_YEARS.map((yr) => {
                  const isSelected = selectedYear === yr;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setSelectedYear(yr);
                        setOpenDropdown(null);
                      }}
                      className="flex w-full items-center justify-between rounded-lg p-2 text-xs text-white hover:bg-[#27272A] transition cursor-pointer"
                    >
                      <span>{yr}</span>
                      {isSelected && <Check className="h-3 w-3 text-[#8B5CF6]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedGenres(['All']);
              setSelectedCountry('All');
              setSelectedYear('All');
              setOpenDropdown(null);
            }}
            className="flex h-[32px] items-center gap-1 rounded-xl bg-[#1C1C1E] px-3 text-xs font-semibold text-[#6B7280] hover:text-white transition cursor-pointer ml-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24 md:pb-8 scrollbar-none">
        {/* Results Count Header */}
        <div className="mb-3 flex items-center justify-between text-xs text-[#A1A1AA]">
          <span>Showing {filteredData.length} items</span>
        </div>

        {/* Results Grid */}
        {loading ? (
          <SkeletonGrid count={9} cols="grid-cols-3 sm:grid-cols-4 md:grid-cols-6" />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredData.map((item, index) => (
              <ContentCard
                key={`${item.id}-${index}`}
                item={item}
                width={105}
                height={155}
                onPress={onSelectContent}
              />
            ))}
          </div>
        )}

        {!loading && filteredData.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <p className="text-sm text-[#6B7280]">
              No titles match your selected filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
