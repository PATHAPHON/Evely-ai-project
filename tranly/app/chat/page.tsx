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
import ScanButton from '@/app/scan/_components/ScanButton';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import { useStrings } from '@/app/_lib/strings';
import ConversationSetup from './_components/ConversationSetup';
import WordSelector from './_components/WordSelector';
import ChatList from './_components/ChatList';
import ChatInput from './_components/ChatInput';
import ReplySuggestions from './_components/ReplySuggestions';
import SessionHistory from './_components/SessionHistory';
import LessonSetup from './_components/LessonSetup';
import LessonPlayer from './_components/LessonPlayer';
import LessonComplete from './_components/LessonComplete';
import LessonHistory from './_components/LessonHistory';
import { useConversationSession } from './_lib/useConversationSession';
import { useConversationHistory } from './_lib/useConversationHistory';
import { useLessonSession } from './_lib/useLessonSession';
import { useLessonHistory } from './_lib/useLessonHistory';
import { useTTS } from './_lib/useTTS';
import { useSTT } from './_lib/useSTT';
import { useWordContext } from './_lib/useWordContext';
import type { ChatMessage, SavedWord, SessionConfig } from './_lib/types';
import type { LessonConfig, LessonRecord } from './_lib/lessonTypes';

type ViewState = 'setup' | 'active-chat' | 'history' | 'view-session';
type ChatMode = 'chat' | 'lesson';

export default function ChatPage() {
  const router = useRouter();
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';
  const t = useStrings();
  const [messageApi, navMessageHolder] = antdMessage.useMessage();
  const [mode, setMode] = useState<ChatMode>('chat');
  const [view, setView] = useState<ViewState>('setup');
  const [showWordSelector, setShowWordSelector] = useState(false);
  const [selectedWords, setSelectedWords] = useState<SavedWord[]>([]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [viewedMessages, setViewedMessages] = useState<ChatMessage[]>([]);
  const [viewedTopic, setViewedTopic] = useState<string>('');

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
    isLoading: isHistoryLoading,
    error: historyError,
  } = useConversationHistory();

  const { speak, stop: stopTTS } = useTTS('ko-KR');

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

    // Reset state and navigate to setup
    setSelectedWords([]);
    setShowEndConfirm(false);
    setView('setup');
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
      setView('setup');
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
    startListening('ko-KR');
  }, [startListening]);

  return (
    <div className="flex flex-col h-dvh bg-background relative">
      {navMessageHolder}
      {/* Header */}
      <div className="p-[20px_16px_0]">
        <div className="flex items-start justify-between pt-[10px]">
          <div>
            <div
              className="font-extrabold text-[28px] tracking-tight leading-[1.1] text-text-primary"
              style={{ fontFamily: "var(--font-outfit), sans-serif" }}
            >
              AI Chat
            </div>
            <div className="text-text-primary text-sm mt-1 font-bold">
              Practice Korean with AI
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'chat' && view === 'view-session' && (
              <button
                type="button"
                onClick={handleBackToHistory}
                aria-label="Back to history"
                className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-border-color bg-card-bg shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer text-text-primary"
              >
                <ArrowLeftOutlined style={{ fontSize: 18 }} />
              </button>
            )}
            {mode === 'chat' && (view === 'setup' || view === 'active-chat') && (
              <button
                type="button"
                onClick={handleShowHistory}
                aria-label="View conversation history"
                className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-border-color bg-card-bg shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer text-text-primary"
              >
                <HistoryOutlined style={{ fontSize: 18 }} />
              </button>
            )}
            {mode === 'chat' && (view === 'history' || view === 'active-chat') && (
              <button
                type="button"
                onClick={handleNewConversation}
                aria-label="Start new conversation"
                className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-border-color bg-accent-green text-white shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
              >
                <PlusOutlined style={{ fontSize: 18 }} />
              </button>
            )}
            {mode === 'chat' && view === 'active-chat' && sessionConfig && (
              <button
                type="button"
                onClick={handleEndConversationTap}
                aria-label="End conversation"
                className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-border-color bg-accent-red text-white shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
              >
                <StopOutlined style={{ fontSize: 18 }} />
              </button>
            )}
            {mode === 'lesson' &&
              !lessonHistoryOpen &&
              (lesson.status === 'idle' || lesson.status === 'complete') && (
                <button
                  type="button"
                  onClick={handleShowLessonHistory}
                  aria-label="View saved lessons"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-border-color bg-card-bg shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer text-text-primary"
                >
                  <HistoryOutlined style={{ fontSize: 18 }} />
                </button>
              )}
            {mode === 'lesson' && lessonHistoryOpen && (
              <button
                type="button"
                onClick={handleNewLessonFromHistory}
                aria-label="Start new lesson"
                className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-border-color bg-accent-green text-white shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
              >
                <PlusOutlined style={{ fontSize: 18 }} />
              </button>
            )}
            {mode === 'lesson' &&
              !lessonHistoryOpen &&
              lesson.status === 'active' && (
                <button
                  type="button"
                  onClick={handleQuitLessonTap}
                  aria-label="Quit lesson"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-border-color bg-accent-red text-white shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
                >
                  <StopOutlined style={{ fontSize: 18 }} />
                </button>
              )}
          </div>
        </div>

        {/* Mode toggle: Chat vs Lessons */}
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
      </div>

      {/* Save error banner */}
      {saveError && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-b-3 border-red-500">
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">{saveError}</p>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}>
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

      {/* Bottom nav bar */}
      <div
        className="absolute left-4 right-4 h-[80px] bg-card-bg border-3 border-border-color p-[8px_8px_14px] grid grid-cols-5 z-40 rounded-2xl shadow-nb-md"
        style={{ bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
      >
        <a
          className={`flex flex-col items-center gap-1 text-text-secondary ${
            navLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          }`}
          aria-disabled={navLocked}
          onClick={() => handleNav("/home")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabHome}</span>
        </a>

        <a
          className={`flex flex-col items-center gap-1 text-text-secondary ${
            navLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          }`}
          aria-disabled={navLocked}
          onClick={() => handleNav("/learn")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabWord}</span>
        </a>

        <ScanButton disabled={navLocked} />

        <a className="flex flex-col items-center gap-1 cursor-pointer text-text-primary">
          <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent-pink-bg border-3 border-border-color shadow-nb-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v2" />
              <path d="M12 19v2" />
              <path d="M5 12H3" />
              <path d="M21 12h-2" />
              <path d="M6.3 6.3 4.9 4.9" />
              <path d="M19.1 19.1 17.7 17.7" />
              <path d="M6.3 17.7 4.9 19.1" />
              <path d="M19.1 4.9 17.7 6.3" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabAI}</span>
        </a>

        <a
          className={`flex flex-col items-center gap-1 text-text-secondary ${
            navLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          }`}
          aria-disabled={navLocked}
          onClick={() => handleNav("/profile")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabProfile}</span>
        </a>
      </div>

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
