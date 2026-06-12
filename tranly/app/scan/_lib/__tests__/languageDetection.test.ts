import { describe, it, expect } from 'vitest';
import {
  CHARACTER_RANGES,
  extractWordsForLanguage,
  detectTextLanguage,
} from '../languageDetection';

describe('languageDetection', () => {
  describe('CHARACTER_RANGES', () => {
    it('should contain entries for the supported language', () => {
      const languages = CHARACTER_RANGES.map((r) => r.language);
      expect(languages).toEqual(['english']);
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
    it('should extract English words from mixed text', () => {
      const text = 'Hello สวัสดี world';
      const result = extractWordsForLanguage(text, 'english');
      expect(result).toContain('Hello');
      expect(result).toContain('world');
    });

    it('should return empty array for empty text', () => {
      expect(extractWordsForLanguage('', 'english')).toEqual([]);
    });
  });

  describe('detectTextLanguage', () => {
    it('should detect English text', () => {
      expect(detectTextLanguage('Hello world')).toBe('english');
    });

    it('should return null for empty text', () => {
      expect(detectTextLanguage('')).toBeNull();
    });

    it('should return null for text with no matching characters', () => {
      expect(detectTextLanguage('123 !@#')).toBeNull();
    });
  });
});

