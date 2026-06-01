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
  korean: {
    greeting: '안녕하세요',
    nameTh: 'เกาหลี',
    nameEn: 'Korean',
    topicExampleTh: 'อาหารเกาหลี',
    topicExampleEn: 'Korean food',
    proficiency: {
      beginner: 'TOPIK 1-2',
      intermediate: 'TOPIK 3-4',
      advanced: 'TOPIK 5-6',
    },
  },
  japanese: {
    greeting: 'こんにちは',
    nameTh: 'ญี่ปุ่น',
    nameEn: 'Japanese',
    topicExampleTh: 'อาหารญี่ปุ่น',
    topicExampleEn: 'Japanese food',
    proficiency: {
      beginner: 'JLPT N5-N4',
      intermediate: 'JLPT N3-N2',
      advanced: 'JLPT N1',
    },
  },
  chinese: {
    greeting: '你好',
    nameTh: 'จีน',
    nameEn: 'Chinese',
    topicExampleTh: 'อาหารจีน',
    topicExampleEn: 'Chinese food',
    proficiency: {
      beginner: 'HSK 1-2',
      intermediate: 'HSK 3-4',
      advanced: 'HSK 5-6',
    },
  },
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
