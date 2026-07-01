import { describe, it, expect } from 'vitest';
import {
  levenshtein,
  matchingQuality,
  typingQuality,
  speakQuality,
} from '../quality';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('apple', 'apple')).toBe(0);
  });
  it('counts single edits', () => {
    expect(levenshtein('apple', 'aple')).toBe(1);
    expect(levenshtein('apple', 'apples')).toBe(1);
    expect(levenshtein('apple', 'opple')).toBe(1);
  });
  it('handles empty strings', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });
});

describe('matchingQuality', () => {
  it('maps mistakes to quality', () => {
    expect(matchingQuality(0)).toBe(5);
    expect(matchingQuality(1)).toBe(4);
    expect(matchingQuality(2)).toBe(3);
    expect(matchingQuality(3)).toBe(2);
    expect(matchingQuality(10)).toBe(2);
  });
});

describe('typingQuality', () => {
  it('is 5 for exact match (case/space insensitive)', () => {
    expect(typingQuality('Apple', ' apple ')).toBe(5);
  });
  it('grades by edit distance', () => {
    expect(typingQuality('aple', 'apple')).toBe(4); // dist 1
    expect(typingQuality('aple', 'appple')).toBe(3); // dist 2
  });
  it('gives 2 when within len/2 but >2', () => {
    // target length 8 → len/2 = 4; dist 3
    expect(typingQuality('elephnt', 'elephant')).toBe(4); // dist 1 actually
    expect(typingQuality('elephxyz', 'elephant')).toBe(2); // dist 3, <=4
  });
  it('gives 0 for far-off input', () => {
    expect(typingQuality('zzz', 'apple')).toBe(0);
    expect(typingQuality('', 'apple')).toBe(0);
  });
});

describe('speakQuality', () => {
  it('5 on first correct attempt', () => {
    expect(speakQuality(1, true)).toBe(5);
  });
  it('3 on second correct attempt', () => {
    expect(speakQuality(2, true)).toBe(3);
  });
  it('2 when both attempts fail', () => {
    expect(speakQuality(2, false)).toBe(2);
  });
  it('0 when no audio captured', () => {
    expect(speakQuality(0, false)).toBe(0);
  });
});
