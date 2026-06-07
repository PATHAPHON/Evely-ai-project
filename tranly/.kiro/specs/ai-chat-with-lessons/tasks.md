# Implementation Plan: AI Chat with Lessons

## Overview

Implement the "AI Chat with Lessons" feature — a new page accessible from the Home screen's Floating Tab Switcher that provides pre-loaded lesson content for AI chat practice. The implementation covers data types, lesson catalog UI, chat session integration, page composition, home navigation wiring, and testing.

## Tasks

- [x] 1. Create Pre-Loaded Lesson types and data
  - [x] 1.1 Create `app/chat-lessons/_lib/types.ts` with `PreLoadedLesson`, `LessonCategory`, and `LessonCategoryGroup` interfaces
    - Define all required fields: id, titleTh, titleEn, category, proficiencyLevel, targetLanguage, descriptionTh, descriptionEn, wordContext, goal, systemContext, icon
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 1.2 Create `app/chat-lessons/_lib/lessonCatalogData.ts` with initial set of 6-8 Korean lessons grouped by category (greetings, travel, food, daily)
    - Static data file with pre-defined lessons for Korean language
    - _Requirements: 2.1, 2.4, 4.1_

  - [x] 1.3 Create utility function `getLessonsByLanguage(language: TargetLanguage)` that filters and groups lessons by active language
    - Filter lessons by targetLanguage, group by category with labels
    - _Requirements: 2.3, 2.4_

- [x] 2. Create LessonCatalog and LessonCatalogCard components
  - [x] 2.1 Create `app/chat-lessons/_components/LessonCatalogCard.tsx` — card component showing lesson title, level badge, description, and category icon using neobrutalist design
    - Use border-3, shadow-nb-md, rounded-2xl, font-bold styling
    - _Requirements: 2.2, 5.1_

  - [x] 2.2 Create `app/chat-lessons/_components/LessonCatalog.tsx` — renders grouped lesson list with category headers, handles empty state, includes skeleton loading
    - Display lessons grouped by category with Thai/English labels
    - Show empty state message when no lessons available
    - Include skeleton loading placeholders
    - _Requirements: 2.1, 2.4, 2.5, 5.4_

- [x] 3. Create ChatWithLesson component
  - [x] 3.1 Create `app/chat-lessons/_components/ChatWithLesson.tsx` — wraps existing `useConversationSession`, `ChatList`, `ChatInput`, `ReplySuggestions` components; accepts a `PreLoadedLesson` prop and maps it to `SessionConfig`
    - Map PreLoadedLesson fields to SessionConfig for useConversationSession
    - Include lesson goal in system prompt context
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Add "End Chat" button in header with confirmation dialog and completion state (goal reached) UI
    - Show confirmation dialog before ending session
    - Display completion summary when AI goal is reached
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4. Create the main /chat-lessons page
  - [x] 4.1 Create `app/chat-lessons/page.tsx` with view state machine (catalog ↔ chatting), back button, page header with Thai/English title, and StatsBar
    - Implement ViewState type with 'catalog' and 'chatting' states
    - Add back navigation button to Home
    - Display page header "แชท AI กับบทเรียน" / "AI Chat with Lessons"
    - _Requirements: 1.2, 5.2, 5.3_

  - [x] 4.2 Integrate LessonCatalog and ChatWithLesson components with proper view transitions
    - Wire lesson card tap to transition from catalog to chatting view
    - Wire end chat to transition back to catalog view
    - _Requirements: 3.1, 6.3_

- [x] 5. Wire Home page navigation
  - [x] 5.1 Modify `app/home/page.tsx` — update the second button (`activeSubTab === 1`, BookOutlined) in the Floating Tab Switcher to navigate to `/chat-lessons` via `router.push('/chat-lessons')`
    - _Requirements: 1.1, 1.3_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Testing
  - [x]* 7.1 Write property-based test: all pre-loaded lessons have complete required fields (non-empty id, titles, category, level, wordContext, goal)
    - **Property 2: All pre-loaded lessons have complete required fields**
    - **Validates: Requirements 4.1**

  - [x]* 7.2 Write property-based test: `getLessonsByLanguage` filtering returns only lessons matching the specified language, and grouping preserves total count
    - **Property 1: Lesson filtering by language is correct**
    - **Property 3: Lesson grouping preserves all lessons**
    - **Validates: Requirements 2.3, 2.4**

  - [x]* 7.3 Write example tests for LessonCatalogCard rendering (displays title, level, description)
    - Test that card displays lesson title, level badge, and description
    - _Requirements: 2.2_

  - [x]* 7.4 Write example test for page navigation: clicking lesson card transitions view to chatting state
    - Test view state transition from catalog to chatting on card tap
    - _Requirements: 3.1_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Uses existing conversation session engine — no new API routes required
- All UI follows neobrutalist design system consistent with existing app pages

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "5.1"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.3", "7.4"] }
  ]
}
```
