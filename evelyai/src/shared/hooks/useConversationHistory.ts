'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/shared/supabase/supabaseClient';
import type {
  ChatMessage,
  ConversationSessionRecord,
  ReplySuggestion,
} from '../types/chatTypes';

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

  // Shared isLoading/error/finally bookkeeping around a Supabase call. `fn`
  // still owns its own auth checks and error branches — this only collapses
  // the identical loading-state plumbing every action repeated.
  const run = useCallback(async <T,>(fallbackMessage: string, fn: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : fallbackMessage;
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSessions = useCallback((): Promise<void> => run('โหลดประวัติสนทนาไม่สำเร็จ', async () => {
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
      createdAt: row.created_at,
      endedAt: row.ended_at,
      completed: row.completed,
    }));

    setSessions(mappedSessions);
  }), [run]);

  const loadSessionMessages = useCallback(
    (sessionId: string): Promise<ChatMessage[]> => run('โหลดข้อความไม่สำเร็จ', async () => {
      const { data, error: dbError } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (dbError) {
        throw dbError;
      }

      const messages: ChatMessage[] = (data || []).map((r) => {
        const splitEnglishText = (r.english_text || '').split('|||');
        const splitTranslation = (r.translation || '').split('|||');
        const splitEnglish = (r.english || '').split('|||');

        // The english_phrases column stores:
        // - User messages: JSON grammar correction data ({ grammarCorrect, grammarNotes, originalText, correctedText, grammarError })
        // - Assistant messages: JSON reply suggestions metadata ({ suggestions, suggestionsLocked })
        let grammarData: {
          grammarCorrect?: boolean;
          grammarNotes?: string;
          originalText?: string;
          correctedText?: string;
          grammarError?: string;
        } | null = null;
        let assistantMeta: { suggestions?: ReplySuggestion[]; suggestionsLocked?: boolean } | null = null;
        if (r.english_phrases) {
          try {
            const parsed = JSON.parse(r.english_phrases);
            if (r.role === 'user') {
              grammarData = parsed;
            } else if (r.role === 'assistant') {
              assistantMeta = parsed;
            }
          } catch {
            // ignore malformed data
          }
        }

        const sentences = splitEnglishText.map((k: string, idx: number) => ({
          englishText: k,
          translation: splitTranslation[idx] || '',
          english: splitEnglish[idx] || '',
        }));

        return {
          id: r.id,
          role: r.role as 'user' | 'assistant',
          englishText: r.english_text || '',
          translation: r.translation || '',
          english: r.english || '',
          rawText: r.raw_text || '',
          timestamp: r.timestamp,
          status: 'sent' as const,
          // Only assistant messages are serialised with '|||' separators;
          // user rows store a plain string and never had sentences in memory.
          sentences: r.role === 'assistant' && sentences.length > 0 ? sentences : undefined,
          suggestions: assistantMeta?.suggestions,
          suggestionsLocked: assistantMeta?.suggestionsLocked,
          grammarCorrect: grammarData?.grammarCorrect,
          grammarNotes: grammarData?.grammarNotes,
          originalText: grammarData?.originalText,
          correctedText: grammarData?.correctedText,
          grammarError: grammarData?.grammarError,
        };
      });

      return messages;
    }),
    [run]
  );

  const saveSession = useCallback(
    (session: ConversationSessionRecord): Promise<void> => run('บันทึกเซสชันไม่สำเร็จ กรุณาลองอีกครั้ง', async () => {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) {
        throw new Error('User not authenticated.');
      }

      const { error: dbError } = await supabase.from('conversations').upsert({
        id: session.id,
        user_id: userId,
        topic: session.topic,
        created_at: session.createdAt,
        ended_at: session.endedAt,
        completed: session.completed,
      });

      if (dbError) {
        throw dbError;
      }
    }),
    [run]
  );

  const saveMessage = useCallback(
    (sessionId: string, message: ChatMessage): Promise<void> => run('บันทึกข้อความไม่สำเร็จ กรุณาลองอีกครั้ง', async () => {
      const isAssistant = message.role === 'assistant';
      const record = {
        id: message.id,
        session_id: sessionId,
        role: message.role,
        english_text: isAssistant && message.sentences
          ? message.sentences.map((s) => s.englishText).join('|||')
          : message.englishText,
        translation: isAssistant && message.sentences
          ? message.sentences.map((s) => s.translation).join('|||')
          : message.translation,
        english: isAssistant && message.sentences
          ? message.sentences.map((s) => s.english).join('|||')
          : message.english,
        // english_phrases stores grammar feedback for user, and suggestions metadata for assistant.
        english_phrases: isAssistant
          ? (message.suggestions && message.suggestions.length > 0) || message.suggestionsLocked !== undefined
            ? JSON.stringify({
                suggestions: message.suggestions,
                suggestionsLocked: message.suggestionsLocked,
              })
            : null
          : (message.grammarCorrect !== undefined || message.grammarNotes || message.originalText || message.correctedText || message.grammarError)
            ? JSON.stringify({
                grammarCorrect: message.grammarCorrect,
                grammarNotes: message.grammarNotes,
                originalText: message.originalText,
                correctedText: message.correctedText,
                grammarError: message.grammarError,
              })
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
    }),
    [run]
  );

  const deleteSession = useCallback(
    (sessionId: string): Promise<void> => run('ลบเซสชันไม่สำเร็จ กรุณาลองอีกครั้ง', async () => {
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
    }),
    [run]
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
