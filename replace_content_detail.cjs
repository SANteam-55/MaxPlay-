const fs = require('fs');

const code = `import React, { useState, useEffect, useMemo } from 'react';
import { Play, Plus, Check, Share2, Download, Star, Tv, Film, MessageSquare, Send, X, Info, HelpCircle, ChevronDown } from 'lucide-react';
import { Content } from '../../types';
import { InlinePlayer } from '../../components/player/InlinePlayer';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToMyList, toggleMyListItem, subscribeToComments, addCommentToContent, saveUserProgress, getUserProgress } from '../../lib/db';
import { formatDistanceToNow } from 'date-fns';

interface ContentDetailScreenProps {
  content: Content | null;
  onBack: () => void;
  onStartDownload?: (content: Content) => void;
}

export const ContentDetailScreen: React.FC<ContentDetailScreenProps> = ({ content, onBack, onStartDownload }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'forYou' | 'comments'>('forYou');
  
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0);
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState(0);
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);
  
  const [isMyList, setIsMyList] = useState(false);
  const [myListDocId, setMyListDocId] = useState<string | null>(null);
  
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [activeLanguage, setActiveLanguage] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);

  const isSeries = content?.type === 'series';
  const isMovie = content?.type === 'movie';

  // Load progress
  useEffect(() => {
    if (!user || !content) return;
    const fetchProgress = async () => {
      const isEpi = isSeries ? \`S\${selectedSeasonIndex}E\${selectedEpisodeIndex}\` : (isMovie && content.episodesList?.length ? \`P\${selectedPartIndex}\` : undefined);
      const pos = await getUserProgress(user.uid, content.id, isEpi);
      if (pos > 0) setPlaybackPosition(pos);
    };
    fetchProgress();
  }, [user, content, selectedSeasonIndex, selectedEpisodeIndex, selectedPartIndex, isSeries, isMovie]);

  // Subscribe to My List
  useEffect(() => {
    if (!user || !content) return;
    const unsubscribe = subscribeToMyList(user.uid, (items) => {
      const match = items.find(item => item.contentId === content.id);
      setIsMyList(!!match);
      setMyListDocId(match?.id || null);
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

  // --- Derive Active Playback Data ---
  let playerTitle = content.title;
  let playerVideoUrl = content.videoUrl;
  let playerQualityLinks = content.qualityLinks;
  let playerVideoSources = content.videoSources;
  let playerChunks = content.chunks;
  let hasNext = false;
  let activeEpisodeList: any[] = [];
  let totalEpisodes = 0;

  if (isSeries && content.seasonsData && content.seasonsData[selectedSeasonIndex]) {
    const season = content.seasonsData[selectedSeasonIndex];
    activeEpisodeList = season.episodes || [];
    totalEpisodes = activeEpisodeList.length;
    if (activeEpisodeList[selectedEpisodeIndex]) {
      const ep = activeEpisodeList[selectedEpisodeIndex];
      playerTitle = \`\${content.title} - \${season.title || \`Season \${selectedSeasonIndex + 1}\`} : \${ep.title}\`;
      if (ep.videoUrl) playerVideoUrl = ep.videoUrl;
      if (ep.qualityLinks) playerQualityLinks = ep.qualityLinks;
      if (ep.videoSources) playerVideoSources = ep.videoSources;
      
      if (activeEpisodeList.length > selectedEpisodeIndex + 1) {
        hasNext = true;
      } else if (content.seasonsData.length > selectedSeasonIndex + 1 && content.seasonsData[selectedSeasonIndex + 1].episodes?.length > 0) {
        hasNext = true;
      }
    }
  } else if (isMovie && content.episodesList && content.episodesList.length > 0) {
    activeEpisodeList = content.episodesList;
    totalEpisodes = activeEpisodeList.length;
    const part = activeEpisodeList[selectedPartIndex];
    if (part) {
      playerTitle = \`\${content.title} - \${part.title}\`;
      if (part.videoUrl) playerVideoUrl = part.videoUrl;
      if (part.qualityLinks) playerQualityLinks = part.qualityLinks;
      if (part.videoSources) playerVideoSources = part.videoSources;
      
      if (activeEpisodeList.length > selectedPartIndex + 1) {
        hasNext = true;
      }
    }
  }

  // Find available languages from current active item
  const availableLanguages = useMemo(() => {
    if (playerVideoSources && typeof playerVideoSources === 'object') {
      return Object.keys(playerVideoSources);
    }
    return [];
  }, [playerVideoSources]);

  useEffect(() => {
    if (!activeLanguage && availableLanguages.length > 0) {
      setActiveLanguage(availableLanguages[0]);
    }
  }, [availableLanguages, activeLanguage]);

  // --- Handlers ---
  const handleMyListToggle = async () => {
    if (!user) {
      alert("Please login to add to My List");
      return;
    }
    await toggleMyListItem(user.uid, content, isMyList, myListDocId);
  };

  const handleNextEpisode = () => {
    setPlaybackPosition(0);
    if (isSeries && content.seasonsData) {
      const season = content.seasonsData[selectedSeasonIndex];
      if (season.episodes && season.episodes.length > selectedEpisodeIndex + 1) {
        setSelectedEpisodeIndex(prev => prev + 1);
      } else if (content.seasonsData.length > selectedSeasonIndex + 1) {
        setSelectedSeasonIndex(prev => prev + 1);
        setSelectedEpisodeIndex(0);
      }
    } else if (isMovie && content.episodesList && content.episodesList.length > selectedPartIndex + 1) {
      setSelectedPartIndex(prev => prev + 1);
    }
  };

  const handleProgress = (time: number, isFinished?: boolean) => {
    if (!user || !content || time < 5) return;
    const isEpi = isSeries ? \`S\${selectedSeasonIndex}E\${selectedEpisodeIndex}\` : (isMovie && content.episodesList?.length ? \`P\${selectedPartIndex}\` : undefined);
    if (Math.floor(time) % 15 === 0 || isFinished) {
      saveUserProgress(user.uid, content.id, time, content.duration, isEpi);
    }
  };

  const submitComment = async () => {
    if (!user || !newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      await addCommentToContent(content.id, user.uid, user.email || 'Anonymous', newComment.trim());
      setNewComment('');
    } catch (e) {
      console.error(e);
      alert('Failed to post comment.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const posterOrBackdrop = content.backdropUrl || content.posterUrl;

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white w-full overflow-x-hidden pb-24 font-sans">
      
      {/* 1. Video Player Area - FIXED TOP */}
      <div className="sticky top-0 z-50 w-full bg-black shadow-2xl" style={{ aspectRatio: '16/9', maxHeight: '40vh' }}>
        <InlinePlayer
          videoUrl={playerVideoUrl}
          qualityLinks={playerQualityLinks}
          videoSources={playerVideoSources}
          chunks={playerChunks}
          posterUrl={posterOrBackdrop}
          title={playerTitle || 'Video'}
          initialTime={playbackPosition}
          autoPlay={true}
          activeLanguage={activeLanguage}
          onLanguageChange={setActiveLanguage}
          onProgress={handleProgress}
          onNext={hasNext ? handleNextEpisode : undefined}
          onBack={onBack}
        />
      </div>

      <div className="px-4 sm:px-6 pt-5 pb-6 bg-[#050505] z-10">
        
        {/* Title */}
        <div className="flex items-start justify-between mb-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {content.title}
            </h1>
            <button onClick={() => setShowDetails(true)} className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 ml-4 shrink-0 mt-1">
                <span className="text-sm font-medium">Info</span>
                <Info className="w-4 h-4" />
            </button>
        </div>
        
        {/* Badges / Metadata */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/60 mb-6">
          <div className="flex items-center gap-1.5 text-purple-400 font-semibold">
              {isSeries ? <Tv className="w-4 h-4" /> : <Film className="w-4 h-4" />}
              <span>{isSeries ? 'Series' : 'Movie'}</span>
          </div>
          <span className="text-white/30">|</span>
          {content.rating && (
            <div className="flex items-center gap-1 text-amber-400 font-semibold">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{content.rating}</span>
            </div>
          )}
          <span className="text-white/30">|</span>
          {content.year && <span>{content.year}</span>}
          <span className="text-white/30">|</span>
          {content.country && <span>{content.country}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/50 mb-6">
            <span>{content.genres?.join(', ')}</span>
            <span className="text-white/30">|</span>
            {isSeries && <span className="text-purple-400 font-semibold">{content.seasonsData?.length || 0} Seasons</span>}
            {isMovie && !content.episodesList?.length && <span className="text-purple-400 font-semibold">Standalone</span>}
        </div>

        {/* Action Buttons Row */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-8">
          <button 
            onClick={handleMyListToggle}
            className="flex flex-col items-center justify-center gap-2 aspect-square max-h-[80px] rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
          >
            {isMyList ? <Check className="w-5 h-5 text-purple-400" /> : <Plus className="w-5 h-5 text-purple-400" />}
            <span className="font-medium text-[11px] sm:text-xs text-white/80">Saved</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-2 aspect-square max-h-[80px] rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
            <Share2 className="w-5 h-5 text-white/80" />
            <span className="font-medium text-[11px] sm:text-xs text-white/80">Share</span>
          </button>
          <button onClick={() => setActiveTab('comments')} className="flex flex-col items-center justify-center gap-2 aspect-square max-h-[80px] rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
            <MessageSquare className="w-5 h-5 text-pink-400" />
            <span className="font-medium text-[11px] sm:text-xs text-white/80">Comment ({comments.length})</span>
          </button>
          <button onClick={() => setShowDetails(true)} className="flex flex-col items-center justify-center gap-2 aspect-square max-h-[80px] rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
            <Info className="w-5 h-5 text-white/80" />
            <span className="font-medium text-[11px] sm:text-xs text-white/80">View details</span>
          </button>
        </div>

        {/* Resources / Episodes Box */}
        {(activeEpisodeList.length > 0 || availableLanguages.length > 0) && (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-5 mb-8">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base sm:text-lg">Resources</span>
                        <HelpCircle className="w-4 h-4 text-white/40" />
                    </div>
                    <div className="text-[11px] sm:text-xs text-white/50">
                        Uploaded by <span className="font-semibold text-white/80">MaxPlay Admin</span>
                    </div>
                </div>

                {availableLanguages.length > 0 && (
                    <div className="relative mb-6 inline-block">
                        <select 
                            value={activeLanguage}
                            onChange={(e) => setActiveLanguage(e.target.value)}
                            className="appearance-none bg-white/5 border border-white/10 hover:border-white/20 rounded-xl pl-4 pr-10 py-2.5 text-sm font-semibold focus:outline-none cursor-pointer transition-colors text-white"
                        >
                            {availableLanguages.map(l => (
                                <option key={l} value={l} className="bg-[#111] text-white">{l}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
                    </div>
                )}

                {/* Seasons List (if series) */}
                {isSeries && content.seasonsData && content.seasonsData.length > 1 && (
                     <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-5 pb-2">
                        {content.seasonsData.map((s, idx) => (
                            <button
                                key={idx}
                                onClick={() => { setSelectedSeasonIndex(idx); setSelectedEpisodeIndex(0); setPlaybackPosition(0); }}
                                className={\`whitespace-nowrap px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors \${selectedSeasonIndex === idx ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}\`}
                            >
                                {s.title || \`Season \${idx + 1}\`}
                            </button>
                        ))}
                    </div>
                )}

                {/* Episodes Grid */}
                {totalEpisodes > 0 && (
                    <>
                        <h3 className="text-sm font-medium text-white/60 mb-3">{isSeries ? 'Episodes' : 'Parts'} ({totalEpisodes})</h3>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4">
                            {activeEpisodeList.map((ep, idx) => {
                                const isCurrent = isSeries ? selectedEpisodeIndex === idx : selectedPartIndex === idx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => { 
                                            if (isSeries) setSelectedEpisodeIndex(idx);
                                            else setSelectedPartIndex(idx);
                                            setPlaybackPosition(0); 
                                            window.scrollTo({ top: 0, behavior: 'smooth' }); 
                                        }}
                                        className={\`aspect-square flex items-center justify-center rounded-2xl text-base sm:text-lg font-bold transition-all shadow-lg \${isCurrent ? 'bg-purple-500 text-white shadow-purple-500/40 scale-105' : 'bg-white/5 text-white/70 border border-white/5 hover:bg-white/10 hover:border-white/20'}\`}
                                    >
                                        {(idx + 1).toString().padStart(2, '0')}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        )}

      </div>

      {/* 3. Tabs (For You vs Comments) */}
      <div className="px-4 sm:px-6 mt-2">
        <div className="flex items-center gap-6 border-b border-white/10 mb-6">
            <button 
                onClick={() => setActiveTab('forYou')}
                className={\`pb-3 font-bold text-sm sm:text-base transition-all border-b-2 \${activeTab === 'forYou' ? 'border-purple-500 text-white' : 'border-transparent text-white/40 hover:text-white/70'}\`}
            >
                For You
            </button>
            <button 
                onClick={() => setActiveTab('comments')}
                className={\`pb-3 font-bold text-sm sm:text-base transition-all border-b-2 \${activeTab === 'comments' ? 'border-purple-500 text-white' : 'border-transparent text-white/40 hover:text-white/70'}\`}
            >
                Comments ({comments.length})
            </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'forYou' && (
            <div className="animate-in fade-in duration-300">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {/* Placeholder for related content to match screenshot */}
                    {[1,2,3].map(i => (
                        <div key={i} className="aspect-video rounded-xl bg-white/5 border border-white/5 relative overflow-hidden group cursor-pointer">
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                               <div className="w-3/4 h-2 bg-white/20 rounded-full" />
                           </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'comments' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            {/* Input Box */}
            <div className="flex gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center shrink-0">
                <span className="font-bold text-sm text-purple-200">
                  {user ? user.email?.charAt(0).toUpperCase() : '?'}
                </span>
              </div>
              <div className="flex-1 relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={user ? "Add a public comment..." : "Login to comment..."}
                  disabled={!user || isSubmittingComment}
                  className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 resize-none transition-all disabled:opacity-50"
                  rows={2}
                />
                <button
                  onClick={submitComment}
                  disabled={!user || !newComment.trim() || isSubmittingComment}
                  className="absolute bottom-2 right-2 p-1.5 bg-purple-600 rounded-lg text-white hover:bg-purple-500 disabled:opacity-50 disabled:bg-white/10 disabled:text-white/30 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            {comments.length === 0 ? (
              <div className="text-center py-10 text-white/40">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No comments yet. Be the first!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
                        <span className="font-bold text-xs text-purple-400">{comment.userEmail?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-semibold text-sm text-white/90">@{comment.userEmail?.split('@')[0]}</span>
                            <span className="text-[10px] text-white/40">{formatDistanceToNow(comment.createdAt, { addSuffix: true })}</span>
                        </div>
                        <p className="text-sm text-white/80 whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-[#111] border border-white/10 w-full max-w-lg rounded-3xl p-6 relative animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95">
                  <button onClick={() => setShowDetails(false)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                      <X className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-bold mb-4 pr-8">{content.title}</h2>
                  <p className="text-white/70 leading-relaxed text-sm mb-6">{content.description}</p>
                  
                  {content.genres && (
                      <div className="mb-4">
                          <h4 className="text-xs text-white/40 uppercase tracking-wider mb-2">Genres</h4>
                          <div className="flex gap-2 flex-wrap">
                              {content.genres.map(g => (
                                  <span key={g} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/70">{g}</span>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

    </div>
  );
};
`
fs.writeFileSync('src/screens/content/ContentDetailScreen.tsx', code);
