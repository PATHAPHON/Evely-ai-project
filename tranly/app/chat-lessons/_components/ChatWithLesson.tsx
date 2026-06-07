'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StopOutlined } from '@ant-design/icons';
import { message as antdMessage } from 'antd';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import { useGems } from '@/app/_lib/GemsContext';
import { speechLangForLanguage } from '@/app/chat/_lib/speechLangForLanguage';
import { useConversationSession } from '@/app/chat/_lib/useConversationSession';
import { useScriptConversationSession } from '../_lib/useScriptConversationSession';
import { useTTS } from '@/app/chat/_lib/useTTS';
import { useSTT } from '@/app/chat/_lib/useSTT';
import ChatList from '@/app/chat/_components/ChatList';
import ChatInput from '@/app/chat/_components/ChatInput';
import ReplySuggestions from '@/app/chat/_components/ReplySuggestions';
import type { ChatMessage, SessionConfig } from '@/app/chat/_lib/types';
import type { PreLoadedLesson } from '../_lib/types';

interface ChatWithLessonProps {
  lesson: PreLoadedLesson;
  onEndChat: () => void;
}

/**
 * Wraps the existing conversation session engine with pre-filled config from a
 * PreLoadedLesson. Renders ChatList, ReplySuggestions, and ChatInput wired to
 * the session state. Automatically starts the session on mount.
 */
