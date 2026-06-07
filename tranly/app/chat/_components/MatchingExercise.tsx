'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LessonExercise } from '../_lib/lessonTypes';

interface MatchingExerciseProps {
  exercise: LessonExercise;
  answered: boolean;
  onAnswer: (isCorrect: boolean) => void;
  /** Plays the tapped Korean word aloud (TTS). */
  onSpeak?: (text: string) => void;
}

interface ColumnItem {
  key: number;
  text: string;
  reading?: string;
}

type Side = 'korean' | 'thai';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Tap-to-pair matching exercise. The learner taps a Korean item then its Thai
 * meaning (or vice versa). Correct pairs lock green; mismatches flash red and
 * clear. Reports correct=true once every pair is matched.
 */
export default function MatchingExercise({
  exercise,
  answered,
  onAnswer,
  onSpeak,
}: MatchingExerciseProps) {
  const pairs = useMemo(() => exercise.pairs ?? [], [exercise.pairs]);
  // Each pair gets a stable index used as the match key.
  const koreanItems = useMemo(
    () =>
      shuffle(
        pairs.map((p, i) => ({ key: i, text: p.korean, reading: p.reading }))
      ),
    [pairs]
  );
  const thaiItems = useMemo(
    () => shuffle(pairs.map((p, i) => ({ key: i, text: p.thai }))),
    [pairs]
  );

  const [selected, setSelected] = useState<{ side: Side; key: number } | null>(
    null
  );
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongKeys, setWrongKeys] = useState<{ korean: number; thai: number } | null>(
    null
  );
  const answeredRef = useRef(false);

  useEffect(() => {
    if (!answeredRef.current && matched.size === pairs.length && pairs.length > 0) {
      answeredRef.current = true;
      onAnswer(true);
    }
  }, [matched, pairs.length, onAnswer]);

  const handleTap = useCallback(
    (side: Side, key: number, text: string) => {
      // Always voice the Korean word on tap, even if it is already matched.
      if (side === 'korean') onSpeak?.(text);

      if (answered || matched.has(key) || wrongKeys) return;

      if (!selected) {
        setSelected({ side, key });
        return;
      }

      // Tapping the same item again deselects it.
      if (selected.side === side) {
        setSelected({ side, key });
        return;
      }

      // We have one from each side now.
      if (selected.key === key) {
        // Correct match.
        setMatched((prev) => new Set(prev).add(key));
        setSelected(null);
      } else {
        // Mismatch — flash both red briefly, then clear.
        const koreanKey = side === 'korean' ? key : selected.key;
        const thaiKey = side === 'thai' ? key : selected.key;
        setWrongKeys({ korean: koreanKey, thai: thaiKey });
        setSelected(null);
        setTimeout(() => setWrongKeys(null), 600);
      }
    },
    [answered, matched, selected, wrongKeys, onSpeak]
  );

  const renderColumn = (side: Side, items: ColumnItem[]) => (
    <div className="flex flex-1 flex-col gap-4">
      {items.map((item) => {
        const isMatched = matched.has(item.key);
        const isSelected = selected?.side === side && selected.key === item.key;
        const isWrong =
          wrongKeys !== null &&
          (side === 'korean'
            ? wrongKeys.korean === item.key
            : wrongKeys.thai === item.key);

        let stateClasses =
          'bg-card-bg text-text-primary shadow-nb-md cursor-pointer';
        if (isMatched) {
          stateClasses =
            'bg-accent-green text-white shadow-nb-sm translate-x-[2px] translate-y-[2px] cursor-default';
        } else if (isWrong) {
          stateClasses =
            'bg-accent-red text-white shadow-nb-sm';
        } else if (isSelected) {
          stateClasses =
            'bg-accent-yellow text-black shadow-nb-sm translate-x-[2px] translate-y-[2px]';
        }

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => handleTap(side, item.key, item.text)}
            disabled={answered}
            className={`flex min-h-[68px] w-full flex-col items-center justify-center gap-0.5 rounded-2xl border-3 border-border-color px-3 py-4 text-center transition-all ${stateClasses}`}
          >
            {side === 'korean' && item.reading && (
              <span
                className={`text-xs font-medium leading-tight ${
                  isMatched || isWrong
                    ? 'text-white/80'
                    : isSelected
                      ? 'text-black/60'
                      : 'text-text-secondary'
                }`}
              >
                {item.reading}
              </span>
            )}
            <span className="text-lg font-semibold leading-tight">
              {item.text}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {exercise.prompt && (
        <p className="text-base font-bold text-text-primary">
          {exercise.prompt}
        </p>
      )}
      <div className="flex gap-3">
        {renderColumn('korean', koreanItems)}
        {renderColumn('thai', thaiItems)}
      </div>
    </div>
  );
}
