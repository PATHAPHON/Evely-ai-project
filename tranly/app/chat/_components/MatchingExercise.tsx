'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LessonExercise } from '../_lib/lessonTypes';

interface MatchingExerciseProps {
  exercise: LessonExercise;
  answered: boolean;
  onAnswer: (isCorrect: boolean) => void;
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
}: MatchingExerciseProps) {
  const pairs = useMemo(() => exercise.pairs ?? [], [exercise.pairs]);
  // Each pair gets a stable index used as the match key.
  const koreanItems = useMemo(
    () => shuffle(pairs.map((p, i) => ({ key: i, text: p.korean }))),
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
    (side: Side, key: number) => {
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
    [answered, matched, selected, wrongKeys]
  );

  const renderColumn = (side: Side, items: { key: number; text: string }[]) => (
    <div className="flex flex-1 flex-col gap-3">
      {items.map((item) => {
        const isMatched = matched.has(item.key);
        const isSelected = selected?.side === side && selected.key === item.key;
        const isWrong =
          wrongKeys !== null &&
          (side === 'korean'
            ? wrongKeys.korean === item.key
            : wrongKeys.thai === item.key);

        let stateClasses =
          'bg-card-bg text-text-primary shadow-[4px_4px_0_#000000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)] cursor-pointer';
        if (isMatched) {
          stateClasses =
            'bg-[#52C41A] text-white shadow-[2px_2px_0_#000000] dark:shadow-[2px_2px_0_rgba(0,0,0,0.4)] translate-x-[2px] translate-y-[2px] cursor-default';
        } else if (isWrong) {
          stateClasses =
            'bg-[#FF4D4F] text-white shadow-[2px_2px_0_#000000] dark:shadow-[2px_2px_0_rgba(0,0,0,0.4)]';
        } else if (isSelected) {
          stateClasses =
            'bg-[#FFD93D] text-black shadow-[2px_2px_0_#000000] dark:shadow-[2px_2px_0_rgba(0,0,0,0.4)] translate-x-[2px] translate-y-[2px]';
        }

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => handleTap(side, item.key)}
            disabled={answered || isMatched}
            className={`w-full rounded-xl border-3 border-border-color px-3 py-3 text-center text-base font-semibold transition-all ${stateClasses}`}
          >
            {item.text}
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
