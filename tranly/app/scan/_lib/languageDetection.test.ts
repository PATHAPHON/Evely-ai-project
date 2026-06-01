import { describe, it, expect } from 'vitest';
import {
  CHARACTER_RANGES,
  extractWordsForLanguage,
  detectTextLanguage,
} from './languageDetection';

describe('languageDetection', () => {
  describe('CHARACTER_RANGES', () => {
    it('should contain entries for all four supported languages', () => {
      const languages = CHARACTER_RANGES.map((r) => r.language);
      expect(languages).toContain('japanese');
      expect(languages).toContain('korean');
      expect(languages).toContain('chinese');
      expect(languages).toContain('english');
    });

    it('should match Japanese hiragana, katakana, and kanji', () => {
      const japaneseRange = CHARACTER_RANGES.find((r) => r.language === 'japanese')!;
      expect(japaneseRange.regex.test('あ')).toBe(true); // Hiragana
      expect(japaneseRange.regex.test('カ')).toBe(true); // Katakana
      expect(japaneseRange.regex.test('漢')).toBe(true); // Kanji
      expect(japaneseRange.regex.test('a')).toBe(false);
    });

    it('should match Korean hangul syllables and jamo', () => {
      const koreanRange = CHARACTER_RANGES.find((r) => r.language === 'korean')!;
      expect(koreanRange.regex.test('한')).toBe(true); // Hangul syllable
      expect(koreanRange.regex.test('ㄱ')).toBe(true); // Compatibility Jamo
      expect(koreanRange.regex.test('a')).toBe(false);
    });

    it('should match Chinese CJK ideographs', () => {
      const chineseRange = CHARACTER_RANGES.find((r) => r.language === 'chinese')!;
      expect(chineseRange.regex.test('中')).toBe(true); // CJK Unified
      expect(chineseRange.regex.test('a')).toBe(false);
    });

    it('should match English Latin letters', () => {
      const englishRange = CHARACTER_RANGES.find((r) => r.language === 'english')!;
      expect(englishRange.regex.test('A')).toBe(true);
      expect(englishRange.regex.test('z')).toBe(true);
      expect(englishRange.regex.test('1')).toBe(false);
      expect(englishRange.regex.test('한')).toBe(false);
    });
  });

  describe('extractWordsForLanguage', () => {
    it('should extract Japanese words from mixed text', () => {
      const text = 'Hello こんにちは world 世界';
      const result = extractWordsForLanguage(text, 'japanese');
      expect(result).toContain('こんにちは');
      expect(result).toContain('世界');
      expect(result).not.toContain('Hello');
      expect(result).not.toContain('world');
    });

    it('should extract Korean words from mixed text', () => {
      const text = '안녕하세요 Hello 세계';
      const result = extractWordsForLanguage(text, 'korean');
      expect(result).toContain('안녕하세요');
      expect(result).toContain('세계');
      expect(result).not.toContain('Hello');
    });

    it('should extract Chinese characters from mixed text', () => {
      const text = '你好 Hello 世界';
      const result = extractWordsForLanguage(text, 'chinese');
      expect(result).toContain('你好');
      expect(result).toContain('世界');
      expect(result).not.toContain('Hello');
    });

    it('should extract English words from mixed text', () => {
      const text = 'Hello こんにちは world 世界';
      const result = extractWordsForLanguage(text, 'english');
      expect(result).toContain('Hello');
      expect(result).toContain('world');
      expect(result).not.toContain('こんにちは');
    });

    it('should return empty array for empty text', () => {
      expect(extractWordsForLanguage('', 'english')).toEqual([]);
    });

    it('should return empty array when no characters match', () => {
      expect(extractWordsForLanguage('Hello world', 'korean')).toEqual([]);
    });
  });

  describe('detectTextLanguage', () => {
    it('should detect Japanese text with kana', () => {
      expect(detectTextLanguage('こんにちは世界')).toBe('japanese');
    });

    it('should detect Korean text', () => {
      expect(detectTextLanguage('안녕하세요')).toBe('korean');
    });

    it('should detect Chinese text (CJK without kana)', () => {
      expect(detectTextLanguage('你好世界')).toBe('chinese');
    });

    it('should detect English text', () => {
      expect(detectTextLanguage('Hello world')).toBe('english');
    });

    it('should return null for empty text', () => {
      expect(detectTextLanguage('')).toBeNull();
    });

    it('should return null for text with no matching characters', () => {
      expect(detectTextLanguage('123 !@#')).toBeNull();
    });

    it('should detect predominant language in mixed text', () => {
      // More Korean than English
      expect(detectTextLanguage('안녕하세요 세계 hi')).toBe('korean');
    });
  });
});
