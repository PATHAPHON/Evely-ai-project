'use client';

import { useCallback, useRef, useState } from 'react';
import { getCustomAIHeaders } from '@/app/_lib/getCustomAIHeaders';
import { useConversationHistory } from './useConversationHistory';

import type { TargetLanguage } from '@/app/_lib/wordTypes';
import type {
  ChatMessage,
  ChatMessagePayload,
  ChatRequest,
  ChatSuccessResponse,
  ChatErrorResponse,
  ConversationSessionRecord,
  SessionConfig,
} from './types';

const MAX_CONTEXT_MESSAGES = 20;

export interface UseConversationSessionReturn {
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  sessionConfig: SessionConfig | null;
  /** True once the AI has concluded the conversation (its goal was reached). */
  isEnded: boolean;
  startSession: (config: SessionConfig) => void;
  endSession: () => Promise<void>;
  /** Append + persist a plain user message. */
  addUserMessage: (text: string) => Promise<void>;
  /**
   * Append + persist a plain assistant message with optional tappable
   * quick-reply chips.
   */
  addAssistantMessage: (text: string, suggestions?: string[]) => Promise<void>;
  /** Load an existing session's messages and resume sending into it. */
  restoreSession: (sessionId: string, language: TargetLanguage) => Promise<void>;
  sessionId: string | null;
  sessionSaved: boolean;
}

