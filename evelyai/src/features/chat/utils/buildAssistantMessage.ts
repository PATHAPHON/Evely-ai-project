import type { ChatMessage, ChatSuccessResponse } from '@/shared/types/chatTypes';

/**
 * Merge an AI chat response into the pending placeholder message, using
 * Thai translations directly from `aiResponse` or overriding from `translated`
 * when provided.
 *
 * `translated` is an optional flat batch-translate array for
 * `[...sentences, ...suggestions]` kept for backward compatibility. When omitted
 * or null, the translations already present inside `aiResponse` are used.
 */
export function buildAssistantMessage(
  pendingMessage: ChatMessage,
  aiResponse: ChatSuccessResponse,
  translated?: string[] | null,
): ChatMessage {
  const sentences = aiResponse.sentences ?? [];
  const suggestions = aiResponse.suggestions ?? [];

  const translatedSentences = translated
    ? sentences.map((s, i) => ({ ...s, translation: translated[i] ?? s.translation ?? '' }))
    : sentences;
  const translatedSuggestions = translated
    ? suggestions.map((s, i) => ({
        ...s,
        translation: translated[sentences.length + i] ?? s.translation ?? '',
      }))
    : suggestions;

  const translation = translated
    ? translatedSentences.map((s) => s.translation).join(' ')
    : (aiResponse.translation || translatedSentences.map((s) => s.translation).join(' '));

  return {
    ...pendingMessage,
    englishText: aiResponse.englishText,
    translation,
    english: aiResponse.english,
    rawText: aiResponse.englishText,
    timestamp: new Date().toISOString(),
    status: 'sent',
    suggestions: translatedSuggestions,
    sentences: translatedSentences,
    ttsText: aiResponse.ttsText,
    suggestionsLocked: aiResponse.suggestionsLocked,
  };
}
