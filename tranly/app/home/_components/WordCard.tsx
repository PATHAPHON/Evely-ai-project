"use client";

import { useCallback } from "react";
import { SoundOutlined, StarOutlined, StarFilled } from "@ant-design/icons";
import type { FeedWordRecord } from "../_lib/types";
import { useLanguagePreference } from "@/app/_lib/useLanguagePreference";
import { useTTS } from "@/app/chat/_lib/useTTS";

interface WordCardProps {
  word: FeedWordRecord;
  onToggleBookmark: (wordId: string) => void;
}

/**
 * Displays a single Korean vocabulary word card with:
 * - Hangul word, Thai pronunciation, romanization, English definition, Thai translation
 * - Audio button (cloud TTS with Web Speech fallback) for Korean pronunciation
 * - Bookmark toggle button with visual indicator
 *
 * Styled with Neobrutalist design system.
 */
export default function WordCard({ word, onToggleBookmark }: WordCardProps) {
  const { language } = useLanguagePreference();
  const { speak, isSupported } = useTTS("ko-KR");

  const handlePlayAudio = useCallback(() => {
    if (word.korean) speak(word.korean);
  }, [word.korean, speak]);

  const handleToggleBookmark = useCallback(() => {
    onToggleBookmark(word.id);
  }, [word.id, onToggleBookmark]);

  return (
    <div className="w-full rounded-2xl border-3 border-black dark:border-[#4a4a6a] bg-white dark:bg-[#2d2d44] p-4 shadow-nb-md">
      {/* Korean word (Hangul) */}
      <p className="text-3xl font-bold text-black dark:text-white text-center mb-2">
        {word.korean}
      </p>

      {/* Romanization */}
      <p className="text-sm text-gray-500 dark:text-white/50 text-center mb-3 italic">
        {word.romanization}
      </p>

      {/* Translation — language based on user preference */}
      {language === 'thai' ? (
        <>
          <p className="text-lg text-gray-700 dark:text-white/70 text-center mb-1">{word.reading}</p>
          <p className="text-base text-gray-700 dark:text-white/70 text-center mb-4">{word.thai}</p>
        </>
      ) : (
        <p className="text-base text-black dark:text-white text-center font-medium mb-4">{word.english}</p>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-4">
        {/* Audio button — hidden only if the runtime can't play audio at all */}
        {isSupported && (
          <button
            type="button"
            onClick={handlePlayAudio}
            aria-label="Play Korean pronunciation"
            className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-[#4096FF] text-white shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
          >
            <SoundOutlined style={{ fontSize: 18 }} />
          </button>
        )}

        {/* Bookmark toggle button */}
        <button
          type="button"
          onClick={handleToggleBookmark}
          aria-label={word.bookmarked ? "Remove bookmark" : "Add bookmark"}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border-3 border-black dark:border-[#4a4a6a] shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer ${
            word.bookmarked
              ? "bg-[#FAAD14] text-white"
              : "bg-white dark:bg-[#2d2d44] text-black dark:text-white"
          }`}
        >
          {word.bookmarked ? (
            <StarFilled style={{ fontSize: 18 }} />
          ) : (
            <StarOutlined style={{ fontSize: 18 }} />
          )}
        </button>
      </div>
    </div>
  );
}
