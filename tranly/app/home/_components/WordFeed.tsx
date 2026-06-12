"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReloadOutlined,
  UndoOutlined,
  CloseOutlined,
  HeartFilled,
  SoundOutlined,
  BookOutlined
} from "@ant-design/icons";
import { getCustomAIHeaders } from "@/app/_lib/getCustomAIHeaders";
import { useActiveLanguage } from "@/app/_lib/ActiveLanguageContext";

import { useLanguagePreference } from "@/app/_lib/useLanguagePreference";
import { message as antdMessage } from "antd";
import type { FeedWordRecord, FeedWord } from "../_lib/types";
import { useFeedStorage } from "../_lib/useFeedStorage";
import { useRejectedStorage } from "../_lib/useRejectedStorage";
import { useExclusionList } from "../_lib/useExclusionList";
import { useWordStorage } from "@/app/learn/_lib/useWordStorage";
import WordCard from "./WordCard";
import { useRouter } from "next/navigation";
import { DETAIL_WORD_STORAGE_KEY } from "../_lib/types";
import Mascot from "@/app/chat/_components/Mascot";
import { useTTS } from "@/app/chat/_lib/useTTS";
import type { SpeechLang } from "@/app/chat/_lib/types";
import { supabase } from "@/app/_lib/supabaseClient";
import type { TargetLanguage } from "@/app/_lib/wordTypes";
import { trimTransparentPixels, resizeImage } from "@/app/_lib/imageUtils";
import {
  generateWordPlaceholderBlob,
  getPrimaryWord,
  getTodayDateKey,
  shuffle,
  computeCardTransform,
} from "../_lib/feedHelpers";

const SPEECH_LANG_BY_LANGUAGE: Record<TargetLanguage, SpeechLang> = {
  english: 'en-US',
};

/** How long the card flies off-screen before the next one is dequeued (ms). */
const SWIPE_OUT_MS = 320;

/**
 * Shows a single word card at a time for the active language.
 * Swiping up (TikTok-style) removes the current word from storage
 * and fetches the next one, so storage holds at most one feed word
 * at any time.
 * Redesigned with Tinder-style layout, rewind history, and capsules topbar.
 */
