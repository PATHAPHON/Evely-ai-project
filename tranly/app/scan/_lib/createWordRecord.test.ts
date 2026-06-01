import { describe, it, expect } from 'vitest';
import { createWordRecord } from './createWordRecord';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

describe('createWordRecord', () => {
  const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

  it('should create a Japanese word record with kanji field populated', () => {
    const record = createWordRecord('漢字', 'japanese', mockBlob);
    expect(record.language).toBe('japanese');
    expect(record.kanji).toBe('漢字');
    expect(record.hiragana).toBe('');
    expect(record.romaji).toBe('');
    expect(record.thaiTranslation).toBe('');
    expect(record.imageBlob).toBe(mockBlob);
    expect(record.id).toBeDefined();
    expect(record.createdAt).toBeGreaterThan(0);
  });

  it('should create a Korean word record with hangul field populated', () => {
    const record = createWordRecord('한국어', 'korean', mockBlob);
    expect(record.language).toBe('korean');
    expect(record.hangul).toBe('한국어');
    expect(record.thaiReading).toBe('');
    expect(record.romanization).toBe('');
    expect(record.thaiTranslation).toBe('');
  });

  it('should create a Chinese word record with hanzi field populated', () => {
    const record = createWordRecord('中文', 'chinese', mockBlob);
    expect(record.language).toBe('chinese');
    expect(record.hanzi).toBe('中文');
    expect(record.pinyin).toBe('');
    expect(record.thaiTranslation).toBe('');
  });

  it('should create an English word record with word field populated', () => {
    const record = createWordRecord('hello', 'english', mockBlob);
    expect(record.language).toBe('english');
    expect(record.word).toBe('hello');
    expect(record.ipa).toBe('');
    expect(record.thaiTranslation).toBe('');
  });

  it('should handle null imageBlob', () => {
    const record = createWordRecord('test', 'english', null);
    expect(record.imageBlob).toBeNull();
  });

  it('should generate unique IDs for each record', () => {
    const record1 = createWordRecord('word1', 'english', null);
    const record2 = createWordRecord('word2', 'english', null);
    expect(record1.id).not.toBe(record2.id);
  });

  it('should always include the language field matching the input', () => {
    const languages: TargetLanguage[] = ['english', 'japanese', 'korean', 'chinese'];
    for (const lang of languages) {
      const record = createWordRecord('test', lang, null);
      expect(record.language).toBe(lang);
    }
  });
});
