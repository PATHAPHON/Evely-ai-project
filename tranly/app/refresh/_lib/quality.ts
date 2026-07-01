/**
 * Pure scoring functions that map mini-game performance to an SM-2 quality
 * score (0-5). These are deliberately side-effect free so they can be unit
 * tested and reused by the refresh engine.
 */

/** Computes the Levenshtein edit distance between two strings. */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * Matching game: quality decreases with the number of wrong attempts on the
 * target pair. 0 mistakes → 5, 1 → 4, 2 → 3, 3+ → 2.
 */
export function matchingQuality(mistakes: number): number {
  if (mistakes <= 0) return 5;
  if (mistakes === 1) return 4;
  if (mistakes === 2) return 3;
  return 2;
}

/**
 * Typing game: quality from edit distance between the user's input and the
 * target, scaled by the target length.
 *   dist 0 → 5, dist 1 → 4, dist 2 → 3, dist ≤ len/2 → 2, else → 0.
 */
export function typingQuality(input: string, target: string): number {
  const a = normalize(input);
  const b = normalize(target);
  const dist = levenshtein(a, b);

  if (dist === 0) return 5;
  if (dist === 1) return 4;
  if (dist === 2) return 3;
  if (dist <= b.length / 2) return 2;
  return 0;
}

/**
 * Speak game: two attempts allowed.
 *   correct on first attempt → 5
 *   correct on second attempt → 3
 *   both attempts failed → 2
 *   no audio captured (0 attempts) → 0
 */
export function speakQuality(attempts: number, gotIt: boolean): number {
  if (attempts <= 0) return 0;
  if (gotIt) return attempts === 1 ? 5 : 3;
  return 2;
}
