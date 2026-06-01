# Implementation Plan: Multi-Language Game

## Overview

This plan implements multi-language support (English, Japanese, Korean, Chinese) for the Tarnly vocabulary learning app. The implementation progresses from core data layer changes (types, database migration, context) through feature-level updates (feed, flashcards, scan, stats) to final integration and wiring. Each task builds incrementally on previous steps.

## Tasks

- [x] 1. Define core types and interfaces
  - [x] 1.1 Create TargetLanguage type and word record interfaces
    - Create `app/_lib/wordTypes.ts` with `TargetLanguage` union type, `BaseWordRecord` interface, and language-specific interfaces (`JapaneseWordRecord`, `KoreanWordRecord`, `ChineseWordRecord`, `EnglishWordRecord`)
    - Export the discriminated union `WordRecord` type
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 1.2 Create feed word type interfaces
    - Extend `app/home/_lib/types.ts` with `BaseFeedWord` interface and language-specific feed word interfaces (`JapaneseFeedWord`, `KoreanFeedWord`, `ChineseFeedWord`, `EnglishFeedWord`)
    - Export the discriminated union `FeedWord` type
    - _Requirements: 3.1, 3.2_

  - [x] 1.3 Create flashcard set and study session interfaces
    - Add `language: TargetLanguage` field to `FlashcardSet` interface in `app/learn/_lib/useFlashcardSets.ts`
    - Create `app/_lib/studySessionTypes.ts` with `StudySession` interface
    - _Requirements: 4.1, 8.3_

  - [x]* 1.4 Write property test for word record schema completeness
    - **Property 6: Word record schema completeness**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
    - Create `app/_lib/__tests__/wordSchema.property.test.ts`
    - Generate valid WordRecords for each language type and verify all required fields are present and non-undefined

- [x] 2. Implement ActiveLanguageContext and database migration
  - [x] 2.1 Create ActiveLanguageContext provider
    - Create `app/_lib/ActiveLanguageContext.tsx` with `ActiveLanguageContext`, `ActiveLanguageProvider`, and `useActiveLanguage` hook
    - Persist selection to localStorage under key `tarnly:active-language`
    - Default to `'korean'` when no value exists in localStorage
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 2.2 Upgrade IndexedDB schema to version 8
    - Modify `app/_lib/db.ts`: bump `DB_VERSION` to 8, add `language` index to `words`, `feed-words`, and `flashcard-sets` stores
    - Create `study-sessions` store with indexes on `language` and `completedAt`
    - Add compound index `language_date` on `feed-words` store
    - Migrate existing records by adding `language: 'korean'` to all records in `words`, `feed-words`, and `flashcard-sets`
    - _Requirements: 2.1, 2.2_

  - [x] 2.3 Create language-filtered query helper
    - Add `queryByLanguage<T>(db, storeName, language)` function to `app/_lib/db.ts`
    - Use IndexedDB index-based cursor for efficient filtering
    - _Requirements: 2.3, 6.3_

  - [x]* 2.4 Write property test for language selection round-trip
    - **Property 1: Language selection round-trip**
    - **Validates: Requirements 1.2, 1.3**
    - Create `app/_lib/__tests__/activeLanguage.property.test.ts`
    - Generate random TargetLanguage values, persist via setActiveLanguage, verify read-back matches

  - [x]* 2.5 Write property test for language-filtered query isolation
    - **Property 2: Language-filtered query isolation**
    - **Validates: Requirements 2.3, 3.2, 3.3, 4.2, 6.2**
    - Create `app/_lib/__tests__/languageFilter.property.test.ts`
    - Generate arrays of records with random language assignments, query by specific language, verify only matching records returned

  - [x]* 2.6 Write property test for save associates active language
    - **Property 3: Save associates active language**
    - **Validates: Requirements 2.2, 4.1, 7.2**
    - Create `app/_lib/__tests__/languageSave.property.test.ts`
    - Generate random word inputs + random active language, save, verify stored record's language field matches active language

  - [x]* 2.7 Write property test for inactive language data preservation
    - **Property 4: Inactive language data preservation**
    - **Validates: Requirements 2.4, 4.4**
    - Create `app/_lib/__tests__/dataPreservation.property.test.ts`
    - Generate multi-language record sets, perform operations on one language, verify other language records unchanged

