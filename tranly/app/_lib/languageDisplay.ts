import type { TargetLanguage } from './wordTypes';

/**
 * Client-side display strings for each learning language. Used by the AI Tutor
 * hub and setup screens so user-facing copy (greetings, language names, topic
 * examples, proficiency scales) follows the active learning language instead of
 * being hardcoded to Korean.
 */
export interface LanguageDisplay {
  /** Native greeting, e.g. 안녕하세요. */
  greeting: string;
  /** Language noun in Thai, e.g. เกาหลี. */
  nameTh: string;
  /** Language noun in English, e.g. Korean. */
  nameEn: string;
  /** Topic placeholder example (Thai), e.g. อาหารเกาหลี. */
  topicExampleTh: string;
  /** Topic placeholder example (English), e.g. Korean food. */
  topicExampleEn: string;
  /** Language-appropriate proficiency test scale per level. */
  proficiency: Record<'beginner' | 'intermediate' | 'advanced', string>;
}

export const LANGUAGE_DISPLAY: Record<TargetLanguage, LanguageDisplay> = {
  english: {
    greeting: 'Hello',
    nameTh: 'อังกฤษ',
    nameEn: 'English',
    topicExampleTh: 'อาหารตะวันตก',
    topicExampleEn: 'Western food',
    proficiency: {
      beginner: 'CEFR A1-A2',
      intermediate: 'CEFR B1-B2',
      advanced: 'CEFR C1-C2',
    },
  },
};
