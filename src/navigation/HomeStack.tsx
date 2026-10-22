import React, { useState } from 'react';
import { HomeScreen } from '../screens/main/HomeScreen';
import { FilterScreen } from '../screens/main/FilterScreen';
import { ContentDetailScreen } from '../screens/content/ContentDetailScreen';
import { CollectionDetailScreen } from '../screens/content/CollectionDetailScreen';
import { NetworkDetailScreen } from '../screens/content/NetworkDetailScreen';
import { ContentItem, NetworkItem } from '../types';

interface HomeStackProps {
  onSelectContent: (item: ContentItem) => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onDetailOpenChange?: (isOpen: boolean) => void;
}

type ScreenState = 
  | { name: 'home' }
  | { name: 'filter', query: string }
  | { name: 'detail', item: ContentItem }
  | { name: 'collection_detail', item: ContentItem }
  | { name: 'network_detail', network: NetworkItem };

export const HomeStack: React.FC<HomeStackProps> = ({
  onSelectContent,
  onOpenSearch,
  onOpenNotifications,
  onDetailOpenChange,
}) => {
  const [stack, setStack] = useState<ScreenState[]>([{ name: 'home' }]);

  const push = (screen: ScreenState) => setStack(prev => [...prev, screen]);
  const pop = () => setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);

  const handleBack = () => {
    pop();
    window.dispatchEvent(new CustomEvent('MAXPLAY_RESTORE_SCROLL_HOME'));
  };

  const current = stack[stack.length - 1];
  const isDetailOpen = current.name !== 'home';
  const prevIsOpenRef = React.useRef<boolean>(false);
  const onDetailOpenChangeRef = React.useRef(onDetailOpenChange);
  onDetailOpenChangeRef.current = onDetailOpenChange;

  React.useEffect(() => {
    if (prevIsOpenRef.current !== isDetailOpen) {
      prevIsOpenRef.current = isDetailOpen;
      onDetailOpenChangeRef.current?.(isDetailOpen);
      if (!isDetailOpen) {
        window.dispatchEvent(new CustomEvent('MAXPLAY_RESTORE_SCROLL_HOME'));
      }
    }
  }, [isDetailOpen]);

  React.useEffect(() => {
    const handlePopStack = () => {
      pop();
      window.dispatchEvent(new CustomEvent('MAXPLAY_RESTORE_SCROLL_HOME'));
    };
    window.addEventListener('MAXPLAY_POP_STACK_HOME', handlePopStack);
    const handleSelectExternal = (e: any) => {
      if (e.detail) handleSelect(e.detail);
    };
    window.addEventListener('MAXPLAY_SELECT_CONTENT', handleSelectExternal);

    return () => {
      window.removeEventListener('MAXPLAY_POP_STACK_HOME', handlePopStack);
      window.removeEventListener('MAXPLAY_SELECT_CONTENT', handleSelectExternal);
    };
  }, []);

  const handleSelect = (item: any) => {
    window.dispatchEvent(new CustomEvent('MAXPLAY_SAVE_SCROLL_HOME'));
    if (item.isCollection) {
      push({ name: 'collection_detail', item });
    } else {
      push({ name: 'detail', item });
      onSelectContent(item);
    }
  };

  const handleSelectNetwork = (network: NetworkItem) => {
    window.dispatchEvent(new CustomEvent('MAXPLAY_SAVE_SCROLL_HOME'));
    push({ name: 'network_detail', network });
  };

  return (
    <div className="relative h-full w-full bg-[#0A0A0A] overflow-hidden">
      {/* Base HomeScreen - Permanently Mounted to preserve exact scroll position */}
      <div className={`h-full w-full ${current.name !== 'home' ? 'pointer-events-none' : ''}`}>
        <HomeScreen
          onSelectContent={handleSelect}
          onSelectNetwork={handleSelectNetwork}
          onOpenSearch={onOpenSearch}
          onOpenNotifications={onOpenNotifications}
          onSeeAllCategory={(category) => {
            window.dispatchEvent(new CustomEvent('MAXPLAY_SAVE_SCROLL_HOME'));
            push({ name: 'filter', query: category });
          }}
        />
      </div>

      {/* Stack Overlay Screens - Keep intermediate screens mounted so back button preserves scroll position */}
      {stack.slice(1).map((screen, idx) => {
        const isTop = idx === stack.length - 2;
        return (
          <div
            key={`${screen.name}-${idx}`}
            className={`absolute inset-0 z-50 bg-[#0A0A0A] overflow-y-auto ${isTop ? 'block' : 'hidden'}`}
          >
            {screen.name === 'network_detail' && (
              <NetworkDetailScreen
                network={screen.network}
                onBack={handleBack}
                onSelectContent={handleSelect}
              />
            )}
            {screen.name === 'collection_detail' && (
              <CollectionDetailScreen
                collection={screen.item}
                onBack={handleBack}
                onSelectContent={handleSelect}
              />
            )}
            {screen.name === 'detail' && isTop && (
              <ContentDetailScreen
                content={screen.item}
                onBack={handleBack}
                onSelectContent={handleSelect}
              />
            )}
            {screen.name === 'filter' && (
              <FilterScreen
                initialFilter={screen.query}
                onBack={handleBack}
                onOpenSearch={onOpenSearch}
                onSelectContent={handleSelect}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
