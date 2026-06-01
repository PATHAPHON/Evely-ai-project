# Requirements Document

## Introduction

ระบบเกมหลายภาษา (Multi-Language Game) สำหรับแอป Tarnly ที่ช่วยให้ผู้ใช้สามารถเรียนรู้คำศัพท์ได้ 4 ภาษา ได้แก่ อังกฤษ ญี่ปุ่น เกาหลี และจีน โดยข้อมูลของแต่ละภาษาจะถูกจัดเก็บแยกกัน ผู้ใช้สามารถเลือกภาษาที่ต้องการเรียนและสลับไปมาระหว่างภาษาได้ โดยข้อมูลการเรียนของแต่ละภาษาจะไม่ปะปนกัน

## Glossary

- **Game_System**: ระบบเกมการเรียนรู้คำศัพท์หลายภาษาของแอป Tarnly
- **Target_Language**: ภาษาที่ผู้ใช้เลือกเรียน (English, Japanese, Korean, Chinese)
- **Language_Selector**: ส่วนติดต่อผู้ใช้สำหรับเลือกภาษาที่ต้องการเรียน
- **Language_Store**: พื้นที่จัดเก็บข้อมูลใน IndexedDB ที่แยกตามภาษา
- **Word_Record**: ข้อมูลคำศัพท์ที่ผู้ใช้บันทึกไว้ ประกอบด้วยคำ การอ่าน การแปล และรูปภาพ
- **Feed_Word**: คำศัพท์ที่ระบบสร้างให้ผู้ใช้เรียนรู้ในแต่ละวัน
- **Flashcard_Set**: ชุดแฟลชการ์ดที่ผู้ใช้สร้างจากคำศัพท์ที่บันทึกไว้
- **Active_Language**: ภาษาที่ผู้ใช้กำลังเรียนอยู่ในขณะนั้น

## Requirements

### Requirement 1: เลือกภาษาที่ต้องการเรียน

**User Story:** As a learner, I want to select which language I want to study (English, Japanese, Korean, or Chinese), so that I can focus on learning one language at a time.

#### Acceptance Criteria

1. THE Language_Selector SHALL display four Target_Language options: English, Japanese, Korean, and Chinese
2. WHEN a user selects a Target_Language, THE Game_System SHALL set that language as the Active_Language and visually indicate the selected language as the current Active_Language
3. THE Game_System SHALL persist the Active_Language selection to localStorage immediately upon selection so that the selection survives page reloads
4. IF no Active_Language value exists in localStorage when the app launches, THEN THE Game_System SHALL default the Active_Language to Korean
5. THE Language_Selector SHALL visually distinguish the current Active_Language from the other options at all times

### Requirement 2: แยกข้อมูลจัดเก็บตามภาษา

**User Story:** As a learner, I want my vocabulary data for each language to be stored separately, so that words from different languages do not mix together.

#### Acceptance Criteria

1. THE Language_Store SHALL maintain a separate IndexedDB object store for each of the four Target_Language values (English, Japanese, Korean, Chinese)
2. WHEN a user saves a Word_Record, THE Game_System SHALL associate that record with the current Active_Language and store it exclusively in the corresponding Language_Store
3. WHEN a user switches the Active_Language, THE Game_System SHALL display only Word_Record entries belonging to the selected language and SHALL NOT display Word_Record entries from any other Target_Language
4. THE Game_System SHALL preserve all Word_Record data for inactive languages without modification
5. IF IndexedDB storage is unavailable or a write operation fails, THEN THE Game_System SHALL display an error message indicating that the word could not be saved and SHALL NOT discard the user's input

### Requirement 3: ฟีดคำศัพท์ตามภาษาที่เลือก

**User Story:** As a learner, I want to receive daily vocabulary feed words in my selected language, so that I can learn new words relevant to the language I am studying.

#### Acceptance Criteria

1. WHEN the user opens the app and no Feed_Word entries exist for the current calendar date in the Active_Language, THE Game_System SHALL generate a set of 5 Feed_Word entries in the Active_Language
2. THE Language_Store SHALL store Feed_Word records separately for each Target_Language
3. WHEN a user switches the Active_Language, THE Game_System SHALL display only Feed_Word entries belonging to the selected language
4. THE Game_System SHALL maintain independent daily feed history for each Target_Language, retaining at least the most recent 30 days of entries
5. IF the Game_System has already generated Feed_Word entries for the current date and Active_Language, THEN THE Game_System SHALL display the existing entries without generating duplicates
6. IF Feed_Word generation fails, THEN THE Game_System SHALL display an error message indicating that new words could not be loaded and SHALL retain any previously generated Feed_Word entries

### Requirement 4: แฟลชการ์ดแยกตามภาษา

