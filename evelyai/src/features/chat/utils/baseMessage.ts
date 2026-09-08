import type { ChatMessage } from '@/shared/types/chatTypes';
import { randomId } from '@/shared/utils/randomId';

/** Construct a ChatMessage with required empty fields pre-filled. */
export const baseMessage = (
  over: Partial<ChatMessage> & Pick<ChatMessage, 'role'>,
): ChatMessage => ({
  id: randomId(),
  englishText: '',
  translation: '',
  english: '',
  rawText: '',
  timestamp: new Date().toISOString(),
  status: 'sent',
  ...over,
});