export default function ChatWithLesson({ lesson, onEndChat }: ChatWithLessonProps) {
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const { earnGems } = useGems();
  const [gemAwarded, setGemAwarded] = useState(false);
  const searchParams = useSearchParams();
  const isAutoStarted = !!searchParams.get('lessonId');

  const isScriptLesson = lesson.type === 'choice' || lesson.id === 'kr-greetings-basic';
  const aiSession = useConversationSession();
  const scriptSession = useScriptConversationSession();

  const {
    messages,
    sendMessage,
    retryLastMessage,
    isLoading,
    error,
    sessionConfig,
    isEnded,
    startSession,
    endSession,
  } = isScriptLesson ? scriptSession : aiSession;

  // Award gems when the lesson ends
  useEffect(() => {
    if (isEnded && !gemAwarded) {
      const award = lesson.category === 'greetings' ? 20 : 15;
      earnGems(award);
      setGemAwarded(true);
      antdMessage.success(
        isThai
          ? `ยินดีด้วย! คุณได้รับ ${award} 💎`
          : `Congratulations! You earned ${award} 💎`
      );
    }
  }, [isEnded, gemAwarded, lesson.category, earnGems, isThai]);

  // TTS/STT setup — uses the lesson's target language
  const speechLang = speechLangForLanguage(lesson.targetLanguage);
  const { speak } = useTTS(speechLang);

  const {
    startListening,
    stopListening,
    isListening,
    transcript,
    isSupported: sttSupported,
  } = useSTT();

  // Start the session on mount by mapping lesson fields to SessionConfig
  const sessionStarted = useRef(false);
  useEffect(() => {
    if (sessionStarted.current) return;
    sessionStarted.current = true;

    const config: SessionConfig = {
      topic: lesson.systemContext || `${lesson.titleEn}: ${lesson.goal}`,
      proficiencyLevel: lesson.proficiencyLevel,
      wordContext: lesson.wordContext.map((word, idx) => ({
        id: `lesson-word-${idx}`,
        korean: word,
        reading: '',
        romanization: '',
        english: '',
        thai: '',
        source: 'word-store' as const,
      })),
      goal: lesson.goal,
      language: lesson.targetLanguage,
      lessonId: lesson.id,
    };

    startSession(config);
  }, [lesson, startSession]);

  // Reply suggestions from the latest AI message
  const lastMessage = messages[messages.length - 1];
  const currentSuggestions =
    lastMessage && lastMessage.role === 'assistant'
      ? lastMessage.suggestions ?? []
      : [];

  // Handle TTS
  const handleSpeak = useCallback(
    (messageId: string, text?: string) => {
      if (text) {
        speak(text);
        return;
      }
      const message = messages.find((m: ChatMessage) => m.id === messageId);
      if (message?.korean) {
        speak(message.korean);
      }
    },
    [messages, speak],
  );

  // Handle sending a message
  const handleSendMessage = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  // Handle STT start
  const handleStartListening = useCallback(() => {
    startListening(speechLang);
  }, [startListening, speechLang]);

  // Handle end session and notify parent
  const handleEndSession = useCallback(async () => {
    try {
      await endSession();
    } catch {
      // Non-fatal: session data might fail to persist
    }
    onEndChat();
  }, [endSession, onEndChat]);

  // Handle end chat button tap — show confirmation
  const handleEndChatTap = useCallback(() => {
    setShowEndConfirm(true);
  }, []);

  // Handle confirming end chat
  const handleConfirmEnd = useCallback(async () => {
    setShowEndConfirm(false);
    await handleEndSession();
  }, [handleEndSession]);

  // Handle canceling end chat
  const handleCancelEnd = useCallback(() => {
    setShowEndConfirm(false);
  }, []);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header with End Chat button */}
      {!isEnded && (
        <div className="flex items-center justify-between px-4 pt-3">
          {/* Goal indicator */}
          {lesson.goal && (
            <span className="inline-flex items-center gap-1 rounded-lg border-2 border-border-color bg-accent-yellow px-2 py-0.5 text-xs font-bold text-black">
              {isThai ? '🎯 เป้าหมาย: ' : '🎯 Goal: '}
              {lesson.goal}
            </span>
          )}

          {/* End Chat button */}
          <button
            type="button"
            onClick={handleEndChatTap}
            className="ml-auto flex items-center gap-1.5 rounded-xl border-3 border-border-color bg-card-bg px-3 py-1.5 text-xs font-bold text-text-primary shadow-nb-sm transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
            aria-label={isThai ? 'จบแชท' : 'End Chat'}
          >
            <StopOutlined style={{ fontSize: 14 }} />
            <span>{isThai ? 'จบแชท' : 'End Chat'}</span>
          </button>
        </div>
      )}

      {/* Goal indicator when ended (no header button needed) */}
      {isEnded && lesson.goal && (
        <div className="px-4 pt-3">
          <span className="inline-flex items-center gap-1 rounded-lg border-2 border-border-color bg-accent-yellow px-2 py-0.5 text-xs font-bold text-black">
            {isThai ? '🎯 เป้าหมาย: ' : '🎯 Goal: '}
            {lesson.goal}
          </span>
        </div>
      )}

      {/* Message list */}
      <ChatList
        messages={messages}
        isLoading={isLoading}
        error={error}
        onRetry={retryLastMessage}
        onSpeak={handleSpeak}
      />

      {/* Input area */}
      <div className="border-t-3 border-border-color bg-card-bg">
        {isEnded ? (
          <div className="p-4 text-center">
            <p className="text-base font-extrabold text-[#389E0D]">
              {isThai ? 'บทสนทนาจบแล้ว 🎉' : 'Conversation complete 🎉'}
            </p>
            <p className="mt-1 mb-3 text-sm text-text-secondary">
              {isThai
                ? 'บรรลุเป้าหมายแล้ว บันทึกลงประวัติเรียบร้อย'
                : 'Goal reached — saved to your history.'}
            </p>
            <button
              type="button"
              onClick={onEndChat}
              className="w-full rounded-xl border-3 border-border-color bg-accent-green py-3 text-base font-bold uppercase tracking-wider text-white shadow-nb-md transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm cursor-pointer"
            >
              {isThai
                ? (isAutoStarted ? 'กลับไปหน้าหลัก' : 'กลับไปรายการบทเรียน')
                : (isAutoStarted ? 'Back to Home' : 'Back to Lessons')}
            </button>
          </div>
        ) : (
          <>
            {!isLoading && (
              <ReplySuggestions
                suggestions={currentSuggestions}
                onSelect={handleSendMessage}
                disabled={isLoading}
              />
            )}
            <div className="p-3">
              <ChatInput
                onSend={handleSendMessage}
                isLoading={isLoading}
                sttSupported={sttSupported}
                isListening={isListening}
                onStartListening={handleStartListening}
                onStopListening={stopListening}
                transcript={transcript}
                selectedWords={[]}
                onRemoveWord={() => {}}
              />
            </div>
          </>
        )}
      </div>

      {/* End chat confirmation modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl border-3 border-border-color bg-card-bg p-6 shadow-nb-lg">
            <h2 className="text-lg font-bold text-text-primary mb-2">
              {isThai ? 'จบแชทนี้?' : 'End this chat?'}
            </h2>
            <p className="text-sm text-text-secondary mb-5">
              {isThai
                ? 'คุณแน่ใจหรือว่าต้องการจบบทสนทนานี้?'
                : 'Are you sure you want to end this conversation?'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelEnd}
                className="flex-1 rounded-xl border-3 border-border-color bg-card-bg py-3 text-sm font-bold text-text-primary shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
              >
                {isThai ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmEnd}
                className="flex-1 rounded-xl border-3 border-border-color bg-accent-red py-3 text-sm font-bold text-white shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
              >
                {isThai ? 'จบแชท' : 'End Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
