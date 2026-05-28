# Implementation Plan: AI Conversation

## Overview

เพิ่มหน้าแชทสนทนาภาษาเกาหลีกับ AI ให้กับแอป Tarnly Korean โดยสร้าง IndexedDB stores ใหม่สำหรับเก็บประวัติสนทนา, custom hooks สำหรับจัดการ session/TTS/STT/word context, API route สำหรับสื่อสารกับ KKU IntelSphere, และ UI components สำหรับหน้า chat ทั้งหมดใช้ TypeScript, Next.js App Router, Ant Design with Neobrutalist theme

## Tasks

- [x] 1. Set up data layer and core types
  - [x] 1.1 Define TypeScript interfaces and add conversation stores to IndexedDB
    - Create `app/chat/_lib/types.ts` with `ConversationSessionRecord`, `ConversationMessageRecord`, `ChatMessage`, `SessionConfig`, `ProficiencyLevel`, `SavedWord`, `ChatRequest`, `ChatSuccessResponse`, `ChatErrorResponse`, `ChatErrorType`, and `SpeechLang` types as defined in the design
    - Update `app/_lib/db.ts`: bump `DB_VERSION` to 5, add `CONVERSATIONS_STORE` and `CONVERSATION_MESSAGES_STORE` constants, add `conversations` object store with indexes for `createdAt` and `completed`, add `conversation-messages` object store with indexes for `sessionId` and `timestamp`
    - _Requirements: 6.1, 6.2_

  - [x] 1.2 Implement `useConversationHistory` hook
    - Create `app/chat/_lib/useConversationHistory.ts` following the pattern of `useFeedStorage`
    - Implement `loadSessions()` returning sessions sorted by `createdAt` descending
    - Implement `loadSessionMessages(sessionId)` returning messages sorted by `timestamp` ascending
    - Implement `saveSession(session)`, `saveMessage(sessionId, message)`, `deleteSession(sessionId)` with cascade delete of associated messages
    - Expose `sessions`, `isLoading`, and `error` state
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 1.3 Write property test for message persistence round trip
    - **Property 8: Message persistence round trip**
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 1.4 Write property test for session list ordering
    - **Property 9: Session list ordering**
    - **Validates: Requirements 6.3**

  - [ ]* 1.5 Write property test for session deletion cascades to messages
    - **Property 10: Session deletion cascades to messages**
    - **Validates: Requirements 6.6**

  - [ ]* 1.6 Write property test for session completion marking
    - **Property 11: Session completion marking**
    - **Validates: Requirements 8.3**

