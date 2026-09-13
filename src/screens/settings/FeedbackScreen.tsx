import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Send, Image as ImageIcon, Plus, Trash2, CheckCircle2, 
  Clock, AlertCircle, Sparkles, Film, MessageSquare, Download, 
  Search, Crown, Bug, Lightbulb, FileText, X, ShieldCheck, 
  Eye, RefreshCw, UserCheck, Check, MessageCircle, HelpCircle,
  Smartphone, Monitor, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { 
  collection, addDoc, getDocs, query, where, orderBy, onSnapshot 
} from 'firebase/firestore';
import { UserFeedback } from '../../types';
import { NativeBanner } from '../../components/ads/NativeBanner';

interface FeedbackScreenProps {
  onBack: () => void;
}

const FEEDBACK_CATEGORIES = [
  { id: 'playback', label: 'Video Playback / Buffering', icon: Film, color: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]/15', border: 'border-[#8B5CF6]/30', desc: 'Stuttering, black screen, loading or video format errors' },
  { id: 'subtitle', label: 'Subtitle & Multi-Audio', icon: MessageSquare, color: 'text-[#06B6D4]', bg: 'bg-[#06B6D4]/15', border: 'border-[#06B6D4]/30', desc: 'Sync issues, missing languages or audio dub errors' },
  { id: 'download', label: 'Offline Downloads', icon: Download, color: 'text-[#10B981]', bg: 'bg-[#10B981]/15', border: 'border-[#10B981]/30', desc: 'Download failures, storage limits or offline playback' },
  { id: 'search', label: 'Search & UI Navigation', icon: Search, color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/15', border: 'border-[#F59E0B]/30', desc: 'Missing search titles, wrong filters or layout glitches' },
  { id: 'account', label: 'VIP, Account & Access', icon: Crown, color: 'text-[#EC4899]', bg: 'bg-[#EC4899]/15', border: 'border-[#EC4899]/30', desc: 'VIP membership, profile sync, password or points' },
  { id: 'bug', label: 'Bug / App Glitch', icon: Bug, color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/15', border: 'border-[#EF4444]/30', desc: 'Crashes, freeze, broken buttons or unexpected errors' },
  { id: 'feature', label: 'Feature Suggestion', icon: Lightbulb, color: 'text-[#FBBF24]', bg: 'bg-[#FBBF24]/15', border: 'border-[#FBBF24]/30', desc: 'Request new anime, movies, features or enhancements' },
  { id: 'custom', label: 'Other / Custom Reason', icon: FileText, color: 'text-[#A1A1AA]', bg: 'bg-[#A1A1AA]/15', border: 'border-[#A1A1AA]/30', desc: 'Custom inquiry or general feedback for admin team' },
];

export const FeedbackScreen: React.FC<FeedbackScreenProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
  
  // Form State
  const [selectedCategory, setSelectedCategory] = useState<string>('playback');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>(user?.email || '');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccessModal, setSubmitSuccessModal] = useState<boolean>(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // History State
  const [myFeedbacks, setMyFeedbacks] = useState<UserFeedback[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.email && !contactEmail) {
      setContactEmail(user.email);
    }
  }, [user?.email]);

  // Load user feedbacks in real-time
  useEffect(() => {
    if (!user?.uid) return;
    setLoadingHistory(true);

    try {
      const q = query(
        collection(db, 'feedbacks'),
        where('userId', '==', user.uid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: UserFeedback[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as UserFeedback);
        });

        // Sort client side by latest
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setMyFeedbacks(list);
        setLoadingHistory(false);
      }, (error) => {
        console.warn('Feedback snapshot error:', error);
        setLoadingHistory(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Error setting up feedback listener:', e);
      setLoadingHistory(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (activeTab === 'history' && myFeedbacks.length > 0) {
      try {
        const saved = localStorage.getItem('maxplay_read_feedbacks');
        const readIds = saved ? JSON.parse(saved) : [];
        const unreadIds = myFeedbacks
          .filter(f => f.adminReply && !readIds.includes(f.id))
          .map(f => f.id);
        
        if (unreadIds.length > 0) {
          const newRead = [...readIds, ...unreadIds];
          localStorage.setItem('maxplay_read_feedbacks', JSON.stringify(newRead));
        }
      } catch (e) {}
    }
  }, [activeTab, myFeedbacks]);

  // Handle image upload & base64 conversion
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (screenshots.length + files.length > 4) {
      alert('You can attach a maximum of 4 screenshots.');
      return;
    }

    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('Please upload valid image files (PNG, JPG, WEBP).');
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const base64 = loadEvt.target?.result as string;
        if (base64) {
          // Compress image via canvas if oversized
          compressImage(base64, (compressed) => {
            setScreenshots((prev) => {
              if (prev.length < 4) return [...prev, compressed];
              return prev;
            });
          });
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const compressImage = (base64Str: string, callback: (result: string) => void) => {
    const img = new window.Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1000;
      const MAX_HEIGHT = 1000;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      callback(compressedDataUrl);
    };
    img.onerror = () => callback(base64Str);
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let browser = 'Web Browser';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edge')) browser = 'Edge';

    let os = 'Unknown OS';
    if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';

    return {
      browser,
      os,
      screen: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: ua
    };
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      alert('Please provide some details regarding your issue or feedback.');
      return;
    }

    if (selectedCategory === 'custom' && !customTopic.trim()) {
      alert('Please specify your custom topic title.');
      return;
    }

    setIsSubmitting(true);
    const dev = getDeviceInfo();
    const catObj = FEEDBACK_CATEGORIES.find(c => c.id === selectedCategory);

    const feedbackPayload: Omit<UserFeedback, 'id'> = {
      userId: user?.uid || 'anonymous_' + Date.now(),
      userName: user?.displayName || user?.email?.split('@')[0] || 'User',
      userEmail: contactEmail.trim() || user?.email || 'no-email@maxplay.app',
      userAvatar: user?.photoURL || '',
      userRole: user?.role || 'user',
      isVip: Boolean(user?.isPremium),
      category: selectedCategory,
      categoryLabel: catObj ? catObj.label : 'General Feedback',
      customTopic: selectedCategory === 'custom' ? customTopic.trim() : undefined,
      details: details.trim(),
      screenshots: screenshots,
      appVersion: 'MaxPlay v2.4.0 (Studio Build)',
      deviceInfo: `${dev.os} • ${dev.browser} • ${dev.screen}`,
      browser: dev.browser,
      os: dev.os,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'feedbacks'), feedbackPayload);
      setIsSubmitting(false);
      setSubmitSuccessModal(true);

      // Reset form
      setDetails('');
      setCustomTopic('');
      setScreenshots([]);
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      setIsSubmitting(false);
      alert('Failed to send feedback: ' + (err.message || 'Network error'));
    }
  };

  const activeCategoryObj = FEEDBACK_CATEGORIES.find(c => c.id === selectedCategory) || FEEDBACK_CATEGORIES[0];
  const pendingRepliesCount = myFeedbacks.filter(f => f.adminReply && f.status === 'resolved').length;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden bg-[#0A0A0C] text-white pb-24 animate-in fade-in duration-200 scrollbar-none">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#121214]/90 backdrop-blur-md border-b border-[#27272A] px-4 py-3.5 flex items-center justify-between shrink-0 gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[200px]">
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-[#1C1C1F] border border-[#27272A] text-white hover:bg-[#27272A] active:scale-95 transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 truncate">
              <MessageSquare className="h-4 w-4 text-[#8B5CF6] shrink-0" />
              <span className="truncate">Help & Feedback</span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-[#A1A1AA] truncate">Direct communication with MaxPlay Support</p>
          </div>
        </div>

        {/* Tab Switcher in Header */}
        <div className="flex items-center bg-[#1C1C1F] p-1 rounded-xl border border-[#27272A] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('submit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'submit'
                ? 'bg-[#8B5CF6] text-white shadow-md'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <Send className="h-3 w-3" />
            <span>Send</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-[#8B5CF6] text-white shadow-md'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>My Tickets</span>
            {myFeedbacks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[9px] font-black rounded-full bg-[#06B6D4] text-black">
                {myFeedbacks.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-5">
        {activeTab === 'submit' ? (
          <form onSubmit={handleSubmitFeedback} className="flex flex-col gap-5">
            {/* Intro Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#8B5CF6]/15 via-[#06B6D4]/10 to-transparent border border-[#8B5CF6]/30 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#8B5CF6]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                    We Value Your Experience!
                  </h2>
                  <p className="text-xs text-[#D4D4D8] mt-0.5 leading-relaxed">
                    Experiencing a glitch, missing audio, or have a cool feature idea? Tell us below. Our team reviews all submissions and replies directly to your inbox.
                  </p>
                </div>
              </div>
            </div>

            {/* NATIVE BANNER AD */}
            <NativeBanner />

            {/* Step 1: Category Selection Grid */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5 px-1">
                <span>1. Select Issue Category</span>
                <span className="text-[#8B5CF6]">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FEEDBACK_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`relative flex items-start gap-2.5 p-3 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? `bg-[#18181B] ${cat.border} ring-1 ring-[#8B5CF6] shadow-lg`
                          : 'bg-[#141416] border-[#27272A] hover:border-[#3F3F46]'
                      }`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cat.bg} ${cat.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-[#D4D4D8]'}`}>
                          {cat.label}
                        </div>
                        <div className="text-[10px] text-[#71717A] line-clamp-1 mt-0.5">
                          {cat.desc}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#8B5CF6] text-white">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Topic Input (When Other/Custom is selected) */}
            {selectedCategory === 'custom' && (
              <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="text-xs font-bold text-[#E4E4E7] px-1">
                  Custom Topic / Inquiry Title <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g., Audio track sync issue on Episode 4, Movie suggestion..."
                  className="w-full rounded-xl bg-[#141416] border border-[#27272A] px-3.5 py-2.5 text-xs text-white placeholder-[#71717A] focus:border-[#8B5CF6] focus:outline-none transition"
                  required
                />
              </div>
            )}

            {/* Step 2: Description & Details */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                  <span>2. Describe in Detail</span>
                  <span className="text-[#8B5CF6]">*</span>
                </label>
                <span className="text-[11px] text-[#71717A]">
                  {details.length} / 1500 chars
                </span>
              </div>

              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 1500))}
                rows={5}
                placeholder={`Please describe what happened, steps to reproduce the glitch, title name, or your suggestion for our team...`}
                className="w-full rounded-2xl bg-[#141416] border border-[#27272A] p-3.5 text-xs text-white placeholder-[#71717A] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-none transition leading-relaxed resize-none"
                required
              />
            </div>

            {/* Step 3: Attach Screenshots */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-[#06B6D4]" />
                  <span>3. Attach Screenshots (Optional)</span>
                </label>
                <span className="text-[11px] text-[#71717A]">
                  {screenshots.length} / 4 attached
                </span>
              </div>

              <p className="text-[11px] text-[#71717A] px-1">
                Adding screenshot images makes it significantly easier for our developers to identify and patch bugs.
              </p>

              {/* Upload & Preview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {screenshots.map((src, index) => (
                  <div
                    key={index}
                    className="group relative aspect-video rounded-xl overflow-hidden bg-[#18181B] border border-[#3F3F46] shadow-md"
                  >
                    <img
                      src={src || undefined}
                      alt={`Screenshot ${index + 1}`}
                      className="h-full w-full object-cover cursor-pointer hover:scale-105 transition"
                      onClick={() => setPreviewImageModal(src)}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewImageModal(src)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/70 text-white hover:bg-[#8B5CF6] transition cursor-pointer"
                        title="View Full Size"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveScreenshot(index)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600/80 text-white hover:bg-red-600 transition cursor-pointer"
                        title="Remove Image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {screenshots.length < 4 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 aspect-video rounded-xl border border-dashed border-[#3F3F46] bg-[#141416] hover:bg-[#1C1C1F] hover:border-[#8B5CF6] transition cursor-pointer text-[#A1A1AA] hover:text-white"
                  >
                    <Plus className="h-5 w-5 text-[#8B5CF6]" />
                    <span className="text-[11px] font-bold">Add Screenshot</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>

            {/* Step 4: Contact & Device Telemetry info */}
            <div className="flex flex-col gap-3 rounded-2xl bg-[#141416] border border-[#27272A] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-[#10B981]" />
                  Contact & Device Diagnostic Info
                </span>
                <span className="text-[10px] bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold px-2 py-0.5 rounded-full">
                  Auto-Attached
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-[#A1A1AA] mb-1 block">Your Name / UID</label>
                  <div className="text-xs font-semibold text-white bg-[#0D0D0E] px-3 py-2 rounded-xl border border-[#27272A] truncate">
                    {user?.displayName || 'User'} <span className="text-[#71717A]">({user?.uid?.substring(0, 10) || 'Guest'})</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-[#A1A1AA] mb-1 block">Email for Admin Reply</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="your-email@example.com"
                    className="w-full rounded-xl bg-[#0D0D0E] border border-[#27272A] px-3 py-2 text-xs text-white placeholder-[#71717A] focus:border-[#8B5CF6] focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Hardware / Environment preview chips */}
              <div className="flex items-center gap-2 flex-wrap pt-1 text-[10px] text-[#71717A]">
                <span className="px-2 py-1 rounded-lg bg-[#1C1C1F] border border-[#27272A] flex items-center gap-1">
                  <Smartphone className="h-3 w-3 text-[#8B5CF6]" />
                  {navigator.platform || 'Device'}
                </span>
                <span className="px-2 py-1 rounded-lg bg-[#1C1C1F] border border-[#27272A]">
                  MaxPlay v2.4.0
                </span>
                <span className="px-2 py-1 rounded-lg bg-[#1C1C1F] border border-[#27272A]">
                  Resolution: {window.innerWidth}x{window.innerHeight}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#06B6D4] p-4 text-sm font-extrabold text-white shadow-xl shadow-purple-600/25 hover:opacity-95 active:scale-[0.98] transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Submitting Feedback to Admin...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Feedback to Admin Team</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* History Tab */
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-sm font-bold text-white">Your Submitted Tickets</h2>
                <p className="text-xs text-[#A1A1AA]">Real-time status updates and direct messages from the Admin</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('submit')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#7C3AED] transition cursor-pointer shadow-md"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Ticket</span>
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-[#A1A1AA]">
                <RefreshCw className="h-7 w-7 text-[#8B5CF6] animate-spin mb-3" />
                <p className="text-xs">Fetching your feedback history from Firestore...</p>
              </div>
            ) : myFeedbacks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl bg-[#141416] border border-[#27272A] p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B5CF6]/15 text-[#8B5CF6] mb-3">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-white">No Feedback Sent Yet</h3>
                <p className="text-xs text-[#A1A1AA] max-w-xs mt-1 leading-relaxed">
                  Have a suggestion or facing an issue? Send your first feedback ticket and our support team will respond directly here.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('submit')}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-[#8B5CF6] text-xs font-bold text-white hover:bg-[#7C3AED] transition shadow-lg cursor-pointer"
                >
                  Send First Feedback
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {myFeedbacks.map((item) => {
                  const catObj = FEEDBACK_CATEGORIES.find(c => c.id === item.category);
                  const Icon = catObj?.icon || MessageSquare;

                  let statusBg = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
                  let statusText = 'Pending Review';
                  if (item.status === 'under_review') {
                    statusBg = 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
                    statusText = 'Under Review';
                  } else if (item.status === 'resolved') {
                    statusBg = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                    statusText = 'Resolved';
                  } else if (item.status === 'dismissed') {
                    statusBg = 'bg-zinc-700/30 text-zinc-400 border-zinc-700';
                    statusText = 'Dismissed';
                  }

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-2xl bg-[#141416] border border-[#27272A] p-4 shadow-lg hover:border-[#3F3F46] transition"
                    >
                      {/* Top Meta */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${catObj?.bg || 'bg-[#8B5CF6]/15'} ${catObj?.color || 'text-[#8B5CF6]'}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-bold text-white">
                            {item.customTopic || item.categoryLabel}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${statusBg}`}>
                            {statusText}
                          </span>
                          <span className="text-[11px] text-[#71717A]">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Content Description */}
                      <p className="text-xs text-[#D4D4D8] leading-relaxed whitespace-pre-wrap bg-[#0D0D0E] p-3 rounded-xl border border-[#27272A]/70">
                        {item.details}
                      </p>

                      {/* Screenshots Gallery if attached */}
                      {item.screenshots && item.screenshots.length > 0 && (
                        <div className="flex flex-col gap-1.5 pt-1">
                          <span className="text-[10px] font-bold text-[#A1A1AA] uppercase">
                            Attached Screenshots ({item.screenshots.length}):
                          </span>
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {item.screenshots.map((src, i) => (
                              <img
                                key={i}
                                src={src || undefined}
                                alt={`Screenshot ${i + 1}`}
                                onClick={() => setPreviewImageModal(src)}
                                className="h-16 w-24 rounded-lg object-cover border border-[#27272A] hover:border-[#8B5CF6] transition cursor-pointer shrink-0"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Admin Reply Box if present */}
                      {item.adminReply && (
                        <div className="mt-1 flex flex-col gap-2 rounded-xl bg-gradient-to-br from-[#8B5CF6]/15 via-[#06B6D4]/10 to-[#121214] border border-[#8B5CF6]/40 p-3.5 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8B5CF6] text-white">
                                <ShieldCheck className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-extrabold text-[#A78BFA]">
                                Response from MaxPlay Admin
                              </span>
                            </div>
                            {item.adminReplyDate && (
                              <span className="text-[10px] text-[#A1A1AA]">
                                {new Date(item.adminReplyDate).toLocaleString()}
                              </span>
                            )}
                          </div>

                          {item.adminReplySubject && (
                            <h4 className="text-xs font-bold text-white">
                              {item.adminReplySubject}
                            </h4>
                          )}

                          <p className="text-xs text-[#E4E4E7] leading-relaxed whitespace-pre-wrap">
                            {item.adminReply}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Full Size Image Lightbox Modal */}
      {previewImageModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] w-full flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewImageModal(null)}
              className="absolute -top-12 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewImageModal || undefined}
              alt="Full Preview"
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Success Confirmation Modal */}
      {submitSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="flex w-full max-w-sm flex-col rounded-3xl bg-[#141416] p-6 border border-[#8B5CF6]/40 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#10B981]/20 text-[#10B981] mb-3">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h3 className="text-lg font-extrabold text-white">Feedback Received!</h3>
            <p className="mt-2 text-xs text-[#D4D4D8] leading-relaxed">
              Thank you for helping us improve MaxPlay. Our admin and engineering team has received your ticket and will look into it promptly.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSubmitSuccessModal(false);
                  setActiveTab('history');
                }}
                className="w-full rounded-xl bg-[#8B5CF6] py-3 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-[#7C3AED] active:scale-95 transition cursor-pointer"
              >
                View My Ticket History
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmitSuccessModal(false);
                  onBack();
                }}
                className="w-full rounded-xl bg-[#1C1C1F] border border-[#27272A] py-2.5 text-xs font-bold text-[#A1A1AA] hover:text-white hover:bg-[#27272A] transition cursor-pointer"
              >
                Back to Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
