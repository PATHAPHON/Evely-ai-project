# Design Document: TOPIK Question Bank Grid

## Overview

Refactor the TOPIK exam practice UI from a two-step level-selection → inline exam flow into a question bank grid. Home tab 3 renders 10 mock exam cards (5 TOPIK I + 5 TOPIK II) with category filter chips. Tapping a card navigates to a dedicated exam page at `/topik/[examId]`. The exam page reuses existing components (`ReadingQuestion`, `ListeningQuestion`, `ScoreSummary`) and the `useTopikExam` hook. No progress is persisted — the grid is always stateless.

## Architecture

### Route & File Structure

```
app/
├── home/
│   ├── _components/
│   │   └── TopikPractice/
│   │       ├── QuestionBankGrid.tsx       → new: replaces ExamTypeSelector usage
│   │       ├── QuestionBankCard.tsx        → new: single exam card
│   │       ├── CategoryFilter.tsx         → new: filter chips row
│   │       ├── ReadingQuestion.tsx         → existing (reused on exam page)
│   │       ├── ListeningQuestion.tsx      → existing (reused on exam page)
│   │       ├── ScoreSummary.tsx           → existing (reused on exam page)
│   │       └── TopikPractice.tsx          → modified: renders QuestionBankGrid
│   └── _lib/
│       └── topik/
│           ├── types.ts                   → extended with QuestionBankSetMeta
│           ├── questionBankSets.ts        → new: 10 mock set metadata
│           ├── useTopikExam.ts            → existing (reused)
│           ├── topik1Questions.json       → existing
│           └── topik2Questions.json       → existing
├── topik/
│   └── [examId]/
│       └── page.tsx                       → new: dedicated exam page
```

### Data Flow

```
Home (sub-tab 2 = Trophy icon)
  → TopikPractice renders QuestionBankGrid
    → CategoryFilter filters visible cards
    → User taps QuestionBankCard
      → router.push(`/topik/${examId}`)
        → Exam page reads examId from params
        → useTopikExam.startExam(examType) called with set's data
        → ReadingQuestion / ListeningQuestion rendered
        → On completion → ScoreSummary rendered
        → Back button → router.back() → Home grid (stateless reset)
```

## Components and Interfaces

### QuestionBankSetMeta (Data Type)

```typescript
export interface QuestionBankSetMeta {
  /** Unique identifier, e.g. "topik1-set-1" */
  id: string;
  /** Exam type: "topik1" or "topik2" */
  examType: TopikExamType;
  /** Localized set name key used with useStrings() */
  nameKey: string;
  /** Total number of questions in this set */
  questionCount: number;
  /** Difficulty label key, e.g. "beginner", "intermediate" */
  difficultyKey: string;
}
```

### CategoryFilter

Renders a row of filter chips above the grid.

```typescript
type FilterValue = 'all' | 'topik1' | 'topik2';

interface CategoryFilterProps {
  activeFilter: FilterValue;
  onFilterChange: (filter: FilterValue) => void;
}
```

Rendering logic:
- 3 chips: "All", "TOPIK I", "TOPIK II"
- Active chip gets `bg-accent-pink-bg border-border-color` styling
- Labels sourced from `useStrings().topik` (new keys added)

### QuestionBankCard

Renders a single exam set as a tappable neubrutalism card.

```typescript
interface QuestionBankCardProps {
  set: QuestionBankSetMeta;
  onTap: (examId: string) => void;
}
```

Styling:
- `rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] shadow-nb-sm`
- Displays: set name, question count badge, difficulty label
- Press state: `active:translate-y-[2px] active:shadow-none`

### QuestionBankGrid

Top-level component replacing the ExamTypeSelector in `TopikPractice`.

```typescript
interface QuestionBankGridProps {}
// Uses internal state for filter; reads questionBankSets data directly.
```

Internal logic:
```typescript
const [activeFilter, setActiveFilter] = useState<FilterValue>('all');
const visibleSets = filterSets(questionBankSets, activeFilter);
```

### filterSets (Pure Function)