export default function WordFeed() {
  const { activeLanguage } = useActiveLanguage();
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';

  const [wordsQueue, setWordsQueue] = useState<FeedWordRecord[]>([]);
  const word = wordsQueue[0] || null;
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const prefetchingRef = useRef(false);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const openWordDetail = useCallback(() => {
    if (!word) return;
    try {
      sessionStorage.setItem(
        DETAIL_WORD_STORAGE_KEY,
        JSON.stringify({ ...word, imageBlob: null })
      );
    } catch {
      return;
    }
    router.push("/word-detail");
  }, [word, router]);

  // Reset active image index when word changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveImageIndex(0);
    }, 0);
    return () => clearTimeout(timer);
  }, [word?.id]);

  // Rewind history stack
  const [historyStack, setHistoryStack] = useState<FeedWordRecord[]>([]);

  // Drag offsets of the current card
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // When true, the card animates out before the next one slides in.
  const [exiting, setExiting] = useState(false);
  const [exitingDirection, setExitingDirection] = useState<'left' | 'right' | null>(null);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);
  const mouseStartY = useRef<number | null>(null);

  const { loadTodayWords, saveWords, removeWord } = useFeedStorage();
  const { saveRejected, loadRejected, removeRejected } = useRejectedStorage();
  const { getExclusionList } = useExclusionList();
  const { save: saveLearnWord, list: listLearnWords } = useWordStorage();
  const [messageApi, contextHolder] = antdMessage.useMessage();

  const speechLang = word ? SPEECH_LANG_BY_LANGUAGE[word.language] : 'ko-KR';
  const { speak } = useTTS(speechLang);

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

  const handleRetry = useCallback(async () => {
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

  // "รับ" a word: persist it to the Word page storage (/learn) as a sticker, and
  // drop it from the rejected pool in case it had been rejected before.
  const acceptWord = useCallback(
    async (target: FeedWordRecord) => {
      const primaryWord = getPrimaryWord(target);
      void removeRejected(target.language, primaryWord);

      const key = 'sticker-loading';
      setTimeout(() => {
        messageApi.open({
          key,
          type: 'loading',
          content: 'กำลังแปลงเป็นสติกเกอร์...',
          duration: 0,
        });
      }, 0);
      try {
        const existing = await listLearnWords();
        if (existing.some((w) => w.word === primaryWord)) {
          setTimeout(() => {
            messageApi.destroy(key);
          }, 0);
          return;
        }

        let blob: Blob | null = null;
        const coverUrl = (target.imageUrls && target.imageUrls.length > 0)
          ? (target.imageUrls[activeImageIndex] || target.imageUrls[0])
          : target.imageUrl;

        if (coverUrl) {
          try {
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(coverUrl)}`;
            const res = await fetch(proxyUrl);
            if (res.ok) {
              blob = await res.blob();
            }
          } catch (err) {
            console.error("Failed to fetch image via proxy:", err);
          }
        }

        // Fallback to text placeholder if image fetching fails or no image is set
        if (!blob) {
          blob = await generateWordPlaceholderBlob(primaryWord);
        }

        if (blob) {
          try {
            const resizedBlob = await resizeImage(blob, 600);

            try {
              // @ts-ignore
              const { env } = await import('onnxruntime-web');
              env.logLevel = 'error';
            } catch (e) {
              console.warn("Failed to set ONNX Runtime log level:", e);
            }

            const { removeBackground } = await import('@imgly/background-removal');
            const processed = await removeBackground(resizedBlob, {
              device: 'gpu',
              model: 'isnet',
              debug: false,
            });
            const trimmed = await trimTransparentPixels(processed);
            blob = trimmed;
          } catch (err) {
            console.error("Failed to remove background for feed word:", err);
          }
        }

        if (!blob) {
          setTimeout(() => {
            messageApi.destroy(key);
          }, 0);
          return;
        }

        await saveLearnWord(blob, {
          label: target.thai,
          word: target.word || primaryWord,
          ipa: target.ipa || '',
          english: target.word || '',
          partOfSpeech: target.partOfSpeech || '',
        });
        setTimeout(() => {
          messageApi.open({
            key,
            type: 'success',
            content: 'สร้างสติกเกอร์และบันทึกในสมุดแล้ว! ✨',
            duration: 3,
          });
        }, 0);
      } catch (err) {
        setTimeout(() => {
          messageApi.destroy(key);
        }, 0);
        console.error("Accept word save failed:", err);
      }
    },
    [removeRejected, listLearnWords, saveLearnWord, messageApi, activeImageIndex]
  );

  const advance = useCallback(async () => {
    if (wordsQueue.length === 0 || advancing) return;
    const currentWord = wordsQueue[0];
    if (!currentWord) return;


    setAdvancing(true);
    setExiting(true);
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

      // Reset drag parameters for the new card
      setDragX(0);
      setDragY(0);
      setExitingDirection(null);
      setExiting(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "ไม่สามารถสร้างคำศัพท์ได้ กรุณาลองอีกครั้ง"
      );
      setExiting(false);
      setDragX(0);
      setDragY(0);
      setExitingDirection(null);
    } finally {
      setAdvancing(false);
    }
  }, [wordsQueue, advancing, removeWord, fetchBatch, isThai, messageApi]);

  // Touch and mouse dragging mechanics
  const handleDragStart = useCallback((clientX: number, clientY: number, isMouse: boolean, target: EventTarget) => {
    if (advancing || exiting) return;
    
    // Ignore drags that start on interactive elements like buttons.
    // (The image carousel itself IS draggable so the card follows the finger.)
    const isInteractive = (target as HTMLElement).closest('button') ||
                          (target as HTMLElement).closest('a') ||
                          (target as HTMLElement).closest('input');
    if (isInteractive) return;

    setIsDragging(true);
    setExitingDirection(null);
    if (isMouse) {
      mouseStartX.current = clientX;
      mouseStartY.current = clientY;
    } else {
      touchStartX.current = clientX;
      touchStartY.current = clientY;
    }
  }, [advancing, exiting]);

  const handleDragMove = useCallback((clientX: number, clientY: number, isMouse: boolean) => {
    const startX = isMouse ? mouseStartX.current : touchStartX.current;
    const startY = isMouse ? mouseStartY.current : touchStartY.current;
    if (startX === null || startY === null) return;

    const dx = clientX - startX;
    const dy = clientY - startY;

    setDragX(dx);
    setDragY(dy);
  }, []);

  const handleDragEnd = useCallback(async () => {
    touchStartX.current = null;
    touchStartY.current = null;
    mouseStartX.current = null;
    mouseStartY.current = null;
    setIsDragging(false);

    const threshold = 100;
    const absX = Math.abs(dragX);
    const absY = Math.abs(dragY);

    if (absX > absY && absX > threshold) {
      if (dragX > 0) {
        // Swipe Right: Accept (save to Word page) and Next.
        // Run the (slow) save in the background so the card flies off instantly.
        setExitingDirection('right');
        setExiting(true);
        if (word) {
          void acceptWord(word);
        }
        await advance();
      } else {
        // Swipe Left: Reject (store for reuse) and Next
        setExitingDirection('left');
        setExiting(true);
        if (word) {
          void saveRejected(word, word.language);
        }
        await advance();
      }
    } else {
      // Snap back (vertical swipes no longer advance)
      setDragX(0);
      setDragY(0);
      setExitingDirection(null);
    }
  }, [dragX, dragY, word, acceptWord, saveRejected, advance]);

  // Touch handlers — only the *start* lives on the element so we can read the
  // initial target/coords. move & end are bound to `window` (see effect below)
  // with passive:false so we can preventDefault and stop the page scrolling /
  // cancelling the touch mid-drag (which is why mobile dragging failed before).
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY, false, e.target);
  }, [handleDragStart]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    handleDragStart(e.clientX, e.clientY, true, e.target);
  }, [handleDragStart]);

  // Handle window-level move & end for BOTH mouse and touch while dragging.
  // Binding to window (instead of the element) keeps the drag alive even when
  // the finger/cursor leaves the card, and the non-passive touchmove lets us
  // preventDefault so the page doesn't scroll and abort the gesture on mobile.
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY, true);
    };

    const handleWindowMouseUp = () => {
      void handleDragEnd();
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      // Stop the browser from scrolling/zooming so the card follows the finger.
      e.preventDefault();
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY, false);
    };

    const handleWindowTouchEnd = () => {
      void handleDragEnd();
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    window.addEventListener("touchmove", handleWindowTouchMove, { passive: false });
    window.addEventListener("touchend", handleWindowTouchEnd);
    window.addEventListener("touchcancel", handleWindowTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
      window.removeEventListener("touchmove", handleWindowTouchMove);
      window.removeEventListener("touchend", handleWindowTouchEnd);
      window.removeEventListener("touchcancel", handleWindowTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Tinder Action Button Press Handlers
  const handleRewind = useCallback(async () => {
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
      
      // Reset animations
      setDragX(0);
      setDragY(0);
      setExitingDirection(null);
      setExiting(false);
    } catch (err) {
      console.error("Rewind failed:", err);
      setTimeout(() => {
        messageApi.error("ไม่สามารถย้อนกลับการปัดได้");
      }, 0);
    } finally {
      setAdvancing(false);
    }
  }, [historyStack, advancing, messageApi, removeRejected]);

  const handleSkipPress = useCallback(async () => {
    if (advancing || exiting || !word) return;
    setExitingDirection('left');
    setExiting(true);
    void saveRejected(word, word.language);
    await advance();
  }, [advance, advancing, exiting, word, saveRejected]);

  const handleLikePress = useCallback(async () => {
    if (advancing || exiting || !word) return;
    setExitingDirection('right');
    setExiting(true);
    void acceptWord(word);
    await advance();
  }, [advance, advancing, exiting, word, acceptWord]);

  const handleTTSPress = useCallback(() => {
    if (!word) return;
    const primaryWord = getPrimaryWord(word);
    if (primaryWord) speak(primaryWord);
  }, [word, speak]);

  const isQueueEmptyAndLoading = wordsQueue.length === 0 && isFetchingMore;

  if (loading || isQueueEmptyAndLoading) {
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
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-white dark:bg-[#2d2d44] font-bold text-sm text-black dark:text-white shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
        >
          <ReloadOutlined />
          Try again
        </button>
      </div>
    );
  }

  // Queue is empty after loading finished with no error: the curated word pool
  // is exhausted (every word already learned or rejected). Show a completion
  // state instead of recycling duplicates.
  if (!word) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <Mascot state="happy" size={72} />
        <p className="text-lg font-bold text-black dark:text-white">เรียนครบทุกคำแล้ว 🎉</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          คุณเรียนคำศัพท์ทั้งหมดในคลังแล้ว เยี่ยมมาก!
        </p>
      </div>
    );
  }

  // Dynamic card transforms
  const transformStyle = computeCardTransform({
    isDragging,
    exiting,
    exitingDirection,
    dragX,
    dragY,
  });

  return (
    <div
      className="relative flex flex-1 flex-col px-4 overflow-hidden items-center justify-center min-h-0 w-full"
    >
      {contextHolder}
      <style>{`
        @keyframes cardEntrance {
          0% {
            opacity: 0;
            transform: translateY(40px) scale(0.9) rotate(2deg);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0deg);
          }
        }
        .animate-card-enter {
          animation: cardEntrance 450ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes gemsPop {
          0% { transform: translate(-50%, 0) scale(0.7); opacity: 0; }
          20% { transform: translate(-50%, -20px) scale(1.2); opacity: 1; }
          80% { transform: translate(-50%, -20px) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -50px) scale(0.8); opacity: 0; }
        }
        .gems-toast {
          animation: gemsPop 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>



      {word && (
        <div
          key={word.id}
          className="will-change-transform w-full max-w-md cursor-grab active:cursor-grabbing select-none relative touch-none"
          onTouchStart={handleTouchStart}
          onMouseDown={handleMouseDown}
          style={{
            transform: transformStyle,
            transition:
              isDragging
                ? "none"
                : "transform 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 300ms ease",
            opacity: exiting ? 0 : 1,
          }}
        >
          {/* Inner wrapper plays the entrance animation. It must be a SEPARATE
              element from the dragged card above: a CSS animation with
              `forwards` fill pins `transform`, which would otherwise override
              the inline drag transform and freeze the card in place. */}
          <div className="animate-card-enter relative w-full">
          {/* Swipe Badges Overlay */}
          {dragX > 20 && (
            <div 
              className="absolute top-6 left-6 z-30 border-3 border-black bg-[#FAAD14] text-white font-black px-4 py-2 rounded-xl text-sm uppercase tracking-wider rotate-[-12deg] shadow-nb-sm pointer-events-none select-none"
              style={{ opacity: Math.min(1, (dragX - 20) / 80) }}
            >
              บันทึกแล้ว 💛
            </div>
          )}
          {dragX < -20 && (
            <div 
              className="absolute top-6 right-6 z-30 border-3 border-black bg-[#4096FF] text-white font-black px-4 py-2 rounded-xl text-sm uppercase tracking-wider rotate-[12deg] shadow-nb-sm pointer-events-none select-none"
              style={{ opacity: Math.min(1, (-dragX - 20) / 80) }}
            >
              ข้ามคำนี้ ➔
            </div>
          )}
          <WordCard
            word={word}
            activeImageIndex={activeImageIndex}
            setActiveImageIndex={setActiveImageIndex}
          />

          {/* Tinder-style Control Buttons overlaid inside the card */}
          <div 
            className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 z-30 pointer-events-auto"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* 1. Rewind Button */}
            <button
              type="button"
              onClick={handleRewind}
              disabled={historyStack.length === 0 || advancing}
              className="flex h-11 w-11 items-center justify-center rounded-full border-3 border-black bg-white dark:bg-[#2d2d44] text-[#8c8c8c] dark:text-[#5c5c7c] shadow-nb-sm transition-all hover:scale-105 active:translate-y-[2px] active:shadow-[1px_1px_0_#000] cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Rewind"
            >
              <UndoOutlined style={{ fontSize: 18 }} />
            </button>

            {/* 2. Skip (X) Button */}
            <button
              type="button"
              onClick={handleSkipPress}
              disabled={advancing || exiting}
              className="flex h-14 w-14 items-center justify-center rounded-full border-3 border-black bg-[#FF4D4F] text-white shadow-nb-sm transition-all hover:scale-105 active:translate-y-[2px] active:shadow-[1px_1px_0_#000] cursor-pointer"
              aria-label="Skip"
            >
              <CloseOutlined style={{ fontSize: 22, fontWeight: 'bold' }} />
            </button>

            {/* 3. Like (Heart) Button */}
            <button
              type="button"
              onClick={handleLikePress}
              disabled={advancing || exiting}
              className="flex h-14 w-14 items-center justify-center rounded-full border-3 border-black bg-[#FF85C0] text-white shadow-nb-sm transition-all hover:scale-105 active:translate-y-[2px] active:shadow-[1px_1px_0_#000] cursor-pointer"
              aria-label="Like"
            >
              <HeartFilled style={{ fontSize: 22 }} />
            </button>

            {/* 4. TTS Audio Button */}
            <button
              type="button"
              onClick={handleTTSPress}
              className="flex h-11 w-11 items-center justify-center rounded-full border-3 border-black bg-[#4096FF] text-white shadow-nb-sm transition-all hover:scale-105 active:translate-y-[2px] active:shadow-[1px_1px_0_#000] cursor-pointer"
              aria-label="TTS Speak"
            >
              <SoundOutlined style={{ fontSize: 18 }} />
            </button>

            {/* 5. Word Detail Button */}
            <button
              type="button"
              onClick={openWordDetail}
              className="flex h-11 w-11 items-center justify-center rounded-full border-3 border-black bg-[#52C41A] text-white shadow-nb-sm transition-all hover:scale-105 active:translate-y-[2px] active:shadow-[1px_1px_0_#000] cursor-pointer"
              aria-label="รายละเอียดคำ"
            >
              <BookOutlined style={{ fontSize: 18 }} />
            </button>
          </div>
          </div>
        </div>
      )}

      <p className="text-center text-[10px] text-text-meta font-black mt-2 select-none opacity-40 uppercase tracking-wider">
        ปัด หรือ ใช้ปุ่มควบคุมในการเรียนรู้
      </p>


      {advancing && wordsQueue.length <= 1 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none bg-background/80 backdrop-blur-sm z-50">
          <Mascot state="thinking" size={64} />
          <div className="flex items-center gap-1.5">
            <span className="loading-dot h-2 w-2 rounded-full bg-accent-blue" style={{ animationDelay: "0ms" }} />
            <span className="loading-dot h-2 w-2 rounded-full bg-accent-blue" style={{ animationDelay: "200ms" }} />
            <span className="loading-dot h-2 w-2 rounded-full bg-accent-blue" style={{ animationDelay: "400ms" }} />
          </div>
          <p className="text-sm text-gray-600 dark:text-white/60 font-medium">กำลังโหลดคำถัดไป...</p>
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