- [x] 3. Checkpoint - Core data layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Global Language Selector component
  - [x] 4.1 Create GlobalLanguageSelector component
    - Create `app/_components/GlobalLanguageSelector.tsx` displaying 4 language options with native names and flag icons
    - Visually distinguish the current Active_Language (e.g., highlighted border or background)
    - Call `setActiveLanguage` from context on selection
    - Display confirmation toast for at least 2 seconds on switch
    - _Requirements: 1.1, 1.5, 6.1, 6.4_

  - [x] 4.2 Integrate ActiveLanguageProvider and GlobalLanguageSelector into app layout
    - Wrap app in `ActiveLanguageProvider` in `app/layout.tsx`
    - Add `GlobalLanguageSelector` as a persistent UI element accessible from every screen
    - _Requirements: 6.1, 6.2_

  - [x]* 4.3 Write unit tests for GlobalLanguageSelector
    - Test that 4 language options render
    - Test visual distinction for active language
    - Test language switch triggers context update
    - Test confirmation toast displays on switch
    - _Requirements: 1.1, 1.5, 6.4_

- [x] 5. Implement language-aware word feed
  - [x] 5.1 Update feed generation logic for multi-language
    - Modify feed API route (`app/api/feed`) to accept `language` parameter in request body
    - Generate language-appropriate vocabulary based on the requested language
    - Store generated feed words with `language` field
    - _Requirements: 3.1, 3.2_

  - [x] 5.2 Implement shouldFetchToday with language awareness
    - Update the feed check logic to query by both `language` and `generatedDate`
    - Return `false` if entries already exist for the current date and active language
    - Implement 30-day retention policy per language
    - _Requirements: 3.4, 3.5_

  - [x] 5.3 Update home page feed display to filter by active language
    - Modify `app/home/page.tsx` and related components to use `useActiveLanguage` hook
    - Filter displayed feed words by active language using `queryByLanguage`
    - Handle feed generation errors by retaining existing entries and showing error message
    - _Requirements: 3.3, 3.6_

  - [x]* 5.4 Write property test for feed generation idempotence
    - **Property 5: Feed generation idempotence**
    - **Validates: Requirements 3.5**
    - Create `app/home/_lib/__tests__/feedIdempotence.property.test.ts`
    - Generate random dates and languages with pre-existing feed data, verify shouldFetchToday returns false

- [x] 6. Implement language-aware flashcard sets and study sessions
  - [x] 6.1 Update flashcard set creation and display
    - Modify `app/learn/_lib/useFlashcardSets.ts` to include `language` field when creating sets
    - Filter displayed flashcard sets by active language
    - Show empty state when no sets exist for active language
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 6.2 Implement study session tracking
    - Create `app/_lib/useStudySessions.ts` hook for recording study sessions
    - Record a study session when user reviews at least 1 card in a flashcard set
    - Store session with `language`, `flashcardSetId`, `completedAt`, and `cardsReviewed`
    - _Requirements: 8.3_

  - [x]* 6.3 Write unit tests for flashcard set language filtering
    - Test sets are created with active language
    - Test only active language sets are displayed
    - Test empty state for language with no sets
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 7. Checkpoint - Feed and flashcards
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement language-aware text scanner
  - [x] 8.1 Create language character detection module
    - Create `app/scan/_lib/languageDetection.ts` with `CHARACTER_RANGES`, `extractWordsForLanguage`, and `detectTextLanguage` functions
    - Implement character set regex patterns for Japanese, Korean, Chinese, and English
    - _Requirements: 7.1, 7.4_

  - [x] 8.2 Update scan flow to use active language filtering
    - Modify scan preview components to extract only words matching the active language's character set
    - Display selectable word list within 5 seconds, supporting up to 50 words
    - Show mismatch message when no characters match active language, suggest switching
    - Save selected words as WordRecords in the active language's store
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 8.3 Update identify API route for multi-language
    - Modify `app/api/identify` route to accept `language` parameter
    - Return language-appropriate word identification results
    - _Requirements: 7.1, 7.2_

  - [x]* 8.4 Write property test for language-aware text extraction
    - **Property 9: Language-aware text extraction**
    - **Validates: Requirements 7.1, 7.3, 7.4**
    - Create `app/scan/_lib/__tests__/languageExtraction.property.test.ts`
    - Generate mixed-language text strings, verify only characters from the target language's character set are returned

