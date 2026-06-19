'use client';

import { useCallback, useRef, useState } from 'react';
import { getCustomAIHeaders } from '@/app/_lib/getCustomAIHeaders';
import { useChatApi } from './useChatApi';
import { useConversationHistory } from './useConversationHistory';

import type { TargetLanguage } from '@/app/_lib/wordTypes';
import type {
  ChatMessage,
  ChatSuccessResponse,
  ConversationSessionRecord,
  SessionConfig,
} from './types';

/** Construct a ChatMessage with required empty fields pre-filled. */
const baseMessage = (over: Partial<ChatMessage> & Pick<ChatMessage, 'role'>): ChatMessage => ({
  id: crypto.randomUUID(),
  englishText: '',
  reading: '',
  romanization: '',
  translation: '',
  english: '',
  rawText: '',
  timestamp: new Date().toISOString(),
  status: 'sent',
  ...over,
});


export interface UseConversationSessionReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sessionConfig: SessionConfig | null;
  sessionId: string | null;
  sessionSaved: boolean;
  startSession: (config: SessionConfig) => void;
  sendMessage: (text: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  /** Load an existing session's messages and resume sending into it. */
  restoreSession: (sessionId: string, language: TargetLanguage) => Promise<void>;
}

export function useConversationSession(): UseConversationSessionReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);

  // Refs hold values that must be accessible inside async closures without
  // triggering re-renders or appearing in dependency arrays.
  const sessionIdRef = useRef<string | null>(null);
  const createdAtRef = useRef<string | null>(null);
  const sessionSavedRef = useRef(false);
  const sessionConfigRef = useRef<SessionConfig | null>(null);

  const { callChatApi } = useChatApi();
  const { saveSession, saveMessage, loadSessionMessages } = useConversationHistory();

  // ─── Session lifecycle ───────────────────────────────────────────────────────

  const startSession = useCallback((config: SessionConfig) => {
    const id = crypto.randomUUID();
    sessionIdRef.current = id;
    setSessionId(id);
    createdAtRef.current = new Date().toISOString();
    sessionSavedRef.current = false;
    setSessionSaved(false);
    sessionConfigRef.current = config;
    setSessionConfig(config);
    setMessages([]);
    setError(null);
  }, []);

  /** Resume an existing conversation: load its messages and point further sends at the same session id. */
  const restoreSession = useCallback(
    async (sessionId: string, language: TargetLanguage): Promise<void> => {
      setError(null);
      sessionIdRef.current = sessionId;
      setSessionId(sessionId);
      createdAtRef.current = new Date().toISOString();
      sessionSavedRef.current = true; // row already exists in DB
      setSessionSaved(true);
      const config: SessionConfig = { language };
      sessionConfigRef.current = config;
      setSessionConfig(config);
      try {
        const msgs = await loadSessionMessages(sessionId);
        setMessages(msgs);
      } catch {
        setMessages([]);
      }
    },
    [loadSessionMessages],
  );

  // ─── Persistence helpers ─────────────────────────────────────────────────────

  /**
   * Lazy persistence: the conversations row is created on the first message,
   * not on session start, so opening /chat never leaves empty sessions behind.
   * The first user message becomes the session title shown in the history list.
   */
  const ensureSessionSaved = useCallback(
    async (firstMessageText?: string): Promise<void> => {
      if (sessionSavedRef.current) return;
      if (!sessionIdRef.current || !sessionConfigRef.current || !createdAtRef.current) return;

      const sessionRecord: ConversationSessionRecord = {
        id: sessionIdRef.current,
        topic: firstMessageText?.trim().slice(0, 60) || 'พูดคุยทั่วไป',
        createdAt: createdAtRef.current,
        endedAt: null,
        completed: false,
      };

      await saveSession(sessionRecord);
      sessionSavedRef.current = true;
      setSessionSaved(true);
    },
    [saveSession],
  );

  // ─── AI reply (shared by sendMessage and retryLastMessage) ──────────────────

  /**
   * Add a pending placeholder, stream the AI reply into it, then persist the
   * final message.  Returns the resolved message for callers that need it.
   */
  const runAssistantReply = useCallback(
    async (contextMessages: ChatMessage[]): Promise<void> => {
      const config = sessionConfigRef.current;
      if (!config || !sessionIdRef.current) return;

      const pendingMessage = baseMessage({ role: 'assistant', status: 'pending' });

      setMessages((prev) => [...prev, pendingMessage]);

      try {
        const aiResponse: ChatSuccessResponse = await callChatApi(
          contextMessages,
          config.language,
          // Stream partial sentences into the placeholder while the response arrives.
          (partial) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id !== pendingMessage.id ? msg : {
                  ...msg,
                  sentences: partial.sentences.map((s) => ({
                    englishText: s.englishText,
                    reading: '',
                    romanization: '',
                    translation: s.translation ?? '',
                    english: s.english ?? '',
                  })),
                  englishText: partial.sentences[0]?.englishText ?? '',
                  english: partial.sentences[0]?.english ?? '',
                },
              ),
            );
          },
        );

        const aiMessage: ChatMessage = {
          ...pendingMessage,
          englishText: aiResponse.englishText,
          reading: aiResponse.reading,
          romanization: aiResponse.romanization,
          translation: aiResponse.translation,
          english: aiResponse.english,
          rawText: aiResponse.englishText,
          timestamp: new Date().toISOString(),
          status: 'sent',
          suggestions: aiResponse.suggestions ?? [],
          sentences: aiResponse.sentences,
        };

        setMessages((prev) =>
          prev.map((msg) => (msg.id === pendingMessage.id ? aiMessage : msg)),
        );

        try {
          await saveMessage(sessionIdRef.current!, aiMessage);
        } catch {
          // Keep in memory even if persistence fails.
        }
      } catch (err) {
        setMessages((prev) => prev.filter((msg) => msg.id !== pendingMessage.id));
        setError(
          err instanceof Error
            ? err.message
            : 'ไม่สามารถสร้างข้อความได้ กรุณาลองอีกครั้ง',
        );
      }
    },
    [callChatApi, saveMessage],
  );

  // ─── Public actions ──────────────────────────────────────────────────────────

  /**
   * Fire-and-forget: translate userMessage then patch it in state + persist.
   * Clears `isTranslating` regardless of outcome so the skeleton always resolves.
   */
  const translateUserMessage = useCallback(
    (userMessage: ChatMessage): void => {
      const { id: userMessageId, rawText } = userMessage;
      fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getCustomAIHeaders() },
        body: JSON.stringify({ text: rawText }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.englishText === 'string' && data.englishText.trim()) {
            const updated: ChatMessage = {
              ...userMessage,
              englishText: data.englishText,
              reading: data.reading ?? '',
              romanization: data.romanization ?? '',
              translation: data.translation ?? '',
              english: data.english ?? '',
              grammarCorrect: data.grammarCorrect,
              grammarNotes: data.grammarNotes,
              isTranslating: false,
            };
            setMessages((prev) => prev.map((msg) => (msg.id === userMessageId ? updated : msg)));
            if (sessionIdRef.current) {
              saveMessage(sessionIdRef.current, updated).catch((err) => {
                console.error('Failed to persist translated user message:', err);
              });
            }
          } else {
            // No usable translation — clear skeleton, fall back to rawText.
            setMessages((prev) =>
              prev.map((msg) => (msg.id === userMessageId ? { ...msg, isTranslating: false } : msg)),
            );
          }
        })
        .catch(() => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === userMessageId ? { ...msg, isTranslating: false } : msg)),
          );
        });
    },
    [saveMessage],
  );

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!sessionIdRef.current || !sessionConfigRef.current) return;

      setError(null);
      setIsLoading(true);

      // Add user message immediately so the UI feels responsive.
      const userMessage = baseMessage({ role: 'user', rawText: text, isTranslating: true });
      setMessages((prev) => [...prev, userMessage]);

      // Translate in the background (non-blocking) — shows grammar feedback
      // and target-language rendering; a skeleton is displayed until it resolves.
      translateUserMessage(userMessage);

      // Persist user message (creates the session row if this is the first message).
      try {
        await ensureSessionSaved(text);
        await saveMessage(sessionIdRef.current, userMessage);
      } catch {
        // Continue even if persistence fails — data is in memory.
      }

      // Fetch and stream the AI reply.
      await runAssistantReply([...messages, userMessage]);

      setIsLoading(false);
    },
    [messages, saveMessage, ensureSessionSaved, runAssistantReply, translateUserMessage],
  );

  const retryLastMessage = useCallback(async (): Promise<void> => {
    const lastUserMessage = [...messages].reverse().find((msg) => msg.role === 'user');
    if (!lastUserMessage) return;

    setError(null);
    setIsLoading(true);
    await runAssistantReply(messages);
    setIsLoading(false);
  }, [messages, runAssistantReply]);

  // ─── Return ──────────────────────────────────────────────────────────────────

  return {
    messages,
    isLoading,
    error,
    sessionConfig,
    sessionId,
    sessionSaved,
    startSession,
    sendMessage,
    retryLastMessage,
    restoreSession,
  };
}
