import { describe, it, expect } from 'vitest';
import { parseFeedResponse } from './parseFeedResponse';
import type { FeedWord } from '@/app/home/_lib/types';

const validWord: FeedWord = {
  korean: '사과',
  reading: 'ซากวา',
  romanization: 'sagwa',
  english: 'apple',
  thai: 'แอปเปิ้ล',
};

const validWord2: FeedWord = {
  korean: '바나나',
  reading: 'บานานา',
  romanization: 'banana',
  english: 'banana',
  thai: 'กล้วย',
};

describe('parseFeedResponse', () => {
  it('parses a valid JSON array of words', () => {
    const content = JSON.stringify([validWord, validWord2]);
    const result = parseFeedResponse(content);
    expect(result).toEqual([validWord, validWord2]);
  });

  it('parses a JSON array wrapped in markdown code fences', () => {
    const content = '```json\n' + JSON.stringify([validWord]) + '\n```';
    const result = parseFeedResponse(content);
    expect(result).toEqual([validWord]);
  });

  it('parses a JSON array wrapped in plain code fences', () => {
    const content = '```\n' + JSON.stringify([validWord, validWord2]) + '\n```';
    const result = parseFeedResponse(content);
    expect(result).toEqual([validWord, validWord2]);
  });

  it('parses a { words: [...] } wrapper object', () => {
    const content = JSON.stringify({ words: [validWord, validWord2] });
    const result = parseFeedResponse(content);
    expect(result).toEqual([validWord, validWord2]);
  });

  it('handles extra prose before and after JSON', () => {
    const content =
      'Here are the words:\n' +
      JSON.stringify([validWord]) +
      '\nHope this helps!';
    const result = parseFeedResponse(content);
    expect(result).toEqual([validWord]);
  });

  it('handles extra prose with markdown fences', () => {
    const content =
      'Here are 5 Korean words:\n```json\n' +
      JSON.stringify([validWord, validWord2]) +
      '\n```\nLet me know if you need more.';
    const result = parseFeedResponse(content);
    expect(result).toEqual([validWord, validWord2]);
  });

  it('skips invalid word objects missing required fields', () => {
    const incomplete = { korean: '사과', reading: 'ซากวา' };
    const content = JSON.stringify([incomplete, validWord]);
    const result = parseFeedResponse(content);
    expect(result).toEqual([validWord]);
  });

  it('skips word objects with empty string fields', () => {
    const emptyField = { ...validWord, thai: '' };
    const content = JSON.stringify([emptyField, validWord2]);
    const result = parseFeedResponse(content);
    expect(result).toEqual([validWord2]);
  });

  it('returns empty array for empty input', () => {
    expect(parseFeedResponse('')).toEqual([]);
    expect(parseFeedResponse('   ')).toEqual([]);
  });

  it('returns empty array for completely invalid content', () => {
    expect(parseFeedResponse('hello world')).toEqual([]);
    expect(parseFeedResponse('not json at all')).toEqual([]);
  });

  it('handles malformed JSON by extracting fields via regex', () => {
    // Simulate truncated/malformed JSON where individual objects are parseable
    const content =
      '[{"korean":"사과","reading":"ซากวา","romanization":"sagwa","english":"apple","thai":"แอปเปิ้ล"}, {"korean":"바나나","reading":"บานานา","romanization":"banana","english":"banana","thai":"กล้วย"';
    const result = parseFeedResponse(content);
    // Should at least extract the first valid word via individual block parsing
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toEqual(validWord);
  });

  it('trims whitespace from field values', () => {
    const wordWithSpaces = {
      korean: '  사과  ',
      reading: '  ซากวา  ',
      romanization: '  sagwa  ',
      english: '  apple  ',
      thai: '  แอปเปิ้ล  ',
    };
    const content = JSON.stringify([wordWithSpaces]);
    const result = parseFeedResponse(content);
    expect(result).toEqual([validWord]);
  });

  it('handles a single word object (not in array)', () => {
    const content = JSON.stringify(validWord);
    const result = parseFeedResponse(content);
    expect(result).toEqual([validWord]);
  });

  it('handles double-encoded JSON (backslash-escaped)', () => {
    const inner = JSON.stringify([validWord]);
    // Double-encode: escape the quotes
    const doubleEncoded = inner.replace(/"/g, '\\"');
    const result = parseFeedResponse(doubleEncoded);
    expect(result).toEqual([validWord]);
  });
});
