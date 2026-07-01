'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useActiveLanguage } from '@/app/_lib/contexts/ActiveLanguageContext';

import { speechLangForLanguage } from '../_lib/utils/speechLangForLanguage';
import { useConversationSession } from '../_lib/hooks/useConversationSession';
import { useTTS } from '../_lib/hooks/useTTS';
import { useSTT } from '../_lib/hooks/useSTT';
import { useSuggestionPanel } from '../_lib/hooks/useSuggestionPanel';
import ChatList from './ChatList';
import ChatInput from './ChatInput';
import VoiceMode from './VoiceMode';
import SuggestionOptions from './SuggestionOptions';
import { useUserProfile } from '@/app/_lib/hooks/useUserProfile';
import { useBudgetExhausted } from '@/app/_lib/hooks/useBudgetExhausted';
import { useStrings } from '@/app/_lib/utils/strings';
import type { SessionConfig } from '../_lib/types/types';
import { useToast } from '@/app/_components/Toast';

import { Lightbulb } from 'lucide-react';
import AppShell from '@/app/_components/AppShell';

interface ChatScreenProps {
  /** Existing session id to restore, or null for a brand-new open session. */
  sessionId: string | null;
}

/**
 * The chat tab — a full-screen, open-ended chat with จีจีจบล่ะ.
 * Used by both /new (sessionId null) and /chat/[id] (sessionId set).
 */
export default function ChatScreen({ sessionId: sessionParam }: ChatScreenProps) {
  const router = useRouter();
  const t = useStrings();
  const { showToast } = useToast();
  const [voiceMode, setVoiceMode] = useState(false);

  const { activeLanguage } = useActiveLanguage();
  const { displayName, isPremium } = useUserProfile();
  const { exhausted: budgetExhausted } = useBudgetExhausted();
  const {
    messages: sessionMessages,
    sendMessage: sendSessionMessage,
    retryLastMessage: retrySessionMessage,
    isLoading: isSessionLoading,
    error: sessionError,
    startSession,
    restoreSession,
    sessionId,
  } = useConversationSession(isPremium);

  const speechLang = speechLangForLanguage(activeLanguage);
  const { speak } = useTTS(speechLang);

  const {
    startListening,
    stopListening,
    isListening,
    transcript,
    isSupported: sttSupported,
    error: sttError,
    isTranscribing,
  } = useSTT();

  useEffect(() => {
    if (sttError) {
      showToast(sttError, 'error');
    }
  }, [sttError, showToast]);

  // Start a fresh open-ended session.
  const startOpenSession = useCallback(() => {
    const config: SessionConfig = {
      language: activeLanguage,
    };
    startSession(config);
  }, [activeLanguage, startSession]);

  // On mount (or when sessionId changes): restore an existing conversation,
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

  // Reflect the session id in the URL, but only once the first exchange is
  // durably saved. replaceState across route segments (/new → /chat/[id]) makes
  // Next re-sync the router and remount this screen, which re-restores from the
  // DB; firing before the save completes would load an empty session and wipe
  // the in-memory conversation. Gating on a saved assistant reply guarantees the
  // restore finds real data.
  useEffect(() => {
    const hasSavedReply =
      !isSessionLoading &&
      sessionMessages.some((m) => m.role === 'assistant' && m.status === 'sent');
    if (!sessionParam && sessionId && hasSavedReply) {
      restoredRef.current = sessionId;
      window.history.replaceState(null, '', `/chat/${sessionId}`);
    }
  }, [sessionParam, sessionId, isSessionLoading, sessionMessages]);

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
  const suggestionsLocked =
    lastMessage?.role === 'assistant' && lastMessage.suggestionsLocked === true;

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
      router.push('/new');
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
      isTranscribing={isTranscribing}
      onStartListening={handleStartListening}
      onStopListening={stopListening}
      transcript={transcript}
      selectedWords={[]}
      onRemoveWord={noopRemoveWord}
      skillsEnabled
      resetKey={inputResetKey}
      disabled={budgetExhausted}
      placeholder={budgetExhausted ? 'งบ AI วันนี้หมดแล้ว ใช้ต่อพรุ่งนี้' : undefined}
      onVoiceMode={budgetExhausted ? undefined : () => setVoiceMode(true)}
    />
  );

  return (
    <AppShell onNewChat={handleNewChat}>
      <div
        className="flex-1 flex flex-col overflow-hidden relative"
        style={
          isEmptyChat
            ? {
                background:
                  'radial-gradient(125% 125% at 50% 10%, var(--background) 50%, color-mix(in srgb, var(--primary) 55%, var(--background)) 100%)',
              }
            : undefined
        }
      >
        {isEmptyChat ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
            <div className="text-3xl font-black tracking-tight font-sans bg-gradient-to-br from-[#4f8df7] to-[#1b62d1] bg-clip-text text-transparent text-center w-full">
              {t.common.appName}
            </div>
            <p className="text-2xl font-semibold leading-snug text-foreground text-center w-full">
              สวัสดี คุณ {displayName}
              <br />
              วันนี้อยากเรียนรู้หรือฝึกฝนภาษาอังกฤษเรื่องอะไรดีครับ?
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
              {voiceMode ? (
                <VoiceMode
                  speechLang={speechLang}
                  messages={sessionMessages}
                  isLoading={isSessionLoading}
                  onSend={handleSendMessage}
                  onClose={() => setVoiceMode(false)}
                />
              ) : optionsMode && !isOptionsCollapsed ? (
                <div className="rounded-[28px] bg-card-bg p-2 border border-border-color shadow-soft-md">
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
                  {suggestionsLocked && !isSessionLoading && (
                    <div className="flex justify-center animate-bubble-pop-in">
                      <a
                        href="/profile"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-warning/20 bg-warning/5 text-xs font-bold text-warning shadow-soft-sm"
                      >
                        🔒 <span>อัปเกรด Premium เพื่อปลดล็อกตัวเลือกการตอบ</span>
                      </a>
                    </div>
                  )}
                  {optionsMode && isOptionsCollapsed && !suggestionsLocked && (
                    <div className="flex justify-center animate-bubble-pop-in">
                      <button
                        type="button"
                        onClick={handleToggleSuggestions}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-primary/20 bg-primary-bg text-xs font-bold text-primary hover:bg-primary-bg/80 cursor-pointer shadow-soft-sm"
                      >
                        <Lightbulb size={13} />
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
    </AppShell>
  );
}
