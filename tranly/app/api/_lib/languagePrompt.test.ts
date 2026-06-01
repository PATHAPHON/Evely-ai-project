import { describe, expect, it } from 'vitest';
import { LANG_PROMPT, isValidTargetLanguage } from './languagePrompt';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

describe('LANG_PROMPT', () => {
  const cases: [TargetLanguage, string][] = [
    ['korean', 'Korean'],
    ['japanese', 'Japanese'],
    ['chinese', 'Chinese'],
    ['english', 'English'],
  ];

  it.each(cases)('has a non-empty spec for %s labelled %s', (lang, label) => {
    const spec = LANG_PROMPT[lang];
    expect(spec.label).toBe(label);
    expect(spec.script.length).toBeGreaterThan(0);
    expect(spec.readingDesc.length).toBeGreaterThan(0);
    expect(spec.romanizationDesc.length).toBeGreaterThan(0);
    expect(spec.readingExample.length).toBeGreaterThan(0);
  });
});

describe('isValidTargetLanguage', () => {
  it('accepts the four supported languages', () => {
    for (const lang of ['english', 'japanese', 'korean', 'chinese']) {
      expect(isValidTargetLanguage(lang)).toBe(true);
    }
  });

  it('rejects anything else', () => {
    expect(isValidTargetLanguage('thai')).toBe(false);
    expect(isValidTargetLanguage(undefined)).toBe(false);
    expect(isValidTargetLanguage(42)).toBe(false);
  });
});
