import { describe, expect, it } from 'vitest';
import { validateInput } from './validateInput';

describe('validateInput', () => {
  it('accepts a category and defaults questionCount to 10', () => {
    expect(validateInput({ category: 'cefr' })).toEqual({
      category: 'cefr',
      topic: undefined,
      questionCount: 10,
    });
  });

  it('accepts a request with topic and questionCount 5 (level is the AI\'s job)', () => {
    expect(
      validateInput({
        category: 'cefr',
        topic: '  environment and nature ',
        questionCount: 5,
      })
    ).toEqual({
      category: 'cefr',
      topic: 'environment and nature',
      questionCount: 5,
    });
  });

  it('rejects invalid or missing category', () => {
    expect(validateInput({ category: 'tofu' })).toBeNull();
    expect(validateInput({})).toBeNull();
    expect(validateInput(null)).toBeNull();
  });

  it('rejects unsupported questionCount', () => {
    expect(validateInput({ category: 'cefr', questionCount: 7 })).toBeNull();
    expect(validateInput({ category: 'cefr', questionCount: '5' })).toBeNull();
  });

  it('rejects empty or overlong topic', () => {
    expect(validateInput({ category: 'cefr', topic: '   ' })).toBeNull();
    expect(validateInput({ category: 'cefr', topic: 'x'.repeat(61) })).toBeNull();
    expect(validateInput({ category: 'cefr', topic: 42 })).toBeNull();
  });
});
