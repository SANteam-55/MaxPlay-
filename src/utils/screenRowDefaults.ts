import { HomeRowConfig } from '../types';

export function getDefaultRowsForScreen(screenName: string): HomeRowConfig[] {
  switch (screenName) {
    case 'Anime':
      return [
        { id: 'anime-seasonal', title: 'Seasonal Anime', order: 1, style: 'seasonal_card', tagFilter: 'Anime' },
        { id: 'anime-classic', title: 'Classic Anime Series', order: 2, style: 'classic_anime', tagFilter: 'Anime' },
        { id: 'anime-otherworld', title: 'Welcome to Otherworld', order: 3, style: 'landscape_text', tagFilter: 'Anime' },
        { id: 'anime-popular', title: 'Popular Anime', order: 4, style: 'default', tagFilter: 'Anime' },
      ];
    case 'TV':
      return [
        { id: 'tv-seasonal', title: 'Seasonal Series', order: 1, style: 'seasonal_card', tagFilter: 'TV' },
        { id: 'tv-classic', title: 'Classic Series', order: 2, style: 'classic_anime', tagFilter: 'TV' },
        { id: 'tv-world', title: 'Welcome to TV Worlds', order: 3, style: 'landscape_text', tagFilter: 'TV' },
        { id: 'tv-popular', title: 'Popular TV Shows', order: 4, style: 'default', tagFilter: 'TV' },
      ];
    case 'Short TV':
      return [
        { id: 'shorttv-seasonal', title: 'Seasonal Short Drama', order: 1, style: 'seasonal_card', tagFilter: 'Short TV' },
        { id: 'shorttv-classic', title: 'Classic Mini Series', order: 2, style: 'classic_anime', tagFilter: 'Short TV' },
        { id: 'shorttv-quick', title: 'Quick Stories', order: 3, style: 'landscape_text', tagFilter: 'Short TV' },
        { id: 'shorttv-trending', title: 'Trending Short Dramas', order: 4, style: 'default', tagFilter: 'Short TV' },
      ];
    case 'Movies':
      return [
        { id: 'movies-premieres', title: 'Blockbuster Premieres', order: 1, style: 'seasonal_card', tagFilter: 'Movie' },
        { id: 'movies-classic', title: 'Classic Movie Favorites', order: 2, style: 'classic_anime', tagFilter: 'Movie' },
        { id: 'movies-cinema', title: 'Cinema Showcase', order: 3, style: 'landscape_text', tagFilter: 'Movie' },
        { id: 'movies-trending', title: 'Trending Movies', order: 4, style: 'default', tagFilter: 'Movie' },
      ];
    case 'LIVE':
      return [
        { id: 'live-broadcasts', title: 'Live Broadcasts', order: 1, style: 'seasonal_card', tagFilter: 'LIVE' },
        { id: 'live-streams', title: 'Trending Streams', order: 2, style: 'landscape_text', tagFilter: 'LIVE' },
        { id: 'live-channels', title: 'Featured Channels', order: 3, style: 'default', tagFilter: 'LIVE' },
      ];
    case 'Trending':
    default:
      return [
        { id: 'trending-now', title: 'Trending Now', order: 1, style: 'default', tagFilter: '' },
        { id: 'trending-networks', title: 'Networks & Studios', order: 2, style: 'network_grid', icon: 'Tv', tagFilter: '' },
        { id: 'trending-featured', title: 'Featured Highlights', order: 3, style: 'seasonal_card', tagFilter: '' },
        { id: 'trending-otherworld', title: 'Welcome to Otherworld', order: 4, style: 'landscape_text', tagFilter: '' },
        { id: 'trending-classic', title: 'Classic Hits', order: 5, style: 'classic_anime', tagFilter: '' },
      ];
  }
}
