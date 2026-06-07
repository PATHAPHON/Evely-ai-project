# Requirements Document

## Introduction

ฟีเจอร์ข้อสอบ TOPIK (Test of Proficiency in Korean) ฝึกทำจริง สำหรับผู้เรียนภาษาเกาหลีในประเทศไทย ในหน้า Home โดยเป็นแท็บที่ 3 (index 2) ของ floating tab switcher ที่ใช้ไอคอน Trophy ผู้ใช้สามารถฝึกทำข้อสอบ TOPIK ทั้ง TOPIK I และ TOPIK II โดยแต่ละชุดมี 5 ข้อ multiple choice (읽기 การอ่าน) และ 5 ข้อการฟัง (듣기) รวม 10 ข้อ โดยข้อสอบมาจากไฟล์ JSON ที่เตรียมไว้ และแสดงผลคะแนนหลังทำเสร็จ

## Glossary

- **TOPIK_Tab**: แท็บที่ 3 (index 2) ของ floating sub-tab switcher ในหน้า Home ที่ใช้ไอคอน TrophyOutlined
- **TOPIK_Practice**: หน้าจอฝึกทำข้อสอบ TOPIK ที่แสดงเมื่อ TOPIK_Tab ถูกเลือก
- **Exam_Type_Selector**: ส่วน UI สำหรับเลือกประเภทข้อสอบ TOPIK I หรือ TOPIK II
- **Reading_Question**: ข้อสอบส่วนการอ่าน (읽기) รูปแบบ multiple choice 4 ตัวเลือก
- **Listening_Question**: ข้อสอบส่วนการฟัง (듣기) รูปแบบ multiple choice 4 ตัวเลือก พร้อมไฟล์เสียงประกอบ
- **Question_Set**: ชุดข้อสอบ 1 ชุด ประกอบด้วย 5 Reading_Question และ 5 Listening_Question รวม 10 ข้อ
- **Score_Summary**: หน้าแสดงผลคะแนนหลังทำข้อสอบครบทุกข้อ
- **Question_Bank**: ไฟล์ JSON ที่เก็บคลังข้อสอบ TOPIK
- **Home_Page**: หน้าหลักของแอป Tranly ที่มี floating tab switcher

## Requirements

### Requirement 1: แสดง TOPIK Practice เมื่อเลือกแท็บที่ 3

**User Story:** ในฐานะผู้เรียนภาษาเกาหลีในไทย ฉันต้องการเข้าถึงข้อสอบ TOPIK ฝึกทำจากหน้า Home เพื่อฝึกฝนได้สะดวกทุกวัน

#### Acceptance Criteria

1. WHEN the user taps the TOPIK_Tab (index 2, TrophyOutlined icon), THE Home_Page SHALL display the TOPIK_Practice section replacing the previous content area
2. WHILE the TOPIK_Tab is active, THE Home_Page SHALL highlight the Trophy icon button with the active style (bg-accent-pink-bg, border-border-color, shadow-nb-sm) consistent with the existing tab switcher design
3. WHEN the user switches from TOPIK_Tab to another tab, THE Home_Page SHALL replace the TOPIK_Practice content with the corresponding tab content without page reload

### Requirement 2: เลือกประเภทข้อสอบ TOPIK I หรือ TOPIK II

**User Story:** ในฐานะผู้เรียนที่มีระดับแตกต่างกัน ฉันต้องการเลือกทำข้อสอบ TOPIK I (ระดับต้น) หรือ TOPIK II (ระดับกลาง-สูง) เพื่อฝึกในระดับที่เหมาะกับตัวเอง

#### Acceptance Criteria

1. WHEN the TOPIK_Tab is active, THE Exam_Type_Selector SHALL display two options: TOPIK I (levels 1-2) and TOPIK II (levels 3-6)
2. WHEN the user selects an exam type, THE TOPIK_Practice SHALL load a Question_Set from the Question_Bank JSON file corresponding to the selected exam type
3. THE Exam_Type_Selector SHALL indicate the difficulty level for each option: TOPIK I labelled as beginner (ระดับต้น) and TOPIK II labelled as intermediate-advanced (ระดับกลาง-สูง)

### Requirement 3: แสดงข้อสอบส่วนการอ่าน (읽기)

**User Story:** ในฐานะผู้ฝึกสอบ ฉันต้องการทำข้อสอบ reading แบบ multiple choice เพื่อฝึกทักษะการอ่านภาษาเกาหลี

#### Acceptance Criteria

