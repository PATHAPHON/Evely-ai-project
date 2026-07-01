import { useState } from 'react';

/** Matches the `animate-card-out` CSS transition duration. */
const EXIT_ANIM_MS = 450;

/** Shared "score → exit animation → onDone" flow used by every mini-game. */
export function useGameExit(onDone: (quality: number) => void) {
  const [isExiting, setIsExiting] = useState(false);

  function finish(quality: number) {
    setIsExiting(true);
    setTimeout(() => onDone(quality), EXIT_ANIM_MS);
  }

  return { isExiting, finish };
}
