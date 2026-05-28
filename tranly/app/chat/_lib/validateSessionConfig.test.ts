import { describe, it, expect } from 'vitest';
import { validateSessionConfig } from './validateSessionConfig';
import type { SessionConfig } from './types';

const validConfig: SessionConfig = {
  topic: 'Korean food',
  proficiencyLevel: 'beginner',
  wordContext: [],
};

describe('validateSessionConfig', () => {
  it('accepts a config with valid topic and valid proficiency level', () => {
    expect(validateSessionConfig(validConfig)).toBe(true);
  });

  it('accepts all valid proficiency levels', () => {
    expect(validateSessionConfig({ ...validConfig, proficiencyLevel: 'beginner' })).toBe(true);
    expect(validateSessionConfig({ ...validConfig, proficiencyLevel: 'intermediate' })).toBe(true);
    expect(validateSessionConfig({ ...validConfig, proficiencyLevel: 'advanced' })).toBe(true);
  });

  it('rejects a config with topic too short', () => {
    expect(validateSessionConfig({ ...validConfig, topic: 'a' })).toBe(false);
  });

  it('rejects a config with topic too long', () => {
    expect(validateSessionConfig({ ...validConfig, topic: 'a'.repeat(101) })).toBe(false);
  });

  it('rejects a config with empty topic', () => {
    expect(validateSessionConfig({ ...validConfig, topic: '' })).toBe(false);
  });

  it('rejects a config with whitespace-only topic', () => {
    expect(validateSessionConfig({ ...validConfig, topic: '   ' })).toBe(false);
  });

  it('rejects a config with invalid proficiency level', () => {
    expect(
      validateSessionConfig({ ...validConfig, proficiencyLevel: 'expert' as never })
    ).toBe(false);
  });
});
