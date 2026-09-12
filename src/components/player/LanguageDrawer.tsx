import React, { useState } from 'react';
import {
  X,
  Check,
  Download,
  Volume2,
  Subtitles,
  Sliders,
  Clock,
  Plus,
  Minus,
} from 'lucide-react';
import { AudioTrack, SubtitleTrack } from '../../data/mockPlayer';

interface LanguageDrawerProps {
  visible: boolean;
  audioTracks: AudioTrack[];
  subtitles: SubtitleTrack[];
  selectedAudioId: string;
  selectedSubtitleId: string | null;
  subtitleEnabled: boolean;
  subtitleFontSize: number;
  subtitleDelayMs: number;
  onSelectAudio: (audioId: string) => void;
  onSelectSubtitle: (subId: string | null) => void;
  onToggleSubtitle: (enabled: boolean) => void;
  onChangeFontSize: (size: number) => void;
  onChangeDelayMs: (delay: number) => void;
  onDownloadSubtitle?: (subId: string) => void;
  onClose: () => void;
}

export const LanguageDrawer: React.FC<LanguageDrawerProps> = ({
  visible,
  audioTracks,
  subtitles,
  selectedAudioId,
  selectedSubtitleId,
  subtitleEnabled,
  subtitleFontSize,
  subtitleDelayMs,
  onSelectAudio,
  onSelectSubtitle,
  onToggleSubtitle,
  onChangeFontSize,
  onChangeDelayMs,
  onDownloadSubtitle,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'tracks' | 'style' | 'delay'>('tracks');

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[340px] flex-col bg-[#121212] p-4 border-l border-[#1C1C1E] shadow-2xl animate-in slide-in-from-right duration-250 select-none overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1C1C1E] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Subtitles className="h-4 w-4 text-[#8B5CF6]" />
            <h3 className="text-sm font-bold text-white">Audio & Subtitles</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#6B7280] hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sub-navigation Tabs: Audio/Subtitles | Style | Delay */}
        <div className="flex items-center gap-2 border-b border-[#1C1C1E] pb-2 mb-3">
          <button
            onClick={() => setActiveTab('tracks')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'tracks'
                ? 'bg-[#8B5CF6] text-white'
                : 'text-[#6B7280] hover:text-white'
            }`}
          >
            Tracks
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'style'
                ? 'bg-[#8B5CF6] text-white'
                : 'text-[#6B7280] hover:text-white'
            }`}
          >
            <Sliders className="h-3 w-3" />
            <span>Style</span>
          </button>
          <button
            onClick={() => setActiveTab('delay')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'delay'
                ? 'bg-[#8B5CF6] text-white'
                : 'text-[#6B7280] hover:text-white'
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>Delay ({subtitleDelayMs > 0 ? `+${subtitleDelayMs}` : subtitleDelayMs}ms)</span>
          </button>
        </div>

        {/* TAB 1: AUDIO & SUBTITLE TRACKS */}
        {activeTab === 'tracks' && (
          <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1">
            {/* Audio Column */}
            <div className="flex flex-col gap-2 border-r border-[#1C1C1E] pr-2">
              <div className="flex items-center gap-1 text-xs font-bold text-white mb-1">
                <Volume2 className="h-3.5 w-3.5 text-[#06B6D4]" />
                <span>Audio</span>
              </div>

              {audioTracks.map((track) => {
                const isActive = selectedAudioId === track.id;
                return (
                  <button
                    key={track.id}
                    onClick={() => onSelectAudio(track.id)}
                    className={`flex items-center justify-between rounded-lg p-2 text-left text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                        : 'bg-[#1C1C1E] text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <span className="line-clamp-1">{track.label}</span>
                    {isActive && <Check className="h-3.5 w-3.5 text-[#10B981] flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Subtitle Column */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                <span>Subtitles</span>
                {/* Master Subtitle Toggle */}
                <button
                  onClick={() => onToggleSubtitle(!subtitleEnabled)}
                  className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                    subtitleEnabled ? 'bg-[#06B6D4]' : 'bg-[#27272A]'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      subtitleEnabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Off Option */}
              <button
                onClick={() => onSelectSubtitle(null)}
                className={`flex items-center justify-between rounded-lg p-2 text-left text-xs font-semibold transition cursor-pointer ${
                  selectedSubtitleId === null
                    ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40'
                    : 'bg-[#1C1C1E] text-[#A1A1AA] hover:text-white'
                }`}
              >
                <span>Off</span>
                {selectedSubtitleId === null && <Check className="h-3.5 w-3.5 text-[#8B5CF6]" />}
              </button>

              {subtitles.map((sub) => {
                const isActive = selectedSubtitleId === sub.id && subtitleEnabled;
                return (
                  <button
                    key={sub.id}
                    onClick={() => {
                      if (!sub.downloaded && onDownloadSubtitle) {
                        onDownloadSubtitle(sub.id);
                      }
                      onSelectSubtitle(sub.id);
                      onToggleSubtitle(true);
                    }}
                    className={`flex items-center justify-between rounded-lg p-2 text-left text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                        : 'bg-[#1C1C1E] text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <span className="line-clamp-1">{sub.label}</span>
                    {isActive ? (
                      <Check className="h-3.5 w-3.5 text-[#10B981] flex-shrink-0" />
                    ) : !sub.downloaded ? (
                      <Download className="h-3.5 w-3.5 text-[#6B7280] hover:text-[#06B6D4] flex-shrink-0" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: STYLE PICKER */}
        {activeTab === 'style' && (
          <div className="flex flex-col gap-4 py-2">
            <div>
              <div className="flex items-center justify-between text-xs text-white mb-1.5 font-semibold">
                <span>Font Size</span>
                <span className="text-[#8B5CF6] font-bold">{subtitleFontSize}px</span>
              </div>
              <input
                type="range"
                min={12}
                max={28}
                step={1}
                value={subtitleFontSize}
                onChange={(e) => onChangeFontSize(Number(e.target.value))}
                className="w-full accent-[#8B5CF6] cursor-pointer"
              />
            </div>

            {/* Live Subtitle Preview Box */}
            <div className="rounded-xl bg-black/80 p-4 text-center border border-[#1C1C1E]">
              <span className="text-[11px] text-[#6B7280] block mb-2">Live Preview</span>
              <p
                style={{ fontSize: `${subtitleFontSize}px` }}
                className="font-medium text-[#FFE4B5] leading-snug"
              >
                Fixed & Synced by bozxphd. Enjoy The Flick
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: SUBTITLE DELAY */}
        {activeTab === 'delay' && (
          <div className="flex flex-col gap-4 py-2 text-center">
            <span className="text-xs text-[#A1A1AA]">
              Adjust timing if subtitles are out of sync with audio
            </span>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => onChangeDelayMs(subtitleDelayMs - 250)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1C1C1E] text-white hover:bg-[#27272A] transition cursor-pointer active:scale-95"
              >
                <Minus className="h-4 w-4" />
              </button>

              <div className="min-w-[100px] text-lg font-bold text-white">
                {subtitleDelayMs > 0 ? `+${subtitleDelayMs}` : subtitleDelayMs} ms
              </div>

              <button
                onClick={() => onChangeDelayMs(subtitleDelayMs + 250)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1C1C1E] text-white hover:bg-[#27272A] transition cursor-pointer active:scale-95"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => onChangeDelayMs(0)}
              className="mt-2 text-xs text-[#8B5CF6] hover:underline cursor-pointer"
            >
              Reset Delay to 0ms
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
