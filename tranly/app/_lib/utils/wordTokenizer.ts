/**
 * Word tokenizer for the Clickable Word Learning feature.
 *
 * Splits English text into individual word tokens, preserving contractions
 * and hyphenated compounds as single tokens. Strips leading/trailing
 * punctuation from the word while preserving it for visual reconstruction.
 */

/** Token produced by the tokenizer */
export interface WordToken {
  /** The clean word text (no punctuation) */
  word: string;
  /** Original text including attached punctuation */
  original: string;
  /** Punctuation before the word */
  leadingPunct: string;
  /** Punctuation after the word */
  trailingPunct: string;
  /** Whether this token is English (clickable) */
  isEnglish: boolean;
}

/**
 * Punctuation characters that are stripped from word boundaries.
 * Hyphens (-) are NOT included because they appear in hyphenated compounds.
 *
 * Apostrophes/single quotes ARE included. This is safe for contractions
 * (don't, it's) because the apostrophe is between letters and thus never
 * at the token boundary. When used as quotation marks ('hello'), they
 * appear at boundaries and are correctly stripped.
 */
const LEADING_PUNCT = /^[.,!?:;""''\u2018\u2019""()[\]{}<>…–—\/\\]+/;
const TRAILING_PUNCT = /[.,!?:;""''\u2018\u2019""()[\]{}<>…–—\/\\]+$/;

/**
 * Determines if a cleaned word is English text.
 *
 * English words contain only ASCII letters (a-z, A-Z), apostrophes
 * (for contractions like "don't"), and hyphens (for compounds like
 * "well-known"). The word must contain at least one ASCII letter.
 */
function isEnglishWord(word: string): boolean {
  if (word.length === 0) return false;
  // Must contain at least one ASCII letter
  if (!/[a-zA-Z]/.test(word)) return false;
  // Must contain only ASCII letters, apostrophes, and hyphens
  return /^[a-zA-Z'\u2019-]+$/.test(word);
}

/**
 * Tokenizes text into word tokens split on whitespace boundaries.
 *
 * Rules:
 * - Splits on whitespace
 * - Contractions (don't, it's, wouldn't) are single tokens
 * - Hyphenated compounds (well-known, self-aware) are single tokens
 * - Leading/trailing punctuation is stripped from the word but preserved
 * - Non-English characters (e.g., Thai) result in isEnglish: false
 */
export function tokenize(text: string): WordToken[] {
  if (!text) return [];

  // Split on whitespace, preserving the structure
  const rawTokens = text.split(/(\s+)/);
  const tokens: WordToken[] = [];

  for (const raw of rawTokens) {
    // Skip empty strings from split
    if (raw === '') continue;

    // Skip pure whitespace — it's not a token
    if (/^\s+$/.test(raw)) continue;

    // Extract leading and trailing punctuation
    const leadingMatch = raw.match(LEADING_PUNCT);
    const trailingMatch = raw.match(TRAILING_PUNCT);

    const leadingPunct = leadingMatch ? leadingMatch[0] : '';
    const trailingPunct = trailingMatch ? trailingMatch[0] : '';

    // Get the word between punctuation
    let word = raw;
    if (leadingPunct) {
      word = word.slice(leadingPunct.length);
    }
    if (trailingPunct) {
      word = word.slice(0, word.length - trailingPunct.length);
    }

    // Handle edge case: token is entirely punctuation
    if (word === '' && (leadingPunct || trailingPunct)) {
      tokens.push({
        word: '',
        original: raw,
        leadingPunct: raw,
        trailingPunct: '',
        isEnglish: false,
      });
      continue;
    }

    // Determine if this is an English word
    const english = isEnglishWord(word);

    tokens.push({
      word,
      original: raw,
      leadingPunct,
      trailingPunct,
      isEnglish: english,
    });
  }

  return tokens;
}

/**
 * Builds a single WordToken from an entire phrase (e.g. "good day", "up to").
 *
 * Unlike `tokenize`, this never splits on whitespace — the whole phrase becomes
 * one clickable token. Leading/trailing punctuation is stripped from the
 * boundaries but preserved for visual reconstruction. Used when the AI supplies
 * pre-grouped phrases so a multi-word collocation is learned as one unit.
 *
 * A phrase counts as English (clickable) when it contains at least one ASCII
 * letter, allowing internal spaces unlike `isEnglishWord`.
 */
export function makePhraseToken(phrase: string): WordToken {
  const original = phrase;
  const leadingMatch = phrase.match(LEADING_PUNCT);
  const trailingMatch = phrase.match(TRAILING_PUNCT);

  const leadingPunct = leadingMatch ? leadingMatch[0] : '';
  const trailingPunct = trailingMatch ? trailingMatch[0] : '';

  let word = phrase;
  if (leadingPunct) word = word.slice(leadingPunct.length);
  if (trailingPunct) word = word.slice(0, word.length - trailingPunct.length);
  word = word.trim();

  return {
    word,
    original,
    leadingPunct,
    trailingPunct,
    isEnglish: /[a-zA-Z]/.test(word),
  };
}

/**
 * Turns an AI-supplied list of phrase chunks into clean, render-ready tokens.
 *
 * The model occasionally mis-assigns punctuation — splitting it into its own
 * chunk ("you", ".") or gluing it to the start of the next chunk ("!Good to").
 * This normalizes those cases so punctuation always hugs the END of the chunk
 * it belongs to, which keeps spacing correct when chunks are joined with single
 * spaces during rendering. Each remaining English chunk becomes one clickable
 * token whose `word` (punctuation stripped) is the word-bank key.
 */
export function tokenizePhrases(phrases: string[]): WordToken[] {
  const tokens: WordToken[] = [];

  for (const phrase of phrases) {
    if (!phrase || phrase.trim() === '') continue;
    const token = makePhraseToken(phrase);
    const prev = tokens[tokens.length - 1];

    // A chunk with no letters (pure punctuation) belongs to the previous chunk.
    if (!token.isEnglish && prev) {
      const punct = token.original.trim();
      prev.trailingPunct += punct;
      prev.original += punct;
      continue;
    }

    // Leading punctuation hugs the previous chunk, not this one.
    if (token.leadingPunct && prev) {
      prev.trailingPunct += token.leadingPunct;
      prev.original += token.leadingPunct;
      token.leadingPunct = '';
      token.original = token.word + token.trailingPunct;
    }

    tokens.push(token);
  }

  return tokens;
}
