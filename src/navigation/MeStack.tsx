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

  const handleBack = () => {
    pop();
    try {
      if (window.location.hash.includes('-detail')) {
        window.history.back();
      }
    } catch (_) {}
  };

  const current = stack[stack.length - 1];
  const isDetailOpen = current.name !== 'me';
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
    window.addEventListener('MAXPLAY_POP_STACK_ME', handlePopStack);
    return () => {
      window.removeEventListener('MAXPLAY_POP_STACK_ME', handlePopStack);
    };
  }, []);

  const handlePlayContent = (contentId: string, historyMeta?: any) => {
    const content = contentList.find(c => c.id === contentId);
    if (content) {
      const itemToPush = historyMeta ? { ...content, _historyResume: historyMeta } : content;
      push({ name: 'detail', item: itemToPush });
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
              onBack={handleBack}
              onSelectContent={(item) => push({ name: 'detail', item })}
            />
          )}
          {current.name === 'edit-profile' && <EditProfileScreen onBack={handleBack} />}
          {current.name === 'settings' && (
            <SettingsScreen
              onBack={handleBack}
              onLogout={onLogout}
              onOpenFeedback={() => push({ name: 'feedback' })}
            />
          )}
          {current.name === 'feedback' && <FeedbackScreen onBack={handleBack} />}
          {current.name === 'history' && (
            <WatchHistoryScreen
              onBack={handleBack}
              onPlayContent={handlePlayContent}
            />
          )}
          {current.name === 'my-list' && (
            <MyListScreen
              onBack={handleBack}
              onPlayContent={handlePlayContent}
            />
          )}
          {current.name === 'messages' && <MessagesScreen onBack={handleBack} onPlayContent={handlePlayContent} />}
          {current.name === 'my-comments' && (
            <MyCommentsScreen 
              onBack={handleBack}
              onPlayContent={handlePlayContent}
            />
          )}
        </div>
      )}
    </div>
  );
};


