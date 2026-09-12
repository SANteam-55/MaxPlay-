import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2, 
  Layers, 
  Sparkles, 
  Check, 
  X, 
  Zap, 
  Radio, 
  Crown,
  Play
} from 'lucide-react';

interface LanguageOption {
  code: string;
  name: string;
  badge?: string;
  description?: string;
}

interface SeasonOption {
  index: number;
  title: string;
  episodesCount: number;
  badge?: string;
}

interface SoloLevelingSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'language' | 'season';
  // Language props
  languages?: string[];
  activeLanguage?: string;
  onSelectLanguage?: (lang: string) => void;
  // Season props
  seasons?: SeasonOption[];
  selectedSeasonIndex?: number;
  onSelectSeason?: (seasonIndex: number) => void;
  // Context
  contentTitle?: string;
}

export const SoloLevelingSelectorModal: React.FC<SoloLevelingSelectorModalProps> = ({
  isOpen,
  onClose,
  type,
  languages = [],
  activeLanguage = '',
  onSelectLanguage,
  seasons = [],
  selectedSeasonIndex = 0,
  onSelectSeason,
  contentTitle = 'Content'
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Helper to get formatted language metadata
  const getLanguageMeta = (lang: string): LanguageOption => {
    const l = lang.toLowerCase();
    let badge = 'ORIGINAL';
    let description = 'High Fidelity Audio';

    if (l.includes('hindi')) {
      badge = 'HINDI DUB';
      description = 'Studio Master • 5.1 Stereo';
    } else if (l.includes('jap') || l.includes('jp')) {
      badge = 'ORIGINAL JP';
      description = 'Master JP Voice • Hi-Res';
    } else if (l.includes('eng')) {
      badge = 'ENG DUB';
      description = 'English Cast • Clear Audio';
    } else if (l.includes('tamil') || l.includes('telugu')) {
      badge = 'REGIONAL DUB';
      description = 'Regional Audio Stream';
    } else if (l.includes('dual') || l.includes('multi')) {
      badge = 'MULTI AUDIO';
      description = 'Multi-Track Supported';
    }

    return {
      code: lang,
      name: lang,
      badge,
      description
    };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.95, opacity: 0, y: -10 }}
          animate={{ 
            scale: 1, 
            opacity: 1, 
            y: 0,
            transition: { type: 'spring', damping: 25, stiffness: 350 }
          }}
          exit={{ 
            scale: 0.95, 
            opacity: 0, 
            y: -5,
            transition: { duration: 0.15 }
          }}
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-[300px] sm:w-[360px] bg-[#030712]/95 text-white rounded-xl border border-cyan-400/50 shadow-[0_10px_35px_rgba(6,182,212,0.4),0_0_50px_rgba(147,51,234,0.15),inset_0_0_15px_rgba(6,182,212,0.15)] max-h-[60vh] flex flex-col overflow-hidden select-none backdrop-blur-md origin-top-left"
        >
            {/* Holographic Top & Bottom Laser Edge Accents */}
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_10px_#22d3ee]" />
            <div className="absolute bottom-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />

            {/* Corner Tech Brackets */}
            <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-cyan-300 pointer-events-none" />
            <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-cyan-300 pointer-events-none" />
            <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-cyan-300 pointer-events-none" />
            <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-cyan-300 pointer-events-none" />

            {/* System Quest Header */}
            <div className="px-3 pt-3 pb-2 border-b border-cyan-500/30 bg-gradient-to-b from-cyan-950/50 via-[#040c1d] to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.4)] text-cyan-300 shrink-0">
                  {type === 'language' ? (
                    <Volume2 className="w-3 h-3" />
                  ) : (
                    <Layers className="w-3 h-3" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <Zap className="w-2 h-2 text-cyan-400 animate-pulse" />
                    <span className="text-[8px] tracking-[0.15em] uppercase font-mono font-black text-cyan-400">
                      [ SYSTEM ]
                    </span>
                  </div>
                  <h3 className="text-xs font-black tracking-wider text-white uppercase truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    {type === 'language' ? 'AUDIO STREAM' : 'SELECT DUNGEON'}
                  </h3>
                </div>
              </div>
            </div>

            {/* Scrollable System Options List */}
            <div className="p-2 overflow-y-auto max-h-[35vh] space-y-1.5 scrollbar-thin scrollbar-thumb-cyan-500/30">
              {type === 'language' ? (
                // Language Options List
                languages.map((lang, index) => {
                  const meta = getLanguageMeta(lang);
                  const isSelected = activeLanguage === lang;

                  return (
                    <motion.div
                      key={lang}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelectLanguage?.(lang);
                        onClose();
                      }}
                      className={`relative group rounded-lg p-2 cursor-pointer transition-all duration-200 border flex items-center justify-between ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-950/90 via-[#091a38] to-purple-950/80 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                          : 'bg-[#081226]/60 hover:bg-[#0c1c3d]/80 border-cyan-500/20 hover:border-cyan-400/50'
                      }`}
                    >
                      {/* Left: Language Info */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[9px] font-black shrink-0 transition-all ${
                            isSelected
                              ? 'bg-cyan-400 text-black shadow-[0_0_8px_#22d3ee]'
                              : 'bg-cyan-950/70 text-cyan-400 border border-cyan-500/40 group-hover:border-cyan-300'
                          }`}
                        >
                          0{index + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[11px] sm:text-xs text-white tracking-wide truncate">
                              {meta.name}
                            </span>
                            <span
                              className={`text-[7px] font-mono px-1 py-0.5 rounded font-black tracking-wider ${
                                isSelected
                                  ? 'bg-cyan-400/25 text-cyan-200 border border-cyan-400/50 shadow-[0_0_4px_rgba(6,182,212,0.3)]'
                                  : 'bg-white/5 text-white/50 border border-white/10'
                              }`}
                            >
                              {meta.badge}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Selection Indicator */}
                      <div className="shrink-0 ml-2">
                        {isSelected ? (
                          <div className="flex items-center gap-1 text-[9px] font-mono font-black text-cyan-300 bg-cyan-500/25 px-1.5 py-0.5 rounded border border-cyan-400/70 shadow-[0_0_6px_rgba(6,182,212,0.4)]">
                            <Check className="w-2.5 h-2.5 text-cyan-300 stroke-[3]" />
                            <span>EQUIPPED</span>
                          </div>
                        ) : (
                          <div className="text-[9px] font-mono text-cyan-400/50 group-hover:text-cyan-300 px-1.5 py-0.5 rounded border border-transparent group-hover:border-cyan-500/40 transition-colors">
                            [ SELECT ]
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                // Season Options List
                seasons.map((season) => {
                  const isSelected = selectedSeasonIndex === season.index;

                  return (
                    <motion.div
                      key={season.index}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelectSeason?.(season.index);
                        onClose();
                      }}
                      className={`relative group rounded-lg p-2 cursor-pointer transition-all duration-200 border flex items-center justify-between ${
                        isSelected
                          ? 'bg-gradient-to-r from-purple-950/90 via-[#160f33] to-cyan-950/80 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                          : 'bg-[#081226]/60 hover:bg-[#151133]/80 border-purple-500/20 hover:border-purple-400/50'
                      }`}
                    >
                      {/* Left: Season Info */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[9px] font-black shrink-0 transition-all ${
                            isSelected
                              ? 'bg-[#a855f7] text-white shadow-[0_0_8px_#a855f7]'
                              : 'bg-purple-950/70 text-purple-400 border border-purple-500/40 group-hover:border-purple-300'
                          }`}
                        >
                          S{season.index + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[11px] sm:text-xs text-white tracking-wide truncate">
                              {season.title}
                            </span>
                            <span
                              className={`text-[7px] font-mono px-1 py-0.5 rounded font-black tracking-wider ${
                                isSelected
                                  ? 'bg-purple-400/25 text-purple-200 border border-purple-400/50 shadow-[0_0_4px_rgba(168,85,247,0.3)]'
                                  : 'bg-white/5 text-white/50 border border-white/10'
                              }`}
                            >
                              S{season.index + 1}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Selection Indicator */}
                      <div className="shrink-0 ml-2">
                        {isSelected ? (
                          <div className="flex items-center gap-1 text-[9px] font-mono font-black text-purple-300 bg-purple-500/25 px-1.5 py-0.5 rounded border border-purple-400/70 shadow-[0_0_6px_rgba(168,85,247,0.4)]">
                            <Check className="w-2.5 h-2.5 text-purple-300 stroke-[3]" />
                            <span>ACTIVE</span>
                          </div>
                        ) : (
                          <div className="text-[9px] font-mono text-purple-400/50 group-hover:text-purple-300 px-1.5 py-0.5 rounded border border-transparent group-hover:border-purple-500/40 transition-colors">
                            [ ENTER ]
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );
};
