'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/_lib/supabase/supabaseClient';
import {
  deriveWordStatus,
  type WordStatus,
  type WordBankEntry,
} from '@/app/_lib/utils/wordStatusDerivation';
import {
  recalculateProgress,
  createInitialProgress,
} from '@/app/_lib/utils/spacedRepetition';
import { getCustomAIHeaders } from '@/app/_lib/utils/getCustomAIHeaders';
import { translateBatchToThai } from '@/app/_lib/utils/translateToThai';
import { isAuthExpiredError, rowToWordBankEntry } from '@/app/_lib/utils/wordBankRow';
import { useToast } from '@/app/_components/Toast';
import { th } from '@/app/_lib/utils/strings';

/** A word bank entry flattened with its derived learning status. */
export interface WordBankWord {
  id: string;
  word: string;
  thai: string | null;
  status: WordStatus;
}

export interface WordStatusContextValue {
  /** All words in the bank, each with its currently derived status. */
  words: WordBankWord[];
  getStatus: (word: string) => WordStatus;
  getEntry: (word: string) => WordBankEntry | null;
  addWord: (word: string) => Promise<void>;
  removeWord: (wordId: string) => Promise<void>;
  reviewWord: (wordId: string, quality: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Owns the in-memory word bank: loads it from Supabase, derives word status,
 * and mutates it (add / remove / review). Returns the value consumed through
 * WordStatusContext.
 */
export function useWordBank(): WordStatusContextValue {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState<WordBankWord[]>([]);

  const wordBankRef = useRef<Map<string, WordBankEntry>>(new Map());
  const rejectedSetRef = useRef<Set<string>>(new Set());
  const userIdRef = useRef<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  // Rebuild the flattened snapshot (with derived status) and push to state.
  // Called from mutations/effects only — reading refs here is allowed.
  const notifyUpdate = useCallback(() => {
    const snapshot: WordBankWord[] = [];
    wordBankRef.current.forEach((entry) => {
      snapshot.push({
        id: entry.id,
        word: entry.word,
        thai: entry.thai,
        status: deriveWordStatus(entry.word, wordBankRef.current, rejectedSetRef.current),
      });
    });
    setWords(snapshot);
  }, []);

  // ─── Load data from Supabase on mount ─────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
          if (mounted) {
            setIsLoading(false);
            setError(null);
          }
          return;
        }

        userIdRef.current = userId;

        // Fetch words joined with word_progress
        const { data: wordsData, error: wordsError } = await supabase
          .from('words')
          .select(
            `
            id,
            word,
            thai,
            part_of_speech,
            word_progress (
              box,
              interval,
              ease_factor,
              repetitions,
              last_reviewed_at,
              next_review_at
            )
          `
          )
          .eq('user_id', userId);

        if (wordsError) {
          throw new Error(`Failed to load words: ${wordsError.message}`);
        }

        if (!mounted) return;

        // Build in-memory Map
        const newWordBank = new Map<string, WordBankEntry>();
        for (const row of wordsData || []) {
          const entry = rowToWordBankEntry(row, (row.word || '').toLowerCase());
          newWordBank.set(entry.word, entry);
        }

        wordBankRef.current = newWordBank;
        setError(null);
        setIsLoading(false);
        notifyUpdate();
      } catch (err) {
        if (mounted) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to load word status data';
          setError(errorMsg);
          setIsLoading(false);
          // Show notification when word bank fails to load (Requirement 5.6)
          showToast(th.errors.wordStatusUnavailable, 'warning', 5000);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [notifyUpdate, showToast]);

  // ─── getStatus ──────────────────────────────────────────────────────────────

  const getStatus = useCallback((word: string): WordStatus => {
    return deriveWordStatus(word, wordBankRef.current, rejectedSetRef.current);
  }, []);

  // ─── getEntry ───────────────────────────────────────────────────────────────

  const getEntry = useCallback((word: string): WordBankEntry | null => {
    return wordBankRef.current.get(word.toLowerCase().trim()) ?? null;
  }, []);

  const handleAuthExpired = useCallback(() => {
    router.push('/auth');
  }, [router]);

  // ─── Fetch translation in background ─────────────────────────────────────

