'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import { getCustomAIHeaders } from '@/app/_lib/getCustomAIHeaders';
import { supabase } from '@/app/_lib/supabaseClient';
import type { TargetLanguage } from '@/app/_lib/wordTypes';
import type { FeedWord, FeedWordRecord } from './types';
import { useFeedStorage } from './useFeedStorage';
import { useRejectedStorage } from './useRejectedStorage';
import { useExclusionList } from './useExclusionList';
import { getPrimaryWord, getTodayDateKey, shuffle } from './feedHelpers';

/** How long the card flies off-screen before the next one is dequeued (ms). */
export const SWIPE_OUT_MS = 320;

export interface UseFeedQueueReturn {
  word: FeedWordRecord | null;
  wordsQueue: FeedWordRecord[];
  historyStack: FeedWordRecord[];
  loading: boolean;
  advancing: boolean;
  isFetchingMore: boolean;
  error: string | null;
  advance: () => Promise<void>;
  rewind: () => Promise<void>;
  retry: () => Promise<void>;
  saveRejected: (word: FeedWordRecord, language: TargetLanguage) => Promise<void>;
}

/**
 * Owns the feed word queue: initial load, background prefetch when running low,
 * advancing (dequeue + history), and rewind (re-insert the last skipped word).
 * Visual drag/exit state lives in useSwipeGesture, not here.
 */
export function useFeedQueue({
  activeLanguage,
  messageApi,
}: {
  activeLanguage: TargetLanguage;
  messageApi: MessageInstance;
}): UseFeedQueueReturn {
  const [wordsQueue, setWordsQueue] = useState<FeedWordRecord[]>([]);
  const word = wordsQueue[0] || null;
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const prefetchingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyStack, setHistoryStack] = useState<FeedWordRecord[]>([]);

  const { loadTodayWords, saveWords, removeWord } = useFeedStorage();
  const { saveRejected, loadRejected, removeRejected } = useRejectedStorage();
  const { getExclusionList } = useExclusionList();

  const fetchBatch = useCallback(async (count: number): Promise<FeedWordRecord[]> => {
    const exclusionList = await getExclusionList(activeLanguage);
    const apiTopic = undefined;

    const response = await fetch("/api/feed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getCustomAIHeaders(),
      },
      body: JSON.stringify({
        language: activeLanguage,
        excludeWords: exclusionList,
        count: count,
        topic: apiTopic
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (errorData?.error?.message) {
        throw new Error(errorData.error.message);
      }
      throw new Error("Failed to generate words. Please try again.");
    }

    const data = await response.json();
    // saveWords returns void — load only the freshly saved words by tracking IDs
    const freshWords: FeedWord[] = data.words;
    await saveWords(freshWords, activeLanguage);
    // Mix freshly fetched words with all previously rejected words, shuffled.
    const stored = await loadTodayWords(activeLanguage);
    const rejected = await loadRejected(activeLanguage);
    return shuffle([...stored, ...rejected]);
  }, [getExclusionList, saveWords, loadTodayWords, loadRejected, activeLanguage]);

  const retry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let stored = await loadTodayWords(activeLanguage);
      if (stored.length === 0) {
        stored = await fetchBatch(50);
      }
      setWordsQueue(stored);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load words. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [fetchBatch, loadTodayWords, activeLanguage]);

  // Initial load and re-load on language switch: use existing stored words, or fetch a batch of 50.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        let stored = await loadTodayWords(activeLanguage);
        if (stored.length === 0) {
          stored = await fetchBatch(50);
        }
        if (!cancelled) setWordsQueue(stored);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load words. Please try again."
          );
          setWordsQueue([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [fetchBatch, loadTodayWords, activeLanguage]);

  const advance = useCallback(async () => {
    if (wordsQueue.length === 0 || advancing) return;
    const currentWord = wordsQueue[0];
    if (!currentWord) return;

    setAdvancing(true);
    setError(null);

    // Let the current card fly off-screen (CSS transition) before we swap the
    // next one in — otherwise React replaces the card instantly and the swipe
    // animation is never visible.
    await new Promise((resolve) => setTimeout(resolve, SWIPE_OUT_MS));

    try {
      // Save current word to history stack for Rewind
      setHistoryStack((prev) => [...prev, currentWord]);

      // Dequeue locally immediately for instant transition!
      setWordsQueue((prev) => prev.slice(1));

      // Remove from DB in the background
      void removeWord(currentWord.id);

      // Check if we need to prefetch more words
      const remainingCount = wordsQueue.length - 1;
      if (remainingCount <= 5 && !prefetchingRef.current) {
        prefetchingRef.current = true;
        setIsFetchingMore(true);
        fetchBatch(50)
          .then((nextBatch) => {
            setWordsQueue((prev) => {
              const existingIds = new Set(prev.map((w) => w.id));
              const newWords = nextBatch.filter((w) => !existingIds.has(w.id));
              return [...prev, ...newWords];
            });
          })
          .catch((err) => {
            console.error("Background prefetch failed:", err);
            setError(
              err instanceof Error ? err.message : "ไม่สามารถโหลดคำศัพท์เพิ่มได้"
            );
          })
          .finally(() => {
            prefetchingRef.current = false;
            setIsFetchingMore(false);
          });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "ไม่สามารถสร้างคำศัพท์ได้ กรุณาลองอีกครั้ง"
      );
    } finally {
      setAdvancing(false);
    }
  }, [wordsQueue, advancing, removeWord, fetchBatch]);

  const rewind = useCallback(async () => {
    if (historyStack.length === 0 || advancing) return;
    setAdvancing(true);
    setError(null);
    try {
      const prevWord = historyStack[historyStack.length - 1];

      // Re-insert skipped card back into feed_words
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) throw new Error("User not authenticated");

      const todayKey = getTodayDateKey();
      const { error: dbError } = await supabase
        .from('feed_words')
        .insert({
          id: prevWord.id,
          user_id: userId,
          language: prevWord.language,
          generated_date: todayKey,
          bookmarked: prevWord.bookmarked,
          thai: prevWord.thai,
          part_of_speech: prevWord.partOfSpeech,
          image_url: prevWord.imageUrls ? JSON.stringify(prevWord.imageUrls) : prevWord.imageUrl,
          created_at: new Date().toISOString(),
          word: prevWord.word,
          ipa: prevWord.ipa,
        });

      if (dbError) throw dbError;

      // If the word had been rejected on the way out, take it back out of the pool.
      void removeRejected(prevWord.language, getPrimaryWord(prevWord));

      // Pop from stack and set as current
      setHistoryStack((prev) => prev.slice(0, -1));
      setWordsQueue((prev) => [prevWord, ...prev]);
    } catch (err) {
      console.error("Rewind failed:", err);
      setTimeout(() => {
        messageApi.error("ไม่สามารถย้อนกลับการปัดได้");
      }, 0);
    } finally {
      setAdvancing(false);
    }
  }, [historyStack, advancing, messageApi, removeRejected]);

  return {
    word,
    wordsQueue,
    historyStack,
    loading,
    advancing,
    isFetchingMore,
    error,
    advance,
    rewind,
    retry,
    saveRejected,
  };
}
