import React from 'react';
import { X, Check, Globe, Sparkles } from 'lucide-react';

interface AudioLangDrawerProps {
  visible: boolean;
  currentLanguage: string;
  availableLanguages: string[];
  onSelectLanguage: (lang: string) => void;
  onClose: () => void;
}

export const AudioLangDrawer: React.FC<AudioLangDrawerProps> = ({
  visible,
  currentLanguage,
  availableLanguages,
  onSelectLanguage,
  onClose,
}) => {
  if (!visible) return null;

  const getLangBadge = (lang: string) => {
    const l = lang.toLowerCase();
    if (l.includes('hindi')) return { flag: '🇮🇳', tag: 'DUBBED' };
    if (l.includes('english')) return { flag: '🇬🇧', tag: 'ORIGINAL' };
    if (l.includes('tamil')) return { flag: '🇮🇳', tag: 'DUBBED' };
    if (l.includes('telugu')) return { flag: '🇮🇳', tag: 'DUBBED' };
    if (l.includes('malayalam')) return { flag: '🇮🇳', tag: 'DUBBED' };
    if (l.includes('kannada')) return { flag: '🇮🇳', tag: 'DUBBED' };
    if (l.includes('japanese')) return { flag: '🇯🇵', tag: 'ORIGINAL' };
    if (l.includes('korean')) return { flag: '🇰🇷', tag: 'ORIGINAL' };
    if (l.includes('spanish')) return { flag: '🇪🇸', tag: 'DUBBED' };
    return { flag: '🌐', tag: 'AUDIO' };
  };

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[250px] sm:w-[280px] flex-col bg-[#121212]/95 backdrop-blur-md p-4 border-l border-[#1C1C1E] shadow-2xl animate-in slide-in-from-right duration-200 select-none"
      >
        <div className="flex items-center justify-between border-b border-[#1C1C1E] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#38BDF8]" />
            <h3 className="text-sm font-bold text-white tracking-wide">Audio Language</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[#A1A1AA] hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close language selector"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto py-1">
          {availableLanguages.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#71717A]">
              Default Audio Track
            </div>
          ) : (
            availableLanguages.map((lang) => {
              const isActive = currentLanguage.toLowerCase() === lang.toLowerCase();
              const badge = getLangBadge(lang);

              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    onSelectLanguage(lang);
                    onClose();
                  }}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-[#38BDF8]/20 border-[#38BDF8]/50 text-white shadow-md shadow-sky-500/10'
                      : 'border-transparent text-[#A1A1AA] hover:bg-[#1C1C1E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{badge.flag}</span>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-extrabold tracking-wide">{lang}</span>
                      <span className="text-[9px] text-[#A1A1AA] font-normal">{badge.tag}</span>
                    </div>
                  </div>
                  {isActive && <Check className="h-4 w-4 text-[#38BDF8]" />}
                </button>
              );
            })
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-[#1C1C1E] flex items-center justify-center gap-1.5 text-[10px] text-[#71717A]">
          <Sparkles className="h-3 w-3 text-[#38BDF8]" />
          <span>Multi-Audio Track Matrix</span>
        </div>
      </div>
    </div>
  );
};

