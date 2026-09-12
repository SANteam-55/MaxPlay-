import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Camera, 
  Check, 
  Upload, 
  Trash2, 
  Lock, 
  Sparkles, 
  User, 
  Mail, 
  Calendar, 
  Info,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface EditProfileScreenProps {
  onBack: () => void;
}

// Preset popular avatars for quick selection
const PRESET_AVATARS = [
  { id: 'av-1', name: 'Gojo Satoru', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { id: 'av-2', name: 'Cyberpunk Red', url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80' },
  { id: 'av-3', name: 'Neon Samurai', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80' },
  { id: 'av-4', name: 'Cinema Buff', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80' },
  { id: 'av-5', name: 'Anime Girl', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80' },
  { id: 'av-6', name: 'Retro Gamer', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
];

const BIO_TAG_SUGGESTIONS = [
  '🎬 Anime & Series Buff',
  '🍿 Weekend 4K Movie Binger',
  '🎌 J-Drama & K-Drama Fan',
  '⭐ Cinephile & Reviewer',
  '⚡ Action & Sci-Fi Enthusiast',
  '🎧 High Fidelity Sound Lover',
];

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ onBack }) => {
  const { user, updateProfile } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user?.displayName || 'MaxPlay User');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [email] = useState(user?.email || 'user@maxplay.app');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>((user?.gender as any) || 'Male');
  const [age, setAge] = useState<number>(user?.age || 20);
  const [bio, setBio] = useState(user?.bio || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state if user changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || 'MaxPlay User');
      setPhotoURL(user.photoURL || '');
      setGender((user.gender as any) || 'Male');
      setAge(user.age || 20);
      setBio(user.bio || '');
    }
  }, [user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper to resize image to max 400x400 for efficient client storage
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setPhotoURL(dataUrl);
          showToast('Custom photo selected from gallery!');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // reset input value so re-selecting the same file works
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const triggerGalleryPicker = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = () => {
    setPhotoURL('');
    showToast('Photo removed. Using default avatar.');
  };

  const handleTagClick = (tag: string) => {
    if (bio.includes(tag)) return;
    const separator = bio.trim() ? ' • ' : '';
    const newBio = `${bio.trim()}${separator}${tag}`;
    if (newBio.length <= 200) {
      setBio(newBio);
    } else {
      setBio(tag);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast('Please enter a valid display name');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        photoURL: photoURL.trim(),
        gender,
        age: Math.max(1, Math.min(120, Number(age) || 18)),
        bio: bio.trim(),
      });
      setIsSaved(true);
      showToast('Profile updated successfully!');
      setTimeout(() => {
        setIsSaved(false);
        onBack();
      }, 700);
    } catch (err) {
      console.error('Error saving profile:', err);
      showToast('Failed to save profile. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#0A0A0A] p-4 text-left select-none scrollbar-none pb-28 md:pb-12">
      {/* Hidden Native File Input for Gallery / Device Storage */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
        id="profile-gallery-upload-input"
      />

      {/* STICKY TOP HEADER */}
      <div className="flex items-center justify-between py-2 border-b border-[#1C1C1E] pb-3 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-md z-20">
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
            <h2 className="text-lg font-extrabold text-white">Edit Profile</h2>
            <p className="text-[11px] text-[#A1A1AA]">Customize avatar, bio and account details</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          type="button"
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            isSaved
              ? 'bg-[#10B981] text-white shadow-md'
              : 'bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white shadow-md hover:opacity-90 active:scale-95'
          }`}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : isSaved ? (
            <>
              <Check className="h-4 w-4 stroke-[3]" />
              <span>Saved</span>
            </>
          ) : (
            <span>Save</span>
          )}
        </button>
      </div>

      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-6 max-w-xl mx-auto w-full">
        {/* AVATAR UPLOAD & SELECTION SECTION */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-[#141416] p-5 border border-[#27272A] shadow-lg">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className="relative group cursor-pointer"
            onClick={triggerGalleryPicker}
            title="Click or drag & drop to choose custom photo from gallery"
          >
            <div
              className={`h-28 w-28 overflow-hidden rounded-full border-3 transition-all duration-200 shadow-xl flex items-center justify-center ${
                isDragging
                  ? 'border-[#06B6D4] scale-105 ring-4 ring-[#06B6D4]/30'
                  : 'border-[#8B5CF6] group-hover:border-[#06B6D4] group-hover:scale-102'
              }`}
            >
              {photoURL ? (
                <img
                  src={photoURL || undefined}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-tr from-[#8B5CF6] via-[#6366F1] to-[#06B6D4] flex items-center justify-center text-3xl font-black text-white">
                  {(displayName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Camera Floating Badge */}
            <div className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] text-black shadow-xl ring-2 ring-[#0A0A0A] group-hover:scale-110 active:scale-95 transition">
              <Camera className="h-4 w-4 text-black stroke-[2.5]" />
            </div>
          </div>

          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={triggerGalleryPicker}
              className="text-xs font-bold text-white group-hover:text-[#06B6D4] hover:underline flex items-center gap-1.5 justify-center cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-[#06B6D4]" />
              <span>Tap to change photo (Gallery / Storage)</span>
            </button>
            <p className="text-[11px] text-[#71717A] mt-0.5">
              Supports JPG, PNG, WebP or drag & drop from computer
            </p>
          </div>

          {/* Quick Action Buttons for Photo */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={triggerGalleryPicker}
              className="flex items-center gap-1.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer"
            >
              <ImageIcon className="h-3.5 w-3.5 text-[#8B5CF6]" />
              <span>Browse Gallery</span>
            </button>

            {photoURL && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="flex items-center gap-1.5 rounded-xl bg-[#27272A] hover:bg-[#EF4444]/20 hover:text-[#EF4444] px-3 py-1.5 text-xs font-semibold text-[#A1A1AA] transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>

          {/* PRESET AVATARS CAROUSEL */}
          <div className="mt-5 w-full pt-4 border-t border-[#27272A]/70">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-[#A1A1AA] flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#F59E0B]" />
                <span>Or Choose Preset Avatar</span>
              </span>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
              {PRESET_AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => {
                    setPhotoURL(avatar.url);
                    showToast(`Selected ${avatar.name} avatar!`);
                  }}
                  className={`relative flex-shrink-0 h-11 w-11 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                    photoURL === avatar.url
                      ? 'border-[#06B6D4] ring-2 ring-[#06B6D4]/40 scale-105'
                      : 'border-transparent opacity-75 hover:opacity-100 hover:scale-105'
                  }`}
                  title={avatar.name}
                >
                  <img
                    src={avatar.url || undefined}
                    alt={avatar.name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ACCOUNT CREDENTIALS / NON-EDITABLE EMAIL */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#A1A1AA] flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-[#06B6D4]" />
              <span>Login Email Address</span>
            </label>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-md">
              <Lock className="h-2.5 w-2.5" />
              <span>Verified Login</span>
            </span>
          </div>
          <div className="relative">
            <input
              type="email"
              value={email}
              disabled
              readOnly
              className="w-full rounded-2xl bg-[#141416]/70 px-4 py-3 text-sm font-semibold text-[#9CA3AF] border border-[#27272A] cursor-not-allowed select-text shadow-inner"
            />
          </div>
          <p className="text-[10px] text-[#6B7280] flex items-center gap-1">
            <Info className="h-3 w-3 shrink-0" />
            <span>Email is linked to your login session and used for account recovery.</span>
          </p>
        </div>

        {/* DISPLAY NAME */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#A1A1AA] flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-[#8B5CF6]" />
            <span>Display Name</span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            className="w-full rounded-2xl bg-[#141416] px-4 py-3 text-sm font-semibold text-white border border-[#27272A] focus:border-[#8B5CF6] focus:outline-none transition shadow-inner"
            placeholder="Enter your profile name"
            required
          />
        </div>

        {/* GENDER & AGE ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gender */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#A1A1AA]">Gender</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setGender('Male')}
                className={`flex items-center justify-center gap-1 rounded-2xl py-2.5 text-xs font-bold transition cursor-pointer border ${
                  gender === 'Male'
                    ? 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6] shadow-sm'
                    : 'bg-[#141416] text-[#71717A] border-[#27272A] hover:text-white'
                }`}
              >
                <span>♂ Male</span>
              </button>

              <button
                type="button"
                onClick={() => setGender('Female')}
                className={`flex items-center justify-center gap-1 rounded-2xl py-2.5 text-xs font-bold transition cursor-pointer border ${
                  gender === 'Female'
                    ? 'bg-[#EC4899]/20 text-[#EC4899] border-[#EC4899] shadow-sm'
                    : 'bg-[#141416] text-[#71717A] border-[#27272A] hover:text-white'
                }`}
              >
                <span>♀ Female</span>
              </button>

              <button
                type="button"
                onClick={() => setGender('Other')}
                className={`flex items-center justify-center gap-1 rounded-2xl py-2.5 text-xs font-bold transition cursor-pointer border ${
                  gender === 'Other'
                    ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6] shadow-sm'
                    : 'bg-[#141416] text-[#71717A] border-[#27272A] hover:text-white'
                }`}
              >
                <span>⚧ Other</span>
              </button>
            </div>
          </div>

          {/* Age Selection with Stepper and Quick Chips */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#A1A1AA] flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#06B6D4]" />
                <span>Age</span>
              </label>
              <span className="text-xs font-extrabold text-[#06B6D4] bg-[#06B6D4]/10 px-2 py-0.5 rounded-md">
                {age} yrs
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAge((prev) => Math.max(10, prev - 1))}
                className="h-11 w-11 rounded-2xl bg-[#141416] border border-[#27272A] flex items-center justify-center text-lg font-bold text-white hover:bg-[#27272A] active:scale-95 transition cursor-pointer"
                title="Decrease age"
              >
                -
              </button>

              <input
                type="number"
                value={age}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    setAge(Math.max(1, Math.min(120, val)));
                  }
                }}
                min={1}
                max={120}
                className="flex-1 rounded-2xl bg-[#141416] h-11 text-center text-sm font-extrabold text-white border border-[#27272A] focus:border-[#8B5CF6] focus:outline-none transition shadow-inner"
              />

              <button
                type="button"
                onClick={() => setAge((prev) => Math.min(120, prev + 1))}
                className="h-11 w-11 rounded-2xl bg-[#141416] border border-[#27272A] flex items-center justify-center text-lg font-bold text-white hover:bg-[#27272A] active:scale-95 transition cursor-pointer"
                title="Increase age"
              >
                +
              </button>
            </div>

            {/* Quick Age Chips */}
            <div className="flex items-center gap-1.5 mt-1">
              {[15, 18, 21, 25, 30].map((presetAge) => (
                <button
                  key={presetAge}
                  type="button"
                  onClick={() => setAge(presetAge)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    age === presetAge
                      ? 'bg-[#06B6D4] text-black font-extrabold'
                      : 'bg-[#141416] text-[#A1A1AA] hover:text-white border border-[#27272A]'
                  }`}
                >
                  {presetAge}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* BIO SECTION */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#A1A1AA]">Bio / About You</label>
            <span className={`text-[10px] font-mono ${bio.length > 180 ? 'text-[#EF4444]' : 'text-[#71717A]'}`}>
              {bio.length} / 200
            </span>
          </div>

          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={200}
            className="w-full rounded-2xl bg-[#141416] px-4 py-3 text-sm font-medium text-white border border-[#27272A] focus:border-[#8B5CF6] focus:outline-none transition resize-none shadow-inner"
            placeholder="Share your favorite genres, streaming mood, anime titles, or cinema favorites..."
          />

          {/* Quick Bio Tag Suggestion Chips */}
          <div className="mt-1 flex flex-wrap gap-1.5">
            {BIO_TAG_SUGGESTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                className="rounded-lg bg-[#1C1C1E] hover:bg-[#27272A] px-2.5 py-1 text-[10px] font-medium text-[#A1A1AA] hover:text-white border border-[#27272A] transition cursor-pointer"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={isSaving}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#06B6D4] py-4 text-sm font-extrabold text-white shadow-xl shadow-purple-600/30 hover:opacity-95 active:scale-98 transition cursor-pointer"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving Profile...</span>
            </>
          ) : isSaved ? (
            <>
              <Check className="h-4 w-4 stroke-[3]" />
              <span>Profile Saved Successfully!</span>
            </>
          ) : (
            <span>Save Profile Changes</span>
          )}
        </button>
      </form>

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl bg-[#1C1C1E] px-4 py-3 text-xs font-bold text-white border border-[#3F3F46] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <Sparkles className="h-4 w-4 text-[#06B6D4]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
