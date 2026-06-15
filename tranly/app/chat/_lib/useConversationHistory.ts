'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';
import type {
  ChatMessage,
  ConversationSessionRecord,
} from './types';

export interface UseConversationHistoryReturn {
  sessions: ConversationSessionRecord[];
  loadSessions: () => Promise<void>;
  loadSessionMessages: (sessionId: string) => Promise<ChatMessage[]>;
  saveSession: (session: ConversationSessionRecord) => Promise<void>;
  saveMessage: (sessionId: string, message: ChatMessage) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useConversationHistory(): UseConversationHistoryReturn {
  const [sessions, setSessions] = useState<ConversationSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) {
        setSessions([]);
        return;
      }

      const { data, error: dbError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (dbError) {
        throw dbError;
      }

      const mappedSessions: ConversationSessionRecord[] = (data || []).map((row) => ({
        id: row.id,
        topic: row.topic,
        wordContext: row.word_context || [],
        goal: row.goal || '',
        createdAt: row.created_at,
        endedAt: row.ended_at,
        completed: row.completed,
      }));

      setSessions(mappedSessions);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'โหลดประวัติสนทนาไม่สำเร็จ';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSessionMessages = useCallback(
    async (sessionId: string): Promise<ChatMessage[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from('conversation_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('timestamp', { ascending: true });

        if (dbError) {
          throw dbError;
        }

        const messages: ChatMessage[] = (data || []).map((r) => {
          const splitKorean = (r.english_text || '').split('|||');
          const splitReading = (r.reading || '').split('|||');
          const splitRomanization = (r.romanization || '').split('|||');
          const splitTranslation = (r.translation || '').split('|||');
          const splitEnglish = (r.english || '').split('|||');

          // Phrases are stored as JSON.
          // For user messages, we store grammar correction data.
          // For assistant messages, we store phrase arrays per sentence.
          let phrasesPerSentence: string[][] = [];
          let grammarData: { grammarCorrect?: boolean; grammarNotes?: string } | null = null;
          if (r.english_phrases) {
            try {
              const parsed = JSON.parse(r.english_phrases);
              if (r.role === 'user') {
                grammarData = parsed;
              } else if (Array.isArray(parsed)) {
                phrasesPerSentence = parsed;
              }
            } catch {
              // ignore malformed phrase data
            }
          }

          const sentences = splitKorean.map((k: string, idx: number) => {
            const phrases = phrasesPerSentence[idx];
            return {
              englishText: k,
              reading: splitReading[idx] || '',
              romanization: splitRomanization[idx] || '',
              translation: splitTranslation[idx] || '',
              english: splitEnglish[idx] || '',
              englishPhrases:
                Array.isArray(phrases) && phrases.length > 0 ? phrases : undefined,
            };
          });

          return {
            id: r.id,
            role: r.role as 'user' | 'assistant',
            englishText: r.english_text || '',
            reading: r.reading || '',
            romanization: r.romanization || '',
            translation: r.translation || '',
            english: r.english || '',
            rawText: r.raw_text || '',
            timestamp: r.timestamp,
            status: 'sent' as const,
            sentences: sentences.length > 0 ? sentences : undefined,
            grammarCorrect: grammarData?.grammarCorrect,
            grammarNotes: grammarData?.grammarNotes,
          };
        });

        return messages;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'โหลดข้อความไม่สำเร็จ';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const saveSession = useCallback(
    async (session: ConversationSessionRecord): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) {
          throw new Error('User not authenticated.');
        }

        const { error: dbError } = await supabase.from('conversations').upsert({
          id: session.id,
          user_id: userId,
          topic: session.topic,
          word_context: session.wordContext,
          goal: session.goal,
          created_at: session.createdAt,
          ended_at: session.endedAt,
          completed: session.completed,
        });

        if (dbError) {
          throw dbError;
        }

        setIsLoading(false);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'บันทึกเซสชันไม่สำเร็จ กรุณาลองอีกครั้ง';
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    []
  );

  const saveMessage = useCallback(
    async (sessionId: string, message: ChatMessage): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const isAssistant = message.role === 'assistant';
        const record = {
          id: message.id,
          session_id: sessionId,
          role: message.role,
          english_text: isAssistant && message.sentences
            ? message.sentences.map((s) => s.englishText).join('|||')
            : message.englishText,
          reading: isAssistant && message.sentences
            ? message.sentences.map((s) => s.reading).join('|||')
            : message.reading,
          romanization: isAssistant && message.sentences
            ? message.sentences.map((s) => s.romanization).join('|||')
            : message.romanization,
          translation: isAssistant && message.sentences
            ? message.sentences.map((s) => s.translation).join('|||')
            : message.translation,
          english: isAssistant && message.sentences
            ? message.sentences.map((s) => s.english).join('|||')
            : message.english,
          english_phrases:
            isAssistant && message.sentences
              ? JSON.stringify(message.sentences.map((s) => s.englishPhrases ?? []))
              : !isAssistant && (message.grammarCorrect !== undefined || message.grammarNotes)
                ? JSON.stringify({ grammarCorrect: message.grammarCorrect, grammarNotes: message.grammarNotes })
                : null,
          raw_text: message.rawText,
          timestamp: message.timestamp,
        };

        const { error: dbError } = await supabase
          .from('conversation_messages')
          .upsert(record);

        if (dbError) {
          throw dbError;
        }

        setIsLoading(false);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'บันทึกข้อความไม่สำเร็จ กรุณาลองอีกครั้ง';
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    []
  );

  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) {
          throw new Error('User not authenticated.');
        }

        // Deleting from public.conversations cascades and deletes all related messages automatically
        const { error: dbError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', sessionId)
          .eq('user_id', userId);

        if (dbError) {
          throw dbError;
        }

        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setIsLoading(false);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'ลบเซสชันไม่สำเร็จ กรุณาลองอีกครั้ง';
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    []
  );

  return {
    sessions,
    loadSessions,
    loadSessionMessages,
    saveSession,
    saveMessage,
    deleteSession,
    isLoading,
    error,
  };
}
