import React from 'react';
import { Home, Search, Sparkles, User } from 'lucide-react';
import { motion } from 'motion/react';

export type TabType = 'home' | 'search' | 'anime' | 'me';

interface MainTabNavigatorProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  downloadBadgeCount?: number;
}

export const MainTabNavigator: React.FC<MainTabNavigatorProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'search' as const, label: 'Search', icon: Search },
    { id: 'anime' as const, label: 'Anime', icon: Sparkles },
    { id: 'me' as const, label: 'Me', icon: User },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 flex h-[62px] flex-row items-center justify-around bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-[#1C1C1E] px-3 select-none shadow-[0_-4px_25px_rgba(0,0,0,0.8)] md:top-0 md:bottom-0 md:right-auto md:w-[80px] md:h-full md:flex-col md:justify-center md:gap-8 md:border-t-0 md:border-r md:px-0 md:py-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.8, rotate: isActive ? 0 : tab.id === 'search' ? -6 : 4 }}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex flex-1 flex-col items-center justify-center py-1.5 cursor-pointer outline-none transition-colors duration-200 ${
              isActive ? 'text-white' : 'text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            {/* Sliding Active Background Pill Indicator */}
            {isActive && (
              <motion.div
                layoutId="activeTabPill"
                className={`absolute inset-x-1 top-1 bottom-1 rounded-2xl ${
                  tab.id === 'anime'
                    ? 'bg-gradient-to-r from-[#8B5CF6]/30 via-[#EC4899]/30 to-[#38BDF8]/30 border border-[#EC4899]/50 shadow-[0_0_18px_rgba(236,72,153,0.35)]'
                    : tab.id === 'search'
                    ? 'bg-gradient-to-r from-[#3B82F6]/25 to-[#8B5CF6]/25 border border-[#3B82F6]/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : tab.id === 'home'
                    ? 'bg-gradient-to-r from-[#8B5CF6]/25 to-[#A855F7]/25 border border-[#8B5CF6]/40 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                    : 'bg-gradient-to-r from-[#EC4899]/25 to-[#8B5CF6]/25 border border-[#EC4899]/40 shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                }`}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              />
            )}

            {/* Icon Container with Unique Animated Styles */}
            <div className="relative flex items-center justify-center z-10 h-6 w-6">
              <motion.div
                animate={{ scale: isActive ? 1.15 : 1 }}
                transition={{ duration: 0.2 }}
                className="relative flex items-center justify-center"
              >
                {isActive && (
                  <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className={`absolute inset-0 rounded-full blur-md ${
                      tab.id === "anime"
                        ? "bg-[#F472B6]"
                        : tab.id === "search"
                        ? "bg-[#3B82F6]"
                        : "bg-[#8B5CF6]"
                    }`}
                  />
                )}
                <Icon
                  className={`h-5 w-5 transition-colors duration-200 ${
                    isActive
                      ? tab.id === "anime"
                        ? "text-[#F472B6] drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]"
                        : tab.id === "search"
                        ? "text-[#60A5FA] drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                        : "text-[#A78BFA] drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]"
                      : "text-[#71717A]"
                  }`}
                />
              </motion.div>

            </div>
            {/* Label Animation */}
            <motion.span
              animate={{
                scale: isActive ? 1.05 : 1,
                y: isActive ? -0.5 : 0,
              }}
              transition={{ duration: 0.2 }}
              className={`mt-1 text-[11px] font-bold tracking-tight z-10 ${
                isActive
                  ? tab.id === 'anime'
                    ? 'bg-gradient-to-r from-[#C084FC] via-[#F472B6] to-[#38BDF8] bg-clip-text text-transparent font-extrabold'
                    : tab.id === 'search'
                    ? 'bg-gradient-to-r from-[#60A5FA] to-[#A78BFA] bg-clip-text text-transparent font-extrabold'
                    : tab.id === 'me'
                    ? 'bg-gradient-to-r from-[#F472B6] to-[#C084FC] bg-clip-text text-transparent font-extrabold'
                    : 'text-white'
                  : 'text-[#71717A]'
              }`}
            >
              {tab.label}
            </motion.span>

            {/* Top / Side Indicator Glow Bar */}
            {isActive && (
              <motion.div
                layoutId="activeTabDot"
                className={`absolute top-1 md:top-1/2 md:bottom-auto md:left-0 md:h-6 md:w-1 md:-translate-y-1/2 md:rounded-r-full h-0.5 w-4 rounded-full z-20 ${
                  tab.id === 'anime'
                    ? 'bg-gradient-to-r from-[#EC4899] to-[#38BDF8]'
                    : tab.id === 'search'
                    ? 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6]'
                    : tab.id === 'me'
                    ? 'bg-gradient-to-r from-[#F472B6] to-[#8B5CF6]'
                    : 'bg-[#8B5CF6]'
                }`}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
};


