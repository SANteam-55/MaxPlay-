import { ContentItem } from '../types';
import { MOCK_SEARCH_ALL } from './mockSearch';

export const FILTER_GENRES = [
  'All',
  'Action',
  'Adventure',
  'Animation',
  'Anime',
  'Comedy',
  'Crime',
  'Drama',
  'Fantasy',
  'Horror',
  'Romance',
  'Sci-Fi',
  'Supernatural',
  'Thriller',
];

export const FILTER_COUNTRIES = [
  'All',
  'United States',
  'India',
  'Japan',
  'South Korea',
  'United Kingdom',
  'China',
];

export const FILTER_YEARS = [
  'All',
  '2024',
  '2023',
  '2022',
  '2021',
  '2020',
  '2010-2019',
  'Before 2010',
];

export function getFilteredContent(
  type: 'all' | 'movie' | 'tv' | 'anime',
  genres: string[],
  country: string,
  year: string
): ContentItem[] {
  return MOCK_SEARCH_ALL.filter((item) => {
    // Type filter
    if (type !== 'all') {
      if (type === 'movie' && item.type !== 'movie') return false;
      if (type === 'tv' && item.type !== 'tv' && item.type !== 'short_tv') return false;
      if (type === 'anime' && item.type !== 'anime') return false;
    }

    // Genres filter
    if (genres.length > 0 && !genres.includes('All')) {
      const hasGenre = genres.some((g) => item.genres?.includes(g));
      if (!hasGenre) return false;
    }

    // Country filter
    if (country && country !== 'All' && item.country !== country) {
      return false;
    }

    // Year filter
    if (year && year !== 'All') {
      if (year === '2024' && item.year !== 2024) return false;
      if (year === '2023' && item.year !== 2023) return false;
      if (year === '2022' && item.year !== 2022) return false;
      if (year === '2021' && item.year !== 2021) return false;
      if (year === '2020' && item.year !== 2020) return false;
      if (year === '2010-2019' && (item.year < 2010 || item.year > 2019)) return false;
      if (year === 'Before 2010' && item.year >= 2010) return false;
    }

    return true;
  });
}
