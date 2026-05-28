# Implementation Plan: Scan Button

## Overview

Implement a camera-based photo capture feature for the Tarnly Korean PWA. The feature adds a floating Scan button on the Home screen that opens a full-screen camera view, allows photo capture, preview with confirm/retake, and saves images to IndexedDB. All camera logic runs client-side using the browser's MediaDevices API with route-based navigation via Next.js app router.

## Tasks

- [x] 1. Set up project infrastructure and shared utilities
  - [x] 1.1 Install dependencies and configure test framework
    - Install `fast-check`, `vitest`, `@testing-library/react`, `fake-indexeddb` as dev dependencies
    - Configure Vitest in `vitest.config.ts` with React support and path aliases
    - Add `"test": "vitest --run"` script to package.json
    - _Requirements: N/A (infrastructure)_

  - [x] 1.2 Create shared types and constants
    - Create `app/scan/_lib/types.ts` with `CameraError`, `CapturedImage`, and state interfaces
    - Create `app/scan/_lib/constants.ts` with `DEFAULT_CONSTRAINTS`, `FALLBACK_CONSTRAINTS`, and IndexedDB config
    - _Requirements: 5.1, 5.6_

  - [x] 1.3 Implement `computeFitDimensions` utility function
    - Create `app/scan/_lib/computeFitDimensions.ts`
    - Implement aspect-ratio-preserving fit logic that maximizes one axis within container bounds
    - _Requirements: 3.1, 5.3_

  - [ ]* 1.4 Write property test for `computeFitDimensions`
    - **Property 1: Aspect-ratio-preserving fit**
    - **Validates: Requirements 3.1, 5.3**

- [x] 2. Implement IndexedDB image storage layer
  - [x] 2.1 Implement `useImageStorage` custom hook
    - Create `app/scan/_lib/useImageStorage.ts`
    - Implement IndexedDB database initialization (db: `tarnly-images`, store: `captures`, keyPath: `id`, index: `createdAt`)
    - Implement `save(blob: Blob)` that stores a `CapturedImage` record and returns the generated ID
    - Handle errors and expose `isLoading` and `error` state
    - _Requirements: 3.4, 3.5_

  - [ ]* 2.2 Write property test for image storage round-trip
    - **Property 2: Image storage round-trip**
    - **Validates: Requirements 3.4**

  - [ ]* 2.3 Write unit tests for `useImageStorage`
    - Test successful save returns valid ID
    - Test save failure exposes error state
    - Use `fake-indexeddb` for mocking
    - _Requirements: 3.4, 3.5_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement camera stream hook and ScanButton
  - [x] 4.1 Implement `useCameraStream` custom hook
    - Create `app/scan/_lib/useCameraStream.ts`
    - Request `getUserMedia` with `DEFAULT_CONSTRAINTS`, fall back to `FALLBACK_CONSTRAINTS` if rear camera unavailable
    - Expose `videoRef`, `stream`, `isLoading`, `error`, `capture()`, `retry()`, `stop()`
    - `capture()` draws current video frame to a hidden canvas and returns a Blob
    - `stop()` stops all MediaStream tracks
    - Clean up stream on unmount
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 2.2, 4.4, 5.1, 5.6_

  - [ ]* 4.2 Write unit tests for `useCameraStream`
    - Test getUserMedia called with correct constraints
    - Test fallback to FALLBACK_CONSTRAINTS on rear camera failure
    - Test error state on permission denied
    - Test stream tracks stopped on `stop()`
    - Mock `navigator.mediaDevices.getUserMedia`
    - _Requirements: 1.3, 1.4, 1.5, 4.4, 5.1_

  - [x] 4.3 Implement `ScanButton` component
    - Create `app/scan/_components/ScanButton.tsx`
    - Check `navigator.mediaDevices?.getUserMedia` on mount; render nothing if unsupported
    - On tap, navigate to `/scan` using Next.js `useRouter`
    - Style as floating action button matching existing Neobrutalist design
    - _Requirements: 1.1, 5.2_

  - [ ]* 4.4 Write unit tests for `ScanButton`
    - Test button hidden when getUserMedia unavailable
    - Test button navigates to `/scan` on tap
    - _Requirements: 1.1, 5.2_

