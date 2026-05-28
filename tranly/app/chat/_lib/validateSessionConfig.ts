import type { SessionConfig, ProficiencyLevel } from './types';
import { validateTopic } from './validateTopic';

const VALID_LEVELS: ProficiencyLevel[] = ['beginner', 'intermediate', 'advanced'];

/**
 * Validates whether a session configuration is valid.
 * Returns true if the topic is valid (2-100 chars after trim) AND a valid proficiency level is selected.
 */
export function validateSessionConfig(config: SessionConfig): boolean {
  return (
    validateTopic(config.topic) &&
    VALID_LEVELS.includes(config.proficiencyLevel)
  );
}
