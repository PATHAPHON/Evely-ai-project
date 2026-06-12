/** Slash skills available from the chat input. */
export const SKILLS = [
  {
    command: '/exam',
    label: 'ทำข้อสอบ',
    description: 'สร้างข้อสอบภาษาอังกฤษตามหัวข้อ',
  },
] as const;

export type Skill = (typeof SKILLS)[number];

export interface SkillMatchState {
  skillsEnabled: boolean;
  allowInlineSkill: boolean;
  /** The currently committed skill chip, or null while none is committed. */
  committedSkill: string | null;
  inputValue: string;
}

/**
 * The "/" autocomplete is active while the user is typing the skill token —
 * a leading "/" with no space yet, and no chip committed yet. Returns the
 * skills whose command starts with the typed slash query (empty when inactive).
 */
export function getMatchingSkills({
  skillsEnabled,
  allowInlineSkill,
  committedSkill,
  inputValue,
}: SkillMatchState): readonly Skill[] {
  const slashQuery =
    skillsEnabled &&
    allowInlineSkill &&
    committedSkill === null &&
    inputValue.startsWith('/') &&
    !inputValue.includes(' ')
      ? inputValue
      : null;
  return slashQuery !== null
    ? SKILLS.filter((s) => s.command.startsWith(slashQuery))
    : [];
}

/** The message actually sent: "<skill> <topic>" when a chip is active. */
export function composeMessage(skill: string | null, inputValue: string): string {
  return skill ? `${skill} ${inputValue.trim()}`.trim() : inputValue.trim();
}

/**
 * Detects a pasted/typed "/exam " (with trailing space) that should collapse
 * into a chip. Returns the trailing topic text, or null when there's no match.
 */
export function parseInlineExam(value: string): string | null {
  const match = value.match(/^\/exam\s(.*)$/i);
  return match ? match[1] : null;
}
