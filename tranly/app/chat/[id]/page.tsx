import { Suspense } from 'react';
import ChatScreen from '@/app/chat/_components/ChatScreen';

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <ChatScreen sessionId={id} />
    </Suspense>
  );
}
