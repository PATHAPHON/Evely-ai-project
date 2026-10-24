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
 * Builds a game queue prioritizing yellow (`needs_review`) words first.
 * If yellow words do not fill the target round size, green (`known`) words fill the remaining slots.
 * If there are no yellow words, green words are randomly sampled.
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

  // Yellow-first priority: pick yellow words up to targetCount, then fill remainder with green words
  const yellowSelected = yellow.slice(0, targetCount);
  const remainingNeeded = targetCount - yellowSelected.length;
  const greenSelected = green.slice(0, remainingNeeded);
  const selected = [...yellowSelected, ...greenSelected];

  return selected.map((w) => ({
    id: `${w.id}-${targetMode}`,
    wordId: w.id,
    word: w.word,
    thai: w.thai as string,
    game: targetMode,
  }));
}
