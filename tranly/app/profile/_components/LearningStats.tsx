'use client';

import { useLanguageLearningStats } from '../_lib/useLearningStats';

const STAT_CARDS = [
  { key: 'words', label: 'Words', emoji: '📚' },
  { key: 'flashcards', label: 'Flashcards', emoji: '🃏' },
  { key: 'sessions', label: 'Sessions', emoji: '📖' },
] as const;

function StatSkeleton() {
  return (
    <div className="rounded-2xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md flex flex-col items-center gap-2 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#4a4a6a]" />
      <div className="w-12 h-6 rounded bg-gray-200 dark:bg-[#4a4a6a]" />
      <div className="w-16 h-4 rounded bg-gray-200 dark:bg-[#4a4a6a]" />
    </div>
  );
}

export default function LearningStats() {
  const { wordCount, flashcardSetCount, studySessionCount, isLoading } = useLanguageLearningStats();

  const statValues: Record<string, number> = {
    words: wordCount,
    flashcards: flashcardSetCount,
    sessions: studySessionCount,
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {STAT_CARDS.map((card) => (
          <StatSkeleton key={card.key} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {STAT_CARDS.map((card) => (
        <div
          key={card.key}
          className="rounded-2xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md flex flex-col items-center gap-1"
        >
          <span className="text-2xl" aria-hidden="true">
            {card.emoji}
          </span>
          <span className="text-xl font-bold text-text-primary">
            {statValues[card.key]}
          </span>
          <span className="text-xs font-semibold text-text-secondary">
            {card.label}
          </span>
        </div>
      ))}
    </div>
  );
}
