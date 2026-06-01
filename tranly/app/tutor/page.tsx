'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftOutlined,
  HistoryOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { message as antdMessage } from 'antd';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import { useActiveLanguage } from '@/app/_lib/ActiveLanguageContext';
import { useStrings } from '@/app/_lib/strings';
import { speechLangForLanguage } from '@/app/chat/_lib/speechLangForLanguage';
import ConversationSetup from '@/app/chat/_components/ConversationSetup';
import WordSelector from '@/app/chat/_components/WordSelector';
import ChatList from '@/app/chat/_components/ChatList';
import ChatInput from '@/app/chat/_components/ChatInput';
import ReplySuggestions from '@/app/chat/_components/ReplySuggestions';
import SessionHistory from '@/app/chat/_components/SessionHistory';
import LessonSetup from '@/app/chat/_components/LessonSetup';
import AIGuide from '@/app/chat/_components/AIGuide';
import LessonPlayer from '@/app/chat/_components/LessonPlayer';
import LessonComplete from '@/app/chat/_components/LessonComplete';
import LessonHistory from '@/app/chat/_components/LessonHistory';
import { setPendingLesson } from '@/app/_lib/pendingLesson';
import { useConversationSession } from '@/app/chat/_lib/useConversationSession';
import { useConversationHistory } from '@/app/chat/_lib/useConversationHistory';
import { useLessonSession } from '@/app/chat/_lib/useLessonSession';
import { useLessonHistory } from '@/app/chat/_lib/useLessonHistory';
import { useTTS } from '@/app/chat/_lib/useTTS';
import { useSTT } from '@/app/chat/_lib/useSTT';
import { useWordContext } from '@/app/chat/_lib/useWordContext';
import type { ChatMessage, SavedWord, SessionConfig } from '@/app/chat/_lib/types';
import type { LessonConfig, LessonRecord } from '@/app/chat/_lib/lessonTypes';

type ViewState = 'guide' | 'setup' | 'active-chat' | 'history' | 'view-session';
type ChatMode = 'chat' | 'lesson';

