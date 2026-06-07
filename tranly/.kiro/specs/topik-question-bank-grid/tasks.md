# Implementation Plan: TOPIK Question Bank Grid

## Overview

Refactor TOPIK exam practice UI from level-selection → inline-exam to a question bank grid. Replace ExamTypeSelector in TopikPractice with a QuestionBankGrid showing 10 mock exam cards (5 TOPIK I + 5 TOPIK II) with category filter chips. Tapping a card navigates to a dedicated exam page at `/topik/[examId]`. Uses TypeScript, Next.js App Router, Tailwind CSS with neubrutalism styling, and reuses existing ReadingQuestion, ListeningQuestion, ScoreSummary components and useTopikExam hook.

## Tasks

- [x] 1. Extend types and create mock data
  - [x] 1.1 Add `QuestionBankSetMeta` interface and `FilterValue` type to `app/home/_lib/topik/types.ts`
    - Add `QuestionBankSetMeta` with fields: id, examType, nameKey, questionCount, difficultyKey
    - Add `FilterValue` type: `'all' | 'topik1' | 'topik2'`
    - _Requirements: 6.1_

  - [x] 1.2 Create `app/home/_lib/topik/questionBankSets.ts` with 10 mock exam set metadata entries
    - 5 TOPIK I sets (beginner difficulty) and 5 TOPIK II sets (intermediate/advanced difficulty)
    - Each entry has unique id, examType, nameKey, questionCount of 10, and difficultyKey
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 1.3 Create `filterSets` pure function in `app/home/_lib/topik/filterSets.ts`
    - Implement: returns all sets when filter is `'all'`, otherwise filters by examType
    - Export the function for use by QuestionBankGrid
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 2. Add localization keys
  - [x] 2.1 Extend `UIStrings.topik` interface in `app/_lib/strings.ts` with new keys
    - Add: filterAll, filterTopik1, filterTopik2, setName (function), difficultyBeginner, difficultyIntermediate, difficultyAdvanced, questionsCount (function), examPageBack, progress (function)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 2.2 Add English values for the new topik keys in the `en` object
    - Provide English translations matching the design spec
    - _Requirements: 7.2_

  - [x] 2.3 Add Thai values for the new topik keys in the `th` object
    - Provide Thai translations matching the design spec
    - _Requirements: 7.1_

- [x] 3. Checkpoint - Ensure types, data, and localization compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement grid UI components
  - [x] 4.1 Create `app/home/_components/TopikPractice/CategoryFilter.tsx`
    - Render 3 filter chips ("All", "TOPIK I", "TOPIK II") using localized labels from useStrings()
    - Active chip uses `bg-accent-pink-bg border-border-color` styling
    - Accept `activeFilter` and `onFilterChange` props
    - _Requirements: 2.1, 2.2, 2.6, 7.2_

  - [x] 4.2 Create `app/home/_components/TopikPractice/QuestionBankCard.tsx`
    - Display exam set name, question count badge, and difficulty label using localized strings
    - Neubrutalism styling: `rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] shadow-nb-sm`
    - Press state: `active:translate-y-[2px] active:shadow-none`
    - Accept `set: QuestionBankSetMeta` and `onTap` props
    - _Requirements: 1.2, 1.5, 1.6, 7.4_

  - [x] 4.3 Create `app/home/_components/TopikPractice/QuestionBankGrid.tsx`
    - Manage internal `activeFilter` state defaulting to `'all'`
    - Render CategoryFilter + responsive CSS grid of QuestionBankCard components
    - Grid uses `grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))` with 12px gap
    - Use `filterSets` to compute visible cards
    - On card tap, navigate to `/topik/${examId}` using Next.js router
    - _Requirements: 1.1, 1.4, 2.7, 3.1, 8.1, 8.2, 8.3_

- [x] 5. Replace ExamTypeSelector with QuestionBankGrid in TopikPractice
  - [x] 5.1 Modify `app/home/_components/TopikPractice/TopikPractice.tsx` to render QuestionBankGrid instead of ExamTypeSelector when examState is `'selecting'`
    - Remove ExamTypeSelector import, add QuestionBankGrid import
    - Render QuestionBankGrid in the selecting state
    - _Requirements: 1.1, 1.4_

- [x] 6. Checkpoint - Ensure grid renders on Home tab 3
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement exam page route
  - [x] 7.1 Create `app/topik/[examId]/page.tsx` as a Next.js App Router page
    - Resolve examId from route params using `React.use(params)`
    - Look up QuestionBankSetMeta by ID from questionBankSets
    - Call `useTopikExam().startExam(set.examType)` on mount via useEffect
    - Render ExamHeader + ReadingQuestion/ListeningQuestion + ScoreSummary
    - Show "Not Found" message with link back to Home if examId is invalid
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 7.2 Create `app/home/_components/TopikPractice/ExamHeader.tsx`
    - Display back button (← icon) calling router.back()
    - Show exam name (centered, bold) and progress text "current/total" when not completed
    - Neubrutalism styling: `border-b-3 border-border-color bg-white dark:bg-[#1a1a2e]`
    - Accept props: examName, currentQuestion, totalQuestions, isCompleted, onBack
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.3_

- [x] 8. Checkpoint - Ensure exam page navigation works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Property-based tests
  - [ ]* 9.1 Write property test for filterSets correctness
    - **Property 1: Filter function correctness**
    - For any array of QuestionBankSetMeta and any FilterValue, filterSets returns exactly those items matching the filter or all when 'all'
    - **Validates: Requirements 2.3, 2.4, 2.5**

  - [ ]* 9.2 Write property test for card content completeness
    - **Property 2: Card content completeness**
    - For any valid QuestionBankSetMeta, rendering QuestionBankCard produces output containing name, question count, and difficulty
    - **Validates: Requirements 1.2**

  - [ ]* 9.3 Write property test for navigation URL correctness
    - **Property 3: Navigation URL correctness**
    - For any QuestionBankSetMeta with id X, tapping its card triggers navigation to `/topik/X`
    - **Validates: Requirements 3.1**

  - [ ]* 9.4 Write property test for ExamHeader display
    - **Property 4: Exam header displays name and progress**
    - For any exam name and valid (current, total) pair, ExamHeader displays both
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 9.5 Write property test for mock data structural validity
    - **Property 6: Mock data structural validity**
    - All IDs unique, non-empty nameKey, examType, questionCount > 0, difficultyKey present
    - **Validates: Requirements 6.1, 6.3**

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing ExamTypeSelector is replaced but not deleted — it remains in the codebase for potential future use
- All UI text uses `useStrings()` hook — no hardcoded strings
- Existing ReadingQuestion, ListeningQuestion, ScoreSummary, and useTopikExam are reused without modification on the exam page
- No new npm packages required — uses existing React, Next.js, Tailwind CSS

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "7.2"] },
    { "id": 5, "tasks": ["5.1", "7.1"] },
    { "id": 6, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5"] }
  ]
}
```
