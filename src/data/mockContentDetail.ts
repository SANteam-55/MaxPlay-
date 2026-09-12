import { ContentItem, Episode, CommentItem } from '../types';

export interface ContentDetailItem extends ContentItem {
  episodesList?: Episode[];
  commentsList?: CommentItem[];
  languageVariants?: {
    id: string;
    language: string;
    isDefault?: boolean;
    audioUrl?: string;
  }[];
}

export const MOCK_SERIES_DETAIL: ContentDetailItem = {
  id: 'detail-jujutsu',
  title: 'Jujutsu Kaisen: Shibuya Incident Arc',
  type: 'tv',
  description: 'An unprecedented crisis hits Shibuya on Halloween as curses launch a full-scale assault. Yuji Itadori, Megumi Fushiguro, and Nobara Kugisaki alongside Satoru Gojo battle ancient evils in a high-octane confrontation that will rewrite the world of sorcery forever.',
  posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
  backdropUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&auto=format&fit=crop&q=80',
  rating: 9.4,
  year: 2023,
  country: 'Japan',
  genres: ['Action', 'Fantasy', 'Supernatural'],
  mature: false,
  seasons: 3,
  episodes: 24,
  language: 'Hindi Dub',
  uploader: {
    name: 'MaxPlay Official Anime Hub',
    verified: true,
  },
  languageVariants: [
    { id: 'lang-1', language: 'Hindi Dub', isDefault: true },
    { id: 'lang-2', language: 'Japanese (Sub)' },
    { id: 'lang-3', language: 'English Dub' },
    { id: 'lang-4', language: 'Tamil Dub' },
  ],
  episodesList: Array.from({ length: 12 }, (_, i) => ({
    id: `ep-${i + 1}`,
    episodeNumber: i + 1,
    title: `Episode ${i + 1}: ${
      [
        'Shibuya Incident',
        'Gate, Open',
        'Dull Knife',
        'Thunderclap',
        'Metamorphosis',
        'Red Scale',
        'Fluctuations',
        'Right and Wrong',
        'Pandora',
        'Shibuya Nightmare',
        'Curse Domain',
        'Final Execution'
      ][i]
    }`,
    duration: 1420, // 23 mins 40 secs
    thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    chunks: [
      {
        url: 'https://media.w3.org/2010/05/sintel/trailer.mp4#t=0,10',
        sizeMB: 42,
        order: 1,
        startTime: 0,
        duration: 300,
      },
      {
        url: 'https://media.w3.org/2010/05/sintel/trailer.mp4#t=10,20',
        sizeMB: 38,
        order: 2,
        startTime: 300,
        duration: 300,
      },
    ],
  })),
  commentsList: [
    {
      id: 'c-1',
      contentId: 'detail-jujutsu',
      userId: 'u-101',
      username: 'GojoFan2024',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      text: 'The animation quality in Shibuya Incident arc is on a completely different level! MAPPA cooked so hard 🔥',
      time: '2 hours ago',
      likes: 342,
      replies: [
        {
          id: 'c-1-1',
          contentId: 'detail-jujutsu',
          commentId: 'c-1',
          userId: 'u-102',
          username: 'AnimeGeek99',
          replyToUsername: 'GojoFan2024',
          avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
          text: 'Agreed! Episode 5 fight scene gave me chills whole time.',
          time: '1 hour ago',
          likes: 89,
        },
      ],
    },
    {
      id: 'c-2',
      contentId: 'detail-jujutsu',
      userId: 'u-103',
      username: 'Rahul_Streamer',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
      text: 'Hindi dub is surprisingly super clean and well acted. MaxPlay fast buffer is awesome too.',
      time: '4 hours ago',
      likes: 120,
    },
    {
      id: 'c-3',
      contentId: 'detail-jujutsu',
      userId: 'u-104',
      username: 'OtakuMaster',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      text: 'Sukuna vs Mahoraga scene literally broke the internet. Instant 10/10 masterpiece.',
      time: '1 day ago',
      likes: 512,
    },
    {
      id: 'c-4',
      contentId: 'detail-jujutsu',
      userId: 'u-105',
      username: 'CinemaLover',
      text: 'Can anyone recommend which episode continues right after season 2?',
      time: '2 days ago',
      likes: 18,
    },
  ],
};

export const MOCK_MOVIE_DETAIL: ContentDetailItem = {
  id: 'detail-dune',
  title: 'Dune: Part Two',
  type: 'movie',
  description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he endeavors to prevent a terrible future only he can foresee.',
  posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
  backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
  rating: 8.9,
  year: 2024,
  country: 'United States',
  genres: ['Sci-Fi', 'Adventure', 'Drama'],
  mature: false,
  duration: 9960, // 2h 46m
  language: 'English / Hindi',
  uploader: {
    name: 'Warner Bros Max Stream',
    verified: true,
  },
  languageVariants: [
    { id: 'm-lang-1', language: 'Hindi Dub', isDefault: true },
    { id: 'm-lang-2', language: 'English (Original)' },
    { id: 'm-lang-3', language: 'Telugu Dub' },
  ],
  episodesList: [
    {
      id: 'dune-movie-stream',
      episodeNumber: 1,
      title: 'Full Feature Movie (4K Ultra HD)',
      duration: 9960,
      thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80',
      videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    },
  ],
  commentsList: [
    {
      id: 'mc-1',
      contentId: 'detail-dune',
      userId: 'u-201',
      username: 'SciFi_Nerd',
      text: 'Denis Villeneuve is a visual genius. Hans Zimmer soundtrack blew my speakers off!',
      time: '3 hours ago',
      likes: 289,
    },
    {
      id: 'mc-2',
      contentId: 'detail-dune',
      userId: 'u-202',
      username: 'PoojaK',
      text: 'Watching this in 4K on MaxPlay player is peak experience.',
      time: '5 hours ago',
      likes: 95,
    },
  ],
};
