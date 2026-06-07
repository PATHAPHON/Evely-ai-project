# Implementation Plan: TOPIK Exam Practice (Thailand)

## Overview

สร้างฟีเจอร์ฝึกทำข้อสอบ TOPIK จริงในแท็บที่ 3 ของ Home page โดยใช้ TypeScript, React components, และ JSON question banks ผู้ใช้เลือก TOPIK I หรือ TOPIK II ทำข้อสอบ 10 ข้อ (5 reading + 5 listening) แล้วดูผลคะแนน ออกแบบ UI ตาม neubrutalism design system เดิมของแอป รองรับ dark mode และ localization ไทย/อังกฤษ

## Tasks

- [x] 1. Set up TypeScript interfaces and types
  - [x] 1.1 Create `app/home/_lib/topik/types.ts` with interfaces: TopikExamType, TopikQuestion, TopikListeningQuestion, QuestionBank, ExamResult, UserAnswer
    - Define all type exports for use by components and hooks
    - _Requirements: 6.2_
  - [x] 1.2 Export all types from the types file for use by components and hooks
    - Ensure barrel exports are accessible
    - _Requirements: 6.2_

- [x] 2. Create Question Bank JSON files
  - [x] 2.1 Create `app/home/_lib/topik/topik1Questions.json` with at least 10 reading questions and 10 listening questions for TOPIK I level
    - Follow the QuestionBank JSON schema from design
    - Each question must have id, type, passage/audioSrc, question, 4 choices, and correctAnswer (0-3)
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 2.2 Create `app/home/_lib/topik/topik2Questions.json` with at least 10 reading questions and 10 listening questions for TOPIK II level
    - Follow the same schema as TOPIK I but with intermediate-advanced level content
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 2.3 Create placeholder audio directory structure `public/audio/topik/topik1/` and `public/audio/topik/topik2/` with at least one sample MP3 file each
    - Audio files referenced by listening questions
    - _Requirements: 4.2, 4.3, 6.2_

- [x] 3. Implement useTopikExam hook (State Management)
  - [x] 3.1 Create `app/home/_lib/topik/useTopikExam.ts` implementing the exam state machine (selecting → examining → completed)
    - Manage examState, examType, questions, currentIndex, answers
    - _Requirements: 2.2, 3.1, 4.1_
  - [x] 3.2 Implement `selectQuestions` function that randomly picks 5 reading + 5 listening questions from the question bank
    - Shuffle and slice from the JSON arrays
    - _Requirements: 6.4_
  - [x] 3.3 Implement `startExam`, `submitAnswer`, `retry`, `changeType` action functions
    - Handle all state transitions per the design state machine
    - _Requirements: 2.2, 3.3, 5.4_
  - [x] 3.4 Implement `calculateResult` function for score computation
    - Compute readingScore, listeningScore, totalScore from UserAnswer array
    - _Requirements: 5.1, 5.2_

