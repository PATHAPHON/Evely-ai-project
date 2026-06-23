'use client';

import { Suspense, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useActiveLanguage } from '@/app/_lib/contexts/ActiveLanguageContext';

import { speechLangForLanguage } from './_lib/utils/speechLangForLanguage';
import { useConversationSession } from './_lib/hooks/useConversationSession';
import { useTTS } from './_lib/hooks/useTTS';
import { useSTT } from './_lib/hooks/useSTT';
import { useSuggestionPanel } from './_lib/hooks/useSuggestionPanel';
import ChatList from './_components/ChatList';
import ChatInput from './_components/ChatInput';
import SuggestionOptions from './_components/SuggestionOptions';
import ElephantMascot from './_components/ElephantMascot';
import { useUserProfile } from '@/app/_lib/hooks/useUserProfile';
import type { SessionConfig } from './_lib/types/types';

import { BulbOutlined } from '@ant-design/icons';
import GeminiLayout from '@/app/_components/GeminiLayout';

/**
 * The "Evely" tab — a full-screen, open-ended chat with Evely.
 */
function ChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get('session');

  const { activeLanguage } = useActiveLanguage();
  const { displayName } = useUserProfile();
  const {
    messages: sessionMessages,
    sendMessage: sendSessionMessage,
    retryLastMessage: retrySessionMessage,
    isLoading: isSessionLoading,
    error: sessionError,
    startSession,
    restoreSession,
    sessionId,
    sessionSaved,
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

  // Start a fresh open-ended session.
  const startOpenSession = useCallback(() => {
    const config: SessionConfig = {
      language: activeLanguage,
    };
    startSession(config);
  }, [activeLanguage, startSession]);

  // On mount (or when ?session= changes): restore an existing conversation,
  // otherwise begin a brand-new one. The sentinel guards against re-starting a
  // fresh session when this effect re-runs purely because a callback dep's
  // identity changed.
  const OPEN_SESSION = '__open__';
  const restoredRef = useRef<string | null>(null);
  useEffect(() => {
    if (sessionParam) {
      if (restoredRef.current === sessionParam) return;
      restoredRef.current = sessionParam;
      void restoreSession(sessionParam, activeLanguage);
    } else {
      if (restoredRef.current === OPEN_SESSION) return;
      restoredRef.current = OPEN_SESSION;
      startOpenSession();
    }
  }, [sessionParam, activeLanguage, restoreSession, startOpenSession]);

  // Synchronize dynamic session ID to URL once the session is successfully persisted.
  useEffect(() => {
    if (sessionSaved && sessionId && !sessionParam) {
      restoredRef.current = sessionId;
      router.replace(`/chat?session=${sessionId}`);
    }
  }, [sessionSaved, sessionId, sessionParam, router]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      await sendSessionMessage(trimmed);
    },
    [sendSessionMessage]
  );

  // Suggested replies for latest AI message
  const lastMessage = sessionMessages[sessionMessages.length - 1];
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
      const message = sessionMessages.find((m) => m.id === messageId);
      if (message && message.englishText) {
        speak(message.englishText);
      }
    },
    [sessionMessages, speak]
  );

  const handleStartListening = useCallback(() => {
    startListening(speechLang);
  }, [startListening, speechLang]);

  const noopRemoveWord = useCallback(() => {}, []);

  // Start a fresh new chat session.
  const handleNewChat = useCallback(() => {
    if (sessionParam) {
      router.push('/chat');
    } else {
      startOpenSession();
    }
  }, [sessionParam, router, startOpenSession]);

  const isEmptyChat =
    sessionMessages.length === 0 &&
    !isSessionLoading &&
    !sessionError;

  const {
    isOptionsCollapsed,
    isAnimating,
    inputResetKey,
    optionsMode,
    toggleOptions,
    handleToggleSuggestions,
    handleOptionsSkip,
  } = useSuggestionPanel({
    lastMessage,
    currentSuggestions,
    isLoading: isSessionLoading,
  });

  const chatInput = (
    <ChatInput
      onSend={handleSendMessage}
      isLoading={isSessionLoading}
      sttSupported={sttSupported}
      isListening={isListening}
      onStartListening={handleStartListening}
      onStopListening={stopListening}
      transcript={transcript}
      selectedWords={[]}
      onRemoveWord={noopRemoveWord}
      skillsEnabled
      resetKey={inputResetKey}
    />
  );

  return (
    <GeminiLayout onNewChat={handleNewChat}>
      <div
        className={`flex-1 flex flex-col overflow-hidden relative ${
          isEmptyChat
            ? 'bg-gradient-to-b from-white via-white to-[#d3e3fd] dark:from-[#131314] dark:via-[#131314] dark:to-[#1c2a44]'
            : ''
        }`}
      >
        {isEmptyChat ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
            <ElephantMascot state="idle" size={64} />
            <p className="text-2xl font-semibold leading-snug text-gray-900 dark:text-gray-100">
              สวัสดี คุณ {displayName}
              <br />
              จะทำอะไรต่อดี
            </p>
          </div>
        ) : (
          <ChatList
            messages={sessionMessages}
            isLoading={isSessionLoading}
            error={sessionError}
            onRetry={retrySessionMessage}
            onSpeak={handleSpeak}
          />
        )}

        {/* Floating Gemini-style input area */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-1 bg-transparent z-40 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <div className={`transition-all duration-200 ease-out transform ${
              isAnimating ? 'opacity-0 translate-y-2 scale-[0.99]' : 'opacity-100 translate-y-0 scale-100'
            }`}>
              {optionsMode && !isOptionsCollapsed ? (
                <div className="rounded-[28px] bg-white dark:bg-[#1e1f20] p-2 shadow-[0_2px_16px_rgba(0,0,0,0.10)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.45)]">
                  <SuggestionOptions
                    options={currentSuggestions.map((s) => ({
                      text: s.englishText,
                      subtext: s.translation,
                    }))}
                    onSelect={handleSendMessage}
                    onSkip={handleOptionsSkip}
                    onCollapse={() => toggleOptions(true)}
                    disabled={isSessionLoading}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {optionsMode && isOptionsCollapsed && (
                    <div className="flex justify-center animate-bubble-pop-in">
                      <button
                        type="button"
                        onClick={handleToggleSuggestions}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-950/45 cursor-pointer shadow-sm"
                      >
                        <BulbOutlined style={{ fontSize: 13 }} />
                        <span>แสดงคำแนะนำตัวเลือกการตอบ</span>
                      </button>
                    </div>
                  )}
                  {chatInput}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </GeminiLayout>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}
