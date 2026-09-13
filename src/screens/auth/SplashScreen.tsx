import React, { useState, useEffect } from 'react';
import { MaxPlayLogo } from '../../components/common/MaxPlayLogo';
import { APP_NAME, APP_TAGLINE } from '../../utils/constants';

interface SplashScreenProps {
  onFinish: () => void;
  isVerifyingAuth?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, isVerifyingAuth = false }) => {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Ensure logo animation displays gracefully for at least 1.4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  // Exit splash only when minimum display time passed AND auth is not verifying
  useEffect(() => {
    if (minTimeElapsed && !isVerifyingAuth) {
      onFinish();
    }
  }, [minTimeElapsed, isVerifyingAuth, onFinish]);

  // Safety fallback in case network auth hangs (max 6.5s)
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      onFinish();
    }, 6500);
    return () => clearTimeout(safetyTimer);
  }, [onFinish]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-between bg-[#0A0A0A] py-16 px-6 text-center select-none">
      <div />

      <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
        <MaxPlayLogo size="hero" glow={true} />
        <h1 className="mt-6 bg-gradient-to-r from-white via-[#F3E8FF] to-[#D8B4FE] bg-clip-text text-3xl font-black tracking-tight text-transparent">
          {APP_NAME}
        </h1>
        <p className="mt-2 text-xs font-semibold tracking-wider uppercase text-[#A1A1AA]">{APP_TAGLINE}</p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent" />
        <span className="text-[11px] text-[#71717A] font-medium">Powered by SAN TEAM</span>
      </div>
    </div>
  );
};