- [x] 5. Implement Camera View page (`/scan`)
  - [x] 5.1 Create Camera View page and components
    - Create `app/scan/page.tsx` as a client component
    - Integrate `useCameraStream` hook for stream management
    - Render full-screen `<video autoPlay playsInline>` element with live camera feed
    - Implement `CaptureButton` component at bottom-center with scale-down press animation (150ms min)
    - Implement close button in top-left corner with 44×44px minimum tap target
    - Disable CaptureButton during capture, re-enable on failure
    - On successful capture, store Blob in sessionStorage/state and navigate to `/scan/preview`
    - On close, call `stop()` and navigate to `/home`
    - _Requirements: 1.1, 1.2, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4_

  - [x] 5.2 Implement `ErrorOverlay` component
    - Create `app/scan/_components/ErrorOverlay.tsx`
    - Display contextual Thai error messages based on `CameraError.type`
    - Show retry button for `stream_interrupted` and `capture_failed` errors
    - Show dismiss button for `permission_denied` and `not_found` errors
    - _Requirements: 1.3, 2.5, 5.4_

  - [ ]* 5.3 Write unit tests for Camera View page
    - Test CaptureButton disabled during capture
    - Test CaptureButton press animation duration ≥ 150ms
    - Test close button stops stream and navigates to /home
    - Test error overlay displayed on permission denied
    - Test stream interruption shows error with retry
    - _Requirements: 2.2, 2.4, 4.2, 4.3, 1.3, 5.4_

- [x] 6. Implement Photo Preview page (`/scan/preview`)
  - [x] 6.1 Create Photo Preview page
    - Create `app/scan/preview/page.tsx` as a client component
    - Retrieve captured image Blob from state/sessionStorage
    - Display image using `URL.createObjectURL(blob)` with `object-fit: contain` to fill viewport while preserving aspect ratio
    - Use `computeFitDimensions` for responsive sizing on orientation change
    - Revoke object URL on unmount to prevent memory leaks
    - Render "ยืนยัน" (Confirm) and "ถ่ายใหม่" (Retake) buttons at bottom of screen
    - On Retake: discard image, navigate to `/scan`
    - On Confirm: call `useImageStorage.save(blob)`, navigate to `/home` on success
    - On save failure: show error message, retain image on preview for retry
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.3_

  - [ ]* 6.2 Write unit tests for Photo Preview page
    - Test confirm saves image and navigates to /home
    - Test retake discards image and navigates to /scan
    - Test save failure shows error and retains image
    - Test object URL revoked on unmount
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integrate ScanButton into Home page and wire navigation
  - [x] 8.1 Integrate ScanButton into Home page
    - Import and render `ScanButton` in `app/home/page.tsx`
    - Replace the existing static Scan button div with the `ScanButton` component
    - Ensure conditional rendering based on getUserMedia support
    - _Requirements: 1.1, 5.2_

  - [x] 8.2 Handle viewport resize and orientation changes
    - Add resize/orientation event listeners in Camera View to resize video feed within 500ms
    - Ensure Photo Preview re-computes fit dimensions on orientation change
    - _Requirements: 5.3_

  - [ ]* 8.3 Write integration tests for full scan flow
    - Test full flow: tap Scan → grant permission → see camera feed
    - Test full flow: capture → preview → confirm → saved in IndexedDB
    - Test full flow: capture → preview → retake → back to camera
    - _Requirements: 1.1, 1.2, 1.6, 2.2, 2.3, 3.3, 3.4_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript, Next.js App Router, Tailwind CSS, and Ant Design
- Camera APIs are mocked in tests via `vi.fn()` and `fake-indexeddb`
- All user-facing text is in Thai as specified in the design

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3"] },
    { "id": 5, "tasks": ["4.4", "5.1", "5.2"] },
    { "id": 6, "tasks": ["5.3", "6.1"] },
    { "id": 7, "tasks": ["6.2", "8.1", "8.2"] },
    { "id": 8, "tasks": ["8.3"] }
  ]
}
```
