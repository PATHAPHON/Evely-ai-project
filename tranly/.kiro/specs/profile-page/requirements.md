# Requirements Document

## Introduction

เพิ่มฟีเจอร์ในหน้า Profile ของแอป Tarnly Korean ให้ครบถ้วนสำหรับแอปเรียนภาษาเกาหลี ปัจจุบันหน้า Profile มีแค่ตัวเลือกภาษาแปล (ไทย/อังกฤษ) ต้องเพิ่มส่วนแสดงข้อมูลผู้ใช้ สถิติการเรียน ความก้าวหน้า และการตั้งค่าเพิ่มเติม เพื่อให้ผู้ใช้เห็นภาพรวมของการเรียนและปรับแต่งประสบการณ์ได้

แอปเป็น PWA ที่เก็บข้อมูลใน IndexedDB และ localStorage (ไม่มีระบบ login/backend) ดีไซน์เป็นแบบ Neobrutalist

## Glossary

- **Profile_Page**: หน้าโปรไฟล์ของแอป Tarnly Korean ที่แสดงข้อมูลผู้ใช้ สถิติ และการตั้งค่า
- **User_Avatar**: ส่วนแสดงรูปหรืออักษรย่อของผู้ใช้พร้อมชื่อที่ตั้งเอง
- **Learning_Stats_Section**: ส่วนแสดงสถิติการเรียนรวม เช่น จำนวนคำที่บันทึก จำนวนบทสนทนา
- **Settings_Section**: ส่วนการตั้งค่าต่างๆ รวมถึงภาษาแปล และการจัดการข้อมูล
- **Data_Manager**: ฟังก์ชันจัดการข้อมูลในเครื่อง เช่น export/ลบข้อมูลทั้งหมด
- **Theme_Toggle**: ปุ่มสลับธีมระหว่าง Light Mode และ Dark Mode
- **AI_Config_Section**: ส่วนตั้งค่า AI ให้ผู้ใช้ใส่ API key และเลือก model ที่ต้องการใช้
- **Word_Storage**: ที่เก็บคำศัพท์ใน IndexedDB (words store)
- **Conversation_Storage**: ที่เก็บประวัติบทสนทนาใน IndexedDB (conversations store)

## Requirements

### Requirement 1: User Display Name & Avatar

**User Story:** ในฐานะผู้ใช้ ฉันต้องการตั้งชื่อและรูปแทนตัวในหน้า Profile เพื่อให้รู้สึกเป็นส่วนตัวมากขึ้น

#### Acceptance Criteria

1. THE Profile_Page SHALL display a User_Avatar section at the top showing the user's display name and avatar initial
2. WHEN the user taps the display name, THE Profile_Page SHALL show an inline text input allowing the user to edit the name
3. WHEN the user confirms a new display name, THE Profile_Page SHALL persist the name to localStorage
4. IF the user leaves the display name empty, THEN THE Profile_Page SHALL fall back to displaying "Learner" as the default name
5. THE User_Avatar SHALL derive the avatar initial from the first character of the display name

### Requirement 2: Learning Statistics Summary

**User Story:** ในฐานะผู้ใช้ ฉันต้องการเห็นสถิติการเรียนรวมในหน้า Profile เพื่อให้รู้ว่าเรียนไปมากแค่ไหนแล้ว

#### Acceptance Criteria

1. THE Learning_Stats_Section SHALL display the total number of saved words from Word_Storage
2. THE Learning_Stats_Section SHALL display the total number of completed conversation sessions from Conversation_Storage
3. THE Learning_Stats_Section SHALL display the total number of scanned flashcards from Word_Storage
4. WHEN the Word_Storage or Conversation_Storage data changes, THE Learning_Stats_Section SHALL reflect the updated counts on next page visit

### Requirement 3: Translation Language Preference

**User Story:** ในฐานะผู้ใช้ ฉันต้องการเลือกภาษาที่ใช้แปลคำศัพท์ เพื่อให้เหมาะกับภาษาที่ถนัด

#### Acceptance Criteria

1. THE Settings_Section SHALL display translation language options: Thai and English
2. WHEN the user selects a translation language, THE Settings_Section SHALL persist the selection to localStorage immediately
3. THE Settings_Section SHALL visually indicate the currently active language option

### Requirement 4: Data Management

**User Story:** ในฐานะผู้ใช้ ฉันต้องการจัดการข้อมูลในเครื่อง เพื่อให้สามารถล้างข้อมูลหรือเริ่มต้นใหม่ได้

#### Acceptance Criteria

1. THE Data_Manager SHALL provide a "Reset All Data" button in the Settings_Section
2. WHEN the user taps "Reset All Data", THE Data_Manager SHALL display a confirmation dialog before proceeding
3. WHEN the user confirms the reset, THE Data_Manager SHALL delete all records from Word_Storage, Conversation_Storage, and localStorage preferences
4. IF the user cancels the reset confirmation, THEN THE Data_Manager SHALL take no action and dismiss the dialog
5. WHEN the reset completes successfully, THE Data_Manager SHALL reload the Profile_Page to reflect the empty state

### Requirement 5: AI Configuration

**User Story:** ในฐานะผู้ใช้ ฉันต้องการใส่ API key ของตัวเองและเลือก AI model ที่ต้องการใช้ เพื่อให้ควบคุมค่าใช้จ่ายและเลือกคุณภาพของ AI ได้เอง

#### Acceptance Criteria

1. THE AI_Config_Section SHALL display an API key input field in the Settings_Section
2. WHEN the user enters an API key, THE AI_Config_Section SHALL mask the key value displaying only the last 4 characters
3. WHEN the user saves an API key, THE AI_Config_Section SHALL persist the key to localStorage
4. THE AI_Config_Section SHALL display a model selector with available model options
5. WHEN the user selects a model, THE AI_Config_Section SHALL persist the selection to localStorage
6. IF the user has configured a custom API key, THEN THE app SHALL use the custom key instead of the default server key for AI requests
7. IF the user has selected a custom model, THEN THE app SHALL use the selected model for AI requests
8. IF no custom API key is configured, THEN THE app SHALL fall back to the default server-side API key

### Requirement 6: Dark Mode Toggle

**User Story:** ในฐานะผู้ใช้ ฉันต้องการสลับระหว่างธีมสว่างและธีมมืด เพื่อให้ใช้แอปได้สบายตาในทุกสภาพแสง

#### Acceptance Criteria

1. THE Settings_Section SHALL display a Theme_Toggle allowing the user to switch between Light Mode and Dark Mode
2. WHEN the user activates Dark Mode, THE Profile_Page SHALL apply dark color scheme to the entire app immediately
3. WHEN the user activates Light Mode, THE Profile_Page SHALL apply light color scheme to the entire app immediately
4. THE Theme_Toggle SHALL persist the selected theme to localStorage
5. WHEN the app loads, THE Profile_Page SHALL apply the previously saved theme preference from localStorage
6. IF no theme preference is saved, THEN THE Profile_Page SHALL default to Light Mode

### Requirement 7: App Information

**User Story:** ในฐานะผู้ใช้ ฉันต้องการเห็นข้อมูลเวอร์ชันของแอป เพื่อให้รู้ว่าใช้เวอร์ชันล่าสุดหรือไม่

#### Acceptance Criteria

1. THE Profile_Page SHALL display the app version number at the bottom of the settings area
2. THE Profile_Page SHALL display the app name "Tarnly Korean" alongside the version
