import React, { useState, useRef, useEffect } from 'react';

interface ProgressBarProps {
  currentTime: number; // in seconds
  duration: number;    // in seconds
  buffered?: number;   // 0 to 100 percentage
  onSeek: (time: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  skipMarkers?: {
    intro?: { start: number; end: number };
    outro?: { start: number; end: number };
    credits?: { start: number; end: number };
  };
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTime,
  duration,
  buffered = 0,
  onSeek,
  onScrubStart,
  onScrubEnd,
  skipMarkers,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const dragTimeRef = useRef<number | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  const displayTime = isDragging && dragTime !== null ? dragTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);

    const pad = (num: number) => (num < 10 ? `0${num}` : `${num}`);
    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(s)}`;
    }
    return `${pad(mins)}:${pad(s)}`;
  };

  const getTimeFromEvent = (e: React.MouseEvent | MouseEvent | TouchEvent | React.TouchEvent) => {
    if (!barRef.current || duration <= 0) return 0;
    const rect = barRef.current.getBoundingClientRect();
    let clientX = 0;
    const nativeEvent = 'nativeEvent' in e ? (e as any).nativeEvent : e;

    if ('touches' in nativeEvent && nativeEvent.touches && nativeEvent.touches.length > 0) {
      clientX = nativeEvent.touches[0].clientX;
    } else if ('changedTouches' in nativeEvent && nativeEvent.changedTouches && nativeEvent.changedTouches.length > 0) {
      clientX = nativeEvent.changedTouches[0].clientX;
    } else if ('clientX' in nativeEvent) {
      clientX = (nativeEvent as MouseEvent).clientX;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
    }

    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    return ratio * duration;
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    onScrubStart?.();
    const newTime = getTimeFromEvent(e);
    setDragTime(newTime);
    dragTimeRef.current = newTime;
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (isDragging) {
        const newTime = getTimeFromEvent(e);
        setDragTime(newTime);
        dragTimeRef.current = newTime;
      }
    };

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      if (isDragging) {
        const finalTime = dragTimeRef.current ?? 0;
        onSeek(finalTime);
        setIsDragging(false);
        setDragTime(null);
        dragTimeRef.current = null;
        onScrubEnd?.();
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, duration]);

  return (
    <div
      ref={barRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleStart}
      onTouchStart={handleStart}
      className="relative flex h-6 w-full cursor-pointer items-center py-2 select-none group touch-none"
      data-interactive="true"
    >
      {/* Time Tooltip during Drag/Hover */}
      {(isHovered || isDragging) && (
        <div
          style={{ left: `${Math.min(95, Math.max(5, progressPercent))}%` }}
          className="absolute -top-7 -translate-x-1/2 rounded bg-black/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-md border border-white/10 pointer-events-none"
        >
          {formatTime(displayTime)}
        </div>
      )}

      {/* Main Track Bar */}
      <div className="relative h-1.5 w-full rounded-full bg-white/20 transition-all duration-150 group-hover:h-2.5 overflow-hidden">
        {/* Buffer Bar */}
        <div
          style={{ width: `${buffered}%` }}
          className="absolute h-full bg-white/30 transition-all duration-300"
        />

        {/* Progress Fill Bar */}
        <div
          style={{ width: `${progressPercent}%` }}
          className="absolute h-full bg-[#8B5CF6] z-10"
        />
      </div>

      {/* Scrubber Thumb Knob */}
      <div
        style={{ left: `${progressPercent}%` }}
        className={`absolute -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-[#8B5CF6] border-2 border-white shadow-lg transition-transform duration-100 ${
          isHovered || isDragging ? 'scale-125' : 'scale-100'
        }`}
      />
    </div>
  );
};
