# Implementation Plan: AI Flashcard

## Overview

Implement the AI Flashcard feature that allows users to capture photos, send them to the DeepSeek Vision API via a server-side proxy, and display AI-generated Thai vocabulary labels as flashcards. The implementation follows the existing Next.js App Router patterns, reuses the established IndexedDB infrastructure, and integrates with the current scan flow.

## Tasks

- [x] 1. Set up flashcard module structure and shared utilities
  - [x] 1.1 Create the `blobToBase64` utility function
    - Create `app/scan/flashcard/_lib/blobToBase64.ts`
    - Implement a function that converts a Blob to a base64 string (without the `data:...;base64,` prefix) using FileReader
    - Export the function for use by the identification hook
    - _Requirements: 4.2_

  - [x] 1.2 Create constants and type definitions for the flashcard module
    - Create `app/scan/flashcard/_lib/constants.ts` with max retry count (3), API timeout (30s), max image size (20MB), error messages map, and animation duration (500ms)
    - Create shared TypeScript interfaces: `IdentifyRequest`, `IdentifySuccessResponse`, `IdentifyErrorResponse`, `AIErrorType`, `FlashcardRecord`
    - _Requirements: 1.3, 1.5, 2.5, 2.6, 3.3_

  - [x] 1.3 Create the `flashcardImageDimensions` utility function
    - Create `app/scan/flashcard/_lib/flashcardImageDimensions.ts`
    - Implement a pure function that computes display dimensions for the flashcard image given natural dimensions and viewport size, maintaining aspect ratio with max height of 60% viewport height
    - _Requirements: 3.2_

- [x] 2. Implement the API route for object identification
  - [x] 2.1 Create the `/api/identify` POST route handler
    - Create `app/api/identify/route.ts`
    - Validate request body: check `image` field exists, is a string, and is valid base64
    - Check decoded image size does not exceed 20MB; return 413 + `too_large` error if exceeded
    - Read `DEEPSEEK_API_KEY` from environment variable
    - Construct DeepSeek API request with the image as a base64 data URL and a Thai identification prompt
    - Set a 30-second timeout using AbortController
    - Map DeepSeek error responses to appropriate error types (api_error, timeout, rate_limit, network_error)
    - Extract the label from the response, trim whitespace, truncate to 100 characters
    - Return `{ label }` on success or `{ error: { type, message } }` on failure with appropriate HTTP status codes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4_

  - [ ]* 2.2 Write property tests for the API route validation logic
    - **Property 2: Oversized images are rejected**
    - **Property 3: Invalid request bodies are rejected**
    - **Validates: Requirements 1.5, 1.7**

  - [ ]* 2.3 Write unit tests for the API route
    - Test correct DeepSeek request formatting (prompt in Thai, image as data URL)
    - Test error type mapping for each DeepSeek failure scenario (429, 5xx, timeout, network)
    - Test label extraction and truncation to 100 characters
    - Test whitespace-only label treated as error
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 2.4_

- [x] 3. Implement the `useObjectIdentification` hook
  - [x] 3.1 Create the `useObjectIdentification` custom hook
    - Create `app/scan/flashcard/_lib/useObjectIdentification.ts`
    - Use `blobToBase64` to convert the image Blob before sending
    - Call POST `/api/identify` with the base64 string
    - Track loading, error, label, and retryCount state
    - Implement retry logic: increment retryCount on failure, reset on success, set `canRetry = false` when retryCount >= 3
    - Handle whitespace-only or empty labels as errors on the client side
    - Support cleanup via AbortController when component unmounts
    - _Requirements: 1.1, 2.5, 2.6, 3.7, 4.2_

  - [ ]* 3.2 Write property test for retry state logic
    - **Property 4: Error state shows retry when under max attempts**
    - **Validates: Requirements 2.5**

  - [ ]* 3.3 Write property test for whitespace label rejection
    - **Property 6: Whitespace-only labels are treated as errors**
    - **Validates: Requirements 3.7**

  - [ ]* 3.4 Write unit tests for `useObjectIdentification`
    - Test loading state transitions
    - Test retry count increment and max retry behavior
    - Test successful identification resets retry count
    - Test abort on unmount
    - _Requirements: 2.5, 2.6_

