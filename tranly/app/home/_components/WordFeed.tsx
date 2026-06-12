"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReloadOutlined,
  UndoOutlined,
  CloseOutlined,
  HeartFilled,
  SoundOutlined,
  BookOutlined
} from "@ant-design/icons";
import { useActiveLanguage } from "@/app/_lib/ActiveLanguageContext";
import { message as antdMessage } from "antd";
import WordCard from "./WordCard";
import LoadingDots from "./LoadingDots";
import { useRouter } from "next/navigation";
import { DETAIL_WORD_STORAGE_KEY } from "../_lib/types";
import ElephantMascot from "@/app/chat/_components/ElephantMascot";
import { useTTS } from "@/app/chat/_lib/useTTS";
import type { SpeechLang } from "@/app/chat/_lib/types";
import type { TargetLanguage } from "@/app/_lib/wordTypes";
import { getPrimaryWord, computeCardTransform } from "../_lib/feedHelpers";
import { useFeedQueue } from "../_lib/useFeedQueue";
import { useAcceptWord } from "../_lib/useAcceptWord";
import { useSwipeGesture } from "../_lib/useSwipeGesture";

const SPEECH_LANG_BY_LANGUAGE: Record<TargetLanguage, SpeechLang> = {
  english: 'en-US',
};

/**
 * Shows a single word card at a time for the active language.
 * Swiping right accepts (saves as a sticker), swiping left rejects.
 * Queue/prefetch lives in useFeedQueue, drag mechanics in useSwipeGesture,
 * and the sticker pipeline in useAcceptWord — this component wires them to JSX.
 */
export default function WordFeed() {
  const { activeLanguage } = useActiveLanguage();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const router = useRouter();

  const [messageApi, contextHolder] = antdMessage.useMessage();

  const {
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
  } = useFeedQueue({ activeLanguage, messageApi });

  const { acceptWord } = useAcceptWord({ messageApi });

  const speechLang = word ? SPEECH_LANG_BY_LANGUAGE[word.language] : 'ko-KR';
  const { speak } = useTTS(speechLang);

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

  // Right swipe = accept (save sticker in background) and next.
  const onAccept = useCallback(async () => {
    if (word) void acceptWord(word, activeImageIndex);
    await advance();
  }, [word, acceptWord, activeImageIndex, advance]);

  // Left swipe = reject (store for reuse) and next.
  const onReject = useCallback(async () => {
    if (word) void saveRejected(word, word.language);
    await advance();
  }, [word, saveRejected, advance]);

  const {
    dragX,
    dragY,
    isDragging,
    exiting,
    exitingDirection,
    handleTouchStart,
    handleMouseDown,
    swipeRight,
    swipeLeft,
    resetCard,
  } = useSwipeGesture({ disabled: advancing, onAccept, onReject });

  const handleRewind = useCallback(async () => {
    await rewind();
    resetCard();
  }, [rewind, resetCard]);

  const handleTTSPress = useCallback(() => {
    if (!word) return;
    const primaryWord = getPrimaryWord(word);
    if (primaryWord) speak(primaryWord);
  }, [word, speak]);

  const isQueueEmptyAndLoading = wordsQueue.length === 0 && isFetchingMore;

  if (loading || isQueueEmptyAndLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <ElephantMascot state="thinking" size={64} />
        <LoadingDots />
      </div>
    );
  }

  if (error && !word) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <ElephantMascot size={72} />
        <p className="text-base text-accent-red font-bold">{error}</p>
        <button
          type="button"
          onClick={retry}
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
        <ElephantMascot state="happy" size={72} />
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
              onClick={swipeLeft}
              disabled={advancing || exiting}
              className="flex h-14 w-14 items-center justify-center rounded-full border-3 border-black bg-[#FF4D4F] text-white shadow-nb-sm transition-all hover:scale-105 active:translate-y-[2px] active:shadow-[1px_1px_0_#000] cursor-pointer"
              aria-label="Skip"
            >
              <CloseOutlined style={{ fontSize: 22, fontWeight: 'bold' }} />
            </button>

            {/* 3. Like (Heart) Button */}
            <button
              type="button"
              onClick={swipeRight}
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
          <ElephantMascot state="thinking" size={64} />
          <LoadingDots />
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
