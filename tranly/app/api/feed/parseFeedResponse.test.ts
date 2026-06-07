import { describe, it, expect } from 'vitest';
import { parseFeedResponse } from './parseFeedResponse';
import type { FeedWord, KoreanFeedWord, JapaneseFeedWord, ChineseFeedWord, EnglishFeedWord } from '@/app/home/_lib/types';

const validWord: KoreanFeedWord = {
  language: 'korean',
  korean: '사과',
  reading: 'ซากวา',
  romanization: 'sagwa',
  english: 'apple',
  thai: 'แอปเปิ้ล',
  imageQueries: ['apple', 'apple details', 'apple background'],
};

const validWord2: KoreanFeedWord = {
  language: 'korean',
  korean: '바나나',
  reading: 'บานานา',
  romanization: 'banana',
  english: 'banana',
  thai: 'กล้วย',
  imageQueries: ['banana', 'banana details', 'banana background'],
};

const validJapaneseWord: JapaneseFeedWord = {
  language: 'japanese',
  kanji: '猫',
  hiragana: 'ねこ',
  romaji: 'neko',
  thai: 'แมว',
  english: 'cat',
  imageQueries: ['cat', 'cat details', 'cat background'],
};

const validChineseWord: ChineseFeedWord = {
  language: 'chinese',
  hanzi: '猫',
  pinyin: 'māo',
  thai: 'แมว',
  english: 'cat',
  imageQueries: ['cat', 'cat details', 'cat background'],
};

const validEnglishWord: EnglishFeedWord = {
  language: 'english',
  word: 'cat',
  ipa: '/kæt/',
  thai: 'แมว',
  imageQueries: ['cat', 'cat details', 'cat background'],
};

