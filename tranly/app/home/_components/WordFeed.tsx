"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ReloadOutlined } from "@ant-design/icons";
import { getCustomAIHeaders } from "@/app/_lib/getCustomAIHeaders";
import { useActiveLanguage } from "@/app/_lib/ActiveLanguageContext";
import type { FeedWordRecord } from "../_lib/types";
import { useFeedStorage } from "../_lib/useFeedStorage";
import { useExclusionList } from "../_lib/useExclusionList";
import { useWordStorage } from "@/app/learn/_lib/useWordStorage";
import WordCard from "./WordCard";
import Mascot from "@/app/chat/_components/Mascot";

/**
 * Render the word's native script onto a canvas and return a JPEG Blob — used as
 * a placeholder image when a feed word is bookmarked into the Word page,
 * since feed words don't have an associated photo.
 */
async function generateWordPlaceholderBlob(text: string): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#FFF0F6";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 96px 'Apple SD Gothic Neo', 'Noto Sans KR', 'Noto Sans JP', 'Noto Sans SC', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, size / 2, size / 2 + 8);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
  });
}

/**
 * Gets the primary display word from a FeedWordRecord based on its language.
 */
function getPrimaryWord(word: FeedWordRecord): string {
  if (word.korean) return word.korean;
  if (word.kanji) return word.kanji;
  if (word.hanzi) return word.hanzi;
  if (word.word) return word.word;
  return '';
}

/**
 * Shows a single word card at a time for the active language.
 * Swiping up (TikTok-style) removes the current word from storage
 * and fetches the next one, so storage holds at most one feed word
 * at any time.
 */
