import type { ProficiencyLevel, ReplySuggestion } from '@/app/chat/_lib/types';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

export type LessonCategory =
  | 'greetings'
  | 'travel'
  | 'food'
  | 'daily'
  | 'shopping'
  | 'culture';

export interface PreLoadedLesson {
  id: string;
  titleTh: string;
  titleEn: string;
  category: LessonCategory;
  proficiencyLevel: ProficiencyLevel;
  targetLanguage: TargetLanguage;
  descriptionTh: string;
  descriptionEn: string;
  /** Key vocabulary words for this lesson's topic. */
  wordContext: string[];
  /** The conversation goal the AI works toward. */
  goal: string;
  /** Additional system prompt context for the AI. */
  systemContext: string;
  /** Icon identifier for display (Ant Design icon name). */
  icon: string;
  /** Type of lesson: ai (AI Chat) or choice (Multiple choice script) */
  type?: 'ai' | 'choice';
  /** Optional script steps for choice lessons */
  scriptSteps?: ScriptStep[];
}

export interface LessonCategoryGroup {
  category: LessonCategory;
  labelTh: string;
  labelEn: string;
  lessons: PreLoadedLesson[];
}

export interface ScriptStep {
  id: string;
  partnerMessage: string; // The Korean message spoken by the partner
  partnerReading: string; // Pronunciation / phonetic spelling in Thai
  partnerTranslation: string; // Thai translation of the partner's message
  partnerRomanization?: string; // Optional English romanization
  suggestions: ReplySuggestion[]; // List of suggested responses for the user
}
