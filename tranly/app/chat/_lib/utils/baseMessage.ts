import type { ChatMessage } from '../types/types';

/** Construct a ChatMessage with required empty fields pre-filled. */
export const baseMessage = (
  over: Partial<ChatMessage> & Pick<ChatMessage, 'role'>,
): ChatMessage => ({
  id: crypto.randomUUID(),
  englishText: '',
  reading: '',
  romanization: '',
  translation: '',
  english: '',
  rawText: '',
  timestamp: new Date().toISOString(),
  status: 'sent',
  ...over,
});
