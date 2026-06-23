import { describe, expect, it } from 'vitest';
import { LANG_PROMPT, isValidTargetLanguage } from '../utils/languagePrompt';
import type { TargetLanguage } from '@/app/_lib/types/wordTypes';

describe('LANG_PROMPT', () => {
  const cases: [TargetLanguage, string][] = [
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
  it('accepts the supported language', () => {
    expect(isValidTargetLanguage('english')).toBe(true);
  });

  it('rejects other languages', () => {
    expect(isValidTargetLanguage('korean')).toBe(false);
    expect(isValidTargetLanguage('japanese')).toBe(false);
    expect(isValidTargetLanguage('chinese')).toBe(false);
    expect(isValidTargetLanguage('thai')).toBe(false);
    expect(isValidTargetLanguage(undefined)).toBe(false);
    expect(isValidTargetLanguage(42)).toBe(false);
  });
});

