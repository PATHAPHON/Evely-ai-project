import type { TargetLanguage } from '@/app/_lib/types/wordTypes';

/**
 * Per-language descriptors used to build the AI chat/lesson prompts. Each spec
 * tells the model how to fill the response fields for the chosen learning language.
 * `englishText` = the target-language sentence, `reading` = Thai-script pronunciation.
 */
export interface LangPromptSpec {
  /** Human-readable language name, e.g. "English". */
  label: string;
  /** Writing system to produce for the `englishText` (target text) field. */
  script: string;
  /** How to fill the `reading` field (pronunciation in Thai script). */
  readingDesc: string;
  /** Romanization scheme for the `romanization` field. */
  romanizationDesc: string;
  /** A short example used to anchor the karaoke/reading instruction. */
  readingExample: string;
}

export const LANG_PROMPT: Record<TargetLanguage, LangPromptSpec> = {
  english: {
    label: 'English',
    script: 'English',
    readingDesc:
      'the English pronunciation written in Thai-script karaoke (NOT the Thai meaning); if unsure, repeat the English text',
    romanizationDesc: 'the English text itself (English needs no romanization)',
    readingExample: 'เฮลโล for hello',
  },
};

const VALID_LANGUAGES: readonly TargetLanguage[] = [
  'english',
];

export function isValidTargetLanguage(v: unknown): v is TargetLanguage {
  return typeof v === 'string' && VALID_LANGUAGES.includes(v as TargetLanguage);
}
