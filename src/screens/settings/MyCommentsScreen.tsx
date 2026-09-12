import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MessageSquare, 
  MessageCircle, 
  Heart, 
  Trash2, 
  Play, 
  Star, 
  Calendar, 
  Film, 
  Tv, 
  CornerDownRight, 
  Loader2, 
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useContent } from '../../hooks/useContent';
import { 
  getUserAllCommentsAndActivity, 
  deleteCommentFromContent, 
  deleteReplyFromComment, 
  toggleCommentLike, 
  toggleReplyLike,
  UserCommentsFullActivity 
} from '../../services/contentService';
import { ContentItem, CommentItem, CommentReplyItem } from '../../types';
import { formatRelativeTime } from '../../utils/helpers';

interface MyCommentsScreenProps {
  onBack: () => void;
  onPlayContent?: (contentId: string) => void;
}

type TabType = 'comments' | 'replies' | 'likes';

export const MyCommentsScreen: React.FC<MyCommentsScreenProps> = ({
  onBack,
  onPlayContent,
}) => {
  const { user } = useAuth();
  const { contentList } = useContent();

  const [activeTab, setActiveTab] = useState<TabType>('comments');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activity, setActivity] = useState<UserCommentsFullActivity>({
    myComments: [],
    myReplies: [],
    myLikes: [],
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getUserAllCommentsAndActivity(user.uid, contentList);
      setActivity(data);
    } catch (err) {
      console.error('Error loading my comments activity:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.uid, contentList]);

  // Handle 1-click Delete My Comment
  const handleDeleteComment = async (contentId: string, commentId: string) => {
    if (!user?.uid) return;
    setDeletingId(commentId);
    try {
      await deleteCommentFromContent(contentId, commentId, user.uid);
      // Optimistic update
      setActivity((prev) => ({
        ...prev,
        myComments: prev.myComments.filter((item) => item.comment.id !== commentId),
      }));
      showToast('Comment deleted successfully');
    } catch (err) {
      console.error('Failed to delete comment:', err);
      showToast('Failed to delete comment');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle 1-click Delete My Reply
  const handleDeleteReply = async (contentId: string, commentId: string, replyId: string) => {
    if (!user?.uid) return;
    setDeletingId(replyId);
    try {
      await deleteReplyFromComment(contentId, commentId, replyId, user.uid);
      // Optimistic update
      setActivity((prev) => ({
        ...prev,
        myReplies: prev.myReplies.filter((item) => item.reply.id !== replyId),
      }));
      showToast('Reply deleted successfully');
    } catch (err) {
      console.error('Failed to delete reply:', err);
      showToast('Failed to delete reply');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle 1-click Unlike
  const handleUnlike = async (contentId: string, commentId: string, replyId?: string) => {
    if (!user?.uid) return;
    const itemKey = replyId || commentId;
    setDeletingId(itemKey);
    try {
      if (replyId) {
        await toggleReplyLike(contentId, commentId, replyId, user.uid);
      } else {
        await toggleCommentLike(contentId, commentId, user.uid);
      }
      // Optimistic update
      setActivity((prev) => ({
        ...prev,
        myLikes: prev.myLikes.filter((item) => (replyId ? item.replyId !== replyId : item.commentId !== commentId)),
      }));
      showToast('Removed from Liked comments');
    } catch (err) {
      console.error('Failed to unlike:', err);
      showToast('Failed to update like');
    } finally {
      setDeletingId(null);
    }
  };

  const totalActivitiesCount = 
    activity.myComments.length + activity.myReplies.length + activity.myLikes.length;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#0A0A0A] p-4 text-left select-none scrollbar-none pb-28 md:pb-12">
      {/* TOP HEADER */}
      <div className="flex items-center justify-between py-2 border-b border-[#1C1C1E] pb-3 sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            type="button"
            className="rounded-full p-2 text-white hover:bg-[#1C1C1E] active:scale-95 transition cursor-pointer"
            title="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-white">My Comments</h2>
              {totalActivitiesCount > 0 && (
                <span className="rounded-full bg-[#8B5CF6]/20 px-2 py-0.5 text-[10px] font-bold text-[#A78BFA] border border-[#8B5CF6]/30">
                  {totalActivitiesCount}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#A1A1AA]">Manage your comments, replies & liked discussions</p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-xl bg-[#141416] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white transition cursor-pointer text-xs font-semibold"
          title="Refresh activities"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-[#8B5CF6]" /> : 'Refresh'}
        </button>
      </div>

      {/* TABS NAVIGATION */}
      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#141416] p-1 border border-[#27272A]">
        <button
          type="button"
          onClick={() => setActiveTab('comments')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'comments'
              ? 'bg-[#8B5CF6] text-white shadow-md shadow-purple-600/30'
              : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Comments</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            activeTab === 'comments' ? 'bg-white/20 text-white' : 'bg-[#27272A] text-[#71717A]'
          }`}>
            {activity.myComments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('replies')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'replies'
              ? 'bg-[#06B6D4] text-black font-extrabold shadow-md shadow-cyan-500/20'
              : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <CornerDownRight className="h-3.5 w-3.5" />
          <span>Replies</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            activeTab === 'replies' ? 'bg-black/20 text-black font-bold' : 'bg-[#27272A] text-[#71717A]'
          }`}>
            {activity.myReplies.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('likes')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'likes'
              ? 'bg-[#EC4899] text-white shadow-md shadow-pink-500/20'
              : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <Heart className="h-3.5 w-3.5" />
          <span>Liked</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            activeTab === 'likes' ? 'bg-white/20 text-white' : 'bg-[#27272A] text-[#71717A]'
          }`}>
            {activity.myLikes.length}
          </span>
        </button>
      </div>

      {/* CONTENT LISTING */}
      <div className="mt-4 flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#8B5CF6]" />
            <p className="mt-3 text-xs font-semibold text-[#A1A1AA]">Fetching your comment history...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: COMMENTS */}
            {activeTab === 'comments' && (
              activity.myComments.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  iconColor="text-[#8B5CF6]"
                  title="No Comments Yet"
                  description="You haven't posted any comments yet. Explore anime, movies or web series and share your thoughts!"
                  onBack={onBack}
                />
              ) : (
                activity.myComments.map(({ comment, content }) => (
                  <div
                    key={comment.id}
                    className="flex flex-col rounded-2xl bg-[#141416] border border-[#27272A] overflow-hidden shadow-lg hover:border-[#3F3F46] transition duration-200"
                  >
                    {/* Horizontal Content Poster Banner */}
                    <HorizontalContentBanner
                      content={content}
                      contentId={comment.contentId}
                      onPlayContent={onPlayContent}
                    />

                    {/* User's Comment Details */}
                    <div className="p-3.5 sm:p-4 bg-[#141416] flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#06B6D4] flex items-center justify-center text-xs font-bold text-white overflow-hidden shadow ring-1 ring-white/10">
                            {(user?.photoURL || comment.avatarUrl) ? (
                              <img
                                src={(user?.photoURL || comment.avatarUrl) || undefined}
                                alt="User"
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              (user?.displayName || comment.username || 'U').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">
                              {user?.displayName || comment.username || 'You'}
                            </span>
                            <span className="text-[10px] text-[#71717A]">
                              {formatRelativeTime(comment.createdAt, comment.time || 'Recently')}
                            </span>
                          </div>
                        </div>

                        {/* 1-Click Delete Button (Only for own comment) */}
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.contentId, comment.id)}
                          disabled={deletingId === comment.id}
                          className="flex items-center gap-1 rounded-xl bg-[#27272A] hover:bg-[#EF4444]/20 text-[#A1A1AA] hover:text-[#EF4444] px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer border border-transparent hover:border-[#EF4444]/30"
                          title="Delete this comment"
                        >
                          {deletingId === comment.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#EF4444]" />
                          ) : (
                            <>
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="text-[11px]">Delete</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Comment Text Content */}
                      <p className="text-xs sm:text-sm text-[#E4E4E7] font-normal leading-relaxed break-words bg-[#1C1C1E]/60 p-3 rounded-xl border border-white/5">
                        {comment.text}
                      </p>

                      {/* Comment Stats Footer */}
                      <div className="flex items-center justify-between text-[11px] text-[#71717A] pt-1">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-[#F43F5E] font-semibold">
                            <Heart className="h-3 w-3 fill-[#F43F5E]" />
                            <span>{comment.likes || 0} Likes</span>
                          </span>
                          {comment.replies && comment.replies.length > 0 && (
                            <span className="flex items-center gap-1 text-[#06B6D4]">
                              <CornerDownRight className="h-3 w-3" />
                              <span>{comment.replies.length} replies</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#52525B]">Public discussion</span>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}

            {/* TAB 2: REPLIES */}
            {activeTab === 'replies' && (
              activity.myReplies.length === 0 ? (
                <EmptyState
                  icon={CornerDownRight}
                  iconColor="text-[#06B6D4]"
                  title="No Replies Yet"
                  description="You haven't replied to any comments yet. Join community discussions on your favorite shows!"
                  onBack={onBack}
                />
              ) : (
                activity.myReplies.map(({ reply, parentCommentId, parentUsername, parentText, content }) => (
                  <div
                    key={reply.id}
                    className="flex flex-col rounded-2xl bg-[#141416] border border-[#27272A] overflow-hidden shadow-lg hover:border-[#3F3F46] transition duration-200"
                  >
                    {/* Horizontal Content Poster Banner */}
                    <HorizontalContentBanner
                      content={content}
                      contentId={reply.contentId || ''}
                      onPlayContent={onPlayContent}
                    />

                    {/* Original Parent Comment Quote */}
                    <div className="px-3.5 pt-3 pb-1 bg-[#18181B] border-b border-[#27272A]/50 text-xs text-[#A1A1AA]">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8B5CF6] mb-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>Replying to {reply.replyToUsername ? `@${reply.replyToUsername}` : `@${parentUsername}`}</span>
                      </div>
                      {parentText && (
                        <p className="text-[11px] text-[#71717A] italic line-clamp-1 pl-2 border-l-2 border-[#8B5CF6]/50">
                          "{parentText}"
                        </p>
                      )}
                    </div>

                    {/* User's Reply Content */}
                    <div className="p-3.5 sm:p-4 bg-[#141416] flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#06B6D4] to-[#3B82F6] flex items-center justify-center text-xs font-bold text-white overflow-hidden shadow ring-1 ring-white/10">
                            {(user?.photoURL || reply.avatarUrl) ? (
                              <img
                                src={(user?.photoURL || reply.avatarUrl) || undefined}
                                alt="User"
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              (user?.displayName || reply.username || 'U').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">
                              {user?.displayName || reply.username || 'You'}
                            </span>
                            <span className="text-[10px] text-[#71717A]">
                              {formatRelativeTime(reply.createdAt, reply.time || 'Recently')}
                            </span>
                          </div>
                        </div>

                        {/* 1-Click Delete Reply Button (Only for own reply) */}
                        <button
                          type="button"
                          onClick={() => handleDeleteReply(reply.contentId || '', parentCommentId, reply.id)}
                          disabled={deletingId === reply.id}
                          className="flex items-center gap-1 rounded-xl bg-[#27272A] hover:bg-[#EF4444]/20 text-[#A1A1AA] hover:text-[#EF4444] px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer border border-transparent hover:border-[#EF4444]/30"
                          title="Delete this reply"
                        >
                          {deletingId === reply.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#EF4444]" />
                          ) : (
                            <>
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="text-[11px]">Delete</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Reply Text */}
                      <p className="text-xs sm:text-sm text-[#E4E4E7] font-normal leading-relaxed break-words bg-[#1C1C1E]/60 p-3 rounded-xl border border-white/5">
                        {reply.text}
                      </p>

                      {/* Reply Likes Info */}
                      <div className="flex items-center justify-between text-[11px] text-[#71717A] pt-1">
                        <span className="flex items-center gap-1 text-[#F43F5E] font-semibold">
                          <Heart className="h-3 w-3 fill-[#F43F5E]" />
                          <span>{reply.likes || 0} Likes</span>
                        </span>
                        <span className="text-[10px] text-[#52525B]">Nested discussion</span>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}

            {/* TAB 3: LIKED */}
            {activeTab === 'likes' && (
              activity.myLikes.length === 0 ? (
                <EmptyState
                  icon={Heart}
                  iconColor="text-[#EC4899]"
                  title="No Liked Comments"
                  description="Comments or replies you like will show up here so you can easily reference them later."
                  onBack={onBack}
                />
              ) : (
                activity.myLikes.map(({ item, type, contentId, commentId, replyId, content }) => (
                  <div
                    key={`${commentId}-${replyId || 'c'}`}
                    className="flex flex-col rounded-2xl bg-[#141416] border border-[#27272A] overflow-hidden shadow-lg hover:border-[#3F3F46] transition duration-200"
                  >
                    {/* Horizontal Content Poster Banner */}
                    <HorizontalContentBanner
                      content={content}
                      contentId={contentId}
                      onPlayContent={onPlayContent}
                    />

                    {/* Liked Comment Content */}
                    <div className="p-3.5 sm:p-4 bg-[#141416] flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] flex items-center justify-center text-xs font-bold text-white overflow-hidden shadow ring-1 ring-white/10">
                            {item.avatarUrl ? (
                              <img
                                src={item.avatarUrl || undefined}
                                alt={item.username}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              (item.username || 'U').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">
                              {item.username || 'Community Member'}
                            </span>
                            <span className="text-[10px] text-[#71717A]">
                              {type === 'reply' ? 'Reply' : 'Comment'} • {formatRelativeTime(item.createdAt, item.time || 'Recently')}
                            </span>
                          </div>
                        </div>

                        {/* Unlike Toggle Button (User can remove their own like) */}
                        <button
                          type="button"
                          onClick={() => handleUnlike(contentId, commentId, replyId)}
                          disabled={deletingId === (replyId || commentId)}
                          className="flex items-center gap-1.5 rounded-xl bg-[#EC4899]/15 hover:bg-[#EC4899]/25 text-[#EC4899] px-2.5 py-1.5 text-xs font-bold transition cursor-pointer border border-[#EC4899]/30 active:scale-95"
                          title="Remove like"
                        >
                          {deletingId === (replyId || commentId) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#EC4899]" />
                          ) : (
                            <>
                              <Heart className="h-3.5 w-3.5 fill-[#EC4899]" />
                              <span className="text-[11px]">Liked</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Tag preview if it was a reply */}
                      {item.replyToUsername && (
                        <span className="text-[10px] font-semibold text-[#8B5CF6]">
                          Replying to @{item.replyToUsername}
                        </span>
                      )}

                      {/* Liked Text Content */}
                      <p className="text-xs sm:text-sm text-[#E4E4E7] font-normal leading-relaxed break-words bg-[#1C1C1E]/60 p-3 rounded-xl border border-white/5">
                        {item.text}
                      </p>

                      {/* Total Likes */}
                      <div className="flex items-center justify-between text-[11px] text-[#71717A] pt-1">
                        <span className="flex items-center gap-1 text-[#EC4899] font-semibold">
                          <Heart className="h-3 w-3 fill-[#EC4899]" />
                          <span>{item.likes} Total Likes</span>
                        </span>
                        <span className="text-[10px] text-[#52525B]">Tap 'Liked' to unlike</span>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </>
        )}
      </div>

      {/* FLOATING TOAST FEEDBACK */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl bg-[#1C1C1E] px-4 py-3 text-xs font-bold text-white border border-[#3F3F46] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

// Sub-Component: Horizontal Content Poster Banner
interface HorizontalContentBannerProps {
  content?: ContentItem;
  contentId: string;
  onPlayContent?: (contentId: string) => void;
}

const HorizontalContentBanner: React.FC<HorizontalContentBannerProps> = ({
  content,
  contentId,
  onPlayContent,
}) => {
  const title = content?.title || `Show #${contentId}`;
  const posterImg = content?.backdropUrl || content?.posterUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80';
  const rating = content?.rating || 8.5;
  const year = content?.year || 2024;
  const type = content?.type || 'anime';
  const genres = content?.genres || ['Action', 'Drama'];

  return (
    <div 
      onClick={() => onPlayContent && contentId && onPlayContent(contentId)}
      className="relative h-28 sm:h-32 w-full overflow-hidden bg-[#18181B] cursor-pointer group select-none"
    >
      {/* Background Horizontal Backdrop / Poster */}
      <img
        src={posterImg || undefined}
        alt={title}
        className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-75"
        referrerPolicy="no-referrer"
      />

      {/* Gradient Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141416] via-transparent to-black/40" />

      {/* Foreground Content Info */}
      <div className="absolute inset-0 p-3 sm:p-4 flex flex-col justify-between z-10">
        {/* Top Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="rounded-md bg-[#8B5CF6] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm">
            {type}
          </span>
          <span className="flex items-center gap-0.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-[#F59E0B] backdrop-blur-sm">
            <Star className="h-2.5 w-2.5 fill-[#F59E0B]" />
            <span>{rating}</span>
          </span>
          <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-[#D4D4D8] backdrop-blur-sm">
            {year}
          </span>
        </div>

        {/* Bottom Title & Play Prompt */}
        <div className="flex items-end justify-between gap-2">
          <div className="flex-1 overflow-hidden">
            <h3 className="text-sm sm:text-base font-extrabold text-white truncate group-hover:text-[#8B5CF6] transition">
              {title}
            </h3>
            <p className="text-[10px] text-[#A1A1AA] truncate mt-0.5">
              {genres.slice(0, 3).join(' • ')}
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md px-2.5 py-1.5 text-[11px] font-bold text-white group-hover:bg-[#8B5CF6] transition shadow-md shrink-0">
            <Play className="h-3 w-3 fill-white" />
            <span className="hidden xs:inline">Details</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-Component: Empty State
interface EmptyStateProps {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  onBack: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  iconColor,
  title,
  description,
  onBack,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl bg-[#141416] p-8 text-center border border-[#27272A] shadow-xl my-4">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ${iconColor} shadow-inner`}>
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-extrabold text-white">{title}</h3>
      <p className="mt-1.5 text-xs text-[#A1A1AA] max-w-xs leading-relaxed">{description}</p>
      
      <button
        type="button"
        onClick={onBack}
        className="mt-5 flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/25 hover:opacity-95 active:scale-95 transition cursor-pointer"
      >
        <Film className="h-3.5 w-3.5" />
        <span>Explore Shows & Movies</span>
      </button>
    </div>
  );
};
