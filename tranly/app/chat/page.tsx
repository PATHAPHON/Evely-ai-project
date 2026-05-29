'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  HistoryOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';
import ScanButton from '@/app/scan/_components/ScanButton';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import ConversationSetup from './_components/ConversationSetup';
import WordSelector from './_components/WordSelector';
import ChatList from './_components/ChatList';
import ChatInput from './_components/ChatInput';
import SessionHistory from './_components/SessionHistory';
import { useConversationSession } from './_lib/useConversationSession';
import { useConversationHistory } from './_lib/useConversationHistory';
import { useTTS } from './_lib/useTTS';
import { useSTT } from './_lib/useSTT';
import { useWordContext } from './_lib/useWordContext';
import type { ChatMessage, SavedWord, SessionConfig } from './_lib/types';

type ViewState = 'setup' | 'active-chat' | 'history';

export default function ChatPage() {
  const router = useRouter();
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';
  const [view, setView] = useState<ViewState>('setup');
  const [showWordSelector, setShowWordSelector] = useState(false);
  const [selectedWords, setSelectedWords] = useState<SavedWord[]>([]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Hooks
  const {
    messages,
    sendMessage,
    retryLastMessage,
    isLoading: isSessionLoading,
    error: sessionError,
    sessionConfig,
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

  // Handle selecting a past session from history
  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      try {
        const msgs = await loadSessionMessages(sessionId);
        // We can't load into the active session hook directly,
        // but we can show the messages in a read-only view.
        // For now, switch to active-chat view with loaded messages.
        // The session hook doesn't support loading existing sessions,
        // so we'll just view the history in the chat list.
        void msgs;
        // TODO: If the design requires loading past sessions into active chat,
        // the useConversationSession hook would need a loadSession method.
      } catch {
        // Error is handled by the history hook
      }
    },
    [loadSessionMessages],
  );

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
            {(view === 'setup' || view === 'active-chat') && (
              <button
                type="button"
                onClick={handleShowHistory}
                aria-label="View conversation history"
                className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-border-color bg-card-bg shadow-[3px_3px_0_#000000] dark:shadow-[3px_3px_0_rgba(0,0,0,0.4)] transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_#000000] dark:active:shadow-[1px_1px_0_rgba(0,0,0,0.4)] cursor-pointer text-text-primary"
              >
                <HistoryOutlined style={{ fontSize: 18 }} />
              </button>
            )}
            {(view === 'history' || view === 'active-chat') && (
              <button
                type="button"
                onClick={handleNewConversation}
                aria-label="Start new conversation"
                className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-border-color bg-[#52C41A] text-white shadow-[3px_3px_0_#000000] dark:shadow-[3px_3px_0_rgba(0,0,0,0.4)] transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_#000000] dark:active:shadow-[1px_1px_0_rgba(0,0,0,0.4)] cursor-pointer"
              >
                <PlusOutlined style={{ fontSize: 18 }} />
              </button>
            )}
            {view === 'active-chat' && sessionConfig && (
              <button
                type="button"
                onClick={handleEndConversationTap}
                aria-label="End conversation"
                className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-border-color bg-[#FF4D4F] text-white shadow-[3px_3px_0_#000000] dark:shadow-[3px_3px_0_rgba(0,0,0,0.4)] transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_#000000] dark:active:shadow-[1px_1px_0_rgba(0,0,0,0.4)] cursor-pointer"
              >
                <StopOutlined style={{ fontSize: 18 }} />
              </button>
            )}
          </div>
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
        {/* Setup view */}
        {view === 'setup' && (
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
        {view === 'active-chat' && (
          <>
            <ChatList
              messages={messages}
              isLoading={isSessionLoading}
              error={sessionError}
              onRetry={retryLastMessage}
              onSpeak={handleSpeak}
            />
            <div className="border-t-3 border-border-color bg-card-bg p-3">
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

        {/* History view */}
        {view === 'history' && (
          <SessionHistory
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onNewConversation={handleNewConversation}
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
        className="absolute left-4 right-4 h-[80px] bg-card-bg border-3 border-border-color p-[8px_8px_14px] grid grid-cols-5 z-40 rounded-2xl shadow-[4px_4px_0_#000000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)]"
        style={{ bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
      >
        <a
          className="flex flex-col items-center gap-1 cursor-pointer text-text-secondary"
          onClick={() => router.push("/home")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">Home</span>
        </a>

        <a
          className="flex flex-col items-center gap-1 cursor-pointer text-text-secondary"
          onClick={() => router.push("/learn")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">Word</span>
        </a>

        <ScanButton />

        <a className="flex flex-col items-center gap-1 cursor-pointer text-text-primary">
          <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent-pink-bg border-3 border-border-color shadow-[2px_2px_0_#000000] dark:shadow-[2px_2px_0_rgba(0,0,0,0.4)]">
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
          <span className="text-[11px] font-bold tracking-wider">AI</span>
        </a>

        <a
          className="flex flex-col items-center gap-1 cursor-pointer text-text-secondary"
          onClick={() => router.push("/profile")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">Profile</span>
        </a>
      </div>

      {/* End conversation confirmation modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl border-3 border-border-color bg-card-bg p-6 shadow-[6px_6px_0_#000000] dark:shadow-[6px_6px_0_rgba(0,0,0,0.4)]">
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
                className="flex-1 rounded-xl border-3 border-border-color bg-card-bg py-3 text-sm font-bold text-text-primary shadow-[4px_4px_0_#000000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)] transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_#000000] dark:active:shadow-[1px_1px_0_rgba(0,0,0,0.4)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEnd}
                className="flex-1 rounded-xl border-3 border-border-color bg-[#FF4D4F] py-3 text-sm font-bold text-white shadow-[4px_4px_0_#000000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)] transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_#000000] dark:active:shadow-[1px_1px_0_rgba(0,0,0,0.4)] cursor-pointer"
              >
                End
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
