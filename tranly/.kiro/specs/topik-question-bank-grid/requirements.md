# Requirements Document

## Introduction

Refactor the TOPIK exam practice feature from a level-selection → inline-exam flow into a question bank grid UI. Home tab 3 displays 10 mock exam sets (5 TOPIK I + 5 TOPIK II) as cards in a grid with category filter chips. Tapping a card navigates to a dedicated exam page (`/topik/[examId]`) where the exam experience occurs. All data is mock/placeholder. Existing components (ReadingQuestion, ListeningQuestion, ScoreSummary, useTopikExam) are reused on the exam page.

## Glossary

- **Grid_View**: The card grid displayed on Home tab 3 showing all available question bank sets
- **Question_Bank_Card**: A single card in the Grid_View representing one mock exam set
- **Category_Filter**: A row of filter chips above the Grid_View for filtering by exam level
- **Exam_Page**: The dedicated route `/topik/[examId]` where the exam experience takes place
- **Exam_Header**: The top bar on the Exam_Page showing progress, exam name, and back navigation
- **Question_Bank_Set**: A collection of questions grouped as one mock exam (reading + listening)
- **System**: The TOPIK question bank grid feature as a whole
- **Filter_Chip**: An individual selectable chip within the Category_Filter row

## Requirements

### Requirement 1: Question Bank Grid Display

**User Story:** As a learner, I want to see all available mock exam sets at a glance, so that I can quickly pick which exam to practice.

#### Acceptance Criteria

1. WHEN Home tab 3 is active, THE Grid_View SHALL display 10 Question_Bank_Card elements arranged in a responsive grid layout.
2. THE Question_Bank_Card SHALL display the exam set name, the number of questions in the set, and the difficulty level.
3. THE Grid_View SHALL display 5 Question_Bank_Card elements for TOPIK I and 5 Question_Bank_Card elements for TOPIK II.
4. THE Grid_View SHALL render without a separate level selection step preceding the grid.
5. THE Question_Bank_Card SHALL follow the neubrutalism design system with border-3, border-border-color, rounded corners, and shadow-nb-sm styling.
6. WHILE dark mode is active, THE Question_Bank_Card SHALL use dark:bg-[#2d2d44] and dark:text-white color tokens.

### Requirement 2: Category Filter

**User Story:** As a learner, I want to filter exam sets by level, so that I can focus on TOPIK I or TOPIK II content separately.

#### Acceptance Criteria

1. THE Category_Filter SHALL display three Filter_Chip options: "All", "TOPIK I", and "TOPIK II".
2. THE Category_Filter SHALL appear above the Grid_View.
3. WHEN the "All" Filter_Chip is selected, THE Grid_View SHALL display all 10 Question_Bank_Card elements.
4. WHEN the "TOPIK I" Filter_Chip is selected, THE Grid_View SHALL display only the 5 TOPIK I Question_Bank_Card elements.
5. WHEN the "TOPIK II" Filter_Chip is selected, THE Grid_View SHALL display only the 5 TOPIK II Question_Bank_Card elements.
6. THE Category_Filter SHALL visually indicate the currently active Filter_Chip using the accent-pink-bg background with border-border-color styling.
7. WHEN the Grid_View first renders, THE Category_Filter SHALL default to the "All" selection.

### Requirement 3: Exam Page Navigation

**User Story:** As a learner, I want to tap an exam card and go to a dedicated exam page, so that the exam experience is focused and full-screen.

#### Acceptance Criteria

1. WHEN a user taps a Question_Bank_Card, THE System SHALL navigate to the route `/topik/[examId]` where `[examId]` matches the selected Question_Bank_Set identifier.
2. THE Exam_Page SHALL be a Next.js App Router page at the path `app/topik/[examId]/page.tsx`.
3. THE Exam_Page SHALL render the exam experience including questions and score summary.
4. WHEN the user completes the exam on the Exam_Page, THE Exam_Page SHALL display the ScoreSummary component with results.

### Requirement 4: Exam Page Header

**User Story:** As a learner, I want to see my progress and easily go back while taking an exam, so that I feel oriented and in control.

#### Acceptance Criteria

1. THE Exam_Header SHALL display a back button that navigates the user to the previous page.
2. THE Exam_Header SHALL display the name of the current exam set.
3. WHILE the user is answering questions, THE Exam_Header SHALL display a progress indicator showing the current question number out of the total number of questions.
4. THE Exam_Header SHALL follow the neubrutalism design system styling consistent with the rest of the application.
5. WHILE dark mode is active, THE Exam_Header SHALL use appropriate dark mode color tokens.

### Requirement 5: Component Reuse on Exam Page

**User Story:** As a developer, I want to reuse existing exam components on the new exam page, so that the codebase remains DRY and consistent.

#### Acceptance Criteria

1. THE Exam_Page SHALL use the existing ReadingQuestion component to render reading questions.
2. THE Exam_Page SHALL use the existing ListeningQuestion component to render listening questions.
3. THE Exam_Page SHALL use the existing ScoreSummary component to display exam results.
4. THE Exam_Page SHALL use the existing useTopikExam hook for state management of the exam flow.
5. WHEN the useTopikExam hook is initialized on the Exam_Page, THE Exam_Page SHALL start the exam automatically using the Question_Bank_Set identified by the route parameter.

### Requirement 6: Mock Data

**User Story:** As a developer, I want placeholder data for all 10 exam sets, so that the grid and exam experience can be developed and tested without real content.

#### Acceptance Criteria

1. THE System SHALL define 10 Question_Bank_Set records with unique identifiers, exam set names, question counts, and difficulty levels.
2. THE System SHALL assign 5 Question_Bank_Set records to TOPIK I and 5 Question_Bank_Set records to TOPIK II.
3. THE Question_Bank_Set data SHALL include placeholder question content (reading and listening questions) following the existing TopikQuestion and TopikListeningQuestion interfaces.
4. THE System SHALL store mock data as static TypeScript or JSON files within the project source.

### Requirement 7: Localization

**User Story:** As a Thai/English user, I want the grid UI and exam page to display in my preferred language, so that the experience feels native.

#### Acceptance Criteria

1. THE Grid_View SHALL display all user-facing labels using the useStrings() hook.
2. THE Category_Filter chip labels SHALL be localized in Thai and English via the useStrings() hook.
3. THE Exam_Header labels SHALL be localized in Thai and English via the useStrings() hook.
4. THE Question_Bank_Card text (exam set name, difficulty label) SHALL be localized in Thai and English via the useStrings() hook.

### Requirement 8: Stateless Grid Behavior

**User Story:** As a learner, I want a simple grid with no progress tracking, so that I can freely pick any exam set at any time without state concerns.

#### Acceptance Criteria

1. THE Grid_View SHALL render identically on every visit with no persisted progress or completion state.
2. THE Grid_View SHALL treat all 10 Question_Bank_Card elements as available and tappable at all times.
3. WHEN the user navigates back from the Exam_Page to the Grid_View, THE Grid_View SHALL display the same default state with "All" filter active.
