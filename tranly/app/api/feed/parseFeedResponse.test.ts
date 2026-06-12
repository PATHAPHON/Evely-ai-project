import { describe, it, expect } from 'vitest';
import { parseFeedResponse } from './parseFeedResponse';
import type { EnglishFeedWord } from '@/app/home/_lib/types';

const validWord: EnglishFeedWord = {
  language: 'english',
  word: 'cat',
  ipa: '/kæt/',
  thai: 'แมว',
  imageQueries: ['cat', 'cat details', 'cat background'],
};

const validWord2: EnglishFeedWord = {
  language: 'english',
  word: 'dog',
  ipa: '/dɒɡ/',
  thai: 'สุนัข',
  imageQueries: ['dog', 'dog details', 'dog background'],
};

describe('parseFeedResponse', () => {
  it('parses a valid JSON array of English words', () => {
    const content = JSON.stringify([
      { word: 'cat', ipa: '/kæt/', thai: 'แมว' },
      { word: 'dog', ipa: '/dɒɡ/', thai: 'สุนัข' },
    ]);
    const result = parseFeedResponse(content, 'english');
    expect(result).toEqual([validWord, validWord2]);
  });

  it('parses a JSON array wrapped in markdown code fences', () => {
    const content = '```json\n' + JSON.stringify([{ word: 'cat', ipa: '/kæt/', thai: 'แมว' }]) + '\n```';
    const result = parseFeedResponse(content, 'english');
    expect(result).toEqual([validWord]);
  });

  it('parses a JSON array wrapped in plain code fences', () => {
    const rawWords = [
      { word: 'cat', ipa: '/kæt/', thai: 'แมว' },
      { word: 'dog', ipa: '/dɒɡ/', thai: 'สุนัข' },
    ];
    const content = '```\n' + JSON.stringify(rawWords) + '\n```';
    const result = parseFeedResponse(content, 'english');
    expect(result).toEqual([validWord, validWord2]);
  });

  it('parses a { words: [...] } wrapper object', () => {
    const rawWords = [
      { word: 'cat', ipa: '/kæt/', thai: 'แมว' },
      { word: 'dog', ipa: '/dɒɡ/', thai: 'สุนัข' },
    ];
    const content = JSON.stringify({ words: rawWords });
    const result = parseFeedResponse(content, 'english');
    expect(result).toEqual([validWord, validWord2]);
  });

  it('handles extra prose before and after JSON', () => {
    const rawWord = { word: 'cat', ipa: '/kæt/', thai: 'แมว' };
    const content =
      'Here are the words:\n' +
      JSON.stringify([rawWord]) +
      '\nHope this helps!';
    const result = parseFeedResponse(content, 'english');
    expect(result).toEqual([validWord]);
  });

  it('handles extra prose with markdown fences', () => {
    const rawWords = [
      { word: 'cat', ipa: '/kæt/', thai: 'แมว' },
      { word: 'dog', ipa: '/dɒɡ/', thai: 'สุนัข' },
    ];
    const content =
      'Here are 5 English words:\n```json\n' +
      JSON.stringify(rawWords) +
      '\n```\nLet me know if you need more.';
    const result = parseFeedResponse(content, 'english');
    expect(result).toEqual([validWord, validWord2]);
  });

  it('skips invalid word objects missing required fields', () => {
    const incomplete = { word: 'cat', ipa: '/kæt/' };
    const rawValid = { word: 'cat', ipa: '/kæt/', thai: 'แมว' };
    const content = JSON.stringify([incomplete, rawValid]);
    const result = parseFeedResponse(content, 'english');
    expect(result).toEqual([validWord]);
  });

  it('skips word objects with empty string fields', () => {
    const emptyField = { word: 'cat', ipa: '/kæt/', thai: '' };
    const rawValid2 = { word: 'dog', ipa: '/dɒɡ/', thai: 'สุนัข' };
    const content = JSON.stringify([emptyField, rawValid2]);
    const result = parseFeedResponse(content, 'english');
    expect(result).toEqual([validWord2]);
  });

  it('returns empty array for empty input', () => {
    expect(parseFeedResponse('', 'english')).toEqual([]);
    expect(parseFeedResponse('   ', 'english')).toEqual([]);
  });

  it('returns empty array for completely invalid content', () => {
    expect(parseFeedResponse('hello world', 'english')).toEqual([]);
    expect(parseFeedResponse('not json at all', 'english')).toEqual([]);
  });

  it('handles malformed JSON by extracting fields via regex', () => {
    const content =
      '[{"word":"cat","ipa":"/kæt/","thai":"แมว"}, {"word":"dog","ipa":"/dɒɡ/","thai":"สุนัข"';
    const result = parseFeedResponse(content, 'english');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toEqual(validWord);
  });

  it('trims whitespace from field values', () => {
    const wordWithSpaces = {
      word: '  cat  ',
      ipa: '  /kæt/  ',
      thai: '  แมว  ',
    };
    const content = JSON.stringify([wordWithSpaces]);
    const result = parseFeedResponse(content, 'english');
    expect(result).toEqual([validWord]);
  });

  it('handles a single word object (not in array)', () => {
    const rawWord = { word: 'cat', ipa: '/kæt/', thai: 'แมว' };
    const content = JSON.stringify(rawWord);
    const result = parseFeedResponse(content, 'english');
    expect(result).toEqual([validWord]);
  });

  it('handles double-encoded JSON (backslash-escaped)', () => {
    const rawWord = { word: 'cat', ipa: '/kæt/', thai: 'แมว' };
    const inner = JSON.stringify([rawWord]);
    const doubleEncoded = inner.replace(/"/g, '\\"');
    const result = parseFeedResponse(doubleEncoded, 'english');
    expect(result).toEqual([validWord]);
  });

  it('parses part_of_speech if present in the input', () => {
    const rawWord = { word: 'cat', ipa: '/kæt/', thai: 'แมว', part_of_speech: 'คำนาม' };
    const content = JSON.stringify([rawWord]);
    const result = parseFeedResponse(content, 'english');
    expect(result).toEqual([{ ...validWord, partOfSpeech: 'คำนาม' }]);
  });

  it('defaults to english when no language is specified', () => {
    const rawWord = { word: 'cat', ipa: '/kæt/', thai: 'แมว' };
    const content = JSON.stringify([rawWord]);
    const result = parseFeedResponse(content);
    expect(result).toEqual([validWord]);
  });
});
