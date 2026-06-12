import { describe, it, expect } from 'vitest';
import { validateTopic } from '../validateTopic';

describe('validateTopic', () => {
  it('accepts a topic with trimmed length of 2 characters', () => {
    expect(validateTopic('ab')).toBe(true);
  });

  it('accepts a topic with trimmed length of 100 characters', () => {
    expect(validateTopic('a'.repeat(100))).toBe(true);
  });

  it('rejects a topic with trimmed length of 1 character', () => {
    expect(validateTopic('a')).toBe(false);
  });

  it('rejects a topic with trimmed length of 101 characters', () => {
    expect(validateTopic('a'.repeat(101))).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(validateTopic('')).toBe(false);
  });

  it('rejects a whitespace-only string', () => {
    expect(validateTopic('   ')).toBe(false);
  });

  it('trims leading and trailing whitespace before validating', () => {
    expect(validateTopic('  ab  ')).toBe(true);
  });

  it('rejects a string that is only 1 char after trimming', () => {
    expect(validateTopic('  a  ')).toBe(false);
  });
});
