# Requirements Document

## Introduction

"AI Chat with Lessons" เป็นหน้าใหม่ที่ให้ผู้ใช้เข้าถึง AI Chat พร้อมบทเรียนสำเร็จรูป (pre-loaded lessons) ได้จากหน้า Home โดยผ่านปุ่มที่สอง (BookOutlined icon) ในแถบ floating tab switcher หน้านี้แตกต่างจากหน้า Tutor ตรงที่มาพร้อมเนื้อหาบทเรียนที่พร้อมใช้งานทันที ไม่ต้องตั้งค่าหัวข้อเอง ผู้ใช้สามารถเลือกบทเรียนจากรายการที่จัดเตรียมไว้แล้วเริ่มฝึกสนทนากับ AI ในบริบทของบทเรียนนั้นได้เลย

## Glossary

- **Lesson_Catalog**: รายการบทเรียนสำเร็จรูปที่จัดเตรียมไว้ล่วงหน้า แสดงเป็นรายการให้ผู้ใช้เลือก
- **Lesson_Card**: การ์ดแสดงข้อมูลสรุปของบทเรียนแต่ละบท เช่น ชื่อ ระดับ และคำอธิบายสั้น
- **AI_Chat_Session**: เซสชันสนทนากับ AI ที่ทำงานภายใต้บริบทของบทเรียนที่ผู้ใช้เลือก
- **Floating_Tab_Switcher**: แถบปุ่มกดแบบลอยที่อยู่เหนือ navigation bar ในหน้า Home ประกอบด้วยปุ่ม 4 ปุ่ม
- **Pre_Loaded_Lesson**: บทเรียนที่มีเนื้อหา หัวข้อ คำศัพท์ และระดับความยากถูกกำหนดไว้แล้ว พร้อมใช้งานทันที
- **Chat_With_Lesson_Page**: หน้าจอใหม่ที่แสดง Lesson_Catalog และเปิดให้ผู้ใช้เริ่ม AI_Chat_Session จากบทเรียนที่เลือก
- **Active_Language**: ภาษาเป้าหมายที่ผู้ใช้กำลังเรียนอยู่ในระบบ (เช่น เกาหลี ญี่ปุ่น จีน)

## Requirements

### Requirement 1: Navigation จาก Home ไปยังหน้า AI Chat with Lessons

**User Story:** As a learner, I want to navigate to the AI Chat with Lessons page from the Home screen's floating tab switcher, so that I can quickly access pre-loaded lesson content.

#### Acceptance Criteria

1. WHEN the user taps the second button (BookOutlined icon) in the Floating_Tab_Switcher on the Home page, THE Chat_With_Lesson_Page SHALL navigate the user to the `/chat-lessons` route
2. THE Chat_With_Lesson_Page SHALL display a back navigation button that returns the user to the Home page
3. WHILE the Chat_With_Lesson_Page is active, THE Floating_Tab_Switcher SHALL visually indicate the second button as the active state

### Requirement 2: แสดงรายการบทเรียนสำเร็จรูป (Lesson Catalog)

**User Story:** As a learner, I want to see a list of pre-loaded lessons organized by topic and difficulty, so that I can choose a lesson that matches my current level.

#### Acceptance Criteria

1. WHEN the Chat_With_Lesson_Page loads, THE Lesson_Catalog SHALL display a list of Pre_Loaded_Lesson items as Lesson_Card components
2. THE Lesson_Card SHALL display the lesson title, proficiency level indicator, a short description, and an icon representing the topic category
3. THE Lesson_Catalog SHALL filter displayed lessons based on the Active_Language selected by the user
4. THE Lesson_Catalog SHALL group lessons by category (e.g., greetings, travel, food, daily conversation)
5. IF no lessons are available for the Active_Language, THEN THE Lesson_Catalog SHALL display an empty state message informing the user

### Requirement 3: เริ่ม AI Chat Session จากบทเรียนที่เลือก

**User Story:** As a learner, I want to start an AI chat conversation pre-configured with lesson content, so that I can practice speaking within a guided topic without manual setup.

#### Acceptance Criteria

1. WHEN the user taps a Lesson_Card, THE Chat_With_Lesson_Page SHALL start an AI_Chat_Session with the topic, proficiency level, and word context from the selected Pre_Loaded_Lesson
2. THE AI_Chat_Session SHALL use the existing conversation session engine (useConversationSession) with pre-filled configuration from the Pre_Loaded_Lesson
3. WHILE an AI_Chat_Session is active, THE Chat_With_Lesson_Page SHALL display the chat interface with message list, reply suggestions, and text input
4. THE AI_Chat_Session SHALL include the lesson goal in the system prompt so the AI guides the conversation toward lesson objectives

### Requirement 4: Pre-Loaded Lesson Data Structure

**User Story:** As a developer, I want a well-defined data structure for pre-loaded lessons, so that new lesson content can be added consistently.

#### Acceptance Criteria

1. THE Pre_Loaded_Lesson SHALL contain: a unique identifier, title (Thai and English), category, proficiency level, target language, description (Thai and English), vocabulary word list, conversation goal, and a system prompt context
2. THE Pre_Loaded_Lesson proficiency level SHALL use the existing ProficiencyLevel type (beginner, intermediate, advanced)
3. THE Pre_Loaded_Lesson target language SHALL use the existing TargetLanguage type from the codebase

### Requirement 5: UI/UX ของหน้า Chat with Lessons

**User Story:** As a learner, I want the AI Chat with Lessons page to have a consistent visual style with the rest of the app, so that the experience feels cohesive.

#### Acceptance Criteria

1. THE Chat_With_Lesson_Page SHALL use the neobrutalist design system (border-3, shadow-nb-md, rounded-2xl, font-bold) consistent with other pages in the application
2. THE Chat_With_Lesson_Page SHALL support both Thai and English display text based on the user's language preference setting
3. THE Chat_With_Lesson_Page SHALL display a page header with the title "แชท AI กับบทเรียน" in Thai or "AI Chat with Lessons" in English
4. WHEN the Lesson_Catalog is loading, THE Chat_With_Lesson_Page SHALL display skeleton loading placeholders matching the existing skeleton animation pattern in the codebase

### Requirement 6: จัดการสถานะเซสชันและการกลับไปยังรายการบทเรียน

**User Story:** As a learner, I want to be able to end my current chat session and return to the lesson catalog to choose another lesson, so that I can practice multiple topics in one study session.

#### Acceptance Criteria

1. WHILE an AI_Chat_Session is active, THE Chat_With_Lesson_Page SHALL display an "End Chat" button in the header area
2. WHEN the user taps the "End Chat" button, THE Chat_With_Lesson_Page SHALL show a confirmation dialog before ending the session
3. WHEN the user confirms ending the session, THE Chat_With_Lesson_Page SHALL return to the Lesson_Catalog view
4. WHEN the AI concludes the conversation (goal reached), THE Chat_With_Lesson_Page SHALL display a completion summary and a button to return to the Lesson_Catalog
