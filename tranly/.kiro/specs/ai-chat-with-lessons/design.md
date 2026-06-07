# Design Document: AI Chat with Lessons

## Overview

หน้า "AI Chat with Lessons" เป็นหน้าจอใหม่ที่ให้ผู้ใช้เข้าถึง AI Chat พร้อมบทเรียนสำเร็จรูป เข้าถึงได้จากปุ่มที่สองใน Floating Tab Switcher บนหน้า Home ใช้ engine เดิม (`useConversationSession`) แต่ config มาจากข้อมูลบทเรียนที่เตรียมไว้

## Architecture

### Route Structure

```
/chat-lessons          → Chat_With_Lesson_Page (new)
  ├── _components/
  │   ├── LessonCatalog.tsx      → renders lesson list grouped by category
  │   ├── LessonCatalogCard.tsx  → individual lesson card
  │   └── ChatWithLesson.tsx     → chat UI wrapper using useConversationSession
  ├── _lib/
  │   ├── lessonCatalogData.ts   → static pre-loaded lesson definitions
  │   └── types.ts               → PreLoadedLesson type definition
  └── page.tsx                   → main page with view state management
```

### Data Flow

```
Home (Floating Tab Switcher, button 2)
  → /chat-lessons (LessonCatalog view)
    → User taps Lesson_Card
      → ChatWithLesson view (useConversationSession with pre-filled config)
        → Session ends → back to LessonCatalog
```

## Components and Interfaces

### LessonCatalog

Renders the full lesson list grouped by category for the active language.

```typescript
interface LessonCatalogProps {
  activeLanguage: TargetLanguage;
  isThai: boolean;
  onSelectLesson: (lesson: PreLoadedLesson) => void;
}
```

### LessonCatalogCard

Individual card displaying a single lesson's summary information.

```typescript
interface LessonCatalogCardProps {
  lesson: PreLoadedLesson;
  isThai: boolean;
  onPress: (lesson: PreLoadedLesson) => void;
}
```

### ChatWithLesson

Chat UI wrapper that manages the AI chat session using the existing `useConversationSession` hook, pre-configured with lesson data.

```typescript
interface ChatWithLessonProps {
  lesson: PreLoadedLesson;
  isThai: boolean;
  onEndChat: () => void;
}
```

### page.tsx (Chat_With_Lesson_Page)

Main page component managing the view state machine (`'catalog' | 'chatting'`) and coordinating navigation between the catalog and active chat session.

```typescript
// No external props — uses hooks for language preference and active language
// Internal state:
//   viewState: 'catalog' | 'chatting'
//   selectedLesson: PreLoadedLesson | null
```

## Data Models

### PreLoadedLesson

```typescript
export interface PreLoadedLesson {
  id: string;
  titleTh: string;
  titleEn: string;
  category: LessonCategory;
  proficiencyLevel: ProficiencyLevel;
  targetLanguage: TargetLanguage;
  descriptionTh: string;
  descriptionEn: string;
  wordContext: string[];
  goal: string;
  systemContext: string;
  icon: string;
}
```

### LessonCategory

```typescript
export type LessonCategory =
  | 'greetings'
  | 'travel'
  | 'food'
  | 'daily'
  | 'shopping'
  | 'culture';
```

### LessonCategoryGroup

```typescript
export interface LessonCategoryGroup {
  category: LessonCategory;
  labelTh: string;
  labelEn: string;
  lessons: PreLoadedLesson[];
}
```

## Detailed Design

### 1. Pre-Loaded Lesson Data Structure

```typescript
// /app/chat-lessons/_lib/types.ts

import type { ProficiencyLevel } from '@/app/chat/_lib/types';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

export interface PreLoadedLesson {
  id: string;
  titleTh: string;
  titleEn: string;
  category: LessonCategory;
  proficiencyLevel: ProficiencyLevel;
  targetLanguage: TargetLanguage;
  descriptionTh: string;
  descriptionEn: string;
  /** Key vocabulary words for this lesson's topic. */
  wordContext: string[];
  /** The conversation goal the AI works toward. */
  goal: string;
  /** Additional system prompt context for the AI. */
  systemContext: string;
  /** Icon identifier for display (Ant Design icon name). */
  icon: string;
}

export type LessonCategory =
  | 'greetings'
  | 'travel'
  | 'food'
  | 'daily'
  | 'shopping'
  | 'culture';

export interface LessonCategoryGroup {
  category: LessonCategory;
  labelTh: string;
  labelEn: string;
  lessons: PreLoadedLesson[];
}
```

### 2. Page Component (View State Machine)

```typescript
// /app/chat-lessons/page.tsx

type ViewState = 'catalog' | 'chatting';

// State transitions:
// - Initial: 'catalog'
// - User taps lesson card: 'catalog' → 'chatting'
// - User ends chat / goal reached: 'chatting' → 'catalog'
```

