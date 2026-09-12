import React from 'react';

interface SubtitleOverlayProps {
  text: string | null;
  fontSize?: number; // default 16
  color?: string;    // default #FFE4B5 (yellow/cream)
  bgOpacity?: number;// default 0.6
  bottomOffset?: number; // distance from bottom
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  text,
  fontSize = 16,
  color = '#FFE4B5',
  bgOpacity = 0.6,
  bottomOffset = 60,
}) => {
  if (!text) return null;

  return (
    <div
      style={{ bottom: `${bottomOffset}px` }}
      className="absolute left-1/2 -translate-x-1/2 z-30 max-w-[85%] text-center pointer-events-none transition-all duration-150"
    >
      <div
        style={{
          backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`,
          color: color,
          fontSize: `${fontSize}px`,
        }}
        className="inline-block rounded-lg px-3.5 py-1.5 font-medium leading-snug shadow-lg backdrop-blur-xs select-none"
      >
        {text}
      </div>
    </div>
  );
};
