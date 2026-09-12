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

  React.useEffect(() => {
    onDetailOpenChange?.(current.name === 'detail');
  }, [current.name, onDetailOpenChange]);

  const handleSelect = (item: ContentItem) => {
    push({ name: 'detail', item });
    onSelectContent(item);
  };

  switch (current.name) {
    case 'detail':
      return (
        <ContentDetailScreen
          content={current.item}
          onBack={pop}
          onSelectContent={handleSelect}
        />
      );
    case 'filter':
      return (
        <FilterScreen
          onBack={pop}
          onOpenSearch={() => { /* fallback */ }}
          onSelectContent={handleSelect}
        />
      );
    case 'search':
    default:
      return (
        <SearchScreen
          onSelectContent={handleSelect}
        />
      );
  }
};
