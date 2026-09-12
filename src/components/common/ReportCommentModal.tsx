import React, { useState } from 'react';
import { 
  Flag, 
  X, 
  AlertTriangle, 
  ShieldAlert, 
  Flame, 
  EyeOff, 
  Ban, 
  HelpCircle, 
  CheckCircle2,
  Send,
  Loader2
} from 'lucide-react';
import { submitCommentReport } from '../../services/contentService';
import { useAuthContext } from '../../context/AuthContext';

interface ReportCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  comment: {
    id: string;
    text: string;
    userId: string;
    username: string;
    avatarUrl?: string;
  } | null;
  replyId?: string;
  content: {
    id: string;
    title: string;
    posterUrl?: string;
    type?: string;
  };
  onReportSubmitted?: () => void;
}

const REPORT_CATEGORIES = [
  {
    id: 'hate_speech',
    label: 'Hate Speech & Harassment',
    desc: 'Targeted hostility, attacks, slurs or threats',
    icon: Flame,
    color: '#EF4444'
  },
  {
    id: 'abusive',
    label: 'Abusive or Vulgar Language',
    desc: 'Extreme profanity, sexually explicit or inappropriate content',
    icon: ShieldAlert,
    color: '#F97316'
  },
  {
    id: 'spoiler',
    label: 'Major Plot Spoiler',
    desc: 'Ruins ending, twists or plot without warning tags',
    icon: EyeOff,
    color: '#FBBF24'
  },
  {
    id: 'spam',
    label: 'Spam, Links & Advertising',
    desc: 'Self-promotion, malicious links or repetitive junk',
    icon: Ban,
    color: '#A855F7'
  },
  {
    id: 'misinformation',
    label: 'Misinformation or Impersonation',
    desc: 'Fake leaks, impersonating staff or misleading fans',
    icon: AlertTriangle,
    color: '#06B6D4'
  },
  {
    id: 'other',
    label: 'Something Else',
    desc: 'Violates MaxPlay community standards',
    icon: HelpCircle,
    color: '#9CA3AF'
  }
];

export const ReportCommentModal: React.FC<ReportCommentModalProps> = ({
  isOpen,
  onClose,
  comment,
  replyId,
  content,
  onReportSubmitted
}) => {
  const { user } = useAuthContext();
  const [selectedCategory, setSelectedCategory] = useState<string>('hate_speech');
  const [customDetails, setCustomDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen || !comment) return null;

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const selectedCategoryObj = REPORT_CATEGORIES.find(c => c.id === selectedCategory);
      
      await submitCommentReport({
        commentId: comment.id,
        replyId: replyId || undefined,
        commentText: comment.text,
        commentAuthorId: comment.userId || 'unknown-user',
        commentAuthorName: comment.username || 'Anonymous User',
        commentAuthorAvatar: comment.avatarUrl || '',
        contentId: content.id,
        contentTitle: content.title,
        contentPosterUrl: content.posterUrl || '',
        contentType: content.type || 'movie',
        reportedByUserId: user?.uid || 'guest-user',
        reportedByUserName: user?.displayName || 'MaxPlay User',
        reportedByUserEmail: user?.email || '',
        category: selectedCategory,
        reasonText: selectedCategoryObj?.label || 'Inappropriate Content',
        details: customDetails.trim() || undefined
      });

      setIsSuccess(true);
      if (onReportSubmitted) onReportSubmitted();
      
      // Auto close after brief success message
      setTimeout(() => {
        setIsSuccess(false);
        setCustomDetails('');
        setSelectedCategory('hate_speech');
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error('Failed to submit report:', err);
      setErrorMsg(err.message || 'Could not submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#27272A] bg-[#121214] p-5 sm:p-6 text-left shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          disabled={isSubmitting}
          className="absolute top-4 right-4 rounded-full p-2 text-[#A1A1AA] hover:bg-white/10 hover:text-white transition cursor-pointer"
          title="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] mb-4 animate-bounce">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Report Submitted</h3>
            <p className="text-sm text-[#A1A1AA] max-w-xs leading-relaxed">
              Thank you for keeping our community safe. Our admin moderation team will investigate this comment shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444]">
                <Flag className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-wide">Report Comment</h3>
                <p className="text-xs text-[#71717A]">Flag inappropriate speech, hate, or rule violations</p>
              </div>
            </div>

            {/* Target Comment Preview Box */}
            <div className="rounded-xl bg-[#18181B] border border-[#27272A] p-3">
              <div className="flex items-center justify-between text-xs text-[#71717A] mb-1.5">
                <span className="font-semibold text-[#D4D4D8]">
                  {comment.username.startsWith('@') ? comment.username : `@${comment.username}`}
                </span>
                <span className="text-[10px] text-[#A1A1AA] truncate max-w-[160px]">{content.title}</span>
              </div>
              <p className="text-xs text-[#A1A1AA] italic line-clamp-2 bg-[#0E0E10] p-2 rounded-lg border border-[#1F1F23]">
                "{comment.text}"
              </p>
            </div>

            {/* Reason Selection */}
            <div>
              <label className="block text-xs font-bold text-[#E4E4E7] mb-2 uppercase tracking-wider">
                Select Reason Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                {REPORT_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#1F1F24] border-[#06B6D4] ring-1 ring-[#06B6D4]/40' 
                          : 'bg-[#18181B]/60 border-[#27272A] hover:border-white/20 hover:bg-[#1E1E24]'
                      }`}
                    >
                      <div 
                        className="p-1.5 rounded-lg shrink-0 mt-0.5"
                        style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white flex items-center justify-between">
                          <span>{cat.label}</span>
                          {isSelected && <span className="h-2 w-2 rounded-full bg-[#06B6D4]" />}
                        </div>
                        <p className="text-[10px] text-[#71717A] leading-snug mt-0.5 line-clamp-1">
                          {cat.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direct Message / Additional Context */}
            <div>
              <label className="block text-xs font-bold text-[#E4E4E7] mb-1.5 uppercase tracking-wider">
                Additional Details (Optional)
              </label>
              <textarea
                value={customDetails}
                onChange={(e) => setCustomDetails(e.target.value)}
                placeholder="Explain what is wrong with this comment or provide context for the admin team..."
                rows={2}
                className="w-full rounded-xl bg-[#18181B] border border-[#27272A] p-3 text-xs text-white placeholder-[#71717A] focus:border-[#06B6D4] focus:outline-none transition resize-none"
              />
            </div>

            {errorMsg && (
              <div className="text-xs font-semibold text-[#EF4444] bg-[#EF4444]/10 p-2.5 rounded-lg border border-[#EF4444]/20 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#27272A]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#A1A1AA] hover:text-white hover:bg-white/5 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-[#EF4444] to-[#DC2626] hover:from-[#F87171] hover:to-[#EF4444] shadow-lg shadow-[#EF4444]/20 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
