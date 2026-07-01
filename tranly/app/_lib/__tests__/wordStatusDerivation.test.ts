import { describe, it, expect } from 'vitest';
import {
  deriveWordStatus,
  STATUS_COLORS,
  type WordStatus,
  type WordBankEntry,
} from '../utils/wordStatusDerivation';

function makeEntry(overrides: Partial<WordBankEntry> = {}): WordBankEntry {
  return {
    id: 'test-id',
    word: 'hello',
    thai: 'สวัสดี',
    partOfSpeech: 'interjection',
    nextReviewAt: new Date(Date.now() + 86400000), // tomorrow
    lastReviewedAt: new Date(),
    box: 1,
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    ...overrides,
  };
}

describe('deriveWordStatus', () => {
  it('returns "unknown" when word is not in word bank or rejected set', () => {
    const wordBank = new Map<string, WordBankEntry>();
    const rejectedSet = new Set<string>();

    expect(deriveWordStatus('hello', wordBank, rejectedSet)).toBe('unknown');
  });

  it('returns "known" when word is in word bank with future nextReviewAt', () => {
    const wordBank = new Map<string, WordBankEntry>([
      ['hello', makeEntry({ word: 'hello', nextReviewAt: new Date(Date.now() + 86400000) })],
    ]);
    const rejectedSet = new Set<string>();

    expect(deriveWordStatus('hello', wordBank, rejectedSet)).toBe('known');
  });

  it('returns "needs_review" when word is in word bank with past nextReviewAt', () => {
    const wordBank = new Map<string, WordBankEntry>([
      ['hello', makeEntry({ word: 'hello', nextReviewAt: new Date(Date.now() - 86400000) })],
    ]);
    const rejectedSet = new Set<string>();

    expect(deriveWordStatus('hello', wordBank, rejectedSet)).toBe('needs_review');
  });

  it('returns "rejected" when word is in rejected set but not word bank', () => {
    const wordBank = new Map<string, WordBankEntry>();
    const rejectedSet = new Set<string>(['hello']);

    expect(deriveWordStatus('hello', wordBank, rejectedSet)).toBe('rejected');
  });

  it('prioritizes word bank over rejected set', () => {
    const wordBank = new Map<string, WordBankEntry>([
      ['hello', makeEntry({ word: 'hello', nextReviewAt: new Date(Date.now() + 86400000) })],
    ]);
    const rejectedSet = new Set<string>(['hello']);

    expect(deriveWordStatus('hello', wordBank, rejectedSet)).toBe('known');
  });

  it('performs case-insensitive lookup', () => {
    const wordBank = new Map<string, WordBankEntry>([
      ['hello', makeEntry({ word: 'hello', nextReviewAt: new Date(Date.now() + 86400000) })],
    ]);
    const rejectedSet = new Set<string>();

    expect(deriveWordStatus('Hello', wordBank, rejectedSet)).toBe('known');
    expect(deriveWordStatus('HELLO', wordBank, rejectedSet)).toBe('known');
    expect(deriveWordStatus('hElLo', wordBank, rejectedSet)).toBe('known');
  });

  it('trims whitespace from the word before lookup', () => {
    const wordBank = new Map<string, WordBankEntry>([
      ['hello', makeEntry({ word: 'hello', nextReviewAt: new Date(Date.now() + 86400000) })],
    ]);
    const rejectedSet = new Set<string>();

    expect(deriveWordStatus('  hello  ', wordBank, rejectedSet)).toBe('known');
  });

  it('performs case-insensitive lookup for rejected words', () => {
    const wordBank = new Map<string, WordBankEntry>();
    const rejectedSet = new Set<string>(['hello']);

    expect(deriveWordStatus('Hello', wordBank, rejectedSet)).toBe('rejected');
    expect(deriveWordStatus('HELLO', wordBank, rejectedSet)).toBe('rejected');
  });
});

describe('STATUS_COLORS', () => {
  it('has entries for all four statuses', () => {
    const statuses: WordStatus[] = ['unknown', 'known', 'needs_review', 'rejected'];
    for (const status of statuses) {
      expect(STATUS_COLORS[status]).toBeDefined();
      expect(STATUS_COLORS[status].light).toBeDefined();
      expect(STATUS_COLORS[status].dark).toBeDefined();
    }
  });

  it('uses correct colors for each status', () => {
    expect(STATUS_COLORS.unknown.light).toBe('#1a1a1a');
    expect(STATUS_COLORS.unknown.dark).toBe('#e5e5e5');
    expect(STATUS_COLORS.known.light).toBe('#16a34a');
    expect(STATUS_COLORS.known.dark).toBe('#4ade80');
    expect(STATUS_COLORS.needs_review.light).toBe('#ca8a04');
    expect(STATUS_COLORS.needs_review.dark).toBe('#facc15');
    expect(STATUS_COLORS.rejected.light).toBe('#6b7280');
    expect(STATUS_COLORS.rejected.dark).toBe('#9ca3af');
  });
});
