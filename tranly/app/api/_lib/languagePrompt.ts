import type { TargetLanguage } from '@/app/_lib/wordTypes';

/**
 * Per-language descriptors used to build the AI chat/lesson prompts. The data
 * model keeps Korean-era field names (`korean`, `reading`, `romanization`), but
 * they are repurposed generically: `korean` = the target-language text,
 * `reading` = its pronunciation written in Thai script. These specs tell the
 * model how to fill each field for the chosen learning language.
 */
export interface LangPromptSpec {
  /** Human-readable language name, e.g. "Korean". */
  label: string;
  /** Writing system to produce for the `korean` (target text) field. */
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
