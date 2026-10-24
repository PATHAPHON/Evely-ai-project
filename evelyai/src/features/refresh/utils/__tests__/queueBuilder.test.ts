import { describe, it, expect } from 'vitest';
import { buildPlayQueue, type PlayableWord, MIN_WORDS_TO_PLAY } from '../queueBuilder';

describe('buildPlayQueue', () => {
  it('returns empty array when total available words is less than 6', () => {
    expect(buildPlayQueue({ words: [], targetMode: 'typing' })).toEqual([]);

    const fewWords: PlayableWord[] = [
      { id: '1', word: 'apple', thai: 'แอปเปิ้ล', status: 'needs_review' },
      { id: '2', word: 'banana', thai: 'กล้วย', status: 'known' },
      { id: '3', word: 'cherry', thai: 'เชอร์รี่', status: 'known' },
    ];
    // Fewer than 6 words -> should return empty queue
    expect(buildPlayQueue({ words: fewWords, targetMode: 'typing' })).toEqual([]);
    expect(buildPlayQueue({ words: fewWords, targetMode: 'matching' })).toEqual([]);
  });

  it('prioritizes yellow words before green words in typing mode when at least 6 words', () => {
    const words: PlayableWord[] = [
      { id: 'y1', word: 'yellow1', thai: 'เหลือง1', status: 'needs_review' },
      { id: 'y2', word: 'yellow2', thai: 'เหลือง2', status: 'needs_review' },
      { id: 'g1', word: 'green1', thai: 'เขียว1', status: 'known' },
      { id: 'g2', word: 'green2', thai: 'เขียว2', status: 'known' },
      { id: 'g3', word: 'green3', thai: 'เขียว3', status: 'known' },
      { id: 'g4', word: 'green4', thai: 'เขียว4', status: 'known' },
    ];

    const queue = buildPlayQueue({ words, targetMode: 'typing', wordsPerMode: 5 });

    expect(queue).toHaveLength(5);
    // First 2 items must be the yellow words
    const firstTwoIds = queue.slice(0, 2).map((q) => q.wordId);
    expect(firstTwoIds.sort()).toEqual(['y1', 'y2']);

    // Next 3 items must be green words
    const lastThreeIds = queue.slice(2).map((q) => q.wordId);
    expect(lastThreeIds.every((id) => id.startsWith('g'))).toBe(true);
  });

  it('plays all green words when no yellow words exist (at least 6 green words)', () => {
    const words: PlayableWord[] = [
      { id: 'g1', word: 'green1', thai: 'เขียว1', status: 'known' },
      { id: 'g2', word: 'green2', thai: 'เขียว2', status: 'known' },
      { id: 'g3', word: 'green3', thai: 'เขียว3', status: 'known' },
      { id: 'g4', word: 'green4', thai: 'เขียว4', status: 'known' },
      { id: 'g5', word: 'green5', thai: 'เขียว5', status: 'known' },
      { id: 'g6', word: 'green6', thai: 'เขียว6', status: 'known' },
    ];

    const queue = buildPlayQueue({ words, targetMode: 'typing', wordsPerMode: 5 });
    expect(queue).toHaveLength(5);
    expect(queue.every((q) => q.game === 'typing')).toBe(true);
  });

  it('handles matching mode taking 6 words (2 rounds of 3)', () => {
    const sevenWords: PlayableWord[] = Array.from({ length: 7 }, (_, i) => ({
      id: `w${i}`,
      word: `word${i}`,
      thai: `แปล${i}`,
      status: 'known',
    }));
    const queue = buildPlayQueue({ words: sevenWords, targetMode: 'matching' });
    expect(queue).toHaveLength(6);
  });

  it('deduplicates words by normalized lowercase', () => {
    const words: PlayableWord[] = [
      { id: '1', word: 'Cat', thai: 'แมว', status: 'needs_review' },
      { id: '2', word: 'cat  ', thai: 'แมว', status: 'needs_review' },
      { id: '3', word: 'CAT', thai: 'แมว', status: 'needs_review' },
      { id: '4', word: 'dog', thai: 'หมา', status: 'known' },
      { id: '5', word: 'bird', thai: 'นก', status: 'known' },
    ];

    // Only 3 unique words -> less than 6 -> empty queue
    const queue = buildPlayQueue({ words, targetMode: 'typing' });
    expect(queue).toHaveLength(0);
  });
});
