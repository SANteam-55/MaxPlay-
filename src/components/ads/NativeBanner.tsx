import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface NativeBannerProps {
  className?: string;
}

export const NativeBanner: React.FC<NativeBannerProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [adHeight, setAdHeight] = useState<number>(115);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        if (
          event.data &&
          (event.data.type === 'MAXPLAY_NATIVE_AD_RESIZE' || event.data.type === 'MAXPLAY_AD_RESIZE') &&
          typeof event.data.height === 'number'
        ) {
          const clamped = Math.max(60, Math.min(event.data.height, 420));
          setAdHeight(clamped);
        }
      } catch (_) {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (user?.isPremium) return null;

  return (
    <div className={`w-full my-2.5 flex justify-center items-center overflow-hidden rounded-xl bg-transparent relative z-10 ${className}`}>
      <iframe
        src="/native-banner.html"
        title="Sponsored Advertisement"
        className="w-full border-none overflow-hidden transition-all duration-300"
        style={{ width: '100%', height: `${adHeight}px`, border: 'none', overflow: 'hidden' }}
        scrolling="no"
      />
    </div>
  );
};


