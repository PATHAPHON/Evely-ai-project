# Design Document: TOPIK Exam Practice (Thailand)

## Overview

ฟีเจอร์ฝึกทำข้อสอบ TOPIK จริง ในแท็บที่ 3 (index 2, TrophyOutlined) ของ floating sub-tab switcher บนหน้า Home ผู้ใช้เลือกประเภทข้อสอบ TOPIK I หรือ TOPIK II แล้วทำข้อสอบ 10 ข้อ (5 ข้อ reading + 5 ข้อ listening) จากไฟล์ JSON ที่เตรียมไว้ หลังทำเสร็จแสดงผลคะแนนพร้อมสรุปข้อถูก-ผิด

## Architecture

### Component Structure

```
app/home/_components/
  └── TopikPractice/
      ├── TopikPractice.tsx         → main container, state machine
      ├── ExamTypeSelector.tsx      → TOPIK I / TOPIK II selection UI
      ├── ReadingQuestion.tsx       → reading question card
      ├── ListeningQuestion.tsx     → listening question card with audio
      ├── QuestionProgress.tsx      → progress indicator (1/10)
      └── ScoreSummary.tsx          → score display after completion

app/home/_lib/
  └── topik/
      ├── types.ts                  → TypeScript interfaces
      ├── topik1Questions.json      → TOPIK I question bank
      ├── topik2Questions.json      → TOPIK II question bank
      └── useTopikExam.ts           → exam state management hook
```

### Data Flow

```
Home (TOPIK_Tab active, activeSubTab === 2)
  → TopikPractice (state: 'selecting')
    → User selects TOPIK I or TOPIK II
      → state: 'examining'
      → Randomly pick 5 reading + 5 listening from JSON
      → Show questions sequentially (reading first, then listening)
        → User selects answer → next question
          → All 10 done → state: 'completed'
            → ScoreSummary (retry or change type)
              → state: 'selecting'
```

## Components and Interfaces

### TopikPractice

Main container managing the exam flow state machine. Renders as the content for `activeSubTab === 2` inside the home page.

```typescript
interface TopikPracticeProps {
  // No props needed — uses hooks for language and internal state
}

type ExamState = 'selecting' | 'examining' | 'completed';
```

### ExamTypeSelector

UI for choosing between TOPIK I and TOPIK II.

```typescript
interface ExamTypeSelectorProps {
  onSelect: (examType: TopikExamType) => void;
}
```

### ReadingQuestion

Displays a reading question with passage/question text and 4 choices.

```typescript
interface ReadingQuestionProps {
  question: TopikQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (selectedIndex: number) => void;
}
```

### ListeningQuestion

Displays a listening question with audio player and 4 choices.

```typescript
interface ListeningQuestionProps {
  question: TopikListeningQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (selectedIndex: number) => void;
}
```

### QuestionProgress

Shows current question progress (e.g., 3/10).

```typescript
interface QuestionProgressProps {
  current: number;
  total: number;
  section: 'reading' | 'listening';
}
```

### ScoreSummary

Displays results after exam completion.

```typescript
interface ScoreSummaryProps {
  results: ExamResult;
  onRetry: () => void;
  onChangeType: () => void;
}
```

## Data Models

### TopikExamType

```typescript
export type TopikExamType = 'topik1' | 'topik2';
```

### TopikQuestion (Reading)

```typescript
export interface TopikQuestion {
  id: string;
  type: 'reading';
  /** Korean passage or question context */
  passage: string;
  /** The question prompt in Korean */
  question: string;
  /** 4 answer choices in Korean */
  choices: [string, string, string, string];
  /** Index of the correct answer (0-3) */
  correctAnswer: number;
}
```

### TopikListeningQuestion

```typescript
export interface TopikListeningQuestion {
  id: string;
  type: 'listening';
  /** Path to the audio file (relative to public/) */
  audioSrc: string;
  /** The question prompt in Korean (shown on screen) */
  question: string;
  /** 4 answer choices in Korean */
  choices: [string, string, string, string];
  /** Index of the correct answer (0-3) */
  correctAnswer: number;
}
```

### QuestionBank

```typescript
export interface QuestionBank {
  examType: TopikExamType;
  reading: TopikQuestion[];
  listening: TopikListeningQuestion[];
}
```

### ExamResult

```typescript
export interface ExamResult {
  examType: TopikExamType;
  answers: UserAnswer[];
  readingScore: number;
  listeningScore: number;
  totalScore: number;
  totalQuestions: number;
}

export interface UserAnswer {
  questionId: string;
  questionType: 'reading' | 'listening';
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
}
```

## Detailed Design

### 1. State Machine (useTopikExam hook)

```typescript
// app/home/_lib/topik/useTopikExam.ts

export function useTopikExam() {
  const [examState, setExamState] = useState<ExamState>('selecting');
  const [examType, setExamType] = useState<TopikExamType | null>(null);
  const [questions, setQuestions] = useState<(TopikQuestion | TopikListeningQuestion)[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);

  function startExam(type: TopikExamType): void;
  function submitAnswer(selectedIndex: number): void;
  function retry(): void;
  function changeType(): void;

  return {
    examState, examType, questions, currentIndex, answers,
    currentQuestion, result,
    startExam, submitAnswer, retry, changeType
  };
}
```

