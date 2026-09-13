import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Plus, 
  Check, 
  Share2, 
  Star, 
  Tv, 
  Film, 
  MessageSquare, 
  Send, 
  X, 
  Info, 
  HelpCircle, 
  ChevronDown, 
  Sparkles,
  Layers,
  Flame,
  ArrowLeft,
  Download,
  Play,
  Volume2,
  Clock,
  Globe,
  Copy,
  MoreVertical,
  List,
  LayoutGrid,
  Cast,
  Flag,
  AlertTriangle,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { ContentItem, CommentItem, CommentReplyItem } from '../../types';
import { InlinePlayer } from '../../components/player/InlinePlayer';
import { useAuthContext } from '../../context/AuthContext';
import { 
  subscribeToMyList, 
  toggleMyListItem, 
  subscribeToComments, 
  addCommentToContent, 
  toggleCommentLike,
  addReplyToComment,
  toggleReplyLike,
  deleteCommentFromContent,
  deleteReplyFromComment,
  submitCommentReport,
  saveUserProgress,
  getUserProgress,
  subscribeToContent,
  SAMPLE_CONTENT_ITEMS 
} from '../../services/contentService';
import { CommentCard } from '../../components/common/CommentCard';
import { SoloLevelingSelectorModal } from '../../components/content/SoloLevelingSelectorModal';
import { NativeBanner } from '../../components/ads/NativeBanner';
import { adManager } from '../../services/adService';

interface ContentDetailScreenProps {
  content: ContentItem | null;
  onBack: () => void;
  onSelectContent?: (item: ContentItem) => void;
}

// 30 High-Quality Curated Recommendation Items (10 rows of 3 columns)
const CURATED_RECOMMENDATIONS: Partial<ContentItem>[] = [
  {
    id: 'demon-slayer-infinity-castle',
    title: 'A Place Where Only The Strong Stand',
    type: 'anime',
    rating: 9.8,
    year: 2024,
    country: 'Japan',
    genres: ['Action', 'Demons', 'Supernatural'],
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'Aniplex HD', verified: true }
  },
  {
    id: 'cyber-neon-resonance',
    title: 'Neon Resonance 2099',
    type: 'anime',
    rating: 9.3,
    year: 2024,
    country: 'Japan',
    genres: ['Sci-Fi', 'Cyberpunk', 'Action'],
    posterUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'Studio Trigger', verified: true }
  },
  {
    id: 'crimson-abyss-chronicles',
    title: 'Crimson Abyss: Eclipse',
    type: 'anime',
    rating: 9.5,
    year: 2023,
    country: 'Japan',
    genres: ['Dark Fantasy', 'Horror', 'Action'],
    posterUrl: 'https://images.unsplash.com/photo-1604011152285-3e284be572e4?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1604011152285-3e284be572e4?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'MAPPA Studio', verified: true }
  },
  {
    id: 'solo-leveling-shadow-monarch',
    title: 'Solo Leveling: Arise',
    type: 'anime',
    rating: 9.9,
    year: 2024,
    country: 'South Korea',
    genres: ['Action', 'Fantasy', 'Supernatural'],
    posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'A-1 Pictures', verified: true }
  },
  {
    id: 'jujutsu-kaisen-shibuya',
    title: 'Jujutsu Kaisen: Shibuya Arc',
    type: 'anime',
    rating: 9.8,
    year: 2023,
    country: 'Japan',
    genres: ['Action', 'Supernatural', 'Shounen'],
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'MAPPA', verified: true }
  },
  {
    id: 'chainsaw-man-devil-hunter',
    title: 'Chainsaw Man: Reze Arc',
    type: 'movie',
    rating: 9.6,
    year: 2025,
    country: 'Japan',
    genres: ['Action', 'Gore', 'Supernatural'],
    posterUrl: 'https://images.unsplash.com/photo-1541562232579-512a21360020?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1541562232579-512a21360020?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'MAPPA Films', verified: true }
  },
  {
    id: 'bleach-thousand-year-blood-war',
    title: 'Bleach: Thousand-Year Blood War',
    type: 'anime',
    rating: 9.7,
    year: 2024,
    country: 'Japan',
    genres: ['Action', 'Supernatural', 'Sword'],
    posterUrl: 'https://images.unsplash.com/photo-1580477651163-f222687c4767?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1580477651163-f222687c4767?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'Studio Pierrot', verified: true }
  },
  {
    id: 'attack-on-titan-final-season',
    title: 'Attack on Titan: The Final Chapters',
    type: 'anime',
    rating: 9.9,
    year: 2023,
    country: 'Japan',
    genres: ['Action', 'Mystery', 'Dark Fantasy'],
    posterUrl: 'https://images.unsplash.com/photo-1546143977-96a9ce8b4d8d?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1546143977-96a9ce8b4d8d?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'MAPPA', verified: true }
  },
  {
    id: 'one-piece-wano-climax',
    title: 'One Piece: Gear 5 Awakening',
    type: 'anime',
    rating: 9.9,
    year: 2024,
    country: 'Japan',
    genres: ['Action', 'Adventure', 'Pirates'],
    posterUrl: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'Toei Animation', verified: true }
  },
  {
    id: 'kaiju-no-8-defense-force',
    title: 'Kaiju No. 8',
    type: 'anime',
    rating: 9.1,
    year: 2024,
    country: 'Japan',
    genres: ['Action', 'Sci-Fi', 'Monsters'],
    posterUrl: 'https://images.unsplash.com/photo-1610403328249-14a51e60086c?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1610403328249-14a51e60086c?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'Production I.G', verified: true }
  },
  {
    id: 'wind-breaker-bofurin',
    title: 'WIND BREAKER',
    type: 'anime',
    rating: 8.9,
    year: 2024,
    country: 'Japan',
    genres: ['Action', 'Martial Arts', 'School'],
    posterUrl: 'https://images.unsplash.com/photo-1587588354456-ae376af71a25?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1587588354456-ae376af71a25?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'CloverWorks', verified: true }
  },
  {
    id: 'tokyo-ghoul-re-awakening',
    title: 'Tokyo Ghoul: Bloodline',
    type: 'anime',
    rating: 9.0,
    year: 2023,
    country: 'Japan',
    genres: ['Dark Fantasy', 'Horror', 'Action'],
    posterUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'Pierrot Plus', verified: true }
  },
  {
    id: 'frieren-beyond-journeys-end',
    title: 'Frieren: Beyond Journey\'s End',
    type: 'anime',
    rating: 9.9,
    year: 2024,
    country: 'Japan',
    genres: ['Fantasy', 'Adventure', 'Magic'],
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'Madhouse', verified: true }
  },
  {
    id: 'vinland-saga-valhalla',
    title: 'Vinland Saga: Season 2',
    type: 'anime',
    rating: 9.7,
    year: 2023,
    country: 'Japan',
    genres: ['Historical', 'Drama', 'Action'],
    posterUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'MAPPA', verified: true }
  },
  {
    id: 'hunter-x-hunter-dark-continent',
    title: 'Hunter x Hunter: Dark Continent',
    type: 'anime',
    rating: 9.8,
    year: 2024,
    country: 'Japan',
    genres: ['Adventure', 'Fantasy', 'Action'],
    posterUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'Madhouse', verified: true }
  },
  {
    id: 'death-note-omega',
    title: 'Death Note: Legacy',
    type: 'anime',
    rating: 9.4,
    year: 2023,
    country: 'Japan',
    genres: ['Psychological', 'Thriller', 'Mystery'],
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'Madhouse', verified: true }
  },
  {
    id: 'hells-paradise-jigokuraku',
    title: 'Hell\'s Paradise: Jigokuraku',
    type: 'anime',
    rating: 9.2,
    year: 2023,
    country: 'Japan',
    genres: ['Dark Fantasy', 'Ninja', 'Supernatural'],
    posterUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'MAPPA', verified: true }
  },
  {
    id: 'cyberpunk-edgerunners-night-city',
    title: 'Cyberpunk: Edgerunners',
    type: 'anime',
    rating: 9.7,
    year: 2023,
    country: 'Japan',
    genres: ['Sci-Fi', 'Cyberpunk', 'Gore'],
    posterUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'Trigger & CDPR', verified: true }
  },
  {
    id: 'demon-slayer-swordsmith-village',
    title: 'Demon Slayer: Swordsmith Village',
    type: 'anime',
    rating: 9.6,
    year: 2023,
    country: 'Japan',
    genres: ['Action', 'Demons', 'Historical'],
    posterUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'ufotable', verified: true }
  },
  {
    id: 'black-clover-sword-of-wizard-king',
    title: 'Black Clover: Sword of Wizard King',
    type: 'movie',
    rating: 9.3,
    year: 2023,
    country: 'Japan',
    genres: ['Magic', 'Action', 'Fantasy'],
    posterUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'Studio Pierrot', verified: true }
  },
  {
    id: 'dr-stone-new-world',
    title: 'Dr. STONE: New World',
    type: 'anime',
    rating: 9.1,
    year: 2024,
    country: 'Japan',
    genres: ['Adventure', 'Sci-Fi', 'Comedy'],
    posterUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'TMS Entertainment', verified: true }
  },
  {
    id: 'blue-lock-neo-egoist',
    title: 'BLUE LOCK: Episode Nagi',
    type: 'movie',
    rating: 9.2,
    year: 2024,
    country: 'Japan',
    genres: ['Sports', 'Shounen', 'Thriller'],
    posterUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: '8bit Studio', verified: true }
  },
  {
    id: 'mashle-magic-and-muscles',
    title: 'MASHLE: Divine Visionary Arc',
    type: 'anime',
    rating: 9.0,
    year: 2024,
    country: 'Japan',
    genres: ['Comedy', 'Action', 'Magic'],
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'A-1 Pictures', verified: true }
  },
  {
    id: 'haikyuu-battle-at-the-garbage-dump',
    title: 'Haikyu!! Dumpster Battle',
    type: 'movie',
    rating: 9.6,
    year: 2024,
    country: 'Japan',
    genres: ['Sports', 'Drama', 'School'],
    posterUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'Production I.G', verified: true }
  },
  {
    id: 'spy-x-family-code-white',
    title: 'SPY x FAMILY: Code White',
    type: 'movie',
    rating: 9.1,
    year: 2024,
    country: 'Japan',
    genres: ['Action', 'Comedy', 'Spy'],
    posterUrl: 'https://images.unsplash.com/photo-1579783901586-d88db74b4fe4?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1579783901586-d88db74b4fe4?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'WIT Studio & CloverWorks', verified: true }
  },
  {
    id: 'mushoku-tensei-jobless-reincarnation',
    title: 'Mushoku Tensei: Season 2',
    type: 'anime',
    rating: 9.5,
    year: 2024,
    country: 'Japan',
    genres: ['Isekai', 'Fantasy', 'Magic', 'Adventure'],
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'Studio Bind', verified: true }
  },
  {
    id: 'overlord-sacred-kingdom-movie',
    title: 'Overlord: The Sacred Kingdom',
    type: 'movie',
    rating: 9.3,
    year: 2024,
    country: 'Japan',
    genres: ['Dark Fantasy', 'Isekai', 'Action'],
    posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'Madhouse', verified: true }
  },
  {
    id: 'shangri-la-frontier',
    title: 'Shangri-La Frontier',
    type: 'anime',
    rating: 9.0,
    year: 2024,
    country: 'Japan',
    genres: ['Gaming', 'Action', 'Fantasy'],
    posterUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'C2C Studio', verified: true }
  },
  {
    id: 'danmachi-season-5',
    title: 'Is It Wrong to Pick Up Girls in a Dungeon? V',
    type: 'anime',
    rating: 9.2,
    year: 2024,
    country: 'Japan',
    genres: ['Fantasy', 'Action', 'Dungeon'],
    posterUrl: 'https://images.unsplash.com/photo-1604011152285-3e284be572e4?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1604011152285-3e284be572e4?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'J.C.Staff', verified: true }
  },
  {
    id: 're-zero-season-3',
    title: 'Re:Zero - Starting Life in Another World 3',
    type: 'anime',
    rating: 9.6,
    year: 2024,
    country: 'Japan',
    genres: ['Psychological', 'Isekai', 'Dark Fantasy'],
    posterUrl: 'https://images.unsplash.com/photo-1541562232579-512a21360020?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1541562232579-512a21360020?w=1200&auto=format&fit=crop&q=80',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    uploader: { name: 'White Fox', verified: true }
  }
];