```typescript
export function filterSets(
  sets: QuestionBankSetMeta[],
  filter: FilterValue
): QuestionBankSetMeta[] {
  if (filter === 'all') return sets;
  return sets.filter((s) => s.examType === filter);
}
```

### ExamPage (`app/topik/[examId]/page.tsx`)

```typescript
interface ExamPageProps {
  params: Promise<{ examId: string }>;
}
```

Responsibilities:
1. Resolve `examId` from route params using `React.use(params)`
2. Look up `QuestionBankSetMeta` by ID
3. Call `useTopikExam().startExam(set.examType)` on mount via `useEffect`
4. Render `ExamHeader` + question components + `ScoreSummary`
5. If `examId` is invalid, show error state or redirect

### ExamHeader

```typescript
interface ExamHeaderProps {
  examName: string;
  currentQuestion: number;
  totalQuestions: number;
  isCompleted: boolean;
  onBack: () => void;
}
```

Rendering:
- Back button (← icon) calling `router.back()`
- Exam name (centered, bold)
- Progress text `"3/10"` when `!isCompleted`
- Neubrutalism styling: `border-b-3 border-border-color bg-white dark:bg-[#1a1a2e]`

## Data Models

### Mock Question Bank Sets

File: `app/home/_lib/topik/questionBankSets.ts`

```typescript
import type { QuestionBankSetMeta } from './types';

export const questionBankSets: QuestionBankSetMeta[] = [
  { id: 'topik1-set-1', examType: 'topik1', nameKey: 'set1', questionCount: 10, difficultyKey: 'beginner' },
  { id: 'topik1-set-2', examType: 'topik1', nameKey: 'set2', questionCount: 10, difficultyKey: 'beginner' },
  { id: 'topik1-set-3', examType: 'topik1', nameKey: 'set3', questionCount: 10, difficultyKey: 'beginner' },
  { id: 'topik1-set-4', examType: 'topik1', nameKey: 'set4', questionCount: 10, difficultyKey: 'beginner' },
  { id: 'topik1-set-5', examType: 'topik1', nameKey: 'set5', questionCount: 10, difficultyKey: 'beginner' },
  { id: 'topik2-set-1', examType: 'topik2', nameKey: 'set6', questionCount: 10, difficultyKey: 'intermediate' },
  { id: 'topik2-set-2', examType: 'topik2', nameKey: 'set7', questionCount: 10, difficultyKey: 'intermediate' },
  { id: 'topik2-set-3', examType: 'topik2', nameKey: 'set8', questionCount: 10, difficultyKey: 'advanced' },
  { id: 'topik2-set-4', examType: 'topik2', nameKey: 'set9', questionCount: 10, difficultyKey: 'advanced' },
  { id: 'topik2-set-5', examType: 'topik2', nameKey: 'set10', questionCount: 10, difficultyKey: 'advanced' },
];
```

### Localization Keys (additions to `UIStrings.topik`)

```typescript
// New keys added to the topik section of UIStrings:
filterAll: string;
filterTopik1: string;
filterTopik2: string;
setName: (n: number) => string;
difficultyBeginner: string;
difficultyIntermediate: string;
difficultyAdvanced: string;
questionsCount: (n: number) => string;
examPageBack: string;
progress: (current: number, total: number) => string;
```

English values:
```typescript
filterAll: 'All',
filterTopik1: 'TOPIK I',
filterTopik2: 'TOPIK II',
setName: (n) => `Mock Exam ${n}`,
difficultyBeginner: 'Beginner',
difficultyIntermediate: 'Intermediate',
difficultyAdvanced: 'Advanced',
questionsCount: (n) => `${n} questions`,
examPageBack: 'Back',
progress: (current, total) => `${current}/${total}`,
```