export function useConversationSession(): UseConversationSessionReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(
    null
  );
  const [isEnded, setIsEnded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const createdAtRef = useRef<string | null>(null);
  // Lazy persistence: the conversations row is created on the first message,
  // not on session start, so opening /chat never leaves empty sessions behind.
  const sessionSavedRef = useRef(false);
  const sessionConfigRef = useRef<SessionConfig | null>(null);
  // Title persisted for this session (first user message) — reused by later
  // upserts so they don't overwrite it with the generic config topic.
  const savedTopicRef = useRef<string | null>(null);

  const { saveSession, saveMessage, loadSessionMessages } =
    useConversationHistory();

  const startSession = useCallback((config: SessionConfig) => {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    sessionIdRef.current = id;
    setSessionId(id);
    createdAtRef.current = createdAt;
    sessionSavedRef.current = false;
    setSessionSaved(false);
    sessionConfigRef.current = config;
    savedTopicRef.current = null;
    setSessionConfig(config);
    setMessages([]);
    setError(null);
    setIsEnded(false);
  }, []);

  // Create the conversations row if it doesn't exist yet (must run before the
  // first saveMessage — conversation_messages.session_id references it).
  // The first user message becomes the session title shown in the history list.
  const ensureSessionSaved = useCallback(async (firstMessageText?: string): Promise<void> => {
    if (sessionSavedRef.current) return;
    const config = sessionConfigRef.current;
    if (!sessionIdRef.current || !config || !createdAtRef.current) return;

    const title = firstMessageText?.trim().slice(0, 60) || config.topic;
    savedTopicRef.current = title;
    const sessionRecord: ConversationSessionRecord = {
      id: sessionIdRef.current,
      topic: title,
      proficiencyLevel: config.proficiencyLevel,
      wordContext: config.wordContext.map((w) => w.korean),
      goal: config.goal,
      createdAt: createdAtRef.current,
      endedAt: null,
      completed: false,
    };

    await saveSession(sessionRecord);
    sessionSavedRef.current = true;
    setSessionSaved(true);
  }, [saveSession]);

  // Persist the current session as completed (used when the AI ends the chat).
  const markCompleted = useCallback(async (): Promise<void> => {
    if (!sessionIdRef.current || !sessionConfig || !createdAtRef.current) return;
    const record: ConversationSessionRecord = {
      id: sessionIdRef.current,
      topic: savedTopicRef.current ?? sessionConfig.topic,
      proficiencyLevel: sessionConfig.proficiencyLevel,
      wordContext: sessionConfig.wordContext.map((w) => w.korean),
      goal: sessionConfig.goal,
      createdAt: createdAtRef.current,
      endedAt: new Date().toISOString(),
      completed: true,
    };
    try {
      await saveSession(record);
    } catch {
      // Non-fatal: the conversation is already shown as ended in the UI.
    }
  }, [sessionConfig, saveSession]);

  const buildContextPayload = useCallback(
    (msgs: ChatMessage[]): ChatMessagePayload[] => {
      const recent = msgs.slice(-MAX_CONTEXT_MESSAGES);
      return recent.map(
        (msg): ChatMessagePayload => ({
          role: msg.role,
          content: msg.role === 'user' ? (msg.korean || msg.rawText) : msg.korean,
        })
      );
    },
    []
  );

  const callChatApi = useCallback(
    async (contextMessages: ChatMessage[]): Promise<ChatSuccessResponse> => {
      if (!sessionConfig) {
        throw new Error('ไม่มีเซสชันที่ใช้งานอยู่');
      }

      const payload: ChatRequest = {
        messages: buildContextPayload(contextMessages),
        proficiencyLevel: sessionConfig.proficiencyLevel,
        topic: sessionConfig.topic,
        wordContext: sessionConfig.wordContext.map((w) => w.korean),
        goal: sessionConfig.goal,
        language: sessionConfig.language,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getCustomAIHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ChatErrorResponse;
        throw new Error(
          errorData.error?.message ?? 'ไม่สามารถสร้างข้อความได้ กรุณาลองอีกครั้ง'
        );
      }

      return (await response.json()) as ChatSuccessResponse;
    },
    [sessionConfig, buildContextPayload]
  );

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!sessionIdRef.current || !sessionConfig) return;

      setError(null);

      setIsLoading(true);

      // Create user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        korean: '',
        reading: '',
        romanization: '',
        translation: '',
        english: '',
        rawText: text,
        timestamp: new Date().toISOString(),
        status: 'sent',
      };

      // Add user message to state immediately
      setMessages((prev) => [...prev, userMessage]);

      // Fire translation of the user's input in the background (non-blocking)
      const userMessageId = userMessage.id;
      const headers = getCustomAIHeaders();
      fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ text }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (
            data &&
            typeof data.korean === 'string' &&
            data.korean.trim().length > 0
          ) {
            const updatedUserMessage: ChatMessage = {
              ...userMessage,
              korean: data.korean,
              reading: data.reading ?? '',
              romanization: data.romanization ?? '',
              translation: data.translation ?? '',
              english: data.english ?? '',
              grammarCorrect: data.grammarCorrect,
              grammarNotes: data.grammarNotes,
            };
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === userMessageId ? updatedUserMessage : msg
              )
            );
            if (sessionIdRef.current) {
              saveMessage(sessionIdRef.current, updatedUserMessage).catch((err) => {
                console.error('Failed to update persisted user message with translation:', err);
              });
            }
          }
        })
        .catch(() => {
          // Translation failure is silent — raw text remains visible
        });

      // Persist user message
      try {
        await ensureSessionSaved(text);
        await saveMessage(sessionIdRef.current, userMessage);
      } catch {
        // Continue even if persistence fails — data is in memory
      }

      // Create pending AI message placeholder
      const pendingMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        korean: '',
        reading: '',
        romanization: '',
        translation: '',
        english: '',
        rawText: '',
        timestamp: new Date().toISOString(),
        status: 'pending',
      };

      setMessages((prev) => [...prev, pendingMessage]);

      try {
        // Build context including the new user message
        const contextMessages = [...messages, userMessage];
        const aiResponse = await callChatApi(contextMessages);

        // Update pending message with AI response
        const aiMessage: ChatMessage = {
          ...pendingMessage,
          korean: aiResponse.korean,
          reading: aiResponse.reading,
          romanization: aiResponse.romanization,
          translation: aiResponse.translation,
          english: aiResponse.english,
          rawText: aiResponse.korean,
          timestamp: new Date().toISOString(),
          status: 'sent',
          suggestions: aiResponse.suggestions ?? [],
          ended: aiResponse.ended ?? false,
          sentences: aiResponse.sentences,
        };

        setMessages((prev) =>
          prev.map((msg) => (msg.id === pendingMessage.id ? aiMessage : msg))
        );

        // Persist AI message
        try {
          await saveMessage(sessionIdRef.current!, aiMessage);
        } catch {
          // Continue even if persistence fails — data is in memory
        }

        // If the AI concluded the conversation (goal reached), lock the chat
        // and persist the session as completed.
        if (aiMessage.ended) {
          setIsEnded(true);
          void markCompleted();
        }
      } catch (err) {
        // Remove pending message and mark error
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== pendingMessage.id)
        );
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'ไม่สามารถสร้างข้อความได้ กรุณาลองอีกครั้ง';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionConfig, messages, saveMessage, callChatApi, markCompleted, ensureSessionSaved]
  );

  const retryLastMessage = useCallback(async (): Promise<void> => {
    // Find the last user message
    const lastUserMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === 'user');

    if (!lastUserMessage) return;

    // Clear error and retry
    setError(null);
    setIsLoading(true);

    // Create pending AI message placeholder
    const pendingMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      korean: '',
      reading: '',
      romanization: '',
      translation: '',
      english: '',
      rawText: '',
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    setMessages((prev) => [...prev, pendingMessage]);

    try {
      // Use current messages (which include the last user message) as context
      const aiResponse = await callChatApi(messages);

      // Update pending message with AI response
      const aiMessage: ChatMessage = {
        ...pendingMessage,
        korean: aiResponse.korean,
        reading: aiResponse.reading,
        romanization: aiResponse.romanization,
        translation: aiResponse.translation,
        english: aiResponse.english,
        rawText: aiResponse.korean,
        timestamp: new Date().toISOString(),
        status: 'sent',
        suggestions: aiResponse.suggestions ?? [],
        ended: aiResponse.ended ?? false,
        sentences: aiResponse.sentences,
      };

      setMessages((prev) =>
        prev.map((msg) => (msg.id === pendingMessage.id ? aiMessage : msg))
      );

      // Persist AI message
      try {
        await saveMessage(sessionIdRef.current!, aiMessage);
      } catch {
        // Continue even if persistence fails — data is in memory
      }

      // If the AI concluded the conversation (goal reached), lock the chat
      // and persist the session as completed.
      if (aiMessage.ended) {
        setIsEnded(true);
        void markCompleted();
      }
    } catch (err) {
      // Remove pending message and mark error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== pendingMessage.id)
      );
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to generate message. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [messages, saveMessage, callChatApi, markCompleted]);

  // Append + persist a plain user message.
  const addUserMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!sessionIdRef.current) return;
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        korean: '',
        reading: '',
        romanization: '',
        translation: '',
        english: '',
        rawText: text,
        timestamp: new Date().toISOString(),
        status: 'sent',
      };
      setMessages((prev) => [...prev, msg]);
      try {
        await ensureSessionSaved(text);
        await saveMessage(sessionIdRef.current, msg);
      } catch {
        // keep in memory even if persistence fails
      }
    },
    [saveMessage, ensureSessionSaved]
  );

  // Append + persist a plain assistant message, with optional quick-reply
  // chips the user can tap to answer.
  const addAssistantMessage = useCallback(
    async (text: string, suggestions: string[] = []): Promise<void> => {
      if (!sessionIdRef.current) return;
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        korean: text,
        reading: '',
        romanization: '',
        translation: '',
        english: '',
        rawText: text,
        timestamp: new Date().toISOString(),
        status: 'sent',
        suggestions: suggestions.map((s) => ({ korean: s, translation: '' })),
      };
      setMessages((prev) => [...prev, msg]);
      try {
        await ensureSessionSaved();
        await saveMessage(sessionIdRef.current, msg);
      } catch {
        // keep in memory even if persistence fails
      }
    },
    [saveMessage, ensureSessionSaved]
  );

  // Resume an existing conversation: load its messages and point further
  // sends at the same session id.
  const restoreSession = useCallback(
    async (sessionId: string, language: TargetLanguage): Promise<void> => {
      setError(null);
      sessionIdRef.current = sessionId;
      setSessionId(sessionId);
      createdAtRef.current = new Date().toISOString();
      sessionSavedRef.current = true; // row already exists in DB
      setSessionSaved(true);
      const config: SessionConfig = {
        topic: 'พูดคุยทั่วไป',
        goal: '',
        proficiencyLevel: 'beginner',
        wordContext: [],
        language,
      };
      sessionConfigRef.current = config;
      setSessionConfig(config);
      setIsEnded(false);
      try {
        const msgs = await loadSessionMessages(sessionId);
        setMessages(msgs);
        // Keep the existing title (first user message) so later upserts
        // (markCompleted/endSession) don't reset it to the generic topic.
        const firstUser = msgs.find((m) => m.role === 'user');
        savedTopicRef.current =
          firstUser?.rawText?.trim().slice(0, 60) || null;
      } catch {
        setMessages([]);
        savedTopicRef.current = null;
      }
    },
    [loadSessionMessages]
  );

  const endSession = useCallback(async (): Promise<void> => {
    if (!sessionIdRef.current || !sessionConfig || !createdAtRef.current) return;

    try {
      const sessionRecord: ConversationSessionRecord = {
        id: sessionIdRef.current,
        topic: savedTopicRef.current ?? sessionConfig.topic,
        proficiencyLevel: sessionConfig.proficiencyLevel,
        wordContext: sessionConfig.wordContext.map((w) => w.korean),
        goal: sessionConfig.goal,
        createdAt: createdAtRef.current,
        endedAt: new Date().toISOString(),
        completed: true,
      };

      await saveSession(sessionRecord);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'บันทึกเซสชันไม่สำเร็จ กรุณาลองอีกครั้ง';
      setError(errorMessage);
      throw err;
    }
  }, [sessionConfig, saveSession]);

  return {
    messages,
    sendMessage,
    retryLastMessage,
    isLoading,
    error,
    sessionConfig,
    isEnded,
    startSession,
    endSession,
    addUserMessage,
    addAssistantMessage,
    restoreSession,
    sessionId,
    sessionSaved,
  };
}
