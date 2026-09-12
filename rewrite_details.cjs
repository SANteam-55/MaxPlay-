const fs = require('fs');

const code = `import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft, Share2, Plus, Check, MessageSquare, Star, 
  Send, ChevronDown, Download, Play, Film, Tv
} from 'lucide-react';
import { InlinePlayer } from '../../components/player/InlinePlayer';
import { CommentCard } from '../../components/common/CommentCard';
import { useAuthContext } from '../../context/AuthContext';
import { 
  subscribeToComments, 
  addCommentToContent,
  toggleMyListItem,
  subscribeToMyList,
  saveUserProgress
} from '../../services/contentService';
import { ContentItem, EpisodeItem, CommentItem } from '../../types';

interface Props {
  content?: ContentItem | null;
  onBack?: () => void;
  onSelectContent?: (content: ContentItem) => void;
  onStartDownload?: (item: ContentItem, epTitle?: string) => void;
}

export const ContentDetailScreen: React.FC<Props> = ({ content, onBack, onSelectContent, onStartDownload }) => {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState<'episodes' | 'comments' | 'more'>('episodes');
  
  // My List state
  const [isMyList, setIsMyList] = useState(false);
  const [isMyListLoading, setIsMyListLoading] = useState(false);

  // Comments state
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Playback & Selection State
  const [activeSeasonIndex, setActiveSeasonIndex] = useState(0);
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState(0);
  const [activePartIndex, setActivePartIndex] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');

  // Determine Content Type & Data
  const isMovie = !content?.type || content.type === 'movie' || content.type === 'short_tv';
  
  // Series Data
  const seasonsData = content?.seasonsData || [];
  const currentSeason = seasonsData[activeSeasonIndex] || { episodes: content?.episodesList || [] };
  const currentEpisodes = currentSeason?.episodes || [];
  const currentEpisode = currentEpisodes[activeEpisodeIndex];

  // Movie Parts Data
  const currentParts = content?.videoLinks && Array.isArray(content.videoLinks) && content.videoLinks.length > 0
    ? content.videoLinks 
    : [content];
  const activePart = currentParts[activePartIndex];

  // Derive final Player Props
  const playerTarget = isMovie ? activePart : currentEpisode;
  
  const playerVideoUrl = playerTarget?.videoUrl || content?.videoUrl;
  const playerQualityLinks = playerTarget?.qualityLinks || content?.qualityLinks;
  const playerVideoSources = playerTarget?.videoSources || content?.videoSources;
  const playerChunks = playerTarget?.chunks || content?.chunks;
  
  const playerTitle = isMovie 
    ? (currentParts.length > 1 ? \`\${content?.title} - Part \${activePartIndex + 1}\` : content?.title)
    : \`\${content?.title} - \${currentEpisode?.title || 'Ep ' + (activeEpisodeIndex + 1)}\`;

  // Fetch My List Status
  useEffect(() => {
    if (!user || !content) return;
    const unsub = subscribeToMyList(user.uid, (list) => {
      setIsMyList(list.some(item => item.id === content.id));
    });
    return () => unsub();
  }, [user, content]);

  // Fetch Comments
  useEffect(() => {
    if (!content) return;
    const unsub = subscribeToComments(content.id, (fetchedComments) => {
      setComments(fetchedComments);
    });
    return () => unsub();
  }, [content]);

  // Sync saved progress (mocking local storage for now to keep it snappy)
  useEffect(() => {
    if (!content) return;
    const key = \`maxplay_progress_\${content.id}_\${isMovie ? activePartIndex : activeEpisodeIndex}\`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setPlaybackPosition(parseFloat(saved));
    } else {
      setPlaybackPosition(0);
    }
  }, [content, activePartIndex, activeEpisodeIndex, isMovie]);

  const handleProgress = (time: number, isFinished?: boolean) => {
    if (!content || !user) return;
    const key = \`maxplay_progress_\${content.id}_\${isMovie ? activePartIndex : activeEpisodeIndex}\`;
    localStorage.setItem(key, time.toString());
    
    // Save to backend every 10 seconds to avoid spam
    if (Math.floor(time) % 10 === 0 || isFinished) {
      saveUserProgress(user.uid, content.id, time, isFinished);
    }
  };

  const handleNextEpisode = () => {
    if (isMovie) {
      if (activePartIndex < currentParts.length - 1) setActivePartIndex(prev => prev + 1);
    } else {
      if (activeEpisodeIndex < currentEpisodes.length - 1) {
        setActiveEpisodeIndex(prev => prev + 1);
      } else if (activeSeasonIndex < seasonsData.length - 1) {
        setActiveSeasonIndex(prev => prev + 1);
        setActiveEpisodeIndex(0);
      }
    }
  };

  const hasNext = isMovie 
    ? activePartIndex < currentParts.length - 1 
    : (activeEpisodeIndex < currentEpisodes.length - 1 || activeSeasonIndex < seasonsData.length - 1);

  const handleToggleMyList = async () => {
    if (!user || !content || isMyListLoading) return;
    setIsMyListLoading(true);
    try {
      await toggleMyListItem(user.uid, content);
      setIsMyList(!isMyList);
    } catch (e) {
      console.error(e);
    } finally {
      setIsMyListLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!user || !content || !commentInput.trim()) return;
    setIsSubmittingComment(true);
    try {
      await addCommentToContent(content.id, {
        userId: user.uid,
        userName: user.displayName || 'User',
        userAvatar: user.photoURL || undefined,
        text: commentInput.trim(),
        createdAt: new Date().toISOString(),
        likes: 0,
        replies: 0
      });
      setCommentInput('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (!content) return null;

  return (
    <div className="flex flex-col min-h-screen bg-black text-white w-full overflow-x-hidden pb-24">
      {/* Fixed Header / Player Area */}
      <div className="relative w-full bg-black shadow-2xl z-40" style={{ aspectRatio: '16/9', maxHeight: '40vh' }}>
        <InlinePlayer
          videoUrl={playerVideoUrl}
          qualityLinks={playerQualityLinks}
          videoSources={playerVideoSources}
          chunks={playerChunks}
          posterUrl={content.backdropUrl || content.posterUrl}
          title={playerTitle || 'Video'}
          initialTime={playbackPosition}
          autoPlay={true}
          activeLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          onProgress={handleProgress}
          onNext={hasNext ? handleNextEpisode : undefined}
          onBack={onBack}
        />
      </div>

      {/* Scrollable Content Details */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 max-w-5xl mx-auto w-full">
        
        {/* Meta Info */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            {content.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-gray-300">
            <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md">
              <Star className="w-4 h-4 fill-amber-400" />
              {content.rating || '9.0'}
            </span>
            {content.year && <span>{content.year}</span>}
            {content.mature && <span className="border border-gray-600 px-1.5 py-0.5 rounded text-xs">18+</span>}
            {content.type && (
              <span className="capitalize px-2 py-1 bg-white/10 rounded-md">
                {content.type.replace('_', ' ')}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
            {content.description || 'No description available for this content.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 py-2">
          <button 
            onClick={handleToggleMyList}
            disabled={isMyListLoading}
            className="flex flex-col items-center gap-1.5 text-gray-300 hover:text-white transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              {isMyList ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <span className="text-xs font-medium">My List</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 text-gray-300 hover:text-white transition-colors">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">Share</span>
          </button>
          {onStartDownload && (
            <button 
              onClick={() => onStartDownload(content, isMovie ? undefined : currentEpisode?.title)}
              className="flex flex-col items-center gap-1.5 text-gray-300 hover:text-white transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Download</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-white/10 flex gap-6">
          {(!isMovie || currentParts.length > 1) && (
            <button 
              onClick={() => setActiveTab('episodes')}
              className={\`pb-3 text-sm font-bold border-b-2 transition-colors \${
                activeTab === 'episodes' ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
              }\`}
            >
              {isMovie ? 'Parts' : 'Episodes'}
            </button>
          )}
          <button 
            onClick={() => setActiveTab('comments')}
            className={\`pb-3 text-sm font-bold border-b-2 transition-colors \${
              activeTab === 'comments' ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }\`}
          >
            Comments ({comments.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="pt-2 min-h-[400px]">
          {/* EPISODES / PARTS TAB */}
          {activeTab === 'episodes' && (
            <div className="space-y-4">
              {!isMovie && seasonsData.length > 1 && (
                <select 
                  value={activeSeasonIndex}
                  onChange={(e) => {
                    setActiveSeasonIndex(Number(e.target.value));
                    setActiveEpisodeIndex(0);
                  }}
                  className="bg-white/10 text-white border border-white/20 rounded-lg px-4 py-2.5 outline-none font-semibold cursor-pointer w-full max-w-xs"
                >
                  {seasonsData.map((s, i) => (
                    <option key={i} value={i} className="bg-black text-white">
                      {s.seasonTitle || \`Season \${s.seasonNumber || i + 1}\`}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex flex-col gap-3">
                {isMovie ? (
                  // Render Parts
                  currentParts.map((part, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setActivePartIndex(idx)}
                      className={\`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors \${
                        activePartIndex === idx ? 'bg-white/15 border border-white/10' : 'hover:bg-white/5 border border-transparent'
                      }\`}
                    >
                      <div className="w-24 h-16 sm:w-32 sm:h-20 bg-gray-800 rounded-lg shrink-0 overflow-hidden relative">
                        <img 
                          src={part.thumbnailUrl || content.backdropUrl} 
                          alt="Thumbnail" 
                          className="w-full h-full object-cover opacity-80"
                        />
                        {activePartIndex === idx && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Play className="w-6 h-6 fill-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-white">
                          Part {idx + 1}
                        </h3>
                      </div>
                    </div>
                  ))
                ) : (
                  // Render Episodes
                  currentEpisodes.map((ep, idx) => (
                    <div 
                      key={ep.id || idx}
                      onClick={() => setActiveEpisodeIndex(idx)}
                      className={\`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors \${
                        activeEpisodeIndex === idx ? 'bg-white/15 border border-white/10' : 'hover:bg-white/5 border border-transparent'
                      }\`}
                    >
                      <div className="w-24 h-16 sm:w-32 sm:h-20 bg-gray-800 rounded-lg shrink-0 overflow-hidden relative">
                        <img 
                          src={ep.thumbnailUrl || content.backdropUrl} 
                          alt="Thumbnail" 
                          className="w-full h-full object-cover opacity-80"
                        />
                        {activeEpisodeIndex === idx && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Play className="w-6 h-6 fill-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-white truncate">
                          {ep.episodeNumber ? \`\${ep.episodeNumber}. \` : ''}{ep.title}
                        </h3>
                        {ep.duration && (
                          <span className="text-xs text-gray-400 mt-1 block">
                            {Math.round(ep.duration / 60)}m
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* COMMENTS TAB */}
          {activeTab === 'comments' && (
            <div className="space-y-6">
              {user ? (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-amber-500 shrink-0 overflow-hidden">
                    {user.photoURL && <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input 
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                      placeholder="Add a comment..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white outline-none focus:border-purple-500/50 focus:bg-white/10 transition-colors"
                    />
                    <button 
                      onClick={handlePostComment}
                      disabled={!commentInput.trim() || isSubmittingComment}
                      className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-colors"
                    >
                      <Send className="w-4 h-4 text-white -ml-0.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white/5 rounded-xl text-center border border-white/10">
                  <p className="text-sm text-gray-300">Please sign in to join the conversation.</p>
                </div>
              )}

              <div className="space-y-4">
                {comments.length > 0 ? (
                  comments.map(comment => (
                    <CommentCard 
                      key={comment.id}
                      comment={comment}
                      contentId={content.id}
                      currentUserId={user?.uid}
                    />
                  ))
                ) : (
                  <div className="text-center py-10">
                    <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No comments yet. Be the first to start the discussion!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
`
fs.writeFileSync('src/screens/content/ContentDetailScreen.tsx', code);
console.log('Written to src/screens/content/ContentDetailScreen.tsx');