export default function TutorPage() {
  const router = useRouter();
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';
  const { activeLanguage } = useActiveLanguage();
  const t = useStrings();
  const [messageApi, navMessageHolder] = antdMessage.useMessage();
  const [mode, setMode] = useState<ChatMode>('chat');
  const [view, setView] = useState<ViewState>('guide');
  const [showWordSelector, setShowWordSelector] = useState(false);
  const [selectedWords, setSelectedWords] = useState<SavedWord[]>([]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [viewedMessages, setViewedMessages] = useState<ChatMessage[]>([]);
  const [viewedTopic, setViewedTopic] = useState<string>('');
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Hooks
  const {
    messages,
    sendMessage,
    retryLastMessage,
    isLoading: isSessionLoading,
    error: sessionError,
    sessionConfig,
    isEnded,
    startSession,
    endSession,
  } = useConversationSession();

  const {
    sessions,
    loadSessions,
    loadSessionMessages,
    deleteSession,
  } = useConversationHistory();

  // Speech follows the active session's language when one is running, otherwise
  // the globally selected learning language.
  const speechLang = speechLangForLanguage(
    sessionConfig?.language ?? activeLanguage,
  );
  const { speak } = useTTS(speechLang);

  const {
    startListening,
    stopListening,
    isListening,
    transcript,
    isSupported: sttSupported,
  } = useSTT();

  const { savedWords, loadSavedWords } = useWordContext();

  const lesson = useLessonSession();
  const {
    lessons: savedLessons,
    loadLessons,
    deleteLesson,
  } = useLessonHistory();
  const [lessonHistoryOpen, setLessonHistoryOpen] = useState(false);
  const [showQuitLessonConfirm, setShowQuitLessonConfirm] = useState(false);

  // Load saved words on mount
  useEffect(() => {
    loadSavedWords();
  }, [loadSavedWords]);

  // Check for lesson replay request on mount or view change
  useEffect(() => {
    try {
      const replayData = sessionStorage.getItem('tarnly:replay-lesson');
      if (replayData) {
        sessionStorage.removeItem('tarnly:replay-lesson');
        const record = JSON.parse(replayData) as LessonRecord;
        setMode('lesson');
        void lesson.replayLesson(record);
      }
    } catch {
      // ignore parsing or storage errors
    }
  }, [lesson]);

  // Handle starting a new session from setup
  const handleStartSession = useCallback(
    (config: SessionConfig) => {
      startSession(config);
      setView('active-chat');
    },
    [startSession],
  );

  // Handle starting a lesson from lesson setup
  const handleStartLesson = useCallback(
    (config: LessonConfig) => {
      void lesson.startLesson(config);
    },
    [lesson],
  );

  // Handle starting a lesson from the AI guide: queue the config and hand off to
  // the dedicated lesson route, which generates and plays it.
  const handleGuideStartLesson = useCallback(
    (config: LessonConfig) => {
      setPendingLesson(config);
      router.push('/lesson/play');
    },
    [router],
  );

  // Open the saved-lessons list
  const handleShowLessonHistory = useCallback(() => {
    void loadLessons();
    setLessonHistoryOpen(true);
  }, [loadLessons]);

  // Replay a saved lesson (no API call)
  const handleReplayLesson = useCallback(
    (record: LessonRecord) => {
      lesson.replayLesson(record);
      setLessonHistoryOpen(false);
    },
    [lesson],
  );

  // Delete a saved lesson
  const handleDeleteLesson = useCallback(
    async (lessonId: string) => {
      try {
        await deleteLesson(lessonId);
      } catch {
        // Error surfaced by the history hook
      }
    },
    [deleteLesson],
  );

  // Start a fresh lesson from the history view
  const handleNewLessonFromHistory = useCallback(() => {
    lesson.reset();
    setLessonHistoryOpen(false);
  }, [lesson]);

  // Quit an in-progress lesson (with confirmation)
  const handleQuitLessonTap = useCallback(() => {
    setShowQuitLessonConfirm(true);
  }, []);

  const handleConfirmQuitLesson = useCallback(() => {
    lesson.reset();
    setShowQuitLessonConfirm(false);
  }, [lesson]);

  const handleCancelQuitLesson = useCallback(() => {
    setShowQuitLessonConfirm(false);
  }, []);

  // The learner is locked into an active session — navigation away (tabbar)
  // and switching modes are disabled until they finish or quit it. This applies
  // to both an in-progress lesson and an in-progress chat conversation; the
  // only way out is to complete it or end/quit it explicitly.
  const navLocked =
    (mode === 'lesson' && lesson.status === 'active') ||
    (mode === 'chat' &&
      view === 'active-chat' &&
      sessionConfig !== null &&
      !isEnded);

  // Guarded navigation: while locked into an active session, explain *why* the
  // tabs don't respond instead of silently no-opping, and point at End/Quit.
  const handleNav = useCallback(
    (path: string) => {
      if (navLocked) {
        messageApi.open({ key: 'nav-locked', type: 'info', content: t.chat.navLockedHint });
        return;
      }
      router.push(path);
    },
    [navLocked, router, messageApi, t],
  );

  // Reply suggestions for the latest AI message — shown only when it's the
  // user's turn (the last message is the assistant's) so they have hints on
  // what to say next.
  const lastMessage = messages[messages.length - 1];
  const currentSuggestions =
    lastMessage && lastMessage.role === 'assistant'
      ? lastMessage.suggestions ?? []
      : [];

  // Handle speaking a message (TTS)
  const handleSpeak = useCallback(
    (messageId: string) => {
      const message = messages.find((m: ChatMessage) => m.id === messageId);
      if (message && message.korean) {
        speak(message.korean);
      }
    },
    [messages, speak],
  );

  // Handle speaking a viewed (past) message
  const handleSpeakViewed = useCallback(
    (messageId: string) => {
      const message = viewedMessages.find((m) => m.id === messageId);
      if (message && message.korean) {
        speak(message.korean);
      }
    },
    [viewedMessages, speak],
  );

  // Handle sending a message
  const handleSendMessage = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  // Handle removing a word from context tags in ChatInput
  const handleRemoveWord = useCallback(
    (wordId: string) => {
      setSelectedWords((prev) => prev.filter((w) => w.id !== wordId));
    },
    [],
  );

  // Navigate to history view
  const handleShowHistory = useCallback(() => {
    loadSessions();
    setView('history');
  }, [loadSessions]);

  // Handle selecting a past session from history — open a read-only view of
  // the saved messages so the user can review what was said.
  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      try {
        const msgs = await loadSessionMessages(sessionId);
        const session = sessions.find((s) => s.id === sessionId);
        setViewedMessages(msgs);
        setViewedTopic(session?.topic ?? '');
        setView('view-session');
      } catch {
        // Error is handled by the history hook
      }
    },
    [loadSessionMessages, sessions],
  );

  // Return from the read-only session view back to the history list
  const handleBackToHistory = useCallback(() => {
    setViewedMessages([]);
    setViewedTopic('');
    setView('history');
  }, []);

  // Handle deleting a session
  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await deleteSession(sessionId);
      } catch {
        // Error is handled by the history hook
      }
    },
    [deleteSession],
  );

  // Handle new conversation button
  const handleNewConversation = useCallback(async () => {
    setSaveError(null);

    // If there's an active session, save it first
    if (sessionConfig) {
      try {
        await endSession();
      } catch {
        setSaveError('Failed to save session. Please try again.');
        return; // Remain on current view on save failure
      }
    }

    // Reset state and navigate back to the AI guide
    setSelectedWords([]);
    setShowEndConfirm(false);
    setView('guide');
  }, [sessionConfig, endSession]);

  // Handle end conversation button tap
  const handleEndConversationTap = useCallback(() => {
    setShowEndConfirm(true);
  }, []);

  // Handle confirming end conversation
  const handleConfirmEnd = useCallback(async () => {
    setSaveError(null);
    try {
      await endSession();
      setShowEndConfirm(false);
      setSelectedWords([]);
      setView('guide');
    } catch {
      setSaveError('บันทึกเซสชันไม่สำเร็จ กรุณาลองอีกครั้ง');
      setShowEndConfirm(false);
      // Remain on current view on save failure
    }
  }, [endSession]);

  // Handle canceling end conversation
  const handleCancelEnd = useCallback(() => {
    setShowEndConfirm(false);
  }, []);

  // Handle STT start
  const handleStartListening = useCallback(() => {
    startListening(speechLang);
  }, [startListening, speechLang]);

  return (
    <div className="flex flex-col h-dvh bg-background relative">
      {navMessageHolder}

      {/* Local styles for premium silky page-load transitions */}
      <style>{`
        @keyframes cardFadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-card-fade-in {
          animation: cardFadeInUp 0.45s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
        }
      `}</style>
      {/* Header */}
      <div className="p-[20px_16px_0]">

        {/* Exit button — shown on the AI guide entry screen so the learner can
            back out to the previous page. */}
        {view === 'guide' && (
          <button
            type="button"
            onClick={() => handleNav('/home')}
            className="inline-flex items-center gap-2 rounded-xl border-3 border-border-color bg-card-bg px-3 py-2 text-sm font-bold text-text-primary shadow-nb-sm transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            <ArrowLeftOutlined />
            {isThai ? 'ออก' : 'Exit'}
          </button>
        )}

        {/* Mode toggle: Chat vs Lessons — hidden while the AI guide is leading. */}
        {view !== 'guide' && (
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border-3 border-border-color bg-card-bg p-1.5 shadow-nb-sm">
          <button
            type="button"
            onClick={() => setMode('chat')}
            disabled={navLocked}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              navLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            } ${
              mode === 'chat'
                ? 'bg-accent-green text-white'
                : 'bg-transparent text-text-secondary'
            }`}
          >
            {isThai ? 'แชท' : 'Chat'}
          </button>
          <button
            type="button"
            onClick={() => setMode('lesson')}
            disabled={navLocked}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              navLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            } ${
              mode === 'lesson'
                ? 'bg-accent-green text-white'
                : 'bg-transparent text-text-secondary'
            }`}
          >
            {isThai ? 'บทเรียน' : 'Lessons'}
          </button>
        </div>
        )}
      </div>

      {/* Save error banner */}
      {saveError && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-b-3 border-red-500">
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">{saveError}</p>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {isPageLoading ? (
          <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto animate-pulse">
            {/* Mascot welcoming bubble skeleton */}
            <div className="flex max-w-[85%] items-start gap-2 self-start w-full">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#3d3d5c] shrink-0" />
              <div className="h-16 w-3/4 rounded-2xl rounded-tl-md border-3 border-border-color bg-gray-200 dark:bg-[#3d3d5c] shadow-nb-sm" />
            </div>
            {/* Another question skeleton bubble */}
            <div className="flex max-w-[85%] items-start gap-2 self-start w-full">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#3d3d5c] shrink-0" />
              <div className="h-12 w-1/2 rounded-2xl rounded-tl-md border-3 border-border-color bg-gray-200 dark:bg-[#3d3d5c] shadow-nb-sm" />
            </div>

            {/* Spacer to push controls to the bottom */}
            <div className="flex-1" />

            {/* Unified suggestions skeleton */}
            <div className="flex flex-wrap gap-2 mb-2 w-full animate-pulse">
              <div className="w-32 h-12 rounded-xl border-3 border-border-color bg-gray-200 dark:bg-[#3d3d5c] shadow-nb-sm" />
              <div className="w-36 h-12 rounded-xl border-3 border-border-color bg-gray-200 dark:bg-[#3d3d5c] shadow-nb-sm" />
            </div>

            {/* Input box skeleton */}
            <div className="h-16 w-full rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] shadow-nb-md shrink-0 animate-pulse" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden animate-card-fade-in">
            {/* ===== AI guide (default entry) ===== */}
            {view === 'guide' && (
              <AIGuide
                savedWords={savedWords}
                selectedWords={selectedWords}
                onOpenWordSelector={() => setShowWordSelector(true)}
                wordSelectorOpen={showWordSelector}
                onStartChat={handleStartSession}
                onStartLesson={handleGuideStartLesson}
              />
            )}

        {/* ===== Chat mode ===== */}
        {mode === 'chat' && view === 'setup' && (
          <div className="flex-1 overflow-y-auto">
            <ConversationSetup
              onStart={handleStartSession}
              savedWords={savedWords}
              onOpenWordSelector={() => setShowWordSelector(true)}
              selectedWords={selectedWords}
            />
          </div>
        )}

        {/* Active chat view */}
        {mode === 'chat' && view === 'active-chat' && (
          <>
            {sessionConfig?.goal && (
              <div className="px-4 pt-3">
                <span className="inline-flex items-center gap-1 rounded-lg border-2 border-border-color bg-accent-yellow px-2 py-0.5 text-xs font-bold text-black">
                  {isThai ? '🎯 เป้าหมาย: ' : '🎯 Goal: '}
                  {sessionConfig.goal}
                </span>
              </div>
            )}
            <ChatList
              messages={messages}
              isLoading={isSessionLoading}
              error={sessionError}
              onRetry={retryLastMessage}
              onSpeak={handleSpeak}
            />
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
                    onClick={handleNewConversation}
                    className="w-full rounded-xl border-3 border-border-color bg-accent-green py-3 text-base font-bold uppercase tracking-wider text-white shadow-nb-md transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm cursor-pointer"
                  >
                    {isThai ? 'เริ่มใหม่' : 'New Conversation'}
                  </button>
                </div>
              ) : (
                <>
                  {!isSessionLoading && (
                    <ReplySuggestions
                      suggestions={currentSuggestions}
                      onSelect={handleSendMessage}
                      disabled={isSessionLoading}
                    />
                  )}
                  <div className="p-3">
                    <ChatInput
                      onSend={handleSendMessage}
                      isLoading={isSessionLoading}
                      sttSupported={sttSupported}
                      isListening={isListening}
                      onStartListening={handleStartListening}
                      onStopListening={stopListening}
                      transcript={transcript}
                      selectedWords={selectedWords}
                      onRemoveWord={handleRemoveWord}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* History view */}
        {mode === 'chat' && view === 'history' && (
          <SessionHistory
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onNewConversation={handleNewConversation}
          />
        )}

        {/* Read-only view of a past conversation */}
        {mode === 'chat' && view === 'view-session' && (
          <>
            {viewedTopic && (
              <div className="px-4 pt-3">
                <p className="text-sm font-bold text-text-secondary">
                  {isThai ? 'หัวข้อ: ' : 'Topic: '}
                  <span className="text-text-primary">{viewedTopic}</span>
                </p>
              </div>
            )}
            <ChatList
              messages={viewedMessages}
              isLoading={false}
              error={null}
              onRetry={() => {}}
              onSpeak={handleSpeakViewed}
            />
          </>
        )}

        {/* ===== Lesson mode ===== */}
        {mode === 'lesson' && lessonHistoryOpen && (
          <LessonHistory
            lessons={savedLessons}
            onSelectLesson={handleReplayLesson}
            onDeleteLesson={handleDeleteLesson}
            onNewLesson={handleNewLessonFromHistory}
          />
        )}

        {mode === 'lesson' && !lessonHistoryOpen && lesson.status === 'idle' && (
          <div className="flex-1 overflow-y-auto">
            <LessonSetup
              onStart={handleStartLesson}
              savedWords={savedWords}
              selectedWords={selectedWords}
              onOpenWordSelector={() => setShowWordSelector(true)}
            />
          </div>
        )}

        {mode === 'lesson' &&
          !lessonHistoryOpen &&
          (lesson.status === 'loading' ||
            lesson.status === 'active' ||
            lesson.status === 'error') && (
            <LessonPlayer
              exercise={lesson.currentExercise}
              currentIndex={lesson.currentIndex}
              total={lesson.total}
              isLoading={lesson.status === 'loading'}
              error={lesson.status === 'error' ? lesson.error : null}
              onAnswer={lesson.submitAnswer}
              onNext={lesson.nextExercise}
              onRetry={lesson.retry}
            />
          )}

        {mode === 'lesson' &&
          !lessonHistoryOpen &&
          lesson.status === 'complete' && (
            <LessonComplete
              score={lesson.score}
              total={lesson.total}
              onNewLesson={lesson.reset}
            />
          )}
          </div>
        )}
      </main>

      {/* Word selector modal */}
      {showWordSelector && (
        <WordSelector
          savedWords={savedWords}
          selectedWords={selectedWords}
          onSelectionChange={setSelectedWords}
          onClose={() => setShowWordSelector(false)}
        />
      )}

      {/* End conversation confirmation modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl border-3 border-border-color bg-card-bg p-6 shadow-nb-lg">
            <h2 className="text-lg font-bold text-text-primary mb-2">
              End Conversation?
            </h2>
            <p className="text-sm text-text-secondary mb-5">
              This conversation will be saved to your history.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelEnd}
                className="flex-1 rounded-xl border-3 border-border-color bg-card-bg py-3 text-sm font-bold text-text-primary shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEnd}
                className="flex-1 rounded-xl border-3 border-border-color bg-accent-red py-3 text-sm font-bold text-white shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
              >
                End
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quit lesson confirmation modal */}
      {showQuitLessonConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl border-3 border-border-color bg-card-bg p-6 shadow-nb-lg">
            <h2 className="text-lg font-bold text-text-primary mb-2">
              {isThai ? 'ยกเลิกการเรียน?' : 'Quit lesson?'}
            </h2>
            <p className="text-sm text-text-secondary mb-5">
              {isThai
                ? 'บทเรียนนี้ถูกบันทึกไว้แล้ว คุณกลับมาเรียนซ้ำได้จากประวัติบทเรียน'
                : 'This lesson is saved — you can replay it anytime from your saved lessons.'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelQuitLesson}
                className="flex-1 rounded-xl border-3 border-border-color bg-card-bg py-3 text-sm font-bold text-text-primary shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
              >
                {isThai ? 'เรียนต่อ' : 'Keep learning'}
              </button>
              <button
                type="button"
                onClick={handleConfirmQuitLesson}
                className="flex-1 rounded-xl border-3 border-border-color bg-accent-red py-3 text-sm font-bold text-white shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
              >
                {isThai ? 'ยกเลิก' : 'Quit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