  const fetchTranslationInBackground = useCallback(
    async (wordId: string, normalizedWord: string, originalWord: string) => {
      const userId = userIdRef.current;
      if (!userId) return;

      try {
        const headers = getCustomAIHeaders();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // match server-side API timeout

        const res = await fetch('/api/word-detail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            word: originalWord,
            language: 'english',
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) return;

        const data = await res.json();

        // Try on-device translation first, fall back to AI-generated Thai meaning if unsupported/empty
        const [translated] = (await translateBatchToThai([originalWord])) ?? [];
        const thai = (translated && translated.trim())
          ? translated.trim()
          : (typeof data.thai === 'string' && data.thai.trim() ? data.thai.trim() : null);
        const partOfSpeech =
          typeof data.partOfSpeech === 'string' && data.partOfSpeech
            ? data.partOfSpeech
            : null;

        if (!thai && !partOfSpeech) return;

        const { error: updateError } = await supabase
          .from('words')
          .update({
            ...(thai ? { thai, label: thai } : {}),
            ...(partOfSpeech ? { part_of_speech: partOfSpeech } : {}),
          })
          .eq('id', wordId)
          .eq('user_id', userId);

        if (updateError) return;

        const entry = wordBankRef.current.get(normalizedWord);
        if (entry) {
          wordBankRef.current.set(normalizedWord, {
            ...entry,
            thai: thai ?? entry.thai,
            partOfSpeech: partOfSpeech ?? entry.partOfSpeech,
          });
          notifyUpdate();
        }
      } catch {
        // Translation fetch failed — word is already stored with null fields
        // This is acceptable per requirement 3.9
      }
    },
    [notifyUpdate]
  );

  // ─── addWord ────────────────────────────────────────────────────────────────

  const addWord = useCallback(
    async (word: string): Promise<void> => {
      const normalizedWord = word.toLowerCase().trim();
      const userId = userIdRef.current;

      if (!userId) {
        handleAuthExpired();
        return;
      }

      // Check if word already exists in local cache (handle duplicates gracefully)
      if (wordBankRef.current.has(normalizedWord)) {
        return; // Word already in bank, no-op
      }

      const initialProgress = createInitialProgress();

      // Insert into words table
      const { data: insertedWord, error: insertError } = await supabase
        .from('words')
        .insert({
          user_id: userId,
          label: word,
          word: normalizedWord,
          english: word,
          language: 'english',
        })
        .select('id')
        .single();

      // Handle duplicate insert gracefully (Postgres 23505 error)
      if (insertError) {
        if (insertError.code === '23505') {
          // Word already exists in DB — fetch existing and update cache
          const { data: existing } = await supabase
            .from('words')
            .select(
              `
              id, word, thai, part_of_speech,
              word_progress (box, interval, ease_factor, repetitions, last_reviewed_at, next_review_at)
            `
            )
            .eq('user_id', userId)
            .eq('word', normalizedWord)
            .single();

          if (existing) {
            const entry = rowToWordBankEntry(existing, normalizedWord);
            wordBankRef.current.set(normalizedWord, entry);
            notifyUpdate();
          }
          return;
        }

        // Auth session expired — redirect to /auth
        if (isAuthExpiredError(insertError)) {
          handleAuthExpired();
          return;
        }

        // Other Supabase insert failure — show 5-second error toast, retain previous status (Requirement 3.8)
        showToast(th.errors.addWordFailed, 'error', 5000);
        throw new Error(`Failed to add word: ${insertError.message}`);
      }

      const wordId = insertedWord.id;

      // Insert into word_progress table
      const { error: progressError } = await supabase
        .from('word_progress')
        .insert({
          user_id: userId,
          word_id: wordId,
          box: initialProgress.box,
          interval: initialProgress.interval,
          ease_factor: initialProgress.easeFactor,
          last_reviewed_at: initialProgress.lastReviewedAt.toISOString(),
          next_review_at: initialProgress.nextReviewAt.toISOString(),
          repetitions: 0,
        });

      if (progressError) {
        // Clean up: remove the word entry if progress insert fails
        await supabase.from('words').delete().eq('id', wordId);
        if (isAuthExpiredError(progressError)) {
          handleAuthExpired();
          return;
        }
        showToast(th.errors.addWordFailed, 'error', 5000);
        throw new Error(`Failed to create word progress: ${progressError.message}`);
      }

      // Update local cache immediately
      const entry: WordBankEntry = {
        id: wordId,
        word: normalizedWord,
        thai: null,
        partOfSpeech: null,
        nextReviewAt: initialProgress.nextReviewAt,
        lastReviewedAt: initialProgress.lastReviewedAt,
        box: initialProgress.box,
        interval: initialProgress.interval,
        easeFactor: initialProgress.easeFactor,
        repetitions: initialProgress.repetitions,
      };
      wordBankRef.current.set(normalizedWord, entry);

      // Remove from rejected set if it was there
      rejectedSetRef.current.delete(normalizedWord);

      notifyUpdate();

      // Fetch translation in background (non-blocking)
      fetchTranslationInBackground(wordId, normalizedWord, word);
    },
    [notifyUpdate, handleAuthExpired, showToast, fetchTranslationInBackground]
  );