State transitions:
- `'selecting'` → User calls `startExam(type)` → `'examining'`
- `'examining'` → Last question answered → `'completed'`
- `'completed'` → User calls `retry()` → `'examining'` (same type, new random set)
- `'completed'` → User calls `changeType()` → `'selecting'`

### 2. Question Selection (Random Sampling)

When `startExam` is called:
1. Import the corresponding JSON file (`topik1Questions.json` or `topik2Questions.json`)
2. Shuffle reading questions, pick first 5
3. Shuffle listening questions, pick first 5
4. Combine into ordered array: [reading0..4, listening5..9]
5. Set `currentIndex = 0`

```typescript
function selectQuestions(bank: QuestionBank): (TopikQuestion | TopikListeningQuestion)[] {
  const reading = shuffleArray(bank.reading).slice(0, 5);
  const listening = shuffleArray(bank.listening).slice(0, 5);
  return [...reading, ...listening];
}
```

### 3. Home Page Integration

In `app/home/page.tsx`, the scroll container renders content based on `activeSubTab`:

```typescript
{activeSubTab === 2 ? (
  <div className="px-4 pb-4 animate-card-fade-in">
    <TopikPractice />
  </div>
) : activeSubTab === 1 ? (
  // existing LessonCatalog
) : (
  // existing WordFeed
)}
```

### 4. Audio Playback (Listening Questions)

Use HTML5 `<audio>` element with React ref for playback control:

```typescript
const audioRef = useRef<HTMLAudioElement>(null);

function playAudio() {
  if (audioRef.current) {
    audioRef.current.currentTime = 0;
    audioRef.current.play();
  }
}
```

Audio files stored in `public/audio/topik/` directory.

### 5. JSON Question Bank Format

```json
{
  "examType": "topik1",
  "reading": [
    {
      "id": "t1-r-001",
      "type": "reading",
      "passage": "오늘 날씨가 좋습니다. 공원에 사람이 많습니다.",
      "question": "오늘 날씨는 어떻습니까?",
      "choices": ["좋습니다", "나쁩니다", "춥습니다", "덥습니다"],
      "correctAnswer": 0
    }
  ],
  "listening": [
    {
      "id": "t1-l-001",
      "type": "listening",
      "audioSrc": "/audio/topik/topik1/l-001.mp3",
      "question": "남자는 무엇을 합니까?",
      "choices": ["공부합니다", "운동합니다", "요리합니다", "청소합니다"],
      "correctAnswer": 1
    }
  ]
}
```

### 6. Localization (useStrings Extension)

Add TOPIK-specific strings to the `UIStrings` interface:

```typescript
topik: {
  title: string;            // "ฝึกทำข้อสอบ TOPIK" / "TOPIK Practice"
  selectType: string;       // "เลือกระดับข้อสอบ" / "Select Exam Level"
  topik1Label: string;      // "TOPIK I (ระดับต้น)" / "TOPIK I (Beginner)"
  topik1Desc: string;       // "ระดับ 1-2" / "Levels 1-2"
  topik2Label: string;      // "TOPIK II (ระดับกลาง-สูง)" / "TOPIK II (Intermediate-Advanced)"
  topik2Desc: string;       // "ระดับ 3-6" / "Levels 3-6"
  reading: string;          // "การอ่าน" / "Reading"
  listening: string;        // "การฟัง" / "Listening"
  questionOf: (n: number, total: number) => string; // "ข้อ 3/10" / "Question 3/10"
  playAudio: string;        // "เล่นเสียง" / "Play Audio"
  next: string;             // "ข้อถัดไป" / "Next"
  submit: string;           // "ส่งคำตอบ" / "Submit"
  scoreTitle: string;       // "ผลคะแนน" / "Your Score"
  scoreTotal: (correct: number, total: number) => string;
  readingScore: string;     // "คะแนนอ่าน" / "Reading Score"
  listeningScore: string;   // "คะแนนฟัง" / "Listening Score"
  correct: string;          // "ถูก" / "Correct"
  incorrect: string;        // "ผิด" / "Incorrect"
  retry: string;            // "ทำใหม่" / "Try Again"
  changeType: string;       // "เปลี่ยนระดับ" / "Change Level"
};
```

### 7. Score Calculation

```typescript
function calculateResult(
  examType: TopikExamType,
  questions: (TopikQuestion | TopikListeningQuestion)[],
  answers: UserAnswer[]
): ExamResult {
  const readingScore = answers
    .filter(a => a.questionType === 'reading' && a.isCorrect).length;
  const listeningScore = answers
    .filter(a => a.questionType === 'listening' && a.isCorrect).length;

  return {
    examType,
    answers,
    readingScore,
    listeningScore,
    totalScore: readingScore + listeningScore,
    totalQuestions: 10,
  };
}
```

## Correctness Properties

### Property 1: Question selection always produces exactly 5 reading + 5 listening