- [x] 4. Checkpoint - Ensure core logic works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement ExamTypeSelector component
  - [x] 5.1 Create `app/home/_components/TopikPractice/ExamTypeSelector.tsx` displaying TOPIK I and TOPIK II options with neubrutalism card style
    - Use rounded corners, border-3, border-border-color, shadow-nb-sm
    - _Requirements: 2.1, 2.3, 8.1_
  - [x] 5.2 Add Thai/English labels using useStrings() hook
    - Display difficulty levels for each option
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 5.3 Add dark mode support with appropriate Tailwind dark: classes
    - Use dark:bg-[#2d2d44], dark:text-white
    - _Requirements: 8.2_

- [x] 6. Implement ReadingQuestion component
  - [x] 6.1 Create `app/home/_components/TopikPractice/ReadingQuestion.tsx` displaying passage, question text, and 4 answer choices
    - Korean text passage with question prompt and multiple choice
    - _Requirements: 3.2, 7.4_
  - [x] 6.2 Implement answer selection with visual feedback (highlight selected choice)
    - Record selected answer and allow user to proceed
    - _Requirements: 3.3_
  - [x] 6.3 Add QuestionProgress indicator showing current question number out of 10
    - Show section label (reading/listening) and progress
    - _Requirements: 3.4_

- [x] 7. Implement ListeningQuestion component
  - [x] 7.1 Create `app/home/_components/TopikPractice/ListeningQuestion.tsx` with audio play button and 4 answer choices
    - Use HTML5 audio element with React ref for playback
    - _Requirements: 4.2, 4.3_
  - [x] 7.2 Implement audio playback using HTML5 audio element with play/replay functionality
    - Allow user to replay audio multiple times before answering
    - _Requirements: 4.3, 4.4_
  - [x] 7.3 Add QuestionProgress indicator showing current question number
    - Consistent with ReadingQuestion progress display
    - _Requirements: 3.4_

- [x] 8. Implement ScoreSummary component
  - [x] 8.1 Create `app/home/_components/TopikPractice/ScoreSummary.tsx` displaying total score, reading/listening breakdown
    - Show correct/total for overall, reading, and listening
    - _Requirements: 5.1, 5.2_
  - [x] 8.2 Display correct/incorrect indicator for each question
    - Visual indicator per question showing result
    - _Requirements: 5.3_
  - [x] 8.3 Add retry and change type buttons
    - Allow user to retry same type or go back to selection
    - _Requirements: 5.4_

- [x] 9. Checkpoint - Ensure all components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement TopikPractice main container and wire everything
  - [x] 10.1 Create `app/home/_components/TopikPractice/TopikPractice.tsx` orchestrating the state machine and rendering appropriate sub-components
    - Render ExamTypeSelector, ReadingQuestion, ListeningQuestion, or ScoreSummary based on examState
    - _Requirements: 1.1, 2.2_
  - [x] 10.2 Wire useTopikExam hook to ExamTypeSelector, ReadingQuestion, ListeningQuestion, and ScoreSummary components
    - Pass callbacks and state to each child component
    - _Requirements: 3.1, 4.1, 5.1_
  - [x] 10.3 Add animate-card-fade-in class and ensure proper scroll behavior
    - Match existing tab content animation and padding
    - _Requirements: 8.3, 8.4_

- [x] 11. Integrate with Home Page
  - [x] 11.1 Modify `app/home/page.tsx` to render TopikPractice when activeSubTab === 2
    - Import TopikPractice and add conditional rendering in the scroll container
    - _Requirements: 1.1, 1.3_
  - [x] 11.2 Ensure tab switching works correctly without page reload
    - TOPIK_Tab highlight active style and content replacement
    - _Requirements: 1.2, 1.3_

- [x] 12. Add Localization strings
  - [x] 12.1 Add `topik` section to UIStrings interface in `app/_lib/strings.ts`
    - Define all string keys per the design localization section
    - _Requirements: 7.3_
  - [x] 12.2 Add Thai translations for all TOPIK UI strings
    - All labels, headings, buttons, score descriptions in Thai
    - _Requirements: 7.1_
  - [x] 12.3 Add English translations for all TOPIK UI strings
    - All labels, headings, buttons, score descriptions in English
    - _Requirements: 7.2_

- [x] 13. Checkpoint - Ensure full integration works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Property-Based Tests
  - [ ]* 14.1 Write property test for question selection size and order
    - **Property 1: Question selection always produces exactly 5 reading + 5 listening**
    - **Validates: Requirements 3.1, 4.1, 6.4**
  - [ ]* 14.2 Write property test for score calculation correctness
    - **Property 2: totalScore equals count of correct answers, readingScore + listeningScore equals totalScore**
    - **Validates: Requirements 5.1, 5.2**
  - [ ]* 14.3 Write property test for question bank structure validation
    - **Property 3: All questions have exactly 4 choices, correctAnswer 0-3, non-empty fields**
    - **Validates: Requirements 3.2, 4.2, 6.2**
  - [ ]* 14.4 Write property test for no duplicate question IDs in random selection
    - **Property 4: Random selection produces no duplicate question IDs**
    - **Validates: Requirements 6.4**

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- All UI text uses the existing `useStrings()` hook — no hardcoded strings
- Audio files are placeholder MP3s; real audio content can be added later
- No new npm packages required — uses existing React, Tailwind, and Ant Design Icons
- Korean question content remains in Korean regardless of translation language setting

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "12.1"] },
    { "id": 2, "tasks": ["3.1", "3.2", "12.2", "12.3"] },
    { "id": 3, "tasks": ["3.3", "3.4"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3", "6.1", "7.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "7.2", "7.3", "8.1"] },
    { "id": 6, "tasks": ["8.2", "8.3"] },
    { "id": 7, "tasks": ["10.1", "10.2", "10.3"] },
    { "id": 8, "tasks": ["11.1", "11.2"] },
    { "id": 9, "tasks": ["14.1", "14.2", "14.3", "14.4"] }
  ]
}
```
