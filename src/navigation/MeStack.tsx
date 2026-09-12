import React, { useState } from 'react';
import { MeScreen } from '../screens/main/MeScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { WatchHistoryScreen } from '../screens/settings/WatchHistoryScreen';
import { MyListScreen } from '../screens/settings/MyListScreen';
import { MessagesScreen } from '../screens/settings/MessagesScreen';
import { EditProfileScreen } from '../screens/settings/EditProfileScreen';
import { MyCommentsScreen } from '../screens/settings/MyCommentsScreen';
import { FeedbackScreen } from '../screens/settings/FeedbackScreen';
import { ContentDetailScreen } from '../screens/content/ContentDetailScreen';
import { useContent } from '../hooks/useContent';
import { ContentItem } from '../types';

interface MeStackProps {
  onLogout?: () => void;
  onPlayContent?: (contentId: string) => void;
  onDetailOpenChange?: (isOpen: boolean) => void;
}

type ScreenState = 
  | { name: 'me' }
  | { name: 'edit-profile' }
  | { name: 'settings' }
  | { name: 'history' }
  | { name: 'my-list' }
  | { name: 'messages' }
  | { name: 'my-comments' }
  | { name: 'feedback' }
  | { name: 'detail', item: ContentItem };

export const MeStack: React.FC<MeStackProps> = ({ onLogout, onDetailOpenChange }) => {
  const [stack, setStack] = useState<ScreenState[]>([{ name: 'me' }]);
  const { contentList } = useContent();

  const push = (screen: ScreenState) => setStack(prev => [...prev, screen]);
  const pop = () => setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);

  const current = stack[stack.length - 1];

  React.useEffect(() => {
    onDetailOpenChange?.(current.name === 'detail');
  }, [current.name, onDetailOpenChange]);

  const handlePlayContent = (contentId: string) => {
    const content = contentList.find(c => c.id === contentId);
    if (content) {
      push({ name: 'detail', item: content });
    }
  };

  return (
    <div className="relative h-full w-full bg-[#0A0A0A] overflow-hidden">
      {/* Base MeScreen - Permanently Mounted */}
      <div className={`h-full w-full ${current.name !== 'me' ? 'pointer-events-none' : ''}`}>
        <MeScreen
          onOpenEditProfile={() => push({ name: 'edit-profile' })}
          onOpenSettings={() => push({ name: 'settings' })}
          onOpenHistory={() => push({ name: 'history' })}
          onOpenMyList={() => push({ name: 'my-list' })}
          onOpenMessages={() => push({ name: 'messages' })}
          onOpenMyComments={() => push({ name: 'my-comments' })}
          onOpenFeedback={() => push({ name: 'feedback' })}
          onLogout={onLogout}
          onPlayContent={handlePlayContent}
        />
      </div>

      {/* Stack Overlay Screens */}
      {current.name !== 'me' && (
        <div className="absolute inset-0 z-50 bg-[#0A0A0A] overflow-y-auto">
          {current.name === 'detail' && (
            <ContentDetailScreen
              content={current.item}
              onBack={pop}
              onSelectContent={(item) => push({ name: 'detail', item })}
            />
          )}
          {current.name === 'edit-profile' && <EditProfileScreen onBack={pop} />}
          {current.name === 'settings' && (
            <SettingsScreen
              onBack={pop}
              onLogout={onLogout}
              onOpenFeedback={() => push({ name: 'feedback' })}
            />
          )}
          {current.name === 'feedback' && <FeedbackScreen onBack={pop} />}
          {current.name === 'history' && (
            <WatchHistoryScreen
              onBack={pop}
              onPlayContent={handlePlayContent}
            />
          )}
          {current.name === 'my-list' && (
            <MyListScreen
              onBack={pop}
              onPlayContent={handlePlayContent}
            />
          )}
          {current.name === 'messages' && <MessagesScreen onBack={pop} onPlayContent={handlePlayContent} />}
          {current.name === 'my-comments' && (
            <MyCommentsScreen 
              onBack={pop}
              onPlayContent={handlePlayContent}
            />
          )}
        </div>
      )}
    </div>
  );
};


