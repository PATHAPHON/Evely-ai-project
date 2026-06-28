'use client';

import { useCallback, useRef, useState } from 'react';
import { randomId } from '@/app/_lib/utils/randomId';
import { getCustomAIHeaders } from '@/app/_lib/utils/getCustomAIHeaders';
import { markBudgetExhausted } from '@/app/_lib/hooks/useBudgetExhausted';
import { translateBatchToThai } from '@/app/_lib/utils/translateToThai';
import { useChatApi } from './useChatApi';
import { useConversationHistory } from './useConversationHistory';
import { baseMessage } from '../utils/baseMessage';

import type { TargetLanguage } from '@/app/_lib/types/wordTypes';
import type {
  ChatMessage,
  ChatSuccessResponse,
  ConversationSessionRecord,
  SessionConfig,
} from '../types/types';

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

export function useConversationSession(isPremium = false): UseConversationSessionReturn {
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
    const id = randomId();
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
        // Streaming reveal disabled: omit onPartial so the reply renders as one
        // complete block when finished (then WordRenderer plays the word-by-word
        // reveal), instead of sentences popping in mid-stream.
        const aiResponse: ChatSuccessResponse = await callChatApi(
          contextMessages,
          config.language,
        );

        // The model now replies in English only; fill Thai translations on-device
        // via Chrome's Translator API. When unsupported, translations stay empty
        // and the UI simply shows no Thai line.
        const sentences = aiResponse.sentences ?? [];
        const suggestions = aiResponse.suggestions ?? [];
        const toTranslate = [
          ...sentences.map((s) => s.englishText),
          ...suggestions.map((s) => s.englishText),
        ];
        const translated = await translateBatchToThai(toTranslate);

        const translatedSentences = translated
          ? sentences.map((s, i) => ({ ...s, translation: translated[i] ?? '' }))
          : sentences;
        const translatedSuggestions = translated
          ? suggestions.map((s, i) => ({
              ...s,
              translation: translated[sentences.length + i] ?? '',
            }))
          : suggestions;

        const aiMessage: ChatMessage = {
          ...pendingMessage,
          englishText: aiResponse.englishText,
          translation: translatedSentences.map((s) => s.translation).join(' '),
          english: aiResponse.english,
          rawText: aiResponse.englishText,
          timestamp: new Date().toISOString(),
          status: 'sent',
          suggestions: translatedSuggestions,
          sentences: translatedSentences,
          suggestionsLocked: aiResponse.suggestionsLocked,
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
        console.error('runAssistantReply failed:', err);
        setMessages((prev) => prev.filter((msg) => msg.id !== pendingMessage.id));
        // งบหมด: ปล่อยให้ banner + input ที่ปิดสื่อแทน ไม่โชว์แถบแดง inline
        if ((err as { budget?: boolean })?.budget) {
          setError(null);
        } else {
          setError('ขออภัย เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
        }
      }
    },
    [callChatApi, saveMessage],
  );

  // ─── Public actions ──────────────────────────────────────────────────────────

  /**
   * Fire-and-forget: grammar-check userMessage then patch it in state + persist.
   * Premium-only — free users skip this call entirely.
   * Clears `isTranslating` regardless of outcome so the skeleton always resolves.
   */
  const translateUserMessage = useCallback(
    (userMessage: ChatMessage): Promise<void> => {
      if (!isPremium) {
        // Free tier: clear skeleton immediately, no grammar check
        setMessages((prev) =>
          prev.map((msg) => (msg.id === userMessage.id ? { ...msg, isTranslating: false } : msg)),
        );
        return Promise.resolve();
      }
      const { id: userMessageId, rawText } = userMessage;
      return fetch('/api/grammar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getCustomAIHeaders() },
        body: JSON.stringify({ text: rawText }),
      })
        .then((res) => {
          if (res.status === 429) markBudgetExhausted();
          return res.ok ? res.json() : null;
        })
        .then((data) => {
          if (data && typeof data.englishText === 'string' && data.englishText.trim()) {
            const updated: ChatMessage = {
              ...userMessage,
              englishText: data.englishText,
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
    [isPremium, saveMessage],
  );

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!sessionIdRef.current || !sessionConfigRef.current) return;

      setError(null);
      setIsLoading(true);

      // Add user message immediately so the UI feels responsive.
      const userMessage = baseMessage({ role: 'user', rawText: text, isTranslating: true });
      setMessages((prev) => [...prev, userMessage]);

      // Create the session row first so any async saveMessage calls from
      // translateUserMessage don't race against a missing conversations row.
      try {
        await ensureSessionSaved(text);
      } catch {
        // Continue even if persistence fails — data is in memory.
      }

      // Grammar must fully resolve (bubble shows corrected text) before the AI
      // reply starts — no timeout race, so the AI can never appear while the user
      // bubble is still a skeleton. Always resolves; /api/grammar has its own 30s
      // abort. Premium-only; free resolves instantly.
      await translateUserMessage(userMessage);

      // Persist user message. Premium already persisted the grammar-corrected
      // version inside translateUserMessage; saving the stale skeleton here
      // would overwrite that row, so only the free path needs this save.
      if (!isPremium) {
        try {
          await saveMessage(sessionIdRef.current, userMessage);
        } catch {
          // Continue even if persistence fails — data is in memory.
        }
      }

      // Fetch and stream the AI reply.
      await runAssistantReply([...messages, userMessage]);

      setIsLoading(false);
    },
    [messages, isPremium, saveMessage, ensureSessionSaved, runAssistantReply, translateUserMessage],
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
