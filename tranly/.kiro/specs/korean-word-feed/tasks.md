# Implementation Plan: Korean Word Feed

## Overview

Transform the Home page into a Korean vocabulary word feed with vertical scrollable cards, daily AI-generated words via KKU IntelSphere API, local persistence in IndexedDB, audio playback, bookmark functionality, and camera capture for word images. Implementation builds incrementally from data layer through API to UI components.

## Tasks

- [x] 1. Set up data layer and core types
  - [x] 1.1 Define TypeScript interfaces and add feed-words store to IndexedDB
    - Create `app/home/_lib/types.ts` with `FeedWord`, `FeedWordRecord`, `FeedRequest`, `FeedSuccessResponse`, and `FeedErrorResponse` interfaces as defined in the design
    - Update `app/_lib/db.ts`: bump `DB_VERSION` to 4, add `FEED_WORDS_STORE` constant, add `feed-words` object store with indexes for `generatedDate`, `korean`, and `createdAt`
    - _Requirements: 5.1, 5.3_

  - [x] 1.2 Implement `useFeedStorage` hook
    - Create `app/home/_lib/useFeedStorage.ts` following the pattern of `useWordStorage`
    - Implement `loadTodayWords()`, `saveWords()`, `updateImage()`, `toggleBookmark()`, `getAllKoreanWords()` methods
    - Use calendar-day key (YYYY-MM-DD) for `generatedDate` field
    - Expose `isLoading` and `error` state
    - _Requirements: 5.1, 5.2, 5.3, 6.2, 7.3_

  - [ ]* 1.3 Write property test for word persistence round-trip
    - **Property 6: Word persistence round-trip**
    - **Validates: Requirements 5.1, 5.3**

  - [ ]* 1.4 Write property test for bookmark toggle persistence
    - **Property 7: Bookmark toggle persistence**
    - **Validates: Requirements 6.2**

  - [ ]* 1.5 Write property test for image persistence round-trip
    - **Property 8: Image persistence round-trip**
    - **Validates: Requirements 7.3**

- [x] 2. Implement exclusion list and feed decision logic
  - [x] 2.1 Implement `useExclusionList` hook
    - Create `app/home/_lib/useExclusionList.ts`
    - Combine Hangul words from `words` store (scanned) and `feed-words` store (generated)
    - Return deduplicated `string[]` of Korean words to exclude
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.2 Implement `shouldFetchToday` utility function
    - Create `app/home/_lib/shouldFetchToday.ts`
    - Return `true` if no records with today's `generatedDate` exist in feed-words store
    - Use calendar date (YYYY-MM-DD) comparison
    - _Requirements: 2.1, 5.2_

  - [ ]* 2.3 Write property test for exclusion list correctness
    - **Property 4: Exclusion list correctness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 4.2**

  - [ ]* 2.4 Write property test for fetch decision based on date
    - **Property 5: Fetch decision based on date**
    - **Validates: Requirements 2.1, 5.2**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Feed API route
  - [x] 4.1 Create `/api/feed` route handler
    - Create `app/api/feed/route.ts` following the pattern of `/api/identify`
    - Accept POST with `{ excludeWords: string[], count: number }` body
    - Validate input (excludeWords must be array, count must be positive integer)
    - Construct KKU IntelSphere API request with prompt to generate Korean vocabulary words excluding provided words
    - Parse response and return `FeedSuccessResponse` or `FeedErrorResponse`
    - Handle timeout, rate limit, network errors with appropriate HTTP status codes
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [x] 4.2 Implement `parseFeedResponse` utility
    - Create `app/api/feed/parseFeedResponse.ts`
    - Extract array of word objects from KKU API response content
    - Handle markdown fences, extra prose, and malformed JSON gracefully
    - Validate each word has korean, reading, romanization, english, thai fields
    - _Requirements: 2.2_

  - [ ]* 4.3 Write property test for API response parsing completeness
    - **Property 3: API response parsing completeness**
    - **Validates: Requirements 2.2**

  - [ ]* 4.4 Write unit tests for feed route handler
    - Test input validation (invalid body, missing fields, negative count)
    - Test error response mapping (timeout, rate limit, network error)
    - Test successful response parsing
    - _Requirements: 2.2, 2.3_