  // ─── Helper: find entry by id ───────────────────────────────────────────────

  const findEntryById = useCallback(
    (wordId: string): { key: string; entry: WordBankEntry } | null => {
      let result: { key: string; entry: WordBankEntry } | null = null;
      wordBankRef.current.forEach((entry, key) => {
        if (entry.id === wordId) {
          result = { key, entry };
        }
      });
      return result;
    },
    []
  );

  // ─── removeWord ─────────────────────────────────────────────────────────────

  const removeWord = useCallback(
    async (wordId: string): Promise<void> => {
      const userId = userIdRef.current;
      if (!userId) {
        handleAuthExpired();
        return;
      }

      // Find the word entry in our cache by id
      const found = findEntryById(wordId);
      const wordKey = found?.key ?? null;

      // Delete from word_progress first (foreign key constraint)
      const { error: progressDeleteError } = await supabase
        .from('word_progress')
        .delete()
        .eq('word_id', wordId)
        .eq('user_id', userId);

      if (progressDeleteError) {
        if (isAuthExpiredError(progressDeleteError)) {
          handleAuthExpired();
          return;
        }
        showToast(th.errors.removeWordFailed, 'error', 5000);
        throw new Error(
          `Failed to delete word progress: ${progressDeleteError.message}`
        );
      }

      // Delete from words table
      const { error: wordDeleteError } = await supabase
        .from('words')
        .delete()
        .eq('id', wordId)
        .eq('user_id', userId);

      if (wordDeleteError) {
        if (isAuthExpiredError(wordDeleteError)) {
          handleAuthExpired();
          return;
        }
        showToast(th.errors.removeWordFailed, 'error', 5000);
        throw new Error(`Failed to delete word: ${wordDeleteError.message}`);
      }

      // Remove from local cache
      if (wordKey) {
        wordBankRef.current.delete(wordKey);
      }

      notifyUpdate();
    },
    [notifyUpdate, findEntryById, handleAuthExpired, showToast]
  );

  // ─── reviewWord ─────────────────────────────────────────────────────────────

  const reviewWord = useCallback(
    async (wordId: string, quality: number): Promise<void> => {
      const userId = userIdRef.current;
      if (!userId) {
        handleAuthExpired();
        return;
      }

      // Find the entry in cache
      const found = findEntryById(wordId);

      if (!found) {
        throw new Error('Word not found in cache');
      }

      const { key: wordKey, entry: currentEntry } = found;

      // Recalculate progress using SM-2 algorithm
      const newProgress = recalculateProgress(
        {
          box: currentEntry.box,
          interval: currentEntry.interval,
          easeFactor: currentEntry.easeFactor,
          repetitions: currentEntry.repetitions,
        },
        quality
      );

      const now = new Date();

      // Update word_progress in Supabase
      const { error: updateError } = await supabase
        .from('word_progress')
        .update({
          box: newProgress.box,
          interval: newProgress.interval,
          ease_factor: newProgress.easeFactor,
          repetitions: newProgress.repetitions,
          last_reviewed_at: now.toISOString(),
          next_review_at: newProgress.nextReviewAt.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('word_id', wordId)
        .eq('user_id', userId);

      if (updateError) {
        if (isAuthExpiredError(updateError)) {
          handleAuthExpired();
          return;
        }
        showToast(th.errors.reviewFailed, 'error', 5000);
        throw new Error(`Failed to update word progress: ${updateError.message}`);
      }

      // Update local cache
      const updatedEntry: WordBankEntry = {
        ...currentEntry,
        box: newProgress.box,
        interval: newProgress.interval,
        easeFactor: newProgress.easeFactor,
        repetitions: newProgress.repetitions,
        nextReviewAt: newProgress.nextReviewAt,
        lastReviewedAt: now,
      };
      wordBankRef.current.set(wordKey, updatedEntry);

      notifyUpdate();
    },
    [notifyUpdate, findEntryById, handleAuthExpired, showToast]
  );

  return {
    words,
    getStatus,
    getEntry,
    addWord,
    removeWord,
    reviewWord,
    isLoading,
    error,
  };
}
