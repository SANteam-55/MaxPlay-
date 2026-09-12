export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  gender?: 'Male' | 'Female' | 'Other';
  age?: number;
  bio?: string;
  idNumber?: string;
  isPremium?: boolean;
  points?: number;
  status?: 'active' | 'blocked' | 'suspended';
  isBlocked?: boolean;
  blockReason?: string;
  blockMessage?: string;
  blockedAt?: string;
  role?: 'user' | 'admin' | 'moderator';
  watchHours?: number;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface SeasonData {
  seasonNumber: number;
  seasonTitle: string;
  episodes: Episode[];
}

export interface ContentItem {
  id: string;
  title: string;
  type: 'movie' | 'tv' | 'anime' | 'short_tv' | 'series';
  description: string;
  posterUrl: string;
  backdropUrl: string;
  rating: number; // 0-10
  year: number;
  country: string;
  genres: string[];
  status?: 'ongoing' | 'completed' | string;
  isPremium?: boolean;
  mature?: boolean;
  duration?: number; // seconds
  seasons?: number;
  episodes?: number;
  seasonsData?: SeasonData[];
  episodesList?: Episode[];
  language?: string;
  languages?: string[];
  category?: string;
  screenCategory?: string;
  customImage?: string;
  customTitle?: string;
  trending?: boolean;
  homeRows?: string[];
  searchHotSection?: string;
  searchHotPosition?: number;
  featured?: boolean;
  isTop10?: boolean;
  top10Rank?: number;
  isUpcoming?: boolean;
  releaseDate?: string;
  views?: number | string;
  createdAt?: string;
  videoUrl?: string;
  qualityLinks?: Record<string, string>;
  availableLanguages?: string[];
  videoSources?: Record<string, Record<string, string>>;
  videoLinks?: any[]; // Array of splitted video links for movies
  skipMarkers?: {
    intro?: { start: number; end: number };
    outro?: { start: number; end: number };
    credits?: { start: number; end: number };
  };
  chunks?: {
    url: string;
    sizeMB: number;
    order: number;
    startTime: number;
    duration: number;
  }[];
  uploader?: {
    name: string;
    verified: boolean;
  };
}

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  duration: number; // seconds
  thumbnailUrl: string;
  videoUrl: string;
  qualityLinks?: Record<string, string>;
  videoSources?: Record<string, Record<string, string>>;
  videoLinks?: any[]; // Array of splitted video links for this episode
  skipMarkers?: {
    intro?: { start: number; end: number };
    outro?: { start: number; end: number };
    credits?: { start: number; end: number };
  };
  chunks?: {
    url: string;
    sizeMB: number;
    order: number;
    startTime: number;
    duration: number;
  }[];
}

export type EpisodeItem = Episode;

export interface CommentReplyItem {
  id: string;
  commentId?: string;
  contentId?: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  replyToUsername?: string;
  replyToUserId?: string;
  text: string;
  time: string;
  likes: number;
  likedBy?: string[];
  createdAt?: string;
}

export interface CommentItem {
  id: string;
  contentId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  text: string;
  time: string;
  likes: number;
  likedBy?: string[];
  replies?: CommentReplyItem[];
  createdAt?: string;
}

export interface NetworkItem {
  id: string;
  isNetwork?: boolean;
  name: string;
  logoUrl: string;
  bannerUrl?: string;
  description?: string;
  contentIds?: string[];
  movieIds?: string[];
  seriesIds?: string[];
  tagFilter?: string;
}

export interface HomeRowConfig {
  id: string;
  title: string;
  order: number;
  style?: 'default' | 'seasonal_card' | 'landscape_text' | 'classic_anime' | 'three_column' | 'three_column_grid' | 'network_grid';
  mode?: 'tag' | 'custom_pick' | string;
  icon?: string;
  tagFilter?: string; // If set, filters content by this genre/tag automatically
  defaultFilter?: string; // Default active category for three_column mode
  filterOptions?: string[]; // Custom category pills if defined
  contentIds?: any[];
}

export type HomeRowsByScreen = Record<string, HomeRowConfig[]>;

export interface HeroBannerItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  contentId?: string;
  tag?: string;
  order?: number;
  type?: string; // 'movie' | 'tv' | 'anime' | 'live' | 'short_tv'
}

export interface SearchConfig {
  everyoneSearching: string[];
  popularSearches: string[];
}

export interface UserSettings {
  darkMode: boolean;
  autoPlayNext: boolean;
  wifiOnlyDownloads: boolean;
  notificationsEnabled: boolean;
  subtitleLanguage: string;
  videoQuality: string;
  hardwareAcceleration: boolean;
}

export interface AttachedContentInfo {
  id: string;
  title: string;
  type?: string;
  posterUrl?: string;
  backdropUrl?: string;
  rating?: number | string;
  year?: number | string;
  quality?: string;
  genres?: string[];
  languages?: string[];
  episodeInfo?: string;
  actionLabel?: string;
}

export interface AdminSenderInfo {
  name: string;
  handle: string;
  avatar?: string;
  isVerified?: boolean;
  badge?: string;
  role?: string;
}

export interface AnnouncementMessage {
  id: string;
  title: string;
  body: string;
  type?: 'media_release' | 'episode_update' | 'notice' | 'promo' | 'general' | string;
  priority?: 'normal' | 'important' | 'urgent';
  sender?: AdminSenderInfo;
  attachedContent?: AttachedContentInfo;
  bannerUrl?: string;
  actionUrl?: string;
  date?: string;
  createdAt?: string;
  isUnread?: boolean;
}

export interface CommentReport {
  id: string;
  commentId: string;
  replyId?: string;
  commentText: string;
  commentAuthorId: string;
  commentAuthorName: string;
  commentAuthorAvatar?: string;
  contentId: string;
  contentTitle: string;
  contentPosterUrl?: string;
  contentType?: string;
  reportedByUserId: string;
  reportedByUserName: string;
  reportedByUserEmail?: string;
  category: 'hate_speech' | 'spam' | 'spoiler' | 'abusive' | 'misinformation' | 'other' | string;
  reasonText?: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface UserFeedback {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  userRole?: string;
  isVip?: boolean;
  category: string;
  categoryLabel: string;
  customTopic?: string;
  details: string;
  screenshots?: string[];
  appVersion?: string;
  deviceInfo?: string;
  browser?: string;
  os?: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  adminReply?: string;
  adminReplySubject?: string;
  adminReplyDate?: string;
  repliedBy?: string;
  createdAt: string;
  updatedAt?: string;
}


