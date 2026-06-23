import type { TargetLanguage } from '@/app/_lib/types/wordTypes';

export interface StudySession {
  id: string;
  language: TargetLanguage;
  flashcardSetId: string;
  completedAt: number;
  cardsReviewed: number;
  
}