describe('parseFeedResponse', () => {
  // --- Korean language tests (default) ---
  it('parses a valid JSON array of Korean words', () => {
    const content = JSON.stringify([
      { korean: '사과', reading: 'ซากวา', romanization: 'sagwa', english: 'apple', thai: 'แอปเปิ้ล' },
      { korean: '바나나', reading: 'บานานา', romanization: 'banana', english: 'banana', thai: 'กล้วย' },
    ]);
    const result = parseFeedResponse(content, 'korean');
    expect(result).toEqual([validWord, validWord2]);
  });

  it('parses a JSON array wrapped in markdown code fences', () => {
    const content = '```json\n' + JSON.stringify([{ korean: '사과', reading: 'ซากวา', romanization: 'sagwa', english: 'apple', thai: 'แอปเปิ้ล' }]) + '\n```';
    const result = parseFeedResponse(content, 'korean');
    expect(result).toEqual([validWord]);
  });

  it('parses a JSON array wrapped in plain code fences', () => {
    const rawWords = [
      { korean: '사과', reading: 'ซากวา', romanization: 'sagwa', english: 'apple', thai: 'แอปเปิ้ล' },
      { korean: '바나나', reading: 'บานานา', romanization: 'banana', english: 'banana', thai: 'กล้วย' },
    ];
    const content = '```\n' + JSON.stringify(rawWords) + '\n```';
    const result = parseFeedResponse(content, 'korean');
    expect(result).toEqual([validWord, validWord2]);
  });

  it('parses a { words: [...] } wrapper object', () => {
    const rawWords = [
      { korean: '사과', reading: 'ซากวา', romanization: 'sagwa', english: 'apple', thai: 'แอปเปิ้ล' },
      { korean: '바나나', reading: 'บานานา', romanization: 'banana', english: 'banana', thai: 'กล้วย' },
    ];
    const content = JSON.stringify({ words: rawWords });
    const result = parseFeedResponse(content, 'korean');
    expect(result).toEqual([validWord, validWord2]);
  });

  it('handles extra prose before and after JSON', () => {
    const rawWord = { korean: '사과', reading: 'ซากวา', romanization: 'sagwa', english: 'apple', thai: 'แอปเปิ้ล' };
    const content =
      'Here are the words:\n' +
      JSON.stringify([rawWord]) +
      '\nHope this helps!';
    const result = parseFeedResponse(content, 'korean');
    expect(result).toEqual([validWord]);
  });

  it('handles extra prose with markdown fences', () => {
    const rawWords = [
      { korean: '사과', reading: 'ซากวา', romanization: 'sagwa', english: 'apple', thai: 'แอปเปิ้ล' },
      { korean: '바나나', reading: 'บานานา', romanization: 'banana', english: 'banana', thai: 'กล้วย' },
    ];
    const content =
      'Here are 5 Korean words:\n```json\n' +
      JSON.stringify(rawWords) +
      '\n```\nLet me know if you need more.';
    const result = parseFeedResponse(content, 'korean');
    expect(result).toEqual([validWord, validWord2]);
  });

  it('skips invalid word objects missing required fields', () => {
    const incomplete = { korean: '사과', reading: 'ซากวา' };
    const rawValid = { korean: '사과', reading: 'ซากวา', romanization: 'sagwa', english: 'apple', thai: 'แอปเปิ้ล' };
    const content = JSON.stringify([incomplete, rawValid]);
    const result = parseFeedResponse(content, 'korean');
    expect(result).toEqual([validWord]);
  });

  it('skips word objects with empty string fields', () => {
    const emptyField = { korean: '사과', reading: 'ซากวา', romanization: 'sagwa', english: 'apple', thai: '' };
    const rawValid2 = { korean: '바나나', reading: 'บานานา', romanization: 'banana', english: 'banana', thai: 'กล้วย' };
    const content = JSON.stringify([emptyField, rawValid2]);
    const result = parseFeedResponse(content, 'korean');
    expect(result).toEqual([validWord2]);
  });

  it('returns empty array for empty input', () => {
    expect(parseFeedResponse('', 'korean')).toEqual([]);
    expect(parseFeedResponse('   ', 'korean')).toEqual([]);
  });

  it('returns empty array for completely invalid content', () => {
    expect(parseFeedResponse('hello world', 'korean')).toEqual([]);
    expect(parseFeedResponse('not json at all', 'korean')).toEqual([]);
  });

  it('handles malformed JSON by extracting fields via regex', () => {
    const content =
      '[{"korean":"사과","reading":"ซากวา","romanization":"sagwa","english":"apple","thai":"แอปเปิ้ล"}, {"korean":"바나나","reading":"บานานา","romanization":"banana","english":"banana","thai":"กล้วย"';
    const result = parseFeedResponse(content, 'korean');
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
    const result = parseFeedResponse(content, 'korean');
    expect(result).toEqual([validWord]);
  });

  it('handles a single word object (not in array)', () => {
    const rawWord = { korean: '사과', reading: 'ซากวา', romanization: 'sagwa', english: 'apple', thai: 'แอปเปิ้ล' };
    const content = JSON.stringify(rawWord);
    const result = parseFeedResponse(content, 'korean');
    expect(result).toEqual([validWord]);
  });

  it('handles double-encoded JSON (backslash-escaped)', () => {
    const rawWord = { korean: '사과', reading: 'ซากวา', romanization: 'sagwa', english: 'apple', thai: 'แอปเปิ้ล' };
    const inner = JSON.stringify([rawWord]);
    const doubleEncoded = inner.replace(/"/g, '\\"');
    const result = parseFeedResponse(doubleEncoded, 'korean');
    expect(result).toEqual([validWord]);
  });

  it('parses part_of_speech if present in the input', () => {
    const rawWord = { korean: '사과', reading: 'ซากวา', romanization: 'sagwa', english: 'apple', thai: 'แอปเปิ้ล', part_of_speech: 'คำนาม' };
    const content = JSON.stringify([rawWord]);
    const result = parseFeedResponse(content, 'korean');
    expect(result).toEqual([{ ...validWord, partOfSpeech: 'คำนาม' }]);
  });

  // --- Japanese language tests ---
  it('parses Japanese feed words', () => {
    const rawWord = { kanji: '猫', hiragana: 'ねこ', romaji: 'neko', thai: 'แมว', english: 'cat' };
    const content = JSON.stringify([rawWord]);
    const result = parseFeedResponse(content, 'japanese');
    expect(result).toEqual([validJapaneseWord]);
  });

  it('skips Japanese words missing required fields', () => {
    const incomplete = { kanji: '猫', hiragana: 'ねこ' };
    const rawValid = { kanji: '猫', hiragana: 'ねこ', romaji: 'neko', thai: 'แมว', english: 'cat' };
    const content = JSON.stringify([incomplete, rawValid]);
    const result = parseFeedResponse(content, 'japanese');
    expect(result).toEqual([validJapaneseWord]);
  });

  // --- Chinese language tests ---
  it('parses Chinese feed words', () => {
    const rawWord = { hanzi: '猫', pinyin: 'māo', thai: 'แมว', english: 'cat' };
    const content = JSON.stringify([rawWord]);
    const result = parseFeedResponse(content, 'chinese');
    expect(result).toEqual([validChineseWord]);
  });

  it('skips Chinese words missing required fields', () => {
    const incomplete = { hanzi: '猫' };
    const rawValid = { hanzi: '猫', pinyin: 'māo', thai: 'แมว', english: 'cat' };
    const content = JSON.stringify([incomplete, rawValid]);
    const result = parseFeedResponse(content, 'chinese');
    expect(result).toEqual([validChineseWord]);
  });

  // --- English language tests ---
  it('parses English feed words', () => {
    const rawWord = { word: 'cat', ipa: '/kæt/', thai: 'แมว' };
    const content = JSON.stringify([rawWord]);
    const result = parseFeedResponse(content, 'english');
    expect(result).toEqual([validEnglishWord]);
  });

  it('skips English words missing required fields', () => {
    const incomplete = { word: 'cat' };
    const rawValid = { word: 'cat', ipa: '/kæt/', thai: 'แมว' };
    const content = JSON.stringify([incomplete, rawValid]);
    const result = parseFeedResponse(content, 'english');
    expect(result).toEqual([validEnglishWord]);
  });

  // --- Default language behavior ---
  it('defaults to korean when no language is specified', () => {
    const rawWord = { korean: '사과', reading: 'ซากวา', romanization: 'sagwa', english: 'apple', thai: 'แอปเปิ้ล' };
    const content = JSON.stringify([rawWord]);
    const result = parseFeedResponse(content);
    expect(result).toEqual([validWord]);
  });
});