### 3. Home Page Integration

The second button in the Floating Tab Switcher (`activeSubTab === 1`) will navigate to `/chat-lessons` via `router.push('/chat-lessons')`.

### 4. Lesson Catalog Data

Static TypeScript file containing pre-defined lessons per language. Initial set includes 6–8 lessons for Korean (primary language). Lessons are grouped by category for display.

### 5. Chat Integration

When a lesson is selected:
1. Map `PreLoadedLesson` → `SessionConfig`
2. Call `startSession(config)` from `useConversationSession`
3. Render existing `ChatList`, `ChatInput`, `ReplySuggestions` components
4. Handle session end (goal reached or user-initiated)

### 6. Localization

All user-facing strings use the `isThai` pattern consistent with the rest of the app, selecting between Thai and English fields from the data structures.

## Correctness Properties

### Property 1: Lesson filtering by language is correct

*For any* selection of Active_Language, every lesson displayed in the Lesson_Catalog has a `targetLanguage` field matching the Active_Language.

```
∀ lesson ∈ displayedLessons:
  lesson.targetLanguage === activeLanguage
```

**Validates: Requirements 2.3**

### Property 2: All pre-loaded lessons have complete required fields

*For any* PreLoadedLesson in the catalog data, all required fields (id, titleTh, titleEn, category, proficiencyLevel, targetLanguage, descriptionTh, descriptionEn, wordContext, goal, systemContext, icon) are present and non-empty.

```
∀ lesson ∈ allLessons:
  lesson.id !== '' ∧
  lesson.titleTh !== '' ∧
  lesson.titleEn !== '' ∧
  lesson.category ∈ validCategories ∧
  lesson.proficiencyLevel ∈ ['beginner', 'intermediate', 'advanced'] ∧
  lesson.wordContext.length > 0 ∧
  lesson.goal !== ''
```

**Validates: Requirements 4.1**

### Property 3: Lesson grouping preserves all lessons

*For any* set of filtered lessons, the total count of lessons across all category groups equals the total count of lessons matching the active language filter. No lessons are lost or duplicated during grouping.

```
sum(group.lessons.length for group in categoryGroups) === filteredLessons.length
```

**Validates: Requirements 2.4**

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No lessons available for Active_Language | Display empty state message informing the user (Requirement 2.5) |
| Chat session fails to start (e.g., network error from `/api/chat`) | Show error toast/message and remain on the Lesson_Catalog view |
| Session disconnects mid-conversation | Display reconnection prompt; allow user to retry or return to catalog |
| Navigation back during active session | Show confirmation dialog before discarding the session (Requirement 6.2) |
| Invalid or corrupted lesson data | Skip the invalid lesson from display; log error for developer awareness |

## Testing Strategy

### Property-Based Tests

Use a property-based testing library (e.g., `fast-check`) to validate universal correctness properties. Each test runs a minimum of 100 iterations.

| Test | Property | Tag |
|------|----------|-----|
| Language filter correctness | Property 1 | Feature: ai-chat-with-lessons, Property 1: Lesson filtering by language |
| Complete required fields | Property 2 | Feature: ai-chat-with-lessons, Property 2: All pre-loaded lessons have complete required fields |
| Grouping preserves lessons | Property 3 | Feature: ai-chat-with-lessons, Property 3: Lesson grouping preserves all lessons |

### Example-Based / Unit Tests

- Navigation: tapping the second Floating Tab Switcher button navigates to `/chat-lessons`
- Lesson card tap starts a chat session with correct config mapping
- End Chat button shows confirmation dialog
- Completion summary appears when AI signals goal reached
- Localization: correct Thai/English strings render based on `isThai`

### Integration Tests

- Full flow: select lesson → chat session starts → end chat → return to catalog
- `useConversationSession` receives correct `SessionConfig` derived from `PreLoadedLesson`

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/chat-lessons/page.tsx` | Create | Main page component with catalog/chat view states |
| `app/chat-lessons/_components/LessonCatalog.tsx` | Create | Lesson list with category grouping |
| `app/chat-lessons/_components/LessonCatalogCard.tsx` | Create | Individual lesson card |
| `app/chat-lessons/_components/ChatWithLesson.tsx` | Create | Chat wrapper using existing session hooks |
| `app/chat-lessons/_lib/types.ts` | Create | PreLoadedLesson interface and types |
| `app/chat-lessons/_lib/lessonCatalogData.ts` | Create | Static lesson definitions |
| `app/home/page.tsx` | Modify | Wire button 2 in Floating Tab Switcher to navigate to `/chat-lessons` |

## Dependencies

- Existing: `useConversationSession`, `ChatList`, `ChatInput`, `ReplySuggestions`, `useLanguagePreference`, `useActiveLanguage`
- No new npm packages required
- No new API routes required (uses existing `/api/chat` route)