- [x] 4. Implement the `useFlashcardStorage` hook
  - [x] 4.1 Create the `useFlashcardStorage` custom hook
    - Create `app/scan/flashcard/_lib/useFlashcardStorage.ts`
    - Open/create the `flashcards` object store in the existing `tarnly-images` IndexedDB database
    - Implement `save(imageBlob, label)` that stores a `FlashcardRecord` with `crypto.randomUUID()` id, the blob, label, and `Date.now()` timestamp
    - Create a `createdAt` index for chronological retrieval
    - Manage loading and error state for the save operation
    - _Requirements: 5.1, 5.3, 5.4_

  - [ ]* 4.2 Write unit tests for `useFlashcardStorage`
    - Test successful save flow with fake-indexeddb
    - Test save failure handling and error state
    - Test that saved records contain correct fields
    - _Requirements: 5.1, 5.4_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement the Flashcard View page and UI components
  - [x] 6.1 Create the Flashcard page component at `/scan/flashcard`
    - Create `app/scan/flashcard/page.tsx`
    - On mount: retrieve image from `capturedImageStore`; if none, redirect to `/scan`
    - Automatically call `identify()` with the retrieved blob on mount
    - Render loading state: spinner + "กำลังวิเคราะห์ภาพ..." text
    - Render success state: FlashcardCard with image and label, reveal animation (500ms transition), action buttons ("บันทึก" and "ถ่ายใหม่")
    - Render error state (retryable): error message + "ลองใหม่" button
    - Render error state (max retries): error message + "ถ่ายใหม่" button only
    - On "บันทึก" tap: disable both buttons, show loading indicator on save button, save to IndexedDB, show success confirmation for 1 second, clear capturedImageStore, navigate to `/home`
    - On "ถ่ายใหม่" tap: clear capturedImageStore, navigate to `/scan`
    - On save failure: show error message, re-enable "บันทึก" button
    - Cleanup: clear capturedImageStore on unmount, abort in-flight API request
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 6.2 Write property test for flashcard image scaling
    - **Property 5: Flashcard image scaling preserves aspect ratio within bounds**
    - **Validates: Requirements 3.2**

  - [ ]* 6.3 Write unit tests for the Flashcard page component
    - Test redirect when no captured image available
    - Test loading indicator display during API call
    - Test flashcard display on successful identification
    - Test reveal animation trigger
    - Test retry button visibility based on retry count
    - Test button disable during save
    - Test navigation to /home after successful save with 1s delay
    - Test navigation to /scan on "ถ่ายใหม่"
    - Test cleanup on unmount
    - _Requirements: 3.1, 3.4, 3.6, 4.3, 5.2, 5.3, 5.5_

- [x] 7. Integrate with Preview page navigation
  - [x] 7.1 Modify the Preview page to navigate to Flashcard View on confirm
    - Update `app/scan/preview/page.tsx`: change the "ยืนยัน" button handler to retain the image in `capturedImageStore` (do NOT clear it) and navigate to `/scan/flashcard` instead of saving to IndexedDB and navigating to `/home`
    - Remove the `useImageStorage` import and save logic from the confirm handler
    - _Requirements: 4.1_

  - [ ]* 7.2 Write unit tests for the updated Preview page navigation
    - Test that confirm navigates to `/scan/flashcard`
    - Test that capturedImageStore is NOT cleared on confirm
    - Test that retake still clears capturedImageStore and navigates to `/scan`
    - _Requirements: 4.1_

- [ ] 8. Write property test for label extraction
  - [ ]* 8.1 Write property test for label extraction bounded output
    - **Property 1: Label extraction produces bounded output**
    - **Validates: Requirements 1.3**

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript, Next.js App Router, vitest, fast-check, and fake-indexeddb
- The existing `capturedImageStore` module-level store is reused for image sharing between pages
- The existing `tarnly-images` IndexedDB database is reused with a new `flashcards` object store

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1", "4.2"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4"] },
    { "id": 4, "tasks": ["6.1", "7.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "7.2", "8.1"] }
  ]
}
```