**User Story:** As a learner, I want my flashcard sets to be organized by language, so that I can study flashcards for one language without seeing cards from another.

#### Acceptance Criteria

1. WHEN a user creates a Flashcard_Set, THE Game_System SHALL store that set in the Language_Store for the current Active_Language
2. WHEN a user views flashcard sets, THE Game_System SHALL display only Flashcard_Set entries belonging to the Active_Language
3. IF no Flashcard_Set entries exist for the Active_Language, THEN THE Game_System SHALL display an empty state indicating that no flashcard sets have been created for the selected language
4. THE Game_System SHALL preserve Flashcard_Set data for inactive languages without modification

### Requirement 5: โครงสร้างข้อมูลคำศัพท์ตามภาษา

**User Story:** As a learner, I want each language's word data to include appropriate fields for that language's writing system, so that I can see correct pronunciation guides and translations.

#### Acceptance Criteria

1. WHEN the Active_Language is Japanese, THE Word_Record SHALL include required fields for kanji, hiragana reading, romaji, and Thai translation, where each field accepts a maximum of 100 characters
2. WHEN the Active_Language is Korean, THE Word_Record SHALL include required fields for hangul, Thai reading (pronunciation guide in Thai script), romanization, and Thai translation, where each field accepts a maximum of 100 characters
3. WHEN the Active_Language is Chinese, THE Word_Record SHALL include required fields for hanzi, pinyin (with tone marks or tone numbers), and Thai translation, where each field accepts a maximum of 100 characters
4. WHEN the Active_Language is English, THE Word_Record SHALL include required fields for the English word, phonetic transcription (IPA notation), and Thai translation, where each field accepts a maximum of 100 characters
5. WHEN the Active_Language changes, THE Game_System SHALL render the word card layout showing all fields defined for that language in a top-to-bottom order: native script, pronunciation guide, then translation
6. IF a Word_Record contains an empty required field, THEN THE Game_System SHALL display a placeholder indicator in place of the missing value and still render the remaining fields

### Requirement 6: สลับภาษาได้ง่ายจากทุกหน้า

**User Story:** As a learner, I want to switch between languages easily from any screen, so that I can quickly change what I am studying without navigating to settings.

#### Acceptance Criteria

1. THE Language_Selector SHALL be accessible from every screen via a persistent UI element that displays the current Active_Language name or icon
2. WHEN a user changes the Active_Language, THE Game_System SHALL update all displayed content—including Word_Record entries, Feed_Word entries, and Flashcard_Set entries—to show only data belonging to the newly selected language
3. THE Game_System SHALL complete the language switch and render updated content within 500 milliseconds of user selection
4. WHEN the language switch completes, THE Game_System SHALL display a visual confirmation indicating the newly Active_Language for at least 2 seconds
5. IF the Game_System fails to load data for the selected language within 500 milliseconds, THEN THE Game_System SHALL retain the previously Active_Language and display an error message indicating the switch was unsuccessful

### Requirement 7: สแกนคำศัพท์ตามภาษาที่เลือก

**User Story:** As a learner, I want the scan feature to identify and save words in my selected language, so that scanned vocabulary is correctly categorized.

#### Acceptance Criteria

1. WHEN a user scans text, THE Game_System SHALL extract individual words that belong to the Active_Language's character set and display them as a selectable list within 5 seconds of scan completion, supporting up to 50 words per scan
2. WHEN the user selects one or more words from the scanned word list and confirms the save action, THE Game_System SHALL store each selected word as a Word_Record in the Language_Store for the Active_Language
3. IF none of the characters in the scanned text belong to the Active_Language's character set, THEN THE Game_System SHALL display a message indicating that the detected text does not match the Active_Language and suggest the user switch to the matching language
4. IF the scanned text contains a mix of characters from the Active_Language and other languages, THEN THE Game_System SHALL extract and display only the words belonging to the Active_Language's character set

### Requirement 8: สถิติการเรียนแยกตามภาษา

**User Story:** As a learner, I want to see my learning statistics for each language separately, so that I can track my progress in each language independently.

#### Acceptance Criteria

1. WHEN a user views the Profile page, THE Game_System SHALL display the following statistics for the Active_Language: total number of Word_Record entries, total number of Flashcard_Set entries, and total number of completed study sessions
2. THE Game_System SHALL calculate statistics independently for each Target_Language by counting only records associated with that language in the Language_Store
3. THE Game_System SHALL define a study session as one completed flashcard review of a Flashcard_Set (opening and reviewing at least 1 card in a set counts as one session)
4. IF the Active_Language has no Word_Record entries, no Flashcard_Set entries, and no study sessions, THEN THE Game_System SHALL display zero for each statistic
5. WHEN a user switches the Active_Language on the Profile page, THE Game_System SHALL update the displayed statistics to reflect the newly selected language within 500 milliseconds
