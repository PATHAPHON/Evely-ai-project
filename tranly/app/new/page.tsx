import { Suspense } from 'react';
import ChatScreen from '@/app/chat/_components/ChatScreen';

export default function NewChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatScreen sessionId={null} />
    </Suspense>
  );
}
