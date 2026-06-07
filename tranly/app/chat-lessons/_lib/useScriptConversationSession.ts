'use client';

import { useCallback, useRef, useState } from 'react';
import type {
  ChatMessage,
  SessionConfig,
  ConversationSessionRecord,
} from '@/app/chat/_lib/types';
import { defaultGreetingsScript } from './defaultScript';
import type { ScriptStep } from './types';
import { useConversationHistory } from '@/app/chat/_lib/useConversationHistory';
import { supabase } from '@/app/_lib/supabaseClient';

export interface UseScriptConversationSessionReturn {
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  sessionConfig: SessionConfig | null;
  isEnded: boolean;
  startSession: (config: SessionConfig) => Promise<void>;
  endSession: () => Promise<void>;
}

export function useScriptConversationSession(): UseScriptConversationSessionReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [isEnded, setIsEnded] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const createdAtRef = useRef<string | null>(null);
  const currentStepIndexRef = useRef<number>(0);
  const scriptRef = useRef<ScriptStep[]>([]);

  const { saveSession, saveMessage } = useConversationHistory();

  const startSession = useCallback(
    async (config: SessionConfig) => {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      sessionIdRef.current = id;
      createdAtRef.current = createdAt;
      setSessionConfig(config);
      setError(null);
      setIsEnded(false);
      setIsLoading(true);
      currentStepIndexRef.current = 0;

      // Load script from Supabase if dynamic custom lesson, else localStorage/fallback
      let loadedScript: ScriptStep[] = [];
      try {
        if (config.lessonId && config.lessonId !== 'kr-greetings-basic') {
          const { data, error: fetchError } = await supabase
            .from('catalog_lessons')
            .select('script_steps')
            .eq('id', config.lessonId)
            .single();

          if (fetchError) {
            throw fetchError;
          }
          if (data && data.script_steps) {
            loadedScript = data.script_steps as ScriptStep[];
          }
        } else {
          const stored = localStorage.getItem('tranly_basic_greetings_script');
          if (stored) {
            loadedScript = JSON.parse(stored);
          }
        }
      } catch (err) {
        console.error('Failed to load greetings script:', err);
      }

      if (!Array.isArray(loadedScript) || loadedScript.length === 0) {
        loadedScript = defaultGreetingsScript;
      }
      scriptRef.current = loadedScript;
      setIsLoading(false);

      // Put the first bot message into state
      const firstStep = loadedScript[0];
      if (firstStep) {
        const initialBotMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          korean: firstStep.partnerMessage,
          reading: firstStep.partnerReading,
          romanization: firstStep.partnerRomanization || '',
          translation: firstStep.partnerTranslation,
          english: '',
          rawText: firstStep.partnerMessage,
          timestamp: new Date().toISOString(),
          status: 'sent',
          suggestions: firstStep.suggestions,
          ended: false,
        };
        setMessages([initialBotMessage]);

        // Save initial message & session in history
        const sessionRecord: ConversationSessionRecord = {
          id,
          topic: config.topic,
          proficiencyLevel: config.proficiencyLevel,
          wordContext: config.wordContext.map((w) => w.korean),
          goal: config.goal,
          createdAt,
          endedAt: null,
          completed: false,
        };

        saveSession(sessionRecord)
          .then(() => saveMessage(id, initialBotMessage))
          .catch((err) => {
            console.error('Failed to save session history:', err);
          });
      } else {
        setMessages([]);
      }
    },
    [saveSession, saveMessage]
  );

  const markCompleted = useCallback(async (): Promise<void> => {
    if (!sessionIdRef.current || !sessionConfig || !createdAtRef.current) return;
    const record: ConversationSessionRecord = {
      id: sessionIdRef.current,
      topic: sessionConfig.topic,
      proficiencyLevel: sessionConfig.proficiencyLevel,
      wordContext: sessionConfig.wordContext.map((w) => w.korean),
      goal: sessionConfig.goal,
      createdAt: createdAtRef.current,
      endedAt: new Date().toISOString(),
      completed: true,
    };
    try {
      await saveSession(record);
    } catch (err) {
      console.error('Failed to mark session as completed:', err);
    }
  }, [sessionConfig, saveSession]);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!sessionIdRef.current || !sessionConfig) return;

      setError(null);
      setIsLoading(true);

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        korean: text,
        reading: '',
        romanization: '',
        translation: '',
        english: '',
        rawText: text,
        timestamp: new Date().toISOString(),
        status: 'sent',
      };

      // Put user message in chat immediately
      setMessages((prev) => [...prev, userMessage]);

      try {
        await saveMessage(sessionIdRef.current, userMessage);
      } catch (err) {
        console.error('Failed to save user message:', err);
      }

      // Add a pending AI message placeholder
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

      // Simulate typing/loading latency
      setTimeout(async () => {
        const script = scriptRef.current;
        const currentIdx = currentStepIndexRef.current;
        const nextIdx = currentIdx + 1;

        if (nextIdx < script.length) {
          // Move to next step
          currentStepIndexRef.current = nextIdx;
          const nextStep = script[nextIdx];

          const botMessage: ChatMessage = {
            id: pendingMessage.id,
            role: 'assistant',
            korean: nextStep.partnerMessage,
            reading: nextStep.partnerReading,
            romanization: nextStep.partnerRomanization || '',
            translation: nextStep.partnerTranslation,
            english: '',
            rawText: nextStep.partnerMessage,
            timestamp: new Date().toISOString(),
            status: 'sent',
            suggestions: nextStep.suggestions,
            ended: false,
          };

          setMessages((prev) =>
            prev.map((msg) => (msg.id === pendingMessage.id ? botMessage : msg))
          );

          try {
            await saveMessage(sessionIdRef.current!, botMessage);
          } catch (err) {
            console.error('Failed to save bot message:', err);
          }
          setIsLoading(false);
        } else {
          // No more steps -> user completed the conversation
          setMessages((prev) => prev.filter((msg) => msg.id !== pendingMessage.id));
          setIsEnded(true);
          setIsLoading(false);
          await markCompleted();
        }
      }, 800);
    },
    [sessionConfig, saveMessage, markCompleted]
  );

  const retryLastMessage = useCallback(async (): Promise<void> => {
    // No-op for script-based sessions
  }, []);

  const endSession = useCallback(async (): Promise<void> => {
    if (!sessionIdRef.current || !sessionConfig || !createdAtRef.current) return;
    try {
      const sessionRecord: ConversationSessionRecord = {
        id: sessionIdRef.current,
        topic: sessionConfig.topic,
        proficiencyLevel: sessionConfig.proficiencyLevel,
        wordContext: sessionConfig.wordContext.map((w) => w.korean),
        goal: sessionConfig.goal,
        createdAt: createdAtRef.current,
        endedAt: new Date().toISOString(),
        completed: true,
      };
      await saveSession(sessionRecord);
    } catch (err) {
      console.error('Failed to end session:', err);
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
  };
}
