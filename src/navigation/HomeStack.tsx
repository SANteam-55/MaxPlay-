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
    try {
      if (window.location.hash.includes('-detail')) {
        window.history.back();
      }
    } catch (_) {}
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
    }
  }, [isDetailOpen]);

  React.useEffect(() => {
    const handlePopStack = () => {
      pop();
    };
    window.addEventListener('MAXPLAY_POP_STACK_HOME', handlePopStack);
    return () => {
      window.removeEventListener('MAXPLAY_POP_STACK_HOME', handlePopStack);
    };
  }, []);

  const handleSelect = (item: any) => {
    if (item.isCollection) {
      push({ name: 'collection_detail', item });
    } else {
      push({ name: 'detail', item });
      onSelectContent(item);
    }
  };

  const handleSelectNetwork = (network: NetworkItem) => {
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
            push({ name: 'filter', query: category });
          }}
        />
      </div>

      {/* Stack Overlay Screens */}
      {current.name !== 'home' && (
        <div className="absolute inset-0 z-50 bg-[#0A0A0A] overflow-y-auto">
          {current.name === 'network_detail' && (
            <NetworkDetailScreen
              network={current.network}
              onBack={handleBack}
              onSelectContent={handleSelect}
            />
          )}
          {current.name === 'collection_detail' && (
            <CollectionDetailScreen
              collection={current.item}
              onBack={handleBack}
              onSelectContent={handleSelect}
            />
          )}
          {current.name === 'detail' && (
            <ContentDetailScreen
              content={current.item}
              onBack={handleBack}
              onSelectContent={handleSelect}
            />
          )}
          {current.name === 'filter' && (
            <FilterScreen
              initialFilter={current.query}
              onBack={handleBack}
              onOpenSearch={onOpenSearch}
              onSelectContent={handleSelect}
            />
          )}
        </div>
      )}
    </div>
  );
};
