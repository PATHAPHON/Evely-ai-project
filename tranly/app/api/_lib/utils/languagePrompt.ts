import type { TargetLanguage } from '@/app/_lib/types/wordTypes';

/**
 * Per-language descriptors used to build the AI chat/lesson prompts. Each spec
 * tells the model how to fill the response fields for the chosen learning language.
 * `englishText` = the target-language sentence.
 */
export interface LangPromptSpec {
  /** Human-readable language name, e.g. "English". */
  label: string;
  /** Writing system to produce for the `englishText` (target text) field. */
  script: string;
}

export const LANG_PROMPT: Record<TargetLanguage, LangPromptSpec> = {
  english: {
    label: 'English',
    script: 'English',
  },
};

const VALID_LANGUAGES: readonly TargetLanguage[] = [
  'english',
];

export function isValidTargetLanguage(v: unknown): v is TargetLanguage {
  return typeof v === 'string' && VALID_LANGUAGES.includes(v as TargetLanguage);
}
