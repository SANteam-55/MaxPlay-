import { VideoChunk } from '../services/ChunkEngine';

export interface SubtitleTrack {
  id: string;
  language: string;
  label: string;
  url?: string;
  downloaded: boolean;
  content?: string;
}

export interface AudioTrack {
  id: string;
  language: string;
  label: string;
  isOriginal?: boolean;
}

export interface PlayerQualityOption {
  quality: string; // '480p' | '720p' | '1080p'
  chunks: VideoChunk[];
}

export interface PlayerEpisodeData {
  id: string;
  contentId: string;
  title: string;
  seriesTitle?: string;
  duration: number; // total duration in seconds
  posterUrl: string;
  videoUrl?: string;
  videoLinks?: string[];
  chunks?: VideoChunk[];
  qualities: Record<string, VideoChunk[]>;
  subtitles: SubtitleTrack[];
  audioTracks: AudioTrack[];
}

export const MOCK_PLAYER_EPISODE: PlayerEpisodeData = {
  id: 'ep-101',
  contentId: 'series-jjk-1',
  title: 'Episode 1 - Ryomen Sukuna',
  seriesTitle: 'Jujutsu Kaisen Season 2',
  duration: 3180, // 53 minutes total
  posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
  qualities: {
    '1080p': [
      {
        url: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
        sizeMB: 200,
        order: 0,
        startTime: 0,
        duration: 1420, // ~23m40s
      },
      {
        url: 'https://vjs.zencdn.net/v/oceans.mp4',
        sizeMB: 200,
        order: 1,
        startTime: 1420,
        duration: 1420, // ~23m40s
      },
      {
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        sizeMB: 50,
        order: 2,
        startTime: 2840,
        duration: 340, // ~5m40s
      },
    ],
    '720p': [
      {
        url: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
        sizeMB: 120,
        order: 0,
        startTime: 0,
        duration: 1420,
      },
      {
        url: 'https://vjs.zencdn.net/v/oceans.mp4',
        sizeMB: 120,
        order: 1,
        startTime: 1420,
        duration: 1420,
      },
      {
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        sizeMB: 30,
        order: 2,
        startTime: 2840,
        duration: 340,
      },
    ],
    '480p': [
      {
        url: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
        sizeMB: 60,
        order: 0,
        startTime: 0,
        duration: 1420,
      },
      {
        url: 'https://vjs.zencdn.net/v/oceans.mp4',
        sizeMB: 60,
        order: 1,
        startTime: 1420,
        duration: 1420,
      },
      {
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        sizeMB: 15,
        order: 2,
        startTime: 2840,
        duration: 340,
      },
    ],
  },
  audioTracks: [
    { id: 'aud-ja', language: 'Japanese', label: 'Original Japanese', isOriginal: true },
    { id: 'aud-hi', language: 'Hindi', label: 'Hindi Dub' },
    { id: 'aud-en', language: 'English', label: 'English Dub' },
    { id: 'aud-ta', language: 'Tamil', label: 'Tamil Dub' },
  ],
  subtitles: [
    {
      id: 'sub-en',
      language: 'English',
      label: 'English [CC]',
      downloaded: true,
      content: `1
00:00:01,000 --> 00:00:05,000
Welcome to Jujutsu High School!

2
00:00:06,000 --> 00:00:10,000
Fixed & Synced by bozxphd. Enjoy The Flick

3
00:00:12,000 --> 00:00:18,000
This curse is far too strong for ordinary sorcerers.

4
00:00:20,000 --> 00:00:25,000
Yuji Itadori, swallow the finger now!`,
    },
    {
      id: 'sub-hi',
      language: 'Hindi',
      label: 'Hindi (हिंदी)',
      downloaded: true,
      content: `1
00:00:01,000 --> 00:00:05,000
जुजुत्सु हाई स्कूल में आपका स्वागत है!

2
00:00:06,000 --> 00:00:10,000
MaxPlay द्वारा सबटाइटल्स सिंक्रनाइज़ किए गए

3
00:00:12,000 --> 00:00:18,000
यह श्राप सामान्य जादूगरों के लिए बहुत शक्तिशाली है।`,
    },
    {
      id: 'sub-ar',
      language: 'Arabic',
      label: 'العربية',
      downloaded: false,
    },
    {
      id: 'sub-bn',
      language: 'Bangla',
      label: 'বাংলা',
      downloaded: false,
    },
    {
      id: 'sub-id',
      language: 'Indonesian',
      label: 'Indonesian',
      downloaded: false,
    },
  ],
};
