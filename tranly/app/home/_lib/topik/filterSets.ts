import type { FilterValue, QuestionBankSetMeta } from './types';

/**
 * Filters question bank sets by exam type.
 * Returns all sets when filter is 'all', otherwise returns only sets matching the filter.
 */
export function filterSets(
  sets: QuestionBankSetMeta[],
  filter: FilterValue
): QuestionBankSetMeta[] {
  if (filter === 'all') return sets;
  return sets.filter((s) => s.examType === filter);
}