- [x] 2. Implement validation utilities and word context hook
  - [x] 2.1 Create topic and message validation utilities
    - Create `app/chat/_lib/validateTopic.ts` with function that accepts string if trimmed length is 2-100 characters
    - Create `app/chat/_lib/validateMessage.ts` with function that returns whether message is sendable (non-empty after trim, max 500 chars)
    - Create `app/chat/_lib/validateSessionConfig.ts` with function that returns whether config is valid (valid topic AND proficiency level selected)
    - _Requirements: 1.1, 1.6, 3.8, 3.9_

  - [x] 2.2 Implement `useWordContext` hook
    - Create `app/chat/_lib/useWordContext.ts`
    - Load saved words from both `words` store (Word Store) and `feed-words` store (bookmarked items)
    - Map each word to `SavedWord` interface with `id`, `korean`, `reading`, `romanization`, `english`, `source`
    - Expose `savedWords`, `loadSavedWords()`, and `isLoading`
    - _Requirements: 2.1, 2.2, 2.3, 2.8_

  - [ ]* 2.3 Write property test for topic input validation
    - **Property 1: Topic input validation**
    - **Validates: Requirements 1.1**

  - [ ]* 2.4 Write property test for start button form validation
    - **Property 2: Start button form validation**
    - **Validates: Requirements 1.6**

  - [ ]* 2.5 Write property test for message input validation
    - **Property 4: Message input validation**
    - **Validates: Requirements 3.8, 3.9**

  - [ ]* 2.6 Write property test for word selection cap enforcement
    - **Property 3: Word selection cap enforcement**
    - **Validates: Requirements 2.4**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Chat API route
  - [x] 4.1 Create `/api/chat` route handler
    - Create `app/api/chat/route.ts` following the pattern of `/api/feed` and `/api/identify`
    - Accept POST with `ChatRequest` body (messages, proficiencyLevel, topic, wordContext)
    - Validate input: messages array required, proficiencyLevel must be valid, topic must be 2-100 chars
    - Construct system prompt using `buildSystemPrompt()` with level-specific instructions and word context
    - Send request to KKU IntelSphere API with 30-second timeout via AbortController
    - Parse response and return `ChatSuccessResponse` or `ChatErrorResponse` with appropriate HTTP status
    - Handle timeout (504), rate limit (429), network error (502), invalid input (400)
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 1.3, 1.4, 1.5_

  - [x] 4.2 Implement `parseChatResponse` utility
    - Create `app/api/chat/parseChatResponse.ts`
    - Extract JSON object from KKU API response content (handle markdown fences, extra prose)
    - Validate response has `korean`, `reading`, `romanization`, `translation` fields
    - Return parsed `ChatSuccessResponse` or throw error for invalid format
    - _Requirements: 4.2_

  - [x] 4.3 Implement `buildContext` utility
    - Create `app/api/chat/buildContext.ts`
    - Accept full message history and return at most 20 most recent messages preserving chronological order
    - Map messages to `ChatMessagePayload` format (role + content)
    - _Requirements: 4.5_

  - [ ]* 4.4 Write property test for chat response parsing round trip
    - **Property 5: Chat response parsing round trip**
    - **Validates: Requirements 4.2**

  - [ ]* 4.5 Write property test for conversation context window
    - **Property 6: Conversation context window**
    - **Validates: Requirements 4.5**

  - [ ]* 4.6 Write unit tests for chat route handler
    - Test input validation (missing fields, invalid proficiency level, empty messages)
    - Test error response mapping (timeout, rate limit, network error)
    - Test successful response with mocked KKU API
    - _Requirements: 4.1, 4.2, 4.4_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement TTS and STT hooks
  - [x] 6.1 Implement `useTTS` hook
    - Create `app/chat/_lib/useTTS.ts`
    - Wrap Web Speech API `SpeechSynthesis` for Korean text-to-speech (lang: 'ko-KR')
    - Implement `speak(text)` that stops any current playback before starting new
    - Implement `stop()` to cancel current playback
    - Expose `isSpeaking`, `isSupported`, `error` state
    - Ensure single audio playback invariant (only one message plays at a time)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 6.2 Implement `useSTT` hook
    - Create `app/chat/_lib/useSTT.ts`
    - Wrap Web Speech API `SpeechRecognition` for voice input
    - Implement `startListening(lang)` supporting 'ko-KR', 'th-TH', 'en-US'
    - Implement `stopListening()` to end recording
    - Expose `isListening`, `transcript`, `isSupported`, `error` state
    - Handle permission denied, network error, no speech detected errors
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

  - [ ]* 6.3 Write property test for single audio playback invariant
    - **Property 7: Single audio playback invariant**
    - **Validates: Requirements 5.5**

  - [ ]* 6.4 Write unit tests for useTTS and useSTT hooks
    - Test TTS: speak starts playback, stop cancels, isSpeaking state updates
    - Test TTS: new speak stops previous playback
    - Test STT: startListening/stopListening state transitions
    - Test STT: error handling for permission denied, network error, no speech
    - Test STT: isSupported returns false when API unavailable
    - _Requirements: 5.1, 5.2, 5.5, 9.2, 9.4, 9.8, 9.9_

- [x] 7. Implement `useConversationSession` hook
  - [x] 7.1 Implement `useConversationSession` hook
    - Create `app/chat/_lib/useConversationSession.ts`
    - Implement `startSession(config)` that creates a new session record in IndexedDB
    - Implement `sendMessage(text)` that adds user message, calls `/api/chat`, adds AI response
    - Implement `retryLastMessage()` that re-sends the last user message
    - Implement `endSession()` that marks session as completed with endedAt timestamp
    - Maintain messages array in state, persist each message to IndexedDB
    - Handle loading state and error state
    - Limit context to 20 most recent messages when calling API
    - _Requirements: 4.1, 4.5, 4.6, 6.1, 6.2, 7.3, 7.4, 8.1, 8.3_

