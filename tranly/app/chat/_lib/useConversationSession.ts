'use client';

import { useCallback, useRef, useState } from 'react';
import { getCustomAIHeaders } from '@/app/_lib/getCustomAIHeaders';
import { useConversationHistory } from './useConversationHistory';
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
  startSession: (config: SessionConfig) => void;
  endSession: () => Promise<void>;
}

export function useConversationSession(): UseConversationSessionReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(
    null
  );
  const sessionIdRef = useRef<string | null>(null);
  const createdAtRef = useRef<string | null>(null);

  const { saveSession, saveMessage } = useConversationHistory();

  const startSession = useCallback(
    (config: SessionConfig) => {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      sessionIdRef.current = id;
      createdAtRef.current = createdAt;
      setSessionConfig(config);
      setMessages([]);
      setError(null);

      const sessionRecord: ConversationSessionRecord = {
        id,
        topic: config.topic,
        proficiencyLevel: config.proficiencyLevel,
        wordContext: config.wordContext.map((w) => w.korean),
        createdAt,
        endedAt: null,
        completed: false,
      };

      saveSession(sessionRecord).catch((err) => {
        const message =
          err instanceof Error
            ? err.message
            : 'บันทึกเซสชันไม่สำเร็จ กรุณาลองอีกครั้ง';
        setError(message);
      });
    },
    [saveSession]
  );

  const buildContextPayload = useCallback(
    (msgs: ChatMessage[]): ChatMessagePayload[] => {
      const recent = msgs.slice(-MAX_CONTEXT_MESSAGES);
      return recent.map(
        (msg): ChatMessagePayload => ({
          role: msg.role,
          content: msg.role === 'user' ? msg.rawText : msg.korean,
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
      fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (
            data &&
            typeof data.korean === 'string' &&
            data.korean.trim().length > 0
          ) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === userMessageId
                  ? {
                      ...msg,
                      korean: data.korean,
                      reading: data.reading ?? '',
                      romanization: data.romanization ?? '',
                      translation: data.translation ?? '',
                      english: data.english ?? '',
                    }
                  : msg
              )
            );
          }
        })
        .catch(() => {
          // Translation failure is silent — raw text remains visible
        });

      // Persist user message
      try {
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
    [sessionConfig, messages, saveMessage, callChatApi]
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
  }, [messages, saveMessage, callChatApi]);

  const endSession = useCallback(async (): Promise<void> => {
    if (!sessionIdRef.current || !sessionConfig || !createdAtRef.current) return;

    try {
      const sessionRecord: ConversationSessionRecord = {
        id: sessionIdRef.current,
        topic: sessionConfig.topic,
        proficiencyLevel: sessionConfig.proficiencyLevel,
        wordContext: sessionConfig.wordContext.map((w) => w.korean),
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
    startSession,
    endSession,
  };
}
