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
  Loader2,
  Server
} from 'lucide-react';
import { ContentItem, CommentItem, CommentReplyItem, SeasonData } from '../../types';
import { InlinePlayer } from '../../components/player/InlinePlayer';
import { DownloadSelectionModal } from '../../components/downloads/DownloadSelectionModal';
import { downloadManager } from '../../services/DownloadManager';
import { SmartStreamService } from '../../services/smartStreamService';
import { ClientHlsDownloader } from '../../services/clientHlsDownloader';
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
import { STORAGE_KEYS } from '../../utils/constants';

interface ContentDetailScreenProps {
  content: ContentItem | null;
  onBack: () => void;
  onSelectContent?: (item: ContentItem) => void;
  onStartDownload?: (item: any, partKey?: string) => void;
}

const formatResumeTime = (seconds: number) => {
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
  content: rawContent, 
  onBack, 
  onSelectContent, 
  onStartDownload 
}) => {
  const [externalSeasons, setExternalSeasons] = useState<SeasonData[] | null>(null);

  useEffect(() => {
    if (rawContent?.id && (rawContent as any)?.hasExternalSeasons) {
      import('../../services/contentService').then(({ fetchExternalSeasons }) => {
        fetchExternalSeasons(rawContent.id).then(seasons => {
          if (seasons && seasons.length > 0) {
            setExternalSeasons(seasons);
          }
        });
      });
    }
  }, [rawContent?.id, (rawContent as any)?.hasExternalSeasons]);

  const content = useMemo(() => {
    if (!rawContent) return rawContent;
    const sData = (externalSeasons && externalSeasons.length > 0) ? externalSeasons : rawContent.seasonsData;
    let epList = rawContent.episodesList;
    if ((!epList || epList.length === 0) && sData && sData.length > 0) {
      epList = sData.flatMap((s: any) => s.episodes || []);
    }
    return {
      ...rawContent,
      seasonsData: sData,
      episodesList: epList
    };
  }, [rawContent, externalSeasons]);

  const { user, isLoading: isAuthLoading } = useAuthContext();
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
      // Direct history navigation hint (Ultra Pro Max instant restore)
      if ((content as any)?._historyResume) {
        const hr = (content as any)._historyResume;
        return {
          episodeIndex: hr.episodeIndex !== undefined ? hr.episodeIndex : (hr.currentEpisode ? hr.currentEpisode - 1 : (hr.episodeNum ? hr.episodeNum - 1 : 0)),
          seasonIndex: hr.seasonIndex ?? 0,
          partIndex: hr.partIndex ?? 0,
          currentTime: hr.watchedSeconds || hr.currentTime || 0,
          watchedSeconds: hr.watchedSeconds || hr.currentTime || 0,
          activeLanguage: hr.activeLanguage || '',
          activeQuality: hr.activeQuality || 'auto',
          partProgressMap: hr.partProgressMap || {},
          seasonEpisodeMap: hr.seasonEpisodeMap || {}
        };
      }

      const userKey = user?.uid ? `maxplay_progress_${user.uid}_${content.id}` : null;
      const userSeriesKey = user?.uid ? `maxplay_series_progress_${user.uid}_${content.id}` : null;
      const globalKey = `maxplay_progress_${content.id}`;
      const globalSeriesKey = `maxplay_series_progress_${content.id}`;
      
      const raw = (userKey && localStorage.getItem(userKey)) || 
                  (userSeriesKey && localStorage.getItem(userSeriesKey)) ||
                  localStorage.getItem(globalKey) || 
                  localStorage.getItem(globalSeriesKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) return parsed;
      }

      // Check in maxplay_watch_history array
      const historyRaw = localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY || 'maxplay_watch_history');
      if (historyRaw) {
        const histList = JSON.parse(historyRaw);
        if (Array.isArray(histList)) {
          const match = histList.find((h: any) => h.contentId === content.id || h.id === content.id);
          if (match) {
            return {
              ...match,
              episodeIndex: match.episodeIndex !== undefined ? match.episodeIndex : (match.currentEpisode ? match.currentEpisode - 1 : (match.episodeNum ? match.episodeNum - 1 : 0))
            };
          }
        }
      }
    } catch (e) {
      console.warn('Initial storage load error:', e);
    }
    return null;
  }, [content, user?.uid]);

  // Multi-part, Episode, and Season State
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(() => (initialSavedData?.seasonIndex !== undefined && !isMovie) ? initialSavedData.seasonIndex : 0);
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState(() => (initialSavedData?.episodeIndex !== undefined && !isMovie) ? initialSavedData.episodeIndex : 0);
  const [selectedPartIndex, setSelectedPartIndex] = useState(() => (initialSavedData?.partIndex !== undefined) ? initialSavedData.partIndex : 0);
  
  // Independent per-season episode memory map so switching seasons never bleeds or wipes state
  const [seasonEpisodeMap, setSeasonEpisodeMap] = useState<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    if (initialSavedData?.seasonEpisodeMap && typeof initialSavedData.seasonEpisodeMap === 'object') {
      Object.assign(map, initialSavedData.seasonEpisodeMap);
    }
    if (initialSavedData?.seasonIndex !== undefined && initialSavedData?.episodeIndex !== undefined) {
      map[initialSavedData.seasonIndex] = initialSavedData.episodeIndex;
    }
    return map;
  });

  const [isMyList, setIsMyList] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [offlineVideoUrl, setOfflineVideoUrl] = useState<string | null>(null);

  // Check if content or active episode is stored offline in IndexedDB
  useEffect(() => {
    if (!content) return;
    let isSubscribed = true;
    const epId = (content.type === 'series' || content.type === 'anime') ? `ep-${selectedEpisodeIndex + 1}` : undefined;
    downloadManager.getOfflineVideoUrl(content.id, epId, selectedEpisodeIndex).then((url) => {
      if (isSubscribed) {
        setOfflineVideoUrl(url);
      }
    });
    return () => {
      isSubscribed = false;
    };
  }, [content, selectedEpisodeIndex]);
  
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  // Independent playback, language, and quality state (respects Me > Settings preferred quality & language!)
  const [playbackPosition, setPlaybackPosition] = useState(() => initialSavedData?.currentTime || initialSavedData?.watchedSeconds || 0);
  const [activeLanguage, setActiveLanguage] = useState<string>(() => {
    if (initialSavedData?.activeLanguage) return initialSavedData.activeLanguage;
    try {
      return localStorage.getItem('maxplay_preferred_lang') || '';
    } catch {
      return '';
    }
  });
  const [activeQuality, setActiveQuality] = useState<string>(() => {
    try {
      const prefQ = localStorage.getItem('maxplay_preferred_quality') || localStorage.getItem('maxplay_video_quality');
      if (prefQ && prefQ.trim()) {
        const cleanPref = prefQ.trim();
        return cleanPref.toLowerCase() === 'auto' ? 'auto' : cleanPref;
      }
    } catch {}
    if (initialSavedData?.activeQuality) {
      return initialSavedData.activeQuality.toLowerCase() === 'auto' ? 'auto' : initialSavedData.activeQuality;
    }
    return 'auto';
  });
  const [partProgressMap, setPartProgressMap] = useState<Record<string, { time: number; duration?: number; language?: string; quality?: string }>>(() => initialSavedData?.partProgressMap || {});

  // Ultra Pro Max Resume Controls & Anti-Overwrite Guards
  const [isCloudResumeChecking, setIsCloudResumeChecking] = useState<boolean>(() => !isMovie && !initialSavedData);
  const isCloudResumeResolvedRef = useRef<boolean>(!!initialSavedData);
  const userExplicitlyChoseEpisodeRef = useRef<boolean>(false);
  const maxWatchedEpisodeRef = useRef<number>(initialSavedData?.episodeIndex ?? 0);
  
  const [episodeViewMode, setEpisodeViewMode] = useState<'list' | 'grid'>(() => {
    try {
      const saved = localStorage.getItem('maxplay_ep_view_mode');
      return saved === 'grid' ? 'grid' : 'list';
    } catch (e) {
      return 'list';
    }
  });

  const handleSetEpisodeViewMode = (mode: 'list' | 'grid') => {
    setEpisodeViewMode(mode);
    try {
      localStorage.setItem('maxplay_ep_view_mode', mode);
    } catch (e) {
      console.warn('Unable to persist episode view mode:', e);
    }
  };
  const [isAutoNextEnabled, setIsAutoNextEnabled] = useState<boolean>(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedServer, setSelectedServer] = useState<'server1' | 'server2'>(() => {
    try {
      if (content?.id) {
        const savedForContent = localStorage.getItem(`maxplay_server_${content.id}`);
        if (savedForContent === 'server1' || savedForContent === 'server2') return savedForContent;
      }
      const savedGlobal = localStorage.getItem('maxplay_preferred_server');
      if (savedGlobal === 'server1' || savedGlobal === 'server2') return savedGlobal;
    } catch {}
    return 'server1';
  });
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [discoveredAudioTracks, setDiscoveredAudioTracks] = useState<string[]>([]);
  const [discoveredQualities, setDiscoveredQualities] = useState<string[]>([]);
  const [s1DiscoveredQualities, setS1DiscoveredQualities] = useState<string[]>([]);
  const [s2DiscoveredQualities, setS2DiscoveredQualities] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [catalogItems, setCatalogItems] = useState<ContentItem[]>([]);

  // Remembered Server Selection helper (persists per-title and globally)
  const handleSelectServer = (srv: 'server1' | 'server2') => {
    saveProgressNow(playbackPosition, false, true);
    setSelectedServer(srv);
    try {
      if (content?.id) {
        localStorage.setItem(`maxplay_server_${content.id}`, srv);
      }
      localStorage.setItem('maxplay_preferred_server', srv);
    } catch {}
  };

  // Auto-detect and restore remembered server (or auto-switch if only one server has links)
  useEffect(() => {
    if (!content) return;
    const ep0 = content.episodesList?.[0] || content.seasonsData?.[0]?.episodes?.[0];
    const hasS1 = Boolean(
      content.videoUrl ||
      (content.qualityLinks && Object.keys(content.qualityLinks).length > 0) ||
      (content.videoSources && Object.keys(content.videoSources).length > 0) ||
      ep0?.videoUrl ||
      (ep0?.qualityLinks && Object.keys(ep0.qualityLinks).length > 0) ||
      (content.videoLinks && content.videoLinks.some((p: any) => typeof p === 'string' ? Boolean(p) : Boolean(p?.videoUrl || (p?.videoSources && Object.keys(p.videoSources).length > 0) || (p?.qualityLinks && Object.keys(p.qualityLinks).length > 0))))
    );
    const hasS2 = Boolean(
      content.secondaryVideoUrl ||
      (content as any).secondaryServerUrl ||
      (content as any).secondaryUrl ||
      (content.secondaryQualityLinks && Object.keys(content.secondaryQualityLinks).length > 0) ||
      ((content as any).secondaryServerQualityLinks && Object.keys((content as any).secondaryServerQualityLinks).length > 0) ||
      (ep0 as any)?.secondaryServerUrl ||
      (ep0 as any)?.secondaryVideoUrl ||
      ((ep0 as any)?.secondaryServerQualityLinks && Object.keys((ep0 as any).secondaryServerQualityLinks).length > 0) ||
      (content.videoLinks && content.videoLinks.some((p: any) => typeof p === 'object' && Boolean(p?.secondaryVideoUrl || p?.secondaryServerUrl || p?.secondaryUrl)))
    );

    let desiredServer: 'server1' | 'server2' = selectedServer;
    try {
      const savedForContent = localStorage.getItem(`maxplay_server_${content.id}`);
      if (savedForContent === 'server1' || savedForContent === 'server2') {
        desiredServer = savedForContent;
      } else {
        const savedGlobal = localStorage.getItem('maxplay_preferred_server');
        if (savedGlobal === 'server1' || savedGlobal === 'server2') {
          desiredServer = savedGlobal;
        }
      }
    } catch {}

    if (!hasS1 && hasS2) {
      setSelectedServer('server2');
    } else if (!hasS2 && hasS1) {
      setSelectedServer('server1');
    } else if (desiredServer === 'server2' && hasS2) {
      setSelectedServer('server2');
    } else if (desiredServer === 'server1' && hasS1) {
      setSelectedServer('server1');
    }
  }, [content?.id]);

  // Report Modal States
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingTarget, setReportingTarget] = useState<{ comment: CommentItem; reply?: CommentReplyItem } | null>(null);
  const [reportCategory, setReportCategory] = useState<string>('spoiler');
  const [reportReasonDetails, setReportReasonDetails] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  
  const commentsSectionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const languageTriggerRef = useRef<HTMLButtonElement>(null);
  const qualityTriggerRef = useRef<HTMLButtonElement>(null);
  const seasonTriggerRef = useRef<HTMLButtonElement>(null);

  // Initialize details screen ad grace period (10 min delay, max 2 popunders per Details screen)
  useEffect(() => {
    adManager.enterDetailsScreen(content?.id || 'detail');
    return () => {
      adManager.exitDetailsScreen();
    };
  }, [content?.id]);

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
    seasonEpisodeMap,
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
      seasonEpisodeMap,
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
    seasonEpisodeMap,
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
    let shouldSyncCloud = forceSave || isFinished || (now - lastSaveTimeRef.current >= 5000);

    // ANTI-OVERWRITE PROTECTION (Ultra Pro Max Safe Guard):
    // 1. If cloud resume check is pending, and user has NOT explicitly chosen this episode,
    //    suppress ALL saving (both cloud and local) to prevent default Episode 1 from wiping cloud history
    if (!isCloudResumeResolvedRef.current && !userExplicitlyChoseEpisodeRef.current) {
      console.log('[ResumeGuard] Save suppressed: cloud resume is still pending');
      return;
    }

    // 2. If user previously reached a higher episode (e.g. Episode 27) and current episode is lower,
    //    and watch time on this lower episode is under 30 seconds, and user did NOT explicitly select it:
    if (!curState.isMovie && maxWatchedEpisodeRef.current > curState.selectedEpisodeIndex && actualTime < 30 && !userExplicitlyChoseEpisodeRef.current) {
      console.log('[ResumeGuard] Shielded higher episode', maxWatchedEpisodeRef.current, 'from being overwritten by episode', curState.selectedEpisodeIndex);
      return;
    }

    // Keep track of highest episode watched
    if (curState.selectedEpisodeIndex > maxWatchedEpisodeRef.current) {
      maxWatchedEpisodeRef.current = curState.selectedEpisodeIndex;
    }

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
      seasonEpisodeMap: {
        ...(curState.seasonEpisodeMap || {}),
        [curState.selectedSeasonIndex]: curState.selectedEpisodeIndex
      },
      lastWatchedAt: new Date().toISOString()
    };

    // 1. Save to User-Isolated LocalStorage & Global Fallback & Series Master Index
    try {
      if (curState.user?.uid) {
        localStorage.setItem(`maxplay_progress_${curState.user.uid}_${curState.content.id}`, JSON.stringify(progressPayload));
        localStorage.setItem(`maxplay_series_progress_${curState.user.uid}_${curState.content.id}`, JSON.stringify(progressPayload));
      }
      localStorage.setItem(`maxplay_progress_${curState.content.id}`, JSON.stringify(progressPayload));
      localStorage.setItem(`maxplay_series_progress_${curState.content.id}`, JSON.stringify(progressPayload));
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

  // Robust Resume Restore on Load (User-Scoped localStorage + Dual Cloud Firestore)
  useEffect(() => {
    if (!content?.id) return;

    let isMounted = true;

    // Generous safety timeout: 6 seconds to ensure mobile / cold network has plenty of time
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setIsCloudResumeChecking(false);
        isCloudResumeResolvedRef.current = true;
      }
    }, 6000);

    // If auth is still initializing, wait for it before evaluating user state
    if (isAuthLoading && !user) {
      return () => {
        isMounted = false;
        clearTimeout(timeoutId);
      };
    }

    // Fetch latest from Firestore for current User Account
    if (user?.uid) {
      getUserProgress(user.uid, content.id).then((cloud) => {
        if (!isMounted) return;

        if (cloud) {
          if (cloud.episodeIndex !== undefined) {
            maxWatchedEpisodeRef.current = Math.max(maxWatchedEpisodeRef.current, cloud.episodeIndex);
          }

          if (cloud.partProgressMap && typeof cloud.partProgressMap === 'object') {
            setPartProgressMap(prev => ({ ...prev, ...cloud.partProgressMap }));
          }
          if (cloud.seasonEpisodeMap && typeof cloud.seasonEpisodeMap === 'object') {
            setSeasonEpisodeMap(prev => ({ ...prev, ...cloud.seasonEpisodeMap }));
          }

          if (cloud.lastWatchedAt || cloud.episodeIndex !== undefined || cloud.currentEpisode !== undefined) {
            let targetSeason = cloud.seasonIndex ?? 0;
            let targetEpisode = cloud.episodeIndex !== undefined ? cloud.episodeIndex : (cloud.currentEpisode ? cloud.currentEpisode - 1 : 0);
            let targetPart = cloud.partIndex ?? 0;
            let targetTime = cloud.currentTime || cloud.watchedSeconds || 0;

            // Auto-advance to next episode if previous episode completed (>90%)
            const isEpFinished = cloud.percentWatched >= 90 || cloud.isFinished;
            const seasonsList = (content.seasonsData && content.seasonsData.length > 0)
              ? content.seasonsData
              : [{ seasonNumber: 1, seasonTitle: "Season 1", episodes: content.episodesList || [] }];
            const currentSeasonEpisodes = seasonsList[targetSeason]?.episodes || [];

            if (isEpFinished && currentSeasonEpisodes.length > targetEpisode + 1) {
              targetEpisode = targetEpisode + 1;
              targetPart = 0;
              targetTime = 0;
            }

            // Only auto-restore if user hasn't deliberately tapped another episode in this session
            if (!userExplicitlyChoseEpisodeRef.current) {
              if (!isMovie) {
                setSelectedSeasonIndex(targetSeason);
                setSelectedEpisodeIndex(targetEpisode);
                setSeasonEpisodeMap(prev => ({ ...prev, [targetSeason]: targetEpisode }));
              }
              setSelectedPartIndex(targetPart);
              if (cloud.activeLanguage && !isQualityKeyString(cloud.activeLanguage)) {
                setActiveLanguage(cloud.activeLanguage);
              }
              const userGlobalQualityPref = localStorage.getItem('maxplay_preferred_quality') || localStorage.getItem('maxplay_video_quality');
              if (!userGlobalQualityPref && cloud.activeQuality && isQualityKeyString(cloud.activeQuality)) {
                setActiveQuality(cloud.activeQuality.toLowerCase() === 'auto' ? 'auto' : cloud.activeQuality);
              }
              setPlaybackPosition(targetTime);

              // Update stateRefs immediately
              stateRefs.current.selectedSeasonIndex = targetSeason;
              stateRefs.current.selectedEpisodeIndex = targetEpisode;
              stateRefs.current.selectedPartIndex = targetPart;
              stateRefs.current.playbackPosition = targetTime;
              stateRefs.current.currentPartKey = isMovie ? `movie_p${targetPart}` : `s${targetSeason}_e${targetEpisode}_p${targetPart}`;

              // Cache immediately into localStorage
              try {
                const localData = {
                  ...cloud,
                  seasonIndex: targetSeason,
                  episodeIndex: targetEpisode,
                  partIndex: targetPart,
                  currentTime: targetTime,
                  watchedSeconds: targetTime
                };
                localStorage.setItem(`maxplay_progress_${user.uid}_${content.id}`, JSON.stringify(localData));
                localStorage.setItem(`maxplay_series_progress_${user.uid}_${content.id}`, JSON.stringify(localData));
                localStorage.setItem(`maxplay_progress_${content.id}`, JSON.stringify(localData));
                localStorage.setItem(`maxplay_series_progress_${content.id}`, JSON.stringify(localData));
              } catch {
                // ignore
              }

              // Show reassuring resume indicator toast
              if (targetEpisode > 0 || targetTime > 15) {
                const epLabel = !isMovie ? `Episode ${targetEpisode + 1}` : 'Movie';
                setToastMessage(`Resumed ${epLabel}${targetTime > 15 ? ` from ${formatResumeTime(targetTime)}` : ''}`);
                setTimeout(() => setToastMessage(null), 3500);
              }
            }
          }
        }
      }).catch((err) => {
        console.warn('Cloud progress fetch warning:', err);
      }).finally(() => {
        if (isMounted) {
          isCloudResumeResolvedRef.current = true;
          setIsCloudResumeChecking(false);
        }
      });
    } else {
      isCloudResumeResolvedRef.current = true;
      setIsCloudResumeChecking(false);
    }

    // Attach window unload & visibility listeners for immediate save on tab/browser close
    const handleExitSave = () => {
      if (isCloudResumeResolvedRef.current || userExplicitlyChoseEpisodeRef.current) {
        saveProgressNow(stateRefs.current.playbackPosition, false, true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (isCloudResumeResolvedRef.current || userExplicitlyChoseEpisodeRef.current) {
          saveProgressNow(stateRefs.current.playbackPosition, false, true);
        }
      }
    };

    window.addEventListener('beforeunload', handleExitSave);
    window.addEventListener('pagehide', handleExitSave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      handleExitSave();
      window.removeEventListener('beforeunload', handleExitSave);
      window.removeEventListener('pagehide', handleExitSave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [content?.id, user?.uid, isAuthLoading, isMovie]);

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
  let playerVideoUrl = offlineVideoUrl || content.videoUrl || '';
  if (offlineVideoUrl) {
    playerTitle = `${playerTitle} (Offline)`;
  }
  let playerQualityLinks: Record<string, string> = content.qualityLinks || {};
  let playerVideoSources: Record<string, any> = content.videoSources || {};
  let playerChunks = content.chunks;
  let hasNext = false;

  // 1. SERIES / ANIME MODE DATA RESOLUTION
  let activeSeasonEpisodes: any[] = [];
  let totalEpisodes = 0;
  let currentEpisodePartsCount = 1;
  let currentEpisode: any = null;

  if (isSeries && !isMovie) {
    const seasonsList = (content.seasonsData && content.seasonsData.length > 0) 
      ? content.seasonsData 
      : [{ seasonNumber: 1, seasonTitle: "Season 1", episodes: content.episodesList || [] }];

    const currentSeason = seasonsList[selectedSeasonIndex] || seasonsList[0];
    activeSeasonEpisodes = currentSeason?.episodes || [];
    totalEpisodes = activeSeasonEpisodes.length;

    const currentEp = activeSeasonEpisodes[selectedEpisodeIndex] || activeSeasonEpisodes[0];
    currentEpisode = currentEp;

    if (currentEp) {
      const epExtraParts = Array.isArray(currentEp.videoLinks) ? currentEp.videoLinks : [];
      currentEpisodePartsCount = 1 + epExtraParts.length;

      playerTitle = `${content.title} - ${currentSeason.seasonTitle || currentSeason.title || `Season ${selectedSeasonIndex + 1}`} : ${currentEp.title || `Episode ${selectedEpisodeIndex + 1}`}`;

      if (selectedPartIndex === 0) {
        // Part 1 (Main)
        const epQualityObj =
          (currentEp.qualityLinks && typeof currentEp.qualityLinks === 'object' && Object.keys(currentEp.qualityLinks).length > 0)
            ? currentEp.qualityLinks
            : (content.qualityLinks && typeof content.qualityLinks === 'object' && Object.keys(content.qualityLinks).length > 0)
            ? content.qualityLinks
            : {};

        if (currentEp.videoSources && typeof currentEp.videoSources === 'object' && Object.keys(currentEp.videoSources).length > 0) {
          playerVideoSources = currentEp.videoSources;
          const targetLang = (activeLanguage && currentEp.videoSources[activeLanguage]) ? activeLanguage : Object.keys(currentEp.videoSources)[0];
          const langEntry = targetLang ? currentEp.videoSources[targetLang] : undefined;
          if (langEntry && typeof langEntry === 'object') {
            playerQualityLinks = { ...langEntry, ...epQualityObj };
          } else {
            playerQualityLinks = { ...epQualityObj };
          }
          const smartInit = SmartStreamService.selectSourceUrlForQuality(
            typeof langEntry === 'string' && Object.keys(epQualityObj).length === 0
              ? langEntry
              : (currentEp.videoUrl || content.videoUrl || ''),
            playerQualityLinks,
            activeQuality
          );
          playerVideoUrl = smartInit.chosenUrl;
        } else if (content.videoSources && typeof content.videoSources === 'object' && Object.keys(content.videoSources).length > 0) {
          playerVideoSources = content.videoSources;
          const targetLang = (activeLanguage && content.videoSources[activeLanguage]) ? activeLanguage : Object.keys(content.videoSources)[0];
          const langEntry = targetLang ? content.videoSources[targetLang] : undefined;
          if (langEntry && typeof langEntry === 'object') {
            playerQualityLinks = { ...langEntry, ...epQualityObj };
          } else {
            playerQualityLinks = { ...epQualityObj };
          }
          const smartInit = SmartStreamService.selectSourceUrlForQuality(
            typeof langEntry === 'string' && Object.keys(epQualityObj).length === 0
              ? langEntry
              : (currentEp.videoUrl || content.videoUrl || ''),
            playerQualityLinks,
            activeQuality
          );
          playerVideoUrl = smartInit.chosenUrl;
        } else {
          playerQualityLinks = { ...epQualityObj };
          const smartInit = SmartStreamService.selectSourceUrlForQuality(
            currentEp.videoUrl || content.videoUrl || '',
            playerQualityLinks,
            activeQuality
          );
          playerVideoUrl = smartInit.chosenUrl;
        }
        if (currentEp.chunks) playerChunks = currentEp.chunks;
      } else if (selectedPartIndex > 0 && epExtraParts[selectedPartIndex - 1]) {
        // Extra Part (Part 2, Part 3...) - Fully independent quality and language system!
        const extraPartObj = epExtraParts[selectedPartIndex - 1];
        playerTitle = `${playerTitle} (Part ${selectedPartIndex + 1})`;
        const partQualityObj =
          (typeof extraPartObj === 'object' && extraPartObj?.qualityLinks && typeof extraPartObj.qualityLinks === 'object')
            ? extraPartObj.qualityLinks
            : {};

        if (typeof extraPartObj === 'object' && extraPartObj.videoSources && Object.keys(extraPartObj.videoSources).length > 0) {
          playerVideoSources = extraPartObj.videoSources;
          const targetLang = (activeLanguage && extraPartObj.videoSources[activeLanguage]) ? activeLanguage : Object.keys(extraPartObj.videoSources)[0];
          const langEntry = targetLang ? extraPartObj.videoSources[targetLang] : undefined;
          if (langEntry && typeof langEntry === 'object') {
            playerQualityLinks = { ...langEntry, ...partQualityObj };
          } else {
            playerQualityLinks = { ...partQualityObj };
          }
          const smartPart = SmartStreamService.selectSourceUrlForQuality(
            typeof langEntry === 'string' && Object.keys(partQualityObj).length === 0
              ? langEntry
              : (extraPartObj.videoUrl || ''),
            playerQualityLinks,
            activeQuality
          );
          playerVideoUrl = smartPart.chosenUrl;
        } else if (typeof extraPartObj === 'object' && Object.keys(partQualityObj).length > 0) {
          playerQualityLinks = { ...partQualityObj };
          const smartPart = SmartStreamService.selectSourceUrlForQuality(
            extraPartObj.videoUrl || '',
            playerQualityLinks,
            activeQuality
          );
          playerVideoUrl = smartPart.chosenUrl;
          playerVideoSources = {};
        } else if (typeof extraPartObj === 'object' && extraPartObj.videoUrl) {
          playerVideoUrl = SmartStreamService.sanitizeStreamUrl(extraPartObj.videoUrl);
          playerVideoSources = {};
          playerQualityLinks = {};
        } else if (typeof extraPartObj === 'string') {
          playerVideoUrl = SmartStreamService.sanitizeStreamUrl(extraPartObj);
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
  let activeMoviePart: any = null;

  if (isMovie) {
    if (content.videoLinks && Array.isArray(content.videoLinks) && content.videoLinks.length > 0) {
      const validLinks = content.videoLinks.filter((p: any) =>
        p && (
          typeof p === 'string'
            ? p.trim().length > 0
            : Boolean(
                (p.videoSources && Object.keys(p.videoSources).length > 0) ||
                (p.qualityLinks && Object.keys(p.qualityLinks).length > 0) ||
                p.videoUrl ||
                p.secondaryVideoUrl ||
                p.secondaryServerUrl ||
                p.secondaryUrl
              )
        )
      );
      if (validLinks.length > 0) {
        moviePartsList = validLinks;
        movieTotalParts = moviePartsList.length;
      } else {
        moviePartsList = [{
          videoSources: content.videoSources,
          qualityLinks: content.qualityLinks,
          videoUrl: content.videoUrl,
          secondaryVideoUrl: content.secondaryVideoUrl || (content as any).secondaryServerUrl,
          secondaryQualityLinks: content.secondaryQualityLinks || (content as any).secondaryServerQualityLinks
        }];
        movieTotalParts = 1;
      }
    } else {
      moviePartsList = [{
        videoSources: content.videoSources,
        qualityLinks: content.qualityLinks,
        videoUrl: content.videoUrl,
        secondaryVideoUrl: content.secondaryVideoUrl || (content as any).secondaryServerUrl,
        secondaryQualityLinks: content.secondaryQualityLinks || (content as any).secondaryServerQualityLinks
      }];
      movieTotalParts = 1;
    }

    activeMoviePart = moviePartsList[selectedPartIndex] || moviePartsList[0];
    playerTitle = selectedPartIndex > 0 ? `${content.title} (Part ${selectedPartIndex + 1})` : content.title;

    if (activeMoviePart) {
      const movieQualityObj =
        (typeof activeMoviePart === 'object' && activeMoviePart?.qualityLinks && typeof activeMoviePart.qualityLinks === 'object' && Object.keys(activeMoviePart.qualityLinks).length > 0)
          ? activeMoviePart.qualityLinks
          : (content.qualityLinks && typeof content.qualityLinks === 'object' && Object.keys(content.qualityLinks).length > 0)
          ? content.qualityLinks
          : {};

      if (typeof activeMoviePart === 'object' && activeMoviePart.videoSources && Object.keys(activeMoviePart.videoSources).length > 0) {
        playerVideoSources = activeMoviePart.videoSources;
        const targetLang = (activeLanguage && activeMoviePart.videoSources[activeLanguage]) ? activeLanguage : Object.keys(activeMoviePart.videoSources)[0];
        const langEntry = targetLang ? activeMoviePart.videoSources[targetLang] : undefined;
        if (langEntry && typeof langEntry === 'object') {
          playerQualityLinks = { ...langEntry, ...movieQualityObj };
        } else {
          playerQualityLinks = { ...movieQualityObj };
        }
        const smartMovie = SmartStreamService.selectSourceUrlForQuality(
          typeof langEntry === 'string' && Object.keys(movieQualityObj).length === 0
            ? langEntry
            : (activeMoviePart.videoUrl || content.videoUrl || ''),
          playerQualityLinks,
          activeQuality
        );
        playerVideoUrl = smartMovie.chosenUrl;
      } else if (typeof activeMoviePart === 'object' && Object.keys(movieQualityObj).length > 0) {
        playerQualityLinks = { ...movieQualityObj };
        const smartMovie = SmartStreamService.selectSourceUrlForQuality(
          activeMoviePart.videoUrl || content.videoUrl || '',
          playerQualityLinks,
          activeQuality
        );
        playerVideoUrl = smartMovie.chosenUrl;
        playerVideoSources = {};
      } else if (typeof activeMoviePart === 'string') {
        playerVideoUrl = SmartStreamService.sanitizeStreamUrl(activeMoviePart);
        playerVideoSources = {};
        playerQualityLinks = {};
      } else if (content.videoSources && Object.keys(content.videoSources).length > 0) {
        playerVideoSources = content.videoSources;
        const targetLang = (activeLanguage && content.videoSources[activeLanguage]) ? activeLanguage : Object.keys(content.videoSources)[0];
        const langEntry = targetLang ? content.videoSources[targetLang] : undefined;
        if (langEntry && typeof langEntry === 'object') {
          playerQualityLinks = { ...langEntry, ...movieQualityObj };
        } else {
          playerQualityLinks = { ...movieQualityObj };
        }
        const smartMovie = SmartStreamService.selectSourceUrlForQuality(
          typeof langEntry === 'string' && Object.keys(movieQualityObj).length === 0
            ? langEntry
            : (content.videoUrl || ''),
          playerQualityLinks,
          activeQuality
        );
        playerVideoUrl = smartMovie.chosenUrl;
      } else {
        playerQualityLinks = { ...movieQualityObj };
        const smartMovie = SmartStreamService.selectSourceUrlForQuality(
          (typeof activeMoviePart === 'object' ? activeMoviePart?.videoUrl : '') || content.videoUrl || '',
          playerQualityLinks,
          activeQuality
        );
        playerVideoUrl = smartMovie.chosenUrl;
      }
    }

    if (selectedPartIndex + 1 < movieTotalParts) {
      hasNext = true;
    }
  }

  // 3. DUAL-SERVER RESOLUTION (Server 1: Primary Voe.sx / HLS | Server 2: Secondary Filemoon / Byse)
  let primaryServerUrl = SmartStreamService.sanitizeStreamUrl(playerVideoUrl || content.videoUrl || '');
  let secondaryServerUrl = '';
  let secondaryServerQualityLinks: Record<string, string> = {};

  if (isSeries && !isMovie && currentEpisode) {
    const epExtraParts = Array.isArray(currentEpisode.videoLinks) ? currentEpisode.videoLinks : [];
    if (selectedPartIndex > 0 && epExtraParts[selectedPartIndex - 1] && typeof epExtraParts[selectedPartIndex - 1] === 'object') {
      const extraPartObj = epExtraParts[selectedPartIndex - 1];
      secondaryServerUrl = SmartStreamService.sanitizeStreamUrl(
        extraPartObj.secondaryServerUrl || extraPartObj.secondaryVideoUrl || extraPartObj.secondaryUrl || ''
      );
      secondaryServerQualityLinks =
        extraPartObj.secondaryServerQualityLinks ||
        extraPartObj.secondaryQualityLinks ||
        {};
    } else {
      const rawSecLinks =
        (currentEpisode.secondaryServerQualityLinks && Object.keys(currentEpisode.secondaryServerQualityLinks).length > 0)
          ? currentEpisode.secondaryServerQualityLinks
          : (currentEpisode.secondaryQualityLinks && Object.keys(currentEpisode.secondaryQualityLinks).length > 0)
          ? currentEpisode.secondaryQualityLinks
          : ((content as any).secondaryServerQualityLinks && Object.keys((content as any).secondaryServerQualityLinks).length > 0)
          ? (content as any).secondaryServerQualityLinks
          : (content.secondaryQualityLinks || {});
      secondaryServerQualityLinks = rawSecLinks;
      secondaryServerUrl = SmartStreamService.sanitizeStreamUrl(
        (currentEpisode as any).secondaryServerUrl ||
        currentEpisode.secondaryVideoUrl ||
        (currentEpisode as any).secondaryUrl ||
        (content as any).secondaryServerUrl ||
        content.secondaryVideoUrl ||
        (content as any).secondaryUrl ||
        Object.values(rawSecLinks)[0] ||
        ''
      );
    }
  } else {
    if (activeMoviePart && typeof activeMoviePart === 'object') {
      const rawSecLinks =
        (activeMoviePart.secondaryServerQualityLinks && Object.keys(activeMoviePart.secondaryServerQualityLinks).length > 0)
          ? activeMoviePart.secondaryServerQualityLinks
          : (activeMoviePart.secondaryQualityLinks && Object.keys(activeMoviePart.secondaryQualityLinks).length > 0)
          ? activeMoviePart.secondaryQualityLinks
          : ((content as any).secondaryServerQualityLinks && Object.keys((content as any).secondaryServerQualityLinks).length > 0)
          ? (content as any).secondaryServerQualityLinks
          : (content.secondaryQualityLinks || {});
      secondaryServerQualityLinks = rawSecLinks;
      secondaryServerUrl = SmartStreamService.sanitizeStreamUrl(
        activeMoviePart.secondaryServerUrl ||
        activeMoviePart.secondaryVideoUrl ||
        activeMoviePart.secondaryUrl ||
        (content as any).secondaryServerUrl ||
        content.secondaryVideoUrl ||
        (content as any).secondaryUrl ||
        Object.values(rawSecLinks)[0] ||
        ''
      );
    } else {
      const rawSecLinks =
        ((content as any).secondaryServerQualityLinks && Object.keys((content as any).secondaryServerQualityLinks).length > 0)
          ? (content as any).secondaryServerQualityLinks
          : (content.secondaryQualityLinks || {});
      secondaryServerQualityLinks = rawSecLinks;
      secondaryServerUrl = SmartStreamService.sanitizeStreamUrl(
        (content as any).secondaryServerUrl ||
        content.secondaryVideoUrl ||
        (content as any).secondaryUrl ||
        Object.values(rawSecLinks)[0] ||
        ''
      );
    }
  }

  if (!offlineVideoUrl) {
    if (selectedServer === 'server2') {
      if (secondaryServerUrl || Object.keys(secondaryServerQualityLinks).length > 0) {
        const smartS2 = SmartStreamService.selectSourceUrlForQuality(
          secondaryServerUrl,
          secondaryServerQualityLinks,
          activeQuality
        );
        playerQualityLinks = smartS2.cleanQualityLinks;
        playerVideoUrl = smartS2.chosenUrl || secondaryServerUrl;
        playerVideoSources = {};
      }
    } else if (selectedServer === 'server1') {
      if (playerQualityLinks && typeof playerQualityLinks === 'object' && Object.keys(playerQualityLinks).length > 0) {
        const smartS1 = SmartStreamService.selectSourceUrlForQuality(
          playerVideoUrl,
          playerQualityLinks,
          activeQuality
        );
        playerQualityLinks = smartS1.cleanQualityLinks;
        if (smartS1.chosenUrl) {
          playerVideoUrl = smartS1.chosenUrl;
          primaryServerUrl = smartS1.chosenUrl;
        }
      } else if (!playerVideoUrl && (secondaryServerUrl || Object.keys(secondaryServerQualityLinks).length > 0)) {
        // Automatic fallback if only Server 2 link was filled
        const smartS2 = SmartStreamService.selectSourceUrlForQuality(
          secondaryServerUrl,
          secondaryServerQualityLinks,
          activeQuality
        );
        playerQualityLinks = smartS2.cleanQualityLinks;
        playerVideoUrl = smartS2.chosenUrl || secondaryServerUrl;
      }
    }
  }

  // Reset discoveredAudioTracks and discoveredQualities when switching episode or server
  useEffect(() => {
    setDiscoveredAudioTracks([]);
    setDiscoveredQualities([]);
  }, [content?.id, selectedSeasonIndex, selectedEpisodeIndex, selectedServer]);

  // Pre-warm both Server 1 and Server 2 streams in the background for instant 0ms playback & server switching
  useEffect(() => {
    if (primaryServerUrl) {
      SmartStreamService.prefetchStream(primaryServerUrl);
    }
    if (secondaryServerUrl) {
      SmartStreamService.prefetchStream(secondaryServerUrl);
    }
  }, [primaryServerUrl, secondaryServerUrl]);

  const isQualityKeyString = (val?: string): boolean => {
    if (!val || typeof val !== 'string') return false;
    return /^(\d{3,4}p|4k|2k|8k|hd|fhd|uhd|sd|auto)$/i.test(val.trim());
  };

  // Derive available languages dynamically for the current part & active server (Strictly filters out any quality labels!)
  const availableLanguages = useMemo(() => {
    const merged: string[] = [];
    const addUnique = (lang?: string) => {
      if (!lang || typeof lang !== 'string') return;
      const clean = lang.trim();
      if (
        !clean ||
        clean.toLowerCase() === 'default' ||
        clean.toLowerCase() === 'default audio' ||
        isQualityKeyString(clean)
      ) {
        return;
      }
      const normalized = ClientHlsDownloader.normalizeLanguageLabel(clean, clean) || clean;
      if (!normalized || isQualityKeyString(normalized)) return;
      if (!merged.some((m) => m.toLowerCase() === normalized.toLowerCase())) {
        merged.push(normalized);
      }
    };

    // 1. Live discovered HLS #EXT-X-MEDIA:TYPE=AUDIO tracks from active player
    if (discoveredAudioTracks.length > 0) {
      discoveredAudioTracks.forEach(addUnique);
    }

    // 2. Also check cached stream metadata for the active server URL
    const activeTargetUrl = selectedServer === 'server2' && secondaryServerUrl ? secondaryServerUrl : primaryServerUrl;
    if (activeTargetUrl) {
      const cachedMeta = SmartStreamService.getCachedStreamMeta(activeTargetUrl);
      if (cachedMeta && Array.isArray(cachedMeta.audioTracks)) {
        cachedMeta.audioTracks.forEach(addUnique);
      }
    }

    // 3. Include videoSources & configured multi-audio tracks when on Server 1 OR when Server 2 stream hasn't exposed multiple tracks yet
    if (selectedServer === 'server1' || merged.length <= 1) {
      if (playerVideoSources && typeof playerVideoSources === 'object' && Object.keys(playerVideoSources).length > 0) {
        Object.keys(playerVideoSources).forEach(addUnique);
      }
      if (currentEpisode?.videoSources && typeof currentEpisode.videoSources === 'object') {
        Object.keys(currentEpisode.videoSources).forEach(addUnique);
      }
      if (activeMoviePart && typeof activeMoviePart === 'object' && activeMoviePart.videoSources && typeof activeMoviePart.videoSources === 'object') {
        Object.keys(activeMoviePart.videoSources).forEach(addUnique);
      }
      if (content.videoSources && typeof content.videoSources === 'object') {
        Object.keys(content.videoSources).forEach(addUnique);
      }
    }

    // 4. Episode / Movie / Content configured languages (Always merge if <= 1 track discovered so multi-language content on Server 2 always shows all languages)
    if (merged.length <= 1 || selectedServer === 'server1') {
      const partLangs = (activeMoviePart as any)?.languages || (activeMoviePart as any)?.audioTracks || (currentEpisode as any)?.languages || (currentEpisode as any)?.audioTracks || (currentEpisode as any)?.audioLanguages;
      if (Array.isArray(partLangs) && partLangs.length > 0) {
        partLangs.forEach((l: any) => addUnique(typeof l === 'string' ? l : (l?.name || l?.label || l?.lang)));
      }
      if (content.availableLanguages && content.availableLanguages.length > 0) {
        content.availableLanguages.forEach(addUnique);
      }
      if (content.languages && content.languages.length > 0) {
        content.languages.forEach(addUnique);
      }
      if ((content as any)?.audioLanguages && (content as any).audioLanguages.length > 0) {
        (content as any).audioLanguages.forEach(addUnique);
      }
    }
    if (merged.length === 0) {
      if (activeLanguage && !isQualityKeyString(activeLanguage)) {
        addUnique(activeLanguage);
      }
      if (merged.length === 0) {
        merged.push('Hindi');
      }
    }
    return merged;
  }, [discoveredAudioTracks, selectedServer, primaryServerUrl, secondaryServerUrl, playerVideoSources, activeMoviePart, currentEpisode, content.videoSources, content.availableLanguages, content.languages, (content as any)?.audioLanguages, activeLanguage]);

  // Proactively probe both Server 1 and Server 2 master playlists so multi-language audio tracks and cross-server qualities (S1 / S2) appear immediately
  useEffect(() => {
    let cancelled = false;

    const probeUrlForServer = async (targetUrl: string, srv: 'server1' | 'server2') => {
      if (!targetUrl) return;
      try {
        let m3u8Url = targetUrl;
        const setSrvQualities = srv === 'server2' ? setS2DiscoveredQualities : setS1DiscoveredQualities;

        if (SmartStreamService.isExtractableSource(targetUrl, true)) {
          const res = await SmartStreamService.resolveStream(targetUrl, { forceRefresh: false });
          if (cancelled) return;
          if (res?.streamUrl) {
            m3u8Url = res.streamUrl;
            const meta = SmartStreamService.getCachedStreamMeta(targetUrl);
            if (srv === selectedServer && meta && Array.isArray(meta.audioTracks) && meta.audioTracks.length > 0) {
              setDiscoveredAudioTracks((prev) => {
                const next = Array.from(new Set([...prev, ...meta.audioTracks!]));
                return next.length !== prev.length ? next : prev;
              });
            }
            if (meta && Array.isArray(meta.qualities) && meta.qualities.length > 0) {
              setSrvQualities((prev) => {
                const next = Array.from(new Set([...prev, ...meta.qualities!]));
                return next.length !== prev.length ? next : prev;
              });
              if (srv === selectedServer) {
                setDiscoveredQualities((prev) => {
                  const next = Array.from(new Set([...prev, ...meta.qualities!]));
                  return next.length !== prev.length ? next : prev;
                });
              }
            }
          }
        }
        if (m3u8Url && (m3u8Url.includes('.m3u8') || m3u8Url.includes('m3u8') || m3u8Url.includes('master.txt'))) {
          const parsed = await ClientHlsDownloader.probeMasterPlaylist(m3u8Url);
          if (cancelled || !parsed) return;
          if (srv === selectedServer && parsed.audioTracks && parsed.audioTracks.length > 0) {
            const labels = parsed.audioTracks.map((a: any) => (typeof a === 'string' ? a : a?.label || a?.name || '')).filter(Boolean);
            if (labels.length > 0) {
              setDiscoveredAudioTracks((prev) => {
                const next = Array.from(new Set([...prev, ...labels]));
                return next.length !== prev.length ? next : prev;
              });
            }
          }
          if (parsed.qualities && parsed.qualities.length > 0) {
            const qLabels = parsed.qualities.map((q: any) => (typeof q === 'string' ? q : q?.label || '')).filter(Boolean);
            if (qLabels.length > 0) {
              setSrvQualities((prev) => {
                const next = Array.from(new Set([...prev, ...qLabels]));
                return next.length !== prev.length ? next : prev;
              });
              if (srv === selectedServer) {
                setDiscoveredQualities((prev) => {
                  const next = Array.from(new Set([...prev, ...qLabels]));
                  return next.length !== prev.length ? next : prev;
                });
              }
            }
          }
        }
      } catch {}
    };

    if (primaryServerUrl) {
      probeUrlForServer(primaryServerUrl, 'server1');
    }
    if (secondaryServerUrl) {
      probeUrlForServer(secondaryServerUrl, 'server2');
    }

    return () => {
      cancelled = true;
    };
  }, [selectedServer, primaryServerUrl, secondaryServerUrl]);

  // Compute cross-server qualities with [S1] / [S2] badges so both servers' qualities appear in the unified Quality drawer & selector
  const crossServerQualities = useMemo(() => {
    const otherSet = new Set<string>();
    const addOtherQual = (q?: string) => {
      if (!q || typeof q !== 'string') return;
      const clean = q.trim();
      if (!clean || clean.toLowerCase() === 'auto' || clean.toLowerCase() === 'default') return;
      if (isQualityKeyString(clean)) {
        otherSet.add(clean);
      }
    };

    if (selectedServer === 'server1') {
      // Currently on Server 1 -> gather Server 2 qualities with [S2] badge
      const hasS2 = Boolean(secondaryServerUrl || (secondaryServerQualityLinks && Object.keys(secondaryServerQualityLinks).length > 0));
      if (!hasS2) return [];

      if (secondaryServerQualityLinks && typeof secondaryServerQualityLinks === 'object') {
        Object.entries(secondaryServerQualityLinks).forEach(([k, v]) => {
          if (v && typeof v === 'string' && v.trim().length > 0) addOtherQual(k);
        });
      }
      s2DiscoveredQualities.forEach(addOtherQual);
      if (secondaryServerUrl) {
        const cachedS2 = SmartStreamService.getCachedStreamMeta(secondaryServerUrl);
        if (cachedS2 && Array.isArray((cachedS2 as any).qualities)) {
          (cachedS2 as any).qualities.forEach(addOtherQual);
        }
      }
      if (otherSet.size === 0 && secondaryServerUrl) {
        ['1080p', '720p', '480p', '360p'].forEach(addOtherQual);
      }
      const sortedOther = Array.from(otherSet).sort((a, b) => (parseInt(b, 10) || 0) - (parseInt(a, 10) || 0));
      return sortedOther.map((q) => `${q} [S2]`);
    } else {
      // Currently on Server 2 -> gather Server 1 qualities with [S1] badge
      const s1Links =
        (isSeries && !isMovie ? currentEpisode?.qualityLinks : (activeMoviePart as any)?.qualityLinks) ||
        content.qualityLinks ||
        {};
      const hasS1 = Boolean(primaryServerUrl || (s1Links && Object.keys(s1Links).length > 0));
      if (!hasS1) return [];

      if (s1Links && typeof s1Links === 'object') {
        Object.entries(s1Links).forEach(([k, v]) => {
          if (v && typeof v === 'string' && v.trim().length > 0) addOtherQual(k);
        });
      }
      s1DiscoveredQualities.forEach(addOtherQual);
      if (primaryServerUrl) {
        const cachedS1 = SmartStreamService.getCachedStreamMeta(primaryServerUrl);
        if (cachedS1 && Array.isArray((cachedS1 as any).qualities)) {
          (cachedS1 as any).qualities.forEach(addOtherQual);
        }
      }
      if (otherSet.size === 0 && primaryServerUrl) {
        ['1080p', '720p', '480p', '360p'].forEach(addOtherQual);
      }
      const sortedOther = Array.from(otherSet).sort((a, b) => (parseInt(b, 10) || 0) - (parseInt(a, 10) || 0));
      return sortedOther.map((q) => `${q} [S1]`);
    }
  }, [
    selectedServer,
    primaryServerUrl,
    secondaryServerUrl,
    secondaryServerQualityLinks,
    s1DiscoveredQualities,
    s2DiscoveredQualities,
    isSeries,
    isMovie,
    currentEpisode,
    activeMoviePart,
    content.qualityLinks,
  ]);

  // Derive available qualities for the active server + cross-server qualities ([S1] / [S2]), never mixing language names into qualities!
  const availableDetailQualities = useMemo(() => {
    const qSet = new Set<string>();
    const addQual = (q?: string) => {
      if (!q || typeof q !== 'string') return;
      const clean = q.trim();
      if (!clean || clean.toLowerCase() === 'auto' || clean.toLowerCase() === 'default') return;
      if (isQualityKeyString(clean)) {
        qSet.add(clean);
      }
    };

    // 1. Explicit per-quality links for the active server (playerQualityLinks is already resolved for selectedServer!)
    if (playerQualityLinks && typeof playerQualityLinks === 'object') {
      Object.entries(playerQualityLinks).forEach(([k, v]) => {
        if (v && typeof v === 'string' && v.trim().length > 0) {
          addQual(k);
        }
      });
    }

    // 2. Live discovered HLS qualities from the active server's stream
    if (discoveredQualities.length > 0) {
      discoveredQualities.forEach(addQual);
    }

    // 3. Cached stream metadata for the active server
    const activeTargetUrl = selectedServer === 'server2' && secondaryServerUrl ? secondaryServerUrl : primaryServerUrl;
    if (activeTargetUrl) {
      const cachedMeta = SmartStreamService.getCachedStreamMeta(activeTargetUrl);
      if (cachedMeta && Array.isArray((cachedMeta as any).qualities)) {
        (cachedMeta as any).qualities.forEach(addQual);
      }
    }

    // Standard fallback ladder for HLS streams if master manifest is still probing
    if (qSet.size === 0) {
      ['1080p', '720p', '480p', '360p'].forEach((q) => qSet.add(q));
    }

    const sorted = Array.from(qSet).sort((a, b) => (parseInt(b, 10) || 0) - (parseInt(a, 10) || 0));
    return ['auto', ...sorted, ...crossServerQualities];
  }, [playerQualityLinks, discoveredQualities, selectedServer, primaryServerUrl, secondaryServerUrl, crossServerQualities]);

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
      setToastMessage('Please sign in to add to My List');
      setTimeout(() => setToastMessage(null), 2500);
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
    userExplicitlyChoseEpisodeRef.current = true;
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
      maxWatchedEpisodeRef.current = Math.max(maxWatchedEpisodeRef.current, nextEpIdx);
      setSelectedEpisodeIndex(nextEpIdx);
      setSeasonEpisodeMap(prev => ({ ...prev, [selectedSeasonIndex]: nextEpIdx }));
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
      setSeasonEpisodeMap(prev => ({ ...prev, [nextSeasonIdx]: 0 }));
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
    userExplicitlyChoseEpisodeRef.current = true;
    maxWatchedEpisodeRef.current = Math.max(maxWatchedEpisodeRef.current, idx);
    saveProgressNow(playbackPosition, false, true);
    setSelectedEpisodeIndex(idx);
    setSeasonEpisodeMap(prev => ({ ...prev, [selectedSeasonIndex]: idx }));

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

  // Close any active floating Miniplayer when ContentDetailScreen opens
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('MAXPLAY_CLOSE_MINIPLAYER'));
  }, [content?.id]);

  const triggerMiniplayerOnLeave = useCallback(() => {
    try {
      const autoPipEnabled = localStorage.getItem('maxplay_auto_miniplayer') !== 'false';
      if (!autoPipEnabled || !content) return;
      const activeState = (window as any).__maxplayActivePlaybackState;
      const streamUrl = activeState?.streamUrl;
      if (!streamUrl || activeState?.isIframe) return;
      const resumeSec = Math.max(Number(activeState?.currentTime) || 0, playbackPosition || 0);
      saveProgressNow(resumeSec, false, true);

      const resumeContent = {
        ...content,
        _historyResume: {
          seasonIndex: selectedSeasonIndex,
          episodeIndex: selectedEpisodeIndex,
          partIndex: selectedPartIndex,
          watchedSeconds: resumeSec,
          currentTime: resumeSec,
          activeLanguage,
          activeQuality,
        },
      };

      window.dispatchEvent(
        new CustomEvent('MAXPLAY_ACTIVATE_MINIPLAYER', {
          detail: {
            content: resumeContent,
            streamUrl,
            currentTime: resumeSec,
            title: playerTitle || content.title || 'MaxPlay Video',
            posterUrl: posterOrBackdrop,
          },
        })
      );
    } catch {}
  }, [
    content,
    playbackPosition,
    selectedSeasonIndex,
    selectedEpisodeIndex,
    selectedPartIndex,
    activeLanguage,
    activeQuality,
    playerTitle,
    posterOrBackdrop,
    saveProgressNow,
  ]);

  const handleBackWithMiniplayer = useCallback(() => {
    triggerMiniplayerOnLeave();
    onBack();
  }, [triggerMiniplayerOnLeave, onBack]);

  useEffect(() => {
    const onHardwarePop = () => {
      triggerMiniplayerOnLeave();
    };
    window.addEventListener('MAXPLAY_POP_STACK_HOME', onHardwarePop, { capture: true });
    window.addEventListener('MAXPLAY_POP_STACK_SEARCH', onHardwarePop, { capture: true });
    window.addEventListener('MAXPLAY_POP_STACK_ANIME', onHardwarePop, { capture: true });
    window.addEventListener('MAXPLAY_POP_STACK_ME', onHardwarePop, { capture: true });
    return () => {
      window.removeEventListener('MAXPLAY_POP_STACK_HOME', onHardwarePop, { capture: true });
      window.removeEventListener('MAXPLAY_POP_STACK_SEARCH', onHardwarePop, { capture: true });
      window.removeEventListener('MAXPLAY_POP_STACK_ANIME', onHardwarePop, { capture: true });
      window.removeEventListener('MAXPLAY_POP_STACK_ME', onHardwarePop, { capture: true });
    };
  }, [triggerMiniplayerOnLeave]);

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

        {/* Resuming Progress Cloud Sync Overlay */}
        {isCloudResumeChecking && !initialSavedData && (
          <div className="absolute inset-0 z-50 bg-[#09090b] flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-purple-500 rounded-full blur-[2px] animate-pulse" />
              </div>
            </div>
            <p className="text-xs font-medium text-white/80 tracking-wide">
              Restoring your watch progress...
            </p>
          </div>
        )}
        
        {(() => {
          if (isCloudResumeChecking && !initialSavedData) {
            return null;
          }

          const currentPlayerSkipMarkers = isMovie 
            ? (activeMoviePart?.skipMarkers || (activeMoviePart as any)?.skip_markers || content.skipMarkers || (content as any).skip_markers || {
                introStart: (content as any).introStart || (content as any).intro_start,
                introEnd: (content as any).introEnd || (content as any).intro_end,
                outroStart: (content as any).outroStart || (content as any).outro_start,
                outroEnd: (content as any).outroEnd || (content as any).outro_end,
                creditsStart: (content as any).creditsStart || (content as any).credits_start,
                creditsEnd: (content as any).creditsEnd || (content as any).credits_end,
              })
            : ((content.seasonsData && content.seasonsData[selectedSeasonIndex]?.episodes?.[selectedEpisodeIndex]?.skipMarkers) 
               || (content.seasonsData && (content.seasonsData[selectedSeasonIndex]?.episodes?.[selectedEpisodeIndex] as any)?.skip_markers)
               || (content.episodesList && content.episodesList[selectedEpisodeIndex]?.skipMarkers)
               || (content.episodesList && (content.episodesList[selectedEpisodeIndex] as any)?.skip_markers));
               
          console.log('[SkipDebug] Passed to Player:', currentPlayerSkipMarkers, 'activeMoviePart:', activeMoviePart, 'content skip markers:', content.skipMarkers);

          return (
            <InlinePlayer
              key={`${content.id}-${currentPartKey}`}
              streamKey={`${content.id}-${currentPartKey}`}
              videoUrl={playerVideoUrl}
              qualityLinks={playerQualityLinks}
              videoSources={playerVideoSources}
              availableLanguages={availableLanguages}
              chunks={playerChunks}
              skipMarkers={currentPlayerSkipMarkers}
              isSmartHls={Boolean(content.isSmartHls || (currentEpisode as any)?.isSmartHls || (activeMoviePart as any)?.isSmartHls || secondaryServerUrl)}
              posterUrl={posterOrBackdrop}
              title={playerTitle || 'Video'}
              initialTime={playbackPosition}
              autoPlay={true}
              timeOffset={activePartOffset}
              globalDuration={totalEpisodeDuration}
              onGlobalSeek={allCurrentParts.length > 1 ? handleGlobalSeek : undefined}
              activeLanguage={activeLanguage}
              activeQuality={activeQuality}
              crossServerQualities={crossServerQualities}
              onLanguageChange={(lang) => {
                setActiveLanguage(lang);
                try {
                  localStorage.setItem('maxplay_preferred_lang', lang);
                } catch {}
                saveProgressNow(playbackPosition, false, true);
              }}
              onQualityChange={(qual) => {
                const s2Match = /\[S2\]/i.test(qual);
                const s1Match = /\[S1\]/i.test(qual);
                const cleanQ = qual.replace(/\s*\[(S1|S2)\]/i, '').trim();
                saveProgressNow(playbackPosition, false, true);
                if (s2Match && selectedServer !== 'server2') {
                  handleSelectServer('server2');
                  setToastMessage(`Switched to Server 2 • ${cleanQ.toUpperCase()}`);
                  setTimeout(() => setToastMessage(null), 2800);
                } else if (s1Match && selectedServer !== 'server1') {
                  handleSelectServer('server1');
                  setToastMessage(`Switched to Server 1 • ${cleanQ.toUpperCase()}`);
                  setTimeout(() => setToastMessage(null), 2800);
                }
                setActiveQuality(cleanQ);
                try {
                  localStorage.setItem('maxplay_preferred_quality', cleanQ);
                  localStorage.setItem('maxplay_video_quality', cleanQ);
                } catch {}
              }}
              onDiscoveredAudioTracks={setDiscoveredAudioTracks}
              onDiscoveredQualities={(quals) => {
                setDiscoveredQualities(quals);
                if (selectedServer === 'server2') {
                  setS2DiscoveredQualities(quals);
                } else {
                  setS1DiscoveredQualities(quals);
                }
              }}
              onProgress={handleProgress}
              onDuration={handleDurationUpdate}
              onPause={(time, totalDuration) => {
                saveProgressNow(time, false, true, totalDuration);
              }}
              onNext={hasNext ? handleNextEpisode : undefined}
              onComplete={isAutoNextEnabled && hasNext ? handleNextEpisode : undefined}
              onBack={handleBackWithMiniplayer}
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

          {/* 3. Download Button (Purple Accent) - Strictly for HLS Mode content */}
          {(() => {
            const isContentHlsSupported = Boolean(
              content.isSmartHls ||
              (currentEpisode as any)?.isSmartHls ||
              (activeMoviePart as any)?.isSmartHls ||
              secondaryServerUrl ||
              (content.videoUrl && (content.videoUrl.includes('.m3u8') || content.videoUrl.includes('m3u8'))) ||
              (currentEpisode?.videoUrl && (currentEpisode.videoUrl.includes('.m3u8') || currentEpisode.videoUrl.includes('m3u8'))) ||
              SmartStreamService.isExtractableSource(content.videoUrl, content.isSmartHls) ||
              SmartStreamService.isExtractableSource(currentEpisode?.videoUrl, (currentEpisode as any)?.isSmartHls) ||
              SmartStreamService.isExtractableSource(secondaryServerUrl, true)
            );

            return (
              <button 
                onClick={() => {
                  if (!isContentHlsSupported) {
                    setToastMessage("Download is only available for HLS Mode content. Normal links do not support offline downloading.");
                    setTimeout(() => setToastMessage(null), 3500);
                    return;
                  }
                  setShowDownloadModal(true);
                }}
                className={`flex flex-col items-center justify-center gap-1.5 h-[66px] rounded-2xl bg-[#131318]/90 border ${
                  isContentHlsSupported
                    ? 'border-white/10 hover:border-purple-500/40 hover:bg-[#181822] text-white/80 hover:text-purple-300'
                    : 'border-white/5 bg-[#131318]/50 text-white/40 hover:border-white/10'
                } active:scale-95 transition-all duration-200 cursor-pointer shadow-md shadow-purple-950/20`}
                title={isContentHlsSupported ? "Download for offline viewing (HLS Mode)" : "Download available only for HLS Mode"}
              >
                <div className="relative">
                  <Download className={`w-4 h-4 stroke-[2.4] ${isContentHlsSupported ? 'text-[#a855f7]' : 'text-zinc-500'}`} />
                  {!isContentHlsSupported && (
                    <span className="absolute -top-1 -right-2 text-[7px] bg-zinc-800 text-zinc-400 px-0.5 rounded border border-zinc-700">
                      Old
                    </span>
                  )}
                </div>
                <span className="font-bold text-[9px] sm:text-[10px] tracking-tight">Download</span>
              </button>
            );
          })()}

          {/* 4. Server Selection Button (Server 1 / Server 2) */}
          <button 
            onClick={() => {
              adManager.handleActionDockClick(!!user?.isPremium);
              setIsServerModalOpen(true);
            }}
            className={`flex flex-col items-center justify-center gap-1.5 h-[66px] rounded-2xl bg-[#131318]/90 border transition-all duration-200 cursor-pointer active:scale-95 shadow-md ${
              selectedServer === 'server2'
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15 shadow-amber-950/20'
                : 'border-white/10 hover:border-purple-500/40 hover:bg-[#181822] text-white/80 hover:text-purple-300 shadow-purple-950/20'
            }`}
            title="Switch Streaming Server (Server 1 / Server 2)"
          >
            <div className="relative flex items-center justify-center">
              <Server className={`w-4 h-4 stroke-[2.4] ${selectedServer === 'server2' ? 'text-amber-400' : 'text-[#a855f7]'}`} />
              <span className={`ml-1 px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-tighter ${
                selectedServer === 'server2'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
                  : 'bg-purple-500/25 text-purple-300 border border-purple-400/40'
              }`}>
                {selectedServer === 'server2' ? 'S2' : 'S1'}
              </span>
            </div>
            <span className="font-bold text-[9px] sm:text-[10px] tracking-tight truncate max-w-[92%]">
              {selectedServer === 'server2' ? 'Server 2' : 'Server 1'}
            </span>
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
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none py-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
        <div className="relative z-30 bg-gradient-to-b from-[#131318] to-[#0c0c10] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl">
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

            {/* Single-Line Static Selector Row: Audio Language + Quality + Season */}
            <div className="relative z-40 flex flex-col gap-2.5 mb-4">
                <div className="relative flex items-center justify-between gap-2 w-full">
                  {/* SINGLE-LINE HORIZONTAL SELECTOR BOXES (Never wraps onto a second line) */}
                  <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scrollbar-none py-0.5 flex-1 min-w-0">
                    {/* 1. Dub / Language Trigger Button */}
                    <button
                      ref={languageTriggerRef}
                      data-selector-trigger="language"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSeasonModalOpen(false);
                        setIsQualityModalOpen(false);
                        setIsLanguageModalOpen(prev => {
                          const next = !prev;
                          if (next) {
                            adManager.handleSelectorClick(!!user?.isPremium);
                          }
                          return next;
                        });
                      }}
                      className="relative shrink-0 inline-flex items-center gap-1.5 bg-[#121626] hover:bg-[#182038] active:scale-95 border border-cyan-500/30 hover:border-cyan-400/60 rounded-xl px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold text-white shadow-[0_0_12px_rgba(6,182,212,0.12)] transition-all cursor-pointer group"
                      title="Change Audio Track"
                    >
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-md bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/30 transition-colors shrink-0">
                        <Volume2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#06b6d4]" />
                      </div>
                      <span className="font-mono text-cyan-300 font-extrabold tracking-wide truncate max-w-[78px] sm:max-w-[120px]">
                        {activeLanguage || availableLanguages[0] || 'Audio'}
                      </span>
                      <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400/60 group-hover:text-cyan-300 transition-transform shrink-0 ${isLanguageModalOpen ? 'rotate-180 text-cyan-300' : 'group-hover:translate-y-0.5'}`} />
                    </button>

                    {/* 2. Quality Selector Trigger Button */}
                    <button
                      ref={qualityTriggerRef}
                      data-selector-trigger="quality"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsLanguageModalOpen(false);
                        setIsSeasonModalOpen(false);
                        setIsQualityModalOpen(prev => {
                          const next = !prev;
                          if (next) {
                            adManager.handleSelectorClick(!!user?.isPremium);
                          }
                          return next;
                        });
                      }}
                      className="relative shrink-0 inline-flex items-center gap-1.5 bg-[#0d1f1c] hover:bg-[#132d28] active:scale-95 border border-emerald-500/30 hover:border-emerald-400/60 rounded-xl px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold text-white shadow-[0_0_12px_rgba(16,185,129,0.12)] transition-all cursor-pointer group"
                      title="Change Video Quality"
                    >
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/30 transition-colors shrink-0">
                        <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#10b981]" />
                      </div>
                      <span className="font-mono text-emerald-300 font-extrabold tracking-wide uppercase truncate max-w-[64px] sm:max-w-[90px]">
                        {activeQuality === 'auto' ? 'Auto' : activeQuality}
                      </span>
                      <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400/60 group-hover:text-emerald-300 transition-transform shrink-0 ${isQualityModalOpen ? 'rotate-180 text-emerald-300' : 'group-hover:translate-y-0.5'}`} />
                    </button>

                    {/* 3. Season Selector Trigger Button (Series/Anime only - stays on the exact same line) */}
                    {!isMovie && (
                      <button
                        ref={seasonTriggerRef}
                        data-selector-trigger="season"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsLanguageModalOpen(false);
                          setIsQualityModalOpen(false);
                          setIsSeasonModalOpen(prev => {
                            const next = !prev;
                            if (next) {
                              adManager.handleSelectorClick(!!user?.isPremium);
                            }
                            return next;
                          });
                        }}
                        className="relative shrink-0 inline-flex items-center gap-1.5 bg-[#181329] hover:bg-[#231a3d] active:scale-95 border border-purple-500/30 hover:border-purple-400/60 rounded-xl px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold text-white shadow-[0_0_12px_rgba(168,85,247,0.12)] transition-all cursor-pointer group"
                        title="Change Season"
                      >
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-md bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/30 transition-colors shrink-0">
                          <Layers className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-[#a855f7]" />
                        </div>
                        <span className="font-mono text-purple-300 font-extrabold tracking-wide truncate max-w-[82px] sm:max-w-[160px]">
                          {content.seasonsData?.[selectedSeasonIndex]?.seasonTitle || content.seasonsData?.[selectedSeasonIndex]?.title || `Season ${selectedSeasonIndex + 1}`}
                        </span>
                        <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400/60 group-hover:text-purple-300 transition-transform shrink-0 ${isSeasonModalOpen ? 'rotate-180 text-purple-300' : 'group-hover:translate-y-0.5'}`} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Modals rendered OUTSIDE overflow-x-auto so they are never clipped vertically */}
                  <SoloLevelingSelectorModal
                    isOpen={isLanguageModalOpen}
                    onClose={() => setIsLanguageModalOpen(false)}
                    triggerRef={languageTriggerRef}
                    type="language"
                    contentTitle={content.title}
                    languages={availableLanguages}
                    activeLanguage={activeLanguage || availableLanguages[0] || ''}
                    onSelectLanguage={(newLang) => {
                      saveProgressNow(playbackPosition, false, true);
                      setActiveLanguage(newLang);
                      try {
                        localStorage.setItem('maxplay_preferred_lang', newLang);
                      } catch {}
                    }}
                  />

                  <SoloLevelingSelectorModal
                    isOpen={isQualityModalOpen}
                    onClose={() => setIsQualityModalOpen(false)}
                    triggerRef={qualityTriggerRef}
                    type="quality"
                    contentTitle={content.title}
                    qualities={availableDetailQualities}
                    activeQuality={activeQuality}
                    onSelectQuality={(newQual) => {
                      const s2Match = /\[S2\]/i.test(newQual);
                      const s1Match = /\[S1\]/i.test(newQual);
                      const cleanQ = newQual.replace(/\s*\[(S1|S2)\]/i, '').trim();
                      saveProgressNow(playbackPosition, false, true);
                      if (s2Match && selectedServer !== 'server2') {
                        handleSelectServer('server2');
                        setToastMessage(`Switched to Server 2 • ${cleanQ.toUpperCase()}`);
                        setTimeout(() => setToastMessage(null), 2800);
                      } else if (s1Match && selectedServer !== 'server1') {
                        handleSelectServer('server1');
                        setToastMessage(`Switched to Server 1 • ${cleanQ.toUpperCase()}`);
                        setTimeout(() => setToastMessage(null), 2800);
                      }
                      setActiveQuality(cleanQ);
                      try {
                        localStorage.setItem('maxplay_preferred_quality', cleanQ);
                        localStorage.setItem('maxplay_video_quality', cleanQ);
                      } catch {}
                    }}
                  />

                  {!isMovie && (
                    <SoloLevelingSelectorModal
                      isOpen={isSeasonModalOpen}
                      onClose={() => setIsSeasonModalOpen(false)}
                      triggerRef={seasonTriggerRef}
                      type="season"
                      contentTitle={content.title}
                      seasons={seasonOptions}
                      selectedSeasonIndex={selectedSeasonIndex}
                      onSelectSeason={(sIdx) => {
                        userExplicitlyChoseEpisodeRef.current = true;
                        saveProgressNow(playbackPosition, false, true);
                        setSelectedSeasonIndex(sIdx);
                        
                        // Determine the target episode for this selected season
                        let targetEpIdx = 0;
                        const targetSeasonEpisodes = content.seasonsData?.[sIdx]?.episodes || [];
                        const maxValidEp = Math.max(0, targetSeasonEpisodes.length - 1);
                        
                        if (seasonEpisodeMap[sIdx] !== undefined) {
                          targetEpIdx = Math.min(seasonEpisodeMap[sIdx], maxValidEp);
                        } else {
                          // Find highest watched episode in this season from partProgressMap
                          let latestEpWatched = 0;
                          let latestEpTime = 0;
                          for (let epI = 0; epI < targetSeasonEpisodes.length; epI++) {
                            for (let pI = 0; pI < 10; pI++) {
                              const pData = partProgressMap[`s${sIdx}_e${epI}_p${pI}`];
                              if (pData && (pData.time > 0 || (pData.updatedAt || 0) > latestEpTime)) {
                                latestEpWatched = epI;
                                latestEpTime = pData.updatedAt || pData.time;
                              }
                            }
                          }
                          targetEpIdx = latestEpWatched;
                        }
                        
                        setSelectedEpisodeIndex(targetEpIdx);
                        setSeasonEpisodeMap(prev => ({ ...prev, [sIdx]: targetEpIdx }));

                        // Target part resolution for this episode
                        let targetPart = 0;
                        let targetKey = `s${sIdx}_e${targetEpIdx}_p0`;
                        let targetSaved = partProgressMap[targetKey];
                        for (let p = 1; p < 10; p++) {
                          const pKey = `s${sIdx}_e${targetEpIdx}_p${p}`;
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
                      }}
                    />
                  )}

                  {/* View Switcher: List vs Grid Mode (For Series/Anime) */}
                  {!isMovie && (
                    <div className="hidden sm:flex items-center p-0.5 bg-[#1a1a22] border border-white/10 rounded-xl shrink-0">
                      <button
                        onClick={() => handleSetEpisodeViewMode('list')}
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
                        onClick={() => handleSetEpisodeViewMode('grid')}
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

                {/* Compact List/Grid row on mobile screens so the 3 selector boxes above always have full horizontal width */}
                {!isMovie && (
                  <div className="flex sm:hidden items-center justify-end">
                    <div className="flex items-center p-0.5 bg-[#1a1a22] border border-white/10 rounded-xl shrink-0">
                      <button
                        onClick={() => handleSetEpisodeViewMode('list')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          episodeViewMode === 'list' 
                            ? 'bg-[#8B5CF6] text-white shadow-sm' 
                            : 'text-white/50 hover:text-white/80'
                        }`}
                        title="List View"
                      >
                        <List className="w-3 h-3" />
                        <span>List</span>
                      </button>
                      <button
                        onClick={() => handleSetEpisodeViewMode('grid')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          episodeViewMode === 'grid' 
                            ? 'bg-[#8B5CF6] text-white shadow-sm' 
                            : 'text-white/50 hover:text-white/80'
                        }`}
                        title="Grid View"
                      >
                        <LayoutGrid className="w-3 h-3" />
                        <span>Grid</span>
                      </button>
                    </div>
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
                      /* 2. GRID VIEW MODE (Horizontal Scrollable Shelf) */
                      <div className="flex items-center gap-2 overflow-x-auto py-1.5 px-0.5 no-scrollbar scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {(activeSeasonEpisodes.length > 0 ? activeSeasonEpisodes : [{ id: '1', title: 'Episode 1' }]).map((ep, idx) => {
                            const isCurrent = selectedEpisodeIndex === idx;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => { adManager.handleEpisodeClick(!!user?.isPremium); handleSelectEpisode(idx); }}
                                    className={`relative shrink-0 w-11 h-11 sm:w-12 sm:h-12 flex flex-col items-center justify-center rounded-xl text-xs sm:text-sm font-black transition cursor-pointer border ${
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

      {/* Server Selection Bottom Sheet Modal (Server 1 / Server 2 — Provider Names Hidden) */}
      {isServerModalOpen && content && (
        <div
          className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center p-0 animate-in fade-in duration-200"
          onClick={() => setIsServerModalOpen(false)}
        >
          <div
            className="bg-[#18181c] border-t border-white/15 w-full rounded-t-3xl p-5 max-h-[85%] overflow-y-auto overscroll-contain shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/10 sticky top-0 bg-[#18181c] z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <Server className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-white leading-tight">
                    Select Streaming Server
                  </h2>
                  <p className="text-[10px] text-white/50">
                    Switch servers instantly if one is slow or buffering
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsServerModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Server 1 */}
              {(() => {
                const isSelected = selectedServer === 'server1';
                const hasPrimary = Boolean(primaryServerUrl);
                return (
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectServer('server1');
                      setIsServerModalOpen(false);
                      setToastMessage('Switched to Server 1');
                      setTimeout(() => setToastMessage(null), 2500);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-gradient-to-r from-purple-600/25 via-indigo-600/15 to-[#181822] border-purple-500 ring-1 ring-purple-500/50 shadow-lg shadow-purple-950/40'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-xs border ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/50'
                          : 'bg-white/5 text-purple-300 border-white/10'
                      }`}>
                        S1
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                            Server 1
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            hasPrimary
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-white/10 text-white/50 border-white/15'
                          }`}>
                            {hasPrimary ? 'Ready' : 'Not configured'}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/55 mt-0.5 truncate">
                          {hasPrimary
                            ? 'High-Speed Primary Multi-Audio & Auto Quality Stream'
                            : 'Server 1 is not configured for this title'}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 ml-2">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-sm">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-white/40 px-2 py-1 rounded-lg bg-white/5">
                          Select
                        </span>
                      )}
                    </div>
                  </button>
                );
              })()}

              {/* Server 2 */}
              {(() => {
                const isSelected = selectedServer === 'server2';
                const hasSecondary = Boolean(secondaryServerUrl || Object.keys(secondaryServerQualityLinks).length > 0);
                const isPrimaryAlreadyBackupCompatible = Boolean(
                  primaryServerUrl && (
                    primaryServerUrl.toLowerCase().includes('filemoon') ||
                    primaryServerUrl.toLowerCase().includes('byse') ||
                    primaryServerUrl.toLowerCase().includes('f16px') ||
                    primaryServerUrl.toLowerCase().includes('n1mwq')
                  )
                );
                return (
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectServer('server2');
                      setIsServerModalOpen(false);
                      setToastMessage(
                        hasSecondary || isPrimaryAlreadyBackupCompatible
                          ? 'Switched to Server 2'
                          : 'Switched to Server 2 (Using available stream)'
                      );
                      setTimeout(() => setToastMessage(null), 2500);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-500/25 via-orange-600/15 to-[#181822] border-amber-500 ring-1 ring-amber-500/50 shadow-lg shadow-amber-950/40'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-xs border ${
                        isSelected
                          ? 'bg-amber-500 text-black border-amber-300 shadow-md shadow-amber-900/50'
                          : 'bg-white/5 text-amber-300 border-white/10'
                      }`}>
                        S2
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                            Server 2
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            hasSecondary || isPrimaryAlreadyBackupCompatible
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-white/10 text-white/50 border-white/15'
                          }`}>
                            {hasSecondary || isPrimaryAlreadyBackupCompatible ? 'Ready' : 'Not configured'}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/55 mt-0.5 truncate">
                          {hasSecondary || isPrimaryAlreadyBackupCompatible
                            ? 'Turbo Backup High-Speed Multi-Audio HLS Stream'
                            : 'Server 2 is not configured for this title'}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 ml-2">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-black shadow-sm">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-white/40 px-2 py-1 rounded-lg bg-white/5">
                          Select
                        </span>
                      )}
                    </div>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Instant Download Selection Modal */}
      <DownloadSelectionModal
        visible={showDownloadModal}
        content={content}
        initialSeasonIndex={selectedSeasonIndex}
        initialEpisodeIndex={selectedEpisodeIndex}
        selectedServer={selectedServer}
        activePrimaryUrl={primaryServerUrl}
        activeSecondaryUrl={secondaryServerUrl}
        onClose={() => setShowDownloadModal(false)}
        onSuccessToast={(msg) => {
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 3000);
        }}
      />

      </div>
    </div>
  );
};