- [x] 5. Implement UI components
  - [x] 5.1 Create `formatProgress` utility and `ProgressIndicator` component
    - Create `app/home/_lib/formatProgress.ts` with pure function `formatProgress(current: number, total: number): string`
    - Create `app/home/_components/ProgressIndicator.tsx` displaying "current/total" format
    - Style with Neobrutalist design (border 3px solid, box-shadow)
    - _Requirements: 1.4_

  - [ ]* 5.2 Write property test for progress indicator formatting
    - **Property 2: Progress indicator formatting**
    - **Validates: Requirements 1.4**

  - [x] 5.3 Create `WordCard` component
    - Create `app/home/_components/WordCard.tsx`
    - Display: Hangul word, Thai script pronunciation, romanization, English definition, Thai translation
    - Include audio button that uses Web Speech API (`SpeechSynthesis`) for Korean pronunciation
    - Include bookmark toggle button with visual indicator
    - Include `CardImageArea` sub-component
    - Style with Neobrutalist design (border 3px solid #000, box-shadow 4px 4px 0 #000)
    - Hide audio button if `SpeechSynthesis` is unavailable
    - _Requirements: 1.2, 6.1, 6.2, 6.3_

  - [ ]* 5.4 Write property test for word card rendering completeness
    - **Property 1: Word card rendering completeness**
    - **Validates: Requirements 1.2**

  - [x] 5.5 Create `CardImageArea` component
    - Create `app/home/_components/CardImageArea.tsx`
    - Display placeholder with camera icon when no image captured
    - Open device camera on tap using `<input type="file" accept="image/*" capture="environment">`
    - Save captured image blob via `useFeedStorage.updateImage()`
    - Display captured image when available
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integrate WordFeed container and wire to Home page
  - [x] 7.1 Create `WordFeed` container component
    - Create `app/home/_components/WordFeed.tsx`
    - On mount: check if today's words exist via `shouldFetchToday` → load from IndexedDB or fetch from `/api/feed`
    - Build exclusion list via `useExclusionList` and pass to API request
    - Render `WordCard` components in vertical scrollable list
    - Render `ProgressIndicator` updating on scroll position
    - Show "ขอคำเพิ่ม" button when user scrolls to end of feed
    - Handle loading state with spinner/skeleton
    - Handle error state with Thai error message and retry button (styled: border 3px solid #FA5252, bg #FFF0F6)
    - _Requirements: 1.1, 1.3, 2.1, 2.3, 4.1, 4.2, 4.3_

  - [x] 7.2 Update Home page to render `WordFeed`
    - Modify `app/home/page.tsx` to replace the empty content area with `WordFeed` component
    - Keep existing header section (안녕하세요! greeting) and tab bar navigation
    - Ensure feed scrolls within the content area between header and tab bar
    - _Requirements: 1.1, 1.3_

  - [ ]* 7.3 Write unit tests for WordFeed integration
    - Test: Home page load → words displayed from IndexedDB (no API call)
    - Test: First load of day → API called → cards rendered
    - Test: Request more button → additional API call → new cards appended
    - Test: Error state → error message and retry button displayed
    - _Requirements: 1.1, 2.1, 2.3, 4.1_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Vitest with `fake-indexeddb` for IndexedDB mocking and `fast-check` for property-based tests
- All UI components follow the existing Neobrutalist design system (border 3px solid, box-shadow 4px 4px 0)
- Web Speech API availability should be checked before rendering audio controls

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "4.2"] },
    { "id": 2, "tasks": ["1.3", "1.4", "1.5", "2.1", "2.2", "4.1", "5.1"] },
    { "id": 3, "tasks": ["2.3", "2.4", "4.3", "4.4", "5.2", "5.3"] },
    { "id": 4, "tasks": ["5.4", "5.5"] },
    { "id": 5, "tasks": ["7.1"] },
    { "id": 6, "tasks": ["7.2"] },
    { "id": 7, "tasks": ["7.3"] }
  ]
}
```
