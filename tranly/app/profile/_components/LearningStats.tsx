"use client";

import { useStrings } from "@/app/_lib/strings";

interface LearningStatsProps {
  wordCount: number;
  flashcardSetCount: number;
  studySessionCount: number;
  streak: number;
  isLoading: boolean;
}

/**
 * Four-column stat strip (words · flashcards · sessions · streak) in one
 * bordered Neobrutalist card with divided cells.
 */
export default function LearningStats({
  wordCount,
  flashcardSetCount,
  studySessionCount,
  streak,
  isLoading,
}: LearningStatsProps) {
  const t = useStrings();

  const cells = [
    { n: wordCount, label: t.profile.statWords },
    { n: flashcardSetCount, label: t.profile.statFlashcards },
    { n: studySessionCount, label: t.profile.statSessions },
    { n: streak, label: t.profile.statStreak },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 overflow-hidden rounded-2xl border-3 border-border-color bg-card-bg shadow-nb-md">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex flex-col items-center gap-2 px-2 py-3.5 ${
              i < 3 ? "border-r-3 border-border-color" : ""
            }`}
          >
            <div className="h-6 w-8 animate-pulse rounded bg-gray-200 dark:bg-[#4a4a6a]" />
            <div className="h-3 w-12 animate-pulse rounded bg-gray-200 dark:bg-[#4a4a6a]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 overflow-hidden rounded-2xl border-3 border-border-color bg-card-bg shadow-nb-md">
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={`px-2 py-3.5 text-center ${
            i < cells.length - 1 ? "border-r-3 border-border-color" : ""
          }`}
        >
          <div className="text-xl font-extrabold text-text-primary tabular-nums">
            {c.n}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-text-secondary leading-tight">
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}
