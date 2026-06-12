import { describe, it, expect } from 'vitest';
import { makePhraseToken, tokenizePhrases } from '../wordTokenizer';

describe('makePhraseToken', () => {
  it('keeps a multi-word phrase as a single clickable token', () => {
    const token = makePhraseToken('good day');
    expect(token.word).toBe('good day');
    expect(token.leadingPunct).toBe('');
    expect(token.trailingPunct).toBe('');
    expect(token.isEnglish).toBe(true);
  });

  it('strips boundary punctuation while preserving it', () => {
    const token = makePhraseToken('good day.');
    expect(token.word).toBe('good day');
    expect(token.trailingPunct).toBe('.');
    expect(token.original).toBe('good day.');
    expect(token.isEnglish).toBe(true);
  });

  it('marks a non-English phrase as not clickable', () => {
    const token = makePhraseToken('สวัสดี');
    expect(token.word).toBe('สวัสดี');
    expect(token.isEnglish).toBe(false);
  });
});

describe('tokenizePhrases', () => {
  it('builds one clickable token per phrase with a clean lookup key', () => {
    const tokens = tokenizePhrases(['Hey there!', 'Good to', 'hear from you.']);
    expect(tokens.map((t) => t.word)).toEqual([
      'Hey there',
      'Good to',
      'hear from you',
    ]);
    expect(tokens.every((t) => t.isEnglish)).toBe(true);
  });

  it('pulls leading punctuation onto the previous chunk (e.g. "!Good to")', () => {
    const tokens = tokenizePhrases(['Hey there', '!Good to']);
    expect(tokens).toHaveLength(2);
    expect(tokens[0].word).toBe('Hey there');
    expect(tokens[0].trailingPunct).toBe('!');
    expect(tokens[1].word).toBe('Good to');
    expect(tokens[1].leadingPunct).toBe('');
  });

  it('merges a punctuation-only chunk into the previous chunk', () => {
    const tokens = tokenizePhrases(['hear from you', '.']);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].word).toBe('hear from you');
    expect(tokens[0].trailingPunct).toBe('.');
  });

  it('skips empty chunks', () => {
    const tokens = tokenizePhrases(['good day', '', '  ']);
    expect(tokens.map((t) => t.word)).toEqual(['good day']);
  });
});