- [x] 9. Implement language-aware word card display
  - [x] 9.1 Create language-specific word card renderer
    - Implement word card component that renders fields based on the active language type
    - Display fields in order: native script → pronunciation guide → translation
    - Show placeholder indicator for empty required fields
    - _Requirements: 5.5, 5.6_

  - [x]* 9.2 Write property test for word card field ordering
    - **Property 7: Word card field ordering**
    - **Validates: Requirements 5.5**
    - Create `app/_lib/__tests__/fieldOrdering.property.test.ts`
    - Generate all TargetLanguage values, verify display fields returned in order [native script, pronunciation guide, translation]

  - [x]* 9.3 Write property test for incomplete record graceful rendering
    - **Property 8: Incomplete record graceful rendering**
    - **Validates: Requirements 5.6**
    - Create `app/_lib/__tests__/incompleteRecord.property.test.ts`
    - Generate WordRecords with random empty fields, verify placeholder shown for empty fields and non-empty fields still display

- [x] 10. Implement per-language learning statistics
  - [x] 10.1 Create language-aware statistics hook
    - Create or extend `app/profile/_lib/useLearningStats.ts` to compute stats per active language
    - Count WordRecords, FlashcardSets, and StudySessions for the active language only
    - Display zero for each statistic when no data exists
    - Update stats within 500ms on language switch
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

  - [x]* 10.2 Write property test for per-language statistics accuracy
    - **Property 10: Per-language statistics accuracy**
    - **Validates: Requirements 8.1, 8.2**
    - Create `app/profile/_lib/__tests__/languageStats.property.test.ts`
    - Generate multi-language record collections, verify statistics count only records matching the queried language

- [x] 11. Integration and error handling
  - [x] 11.1 Implement language switch error handling and rollback
    - Add error boundary logic: if data load exceeds 500ms or IndexedDB query fails, revert to previous language and show error toast
    - Implement IndexedDB write error handling: display error message, preserve user input
    - _Requirements: 2.5, 6.5_

  - [x] 11.2 Wire all components together with ActiveLanguageContext
    - Ensure home page, learn page, scan page, and profile page all consume `useActiveLanguage`
    - Verify content updates reactively on language switch across all screens
    - Ensure language switch completes within 500ms
    - _Requirements: 6.2, 6.3_

  - [x]* 11.3 Write integration tests for language switch flow
    - Test language switch updates all displayed content
    - Test language switch completes within 500ms
    - Test DB migration from v7 to v8 preserves existing Korean data
    - Test profile stats update within 500ms on language switch
    - _Requirements: 6.2, 6.3, 8.5_

- [x] 12. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript, Next.js, IndexedDB, and Vitest with fast-check for property-based testing
- All existing test dependencies (vitest, fast-check, fake-indexeddb, @testing-library/react) are already installed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4", "2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.6"] },
    { "id": 3, "tasks": ["2.5", "2.7", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3"] },
    { "id": 5, "tasks": ["5.1", "5.2", "6.1", "8.1"] },
    { "id": 6, "tasks": ["5.3", "5.4", "6.2", "6.3", "8.2", "8.3"] },
    { "id": 7, "tasks": ["8.4", "9.1", "10.1"] },
    { "id": 8, "tasks": ["9.2", "9.3", "10.2"] },
    { "id": 9, "tasks": ["11.1", "11.2"] },
    { "id": 10, "tasks": ["11.3"] }
  ]
}
```
