import { Suspense } from 'react';
import ChatScreen from '@/features/chat/components/ChatScreen';

export default function NewChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatScreen sessionId={null} />
    </Suspense>
  );
}
