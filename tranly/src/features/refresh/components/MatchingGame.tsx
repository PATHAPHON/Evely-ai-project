'use client';

import { useState, useMemo } from 'react';
import type { GameProps } from '../gameTypes';
import { pickDistractors } from '../gameTypes';
import { matchingQuality } from '../quality';
import { shuffle } from '../utils/shuffle';

interface Pair {
  word: string;
  thai: string;
  isTarget: boolean;
}

function shuffleIndices(n: number): number[] {
  return shuffle(Array.from({ length: n }, (_, i) => i));
}

type PairState = 'flash' | 'matched';

function getButtonClasses(ps: PairState | undefined, isSel: boolean, isWrong: boolean) {
  if (ps === 'flash' || ps === 'matched') {
    return 'border-correct bg-correct/10 text-correct shadow-soft-sm opacity-40';
  }
  if (isWrong) {
    return 'border-incorrect bg-incorrect/15 text-incorrect shadow-soft-sm';
  }
  if (isSel) {
    return 'border-primary bg-primary-bg text-primary font-semibold shadow-soft-sm';
  }
  return 'border-border-color bg-card-bg text-foreground hover:bg-primary-bg/30 hover:border-primary/50';
}

function GameButton({
  label, ps, isSel, isWrong, isShake, disabled, onClick,
}: {
  label: string;
  ps: PairState | undefined;
  isSel: boolean;
  isWrong: boolean;
  isShake: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const classes = getButtonClasses(ps, isSel, isWrong);
  const shakeClass = isShake ? 'animate-shake' : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 py-6 rounded-2xl border text-center text-base font-semibold transition-all active:scale-98 cursor-pointer ${classes} ${shakeClass}`}
    >
      {label}
    </button>
  );
}

export default function MatchingGame({ word, thai, wordBank, onDone }: GameProps) {
  // Build the pair set once: target + up to 4 distractors (min 2 pairs total).
  const pairs = useMemo<Pair[]>(() => {
    const distractors = pickDistractors(wordBank, word, 4);
    const built: Pair[] = [{ word, thai, isTarget: true }];
    for (const d of distractors) {
      built.push({ word: d.word, thai: d.thai, isTarget: false });
    }
    // If we somehow have only the target, duplicate-free fallback: still render
    // the single pair (engine guarantees at least the target). Shuffle order.
    const order = shuffleIndices(built.length);
    return order.map((i) => built[i]);
  }, [word, thai, wordBank]);

  const wordOrder = useMemo(() => shuffleIndices(pairs.length), [pairs.length]);

  const [selThai, setSelThai] = useState<number | null>(null);
  const [selWord, setSelWord] = useState<number | null>(null);
  const [pairState, setPairState] = useState<Record<number, PairState>>({});
  const [wrongPair, setWrongPair] = useState<[number, number] | null>(null);
  const [targetMistakes, setTargetMistakes] = useState(0);

  const allMatched = pairs.every((_, i) => pairState[i] === 'matched');
  const targetIdx = pairs.findIndex((p) => p.isTarget);

  function attempt(thaiIdx: number, wordDisplayIdx: number) {
    const correct = wordOrder[wordDisplayIdx] === thaiIdx;
    setSelThai(null);
    setSelWord(null);
    if (correct) {
      setPairState((p) => ({ ...p, [thaiIdx]: 'flash' }));
      setTimeout(() => setPairState((p) => ({ ...p, [thaiIdx]: 'matched' })), 400);
    } else {
      // Count a mistake only when the target pair is involved.
      if (thaiIdx === targetIdx || wordOrder[wordDisplayIdx] === targetIdx) {
        setTargetMistakes((m) => m + 1);
      }
      setWrongPair([thaiIdx, wordDisplayIdx]);
      setTimeout(() => setWrongPair(null), 500);
    }
  }

  function pickThai(i: number) {
    if (pairState[i]) return;
    if (selThai === i) {
      setSelThai(null);
      return;
    }
    if (selWord !== null) {
      attempt(i, selWord);
      return;
    }
    setSelThai(i);
  }

  function pickWord(i: number) {
    if (pairState[wordOrder[i]]) return;
    if (selWord === i) {
      setSelWord(null);
      return;
    }
    if (selThai !== null) {
      attempt(selThai, i);
      return;
    }
    setSelWord(i);
  }

  return (
    <div className="flex-1 flex flex-col justify-center gap-4 mt-4">
      {pairs.map((p, i) => (
        <div key={i} className="flex gap-3">
          <GameButton
            label={p.thai}
            ps={pairState[i]}
            isSel={selThai === i}
            isWrong={wrongPair?.[0] === i}
            isShake={wrongPair?.[0] === i}
            disabled={!!pairState[i]}
            onClick={() => pickThai(i)}
          />
          <GameButton
            label={pairs[wordOrder[i]].word}
            ps={pairState[wordOrder[i]]}
            isSel={selWord === i}
            isWrong={wrongPair?.[1] === i}
            isShake={wrongPair?.[1] === i}
            disabled={!!pairState[wordOrder[i]]}
            onClick={() => pickWord(i)}
          />
        </div>
      ))}

      {allMatched && (
        <button
          onClick={() => onDone(matchingQuality(targetMistakes))}
          className="mt-6 w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white dark:text-gray-900 font-bold text-lg active:scale-95 transition-all shadow-soft-sm cursor-pointer"
        >
          ถัดไป
        </button>
      )}
    </div>
  );
}
