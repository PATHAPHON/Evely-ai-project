import { shuffle } from './shuffle';

export interface PlayableWord {
  id: string;
  word: string;
  thai: string | null;
  status: string;
}

export interface BuildQueueOptions {
  words: PlayableWord[];
  targetMode: 'matching' | 'typing' | 'speak';
  wordsPerMode?: number;
}

export interface QueueItem {
  id: string;
  wordId: string;
  word: string;
  thai: string;
  game: 'matching' | 'typing' | 'speak';
}

export const MIN_WORDS_TO_PLAY = 6;

/**
 * Builds a game queue with a 70/30 yellow/green ratio.
 * Yellow (`needs_review`) words fill 70 % of slots, green (`known`) words fill 30 %.
 * If one pool is too small the other pool back-fills the remaining slots.
 * Requires at least MIN_WORDS_TO_PLAY (6 words) to play.
 */
export function buildPlayQueue({
  words,
  targetMode,
  wordsPerMode = 5,
}: BuildQueueOptions): QueueItem[] {
  const hasThai = (w: PlayableWord) => !!w.thai && !!w.thai.trim();

  function dedupShuffle<T extends { word: string }>(list: T[]): T[] {
    const m = new Map<string, T>();
    for (const e of list) {
      const k = e.word.toLowerCase().trim();
      if (!m.has(k)) m.set(k, e);
    }
    const arr = [...m.values()];
    shuffle(arr);
    return arr;
  }

  const eligible = words.filter(hasThai);
  const yellow = dedupShuffle(eligible.filter((w) => w.status === 'needs_review'));
  const green = dedupShuffle(eligible.filter((w) => w.status !== 'needs_review'));
  const totalAvailable = yellow.length + green.length;

  if (totalAvailable < MIN_WORDS_TO_PLAY) {
    return [];
  }

  const targetCount = targetMode === 'matching' ? 6 : wordsPerMode;

  // 70 % yellow / 30 % green ratio
  const yellowTarget = Math.ceil(targetCount * 0.7);
  const greenTarget = targetCount - yellowTarget;

  // Take up to the target from each pool; if one pool is short, back-fill from the other
  const yellowSelected = yellow.slice(0, yellowTarget);
  const greenSelected = green.slice(0, greenTarget);

  const yellowShortfall = yellowTarget - yellowSelected.length;
  const greenShortfall = greenTarget - greenSelected.length;

  // Back-fill: if yellow pool was short, take extra green; and vice-versa
  const greenBackfill = green.slice(greenSelected.length, greenSelected.length + yellowShortfall);
  const yellowBackfill = yellow.slice(yellowSelected.length, yellowSelected.length + greenShortfall);

  const selected = [...yellowSelected, ...yellowBackfill, ...greenSelected, ...greenBackfill];

  return selected.map((w) => ({
    id: `${w.id}-${targetMode}`,
    wordId: w.id,
    word: w.word,
    thai: w.thai as string,
    game: targetMode,
  }));
}