export default function WordFeed() {
  const { activeLanguage } = useActiveLanguage();
  const [word, setWord] = useState<FeedWordRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vertical drag offset of the current card (negative = swiping up).
  const [dragY, setDragY] = useState(0);
  // When true, the card animates out before the next one slides in.
  const [exiting, setExiting] = useState(false);

  const touchStartY = useRef<number | null>(null);
  const wheelLockRef = useRef(false);

  const { loadTodayWords, saveWords, toggleBookmark, removeWord } =
    useFeedStorage();
  const { getExclusionList } = useExclusionList();
  const { save: saveLearnWord, list: listLearnWords } = useWordStorage();

  const fetchOne = useCallback(async (): Promise<FeedWordRecord> => {
    const exclusionList = await getExclusionList();
    const response = await fetch("/api/feed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getCustomAIHeaders(),
      },
      body: JSON.stringify({ language: activeLanguage, excludeWords: exclusionList, count: 1 }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (errorData?.error?.message) {
        throw new Error(errorData.error.message);
      }
      throw new Error("Failed to generate word. Please try again.");
    }

    const data = await response.json();
    await saveWords(data.words, activeLanguage);
    const stored = await loadTodayWords(activeLanguage);
    const latest = stored[stored.length - 1];
    if (!latest) throw new Error("ไม่สามารถสร้างคำศัพท์ได้ กรุณาลองอีกครั้ง");
    return latest;
  }, [getExclusionList, saveWords, loadTodayWords, activeLanguage]);

  // Initial load and re-load on language switch: use existing stored word, or fetch one.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const stored = await loadTodayWords(activeLanguage);
        if (stored.length > 0) {
          const keep = stored[stored.length - 1];
          for (const w of stored.slice(0, -1)) {
            await removeWord(w.id);
          }
          if (!cancelled) setWord(keep);
        } else {
          const next = await fetchOne();
          if (!cancelled) setWord(next);
        }
      } catch (err) {
        if (!cancelled) {
          // On error, retain existing word (don't clear it) and show error message
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load word. Please try again."
          );
          // If we already have a word displayed, keep it visible
          // Only set word to null if we had no word before
          setWord((prev) => prev);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [fetchOne, loadTodayWords, removeWord, activeLanguage]);

  const handleToggleBookmark = useCallback(
    async (wordId: string) => {
      const wasBookmarked = word?.bookmarked ?? false;
      await toggleBookmark(wordId);
      setWord((prev) =>
        prev && prev.id === wordId
          ? { ...prev, bookmarked: !prev.bookmarked }
          : prev
      );

      // On bookmark ON: also persist to the Word page storage so the user
      // can find it under /learn. Skip if already saved.
      if (!wasBookmarked && word) {
        try {
          const primaryWord = getPrimaryWord(word);
          const existing = await listLearnWords();
          if (existing.some((w) => w.korean === primaryWord)) return;
          const blob = await generateWordPlaceholderBlob(primaryWord);
          if (!blob) return;
          await saveLearnWord(blob, {
            label: word.thai,
            korean: word.korean || primaryWord,
            reading: word.reading || '',
            romanization: word.romanization || '',
            english: word.english || '',
          });
        } catch {
          // non-blocking — bookmark toggle already succeeded
        }
      }
    },
    [word, toggleBookmark, listLearnWords, saveLearnWord]
  );

  const advance = useCallback(async () => {
    if (!word || advancing) return;
    setAdvancing(true);
    setExiting(true);
    setError(null);
    try {
      await removeWord(word.id);
      const next = await fetchOne();
      // Reset drag below the screen so the new card slides up into view.
      setDragY(0);
      setExiting(false);
      setWord(next);
    } catch (err) {
      // On error, retain existing entries and show error message (Req 3.6)
      setError(
        err instanceof Error
          ? err.message
          : "ไม่สามารถสร้างคำศัพท์ได้ กรุณาลองอีกครั้ง"
      );
      // Don't clear the word — try to reload from storage
      try {
        const stored = await loadTodayWords(activeLanguage);
        if (stored.length > 0) {
          setWord(stored[stored.length - 1]);
        } else {
          setWord(null);
        }
      } catch {
        setWord(null);
      }
      setExiting(false);
      setDragY(0);
    } finally {
      setAdvancing(false);
    }
  }, [word, advancing, removeWord, fetchOne, loadTodayWords, activeLanguage]);

  // Touch handlers — track finger drag, commit advance if swiped past threshold.
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (advancing || exiting) return;
      touchStartY.current = e.touches[0].clientY;
    },
    [advancing, exiting]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null || advancing || exiting) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      // Only follow upward drags; ignore downward drags (no previous word).
      if (delta < 0) setDragY(delta);
    },
    [advancing, exiting]
  );

  const handleTouchEnd = useCallback(() => {
    if (touchStartY.current === null) return;
    touchStartY.current = null;
    const threshold = 80;
    if (dragY < -threshold) {
      // Commit: animate fully off-screen, then advance.
      setExiting(true);
      setDragY(-window.innerHeight);
      void advance();
    } else {
      // Snap back.
      setDragY(0);
    }
  }, [dragY, advance]);

  // Wheel handler for desktop — wheel down = next word.
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (advancing || exiting || wheelLockRef.current) return;
      if (e.deltaY > 30) {
        wheelLockRef.current = true;
        setTimeout(() => {
          wheelLockRef.current = false;
        }, 800);
        setExiting(true);
        setDragY(-window.innerHeight);
        void advance();
      }
    },
    [advancing, exiting, advance]
  );

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <Mascot state="thinking" size={64} />
        <div className="flex items-center gap-1.5">
          <span className="loading-dot h-2 w-2 rounded-full bg-accent-blue" style={{ animationDelay: "0ms" }} />
          <span className="loading-dot h-2 w-2 rounded-full bg-accent-blue" style={{ animationDelay: "200ms" }} />
          <span className="loading-dot h-2 w-2 rounded-full bg-accent-blue" style={{ animationDelay: "400ms" }} />
        </div>
      </div>
    );
  }

  if (error && !word) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <Mascot size={72} />
        <p className="text-base text-accent-red font-bold">{error}</p>
        <button
          type="button"
          onClick={advance}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-white dark:bg-[#2d2d44] font-bold text-sm text-black dark:text-white shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
        >
          <ReloadOutlined />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-1 flex-col px-4 overflow-hidden touch-pan-x items-center justify-center min-h-0"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {word && (
        <div
          key={word.id}
          className="will-change-transform w-full max-w-md"
          style={{
            transform: `translateY(${dragY}px)`,
            transition:
              touchStartY.current === null
                ? "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)"
                : "none",
            opacity: exiting ? 0 : 1,
          }}
        >
          <WordCard word={word} onToggleBookmark={handleToggleBookmark} />
          <p className="text-center text-xs text-text-meta font-bold mt-4 select-none">
            ↑ Swipe up for next word
          </p>
        </div>
      )}

      {advancing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none bg-background/80 backdrop-blur-sm">
          <Mascot state="thinking" size={64} />
          <div className="flex items-center gap-1.5">
            <span className="loading-dot h-2 w-2 rounded-full bg-accent-blue" style={{ animationDelay: "0ms" }} />
            <span className="loading-dot h-2 w-2 rounded-full bg-accent-blue" style={{ animationDelay: "200ms" }} />
            <span className="loading-dot h-2 w-2 rounded-full bg-accent-blue" style={{ animationDelay: "400ms" }} />
          </div>
          <p className="text-sm text-gray-600 dark:text-white/60 font-medium">Loading next word...</p>
        </div>
      )}

      {error && word && (
        <div
          className="mt-4 p-4 rounded-2xl text-center border-3 border-accent-red bg-[#FFF0F6] dark:bg-[#3d2d44]"
        >
          <p className="text-sm text-accent-red font-bold">{error}</p>
        </div>
      )}
    </div>
  );
}