export const ContentDetailScreen: React.FC<ContentDetailScreenProps> = ({ 
  content, 
  onBack, 
  onSelectContent, 
  onStartDownload 
}) => {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState<'forYou' | 'comments'>('forYou');
  
  // Content type evaluation - Precise Movie vs Series / Anime
  const isMovie = useMemo(() => {
    if (!content) return false;
    if (content.type === 'movie' || content.type === 'film' || content.uploadMode === 'movie') return true;
    const seasons = content.seasonsData;
    const hasEpisodesInSeasons = Array.isArray(seasons) && seasons.some(s => Array.isArray(s?.episodes) && s.episodes.length > 0);
    const hasEpisodesList = Array.isArray(content.episodesList) && content.episodesList.length > 0;
    if (!hasEpisodesInSeasons && !hasEpisodesList && (Boolean(content.videoUrl) || (Array.isArray(content.videoLinks) && content.videoLinks.length > 0))) {
      return true;
    }
    return false;
  }, [content]);

  const isAnime = !isMovie && (content?.type === 'anime');
  const isSeries = !isMovie;

  // Synchronously resolve saved state so the FIRST render already has the restored episode, part, language, quality, and time
  const initialSavedData = useMemo(() => {
    if (!content?.id) return null;
    try {
      const userKey = user?.uid ? `maxplay_progress_${user.uid}_${content.id}` : null;
      const globalKey = `maxplay_progress_${content.id}`;
      const raw = (userKey && localStorage.getItem(userKey)) || localStorage.getItem(globalKey);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Initial storage load error:', e);
    }
    return null;
  }, [content?.id, user?.uid]);

  // Multi-part, Episode, and Season State
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(() => (initialSavedData?.seasonIndex !== undefined && !isMovie) ? initialSavedData.seasonIndex : 0);
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState(() => (initialSavedData?.episodeIndex !== undefined && !isMovie) ? initialSavedData.episodeIndex : 0);
  const [selectedPartIndex, setSelectedPartIndex] = useState(() => (initialSavedData?.partIndex !== undefined) ? initialSavedData.partIndex : 0);
  
  const [isMyList, setIsMyList] = useState(false);
  
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  // Independent playback, language, and quality state
  const [playbackPosition, setPlaybackPosition] = useState(() => initialSavedData?.currentTime || initialSavedData?.watchedSeconds || 0);
  const [activeLanguage, setActiveLanguage] = useState<string>(() => initialSavedData?.activeLanguage || '');
  const [activeQuality, setActiveQuality] = useState<string>(() => initialSavedData?.activeQuality || 'auto');
  const [partProgressMap, setPartProgressMap] = useState<Record<string, { time: number; duration?: number; language?: string; quality?: string }>>(() => initialSavedData?.partProgressMap || {});
  
  const [episodeViewMode, setEpisodeViewMode] = useState<'list' | 'grid'>('list');
  const [isAutoNextEnabled, setIsAutoNextEnabled] = useState<boolean>(true);
  const [showDetails, setShowDetails] = useState(false);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [catalogItems, setCatalogItems] = useState<ContentItem[]>([]);

  // Report Modal States
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingTarget, setReportingTarget] = useState<{ comment: CommentItem; reply?: CommentReplyItem } | null>(null);
  const [reportCategory, setReportCategory] = useState<string>('spoiler');
  const [reportReasonDetails, setReportReasonDetails] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  
  const commentsSectionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastSaveTimeRef = useRef<number>(0);

  // Unique identifier for the active part to guarantee zero timestamp bleed
  const currentPartKey = useMemo(() => {
    if (isMovie) {
      return `movie_p${selectedPartIndex}`;
    }
    return `s${selectedSeasonIndex}_e${selectedEpisodeIndex}_p${selectedPartIndex}`;
  }, [isMovie, selectedSeasonIndex, selectedEpisodeIndex, selectedPartIndex]);

  // Real-time synchronization refs to guarantee zero-stale closure during rapid pause / close / navigation
  const stateRefs = useRef({
    content,
    user,
    selectedSeasonIndex,
    selectedEpisodeIndex,
    selectedPartIndex,
    currentPartKey,
    activeLanguage,
    activeQuality,
    playbackPosition,
    partProgressMap,
    isMovie
  });

  useEffect(() => {
    stateRefs.current = {
      content,
      user,
      selectedSeasonIndex,
      selectedEpisodeIndex,
      selectedPartIndex,
      currentPartKey,
      activeLanguage,
      activeQuality,
      playbackPosition,
      partProgressMap,
      isMovie
    };
  }, [
    content,
    user,
    selectedSeasonIndex,
    selectedEpisodeIndex,
    selectedPartIndex,
    currentPartKey,
    activeLanguage,
    activeQuality,
    playbackPosition,
    partProgressMap,
    isMovie
  ]);

  // Core Save Progress Engine (Supports 5-sec sync, instant on-pause, and exit flush)
  const saveProgressNow = (time?: number, isFinished?: boolean, forceSave?: boolean, streamDuration?: number) => {
    const curState = stateRefs.current;
    if (!curState.content) return;

    let actualTime = isFinished ? 0 : (typeof time === 'number' ? time : curState.playbackPosition);
    
    // Ignore invalid early zero/low pulses unless explicitly finished or forced
    if (actualTime < 2 && !isFinished && curState.playbackPosition > 5 && !forceSave) {
      return;
    }

    // Dynamic duration resolution: stream duration > existing part duration > content duration
    const currentPart = curState.partProgressMap[curState.currentPartKey];
    const resolvedDuration = (streamDuration && streamDuration > 0)
      ? streamDuration 
      : (currentPart?.duration && currentPart.duration > 0 ? currentPart.duration : (curState.content.duration || 0));

    const updatedPartMap = {
      ...curState.partProgressMap,
      [curState.currentPartKey]: {
        time: actualTime,
        duration: resolvedDuration,
        language: curState.activeLanguage,
        quality: curState.activeQuality,
        updatedAt: Date.now()
      }
    };

    setPartProgressMap(updatedPartMap);
    setPlaybackPosition(actualTime);

    const now = Date.now();
    const shouldSyncCloud = forceSave || isFinished || (now - lastSaveTimeRef.current >= 5000);

    const curPartOffset = curState.selectedPartIndex < partOffsets.length ? (partOffsets[curState.selectedPartIndex] || 0) : 0;
    const globalCurTime = curPartOffset + actualTime;
    const globalDur = (totalEpisodeDuration && totalEpisodeDuration > 0) ? totalEpisodeDuration : resolvedDuration;
    const calcPercent = globalDur > 0 ? Math.min(100, Math.round((globalCurTime / globalDur) * 100)) : (resolvedDuration > 0 ? Math.min(100, Math.round((actualTime / resolvedDuration) * 100)) : 0);

    const progressPayload = {
      contentId: curState.content.id,
      title: curState.content.title,
      thumbnailUrl: curState.content.posterUrl || curState.content.backdropUrl || '',
      type: curState.isMovie ? 'movie' : (curState.content.type || 'anime'),
      seasonIndex: curState.selectedSeasonIndex,
      episodeIndex: curState.selectedEpisodeIndex,
      partIndex: curState.selectedPartIndex,
      activeLanguage: curState.activeLanguage,
      activeQuality: curState.activeQuality,
      currentTime: actualTime,
      watchedSeconds: actualTime,
      globalCurrentTime: globalCurTime,
      globalDuration: globalDur,
      duration: resolvedDuration,
      percentWatched: calcPercent,
      currentEpisode: curState.selectedEpisodeIndex + 1,
      totalEpisodes: curState.content.seasonsData?.[curState.selectedSeasonIndex]?.episodes?.length || curState.content.episodesList?.length || 1,
      partKey: curState.currentPartKey,
      partProgressMap: updatedPartMap,
      lastWatchedAt: new Date().toISOString()
    };

    // 1. Save to User-Isolated LocalStorage & Global Fallback
    try {
      if (curState.user?.uid) {
        localStorage.setItem(`maxplay_progress_${curState.user.uid}_${curState.content.id}`, JSON.stringify(progressPayload));
      }
      localStorage.setItem(`maxplay_progress_${curState.content.id}`, JSON.stringify(progressPayload));
    } catch (e) {
      console.warn('Local save progress error:', e);
    }

    // 2. Sync to Firebase Firestore (Every 5 seconds or Instant on Pause / Exit)
    if (shouldSyncCloud) {
      lastSaveTimeRef.current = now;
      if (curState.user?.uid) {
        saveUserProgress(curState.user.uid, curState.content.id, progressPayload).catch(console.warn);
      }
    }
  };

  // Robust Resume Restore on Load (User-Scoped localStorage + Firestore)
  useEffect(() => {
    if (!content?.id) return;

    // Fetch latest from Firestore for current User Account
    if (user?.uid) {
      getUserProgress(user.uid, content.id).then((cloud) => {
        if (cloud) {
          if (cloud.partProgressMap && typeof cloud.partProgressMap === 'object') {
            setPartProgressMap(prev => ({ ...prev, ...cloud.partProgressMap }));
          }
          if (cloud.lastWatchedAt) {
            if (cloud.seasonIndex !== undefined && !isMovie) setSelectedSeasonIndex(cloud.seasonIndex);
            if (cloud.episodeIndex !== undefined && !isMovie) setSelectedEpisodeIndex(cloud.episodeIndex);
            if (cloud.partIndex !== undefined) setSelectedPartIndex(cloud.partIndex);
            if (cloud.activeLanguage) setActiveLanguage(cloud.activeLanguage);
            if (cloud.activeQuality) setActiveQuality(cloud.activeQuality);
            const savedTime = cloud.currentTime || cloud.watchedSeconds || 0;
            if (savedTime > 0) {
              setPlaybackPosition(savedTime);
            }
          }
        }
      }).catch(console.warn);
    }

    // Attach window unload & visibility listeners for immediate save on tab/browser close
    const handleExitSave = () => {
      saveProgressNow(stateRefs.current.playbackPosition, false, true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveProgressNow(stateRefs.current.playbackPosition, false, true);
      }
    };

    window.addEventListener('beforeunload', handleExitSave);
    window.addEventListener('pagehide', handleExitSave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Flush save on unmount
      handleExitSave();
      window.removeEventListener('beforeunload', handleExitSave);
      window.removeEventListener('pagehide', handleExitSave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [content?.id, user?.uid, isMovie]);

  // Subscribe to all content to enrich recommendations
  useEffect(() => {
    const unsub = subscribeToContent((items) => {
      if (items && Array.isArray(items)) {
        setCatalogItems(items);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to My List
  useEffect(() => {
    if (!user || !content) return;
    const unsubscribe = subscribeToMyList(user.uid, (items) => {
      const match = items.includes(content.id);
      setIsMyList(match);
    });
    return () => unsubscribe();
  }, [user, content]);

  // Subscribe to Comments
  useEffect(() => {
    if (!content) return;
    const unsubscribe = subscribeToComments(content.id, (fetchedComments) => {
      setComments(fetchedComments);
    });
    return () => unsubscribe();
  }, [content]);

  if (!content) return null;

  // --- Derive Active Playback Data from Backend Schema ---
  let playerTitle = content.title;
  let playerVideoUrl = content.videoUrl || '';
  let playerQualityLinks: Record<string, string> = content.qualityLinks || {};
  let playerVideoSources: Record<string, any> = content.videoSources || {};
  let playerChunks = content.chunks;
  let hasNext = false;

  // 1. SERIES / ANIME MODE DATA RESOLUTION
  let activeSeasonEpisodes: any[] = [];
  let totalEpisodes = 0;
  let currentEpisodePartsCount = 1;

  if (isSeries && !isMovie) {
    const seasonsList = (content.seasonsData && content.seasonsData.length > 0) 
      ? content.seasonsData 
      : [{ seasonNumber: 1, seasonTitle: "Season 1", episodes: content.episodesList || [] }];

    const currentSeason = seasonsList[selectedSeasonIndex] || seasonsList[0];
    activeSeasonEpisodes = currentSeason?.episodes || [];
    totalEpisodes = activeSeasonEpisodes.length;

    const currentEp = activeSeasonEpisodes[selectedEpisodeIndex] || activeSeasonEpisodes[0];

    if (currentEp) {
      const epExtraParts = Array.isArray(currentEp.videoLinks) ? currentEp.videoLinks : [];
      currentEpisodePartsCount = 1 + epExtraParts.length;

      playerTitle = `${content.title} - ${currentSeason.seasonTitle || currentSeason.title || `Season ${selectedSeasonIndex + 1}`} : ${currentEp.title || `Episode ${selectedEpisodeIndex + 1}`}`;

      if (selectedPartIndex === 0) {
        // Part 1 (Main)
        if (currentEp.videoSources && typeof currentEp.videoSources === 'object' && Object.keys(currentEp.videoSources).length > 0) {
          playerVideoSources = currentEp.videoSources;
          const targetLang = (activeLanguage && currentEp.videoSources[activeLanguage]) ? activeLanguage : Object.keys(currentEp.videoSources)[0];
          if (targetLang && currentEp.videoSources[targetLang]) {
            playerQualityLinks = currentEp.videoSources[targetLang];
            playerVideoUrl = (activeQuality && activeQuality !== 'auto' && playerQualityLinks[activeQuality])
              ? playerQualityLinks[activeQuality]
              : (playerQualityLinks['1080p'] || playerQualityLinks['720p'] || playerQualityLinks['480p'] || playerQualityLinks['360p'] || Object.values(playerQualityLinks)[0] || '');
          }
        } else if (content.videoSources && Object.keys(content.videoSources).length > 0) {
          playerVideoSources = content.videoSources;
          const targetLang = (activeLanguage && content.videoSources[activeLanguage]) ? activeLanguage : Object.keys(content.videoSources)[0];
          if (targetLang && content.videoSources[targetLang]) {
            playerQualityLinks = content.videoSources[targetLang];
            playerVideoUrl = (activeQuality && activeQuality !== 'auto' && playerQualityLinks[activeQuality])
              ? playerQualityLinks[activeQuality]
              : (playerQualityLinks['1080p'] || playerQualityLinks['720p'] || playerQualityLinks['480p'] || playerQualityLinks['360p'] || Object.values(playerQualityLinks)[0] || '');
          }
        } else {
          if (currentEp.qualityLinks && typeof currentEp.qualityLinks === 'object') {
            playerQualityLinks = currentEp.qualityLinks;
          }
          playerVideoUrl = (activeQuality && activeQuality !== 'auto' && playerQualityLinks[activeQuality])
            ? playerQualityLinks[activeQuality]
            : (currentEp.videoUrl || (playerQualityLinks ? (playerQualityLinks['1080p'] || playerQualityLinks['720p'] || playerQualityLinks['480p'] || playerQualityLinks['360p'] || Object.values(playerQualityLinks)[0] || '') : ''));
        }
        if (currentEp.chunks) playerChunks = currentEp.chunks;
      } else if (selectedPartIndex > 0 && epExtraParts[selectedPartIndex - 1]) {
        // Extra Part (Part 2, Part 3...) - Fully independent quality and language system!
        const extraPartObj = epExtraParts[selectedPartIndex - 1];
        playerTitle = `${playerTitle} (Part ${selectedPartIndex + 1})`;

        if (typeof extraPartObj === 'object' && extraPartObj.videoSources && Object.keys(extraPartObj.videoSources).length > 0) {
          playerVideoSources = extraPartObj.videoSources;
          const targetLang = (activeLanguage && extraPartObj.videoSources[activeLanguage]) ? activeLanguage : Object.keys(extraPartObj.videoSources)[0];
          if (targetLang && extraPartObj.videoSources[targetLang]) {
            playerQualityLinks = extraPartObj.videoSources[targetLang];
            playerVideoUrl = (activeQuality && activeQuality !== 'auto' && playerQualityLinks[activeQuality])
              ? playerQualityLinks[activeQuality]
              : (playerQualityLinks['1080p'] || playerQualityLinks['720p'] || playerQualityLinks['480p'] || playerQualityLinks['360p'] || Object.values(playerQualityLinks)[0] || '');
          }
        } else if (typeof extraPartObj === 'object' && extraPartObj.qualityLinks && Object.keys(extraPartObj.qualityLinks).length > 0) {
          playerQualityLinks = extraPartObj.qualityLinks;
          playerVideoUrl = (activeQuality && activeQuality !== 'auto' && playerQualityLinks[activeQuality])
            ? playerQualityLinks[activeQuality]
            : (extraPartObj.videoUrl || (playerQualityLinks['1080p'] || playerQualityLinks['720p'] || playerQualityLinks['480p'] || playerQualityLinks['360p'] || Object.values(playerQualityLinks)[0] || ''));
          playerVideoSources = {};
        } else if (typeof extraPartObj === 'object' && extraPartObj.videoUrl) {
          playerVideoUrl = extraPartObj.videoUrl;
          playerVideoSources = {};
          playerQualityLinks = {};
        } else if (typeof extraPartObj === 'string') {
          playerVideoUrl = extraPartObj;
          playerVideoSources = {};
          playerQualityLinks = {};
        }
      }

      // Next Episode / Next Part detection
      if (selectedPartIndex + 1 < currentEpisodePartsCount) {
        hasNext = true;
      } else if (activeSeasonEpisodes.length > selectedEpisodeIndex + 1) {
        hasNext = true;
      } else if (seasonsList.length > selectedSeasonIndex + 1 && seasonsList[selectedSeasonIndex + 1]?.episodes?.length > 0) {
        hasNext = true;
      }
    }
  }

  // 2. MOVIE MODE DATA RESOLUTION
  let moviePartsList: any[] = [];
  let movieTotalParts = 1;

  if (isMovie) {
    if (content.videoLinks && Array.isArray(content.videoLinks) && content.videoLinks.length > 0) {
      moviePartsList = content.videoLinks;
      movieTotalParts = moviePartsList.length;
    } else {
      moviePartsList = [{ videoSources: content.videoSources, qualityLinks: content.qualityLinks, videoUrl: content.videoUrl }];
      movieTotalParts = 1;
    }

    const activeMoviePart = moviePartsList[selectedPartIndex] || moviePartsList[0];
    playerTitle = selectedPartIndex > 0 ? `${content.title} (Part ${selectedPartIndex + 1})` : content.title;

    if (activeMoviePart) {
      if (typeof activeMoviePart === 'object' && activeMoviePart.videoSources && Object.keys(activeMoviePart.videoSources).length > 0) {
        playerVideoSources = activeMoviePart.videoSources;
        const targetLang = (activeLanguage && activeMoviePart.videoSources[activeLanguage]) ? activeLanguage : Object.keys(activeMoviePart.videoSources)[0];
        if (targetLang && activeMoviePart.videoSources[targetLang]) {
          playerQualityLinks = activeMoviePart.videoSources[targetLang];
          playerVideoUrl = (activeQuality && activeQuality !== 'auto' && playerQualityLinks[activeQuality])
            ? playerQualityLinks[activeQuality]
            : (playerQualityLinks['1080p'] || playerQualityLinks['720p'] || playerQualityLinks['480p'] || playerQualityLinks['360p'] || Object.values(playerQualityLinks)[0] || '');
        }
      } else if (typeof activeMoviePart === 'object' && activeMoviePart.qualityLinks && Object.keys(activeMoviePart.qualityLinks).length > 0) {
        playerQualityLinks = activeMoviePart.qualityLinks;
        playerVideoUrl = (activeQuality && activeQuality !== 'auto' && playerQualityLinks[activeQuality])
          ? playerQualityLinks[activeQuality]
          : (activeMoviePart.videoUrl || (playerQualityLinks['1080p'] || playerQualityLinks['720p'] || playerQualityLinks['480p'] || playerQualityLinks['360p'] || Object.values(playerQualityLinks)[0] || ''));
        playerVideoSources = {};
      } else if (typeof activeMoviePart === 'string') {
        playerVideoUrl = activeMoviePart;
        playerVideoSources = {};
        playerQualityLinks = {};
      } else if (content.videoSources && Object.keys(content.videoSources).length > 0) {
        playerVideoSources = content.videoSources;
        const targetLang = (activeLanguage && content.videoSources[activeLanguage]) ? activeLanguage : Object.keys(content.videoSources)[0];
        if (targetLang && content.videoSources[targetLang]) {
          playerQualityLinks = content.videoSources[targetLang];
          playerVideoUrl = (activeQuality && activeQuality !== 'auto' && playerQualityLinks[activeQuality])
            ? playerQualityLinks[activeQuality]
            : (playerQualityLinks['1080p'] || playerQualityLinks['720p'] || playerQualityLinks['480p'] || playerQualityLinks['360p'] || Object.values(playerQualityLinks)[0] || '');
        }
      } else {
        playerQualityLinks = content.qualityLinks || {};
        playerVideoUrl = (activeQuality && activeQuality !== 'auto' && playerQualityLinks[activeQuality])
          ? playerQualityLinks[activeQuality]
          : (content.videoUrl || (playerQualityLinks['1080p'] || playerQualityLinks['720p'] || playerQualityLinks['480p'] || playerQualityLinks['360p'] || Object.values(playerQualityLinks)[0] || ''));
      }
    }

    if (selectedPartIndex + 1 < movieTotalParts) {
      hasNext = true;
    }
  }

  // Derive available languages dynamically for the current part
  const availableLanguages = useMemo(() => {
    if (playerVideoSources && typeof playerVideoSources === 'object' && Object.keys(playerVideoSources).length > 0) {
      return Object.keys(playerVideoSources);
    }
    if (content.availableLanguages && content.availableLanguages.length > 0) {
      return content.availableLanguages;
    }
    if (content.languages && content.languages.length > 0) {
      return content.languages;
    }
    return ['Hindi'];
  }, [playerVideoSources, content.availableLanguages, content.languages]);

  // Resolve all parts for the current media (episode or movie)
  const allCurrentParts = useMemo(() => {
    if (isSeries && !isMovie) {
      const seasonsList = (content.seasonsData && content.seasonsData.length > 0)
        ? content.seasonsData
        : [{ seasonNumber: 1, seasonTitle: "Season 1", episodes: content.episodesList || [] }];
      const currentSeason = seasonsList[selectedSeasonIndex] || seasonsList[0];
      const currentEp = (currentSeason?.episodes && currentSeason.episodes[selectedEpisodeIndex]) || (content.episodesList && content.episodesList[selectedEpisodeIndex]);
      if (currentEp) {
        const extraParts = Array.isArray(currentEp.videoLinks) ? currentEp.videoLinks : [];
        return [currentEp, ...extraParts];
      }
    } else if (isMovie) {
      if (content.videoLinks && Array.isArray(content.videoLinks) && content.videoLinks.length > 0) {
        return content.videoLinks;
      }
      return [{ videoSources: content.videoSources, qualityLinks: content.qualityLinks, videoUrl: content.videoUrl, duration: content.duration }];
    }
    return [];
  }, [content, isSeries, isMovie, selectedSeasonIndex, selectedEpisodeIndex]);

  // Compute cumulative timeline offsets and global duration across all parts
  const { partOffsets, totalEpisodeDuration } = useMemo(() => {
    const offsets: number[] = [];
    let running = 0;
    for (let i = 0; i < allCurrentParts.length; i++) {
      offsets.push(running);
      const pKey = isMovie ? `movie_p${i}` : `s${selectedSeasonIndex}_e${selectedEpisodeIndex}_p${i}`;
      const savedDuration = partProgressMap[pKey]?.duration || allCurrentParts[i]?.duration || (allCurrentParts.length === 1 ? content.duration : 0) || 0;
      running += savedDuration;
    }
    return {
      partOffsets: offsets,
      totalEpisodeDuration: running > 0 ? running : undefined
    };
  }, [allCurrentParts, isMovie, selectedSeasonIndex, selectedEpisodeIndex, partProgressMap, content.duration]);

  const activePartOffset = partOffsets[selectedPartIndex] || 0;

  const handleDurationUpdate = useCallback((dur: number) => {
    if (dur > 0) {
      const curState = stateRefs.current;
      const currentPart = curState.partProgressMap[curState.currentPartKey];
      if (!currentPart?.duration || Math.abs(currentPart.duration - dur) > 1) {
        setPartProgressMap(prev => ({
          ...prev,
          [curState.currentPartKey]: {
            ...(prev[curState.currentPartKey] || {
              time: curState.playbackPosition,
              language: curState.activeLanguage,
              quality: curState.activeQuality,
              updatedAt: Date.now()
            }),
            duration: dur
          }
        }));
      }
    }
  }, []);

  const handleGlobalSeek = useCallback((targetGlobalTime: number) => {
    const boundedGlobal = Math.max(0, targetGlobalTime);

    if (allCurrentParts.length <= 1) {
      setPlaybackPosition(boundedGlobal);
      saveProgressNow(boundedGlobal, false, false);
      return;
    }

    let targetIdx = 0;
    for (let i = allCurrentParts.length - 1; i >= 0; i--) {
      if (boundedGlobal >= (partOffsets[i] || 0)) {
        targetIdx = i;
        break;
      }
    }

    const localTime = Math.max(0, boundedGlobal - (partOffsets[targetIdx] || 0));

    if (targetIdx === selectedPartIndex) {
      setPlaybackPosition(localTime);
      saveProgressNow(localTime, false, false);
    } else {
      // Cross-part switch (e.g. -10s rewind from Part 2 into Part 1, or +10s forward from Part 1 into Part 2)
      const newPartKey = isMovie ? `movie_p${targetIdx}` : `s${selectedSeasonIndex}_e${selectedEpisodeIndex}_p${targetIdx}`;
      const saved = partProgressMap[newPartKey];
      
      setSelectedPartIndex(targetIdx);
      setPlaybackPosition(localTime);
      
      // Carry over current preferences instead of reverting to part's old saved preferences
      if (saved?.language && !activeLanguage) setActiveLanguage(saved.language);
      if (saved?.quality && !activeQuality) setActiveQuality(saved.quality);

      const curState = stateRefs.current;
      const targetDuration = curState.partProgressMap[newPartKey]?.duration || allCurrentParts[targetIdx]?.duration || 0;
      const updatedPartMap = {
        ...curState.partProgressMap,
        [newPartKey]: {
          ...(curState.partProgressMap[newPartKey] || {}),
          time: localTime,
          duration: targetDuration,
          language: saved?.language || curState.activeLanguage,
          quality: saved?.quality || curState.activeQuality,
          updatedAt: Date.now()
        }
      };

      setPartProgressMap(updatedPartMap);

      const progressPayload = {
        contentId: curState.content.id,
        title: curState.content.title,
        thumbnailUrl: curState.content.posterUrl || curState.content.backdropUrl || '',
        type: curState.isMovie ? 'movie' : (curState.content.type || 'anime'),
        seasonIndex: curState.selectedSeasonIndex,
        episodeIndex: curState.selectedEpisodeIndex,
        partIndex: targetIdx,
        activeLanguage: saved?.language || curState.activeLanguage,
        activeQuality: saved?.quality || curState.activeQuality,
        currentTime: localTime,
        watchedSeconds: localTime,
        duration: targetDuration,
        percentWatched: targetDuration > 0 ? Math.min(100, Math.round((localTime / targetDuration) * 100)) : 0,
        currentEpisode: curState.selectedEpisodeIndex + 1,
        totalEpisodes: curState.content.seasonsData?.[curState.selectedSeasonIndex]?.episodes?.length || curState.content.episodesList?.length || 1,
        partKey: newPartKey,
        partProgressMap: updatedPartMap,
        lastWatchedAt: new Date().toISOString()
      };

      try {
        if (curState.user?.uid) {
          localStorage.setItem(`maxplay_progress_${curState.user.uid}_${curState.content.id}`, JSON.stringify(progressPayload));
          saveUserProgress(curState.user.uid, curState.content.id, progressPayload).catch(console.warn);
        }
        localStorage.setItem(`maxplay_progress_${curState.content.id}`, JSON.stringify(progressPayload));
      } catch (e) {
        console.warn('Seek save error:', e);
      }
    }
  }, [allCurrentParts, isMovie, selectedSeasonIndex, selectedEpisodeIndex, partOffsets, selectedPartIndex, partProgressMap]);

  // Auto-sync activeLanguage when switching parts/episodes if current activeLanguage is not available in new part
  useEffect(() => {
    if (availableLanguages.length > 0 && (!activeLanguage || !availableLanguages.includes(activeLanguage))) {
      setActiveLanguage(availableLanguages[0]);
    }
  }, [availableLanguages, activeLanguage]);

  // Derive season options for Solo Leveling System selector
  const seasonOptions = useMemo(() => {
    if (content.seasonsData && content.seasonsData.length > 0) {
      return content.seasonsData.map((s, idx) => ({
        index: idx,
        title: s.seasonTitle || s.title || `Season ${idx + 1}`,
        episodesCount: s.episodes?.length || 0,
      }));
    }
    return [{
      index: 0,
      title: 'Season 1',
      episodesCount: content.episodesList?.length || 1,
    }];
  }, [content.seasonsData, content.episodesList]);

  // Merge Firestore items with 30 curated recommendation items to guarantee 10 rows (3 items per row = 30 cards)
  const recommendationGrid = useMemo(() => {
    const combined: ContentItem[] = [];
    const seenIds = new Set<string>();
    
    // 1. Add other catalog items (excluding current content)
    for (const item of catalogItems) {
      if (item.id !== content.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        combined.push(item);
      }
    }

    // 2. Add curated items to fill up to 30 cards (10 rows of 3)
    for (const curated of CURATED_RECOMMENDATIONS) {
      if (!seenIds.has(curated.id!)) {
        seenIds.add(curated.id!);
        combined.push({
          id: curated.id!,
          title: curated.title || 'Featured Title',
          type: curated.type || (isMovie ? 'movie' : 'anime'),
          description: curated.description || 'Watch now on MaxPlay with high quality streaming.',
          posterUrl: curated.posterUrl || '',
          backdropUrl: curated.backdropUrl || curated.posterUrl || '',
          rating: curated.rating || 9.2,
          year: curated.year || 2024,
          country: curated.country || 'Japan',
          genres: curated.genres || ['Action', 'Supernatural'],
          videoUrl: curated.videoUrl || 'https://media.w3.org/2010/05/sintel/trailer.mp4',
          uploader: curated.uploader || { name: 'MaxPlay Admin', verified: true },
          duration: 1440,
          mature: false,
          seasons: 1,
          episodes: 12
        } as ContentItem);
      }
    }

    // Return exactly minimum 30 cards (10 rows of 3)
    return combined.slice(0, 30);
  }, [catalogItems, content.id, isMovie]);

  // --- Handlers ---
  const handleMyListToggle = async () => {
    if (!user) {
      alert("Please login to add to My List");
      return;
    }
    await toggleMyListItem(user.uid, content.id, isMyList);
    setToastMessage(!isMyList ? 'Added to My List' : 'Removed from My List');
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleDownloadAction = () => {
    if (onStartDownload && content) {
      onStartDownload(content);
      setToastMessage('Download queued');
      setTimeout(() => setToastMessage(null), 2500);
    } else {
      setToastMessage('Download ready');
      setTimeout(() => setToastMessage(null), 2000);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: content.title,
      text: `Watch ${content.title} on MaxPlay!`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Share cancelled or failed
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setToastMessage('Link copied to clipboard!');
        setTimeout(() => setToastMessage(null), 2000);
      } catch (e) {
        alert('Link copied to clipboard!');
      }
    }
  };

  const handleNextEpisode = () => {
    // 1. In Movie Mode
    if (isMovie) {
      if (selectedPartIndex + 1 < movieTotalParts) {
        const nextPartIdx = selectedPartIndex + 1;
        setSelectedPartIndex(nextPartIdx);
        const nextKey = `movie_p${nextPartIdx}`;
        const saved = partProgressMap[nextKey];
        // UNIFIED CONTINUOUS STREAM: always start next part at 0s
        setPlaybackPosition(0);
        // Carry over current language/quality instead of overriding unless missing
        if (saved?.language && !activeLanguage) setActiveLanguage(saved.language);
        if (saved?.quality && !activeQuality) setActiveQuality(saved.quality);
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // 2. In Series / Anime Mode: Next Part within same episode
    if (selectedPartIndex + 1 < currentEpisodePartsCount) {
      const nextPartIdx = selectedPartIndex + 1;
      setSelectedPartIndex(nextPartIdx);
      const nextKey = `s${selectedSeasonIndex}_e${selectedEpisodeIndex}_p${nextPartIdx}`;
      const saved = partProgressMap[nextKey];
      // UNIFIED CONTINUOUS STREAM: always start next part at 0s
      setPlaybackPosition(0);
      // Carry over current language/quality instead of overriding unless missing
      if (saved?.language && !activeLanguage) setActiveLanguage(saved.language);
      if (saved?.quality && !activeQuality) setActiveQuality(saved.quality);
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Next Episode
    const seasonsList = (content.seasonsData && content.seasonsData.length > 0) 
      ? content.seasonsData 
      : [{ seasonNumber: 1, seasonTitle: "Season 1", episodes: content.episodesList || [] }];

    const season = seasonsList[selectedSeasonIndex];
    if (season?.episodes && season.episodes.length > selectedEpisodeIndex + 1) {
      const nextEpIdx = selectedEpisodeIndex + 1;
      setSelectedEpisodeIndex(nextEpIdx);
      setSelectedPartIndex(0);
      const nextKey = `s${selectedSeasonIndex}_e${nextEpIdx}_p0`;
      const saved = partProgressMap[nextKey];
      setPlaybackPosition(saved?.time || 0);
      if (saved?.language) setActiveLanguage(saved.language);
      if (saved?.quality) setActiveQuality(saved.quality);
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (seasonsList.length > selectedSeasonIndex + 1) {
      const nextSeasonIdx = selectedSeasonIndex + 1;
      setSelectedSeasonIndex(nextSeasonIdx);
      setSelectedEpisodeIndex(0);
      setSelectedPartIndex(0);
      const nextKey = `s${nextSeasonIdx}_e0_p0`;
      const saved = partProgressMap[nextKey];
      setPlaybackPosition(saved?.time || 0);
      if (saved?.language) setActiveLanguage(saved.language);
      if (saved?.quality) setActiveQuality(saved.quality);
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const lastProgressPulseRef = useRef<number>(0);
  const handleProgress = (time: number, isFinished?: boolean, totalDuration?: number) => {
    const now = Date.now();
    if (isFinished || (now - lastProgressPulseRef.current >= 1500) || Math.abs(time - playbackPosition) >= 2) {
      lastProgressPulseRef.current = now;
      saveProgressNow(time, isFinished, false, totalDuration);
    }
  };

  const handleCommentButtonPress = () => {
    setActiveTab('comments');
    setTimeout(() => {
      commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const submitComment = async () => {
    if (!user) {
      alert('Please log in to post a comment.');
      return;
    }
    if (!newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      const authorName = user.displayName || user.email?.split('@')[0] || 'User';
      const commentText = newComment.trim();
      
      const optimisticComment = {
        id: `opt-${Date.now()}`,
        contentId: content.id,
        userId: user.uid,
        username: authorName,
        avatarUrl: user.photoURL || '',
        text: commentText,
        time: 'Just now',
        likes: 0,
        likedBy: [],
        replies: [],
        createdAt: new Date().toISOString()
      };
      setComments(prev => [optimisticComment, ...prev]);
      setNewComment('');

      await addCommentToContent(content.id, { uid: user.uid, displayName: authorName, photoURL: user.photoURL || '' }, commentText);
    } catch (e) {
      console.error(e);
      alert('Failed to post comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      alert('Please login to like comments.');
      return;
    }
    await toggleCommentLike(content.id, commentId, user.uid);
  };

  const handleLikeReply = async (commentId: string, replyId: string) => {
    if (!user) {
      alert('Please login to like replies.');
      return;
    }
    await toggleReplyLike(content.id, commentId, replyId, user.uid);
  };

  const handleReplyComment = async (commentId: string, replyText: string, replyToUsername?: string) => {
    if (!user) {
      alert('Please sign in to reply to comments.');
      return;
    }
    if (!replyText || !replyText.trim()) return;

    const authorName = user.displayName || user.email?.split('@')[0] || 'User';
    const cleanText = replyText.trim();
    
    // Optimistic reply creation
    const optimisticReply: CommentReplyItem = {
      id: `reply-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      commentId,
      userId: user.uid,
      username: authorName,
      avatarUrl: user.photoURL || '',
      replyToUsername: replyToUsername || undefined,
      text: cleanText,
      time: 'Just now',
      likes: 0,
      likedBy: [],
      createdAt: new Date().toISOString()
    };

    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: [...(c.replies || []), optimisticReply]
        };
      }
      return c;
    }));

    try {
      await addReplyToComment(
        content.id, 
        commentId, 
        { uid: user.uid, displayName: authorName, photoURL: user.photoURL || '' }, 
        cleanText, 
        replyToUsername
      );
    } catch (err) {
      console.error('Failed to post reply:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    setComments(prev => prev.filter(c => c.id !== commentId));
    try {
      await deleteCommentFromContent(content.id, commentId, user.uid);
    } catch (e) {
      console.error('Error deleting comment:', e);
    }
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    if (!user) return;
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: (c.replies || []).filter(r => r.id !== replyId)
        };
      }
      return c;
    }));
    try {
      await deleteReplyFromComment(content.id, commentId, replyId, user.uid);
    } catch (e) {
      console.error('Error deleting reply:', e);
    }
  };

  // Predefined Community Moderation Categories that map directly to admin portal
  const REPORT_CATEGORIES = [
    { id: 'spoiler', label: 'Major Spoiler', desc: 'Reveals important plot, story twists, or climax' },
    { id: 'hate_speech', label: 'Hate Speech & Harassment', desc: 'Attacks on identity, bullying, slurs, or threats' },
    { id: 'abusive', label: 'Abusive / Vulgar Language', desc: 'Offensive language, excessive profanity, or toxic behavior' },
    { id: 'spam', label: 'Spam & Promo', desc: 'Promotional links, scams, adverts, or repetitive text' },
    { id: 'misinformation', label: 'Misinformation', desc: 'Fake news, rumors, or intentionally false claims' },
    { id: 'other', label: 'Policy Violation', desc: 'Other violations of platform community guidelines' }
  ];

  const handleReportComment = (targetComment: CommentItem, targetReply?: CommentReplyItem) => {
    if (!user) {
      setToastMessage('Please sign in to report a comment');
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }
    setReportingTarget({ comment: targetComment, reply: targetReply });
    setReportCategory('spoiler');
    setReportReasonDetails('');
    setReportModalOpen(true);
  };

  const handleConfirmSubmitReport = async () => {
    if (!reportingTarget || !user || !content) return;
    setIsSubmittingReport(true);
    try {
      const activeText = reportingTarget.reply ? reportingTarget.reply.text : reportingTarget.comment.text;
      const authorId = reportingTarget.reply ? reportingTarget.reply.userId : reportingTarget.comment.userId;
      const authorName = reportingTarget.reply ? reportingTarget.reply.username : reportingTarget.comment.username;
      const authorAvatar = reportingTarget.reply ? reportingTarget.reply.avatarUrl : reportingTarget.comment.avatarUrl;
      const catObj = REPORT_CATEGORIES.find(c => c.id === reportCategory);

      await submitCommentReport({
        commentId: reportingTarget.comment.id,
        replyId: reportingTarget.reply?.id,
        commentText: activeText,
        commentAuthorId: authorId || 'unknown',
        commentAuthorName: authorName || 'Unknown User',
        commentAuthorAvatar: authorAvatar,
        contentId: content.id,
        contentTitle: content.title,
        contentPosterUrl: content.posterUrl || content.backdropUrl,
        contentType: content.type,
        reportedByUserId: user.uid,
        reportedByUserName: user.displayName || user.email?.split('@')[0] || 'User',
        reportedByUserEmail: user.email || '',
        category: reportCategory,
        reasonText: catObj?.label || reportCategory,
        details: reportReasonDetails.trim() || undefined
      });

      setReportModalOpen(false);
      setReportingTarget(null);
      setToastMessage('Report submitted to moderation queue. Thank you!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to submit report:', err);
      setToastMessage('Failed to submit report. Please try again.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const posterOrBackdrop = content.backdropUrl || content.posterUrl;

  // Format display metadata accurately according to mode
  const contentTypeLabel = isMovie ? 'MOVIE' : (content.type === 'anime' ? 'ANIME' : 'SERIES');
  const ratingValue = content.rating ? content.rating.toFixed(1) : '8.1';
  const releaseYear = content.year || 2023;
  const countryName = content.country || 'Japan';
  const seasonsCount = content.seasonsData?.length || (isSeries && !isMovie ? 1 : 0);

  // Helper formatting for timestamps
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      const remMins = mins % 60;
      return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGenreEmoji = (genre: string) => {
    const g = genre.toLowerCase();
    if (g.includes('action')) return '🔥';
    if (g.includes('advent')) return '⚔️';
    if (g.includes('fant')) return '🔮';
    if (g.includes('isekai')) return '⚔️';
    if (g.includes('magic')) return '✨';
    if (g.includes('sci') || g.includes('space')) return '🚀';
    if (g.includes('rom')) return '❤️';
    if (g.includes('com')) return '😆';
    if (g.includes('horr')) return '👻';
    if (g.includes('dram')) return '🎭';
    if (g.includes('mys') || g.includes('crime')) return '🕵️';
    if (g.includes('super')) return '🌟';
    if (g.includes('fight') || g.includes('martial')) return '🥋';
    return '🎬';
  };

  const genreList = useMemo(() => {
    if (content.genres && content.genres.length > 0) return content.genres;
    return ['Action', 'Adventure', 'Fantasy', 'Isekai', 'Magic'];
  }, [content.genres]);

  // Current active stream/part total duration
  const activePartDuration = useMemo(() => {
    const pData = partProgressMap[currentPartKey];
    if (pData?.duration && pData.duration > 0) return pData.duration;
    if (content.duration && content.duration > 0) return content.duration;
    return 1440; // 24 mins default fallback
  }, [partProgressMap, currentPartKey, content.duration]);

  // Global Multi-Part Cumulative Playback Position (e.g. Part 1 at 10m + Part 2 at 1s = 10:01)
  const globalPlaybackPosition = useMemo(() => {
    const curOffset = selectedPartIndex < partOffsets.length ? (partOffsets[selectedPartIndex] || 0) : 0;
    return curOffset + (playbackPosition || 0);
  }, [partOffsets, selectedPartIndex, playbackPosition]);

  // Global Total Duration across all parts (e.g. Part 1 (10m) + Part 2 (10m) = 20m)
  const globalTotalDuration = useMemo(() => {
    if (totalEpisodeDuration && totalEpisodeDuration > 0) return totalEpisodeDuration;
    if (allCurrentParts.length > 1) {
      const lastPartIdx = allCurrentParts.length - 1;
      const lastKey = isMovie ? `movie_p${lastPartIdx}` : `s${selectedSeasonIndex}_e${selectedEpisodeIndex}_p${lastPartIdx}`;
      const lastDuration = partProgressMap[lastKey]?.duration || allCurrentParts[lastPartIdx]?.duration || (content.duration || 1440);
      return (partOffsets[lastPartIdx] || 0) + lastDuration;
    }
    return activePartDuration;
  }, [totalEpisodeDuration, allCurrentParts, isMovie, selectedSeasonIndex, selectedEpisodeIndex, partProgressMap, content.duration, partOffsets, activePartDuration]);

  // Ultra-accurate continuous progress percentage across the entire movie/episode
  const resumePercent = useMemo(() => {
    if (!globalPlaybackPosition || globalPlaybackPosition <= 3 || globalTotalDuration <= 0) return 0;
    return Math.min(100, Math.max(1, Math.round((globalPlaybackPosition / globalTotalDuration) * 100)));
  }, [globalPlaybackPosition, globalTotalDuration]);

  // Clean Language Label for Movie Banner
  const displayLangTag = activeLanguage ? activeLanguage.replace(/\(Sub\)/i, '').replace(/Dub/i, '').trim() : 'Hindi';

  // Dynamic Quality / Format resolution (Zero Hardcoded values)
  const displayQualityTag = useMemo(() => {
    if (activeQuality && activeQuality !== 'auto') {
      return activeQuality.toUpperCase();
    }
    if (content.qualityLinks && Object.keys(content.qualityLinks).length > 0) {
      const keys = Object.keys(content.qualityLinks);
      if (keys.some(k => k.toLowerCase().includes('4k') || k.toLowerCase().includes('2160'))) return '4K';
      if (keys.some(k => k.toLowerCase().includes('1080'))) return '1080P FHD';
      if (keys.some(k => k.toLowerCase().includes('720'))) return '720P HD';
      return keys[0].toUpperCase();
    }
    if (content.videoSources && Object.keys(content.videoSources).length > 0) {
      const firstLangSources = Object.values(content.videoSources)[0];
      if (firstLangSources && typeof firstLangSources === 'object') {
        const qKeys = Object.keys(firstLangSources);
        if (qKeys.some(k => k.toLowerCase().includes('4k') || k.toLowerCase().includes('2160'))) return '4K';
        if (qKeys.some(k => k.toLowerCase().includes('1080'))) return '1080P FHD';
        if (qKeys.some(k => k.toLowerCase().includes('720'))) return '720P HD';
        if (qKeys.length > 0) return qKeys[0].toUpperCase();
      }
    }
    return content.category?.toUpperCase() || 'HD';
  }, [activeQuality, content.qualityLinks, content.videoSources, content.category]);

  // Smart episode selector: automatically resumes from the user's active multi-part & timestamp
  const handleSelectEpisode = useCallback((idx: number) => {
    saveProgressNow(playbackPosition, false, true);
    setSelectedEpisodeIndex(idx);

    let targetPart = 0;
    let targetKey = `s${selectedSeasonIndex}_e${idx}_p0`;
    let targetSaved = partProgressMap[targetKey];

    // Check if user previously watched a later part (p1, p2...) with more recent progress
    for (let p = 1; p < 10; p++) {
      const pKey = `s${selectedSeasonIndex}_e${idx}_p${p}`;
      const pSaved = partProgressMap[pKey];
      if (pSaved && (pSaved.time > 0 || (pSaved.updatedAt || 0) > (targetSaved?.updatedAt || 0))) {
        targetPart = p;
        targetKey = pKey;
        targetSaved = pSaved;
      }
    }

    setSelectedPartIndex(targetPart);
    setPlaybackPosition(targetSaved?.time || 0);
    if (targetSaved?.language) setActiveLanguage(targetSaved.language);
    if (targetSaved?.quality) setActiveQuality(targetSaved.quality);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [playbackPosition, selectedSeasonIndex, partProgressMap, saveProgressNow]);

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden bg-[#09090b]">
      {/* 1. Sticky/Pinned Video Player Area at Top */}
      <div className="relative w-full bg-black shrink-0 z-40 shadow-2xl overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '42vh' }}>
        {/* Soft atmospheric background ambient halo */}
        <div 
          className="absolute -top-14 -left-12 w-80 h-80 rounded-full bg-purple-600/25 blur-3xl pointer-events-none -z-10" 
        />
        <div 
          className="absolute -top-14 -right-12 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none -z-10" 
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-40 bg-rose-500/10 blur-3xl pointer-events-none -z-10" 
        />
        
        {(() => {
          const currentPlayerSkipMarkers = isMovie 
            ? content.skipMarkers 
            : ((content.seasonsData && content.seasonsData[selectedSeasonIndex]?.episodes?.[selectedEpisodeIndex]?.skipMarkers) 
               || (content.episodesList && content.episodesList[selectedEpisodeIndex]?.skipMarkers));
               
          return (
            <InlinePlayer
              key={`${content.id}-${currentPartKey}`}
              streamKey={`${content.id}-${currentPartKey}`}
              videoUrl={playerVideoUrl}
              qualityLinks={playerQualityLinks}
              videoSources={playerVideoSources}
              chunks={playerChunks}
              skipMarkers={currentPlayerSkipMarkers}
              posterUrl={posterOrBackdrop}
              title={playerTitle || 'Video'}
              initialTime={playbackPosition}
              autoPlay={true}
              timeOffset={activePartOffset}
              globalDuration={totalEpisodeDuration}
              onGlobalSeek={allCurrentParts.length > 1 ? handleGlobalSeek : undefined}
              activeLanguage={activeLanguage}
              activeQuality={activeQuality}
              onLanguageChange={(lang) => {
                setActiveLanguage(lang);
                saveProgressNow(playbackPosition, false, true);
              }}
              onQualityChange={(qual) => {
                setActiveQuality(qual);
                saveProgressNow(playbackPosition, false, true);
              }}
              onProgress={handleProgress}
              onDuration={handleDurationUpdate}
              onPause={(time, totalDuration) => {
                saveProgressNow(time, false, true, totalDuration);
              }}
              onNext={hasNext ? handleNextEpisode : undefined}
              onComplete={isAutoNextEnabled && hasNext ? handleNextEpisode : undefined}
              onBack={onBack}
            />
          );
        })()}
      </div>

      {/* 2. Scrollable Body Content Below Player */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 w-full overflow-y-auto overflow-x-hidden bg-[#09090b] text-white pb-36 font-sans scroll-smooth"
      >
        <div className="px-3.5 sm:px-5 pt-3.5 pb-6 z-10 w-full max-w-5xl mx-auto space-y-4">
        
        {/* HERO CARD: Glassmorphic Container with Details, Synopsis, and Quick Resume */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#16161d]/90 to-[#0e0e13]/90 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Radial Highlight */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Title Header & Info Trigger */}
          <div className="flex items-center justify-between gap-3 mb-2.5 relative z-10 min-w-0">
              <h1 
                className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-snug truncate flex-1 min-w-0"
                title={content.title}
              >
                  {content.title}
              </h1>
              <button 
                onClick={() => {
                  adManager.handleActionDockClick(!!user?.isPremium);
                  setShowDetails(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 text-[#c084fc] font-bold text-xs transition-all cursor-pointer shrink-0 border border-purple-500/20 shadow-sm shadow-purple-950/30 active:scale-95"
              >
                  <span className="text-[11px]">Info</span>
                  <Info className="w-3.5 h-3.5 text-[#c084fc]" />
              </button>
          </div>
          
          {/* Dynamic Single-Line Metadata Ribbon */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs mb-3 font-medium relative z-10 overflow-x-auto whitespace-nowrap scrollbar-none py-1 select-none">
            {/* Content Type Badge */}
            <span className={`shrink-0 px-2.5 py-0.5 rounded-md font-extrabold uppercase text-[9px] sm:text-[10px] tracking-wider border shadow-sm ${
              isMovie 
                ? 'bg-[#f43f5e]/15 text-[#f43f5e] border-[#f43f5e]/30' 
                : (content.type === 'anime' ? 'bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/30' : 'bg-[#a855f7]/15 text-[#a855f7] border-[#a855f7]/30')
            }`}>
              {contentTypeLabel}
            </span>

            {/* Star Rating Badge */}
            {content.rating ? (
              <span className="shrink-0 flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30 font-extrabold text-[10px] sm:text-[11px]">
                <Star className="w-3 h-3 fill-[#f59e0b]" />
                <span>{ratingValue}</span>
              </span>
            ) : null}

            {/* Dynamic Quality Badge */}
            {displayQualityTag && (
              <span className="shrink-0 px-2.5 py-0.5 rounded-md bg-white/10 text-white/90 border border-white/15 font-bold text-[9px] sm:text-[10px]">
                {displayQualityTag}
              </span>
            )}

            {/* Year & Format */}
            {releaseYear && <span className="shrink-0 text-white/60 font-semibold">{releaseYear}</span>}
            {countryName && (
              <>
                <span className="shrink-0 text-white/20">•</span>
                <span className="shrink-0 text-white/60 font-semibold">{countryName}</span>
              </>
            )}
            <span className="shrink-0 text-white/20">•</span>
            <span className="shrink-0 text-[#c084fc] font-bold">
              {isMovie ? 'Feature Film' : `${seasonsCount} Season${seasonsCount > 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Expandable Synopsis Preview */}
          {content.description && (
            <div className="text-xs text-white/70 leading-relaxed relative z-10">
              <p className={isSynopsisExpanded ? 'line-clamp-none' : 'line-clamp-2'}>
                {content.description}
              </p>
              {content.description.length > 120 && (
                <button 
                  onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                  className="text-[#c084fc] hover:text-purple-300 font-bold text-[11px] mt-1 inline-block cursor-pointer transition-colors"
                >
                  {isSynopsisExpanded ? 'Show less' : 'More...'}
                </button>
              )}
            </div>
          )}

          {/* DYNAMIC STREAM-RESUME CAPSULE (Prime Video X-Ray Style) */}
          {globalPlaybackPosition > 5 && (
            <div 
              onClick={() => {
                scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="mt-3.5 p-3.5 rounded-xl bg-gradient-to-r from-purple-950/70 via-[#1a1329] to-[#121219] border border-purple-500/30 hover:border-purple-400/60 transition-all duration-200 cursor-pointer group shadow-lg shadow-purple-950/40 relative z-10"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 border border-purple-400/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-all shadow-[0_0_12px_rgba(168,85,247,0.4)]">
                    <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-200 transition-colors truncate flex items-center gap-1.5">
                      <span>Resume from {formatTime(globalPlaybackPosition)}</span>
                      {globalTotalDuration > globalPlaybackPosition && (
                        <span className="text-[10px] text-purple-300/80 font-normal hidden sm:inline">
                          ({formatTime(globalTotalDuration - globalPlaybackPosition)} left)
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-white/50 truncate">
                      {isMovie ? 'Feature Film' : `Episode ${selectedEpisodeIndex + 1}`} • Tap to continue watching
                    </p>
                  </div>
                </div>
                {resumePercent > 0 && (
                  <span className="text-[10px] sm:text-xs font-black text-purple-300 bg-purple-500/20 px-2.5 py-1 rounded-full border border-purple-500/40 shrink-0 shadow-sm">
                    {resumePercent}% Watched
                  </span>
                )}
              </div>

              {/* Glowing Progress Track */}
              <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.9)] transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, resumePercent))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 4 FLOATING TACTILE ACTION DOCK (Neumorphic Frosted Glass) */}
        <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
          {/* 1. Add to list (Emerald Green Accent) */}
          <button 
            id="action-btn-my-list"
            onClick={() => {
              adManager.handleActionDockClick(!!user?.isPremium);
              handleMyListToggle();
            }}
            className={`flex flex-col items-center justify-center gap-1.5 h-[66px] rounded-2xl border transition-all duration-200 cursor-pointer active:scale-95 ${
              isMyList 
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30' 
                : 'bg-[#131318]/90 border-white/10 hover:border-emerald-500/40 hover:bg-[#181822] text-white/80 hover:text-emerald-300'
            }`}
          >
            {isMyList ? (
              <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
            ) : (
              <Plus className="w-4 h-4 text-emerald-400 stroke-[2.4]" />
            )}
            <span className="font-bold text-[9px] sm:text-[10px] tracking-tight truncate max-w-[90%]">
              {isMyList ? 'In My List' : 'My List'}
            </span>
          </button>

          {/* 2. Share Button (Cyan Blue Accent) */}
          <button 
            onClick={() => {
              adManager.handleActionDockClick(!!user?.isPremium);
              handleShare();
            }}
            className="flex flex-col items-center justify-center gap-1.5 h-[66px] rounded-2xl bg-[#131318]/90 border border-white/10 hover:border-cyan-500/40 hover:bg-[#181822] active:scale-95 transition-all duration-200 cursor-pointer text-white/80 hover:text-cyan-300 shadow-md shadow-cyan-950/20"
          >
            <Share2 className="w-4 h-4 stroke-[2.4] text-[#06b6d4]" />
            <span className="font-bold text-[9px] sm:text-[10px] tracking-tight">Share</span>
          </button>

          {/* 3. Comment Button (Rose Pink Accent + Badge) */}
          <button 
            onClick={() => {
              adManager.handleActionDockClick(!!user?.isPremium);
              handleCommentButtonPress();
            }}
            className="relative flex flex-col items-center justify-center gap-1.5 h-[66px] rounded-2xl bg-[#131318]/90 border border-white/10 hover:border-rose-500/40 hover:bg-[#181822] active:scale-95 transition-all duration-200 cursor-pointer text-white/80 hover:text-rose-300 shadow-md shadow-rose-950/20"
          >
            <MessageSquare className="w-4 h-4 stroke-[2.4] text-[#f43f5e]" />
            <span className="font-bold text-[9px] sm:text-[10px] tracking-tight">Comments</span>
            {comments.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-extrabold text-[9px] shadow-sm border border-rose-400/40">
                {comments.length}
              </span>
            )}
          </button>

          {/* 4. Details / Info Button (Violet Purple Accent) */}
          <button 
            onClick={() => {
              adManager.handleActionDockClick(!!user?.isPremium);
              setShowDetails(true);
            }}
            className="flex flex-col items-center justify-center gap-1.5 h-[66px] rounded-2xl bg-[#131318]/90 border border-white/10 hover:border-purple-500/40 hover:bg-[#181822] active:scale-95 transition-all duration-200 cursor-pointer text-white/80 hover:text-purple-300 shadow-md shadow-purple-950/20"
          >
            <Info className="w-4 h-4 stroke-[2.4] text-[#a855f7]" />
            <span className="font-bold text-[9px] sm:text-[10px] tracking-tight">Details</span>
          </button>
        </div>

        {/* Floating Toast Feedback Bar */}
        {toastMessage && (
          <div className="flex justify-center -mt-1 mb-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="px-3.5 py-1 rounded-full bg-[#8B5CF6] text-white text-[11px] font-bold shadow-lg shadow-purple-950/60 border border-purple-400/40">
              {toastMessage}
            </span>
          </div>
        )}

        {/* OTT INTERACTIVE STUDIO GENRES STRIP */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs font-bold text-white/50 shrink-0">Genres:</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {genreList.map((genre, idx) => (
              <span 
                key={idx}
                className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 flex items-center gap-1.5 transition cursor-default shrink-0 shadow-sm"
              >
                <span>{getGenreEmoji(genre)}</span>
                <span>{genre}</span>
              </span>
            ))}
          </div>
        </div>

        {/* NATIVE BANNER AD */}
        <NativeBanner />

        {/* PLAYBACK & EPISODES CARD CONTAINER */}
        <div className="bg-gradient-to-b from-[#131318] to-[#0c0c10] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl">
            {/* Box Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] shadow-[0_0_8px_#8B5CF6]" />
                    <span className="font-extrabold text-sm sm:text-base text-white">Playback & Episodes</span>
                </div>
                <div className="text-[11px] text-white/50 flex items-center gap-1">
                    <span>By</span>
                    <span className="font-bold text-white/90 truncate max-w-[120px]">{content.uploader?.name || 'MaxPlay Admin'}</span>
                </div>
            </div>

            {/* Language, Season, and View Mode Switcher Row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
                {/* RELATIVE WRAPPER FOR DROPDOWN ALIGNMENT */}
                <div className="relative flex flex-wrap items-center gap-2">
                  {/* Dub / Language Trigger Button (Solo Leveling HUD) */}
                  <button
                    type="button"
                    onClick={() => { adManager.handleSelectorClick(!!user?.isPremium); setIsLanguageModalOpen(true); }}
                    className="relative inline-flex items-center gap-2 bg-[#121626] hover:bg-[#182038] active:scale-95 border border-cyan-500/30 hover:border-cyan-400/60 rounded-xl px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_12px_rgba(6,182,212,0.12)] transition-all cursor-pointer group"
                    title="Change Audio Track"
                  >
                    <div className="w-4 h-4 rounded-md bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/30 transition-colors">
                      <Volume2 className="w-3 h-3 text-[#06b6d4]" />
                    </div>
                    <span className="font-mono text-cyan-300 font-extrabold tracking-wide">
                      {activeLanguage || 'Audio'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-cyan-400/60 group-hover:text-cyan-300 transition-transform group-hover:translate-y-0.5" />
                  </button>

                  {/* Language Dropdown */}
                  <SoloLevelingSelectorModal
                    isOpen={isLanguageModalOpen}
                    onClose={() => setIsLanguageModalOpen(false)}
                    type="language"
                    contentTitle={content.title}
                    languages={availableLanguages}
                    activeLanguage={activeLanguage}
                    onSelectLanguage={(newLang) => {
                      saveProgressNow(playbackPosition, false, true);
                      setActiveLanguage(newLang);
                    }}
                  />

                  {/* Season Selector Trigger Button (Series/Anime only) */}
                  {!isMovie && (
                    <>
                      <button
                        type="button"
                        onClick={() => { adManager.handleSelectorClick(!!user?.isPremium); setIsSeasonModalOpen(true); }}
                        className="relative inline-flex items-center gap-2 bg-[#181329] hover:bg-[#231a3d] active:scale-95 border border-purple-500/30 hover:border-purple-400/60 rounded-xl px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_12px_rgba(168,85,247,0.12)] transition-all cursor-pointer group"
                        title="Change Season"
                      >
                        <div className="w-4 h-4 rounded-md bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/30 transition-colors">
                          <Layers className="w-3.5 h-3.5 text-[#a855f7]" />
                        </div>
                        <span className="font-mono text-purple-300 font-extrabold tracking-wide">
                          {content.seasonsData?.[selectedSeasonIndex]?.seasonTitle || content.seasonsData?.[selectedSeasonIndex]?.title || `Season ${selectedSeasonIndex + 1}`}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-purple-400/60 group-hover:text-purple-300 transition-transform group-hover:translate-y-0.5" />
                      </button>

                      {/* Season Dropdown */}
                      <SoloLevelingSelectorModal
                        isOpen={isSeasonModalOpen}
                        onClose={() => setIsSeasonModalOpen(false)}
                        type="season"
                        contentTitle={content.title}
                        seasons={seasonOptions}
                        selectedSeasonIndex={selectedSeasonIndex}
                        onSelectSeason={(sIdx) => {
                          saveProgressNow(playbackPosition, false, true);
                          setSelectedSeasonIndex(sIdx);
                          setSelectedEpisodeIndex(0);
                          setSelectedPartIndex(0);
                          const key = `s${sIdx}_e0_p0`;
                          const saved = partProgressMap[key];
                          setPlaybackPosition(saved?.time || 0);
                          if (saved?.language) setActiveLanguage(saved.language);
                          if (saved?.quality) setActiveQuality(saved.quality);
                        }}
                      />
                    </>
                  )}
                </div>

                {/* View Switcher: List vs Grid Mode (For Series/Anime) */}
                {!isMovie && (
                  <div className="flex items-center p-0.5 bg-[#1a1a22] border border-white/10 rounded-xl">
                    <button
                      onClick={() => setEpisodeViewMode('list')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        episodeViewMode === 'list' 
                          ? 'bg-[#8B5CF6] text-white shadow-sm' 
                          : 'text-white/50 hover:text-white/80'
                      }`}
                      title="List View"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>List</span>
                    </button>
                    <button
                      onClick={() => setEpisodeViewMode('grid')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        episodeViewMode === 'grid' 
                          ? 'bg-[#8B5CF6] text-white shadow-sm' 
                          : 'text-white/50 hover:text-white/80'
                      }`}
                      title="Grid View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Grid</span>
                    </button>
                  </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* MOVIE MODE: Minimalist Netflix-Style Play Banner (Invisible Multi-part Backend) */}
            {/* ========================================================================= */}
            {isMovie ? (
              <div className="space-y-3.5">
                {/* FULL-WIDTH MOVIE TITLE BANNER */}
                <div 
                  onClick={() => {
                    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0d3b37] via-[#104e49] to-[#0d3b37] border border-[#14b8a6]/40 shadow-lg shadow-teal-950/40 flex items-center justify-between cursor-pointer hover:border-[#2dd4bf]/70 hover:brightness-110 active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-7 h-7 rounded-full bg-[#14b8a6]/30 flex items-center justify-center shrink-0">
                      <Play className="w-3.5 h-3.5 fill-[#2dd4bf] text-[#2dd4bf] ml-0.5" />
                    </div>
                    <span className="text-[#2dd4bf] text-xs sm:text-sm font-black tracking-wide truncate">
                      {content.title} {displayLangTag ? `[${displayLangTag}]` : ''}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded bg-[#14b8a6]/20 text-[#2dd4bf] shrink-0 border border-[#14b8a6]/40">
                    Playing Now
                  </span>
                </div>
              </div>
            ) : (
              /* ========================================================================= */
              /* SERIES / ANIME MODE: Episodes List/Grid Views (Invisible Multi-part Backend) */
              /* ========================================================================= */
              <div className="space-y-4">
                {/* EPISODES DISPLAY (LIST VIEW vs GRID VIEW) */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-white/80">
                        Episodes ({totalEpisodes > 0 ? totalEpisodes : 1})
                      </h3>
                      <button
                        onClick={() => setIsAutoNextEnabled(!isAutoNextEnabled)}
                        className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 cursor-pointer transition"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isAutoNextEnabled ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-white/30'}`} />
                        <span>Auto Next</span>
                      </button>
                    </div>

                    {/* 1. LIST VIEW MODE (High-End OTT Episode List) */}
                    {episodeViewMode === 'list' ? (
                      <div className="space-y-2.5">
                        {(activeSeasonEpisodes.length > 0 ? activeSeasonEpisodes : [{ id: '1', title: 'Episode 1' }]).map((ep, idx) => {
                          const isCurrent = selectedEpisodeIndex === idx;
                          
                          let epPercent = 0;
                          let epDuration = 0;
                          if (isCurrent) {
                            epPercent = resumePercent;
                            epDuration = globalTotalDuration;
                          } else {
                            // Sum multi-part progress for this inactive episode
                            const epPart0 = partProgressMap[`s${selectedSeasonIndex}_e${idx}_p0`];
                            const epPart1 = partProgressMap[`s${selectedSeasonIndex}_e${idx}_p1`];
                            const p0Dur = epPart0?.duration || (ep.duration ? ep.duration / 2 : 720);
                            const p1Dur = epPart1?.duration || 0;
                            epDuration = (p0Dur + p1Dur) || (ep.duration || content.duration || 1440);
                            const p0Time = epPart0?.time || 0;
                            const p1Time = epPart1?.time || 0;
                            const epWatched = p1Time > 0 ? (p0Dur + p1Time) : p0Time;
                            epPercent = (epWatched > 3 && epDuration > 0)
                              ? Math.min(100, Math.max(2, Math.round((epWatched / epDuration) * 100)))
                              : 0;
                          }

                          const epTitle = ep.title || `Episode ${idx + 1}`;
                          const epThumbnail = ep.thumbnailUrl || posterOrBackdrop;

                          return (
                            <div
                              key={idx}
                              onClick={() => { adManager.handleEpisodeClick(!!user?.isPremium); handleSelectEpisode(idx); }}
                              className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                                isCurrent 
                                  ? 'bg-gradient-to-r from-purple-950/60 to-[#161622] border-purple-400/60 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/40' 
                                  : 'bg-[#15151c] border-white/10 hover:border-white/20 hover:bg-[#1a1a24]'
                              }`}
                            >
                              {/* Left: Thumbnail with Duration & Play Overlay */}
                              <div className="relative w-28 sm:w-36 aspect-video rounded-lg overflow-hidden shrink-0 bg-black/50 border border-white/10 group">
                                <img 
                                  src={epThumbnail} 
                                  alt={epTitle}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isCurrent ? 'bg-purple-500 shadow-[0_0_8px_#a855f7]' : 'bg-black/60 group-hover:bg-white/20'}`}>
                                    <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                                  </div>
                                </div>
                                {/* Duration badge */}
                                <div className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/80 text-white/90 text-[9px] font-bold">
                                  {formatTime(epDuration)}
                                </div>
                                {/* Progress bottom bar */}
                                {epPercent > 0 && (
                                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                                    <div 
                                      className={`h-full ${isCurrent ? 'bg-emerald-400' : 'bg-purple-400'}`} 
                                      style={{ width: `${epPercent}%` }} 
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Middle: Title, Watched Status & Description */}
                              <div className="flex-1 min-w-0 pr-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className={`text-xs sm:text-sm font-bold truncate ${isCurrent ? 'text-purple-300 font-extrabold' : 'text-white'}`}>
                                    {(idx + 1).toString().padStart(2, '0')}. {epTitle}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] mb-1">
                                  {epPercent > 0 ? (
                                    <span className="text-emerald-400 font-extrabold text-[10px] flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                      {epPercent}% Watched
                                    </span>
                                  ) : (
                                    <span className="text-white/40 text-[10px]">0% Watched</span>
                                  )}
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-extrabold text-[9px] border border-purple-500/30">
                                      Playing
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] sm:text-[11px] text-white/50 line-clamp-1">
                                  {ep.description || content.description || 'Watch the next exciting installment of the adventure.'}
                                </p>
                              </div>

                              {/* Right: Quick Options / Status */}
                              <div className="shrink-0 text-white/40 hover:text-white p-1">
                                <MoreVertical className="w-4 h-4" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* 2. GRID VIEW MODE (Compact number tiles) */
                      <div className="flex flex-wrap gap-2">
                        {(activeSeasonEpisodes.length > 0 ? activeSeasonEpisodes : [{ id: '1', title: 'Episode 1' }]).map((ep, idx) => {
                            const isCurrent = selectedEpisodeIndex === idx;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => { adManager.handleEpisodeClick(!!user?.isPremium); handleSelectEpisode(idx); }}
                                    className={`relative w-11 h-11 sm:w-12 sm:h-12 flex flex-col items-center justify-center rounded-xl text-xs sm:text-sm font-black transition cursor-pointer border ${
                                      isCurrent 
                                        ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white shadow-lg shadow-purple-500/40 ring-1 ring-purple-400' 
                                        : 'bg-[#18181d] text-white/75 border-white/10 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <span>{(idx + 1).toString().padStart(2, '0')}</span>
                                    {isCurrent && (
                                      <div className="flex items-center gap-0.5 mt-0.5">
                                        <div className="w-0.5 h-1.5 bg-white rounded-full animate-pulse" />
                                        <div className="w-0.5 h-2 bg-white rounded-full" />
                                        <div className="w-0.5 h-1 bg-white rounded-full animate-pulse" />
                                      </div>
                                    )}
                                </button>
                            );
                        })}
                      </div>
                    )}
                </div>
              </div>
            )}
        </div>

        {/* 3. Navigation Tabs: Segmented Apple/Crunchyroll-style pills */}
        <div ref={commentsSectionRef} className="mb-4">
          <div className="flex items-center p-1 bg-[#121216] border border-white/10 rounded-xl max-w-sm">
              <button 
                  onClick={() => { adManager.handleSectionToggleClick(!!user?.isPremium); setActiveTab('forYou'); }}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition cursor-pointer text-center ${
                    activeTab === 'forYou' 
                      ? 'bg-[#8B5CF6] text-white shadow-md shadow-purple-950/50' 
                      : 'text-white/50 hover:text-white/80'
                  }`}
              >
                  <span>More Like This</span>
              </button>
              
              <button 
                  onClick={() => { adManager.handleSectionToggleClick(!!user?.isPremium); setActiveTab('comments'); }}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition cursor-pointer text-center ${
                    activeTab === 'comments' 
                      ? 'bg-[#8B5CF6] text-white shadow-md shadow-purple-950/50' 
                      : 'text-white/50 hover:text-white/80'
                  }`}
              >
                  <span>Comments ({comments.length})</span>
              </button>
          </div>
        </div>

        {/* TAB 1: FOR YOU / MORE LIKE THIS - EXACT MATCH TO HOMESCREEN 3-COLUMN CARDS */}
        {activeTab === 'forYou' && (
            <div className="animate-in fade-in duration-300">
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 pt-1">
                    {recommendationGrid.map((item, idx) => {
                        const displayPoster =
                          (item as any).customImage ||
                          item.posterUrl ||
                          item.backdropUrl ||
                          'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300';
                        const displayTitle = (item as any).customTitle || item.title;
                        const rating = item.rating || 8.5;
                        const yearOrGenre = item.year || item.genres?.[0] || item.category || 'HD';

                        return (
                          <div 
                              key={`${item.id}-${idx}`}
                              onClick={() => {
                                if (onSelectContent) {
                                  onSelectContent(item);
                                }
                                scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="group relative flex flex-col cursor-pointer transition-transform duration-200 active:scale-95 select-none"
                          >
                             {/* Standard Home-style Aspect [2/3] Poster Box */}
                             <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-[#1C1C1E] border border-white/10 shadow-md shadow-black/40">
                               <img 
                                  src={displayPoster} 
                                  alt={displayTitle} 
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                  loading="lazy"
                               />
                               
                               {/* Gradient Shadow Overlay */}
                               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                               {/* Top Left Rating Badge */}
                               <div className="absolute top-1.5 left-1.5 flex items-center gap-1 pointer-events-none">
                                  <div className="flex items-center gap-0.5 rounded-md bg-black/70 backdrop-blur-xs px-1.5 py-0.5 text-[10px] font-bold text-white border border-white/10 shadow">
                                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                    <span>{Number(rating).toFixed(1)}</span>
                                  </div>
                               </div>

                               {/* Bottom Type / Year pill inside poster */}
                               <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                                  <span className="text-[10px] font-medium text-white/90 drop-shadow truncate">
                                    {yearOrGenre}
                                  </span>
                               </div>
                             </div>

                             {/* Title & Metadata below poster */}
                             <div className="mt-1.5 px-0.5 text-left">
                               <h3 className="truncate text-xs sm:text-sm font-semibold text-white group-hover:text-[#A78BFA] transition-colors leading-tight" title={displayTitle}>
                                 {displayTitle}
                               </h3>
                             </div>
                          </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* TAB 2: COMMENTS - FULLY FUNCTIONAL */}
        {activeTab === 'comments' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            {/* Post Comment Input Box with User Avatar */}
            <div className="bg-[#121215] border border-white/5 rounded-2xl p-3.5">
              <div className="flex gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#06b6d4] flex items-center justify-center shrink-0 font-bold text-xs sm:text-sm text-white shadow-md overflow-hidden ring-1 ring-white/10">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : user ? (
                    (user.displayName || user.email || 'U').charAt(0).toUpperCase()
                  ) : (
                    '?'
                  )}
                </div>
                <div className="flex-1 relative">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={user ? "Write a comment..." : "Sign in to join the conversation..."}
                    disabled={!user || isSubmittingComment}
                    rows={2}
                    className="w-full bg-[#1a1a1f] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#8B5CF6] resize-none transition disabled:opacity-50"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-white/40">
                      {user ? `Logged in as @${user.displayName || user.email?.split('@')[0]}` : 'Read only mode'}
                    </span>
                    <button
                      onClick={submitComment}
                      disabled={!user || !newComment.trim() || isSubmittingComment}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#8B5CF6] hover:bg-[#7c3aed] text-white rounded-lg text-xs font-bold transition disabled:opacity-40 disabled:bg-white/10 cursor-pointer shadow-md shadow-purple-900/30"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingComment ? 'Posting...' : 'Post'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments List */}
            {comments.length === 0 ? (
              <div className="text-center py-12 text-white/40 bg-[#121215]/50 border border-white/5 rounded-2xl">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30 text-purple-400" />
                <p className="text-sm font-semibold text-white/70">No comments yet</p>
                <p className="text-xs text-white/40">Be the first to share your thoughts on this!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {comments.map((comment) => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    currentUserId={user?.uid}
                    currentUserPhoto={user?.photoURL || undefined}
                    currentUserName={user?.displayName || user?.email?.split('@')[0] || undefined}
                    onLike={() => handleLikeComment(comment.id)}
                    onLikeReply={handleLikeReply}
                    onReply={handleReplyComment}
                    onDeleteComment={handleDeleteComment}
                    onDeleteReply={handleDeleteReply}
                    onReport={handleReportComment}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Details Info Bottom Sheet Modal (inside mobile phone frame) */}
      {showDetails && content && (
        <div 
          className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center p-0 animate-in fade-in duration-200"
          onClick={() => setShowDetails(false)}
        >
          <div 
            className="bg-[#18181c] border-t border-white/15 w-full rounded-t-3xl p-5 max-h-[85%] overflow-y-auto overscroll-contain shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/10 sticky top-0 bg-[#18181c] z-10">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Info className="w-4.5 h-4.5 text-purple-400" />
                <span>Content Details</span>
              </h2>
              <button 
                type="button"
                onClick={() => setShowDetails(false)}
                className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-0.5 font-bold">Title</span>
                <p className="font-semibold text-white">{content.title}</p>
              </div>

              <div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-0.5 font-bold">Synopsis</span>
                <p className="text-white/80 leading-relaxed text-xs">
                  {content.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-0.5 font-bold">Format</span>
                  <p className="font-semibold text-white capitalize">{content.type}</p>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-0.5 font-bold">Rating</span>
                  <p className="font-semibold text-amber-400">★ {content.rating || 'N/A'}</p>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-0.5 font-bold">Release Year</span>
                  <p className="font-semibold text-white">{content.year || '2024'}</p>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-0.5 font-bold">Country</span>
                  <p className="font-semibold text-white">{content.country || 'Japan'}</p>
                </div>
              </div>

              {content.genres && content.genres.length > 0 && (
                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-1 font-bold">Genres</span>
                  <div className="flex flex-wrap gap-1.5">
                    {content.genres.map((g, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-medium">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {content.uploader && (
                <div className="pt-2 border-t border-white/10">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-0.5 font-bold">Uploaded By</span>
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <span>{content.uploader.name || 'MaxPlay Admin'}</span>
                    {content.uploader.verified && (
                      <Check className="w-3.5 h-3.5 text-blue-400" />
                    )}
                  </p>
                </div>
              )}

              {/* NATIVE BANNER AD */}
              <NativeBanner />
            </div>
          </div>
        </div>
      )}

      {/* Modern Report Modal with Selectable Categories (inside mobile phone frame) */}
      {reportModalOpen && reportingTarget && (
        <div 
          className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end justify-center p-0 animate-in fade-in duration-200"
          onClick={() => {
            setReportModalOpen(false);
            setReportingTarget(null);
          }}
        >
          <div 
            className="bg-[#18181F] border-t border-white/15 w-full rounded-t-3xl p-4 sm:p-5 max-h-[88%] overflow-y-auto overscroll-contain animate-in slide-in-from-bottom-4 duration-200 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 sticky top-0 bg-[#18181F] z-10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Flag className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Report to Moderation</h3>
                  <p className="text-[10px] text-white/50">Help maintain a safe community for all viewers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportModalOpen(false);
                  setReportingTarget(null);
                }}
                className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quoted Comment Preview */}
            <div className="mb-3 p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs shrink-0">
              <div className="flex items-center gap-1.5 mb-1 text-[10px] text-white/50">
                <span className="font-semibold text-purple-300">
                  @{reportingTarget.reply ? reportingTarget.reply.username : reportingTarget.comment.username}
                </span>
                <span>•</span>
                <span className="capitalize">{reportingTarget.reply ? 'Reply' : 'Comment'}</span>
              </div>
              <p className="line-clamp-2 italic text-white/85 text-[11px] leading-relaxed">
                "{reportingTarget.reply ? reportingTarget.reply.text : reportingTarget.comment.text}"
              </p>
            </div>

            {/* Select Reason Category */}
            <div className="mb-3">
              <label className="text-[11px] font-bold text-white/80 block uppercase tracking-wider mb-1.5">
                Select Report Category
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {REPORT_CATEGORIES.map((cat) => {
                  const isSelected = reportCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setReportCategory(cat.id)}
                      className={`flex items-center justify-between text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600/20 border-purple-500 text-white ring-1 ring-purple-500/50 shadow-md shadow-purple-950/30'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-white leading-snug">{cat.label}</div>
                        <div className="text-[10px] text-white/50 leading-tight">{cat.desc}</div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 stroke-[3] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Context Input */}
            <div className="mb-4">
              <label className="text-[11px] font-bold text-white/80 block uppercase tracking-wider mb-1">
                Additional Details <span className="text-white/40 font-normal text-[10px]">(Optional)</span>
              </label>
              <textarea
                value={reportReasonDetails}
                onChange={(e) => setReportReasonDetails(e.target.value)}
                placeholder="Give our moderation team any extra context..."
                rows={2}
                className="w-full bg-[#121215] border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-purple-500 resize-none transition"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-white/10 sticky bottom-0 bg-[#18181F] z-10 mt-auto">
              <button
                type="button"
                onClick={() => {
                  setReportModalOpen(false);
                  setReportingTarget(null);
                }}
                disabled={isSubmittingReport}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmitReport}
                disabled={isSubmittingReport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-rose-950/40 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingReport ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Flag className="w-3.5 h-3.5" />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

