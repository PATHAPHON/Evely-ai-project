import type { TargetLanguage } from '@/app/_lib/wordTypes';

export interface StudySession {
  id: string;
  language: TargetLanguage;
  flashcardSetId: string;
  completedAt: number;
  cardsReviewed: number;
  
}
