'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';
import { useActiveLanguage } from '@/app/_lib/ActiveLanguageContext';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

export interface LearningStats {
  totalWords: number;
  totalConversations: number;
  totalScans: number;
  isLoading: boolean;
}

export interface LanguageLearningStats {
  wordCount: number;
  flashcardSetCount: number;
  studySessionCount: number;
  isLoading: boolean;
}

export function useLearningStats(): LearningStats {
  const [totalWords, setTotalWords] = useState(0);
  const [totalConversations, setTotalConversations] = useState(0);
  const [totalScans, setTotalScans] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) {
          if (!cancelled) setIsLoading(false);
          return;
        }

        const [wordsRes, convRes, scansRes] = await Promise.all([
          supabase
            .from('words')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),
          supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),
          supabase
            .from('captures')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),
        ]);

        if (!cancelled) {
          setTotalWords(wordsRes.count || 0);
          setTotalConversations(convRes.count || 0);
          setTotalScans(scansRes.count || 0);
        }
      } catch (err) {
        console.error('Failed to load learning stats:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  return { totalWords, totalConversations, totalScans, isLoading };
}

export function useLanguageLearningStats(): LanguageLearningStats {
  const { activeLanguage } = useActiveLanguage();
  const [wordCount, setWordCount] = useState(0);
  const [flashcardSetCount, setFlashcardSetCount] = useState(0);
  const [studySessionCount, setStudySessionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setIsLoading(true);
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) {
          if (!cancelled) {
            setWordCount(0);
            setFlashcardSetCount(0);
            setStudySessionCount(0);
            setIsLoading(false);
          }
          return;
        }

        const [wordsRes, setsRes, sessionsRes] = await Promise.all([
          supabase
            .from('words')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('language', activeLanguage),
          supabase
            .from('flashcard_sets')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('language', activeLanguage),
          supabase
            .from('study_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('language', activeLanguage),
        ]);

        if (!cancelled) {
          setWordCount(wordsRes.count || 0);
          setFlashcardSetCount(setsRes.count || 0);
          setStudySessionCount(sessionsRes.count || 0);
        }
      } catch (err) {
        console.error('Failed to load language learning stats:', err);
        if (!cancelled) {
          setWordCount(0);
          setFlashcardSetCount(0);
          setStudySessionCount(0);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [activeLanguage]);

  return { wordCount, flashcardSetCount, studySessionCount, isLoading };
}
