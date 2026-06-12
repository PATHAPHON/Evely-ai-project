import type { IdentifySuccessResponse } from '../../flashcard/_lib/types';
import type { SaveWordInput } from '@/app/learn/_lib/useWordStorage';
import type { ChatSuccessResponse } from '@/app/chat/_lib/types';

/**
 * Extracts the target-language text from an identify response for word
 * extraction. Pronunciation/romanization fields (ipa, romaji, romanization,
 * pinyin) are intentionally excluded — they are written in Latin letters and
 * would otherwise fragment into spurious single-letter "words" (e.g. the IPA
 * "/ˈpɜːr.sən/" yielding p, r, s, n) when extracting English.
 */
export function extractAllTextFromResponse(data: IdentifySuccessResponse): string {
  const parts: string[] = [data.label || ''];

  if ('word' in data) {
    parts.push(data.word || '');
  }

  return parts.join(' ');
}

/** Single-letter English words that are meaningful on their own. */
const VALID_SINGLE_LETTERS = new Set(['a', 'i']);

/**
 * Drops spurious single-character fragments from extracted English words while
 * keeping real one-letter words ("a", "i"). CJK words are left untouched since
 * a single character is a valid word there.
 */
export function filterMeaningfulWords(words: string[]): string[] {
  return words.filter(
    (w) => w.length > 1 || VALID_SINGLE_LETTERS.has(w.toLowerCase())
  );
}

/**
 * Enriches a single scanned word into a SaveWordInput by asking /api/translate
 * for its reading, romanization and translation. On any failure it falls back
 * to a minimal record that keeps the word visible and pronounceable.
 */
export async function enrichWord(
  word: string,
  headers: Record<string, string>
): Promise<SaveWordInput> {
  const fallback: SaveWordInput = { label: word, word: word };
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ text: word }),
    });
    if (!response.ok) return fallback;
    const data: ChatSuccessResponse = await response.json();
    return {
      label: data.translation || word,
      word: data.korean || word,
      ipa: data.reading || undefined,
      english: data.english || undefined,
    };
  } catch {
    return fallback;
  }
}

/**
 * Builds a save input object from the identify response for legacy mode.
 */
export function buildSaveInputFromResponse(data: IdentifySuccessResponse): { label: string; english?: string } {
  if ('word' in data) {
    return {
      label: data.label || data.word || '',
      english: data.word,
    };
  }
  return { label: data.label || '' };
}
