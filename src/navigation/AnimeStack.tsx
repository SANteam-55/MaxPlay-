import React, { useState } from 'react';
import { AnimeScreen } from '../screens/main/AnimeScreen';
import { ContentDetailScreen } from '../screens/content/ContentDetailScreen';
import { ContentItem } from '../types';

interface AnimeStackProps {
  onSelectContent?: (item: ContentItem) => void;
  onOpenSearch?: () => void;
  onDetailOpenChange?: (isOpen: boolean) => void;
}

type ScreenState = 
  | { name: 'anime' }
  | { name: 'detail', item: ContentItem };

export const AnimeStack: React.FC<AnimeStackProps> = ({
  onSelectContent,
  onOpenSearch,
  onDetailOpenChange,
}) => {
  const [stack, setStack] = useState<ScreenState[]>([{ name: 'anime' }]);

  const push = (screen: ScreenState) => setStack(prev => [...prev, screen]);
  const pop = () => setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);

  const handleBack = () => {
    pop();
    try {
      if (window.location.hash.includes('-detail')) {
        window.history.back();
      }
    } catch (_) {}
  };

  const current = stack[stack.length - 1];
  const isDetailOpen = current.name !== 'anime';
  const prevIsOpenRef = React.useRef<boolean>(false);
  const onDetailOpenChangeRef = React.useRef(onDetailOpenChange);
  onDetailOpenChangeRef.current = onDetailOpenChange;

  React.useEffect(() => {
    if (prevIsOpenRef.current !== isDetailOpen) {
      prevIsOpenRef.current = isDetailOpen;
      onDetailOpenChangeRef.current?.(isDetailOpen);
    }
  }, [isDetailOpen]);

  React.useEffect(() => {
    const handlePopStack = () => {
      pop();
    };
    window.addEventListener('MAXPLAY_POP_STACK_ANIME', handlePopStack);
    return () => {
      window.removeEventListener('MAXPLAY_POP_STACK_ANIME', handlePopStack);
    };
  }, []);

  const handleSelect = (item: ContentItem) => {
    push({ name: 'detail', item });
    if (onSelectContent) {
      onSelectContent(item);
    }
  };

  return (
    <div className="relative h-full w-full bg-[#0A0A0A] overflow-hidden">
      {/* Base AnimeScreen - Permanently Mounted */}
      <div className={`h-full w-full ${current.name !== 'anime' ? 'pointer-events-none' : ''}`}>
        <AnimeScreen
          onSelectContent={handleSelect}
          onOpenSearch={onOpenSearch}
        />
      </div>

      {/* Detail Screen Overlay */}
      {current.name === 'detail' && (
        <div className="absolute inset-0 z-50 bg-[#0A0A0A] overflow-y-auto">
          <ContentDetailScreen
            content={current.item}
            onBack={handleBack}
            onSelectContent={handleSelect}
          />
        </div>
      )}
    </div>
  );
};
