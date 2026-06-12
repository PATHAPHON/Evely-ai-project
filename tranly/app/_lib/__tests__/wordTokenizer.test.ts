import { describe, it, expect } from 'vitest';
import { tokenize } from '../wordTokenizer';

describe('wordTokenizer', () => {
  describe('basic tokenization', () => {
    it('splits text on whitespace boundaries', () => {
      const tokens = tokenize('hello world');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].word).toBe('hello');
      expect(tokens[1].word).toBe('world');
    });

    it('returns empty array for empty string', () => {
      expect(tokenize('')).toEqual([]);
    });

    it('handles single word', () => {
      const tokens = tokenize('hello');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].word).toBe('hello');
      expect(tokens[0].isEnglish).toBe(true);
    });
  });

  describe('contractions', () => {
    it('preserves don\'t as a single token', () => {
      const tokens = tokenize("don't stop");
      expect(tokens).toHaveLength(2);
      expect(tokens[0].word).toBe("don't");
      expect(tokens[0].isEnglish).toBe(true);
    });

    it("preserves it's as a single token", () => {
      const tokens = tokenize("it's fine");
      expect(tokens).toHaveLength(2);
      expect(tokens[0].word).toBe("it's");
    });

    it("preserves wouldn't as a single token", () => {
      const tokens = tokenize("wouldn't you agree");
      expect(tokens).toHaveLength(3);
      expect(tokens[0].word).toBe("wouldn't");
      expect(tokens[0].isEnglish).toBe(true);
    });
  });

  describe('hyphenated compounds', () => {
    it('preserves well-known as a single token', () => {
      const tokens = tokenize('well-known fact');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].word).toBe('well-known');
      expect(tokens[0].isEnglish).toBe(true);
    });

    it('preserves self-aware as a single token', () => {
      const tokens = tokenize('self-aware machine');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].word).toBe('self-aware');
    });
  });

  describe('punctuation handling', () => {
    it('strips trailing period', () => {
      const tokens = tokenize('hello.');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].word).toBe('hello');
      expect(tokens[0].trailingPunct).toBe('.');
      expect(tokens[0].leadingPunct).toBe('');
    });

    it('strips leading opening paren', () => {
      const tokens = tokenize('(hello)');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].word).toBe('hello');
      expect(tokens[0].leadingPunct).toBe('(');
      expect(tokens[0].trailingPunct).toBe(')');
    });

    it('strips trailing comma', () => {
      const tokens = tokenize('hello, world');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].word).toBe('hello');
      expect(tokens[0].trailingPunct).toBe(',');
    });

    it('strips leading quote', () => {
      const tokens = tokenize('"hello"');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].word).toBe('hello');
      expect(tokens[0].leadingPunct).toBe('"');
      expect(tokens[0].trailingPunct).toBe('"');
    });

    it('preserves original text', () => {
      const tokens = tokenize('"hello,"');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].original).toBe('"hello,"');
    });
  });

  describe('round-trip reconstruction', () => {
    it('reconstructing from tokens preserves original text', () => {
      const text = 'Hello, world! "Don\'t you think?" Well-known fact.';
      const tokens = tokenize(text);

      // Reconstruction: join tokens back with the whitespace from original
      // Since we split on whitespace, the original can be reconstructed
      // by joining leadingPunct + word + trailingPunct for each token
      const parts = text.split(/(\s+)/);
      const nonWhitespaceParts = parts.filter(p => p !== '' && !/^\s+$/.test(p));


      // Each token's original should match the non-whitespace parts
      for (let i = 0; i < tokens.length; i++) {
        expect(tokens[i].original).toBe(nonWhitespaceParts[i]);
        expect(tokens[i].leadingPunct + tokens[i].word + tokens[i].trailingPunct).toBe(tokens[i].original);
      }
    });
  });

  describe('English detection', () => {
    it('marks English words as isEnglish: true', () => {
      const tokens = tokenize('hello world');
      expect(tokens.every(t => t.isEnglish)).toBe(true);
    });

    it('marks Thai text as isEnglish: false', () => {
      const tokens = tokenize('สวัสดี');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].isEnglish).toBe(false);
    });

    it('handles mixed English and Thai', () => {
      const tokens = tokenize('hello สวัสดี world');
      expect(tokens).toHaveLength(3);
      expect(tokens[0].isEnglish).toBe(true);
      expect(tokens[1].isEnglish).toBe(false);
      expect(tokens[2].isEnglish).toBe(true);
    });

    it('marks numbers as non-English', () => {
      const tokens = tokenize('123 hello');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].isEnglish).toBe(false);
      expect(tokens[1].isEnglish).toBe(true);
    });
  });
});
