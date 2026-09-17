import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, RotateCw, FastForward, Rewind } from 'lucide-react';

interface GestureHandlerProps {
  children: React.ReactNode;
  isLocked: boolean;
  onToggleControls: () => void;
  onDoubleTapRewind: () => void;
  onDoubleTapForward: () => void;
  onChangeBrightness?: (delta: number) => void;
  onChangeVolume?: (delta: number) => void;
  onLongPressStart?: () => void;
  onLongPressMove?: (deltaX: number) => void;
  onLongPressEnd?: () => void;
}

export const GestureHandler: React.FC<GestureHandlerProps> = ({
  children,
  isLocked,
  onToggleControls,
  onDoubleTapRewind,
  onDoubleTapForward,
  onChangeBrightness,
  onChangeVolume,
  onLongPressStart,
  onLongPressMove,
  onLongPressEnd,
}) => {
  const [doubleTapSide, setDoubleTapSide] = useState<'left' | 'right' | null>(null);
  const [rippleKey, setRippleKey] = useState<number>(0);
  
  // Touch tracking references
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const mouseStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragSideRef = useRef<'left' | 'right' | null>(null);
  const animTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTouchTimeRef = useRef<number>(0);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressingRef = useRef<boolean>(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Prevent default browser context menu (Back, Forward, Reload, Share, etc.) during long press gestures
  useEffect(() => {
    const handlePreventContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const overlay = overlayRef.current;
    if (overlay) {
      overlay.addEventListener('contextmenu', handlePreventContextMenu, { passive: false });
    }

    return () => {
      if (overlay) {
        overlay.removeEventListener('contextmenu', handlePreventContextMenu);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
      if (isLongPressingRef.current && onLongPressEnd) onLongPressEnd();
    };
  }, [onLongPressEnd]);

  const triggerRewindAnimation = () => {
    onDoubleTapRewind();
    setDoubleTapSide('left');
    setRippleKey((k) => k + 1);
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    animTimeoutRef.current = setTimeout(() => {
      setDoubleTapSide(null);
    }, 650);
  };

  const triggerForwardAnimation = () => {
    onDoubleTapForward();
    setDoubleTapSide('right');
    setRippleKey((k) => k + 1);
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    animTimeoutRef.current = setTimeout(() => {
      setDoubleTapSide(null);
    }, 650);
  };

  const clearLongPress = () => {
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    if (isLongPressingRef.current) {
      isLongPressingRef.current = false;
      if (onLongPressEnd) onLongPressEnd();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    lastTouchTimeRef.current = Date.now();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      isDraggingRef.current = false;
      dragSideRef.current = null;
      
      clearLongPress();
      if (!isLocked && onLongPressStart) {
        longPressTimeoutRef.current = setTimeout(() => {
          if (!isDraggingRef.current) {
            isLongPressingRef.current = true;
            onLongPressStart();
          }
        }, 300);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    lastTouchTimeRef.current = Date.now();
    if (isLocked) return;
    if (!touchStartPosRef.current || e.touches.length === 0) return;

    const touch = e.touches[0];

    // Priority 1: When long-pressing, horizontal finger movement slides the speed capsule!
    if (isLongPressingRef.current) {
      const deltaX = touch.clientX - touchStartPosRef.current.x;
      if (onLongPressMove) {
        onLongPressMove(deltaX);
      }
      return;
    }

    // Only process brightness/volume drag if handlers exist
    if (!onChangeBrightness && !onChangeVolume) return;

    if (!isDraggingRef.current) {
      const deltaX = touch.clientX - touchStartPosRef.current.x;
      const deltaY = touch.clientY - touchStartPosRef.current.y;

      // Intentional vertical swipe threshold: 16px travel and vertical angle dominance
      if (Math.abs(deltaY) > 16 && Math.abs(deltaY) > Math.abs(deltaX) * 1.2) {
        isDraggingRef.current = true;
        clearLongPress();
        const screenWidth = window.innerWidth;
        dragSideRef.current = touchStartPosRef.current.x < screenWidth / 2 ? 'left' : 'right';
        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    } else {
      // Actively dragging: update every single touch frame for 60fps/120fps fluid response
      const deltaY = touch.clientY - touchStartPosRef.current.y;
      const sensitivity = 0.55;

      if (dragSideRef.current === 'left' && onChangeBrightness) {
        onChangeBrightness(-deltaY * sensitivity);
      } else if (dragSideRef.current === 'right' && onChangeVolume) {
        onChangeVolume(-deltaY * sensitivity);
      }

      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    lastTouchTimeRef.current = Date.now();
    
    const wasLongPressing = isLongPressingRef.current;
    clearLongPress();
    
    // If it was an actual swipe drag, don't trigger tap
    if (isDraggingRef.current) {
      touchStartPosRef.current = null;
      isDraggingRef.current = false;
      dragSideRef.current = null;
      return;
    }

    if (wasLongPressing) {
      touchStartPosRef.current = null;
      return;
    }

    if (!touchStartPosRef.current) return;

    if (isLocked) {
      onToggleControls();
      touchStartPosRef.current = null;
      return;
    }

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;
    const touch = e.changedTouches[0];
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const relativeX = touch.clientX - rect.left;
    const containerWidth = rect.width || window.innerWidth;

    // Verify tap distance is minimal to avoid treating a slight slide as a tap
    const tapDistanceX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const tapDistanceY = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (tapDistanceX > 80 || tapDistanceY > 80) {
      // It was a sloppy drag that didn't trigger swipe threshold, ignore as tap
      touchStartPosRef.current = null;
      return;
    }

    // Check if double tap (< 350ms from last tap and near same point)
    if (timeSinceLastTap < 350 && lastTapPosRef.current) {
      const dist = Math.hypot(
        touch.clientX - lastTapPosRef.current.x,
        touch.clientY - lastTapPosRef.current.y
      );

      if (dist < 80) {
        // Double tap confirmed!
        lastTapTimeRef.current = 0;
        lastTapPosRef.current = null;

        if (relativeX < containerWidth * 0.4) {
          triggerRewindAnimation();
        } else if (relativeX > containerWidth * 0.6) {
          triggerForwardAnimation();
        } else {
          onToggleControls();
        }
        touchStartPosRef.current = null;
        return;
      }
    }

    // First tap -> Trigger instant toggle
    lastTapTimeRef.current = now;
    lastTapPosRef.current = { x: touch.clientX, y: touch.clientY };

    onToggleControls(); // Instant response
    touchStartPosRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (Date.now() - lastTouchTimeRef.current < 800) return;
    mouseStartPosRef.current = { x: e.clientX, y: e.clientY };
    clearLongPress();
    if (!isLocked && onLongPressStart) {
      longPressTimeoutRef.current = setTimeout(() => {
        isLongPressingRef.current = true;
        onLongPressStart();
      }, 300);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isLongPressingRef.current && onLongPressMove && mouseStartPosRef.current) {
      const deltaX = e.clientX - mouseStartPosRef.current.x;
      onLongPressMove(deltaX);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const wasLongPressing = isLongPressingRef.current;
    clearLongPress();
    mouseStartPosRef.current = null;
    
    // Ignore synthetic click event triggered right after touch to prevent double firing
    if (Date.now() - lastTouchTimeRef.current < 800) {
      return;
    }

    if (wasLongPressing) return;

    if (isLocked) {
      onToggleControls();
      return;
    }

    // Ignore second click of a double click so it doesn't toggle controls off again unnecessarily
    if (e.detail >= 2) return;

    onToggleControls(); // Instant response
  };

  const handleMouseLeave = () => {
    if (isLongPressingRef.current) {
      clearLongPress();
    }
    mouseStartPosRef.current = null;
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (Date.now() - lastTouchTimeRef.current < 600) return;
    if (isLocked) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (clickX < width * 0.4) {
      triggerRewindAnimation();
    } else if (clickX > width * 0.6) {
      triggerForwardAnimation();
    } else {
      onToggleControls();
    }
  };

  return (
    <div 
      className="relative h-full w-full overflow-hidden select-none no-callout"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Background children (video, controls, etc.) */}
      {children}

      {/* Explicit Gesture Catching Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-10 touch-none cursor-pointer bg-black/1 select-none no-callout"
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleMouseUp}
      />

      {/* Double Tap / Click Left Ripple Overlay (-10 SEC) */}
      {doubleTapSide === 'left' && (
        <div
          key={`left-${rippleKey}`}
          className="pointer-events-none absolute left-0 top-0 bottom-0 z-40 flex w-[45%] items-center justify-center rounded-r-full bg-gradient-to-r from-black/70 via-purple-600/30 to-transparent backdrop-blur-[2px] animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex flex-col items-center justify-center text-white drop-shadow-lg scale-100 animate-pulse">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-purple-600/40 border border-purple-400/50 shadow-xl shadow-purple-500/40 backdrop-blur-md">
              <RotateCcw className="h-8 w-8 text-purple-200 animate-spin -scale-x-100 [animation-duration:1s]" />
            </div>
            <div className="flex items-center gap-1.5 mt-2.5 bg-black/70 px-3.5 py-1 rounded-full border border-white/20 backdrop-blur-md">
              <Rewind className="h-3.5 w-3.5 text-purple-400 fill-purple-400" />
              <span className="text-xs font-black tracking-wider text-white">10 SECONDS</span>
            </div>
          </div>
        </div>
      )}

      {/* Double Tap / Click Right Ripple Overlay (+10 SEC) */}
      {doubleTapSide === 'right' && (
        <div
          key={`right-${rippleKey}`}
          className="pointer-events-none absolute right-0 top-0 bottom-0 z-40 flex w-[45%] items-center justify-center rounded-l-full bg-gradient-to-l from-black/70 via-purple-600/30 to-transparent backdrop-blur-[2px] animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex flex-col items-center justify-center text-white drop-shadow-lg scale-100 animate-pulse">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-purple-600/40 border border-purple-400/50 shadow-xl shadow-purple-500/40 backdrop-blur-md">
              <RotateCw className="h-8 w-8 text-purple-200 animate-spin [animation-duration:1s]" />
            </div>
            <div className="flex items-center gap-1.5 mt-2.5 bg-black/70 px-3.5 py-1 rounded-full border border-white/20 backdrop-blur-md">
              <span className="text-xs font-black tracking-wider text-white">10 SECONDS</span>
              <FastForward className="h-3.5 w-3.5 text-purple-400 fill-purple-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