*For any* exam type and any question bank with at least 5 reading and 5 listening questions, the `selectQuestions` function returns exactly 10 questions with the first 5 being reading type and the last 5 being listening type.

```
∀ bank where bank.reading.length >= 5 ∧ bank.listening.length >= 5:
  let selected = selectQuestions(bank)
  selected.length === 10 ∧
  selected.slice(0, 5).every(q => q.type === 'reading') ∧
  selected.slice(5, 10).every(q => q.type === 'listening')
```

**Validates: Requirements 3.1, 4.1, 6.4**

### Property 2: Score calculation is correct

*For any* set of 10 user answers, the total score equals the count of correct answers, and readingScore + listeningScore equals totalScore.

```
∀ answers where answers.length === 10:
  let result = calculateResult(type, questions, answers)
  result.totalScore === answers.filter(a => a.isCorrect).length ∧
  result.readingScore + result.listeningScore === result.totalScore ∧
  result.readingScore === answers.filter(a => a.questionType === 'reading' && a.isCorrect).length ∧
  result.listeningScore === answers.filter(a => a.questionType === 'listening' && a.isCorrect).length
```

**Validates: Requirements 5.1, 5.2**

### Property 3: All questions in question bank have valid structure

*For any* question in the question bank JSON, the question has exactly 4 choices and a correctAnswer index between 0 and 3.

```
∀ question ∈ questionBank:
  question.choices.length === 4 ∧
  question.correctAnswer >= 0 ∧
  question.correctAnswer <= 3 ∧
  question.id !== '' ∧
  question.question !== ''
```

**Validates: Requirements 3.2, 4.2, 6.2**

### Property 4: Random selection produces no duplicate questions

*For any* invocation of `selectQuestions`, all returned questions have unique IDs.

```
∀ selected = selectQuestions(bank):
  new Set(selected.map(q => q.id)).size === selected.length
```

**Validates: Requirements 6.4**

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Question bank JSON has fewer than 5 reading questions | Display all available questions and adjust total count accordingly |
| Question bank JSON has fewer than 5 listening questions | Display all available questions and adjust total count accordingly |
| Audio file fails to load | Show error message on the listening question card, allow user to skip or retry playback |
| User navigates away during exam | Exam state is lost (no persistence); user starts fresh on return |
| Invalid JSON structure | Log error to console, show empty state with message to user |

## Testing Strategy

### Property-Based Tests (fast-check)

| Test | Property | Tag |
|------|----------|-----|
| Question selection size & order | Property 1 | Feature: topik-exam-thailand, Property 1 |
| Score calculation correctness | Property 2 | Feature: topik-exam-thailand, Property 2 |
| Question bank structure validation | Property 3 | Feature: topik-exam-thailand, Property 3 |
| No duplicate questions selected | Property 4 | Feature: topik-exam-thailand, Property 4 |

### Example-Based / Unit Tests

- `ExamTypeSelector` renders two options (TOPIK I, TOPIK II)
- Selecting TOPIK I calls `onSelect('topik1')`
- `ReadingQuestion` renders passage, question, and 4 choices
- `ListeningQuestion` renders audio button and 4 choices
- `ScoreSummary` renders correct/incorrect breakdown
- Progress indicator shows correct "n/10" format
- Retry button resets to examining state with new random questions
- Change Type button resets to selecting state

### Integration Tests

- Full flow: select type → answer 10 questions → see score → retry
- Audio playback: play button triggers audio element play
- Tab switching: switching away and back preserves no state (fresh start)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/home/_components/TopikPractice/TopikPractice.tsx` | Create | Main container component |
| `app/home/_components/TopikPractice/ExamTypeSelector.tsx` | Create | TOPIK I/II selection UI |
| `app/home/_components/TopikPractice/ReadingQuestion.tsx` | Create | Reading question card |
| `app/home/_components/TopikPractice/ListeningQuestion.tsx` | Create | Listening question card with audio |
| `app/home/_components/TopikPractice/QuestionProgress.tsx` | Create | Progress indicator |
| `app/home/_components/TopikPractice/ScoreSummary.tsx` | Create | Score result display |
| `app/home/_lib/topik/types.ts` | Create | TypeScript interfaces |
| `app/home/_lib/topik/topik1Questions.json` | Create | TOPIK I question bank |
| `app/home/_lib/topik/topik2Questions.json` | Create | TOPIK II question bank |
| `app/home/_lib/topik/useTopikExam.ts` | Create | Exam state management hook |
| `app/home/page.tsx` | Modify | Add TopikPractice render for activeSubTab === 2 |
| `app/_lib/strings.ts` | Modify | Add topik section to UIStrings |
| `public/audio/topik/topik1/` | Create | Audio files for TOPIK I listening |
| `public/audio/topik/topik2/` | Create | Audio files for TOPIK II listening |

## Dependencies

- Existing: `useStrings`, `useLanguagePreference`, Tailwind CSS, Ant Design Icons
- No new npm packages required
- No new API routes required (all data from static JSON)
- Audio files: MP3 format, stored in public directory
