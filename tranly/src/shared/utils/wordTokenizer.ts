/**
 * Word tokenizer for the Clickable Word Learning feature.
 *
 * Splits English text into individual word tokens, preserving contractions
 * and hyphenated compounds as single tokens. Strips leading/trailing
 * punctuation from the word while preserving it for visual reconstruction.
 */

/**
 * A single token with its clickability and display behavior.
 * Word-specific rules (English detection, punctuation stripping) live
 * together with the token data.
 */
export class WordToken {
  readonly word: string;
  readonly original: string;
  readonly leadingPunct: string;
  readonly trailingPunct: string;
  readonly isEnglish: boolean;

  constructor(t: {
    word: string;
    original: string;
    leadingPunct: string;
    trailingPunct: string;
  }) {
    this.word = t.word;
    this.original = t.original;
    this.leadingPunct = t.leadingPunct;
    this.trailingPunct = t.trailingPunct;
    this.isEnglish = isEnglishWord(t.word);
  }

  /** Whether this token is an English word the user can tap/learn. */
  isClickable(): boolean {
    return this.isEnglish && this.word.length > 0;
  }

  /** The text to display (preserves original punctuation). */
  displayText(): string {
    return this.original;
  }

  /** Rebuild the original text from punctuation + word + punctuation. */
  reconstruct(): string {
    return this.leadingPunct + this.word + this.trailingPunct;
  }
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
      tokens.push(
        new WordToken({
          word: '',
          original: raw,
          leadingPunct: raw,
          trailingPunct: '',
        })
      );
      continue;
    }

    tokens.push(
      new WordToken({
        word,
        original: raw,
        leadingPunct,
        trailingPunct,
      })
    );
  }

  return tokens;
}