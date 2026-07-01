import type { ChatMessage, ChatSuccessResponse } from '../types/types';

/**
 * Merge an AI chat response into the pending placeholder message, filling in
 * Thai translations when available.
 *
 * `translated` is the flat batch-translate result for
 * `[...sentences, ...suggestions]` (sentences first, then suggestions), or
 * `null` when translations aren't ready yet — in which case the original
 * (untranslated) sentences/suggestions are kept.
 */
export function buildAssistantMessage(
  pendingMessage: ChatMessage,
  aiResponse: ChatSuccessResponse,
  translated: string[] | null,
): ChatMessage {
  const sentences = aiResponse.sentences ?? [];
  const suggestions = aiResponse.suggestions ?? [];

  const translatedSentences = translated
    ? sentences.map((s, i) => ({ ...s, translation: translated[i] ?? '' }))
    : sentences;
  const translatedSuggestions = translated
    ? suggestions.map((s, i) => ({
        ...s,
        translation: translated[sentences.length + i] ?? '',
      }))
    : suggestions;

  return {
    ...pendingMessage,
    englishText: aiResponse.englishText,
    translation: translatedSentences.map((s) => s.translation).join(' '),
    english: aiResponse.english,
    rawText: aiResponse.englishText,
    timestamp: new Date().toISOString(),
    status: 'sent',
    suggestions: translatedSuggestions,
    sentences: translatedSentences,
    suggestionsLocked: aiResponse.suggestionsLocked,
  };
}