- [x] 8. Implement UI components
  - [x] 8.1 Create `ConversationSetup` component
    - Create `app/chat/_components/ConversationSetup.tsx`
    - Render topic input field (2-100 chars, placeholder text)
    - Render proficiency level selector with three options: Beginner (TOPIK 1-2), Intermediate (TOPIK 3-4), Advanced (TOPIK 5-6) with no default
    - Render word selection button showing count of available saved words
    - Render start-conversation button, enabled only when topic valid AND level selected
    - Style with Neobrutalist design (border 3px solid, box-shadow 4px 4px 0)
    - _Requirements: 1.1, 1.2, 1.6, 1.7, 2.1_

  - [x] 8.2 Create `WordSelector` component
    - Create `app/chat/_components/WordSelector.tsx`
    - Render as modal/drawer with scrollable list of saved words
    - Display each word with Korean text, Thai reading, and translation
    - Allow multi-select with maximum 10 words cap
    - Show selected count and disable further selection at cap
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 8.3 Create `ChatList` component
    - Create `app/chat/_components/ChatList.tsx`
    - Render vertical scrollable message list with auto-scroll to bottom on new message
    - AI messages aligned left showing: Korean text (large), Thai pronunciation, romanization, Thai translation, audio button
    - User messages aligned right showing raw text
    - Show loading indicator when waiting for AI response
    - Show error message with retry button on API failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.3, 4.4_

  - [x] 8.4 Create `ChatInput` component
    - Create `app/chat/_components/ChatInput.tsx`
    - Render text input field (max 500 chars, accepts Korean/Thai/English)
    - Render send button, disabled when input is empty/whitespace
    - Render microphone button (hidden if STT not supported)
    - Support sending via button tap or Enter key
    - Show recording indicator with pulsing animation when STT is active
    - Display selected Word_Context as removable tags above input
    - _Requirements: 3.7, 3.8, 3.9, 9.1, 9.3, 9.4, 9.6, 9.7, 2.6, 2.7_

  - [x] 8.5 Create `SessionHistory` component
    - Create `app/chat/_components/SessionHistory.tsx`
    - Render list of previous sessions sorted by most recent first
    - Display each session's topic, proficiency level, creation date, and completion indicator
    - Include delete button with confirmation prompt per session
    - Include new-conversation button always visible
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 7.1, 8.6_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Wire page and integrate all components
  - [x] 10.1 Create `/app/chat/page.tsx` page component
    - Create `app/chat/page.tsx` as client component with `'use client'` directive
    - Manage view state: 'setup' | 'active-chat' | 'history'
    - Wire `ConversationSetup` → start session → switch to active-chat view
    - Wire `ChatList` + `ChatInput` for active chat with TTS/STT integration
    - Wire `SessionHistory` for viewing/loading past sessions
    - Include new-conversation button visible in both history and active-chat views
    - Include end-conversation button visible during active session
    - Handle end-conversation flow: confirmation → save → navigate to setup
    - Handle new-conversation flow: save current session → navigate to setup
    - Handle save failures: show error, remain on current view
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 10.2 Add navigation to chat page
    - Add chat page link/tab to the app's tab bar navigation in `app/layout.tsx` or relevant navigation component
    - Ensure consistent navigation pattern with existing pages (home, learn, scan)
    - _Requirements: 1.1 (Conversation_Screen accessible from tab bar)_

  - [ ]* 10.3 Write integration tests for conversation flow
    - Test: setup → start session → send message → receive response → end session
    - Test: load session history → tap session → view messages
    - Test: delete session → confirmation → session removed
    - Test: word context loading from both Word Store and Feed Words
    - Test: new conversation button saves current session before navigating
    - _Requirements: 6.3, 6.4, 6.6, 7.3, 8.3_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Vitest with `fake-indexeddb` for IndexedDB mocking and `fast-check` for property-based tests
- All UI components follow the existing Neobrutalist design system (border 3px solid, box-shadow 4px 4px 0)
- Web Speech API availability should be checked before rendering audio/microphone controls
- The Chat API uses the same KKU IntelSphere API as existing `/api/feed` and `/api/identify` routes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.2"] },
    { "id": 2, "tasks": ["1.3", "1.4", "1.5", "1.6", "2.3", "2.4", "2.5", "2.6", "4.2", "4.3"] },
    { "id": 3, "tasks": ["4.1", "4.4", "4.5"] },
    { "id": 4, "tasks": ["4.6", "6.1", "6.2"] },
    { "id": 5, "tasks": ["6.3", "6.4", "7.1"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5"] },
    { "id": 7, "tasks": ["10.1"] },
    { "id": 8, "tasks": ["10.2", "10.3"] }
  ]
}
```
