import React, { useState, useRef, useEffect } from 'react';
import { 
  Heart, 
  CornerDownRight, 
  ChevronDown, 
  ChevronUp, 
  MoreVertical, 
  Flag, 
  BadgeCheck, 
  Trash2, 
  Send, 
  X, 
  Loader2,
  Smile
} from 'lucide-react';
import { CommentItem, CommentReplyItem } from '../../types';
import { formatRelativeTime } from '../../utils/helpers';

interface CommentCardProps {
  comment: CommentItem;
  currentUserId?: string;
  currentUserPhoto?: string;
  currentUserName?: string;
  onLike?: (id: string) => void;
  onLikeReply?: (commentId: string, replyId: string) => void;
  onReply?: (commentId: string, text: string, replyToUsername?: string) => Promise<void> | void;
  onDeleteComment?: (commentId: string) => Promise<void> | void;
  onDeleteReply?: (commentId: string, replyId: string) => Promise<void> | void;
  onReport?: (comment: CommentItem, reply?: CommentReplyItem) => void;
}

export const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  currentUserId,
  currentUserPhoto,
  currentUserName,
  onLike,
  onLikeReply,
  onReply,
  onDeleteComment,
  onDeleteReply,
  onReport,
}) => {
  const hasUserLiked = currentUserId && comment.likedBy?.includes(currentUserId);
  const [likes, setLikes] = useState(comment.likes || 0);
  const [isLiked, setIsLiked] = useState(Boolean(hasUserLiked));
  const [showReplies, setShowReplies] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  
  // YouTube-Style Inline Reply Box State
  const [isReplying, setIsReplying] = useState(false);
  const [replyTargetUser, setReplyTargetUser] = useState<string>(comment.username);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Sync like state when comment prop updates
  useEffect(() => {
    setLikes(comment.likes || 0);
    setIsLiked(Boolean(currentUserId && comment.likedBy?.includes(currentUserId)));
  }, [comment.likes, comment.likedBy, currentUserId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Focus textarea when replying starts
  useEffect(() => {
    if (isReplying && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [isReplying]);

  const replies = comment.replies || [];
  const hasReplies = replies.length > 0;

  const isCurrentUser = Boolean(currentUserId && comment.userId && comment.userId === currentUserId);
  const avatarToDisplay = (isCurrentUser && currentUserPhoto) ? currentUserPhoto : comment.avatarUrl;

  const handleLike = () => {
    if (isLiked) {
      setLikes((prev) => Math.max(0, prev - 1));
      setIsLiked(false);
    } else {
      setLikes((prev) => prev + 1);
      setIsLiked(true);
    }
    onLike?.(comment.id);
  };

  const handleOpenReplyBox = (targetUser: string) => {
    setReplyTargetUser(targetUser);
    setIsReplying(true);
    // Don't inject @username directly into text unless needed, or keep clean prefix
  };

  const handleCancelReply = () => {
    setIsReplying(false);
    setReplyText('');
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || isSubmittingReply) return;
    setIsSubmittingReply(true);
    try {
      if (onReply) {
        await onReply(comment.id, replyText.trim(), replyTargetUser);
      }
      setReplyText('');
      setIsReplying(false);
      setShowReplies(true); // Auto-expand replies to view newly posted reply
    } catch (e) {
      console.error('Error submitting reply:', e);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmitReply();
    }
  };

  // Real live relative time calculation
  const displayTime = formatRelativeTime(comment.createdAt, comment.time || 'Just now');

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-[#131317] p-3.5 sm:p-4 text-left border border-white/5 transition-all hover:border-white/10 shadow-sm relative group/card">
      {/* Primary Comment Row */}
      <div className="flex items-start gap-3">
        {/* User Profile Avatar */}
        <div className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#8B5CF6] via-[#6366F1] to-[#06B6D4] flex items-center justify-center text-xs font-bold text-white shadow-md ring-1 ring-white/10">
          {avatarToDisplay ? (
            <img
              src={avatarToDisplay || undefined}
              alt={comment.username || 'User'}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            (comment.username || 'U').charAt(0).toUpperCase()
          )}
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* User Info & Live Relative Time & 3-Dots Menu */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-xs sm:text-[13px] font-bold truncate ${comment.userId === 'admin' ? 'text-[#10B981]' : (isCurrentUser ? 'text-purple-300 font-extrabold' : 'text-white')}`}>
                {(comment.username || 'Unknown').startsWith('@') ? (comment.username || 'Unknown') : `@${comment.username || 'Unknown'}`}
              </span>
              {comment.userId === 'admin' && (
                <span className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-500/20 text-[#10B981] text-[9px] font-bold border border-emerald-500/30">
                  <BadgeCheck className="h-3 w-3 text-[#10B981]" />
                  <span>Admin</span>
                </span>
              )}
              {isCurrentUser && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  You
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {/* Accurate YouTube-Style Live Elapsed Time */}
              <span className="text-[10px] sm:text-[11px] text-white/40 font-medium">{displayTime}</span>
              
              {/* 3-Dots Menu Button */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="rounded-full p-1 text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="More actions"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 top-6 z-50 w-36 rounded-xl bg-[#1C1C22] border border-white/10 p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                    {isCurrentUser && onDeleteComment && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          if (window.confirm('Delete your comment?')) {
                            onDeleteComment(comment.id);
                          }
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/15 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onReport?.(comment);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/15 transition cursor-pointer"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      <span>Report</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Comment Body Text */}
          <p className="mt-1 text-xs sm:text-sm text-white/90 leading-relaxed break-words font-normal">
            {comment.text}
          </p>

          {/* Action Row: Like & YouTube-Style Reply Trigger */}
          <div className="mt-2.5 flex items-center gap-4 text-xs text-white/50">
            {/* Like Button */}
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all cursor-pointer ${
                isLiked ? 'text-rose-400 font-bold bg-rose-500/10' : 'hover:text-white hover:bg-white/5'
              }`}
              title="Like comment"
            >
              <Heart
                className={`h-3.5 w-3.5 transition-transform ${
                  isLiked ? 'fill-rose-500 text-rose-500 scale-110' : ''
                }`}
              />
              <span className="text-[11px]">{likes > 0 ? likes : 'Like'}</span>
            </button>

            {/* YouTube Reply Button */}
            <button
              type="button"
              onClick={() => handleOpenReplyBox(comment.username)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full hover:text-purple-300 hover:bg-purple-500/10 text-white/60 transition-colors cursor-pointer text-[11px] font-bold"
              title={`Reply to @${comment.username}`}
            >
              <CornerDownRight className="h-3.5 w-3.5" />
              <span>Reply</span>
            </button>
          </div>
        </div>
      </div>

      {/* YouTube-Style Inline Reply Composer */}
      {isReplying && (
        <div className="ml-8 sm:ml-11 mt-2 p-3 rounded-xl bg-[#1A1A22] border border-purple-500/30 shadow-lg shadow-purple-950/20 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Target username indicator */}
          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/5">
            <span className="text-[11px] text-white/50 flex items-center gap-1">
              <span>Replying to</span>
              <span className="text-purple-400 font-bold">
                {replyTargetUser.startsWith('@') ? replyTargetUser : `@${replyTargetUser}`}
              </span>
            </span>
            <button
              onClick={handleCancelReply}
              className="text-white/40 hover:text-white p-0.5 rounded transition cursor-pointer"
              title="Cancel reply"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center shrink-0 text-white text-[11px] font-bold ring-1 ring-white/10 overflow-hidden">
              {currentUserPhoto ? (
                <img src={currentUserPhoto} alt="You" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                (currentUserName || 'U').charAt(0).toUpperCase()
              )}
            </div>

            <div className="flex-1 min-w-0">
              <textarea
                ref={replyInputRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Add a public reply to @${replyTargetUser}...`}
                rows={2}
                disabled={isSubmittingReply}
                className="w-full bg-[#121216] border border-white/10 focus:border-purple-400 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none resize-none transition"
              />

              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-white/40 hidden sm:inline">
                  Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/70 font-mono text-[9px]">Ctrl+Enter</kbd> to post
                </span>
                
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleCancelReply}
                    disabled={isSubmittingReply}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim() || isSubmittingReply}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-md shadow-purple-900/40 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    {isSubmittingReply ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Reply</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YouTube-Style Collapsible Replies Thread */}
      {hasReplies && (
        <div className="ml-6 sm:ml-9 mt-1 flex flex-col gap-2">
          {/* View / Hide Replies Toggle Button */}
          <button
            type="button"
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition cursor-pointer w-fit py-1 px-2 rounded-full hover:bg-purple-500/10"
          >
            {showReplies ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            <span>
              {showReplies ? 'Hide replies' : `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
            </span>
          </button>

          {/* Replies List */}
          {showReplies && (
            <div className="flex flex-col gap-2.5 border-l-2 border-purple-500/20 pl-3 sm:pl-4 py-1">
              {replies.map((reply: CommentReplyItem) => (
                <NestedReplyItem
                  key={reply.id}
                  reply={reply}
                  commentId={comment.id}
                  parentComment={comment}
                  parentUsername={comment.username}
                  currentUserId={currentUserId}
                  currentUserPhoto={currentUserPhoto}
                  currentUserName={currentUserName}
                  onLikeReply={onLikeReply}
                  onOpenReplyBox={handleOpenReplyBox}
                  onDeleteReply={onDeleteReply}
                  onReport={onReport}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface NestedReplyProps {
  reply: CommentReplyItem;
  commentId: string;
  parentComment: CommentItem;
  parentUsername: string;
  currentUserId?: string;
  currentUserPhoto?: string;
  currentUserName?: string;
  onLikeReply?: (commentId: string, replyId: string) => void;
  onOpenReplyBox?: (targetUser: string) => void;
  onDeleteReply?: (commentId: string, replyId: string) => Promise<void> | void;
  onReport?: (comment: CommentItem, reply?: CommentReplyItem) => void;
}

const NestedReplyItem: React.FC<NestedReplyProps> = ({
  reply,
  commentId,
  parentComment,
  parentUsername,
  currentUserId,
  currentUserPhoto,
  currentUserName,
  onLikeReply,
  onOpenReplyBox,
  onDeleteReply,
  onReport,
}) => {
  const hasUserLiked = currentUserId && reply.likedBy?.includes(currentUserId);
  const [likes, setLikes] = useState(reply.likes || 0);
  const [isLiked, setIsLiked] = useState(Boolean(hasUserLiked));
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLikes(reply.likes || 0);
    setIsLiked(Boolean(currentUserId && reply.likedBy?.includes(currentUserId)));
  }, [reply.likes, reply.likedBy, currentUserId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const isCurrentUser = Boolean(currentUserId && reply.userId && reply.userId === currentUserId);
  const avatarToDisplay = (isCurrentUser && currentUserPhoto) ? currentUserPhoto : reply.avatarUrl;

  const handleLike = () => {
    if (isLiked) {
      setLikes((prev) => Math.max(0, prev - 1));
      setIsLiked(false);
    } else {
      setLikes((prev) => prev + 1);
      setIsLiked(true);
    }
    onLikeReply?.(commentId, reply.id);
  };

  const targetReplyUser = reply.replyToUsername || parentUsername;
  const replyTime = formatRelativeTime(reply.createdAt, reply.time || 'Just now');

  return (
    <div className="flex items-start gap-2.5 pt-1 group">
      {/* Reply User Avatar */}
      <div className="h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center text-[10px] font-bold text-white shadow ring-1 ring-white/10">
        {avatarToDisplay ? (
          <img
            src={avatarToDisplay || undefined}
            alt={reply.username || 'User'}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          (reply.username || 'U').charAt(0).toUpperCase()
        )}
      </div>

      {/* Reply Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-xs font-bold truncate ${reply.userId === 'admin' ? 'text-[#10B981]' : (isCurrentUser ? 'text-purple-300 font-extrabold' : 'text-white')}`}>
              {(reply.username || 'Unknown').startsWith('@') ? (reply.username || 'Unknown') : `@${reply.username || 'Unknown'}`}
            </span>
            {reply.userId === 'admin' && (
              <span className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-500/20 text-[#10B981] text-[8px] font-bold border border-emerald-500/30">
                <BadgeCheck className="h-2.5 w-2.5 text-[#10B981]" />
                <span>Admin</span>
              </span>
            )}
            {isCurrentUser && (
              <span className="text-[8px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                You
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9px] text-white/40">{replyTime}</span>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="rounded-full p-0.5 text-white/40 hover:text-white transition cursor-pointer"
                title="More actions"
              >
                <MoreVertical className="h-3 w-3" />
              </button>

                {showMenu && (
                  <div className="absolute right-0 top-5 z-50 w-32 rounded-xl bg-[#1C1C22] border border-white/10 p-1 shadow-xl">
                    {isCurrentUser && onDeleteReply && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          if (window.confirm('Delete your reply?')) {
                            onDeleteReply(commentId, reply.id);
                          }
                        }}
                        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/15 transition cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onReport?.(parentComment, reply);
                      }}
                      className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-amber-400 hover:bg-amber-500/15 transition cursor-pointer"
                    >
                      <Flag className="h-3 w-3" />
                      <span>Report</span>
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Text with YouTube-style @replyTo user highlight */}
        <p className="mt-0.5 text-xs text-white/85 leading-relaxed break-words">
          {targetReplyUser && (
            <span className="inline-block font-bold text-purple-400 hover:underline mr-1.5 select-none text-[11px] bg-purple-500/10 px-1.5 py-0.2 rounded">
              {targetReplyUser.startsWith('@') ? targetReplyUser : `@${targetReplyUser}`}
            </span>
          )}
          {reply.text}
        </p>

        {/* Reply Actions */}
        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-white/50">
          {/* Like */}
          <button
            type="button"
            onClick={handleLike}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full transition cursor-pointer ${
              isLiked ? 'text-rose-400 font-bold bg-rose-500/10' : 'hover:text-white hover:bg-white/5'
            }`}
            title="Like reply"
          >
            <Heart
              className={`h-3 w-3 ${
                isLiked ? 'fill-rose-500 text-rose-500 scale-110' : ''
              }`}
            />
            <span>{likes > 0 ? likes : 'Like'}</span>
          </button>

          {/* Reply back to this specific person */}
          <button
            type="button"
            onClick={() => onOpenReplyBox?.(reply.username)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full hover:text-purple-300 hover:bg-purple-500/10 text-white/50 transition-colors cursor-pointer font-bold"
            title={`Reply to @${reply.username}`}
          >
            <CornerDownRight className="h-3 w-3" />
            <span>Reply</span>
          </button>
        </div>
      </div>
    </div>
  );
};