Thai values:
```typescript
filterAll: 'ทั้งหมด',
filterTopik1: 'TOPIK I',
filterTopik2: 'TOPIK II',
setName: (n) => `ข้อสอบจำลอง ${n}`,
difficultyBeginner: 'ระดับต้น',
difficultyIntermediate: 'ระดับกลาง',
difficultyAdvanced: 'ระดับสูง',
questionsCount: (n) => `${n} ข้อ`,
examPageBack: 'กลับ',
progress: (current, total) => `${current}/${total}`,
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid `examId` in URL | Render a "Not Found" message with a link back to Home |
| Question bank set has no questions | Disable the card or show empty-state on exam page |
| Audio file missing for listening question | Existing ListeningQuestion graceful fallback applies |
| Route navigation failure | Next.js default error boundary handles it |

## Responsive Layout

The grid uses CSS grid with responsive columns:
```css
grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
gap: 12px;
```

On narrow screens (< 360px): single column. On wider screens: 2 columns. Cards maintain consistent height with flex column layout.

## Styling Tokens (Neubrutalism)

| Token | Light | Dark |
|-------|-------|------|
| Card background | `bg-white` | `dark:bg-[#2d2d44]` |
| Card border | `border-3 border-border-color` | same |
| Card shadow | `shadow-nb-sm` | same |
| Active filter chip | `bg-accent-pink-bg` | same |
| Header background | `bg-white` | `dark:bg-[#1a1a2e]` |
| Text primary | `text-black` | `dark:text-white` |
| Text secondary | `text-gray-500` | `dark:text-white/60` |

## Testing Strategy

**Unit tests** cover specific examples and edge cases:
- Rendering the grid with "All" filter shows 10 cards (Req 1.1)
- Default filter is "All" on mount (Req 2.7)
- Invalid examId shows error state (error handling)
- Dark mode classes applied correctly (Req 1.6, 4.5)
- Localized labels render correctly in Thai and English (Req 7.1–7.4)

**Property-based tests** verify universal behaviors:
- Filter logic returns correct subsets for all possible inputs (Property 1)
- Card rendering always includes all required data fields (Property 2)
- Navigation URL always matches the card's ID (Property 3)
- Header always shows name + progress for any valid state (Property 4)
- Mock data always passes structural validation (Property 6)

**Integration tests** cover component wiring:
- Tapping a card navigates to exam page (Req 3.1)
- Exam page auto-starts exam and renders questions (Req 5.5)
- Completing exam shows ScoreSummary (Req 3.4)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Filter function correctness

For any array of `QuestionBankSetMeta` items and any `FilterValue`, calling `filterSets(sets, filter)` SHALL return exactly those items whose `examType` matches the filter value, or all items when filter is `'all'`.

**Validates: Requirements 2.3, 2.4, 2.5**

### Property 2: Card content completeness

For any valid `QuestionBankSetMeta`, rendering a `QuestionBankCard` with that data SHALL produce output containing the exam set name, the question count, and the difficulty level.

**Validates: Requirements 1.2**

### Property 3: Navigation URL correctness

For any `QuestionBankSetMeta` with id `X`, tapping its `QuestionBankCard` SHALL trigger navigation to the path `/topik/X`.

**Validates: Requirements 3.1**

### Property 4: Exam header displays name and progress

For any exam set name and any valid `(currentQuestion, totalQuestions)` pair where `currentQuestion ≤ totalQuestions`, the `ExamHeader` SHALL display both the exam name and the progress string in format `"currentQuestion/totalQuestions"`.

**Validates: Requirements 4.2, 4.3**

### Property 5: Exam auto-start from route parameter

For any valid `examId` route parameter that maps to a `QuestionBankSetMeta`, the Exam_Page SHALL initialize `useTopikExam` in the `'examining'` state with questions matching that set's `examType`.

**Validates: Requirements 5.5**

### Property 6: Mock data structural validity

For all items in the `questionBankSets` array: (a) all `id` values SHALL be unique, (b) each item SHALL have a non-empty `nameKey`, `examType`, `questionCount > 0`, and `difficultyKey`, and (c) all associated questions SHALL have exactly 4 choices and a `correctAnswer` in the range `[0, 3]`.

**Validates: Requirements 6.1, 6.3**

### Property 7: Stateless grid — all cards always available

For any rendering of the `QuestionBankGrid` component (regardless of prior navigation history), all cards in the visible set SHALL be interactive (not disabled) and the filter SHALL default to `'all'`.

**Validates: Requirements 8.1, 8.2, 8.3**
