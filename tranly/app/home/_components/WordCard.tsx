"use client";

import { useCallback, useEffect, useState } from "react";
import { SoundOutlined, StarOutlined, StarFilled } from "@ant-design/icons";
import type { FeedWordRecord } from "../_lib/types";
import { useLanguagePreference } from "@/app/_lib/useLanguagePreference";

interface WordCardProps {
  word: FeedWordRecord;
  onToggleBookmark: (wordId: string) => void;
}

/**
 * Displays a single Korean vocabulary word card with:
 * - Hangul word, Thai pronunciation, romanization, English definition, Thai translation
 * - Audio button (Web Speech API) for Korean pronunciation
 * - Bookmark toggle button with visual indicator
 *
 * Styled with Neobrutalist design system.
 */
export default function WordCard({ word, onToggleBookmark }: WordCardProps) {
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const { language } = useLanguagePreference();

  useEffect(() => {
    setSpeechAvailable(
      typeof window !== "undefined" && "speechSynthesis" in window
    );
  }, []);

  const handlePlayAudio = useCallback(() => {
    if (!speechAvailable) return;

    const utterance = new SpeechSynthesisUtterance(word.korean);
    utterance.lang = "ko-KR";
    utterance.rate = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [word.korean, speechAvailable]);

  const handleToggleBookmark = useCallback(() => {
    onToggleBookmark(word.id);
  }, [word.id, onToggleBookmark]);

  return (
    <div className="w-full rounded-2xl border-3 border-black bg-white p-4 shadow-[4px_4px_0_#000000]">
      {/* Korean word (Hangul) */}
      <p className="text-3xl font-bold text-black text-center mb-2">
        {word.korean}
      </p>

      {/* Romanization */}
      <p className="text-sm text-gray-500 text-center mb-3 italic">
        {word.romanization}
      </p>

      {/* Translation — language based on user preference */}
      {language === 'thai' ? (
        <>
          <p className="text-lg text-gray-700 text-center mb-1">{word.reading}</p>
          <p className="text-base text-gray-700 text-center mb-4">{word.thai}</p>
        </>
      ) : (
        <p className="text-base text-black text-center font-medium mb-4">{word.english}</p>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-4">
        {/* Audio button — hidden if SpeechSynthesis unavailable */}
        {speechAvailable && (
          <button
            type="button"
            onClick={handlePlayAudio}
            aria-label="Play Korean pronunciation"
            className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-black bg-[#4096FF] text-white shadow-[3px_3px_0_#000000] transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_#000000] cursor-pointer"
          >
            <SoundOutlined style={{ fontSize: 18 }} />
          </button>
        )}

        {/* Bookmark toggle button */}
        <button
          type="button"
          onClick={handleToggleBookmark}
          aria-label={word.bookmarked ? "Remove bookmark" : "Add bookmark"}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border-3 border-black shadow-[3px_3px_0_#000000] transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_#000000] cursor-pointer ${
            word.bookmarked
              ? "bg-[#FAAD14] text-white"
              : "bg-white text-black"
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
