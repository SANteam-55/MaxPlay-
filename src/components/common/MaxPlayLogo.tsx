import React from 'react';
import { useGeneralSettings } from '../../hooks/useGeneralSettings';

export interface MaxPlayLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero' | number;
  withText?: boolean;
  textClassName?: string;
  className?: string;
  glow?: boolean;
  variant?: 'full' | 'icon-only' | 'flat';
  onClick?: () => void;
}

export const MaxPlayLogo: React.FC<MaxPlayLogoProps> = ({
  size = 'md',
  withText = false,
  textClassName = '',
  className = '',
  glow = false,
  variant = 'full',
  onClick,
}) => {
  const { customLogoUrl, appName } = useGeneralSettings();
  
  // New default logo as requested
  const defaultLogoUrl = 'https://i.ibb.co/G4bcVYwY/Picsart-26-07-03-00-56-20-216-removebg-preview.png';
  const finalLogoUrl = customLogoUrl || defaultLogoUrl;
  
  // Dimension mapping
  let pxSize = 44;
  let textFontSize = 'text-xl';
  let cornerRadius = 11;

  if (typeof size === 'number') {
    pxSize = size;
    cornerRadius = Math.round(size * 0.24);
  } else {
    switch (size) {
      case 'xs':
        pxSize = 24;
        textFontSize = 'text-sm';
        cornerRadius = 6;
        break;
      case 'sm':
        pxSize = 32;
        textFontSize = 'text-base';
        cornerRadius = 8;
        break;
      case 'md':
        pxSize = 44;
        textFontSize = 'text-xl';
        cornerRadius = 11;
        break;
      case 'lg':
        pxSize = 64;
        textFontSize = 'text-2xl';
        cornerRadius = 16;
        break;
      case 'xl':
        pxSize = 88;
        textFontSize = 'text-3xl';
        cornerRadius = 22;
        break;
      case 'hero':
        pxSize = 112;
        textFontSize = 'text-4xl';
        cornerRadius = 28;
        break;
    }
  }

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer hover:opacity-95' : ''} ${className}`}
    >
      {/* Logo Icon Box */}
      <div
        style={{
          width: pxSize,
          height: pxSize,
        }}
        className="relative shrink-0 flex items-center justify-center transition-transform active:scale-95"
      >
        <img 
          src={finalLogoUrl} 
          alt={appName || "App Logo"} 
          className={`w-full h-full object-contain ${glow ? 'drop-shadow-[0_0_16px_rgba(255,255,255,0.3)]' : ''}`} 
        />
      </div>

      {/* Optional Wordmark "MaxPlay" */}
      {withText && (
        <div className="flex flex-col">
          <span className={`font-black tracking-tight leading-none text-white ${textFontSize} ${textClassName}`}>
            Max<span className="bg-gradient-to-r from-[#D946EF] via-[#A855F7] to-[#38BDF8] bg-clip-text text-transparent">Play</span>
          </span>
        </div>
      )}
    </div>
  );
};
