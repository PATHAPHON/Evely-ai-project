"use client";

import { useCallback } from "react";
import { SoundOutlined, StarOutlined, StarFilled } from "@ant-design/icons";
import type { FeedWordRecord } from "../_lib/types";
import type { SpeechLang } from "@/app/chat/_lib/types";
import { useLanguagePreference } from "@/app/_lib/useLanguagePreference";
import { useTTS } from "@/app/chat/_lib/useTTS";

interface WordCardProps {
  word: FeedWordRecord;
  onToggleBookmark: (wordId: string) => void;
}

/** The native-script primary word for the record's language. */
function getPrimaryWord(word: FeedWordRecord): string {
  switch (word.language) {
    case 'korean':
      return word.korean ?? '';
    case 'japanese':
      return word.kanji ?? '';
    case 'chinese':
      return word.hanzi ?? '';
    case 'english':
      return word.word ?? '';
  }
}

/** The pronunciation guide line for the record's language. */
function getPronunciation(word: FeedWordRecord): string {
  switch (word.language) {
    case 'korean':
      return word.reading || word.romanization || '';
    case 'japanese':
      return word.hiragana || word.romaji || '';
    case 'chinese':
      return word.pinyin ?? '';
    case 'english':
      return word.ipa ?? '';
  }
}

/** The Web Speech locale used to pronounce the native word. */
const SPEECH_LANG_BY_LANGUAGE: Record<FeedWordRecord['language'], SpeechLang> = {
  korean: 'ko-KR',
  japanese: 'ja-JP',
  chinese: 'zh-CN',
  english: 'en-US',
};

/**
 * Displays a single vocabulary word card for the active learning language with:
 * - Native-script word, pronunciation guide, Thai translation
 * - Audio button (cloud TTS with Web Speech fallback) for the native word
 * - Bookmark toggle button with visual indicator
 *
 * Styled with Neobrutalist design system.
 */
export default function WordCard({ word, onToggleBookmark }: WordCardProps) {
  const { language } = useLanguagePreference();
  const { speak, isSupported } = useTTS(SPEECH_LANG_BY_LANGUAGE[word.language]);

  const primaryWord = getPrimaryWord(word);
  const pronunciation = getPronunciation(word);

  const handlePlayAudio = useCallback(() => {
    if (primaryWord) speak(primaryWord);
  }, [primaryWord, speak]);

  const handleToggleBookmark = useCallback(() => {
    onToggleBookmark(word.id);
  }, [word.id, onToggleBookmark]);

  return (
    <div className="w-full rounded-2xl border-3 border-black dark:border-[#4a4a6a] bg-white dark:bg-[#2d2d44] p-4 shadow-nb-md">
      {/* Native-script word */}
      <p className="text-3xl font-bold text-black dark:text-white text-center mb-2">
        {primaryWord}
      </p>

      {/* Pronunciation guide */}
      <p className="text-sm text-gray-500 dark:text-white/50 text-center mb-3 italic">
        {pronunciation}
      </p>

      {/* Translation — for Korean, respect the user's preference (Thai vs English);
          other languages always show the Thai meaning. */}
      {word.language === 'korean' && language !== 'thai' ? (
        <p className="text-base text-black dark:text-white text-center font-medium mb-4">{word.english}</p>
      ) : (
        <p className="text-base text-gray-700 dark:text-white/70 text-center mb-4">{word.thai}</p>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-4">
        {/* Audio button — hidden only if the runtime can't play audio at all */}
        {isSupported && (
          <button
            type="button"
            onClick={handlePlayAudio}
            aria-label="Play pronunciation"
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
