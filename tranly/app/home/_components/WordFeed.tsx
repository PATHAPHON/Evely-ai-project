"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { 
  ReloadOutlined, 
  UndoOutlined,
  CloseOutlined,
  HeartFilled,
  StarOutlined,
  StarFilled,
  SoundOutlined
} from "@ant-design/icons";
import { getCustomAIHeaders } from "@/app/_lib/getCustomAIHeaders";
import { useActiveLanguage } from "@/app/_lib/ActiveLanguageContext";
import { useGems } from "@/app/_lib/GemsContext";
import { useLanguagePreference } from "@/app/_lib/useLanguagePreference";
import { message as antdMessage } from "antd";
import type { FeedWordRecord, FeedWord } from "../_lib/types";
import { useFeedStorage } from "../_lib/useFeedStorage";
import { useExclusionList } from "../_lib/useExclusionList";
import { useWordStorage } from "@/app/learn/_lib/useWordStorage";
import WordCard from "./WordCard";
import Mascot from "@/app/chat/_components/Mascot";
import { useTTS } from "@/app/chat/_lib/useTTS";
import type { SpeechLang } from "@/app/chat/_lib/types";
import { supabase } from "@/app/_lib/supabaseClient";
import type { TargetLanguage } from "@/app/_lib/wordTypes";
import { trimTransparentPixels, resizeImage } from "@/app/_lib/imageUtils";

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

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}



