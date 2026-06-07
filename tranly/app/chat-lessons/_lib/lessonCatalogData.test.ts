import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { koreanLessons, getLessonsByLanguage } from './lessonCatalogData';
import type { LessonCategory } from './types';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

/**
 * Property-based test: All pre-loaded lessons have complete required fields.
 *
 * **Validates: Requirements 6.1**
 *
 * This property verifies the invariant from the design document:
 * ∀ lesson ∈ allLessons:
 *   lesson.id !== '' ∧
 *   lesson.titleTh !== '' ∧
 *   lesson.titleEn !== '' ∧
 *   lesson.category ∈ validCategories ∧
 *   lesson.proficiencyLevel ∈ ['beginner', 'intermediate', 'advanced'] ∧
 *   lesson.wordContext.length > 0 ∧
 *   lesson.goal !== ''
 */

const validCategories: LessonCategory[] = [
  'greetings',
  'travel',
  'food',
  'daily',
  'shopping',
  'culture',
];

const validProficiencyLevels = ['beginner', 'intermediate', 'advanced'];

describe('Property: All pre-loaded lessons have complete required fields', () => {
  it('koreanLessons array is non-empty', () => {
    expect(koreanLessons.length).toBeGreaterThan(0);
  });

  koreanLessons.forEach((lesson) => {
    describe(`Lesson "${lesson.id}"`, () => {
      it('has a non-empty id', () => {
        expect(lesson.id).toBeDefined();
        expect(typeof lesson.id).toBe('string');
        expect(lesson.id.trim().length).toBeGreaterThan(0);
      });

      it('has a non-empty titleTh', () => {
        expect(lesson.titleTh).toBeDefined();
        expect(typeof lesson.titleTh).toBe('string');
        expect(lesson.titleTh.trim().length).toBeGreaterThan(0);
      });

      it('has a non-empty titleEn', () => {
        expect(lesson.titleEn).toBeDefined();
        expect(typeof lesson.titleEn).toBe('string');
        expect(lesson.titleEn.trim().length).toBeGreaterThan(0);
      });

      it('has a valid category', () => {
        expect(validCategories).toContain(lesson.category);
      });

      it('has a valid proficiencyLevel', () => {
        expect(validProficiencyLevels).toContain(lesson.proficiencyLevel);
      });

      it('has a non-empty wordContext array (at least 1 word)', () => {
        expect(Array.isArray(lesson.wordContext)).toBe(true);
        expect(lesson.wordContext.length).toBeGreaterThanOrEqual(1);
      });

      it('has a non-empty goal string', () => {
        expect(lesson.goal).toBeDefined();
        expect(typeof lesson.goal).toBe('string');
        expect(lesson.goal.trim().length).toBeGreaterThan(0);
      });
    });
  });
});

/**
 * Property-based test: `getLessonsByLanguage` filtering returns only lessons
 * matching the specified language, and grouping preserves total count.
 *
 * **Validates: Requirements 6.2**
 *
 * This property verifies design document invariants:
 * - Property 1: ∀ lesson ∈ displayedLessons: lesson.targetLanguage === activeLanguage
 * - Property 3: sum(group.lessons.length for group in categoryGroups) === filteredLessons.length
 * - Each group's category matches all lessons within that group
 */

const allTargetLanguages: TargetLanguage[] = ['english', 'japanese', 'korean', 'chinese'];

describe('Property: getLessonsByLanguage filtering and grouping', () => {
  it('returns only lessons matching the specified language (property-based)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allTargetLanguages),
        (language: TargetLanguage) => {
          const groups = getLessonsByLanguage(language);

          // Every lesson in every group must match the requested language
          for (const group of groups) {
            for (const lesson of group.lessons) {
              expect(lesson.targetLanguage).toBe(language);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns empty array for a non-existent language', () => {
    // Using a language value that doesn't exist in the data
    const groups = getLessonsByLanguage('english' as TargetLanguage);
    // English lessons don't exist in the current data set (only Korean)
    expect(groups).toEqual([]);
  });

  it('grouping preserves total count of matching lessons (property-based)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allTargetLanguages),
        (language: TargetLanguage) => {
          const groups = getLessonsByLanguage(language);

          // Count total lessons in all groups
          const totalInGroups = groups.reduce(
            (sum, group) => sum + group.lessons.length,
            0,
          );

          // Count expected lessons from source data
          const expectedCount = koreanLessons.filter(
            (lesson) => lesson.targetLanguage === language,
          ).length;

          expect(totalInGroups).toBe(expectedCount);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('each group category matches all lessons within that group (property-based)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allTargetLanguages),
        (language: TargetLanguage) => {
          const groups = getLessonsByLanguage(language);

          for (const group of groups) {
            for (const lesson of group.lessons) {
              expect(lesson.category).toBe(group.category);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
