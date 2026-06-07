"use client";

import { useRef, useState, useCallback } from "react";
import { SoundOutlined, ReloadOutlined } from "@ant-design/icons";
import type { TopikListeningQuestion } from "../../_lib/topik/types";
import { useStrings } from "@/app/_lib/strings";

interface ListeningQuestionProps {
  question: TopikListeningQuestion;
  onAnswer: (selectedIndex: number) => void;
  currentIndex: number;
  totalQuestions: number;
}

/**
 * Displays a TOPIK listening question with an audio play/replay button
 * and 4 answer choices. Uses HTML5 audio element with React ref for playback.
 *
 * Styled with Neobrutalist design system, supports dark mode.
 */
export default function ListeningQuestion({
  question,
  onAnswer,
  currentIndex,
  totalQuestions,
}: ListeningQuestionProps) {
  const strings = useStrings();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const playAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setHasPlayed(true);
      setIsPlaying(true);
    }
  }, []);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleAudioError = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleSelect = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      onAnswer(index);
    },
    [onAnswer]
  );

  return (
    <div className="w-full rounded-2xl border-3 border-black dark:border-[#4a4a6a] bg-white dark:bg-[#2d2d44] p-5 shadow-nb-md">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={question.audioSrc}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        preload="auto"
      />

      {/* Progress indicator */}
      <p className="text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wide mb-3">
        {strings.topik.listening} · {strings.topik.questionOf(currentIndex + 1, totalQuestions)}
      </p>

      {/* Audio play / replay button */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <button
          type="button"
          onClick={playAudio}
          aria-label={hasPlayed ? strings.topik.replayAudio : strings.topik.playAudio}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl border-3 border-black dark:border-[#4a4a6a] font-bold text-white shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer ${
            isPlaying
              ? "bg-[#52C41A] animate-pulse"
              : "bg-[#4096FF] hover:bg-[#1677FF]"
          }`}
        >
          {hasPlayed ? (
            <ReloadOutlined style={{ fontSize: 20 }} />
          ) : (
            <SoundOutlined style={{ fontSize: 20 }} />
          )}
          <span className="text-sm">
            {hasPlayed ? strings.topik.replayAudio : strings.topik.playAudio}
          </span>
        </button>
      </div>

      {/* Question prompt */}
      <p className="text-lg font-bold text-black dark:text-white text-center mb-5">
        {question.question}
      </p>

      {/* 4 answer choices */}
      <div className="flex flex-col gap-3">
        {question.choices.map((choice, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleSelect(index)}
            className={`w-full text-left px-4 py-3 rounded-xl border-3 font-medium transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer ${
              selectedIndex === index
                ? "border-[#4096FF] bg-[#E6F4FF] dark:bg-[#1a3a5c] text-[#1677FF] dark:text-[#69B1FF] shadow-nb-sm"
                : "border-black dark:border-[#4a4a6a] bg-white dark:bg-[#2d2d44] text-black dark:text-white shadow-nb-sm hover:bg-gray-50 dark:hover:bg-[#3a3a5a]"
            }`}
          >
            <span className="mr-2 inline-block w-6 h-6 text-center leading-6 rounded-full border-2 border-current text-xs font-bold">
              {index + 1}
            </span>
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}
