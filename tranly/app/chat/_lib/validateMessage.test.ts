import { describe, it, expect } from 'vitest';
import { validateMessage } from './validateMessage';

describe('validateMessage', () => {
  it('accepts a non-empty message within 500 characters', () => {
    expect(validateMessage('hello')).toBe(true);
  });

  it('accepts a message of exactly 500 characters', () => {
    expect(validateMessage('a'.repeat(500))).toBe(true);
  });

  it('rejects a message exceeding 500 characters', () => {
    expect(validateMessage('a'.repeat(501))).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(validateMessage('')).toBe(false);
  });

  it('rejects a whitespace-only string', () => {
    expect(validateMessage('   ')).toBe(false);
    expect(validateMessage('\t\n')).toBe(false);
  });

  it('trims whitespace before checking length', () => {
    expect(validateMessage('  hi  ')).toBe(true);
  });

  it('accepts a single non-whitespace character', () => {
    expect(validateMessage('a')).toBe(true);
  });
});
