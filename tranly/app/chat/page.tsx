'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useActiveLanguage } from '@/app/_lib/ActiveLanguageContext';

import { speechLangForLanguage } from './_lib/speechLangForLanguage';
import { useConversationSession } from './_lib/useConversationSession';
import { useTTS } from './_lib/useTTS';
import { useSTT } from './_lib/useSTT';
import ChatList from './_components/ChatList';
import ChatInput from './_components/ChatInput';
import ReplySuggestions from './_components/ReplySuggestions';
import type { ChatMessage, SessionConfig } from './_lib/types';

/**
 * The "Evely" tab — a full-screen, open-ended chat with Evely. It reuses the
 * existing conversation engine (`useConversationSession` + `/api/chat`), but
 * skips the topic/goal setup entirely: a session starts on mount with an
 * open-ended config (empty goal → the AI never concludes), so the learner can
 * just start typing.
 *
 * This screen is immersive — there is no BottomNav; the learner leaves via the
 * back button in the header.
 */
export default function ChatPage() {
  const router = useRouter();
  const { activeLanguage } = useActiveLanguage();
  const {
    messages,
    sendMessage,
    retryLastMessage,
    isLoading,
    error,
    startSession,
  } = useConversationSession();

  const speechLang = speechLangForLanguage(activeLanguage);
  const { speak } = useTTS(speechLang);

  const {
    startListening,
    stopListening,
    isListening,
    transcript,
    isSupported: sttSupported,
  } = useSTT();

  // Start an open-ended session as soon as the page mounts so the learner can
  // type immediately. The empty goal keeps the conversation going indefinitely;
  // the generic topic satisfies the /api/chat 2–100 char requirement.
  useEffect(() => {
    const config: SessionConfig = {
      topic: 'พูดคุยทั่วไป',
      goal: '',
      proficiencyLevel: 'beginner',
      wordContext: [],
      language: activeLanguage,
    };
    startSession(config);
  }, [activeLanguage, startSession]);

  // Reply suggestions for the latest AI message — shown only when it's the
  // user's turn (the last message is the assistant's).
  const lastMessage = messages[messages.length - 1];
  const currentSuggestions =
    lastMessage && lastMessage.role === 'assistant'
      ? lastMessage.suggestions ?? []
      : [];

  const handleSpeak = useCallback(
    (messageId: string, text?: string) => {
      if (text) {
        speak(text);
        return;
      }
      const message = messages.find((m: ChatMessage) => m.id === messageId);
      if (message && message.korean) {
        speak(message.korean);
      }
    },
    [messages, speak],
  );

  const handleStartListening = useCallback(() => {
    startListening(speechLang);
  }, [startListening, speechLang]);

  // Keep a no-op for ChatInput's word-tag removal — open chat has no word context.
  const noopRemoveWord = useCallback(() => {}, []);

  return (
    <div className="flex flex-col h-dvh dot-grid-bg relative">
      {/* Header: back button · Evely title · gems */}
      <header
        className="flex items-center justify-between gap-3 px-4 pb-3 border-b-3 border-border-color bg-card-bg"
        style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="flex h-10 w-10 items-center justify-center rounded-full border-3 border-border-color bg-card-bg text-text-primary shadow-nb-sm transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:bg-gray-50 dark:hover:bg-[#3d3d5c]"
            aria-label="ย้อนกลับ"
          >
            <ArrowLeftOutlined style={{ fontSize: 18 }} />
          </button>
          <h1 className="text-lg font-black text-text-primary">Evely</h1>
        </div>

      </header>

      <main
        className="flex-1 flex flex-col overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <ChatList
          messages={messages}
          isLoading={isLoading}
          error={error}
          onRetry={retryLastMessage}
          onSpeak={handleSpeak}
        />

        <div className="border-t-3 border-border-color bg-card-bg">
          {!isLoading && (
            <ReplySuggestions
              suggestions={currentSuggestions}
              onSelect={sendMessage}
              disabled={isLoading}
            />
          )}
          <div className="p-3">
            <ChatInput
              onSend={sendMessage}
              isLoading={isLoading}
              sttSupported={sttSupported}
              isListening={isListening}
              onStartListening={handleStartListening}
              onStopListening={stopListening}
              transcript={transcript}
              selectedWords={[]}
              onRemoveWord={noopRemoveWord}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