1. WHEN a Question_Set is loaded, THE TOPIK_Practice SHALL display 5 Reading_Question items sequentially
2. THE Reading_Question SHALL display a passage or question text in Korean and 4 answer choices for the user to select from
3. WHEN the user selects an answer choice, THE TOPIK_Practice SHALL record the selected answer and allow the user to proceed to the next question
4. THE TOPIK_Practice SHALL display a progress indicator showing the current question number out of 10 total questions

### Requirement 4: แสดงข้อสอบส่วนการฟัง (듣기)

**User Story:** ในฐานะผู้ฝึกสอบ ฉันต้องการทำข้อสอบ listening แบบ multiple choice เพื่อฝึกทักษะการฟังภาษาเกาหลี

#### Acceptance Criteria

1. WHEN all 5 Reading_Questions are completed, THE TOPIK_Practice SHALL display 5 Listening_Question items sequentially
2. THE Listening_Question SHALL display an audio play button and 4 answer choices for the user to select from
3. WHEN the user taps the audio play button, THE TOPIK_Practice SHALL play the corresponding audio file for that question
4. THE Listening_Question SHALL allow the user to replay the audio multiple times before selecting an answer

### Requirement 5: แสดงผลคะแนนหลังทำข้อสอบ

**User Story:** ในฐานะผู้ฝึกสอบ ฉันต้องการเห็นผลคะแนนและสรุปข้อถูก-ผิดหลังทำเสร็จ เพื่อประเมินความพร้อมของตัวเอง

#### Acceptance Criteria

1. WHEN the user completes all 10 questions (5 reading + 5 listening), THE Score_Summary SHALL display the total score as correct answers out of 10
2. THE Score_Summary SHALL display a breakdown of reading score (out of 5) and listening score (out of 5) separately
3. THE Score_Summary SHALL display which questions were answered correctly and which were answered incorrectly
4. THE Score_Summary SHALL provide an option to retry the exam or select a different exam type

### Requirement 6: โครงสร้างข้อมูลจากไฟล์ JSON

**User Story:** ในฐานะนักพัฒนา ฉันต้องการให้ข้อสอบอยู่ในไฟล์ JSON ที่มีโครงสร้างชัดเจน เพื่อง่ายต่อการเพิ่มข้อสอบใหม่ในอนาคต

#### Acceptance Criteria

1. THE Question_Bank SHALL store questions in JSON files located within the app directory structure
2. THE Question_Bank JSON SHALL contain question text, answer choices, correct answer index, and audio file reference (for listening questions) for each question
3. THE Question_Bank SHALL separate TOPIK I and TOPIK II questions into distinct data sets
4. WHEN the TOPIK_Practice loads a Question_Set, THE system SHALL randomly select 5 reading questions and 5 listening questions from the Question_Bank for the chosen exam type

### Requirement 7: รองรับภาษาไทยและภาษาอังกฤษ

**User Story:** ในฐานะผู้ใช้แอปที่อาจเลือกภาษาอังกฤษเป็นภาษาแปล ฉันต้องการเห็น UI labels ของหน้า TOPIK ในภาษาที่ฉันเลือก เพื่อความสะดวกในการอ่าน

#### Acceptance Criteria

1. THE TOPIK_Practice SHALL display all UI labels, headings, button text, and score summary descriptions in Thai when the translation language is set to Thai
2. THE TOPIK_Practice SHALL display all UI labels, headings, button text, and score summary descriptions in English when the translation language is set to English
3. THE TOPIK_Practice SHALL use the existing useStrings() hook for all user-facing text strings
4. THE Reading_Question and Listening_Question content (Korean text and answer choices) SHALL remain in Korean regardless of the translation language setting

### Requirement 8: การออกแบบ UI สอดคล้องกับ Design System เดิม

**User Story:** ในฐานะผู้ใช้แอป ฉันต้องการให้หน้าฝึกสอบ TOPIK มีรูปลักษณ์ที่เข้ากับส่วนอื่น ๆ ของแอป เพื่อประสบการณ์การใช้งานที่ราบรื่น

#### Acceptance Criteria

1. THE TOPIK_Practice SHALL use the neubrutalism card style (rounded corners, border-3 border-border-color, shadow-nb-sm) consistent with the existing app design system
2. THE TOPIK_Practice SHALL support dark mode by using the existing Tailwind dark: variant classes (dark:bg-[#2d2d44], dark:text-white)
3. THE TOPIK_Practice SHALL render within the existing scroll container and respect the same bottom padding as other tab content sections
4. THE TOPIK_Practice SHALL include the animate-card-fade-in class for smooth entry animation when switching to the tab
