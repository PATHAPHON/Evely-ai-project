'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/shared/supabase/supabaseClient';
import {
  deriveWordStatus,
  type WordStatus,
  type WordBankEntry,
} from '@/shared/utils/wordStatusDerivation';
import { WordProgress } from '@/shared/utils/spacedRepetition';
import { translateBatchToThai } from '@/shared/utils/translateToThai';
import { isAuthExpiredError, rowToWordBankEntry } from '@/shared/utils/wordBankRow';
import { useToast } from '@/shared/components/Toast';
import { th } from '@/shared/utils/strings';

// Shared `words`-joined-`word_progress` select used by the initial load and the
// duplicate-recovery fetch, so the two never drift apart.
const WORD_WITH_PROGRESS_SELECT = `
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
`;

/** Postgres unique-violation code — a word already exists for this user. */
const PG_UNIQUE_VIOLATION = '23505';
/** Match the server-side /api/word-detail timeout. */
const TRANSLATION_TIMEOUT_MS = 30_000;
const TOAST_DURATION_MS = 5000;

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
  markAsForgotten: (word: string) => Promise<void>;
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
          .select(WORD_WITH_PROGRESS_SELECT)
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
          showToast(th.errors.wordStatusUnavailable, 'warning', TOAST_DURATION_MS);
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

  // Shared handling for a failed Supabase mutation: on an expired session it
  // redirects and returns (the caller should then `return`); on any other error
  // it toasts and throws, so callers never fall through to their success path.
  const raiseMutationError = useCallback(
    (error: { message: string; code?: string }, toastMessage: string, context: string): void => {
      if (isAuthExpiredError(error)) {
        handleAuthExpired();
        return;
      }
      showToast(toastMessage, 'error', TOAST_DURATION_MS);
      throw new Error(`${context}: ${error.message}`);
    },
    [handleAuthExpired, showToast],
  );

  // ─── Fetch translation in background ─────────────────────────────────────

  const fetchTranslationInBackground = useCallback(
    async (wordId: string, normalizedWord: string, originalWord: string) => {
      const userId = userIdRef.current;
      if (!userId) return;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);

        const res = await fetch('/api/word-detail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

      const initialProgress = WordProgress.createInitial();

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
        if (insertError.code === PG_UNIQUE_VIOLATION) {
          // Word already exists in DB — fetch existing and update cache
          const { data: existing } = await supabase
            .from('words')
            .select(WORD_WITH_PROGRESS_SELECT)
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

        // Auth expired → redirect; otherwise toast + throw, retaining previous
        // status (Requirement 3.8).
        raiseMutationError(insertError, th.errors.addWordFailed, 'Failed to add word');
        return;
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
          last_reviewed_at: initialProgress.lastReviewedAt!.toISOString(),
          next_review_at: initialProgress.nextReviewAt.toISOString(),
          repetitions: 0,
        });

      if (progressError) {
        // Clean up: remove the word entry if progress insert fails
        await supabase.from('words').delete().eq('id', wordId);
        raiseMutationError(progressError, th.errors.addWordFailed, 'Failed to create word progress');
        return;
      }

      // Update local cache immediately
      const entry: WordBankEntry = {
        id: wordId,
        word: normalizedWord,
        thai: null,
        partOfSpeech: null,
        ...initialProgress,
      };
      wordBankRef.current.set(normalizedWord, entry);

      // Remove from rejected set if it was there
      rejectedSetRef.current.delete(normalizedWord);

      notifyUpdate();

      // Fetch translation in background (non-blocking)
      fetchTranslationInBackground(wordId, normalizedWord, word);
    },
    [notifyUpdate, handleAuthExpired, raiseMutationError, fetchTranslationInBackground]
  );

  // ─── Helper: find entry by id ───────────────────────────────────────────────

  // ponytail: O(n) scan over the Map, keyed by word not id. A word bank is a few
  // hundred entries and this only runs on remove/review taps — a second id→word
  // index would just be more state to keep in sync. Add one if banks ever get large.
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
        raiseMutationError(progressDeleteError, th.errors.removeWordFailed, 'Failed to delete word progress');
        return;
      }

      // Delete from words table
      const { error: wordDeleteError } = await supabase
        .from('words')
        .delete()
        .eq('id', wordId)
        .eq('user_id', userId);

      if (wordDeleteError) {
        raiseMutationError(wordDeleteError, th.errors.removeWordFailed, 'Failed to delete word');
        return;
      }

      // Remove from local cache
      if (wordKey) {
        wordBankRef.current.delete(wordKey);
      }

      notifyUpdate();
    },
    [notifyUpdate, findEntryById, handleAuthExpired, raiseMutationError]
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
      const newProgress = new WordProgress(
        currentEntry.box,
        currentEntry.interval,
        currentEntry.easeFactor,
        currentEntry.repetitions,
        currentEntry.nextReviewAt,
        currentEntry.lastReviewedAt,
      ).review(quality);

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
        raiseMutationError(updateError, th.errors.reviewFailed, 'Failed to update word progress');
        return;
      }

      // Update local cache
      const updatedEntry: WordBankEntry = {
        ...currentEntry,
        ...newProgress,
        lastReviewedAt: now,
      };
      wordBankRef.current.set(wordKey, updatedEntry);

      notifyUpdate();
    },
    [notifyUpdate, findEntryById, handleAuthExpired, raiseMutationError]
  );

  // ─── markAsForgotten ────────────────────────────────────────────────────────

  const markAsForgotten = useCallback(
    async (word: string): Promise<void> => {
      const userId = userIdRef.current;
      if (!userId) {
        handleAuthExpired();
        return;
      }

      const normalizedWord = word.toLowerCase().trim();
      const entry = wordBankRef.current.get(normalizedWord);
      if (!entry) return;

      const now = new Date();

      // Reset progress to day 1 and set next_review_at to now so it's due immediately
      const { error: updateError } = await supabase
        .from('word_progress')
        .update({
          box: 1,
          interval: 1,
          repetitions: 0,
          next_review_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('word_id', entry.id)
        .eq('user_id', userId);

      if (updateError) {
        raiseMutationError(updateError, th.errors.reviewFailed, 'Failed to update word progress');
        return;
      }

      // Update local cache
      const updatedEntry: WordBankEntry = {
        ...entry,
        box: 1,
        interval: 1,
        repetitions: 0,
        nextReviewAt: now,
      };
      wordBankRef.current.set(normalizedWord, updatedEntry);

      notifyUpdate();
    },
    [notifyUpdate, handleAuthExpired, raiseMutationError]
  );

  return {
    words,
    getStatus,
    getEntry,
    addWord,
    removeWord,
    reviewWord,
    markAsForgotten,
    isLoading,
    error,
  };
}