const SPEECH_LANG_BY_LANGUAGE: Record<TargetLanguage, SpeechLang> = {
  korean: 'ko-KR',
  japanese: 'ja-JP',
  chinese: 'zh-CN',
  english: 'en-US',
};

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
  const { gems, earnGems, spendGems } = useGems();

  const [showGemsToast, setShowGemsToast] = useState(false);

  const [word, setWord] = useState<FeedWordRecord | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [exitingDirection, setExitingDirection] = useState<'left' | 'right' | 'up' | null>(null);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);
  const mouseStartY = useRef<number | null>(null);
  const wheelLockRef = useRef(false);

  const { loadTodayWords, saveWords, toggleBookmark, removeWord } =
    useFeedStorage();
  const { getExclusionList } = useExclusionList();
  const { save: saveLearnWord, list: listLearnWords } = useWordStorage();
  const [messageApi, contextHolder] = antdMessage.useMessage();

  const speechLang = word ? SPEECH_LANG_BY_LANGUAGE[word.language] : 'ko-KR';
  const { speak } = useTTS(speechLang);

  const fetchOne = useCallback(async (): Promise<FeedWordRecord> => {
    const exclusionList = await getExclusionList();
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
        count: 1,
        topic: apiTopic
      }),
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
      const isFree = true;
      if (!isFree && gems < 5) {
        setWord(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const next = await fetchOne();
        if (!cancelled) setWord(next);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load word. Please try again."
          );
          setWord(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [fetchOne, activeLanguage]);

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
          const primaryWord = getPrimaryWord(word);
          const existing = await listLearnWords();
          if (existing.some((w) => w.korean === primaryWord)) {
            setTimeout(() => {
              messageApi.destroy(key);
            }, 0);
            return;
          }

          let blob: Blob | null = null;
          const coverUrl = (word.imageUrls && word.imageUrls.length > 0)
            ? (word.imageUrls[activeImageIndex] || word.imageUrls[0])
            : word.imageUrl;

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
              const { removeBackground } = await import('@imgly/background-removal');
              const processed = await removeBackground(resizedBlob, {
                device: 'gpu',
                model: 'isnet_quint8',
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
            label: word.thai,
            korean: word.korean || primaryWord,
            reading: word.reading || '',
            romanization: word.romanization || '',
            english: word.english || '',
            partOfSpeech: word.partOfSpeech || '',
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
          console.error("Bookmark save failed:", err);
        }
      }
    },
    [word, toggleBookmark, listLearnWords, saveLearnWord, messageApi, activeImageIndex]
  );

  const advance = useCallback(async () => {
    if (!word || advancing) return;

    const isFree = true;
    if (!isFree) {
      const success = spendGems(5);
      if (!success) {
        setTimeout(() => {
          messageApi.error(isThai ? "เพชรไม่พอใช้ AI! 💎" : "Not enough gems for AI! 💎");
        }, 0);
        return;
      }
    }

    setAdvancing(true);
    setExiting(true);
    setError(null);
    try {
      // Save current word to history stack for Rewind
      setHistoryStack((prev) => [...prev, word]);

      await removeWord(word.id);
      const next = await fetchOne();
      
      if (isFree) {
        earnGems(10);
        setShowGemsToast(true);
        setTimeout(() => setShowGemsToast(false), 1200);
      }

      // Reset drag parameters for the new card
      setDragX(0);
      setDragY(0);
      setExitingDirection(null);
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
      setDragX(0);
      setDragY(0);
      setExitingDirection(null);
    } finally {
      setAdvancing(false);
    }
  }, [word, advancing, removeWord, fetchOne, loadTodayWords, activeLanguage, spendGems, earnGems, isThai, messageApi]);

  // Touch and mouse dragging mechanics
  const handleDragStart = useCallback((clientX: number, clientY: number, isMouse: boolean, target: EventTarget) => {
    if (advancing || exiting) return;
    
    // Ignore drags that start on interactive elements like buttons
    const isInteractive = (target as HTMLElement).closest('button') || 
                          (target as HTMLElement).closest('a') ||
                          (target as HTMLElement).closest('input') ||
                          (target as HTMLElement).closest('.image-carousel');
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
        // Swipe Right: Bookmark and Next
        setExitingDirection('right');
        setExiting(true);
        if (word && !word.bookmarked) {
          await handleToggleBookmark(word.id);
        }
        await advance();
      } else {
        // Swipe Left: Skip
        setExitingDirection('left');
        setExiting(true);
        await advance();
      }
    } else if (absY > absX && dragY < -threshold) {
      // Swipe Up: Next
      setExitingDirection('up');
      setExiting(true);
      await advance();
    } else {
      // Snap back
      setDragX(0);
      setDragY(0);
      setExitingDirection(null);
    }
  }, [dragX, dragY, word, handleToggleBookmark, advance]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY, false, e.target);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX, e.touches[0].clientY, false);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    void handleDragEnd();
  }, [handleDragEnd]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    handleDragStart(e.clientX, e.clientY, true, e.target);
  }, [handleDragStart]);

  // Handle document level mousemove & mouseup when dragging is active
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY, true);
    };

    const handleWindowMouseUp = () => {
      void handleDragEnd();
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Wheel handler for desktop — wheel down = next word.
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (advancing || exiting || wheelLockRef.current) return;
      if (e.deltaY > 30) {
        wheelLockRef.current = true;
        setTimeout(() => {
          wheelLockRef.current = false;
        }, 800);
        setExitingDirection('up');
        setExiting(true);
        setDragX(0);
        setDragY(-600);
        void advance();
      }
    },
    [advancing, exiting, advance]
  );

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
          kanji: prevWord.kanji,
          hiragana: prevWord.hiragana,
          romaji: prevWord.romaji,
          korean: prevWord.korean,
          reading: prevWord.reading,
          romanization: prevWord.romanization,
          english: prevWord.english,
          hanzi: prevWord.hanzi,
          pinyin: prevWord.pinyin,
          word: prevWord.word,
          ipa: prevWord.ipa,
        });

      if (dbError) throw dbError;

      // Pop from stack and set as current
      setHistoryStack((prev) => prev.slice(0, -1));
      setWord(prevWord);
      
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
  }, [historyStack, advancing, messageApi]);

  const handleSkipPress = useCallback(() => {
    if (advancing || exiting || !word) return;
    setExitingDirection('left');
    setExiting(true);
    void advance();
  }, [advance, advancing, exiting, word]);

  const handleBookmarkPress = useCallback(async () => {
    if (!word || advancing) return;
    await handleToggleBookmark(word.id);
  }, [word, advancing, handleToggleBookmark]);

  const handleLikePress = useCallback(() => {
    if (advancing || exiting || !word) return;
    setExitingDirection('right');
    setExiting(true);
    void advance();
  }, [advance, advancing, exiting, word]);

  const handleTTSPress = useCallback(() => {
    if (!word) return;
    const primaryWord = getPrimaryWord(word);
    if (primaryWord) speak(primaryWord);
  }, [word, speak]);

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

  // Dynamic card transforms
  let transformStyle = "";
  if (isDragging) {
    transformStyle = `translate(${dragX}px, ${dragY}px) rotate(${dragX * 0.04}deg) scale(0.98)`;
  } else if (exiting) {
    if (exitingDirection === 'right') {
      transformStyle = `translate(600px, ${dragY}px) rotate(20deg) scale(0.95)`;
    } else if (exitingDirection === 'left') {
      transformStyle = `translate(-600px, ${dragY}px) rotate(-20deg) scale(0.95)`;
    } else if (exitingDirection === 'up') {
      transformStyle = `translate(${dragX}px, -800px) rotate(${dragX * 0.04}deg) scale(0.95)`;
    } else {
      transformStyle = `translate(0px, 0px) rotate(0deg) scale(1)`;
    }
  } else {
    transformStyle = `translate(${dragX}px, ${dragY}px) rotate(${dragX * 0.04}deg) scale(1)`;
  }

  return (
    <div
      className="relative flex flex-1 flex-col px-4 overflow-hidden items-center justify-center min-h-0 w-full"
      onWheel={handleWheel}
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
          className="will-change-transform w-full max-w-md cursor-grab active:cursor-grabbing select-none relative animate-card-enter touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
          {dragY < -20 && Math.abs(dragY) > Math.abs(dragX) && (
            <div 
              className="absolute top-6 left-1/2 -translate-x-1/2 z-30 border-3 border-black bg-[#FF85C0] text-white font-black px-4 py-2 rounded-xl text-sm uppercase tracking-wider shadow-nb-sm pointer-events-none select-none"
              style={{ opacity: Math.min(1, (-dragY - 20) / 80) }}
            >
              ถัดไป ⬆
            </div>
          )}

          <WordCard
            word={word}
            onToggleBookmark={handleToggleBookmark}
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

            {/* 3. Star Button (Bookmark toggle) */}
            <button
              type="button"
              onClick={handleBookmarkPress}
              disabled={advancing}
              className={`flex h-11 w-11 items-center justify-center rounded-full border-3 border-black shadow-nb-sm transition-all hover:scale-105 active:translate-y-[2px] active:shadow-[1px_1px_0_#000] cursor-pointer ${
                word.bookmarked 
                  ? "bg-[#FAAD14] text-white" 
                  : "bg-white dark:bg-[#2d2d44] text-black dark:text-white"
              }`}
              aria-label="Bookmark"
            >
              {word.bookmarked ? <StarFilled style={{ fontSize: 18 }} /> : <StarOutlined style={{ fontSize: 18 }} />}
            </button>

            {/* 4. Like (Heart) Button */}
            <button
              type="button"
              onClick={handleLikePress}
              disabled={advancing || exiting}
              className="flex h-14 w-14 items-center justify-center rounded-full border-3 border-black bg-[#FF85C0] text-white shadow-nb-sm transition-all hover:scale-105 active:translate-y-[2px] active:shadow-[1px_1px_0_#000] cursor-pointer"
              aria-label="Like"
            >
              <HeartFilled style={{ fontSize: 22 }} />
            </button>

            {/* 5. TTS Audio Button */}
            <button
              type="button"
              onClick={handleTTSPress}
              className="flex h-11 w-11 items-center justify-center rounded-full border-3 border-black bg-[#4096FF] text-white shadow-nb-sm transition-all hover:scale-105 active:translate-y-[2px] active:shadow-[1px_1px_0_#000] cursor-pointer"
              aria-label="TTS Speak"
            >
              <SoundOutlined style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-[10px] text-text-meta font-black mt-2 select-none opacity-40 uppercase tracking-wider">
        ปัด หรือ ใช้ปุ่มควบคุมในการเรียนรู้
      </p>

      {/* Floating Gems Earned Toast */}
      {showGemsToast && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50 bg-[#E6F7FF] border-3 border-black px-5 py-3 rounded-2xl shadow-nb-lg text-base font-black text-accent-blue flex items-center gap-2 pointer-events-none gems-toast">
          <span>+10 💎 Earned!</span>
        </div>
      )}

      {advancing && (
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
