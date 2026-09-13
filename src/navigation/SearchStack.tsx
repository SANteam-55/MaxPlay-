import React, { useState } from 'react';
import { SearchScreen } from '../screens/main/SearchScreen';
import { ContentDetailScreen } from '../screens/content/ContentDetailScreen';
import { FilterScreen } from '../screens/main/FilterScreen';
import { ContentItem } from '../types';

interface SearchStackProps {
  onSelectContent: (item: ContentItem) => void;
  onDetailOpenChange?: (isOpen: boolean) => void;
}

type ScreenState = 
  | { name: 'search' }
  | { name: 'detail', item: ContentItem }
  | { name: 'filter' };

export const SearchStack: React.FC<SearchStackProps> = ({ onSelectContent, onDetailOpenChange }) => {
  const [stack, setStack] = useState<ScreenState[]>([{ name: 'search' }]);

  const push = (screen: ScreenState) => setStack(prev => [...prev, screen]);
  const pop = () => setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);

  const current = stack[stack.length - 1];
  const isDetailOpen = current.name !== 'search';
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
    window.addEventListener('MAXPLAY_POP_STACK_SEARCH', handlePopStack);
    return () => {
      window.removeEventListener('MAXPLAY_POP_STACK_SEARCH', handlePopStack);
    };
  }, []);

  const handleSelect = (item: ContentItem) => {
    push({ name: 'detail', item });
    onSelectContent(item);
  };

  return (
    <div className="relative h-full w-full bg-[#0A0A0A] overflow-hidden">
      {/* Base SearchScreen - Permanently Mounted */}
      <div className={`h-full w-full ${current.name !== 'search' ? 'pointer-events-none' : ''}`}>
        <SearchScreen
          onSelectContent={handleSelect}
        />
      </div>

      {/* Stack Overlay Screens */}
      {current.name !== 'search' && (
        <div className="absolute inset-0 z-50 bg-[#0A0A0A] overflow-y-auto">
          {current.name === 'detail' && (
            <ContentDetailScreen
              content={current.item}
              onBack={() => window.history.back()}
              onSelectContent={handleSelect}
            />
          )}
          {current.name === 'filter' && (
            <FilterScreen
              onBack={() => window.history.back()}
              onOpenSearch={() => { /* fallback */ }}
              onSelectContent={handleSelect}
            />
          )}
        </div>
      )}
    </div>
  );
};
