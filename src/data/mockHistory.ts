export interface WatchHistoryItem {
  id: string;
  contentId: string;
  episodeId?: string;
  title: string;
  episodeCode?: string;
  posterUrl: string;
  durationSeconds: number;
  watchedSeconds: number;
  percentWatched: number;
  dateGroup: string; // "Today", "Jul.29", "Jul.04", "Jun.28"
  isSeries?: boolean;
}

export interface MyListItem {
  id: string;
  contentId: string;
  title: string;
  posterUrl: string;
  rating: number;
  year: number;
  type: 'movie' | 'tv';
  languageBadge?: string;
  genreTags: string[];
  addedDateGroup: string; // "May.31", "Apr.24"
}

export interface OfficialMessage {
  id: string;
  title: string;
  body: string;
  date: string;
  type: 'announcement' | 'like' | 'comment';
  isUnread?: boolean;
}

export const MOCK_WATCH_HISTORY: WatchHistoryItem[] = [
  {
    id: 'hist-1',
    contentId: 'jjk-s3',
    episodeId: 'ep-09',
    title: 'Jujutsu Kaisen [Hindi]',
    episodeCode: 'S03 E09',
    posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300&q=80',
    durationSeconds: 1419, // 23:39
    watchedSeconds: 638,
    percentWatched: 45,
    dateGroup: 'Today',
    isSeries: true,
  },
  {
    id: 'hist-2',
    contentId: 'mushoku-s2',
    episodeId: 'ep-24',
    title: 'Mushoku Tensei: Jobless Reincarnation [Hindi]',
    episodeCode: 'S02 E24',
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80',
    durationSeconds: 1420,
    watchedSeconds: 1420,
    percentWatched: 100,
    dateGroup: 'Today',
    isSeries: true,
  },
  {
    id: 'hist-3',
    contentId: 'family-man-s2',
    episodeId: 'ep-05',
    title: 'The Family Man [Hindi]',
    episodeCode: 'S02 E05',
    posterUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80',
    durationSeconds: 2700,
    watchedSeconds: 81,
    percentWatched: 3,
    dateGroup: 'Jul.29',
    isSeries: true,
  },
  {
    id: 'hist-4',
    contentId: 'pathaan',
    title: 'Pathaan (2023)',
    posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&q=80',
    durationSeconds: 8400,
    watchedSeconds: 8400,
    percentWatched: 100,
    dateGroup: 'Jul.04',
    isSeries: false,
  },
  {
    id: 'hist-5',
    contentId: 'solo-leveling',
    episodeId: 'ep-12',
    title: 'Solo Leveling [Hindi]',
    episodeCode: 'S01 E12',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80',
    durationSeconds: 1400,
    watchedSeconds: 1120,
    percentWatched: 80,
    dateGroup: 'Jun.28',
    isSeries: true,
  },
];

export const MOCK_MY_LIST: MyListItem[] = [
  {
    id: 'list-1',
    contentId: 'family-man-s2',
    title: 'The Family Man [Hindi]',
    posterUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80',
    rating: 8.7,
    year: 2021,
    type: 'tv',
    languageBadge: 'Hindi',
    genreTags: ['Action', 'Thriller'],
    addedDateGroup: 'May.31',
  },
  {
    id: 'list-2',
    contentId: 'mushoku-s2',
    title: 'Mushoku Tensei: Jobless Reincarnation',
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80',
    rating: 8.9,
    year: 2023,
    type: 'tv',
    languageBadge: 'Sub/Dub',
    genreTags: ['Isekai', 'Fantasy', 'Adventure'],
    addedDateGroup: 'May.31',
  },
  {
    id: 'list-3',
    contentId: 'pathaan',
    title: 'Pathaan (2023)',
    posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&q=80',
    rating: 7.2,
    year: 2023,
    type: 'movie',
    languageBadge: 'Hindi',
    genreTags: ['Action', 'Spy'],
    addedDateGroup: 'Apr.24',
  },
];

export const MOCK_OFFICIAL_MESSAGES: OfficialMessage[] = [
  {
    id: 'msg-1',
    title: 'MovieBox TV App is Available Now! 📺',
    body: 'Download the official MaxPlay Android TV app to watch your favorite anime and movies on the big screen with full 4K support.',
    date: '17/07',
    type: 'announcement',
    isUnread: true,
  },
  {
    id: 'msg-2',
    title: 'Bookmark Us, Never Get Lost 🔖',
    body: 'Make sure to add maxplay.app to your browser bookmarks or install our Web App PWA for uninterrupted streaming.',
    date: '10/07',
    type: 'announcement',
    isUnread: true,
  },
  {
    id: 'msg-3',
    title: 'Watch on PC with MaxPlay.app! 💻',
    body: 'Access your watch history, active downloads, and premium subscription seamlessly across all your desktop devices.',
    date: '27/10/2025',
    type: 'announcement',
    isUnread: false,
  },
];
