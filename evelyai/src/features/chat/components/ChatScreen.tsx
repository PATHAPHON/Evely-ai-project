'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useActiveLanguage } from '@/shared/contexts/ActiveLanguageContext';

import { speechLangForLanguage } from '../utils/speechLangForLanguage';
import { useConversationSession } from '../hooks/useConversationSession';
import { useSessionUrlSync } from '../hooks/useSessionUrlSync';
import { useTTS } from '@/shared/hooks/useTTS';
import { useSTT } from '@/shared/hooks/useSTT';
import { useSuggestionPanel } from '../hooks/useSuggestionPanel';
import ChatList from './ChatList';
import ChatInput from './ChatInput';
import VoiceMode from './VoiceMode';
import SuggestionOptions from './SuggestionOptions';
import { useUserProfile } from '@/shared/hooks/useUserProfile';
import { useBudgetExhausted } from '@/shared/hooks/useBudgetExhausted';
import { useStrings } from '@/shared/utils/strings';
import type { SessionConfig } from '@/shared/types/chatTypes';
import { useToast } from '@/shared/components/Toast';

import { Lightbulb, Loader2, Volume2 } from 'lucide-react';
import AppShell from '@/shared/components/AppShell';

interface ChatScreenProps {
  /** Existing session id to restore, or null for a brand-new open session. */
  sessionId: string | null;
}

/**
 * The chat tab — a full-screen, open-ended chat with Evely AI.
 * Used by both /new (sessionId null) and /chat/[id] (sessionId set).
 */
export default function ChatScreen({ sessionId: sessionParam }: ChatScreenProps) {
  const router = useRouter();
  const t = useStrings();
  const { showToast } = useToast();
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceTranscribing, setVoiceTranscribing] = useState(false);
  const [spokenVoiceId, setSpokenVoiceId] = useState<string | null>(null);

  const { activeLanguage } = useActiveLanguage();
  const { displayName, isPremium, isBudgetExhausted } = useUserProfile();
  const { exhausted: localBudgetExhausted } = useBudgetExhausted();
  const budgetExhausted = localBudgetExhausted || isBudgetExhausted;
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

  const handleVoiceClose = useCallback(() => {
    setVoiceMode(false);
    setVoiceTranscribing(false);
  }, []);

  const handleOpenVoiceMode = useCallback(() => {
    const lastAssistant = [...sessionMessages].reverse().find((m) => m.role === 'assistant');
    setSpokenVoiceId(lastAssistant?.id ?? null);
    setVoiceTranscribing(false);
    setVoiceMode(true);
  }, [sessionMessages]);

  const handleAudioReady = useCallback((messageId: string) => {
    setSpokenVoiceId(messageId);
  }, []);

  // Suggested replies and message tracking for latest AI message
  const lastMessage = sessionMessages[sessionMessages.length - 1];

  // In voiceMode, hold the latest assistant message until its TTS audio is loaded
  const pendingVoiceMessageId =
    voiceMode &&
    lastMessage?.role === 'assistant' &&
    lastMessage.status === 'sent' &&
    lastMessage.id !== spokenVoiceId
      ? lastMessage.id
      : null;

  // Single unified loading state for voice mode — prevents multiple overlapping loading windows
  const voiceLoadingState = voiceMode
    ? voiceTranscribing
      ? { icon: 'loader' as const, text: 'กำลังแปลงเสียงเป็นข้อความ...' }
      : isSessionLoading
      ? { icon: 'loader' as const, text: 'กำลังคิดคำตอบ...' }
      : pendingVoiceMessageId
      ? { icon: 'volume' as const, text: 'กำลังสร้างเสียงพูด...' }
      : null
    : null;

  // Auto-close VoiceMode if budget runs out during voice conversation
  useEffect(() => {
    if (voiceMode && budgetExhausted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVoiceMode(false);
      showToast('งบ AI วันนี้เต็มแล้ว — สลับกลับสู่โหมดข้อความ', 'info');
    }
  }, [voiceMode, budgetExhausted, showToast]);

  // Start a fresh open-ended session.
  const startOpenSession = useCallback(() => {
    const config: SessionConfig = {
      language: activeLanguage,
    };
    startSession(config);
  }, [activeLanguage, startSession]);

  // Restore/start the session and reflect its id in the URL once saved.
  useSessionUrlSync({
    sessionParam,
    activeLanguage,
    restoreSession,
    startOpenSession,
    sessionId,
    isSessionLoading,
    messages: sessionMessages,
  });

  const handleSendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      await sendSessionMessage(trimmed);
    },
    [sendSessionMessage]
  );

  // Suggested replies for latest AI message
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
      if (message) {
        // Prioritize pre-compiled ttsText with inline audio tags for dynamic emotion
        if (message.ttsText) {
          speak(message.ttsText);
        } else if (message.sentences && message.sentences.length > 0) {
          const tagged = message.sentences
            .map((s) => (s.emotion ? `[${s.emotion}] ${s.englishText}` : s.englishText))
            .join(' ');
          speak(tagged || message.englishText);
        } else if (message.englishText) {
          speak(message.englishText);
        }
      }
    },
    [sessionMessages, speak]
  );

  const handleStartListening = useCallback(() => {
    startListening();
  }, [startListening]);

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
      skillsEnabled
      resetKey={inputResetKey}
      disabled={budgetExhausted}
      placeholder={budgetExhausted ? 'งบ AI วันนี้หมดแล้ว ใช้ต่อพรุ่งนี้' : undefined}
      onVoiceMode={budgetExhausted ? undefined : handleOpenVoiceMode}
    />
  );

  return (
    <AppShell onNewChat={handleNewChat} noScroll>
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
            voiceTranscribing={voiceTranscribing}
            pendingVoiceMessageId={pendingVoiceMessageId}
            voiceMode={voiceMode}
          />
        )}

        {/* Floating Gemini-style input area */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-1 bg-transparent z-40 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <div className={`transition-all duration-200 ease-out transform ${
              isAnimating ? 'opacity-0 translate-y-2 scale-[0.99]' : 'opacity-100 translate-y-0 scale-100'
            }`}>
              {voiceMode ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  {/* Single unified loading window for all voice processing stages */}
                  {voiceLoadingState && (
                    <div className="animate-bubble-pop-in">
                      <div className="rounded-full bg-card-bg/95 backdrop-blur-md border border-primary/30 text-foreground py-2.5 px-6 shadow-soft-lg flex items-center gap-3">
                        {voiceLoadingState.icon === 'loader' ? (
                          <Loader2 size={16} className="animate-spin text-primary shrink-0" />
                        ) : (
                          <Volume2 size={16} className="text-primary animate-bounce shrink-0" />
                        )}
                        <span className="text-sm font-semibold text-foreground tracking-wide whitespace-nowrap">
                          {voiceLoadingState.text}
                        </span>
                      </div>
                    </div>
                  )}
                  <VoiceMode
                    speechLang={speechLang}
                    messages={sessionMessages}
                    isLoading={isSessionLoading}
                    onSend={handleSendMessage}
                    onClose={handleVoiceClose}
                    onTranscribingChange={setVoiceTranscribing}
                    onAudioReady={handleAudioReady}
                  />
                </div>
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
