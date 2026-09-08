import { useState } from 'react';
import type { GameProps, GameRound } from './gameTypes';

/**
 * Bridges a `GameRound` (plugs in its concrete subclass + the round props) to
 * React state so the component re-renders when the round starts its exit
 * animation. The round owns the shared "score → exit animation → onDone" flow.
 */
export function useGameExit<R extends GameRound>(
  makeRound: (props: GameProps, onExitStart: () => void) => R,
  props: GameProps,
): { isExiting: boolean; round: R } {
  const [isExiting, setIsExiting] = useState(false);

  // The round is created once per mount (each game remounts per word) and is
  // a plain object, not a render input — useState is a ref-free lazy init.
  const [round] = useState<R>(() =>
    makeRound(props, () => setIsExiting(true))
  );

  return { isExiting, round };
}