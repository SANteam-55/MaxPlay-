import React, { useEffect } from 'react';
import { MaxPlayLogo } from '../../components/common/MaxPlayLogo';
import { APP_NAME, APP_TAGLINE } from '../../utils/constants';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2000);
    return () => clearTimeout(timer);
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
