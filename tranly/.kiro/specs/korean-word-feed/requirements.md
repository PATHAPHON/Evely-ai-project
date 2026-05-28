# Requirements Document

## Introduction

ฟีเจอร์ Korean Word Feed ปรับปรุงหน้า Home ให้แสดงคำศัพท์ภาษาเกาหลีในรูปแบบ Feed การ์ดที่เลื่อนดูได้ในแนวตั้ง ในแต่ละวันระบบจะสร้างคำศัพท์ใหม่ 5 คำผ่าน AI API โดยแสดงเป็นการ์ดที่มีพื้นที่รูปภาพ (ผู้ใช้ถ่ายเองเมื่อเจอของจริง), คำภาษาเกาหลีในรูปแบบฮันกึล, การออกเสียง (อักษรไทยและโรมัน), คำแปลภาษาอังกฤษ/ไทย และปุ่มกดต่างๆ ผู้ใช้สามารถขอคำเพิ่มเติมนอกเหนือจากโควต้ารายวันได้ Feed จะไม่แสดงคำที่ผู้ใช้เคยสแกนหรือบันทึกไว้แล้วจากฟีเจอร์ Flashcard เพื่อให้ได้คำศัพท์ใหม่ทุกวัน

## Glossary

- **Word_Feed**: รายการการ์ดคำศัพท์ภาษาเกาหลีที่เลื่อนดูได้ แสดงบนหน้า Home
- **Word_Card**: องค์ประกอบ UI การ์ดเดี่ยวที่แสดงคำศัพท์ภาษาเกาหลีพร้อมรูปภาพ การออกเสียง คำแปล และปุ่มกด
- **Feed_API**: API endpoint ฝั่ง backend ที่รับผิดชอบการสร้างคำศัพท์ภาษาเกาหลีใหม่
- **Daily_Quota**: จำนวนคำศัพท์ใหม่ที่สร้างต่อวันปฏิทิน ค่าเริ่มต้นคือ 5 คำ
- **Scanned_Words**: คำที่ผู้ใช้เคยบันทึกไว้ก่อนหน้าผ่านฟีเจอร์สแกน/Flashcard เก็บใน IndexedDB
- **Word_Feed_Store**: Object store ใน IndexedDB ที่เก็บคำศัพท์จาก Feed ไว้ในเครื่อง
- **Card_Image_Area**: พื้นที่รูปภาพบน Word Card ที่เริ่มต้นเป็นพื้นที่ว่าง ผู้ใช้สามารถถ่ายรูปเพิ่มเองได้เมื่อเจอของจริง
- **Progress_Indicator**: องค์ประกอบ UI ที่แสดงจำนวนการ์ดที่ดูแล้วจากโควต้ารายวัน (เช่น "3/5")

## Requirements

### Requirement 1: แสดง Word Feed บนหน้า Home

**User Story:** ในฐานะผู้เรียน ฉันต้องการเห็นคำศัพท์ภาษาเกาหลีเป็น Feed ที่เลื่อนดูได้บนหน้า Home เพื่อที่จะได้เจอคำใหม่ทุกครั้งที่เปิดแอป

#### Acceptance Criteria

1. WHEN the Home screen loads, THE Word_Feed SHALL display Word_Card elements in a vertical scrollable list
2. THE Word_Card SHALL display the Korean word in Hangul, pronunciation in Thai script, romanization, English definition, and a Card_Image_Area
3. THE Word_Feed SHALL allow the user to scroll vertically through all available Word_Card elements
4. THE Progress_Indicator SHALL display the current card position relative to the total number of cards in the format "current/total"

### Requirement 2: สร้างคำศัพท์เกาหลีรายวันผ่าน API

**User Story:** ในฐานะผู้เรียน ฉันต้องการให้แอปสร้างคำศัพท์ภาษาเกาหลีใหม่ทุกวัน เพื่อที่จะได้มีเนื้อหาใหม่ให้เรียนเสมอ

#### Acceptance Criteria

1. WHEN the user opens the Home screen for the first time on a calendar day, THE Feed_API SHALL generate 5 new Korean vocabulary words
2. THE Feed_API SHALL return for each word: the Korean word in Hangul, pronunciation in Thai script, romanization in Latin script, English translation, and Thai translation
3. IF the Feed_API fails to respond, THEN THE Word_Feed SHALL display a descriptive error message and offer a retry option

### Requirement 3: ไม่แสดงคำที่เคยสแกนแล้ว

**User Story:** ในฐานะผู้เรียน ฉันต้องการให้ Word Feed แสดงเฉพาะคำใหม่ที่ไม่เคยเห็นมาก่อน เพื่อขยายคลังคำศัพท์โดยไม่ซ้ำ

#### Acceptance Criteria

1. WHEN generating new words, THE Feed_API SHALL exclude all Korean words that exist in the user's Scanned_Words collection
2. WHEN generating new words, THE Feed_API SHALL exclude all Korean words that already exist in the Word_Feed_Store
3. THE Feed_API SHALL use the Korean Hangul form as the deduplication key when comparing words

### Requirement 4: ขอคำเพิ่มเติมนอกเหนือโควต้ารายวัน

**User Story:** ในฐานะผู้เรียนที่มีแรงจูงใจ ฉันต้องการขอคำเพิ่มเติมนอกเหนือจาก 5 คำต่อวัน เพื่อที่จะเรียนตามจังหวะของตัวเองเมื่อต้องการเรียนเพิ่ม

#### Acceptance Criteria

1. WHEN the user has viewed all Daily_Quota words, THE Word_Feed SHALL display a button to request additional words
2. WHEN the user taps the request-more button, THE Feed_API SHALL generate 5 additional words following the same exclusion rules
3. WHILE the Feed_API is generating additional words, THE Word_Feed SHALL display a loading indicator

### Requirement 5: เก็บคำศัพท์ Feed ไว้ในเครื่อง

**User Story:** ในฐานะผู้เรียน ฉันต้องการให้คำศัพท์รายวันถูกบันทึกไว้ในเครื่อง เพื่อที่จะดูย้อนหลังได้แบบออฟไลน์หรือดูซ้ำในวันเดียวกันโดยไม่ต้องสร้างใหม่

#### Acceptance Criteria

1. WHEN the Feed_API returns new words, THE Word_Feed_Store SHALL persist each word record with its text fields and generation timestamp
2. WHEN the Home screen loads and words for the current day already exist in the Word_Feed_Store, THE Word_Feed SHALL display the persisted words without calling the Feed_API
3. THE Word_Feed_Store SHALL store each word with a date field indicating the calendar day it was generated

### Requirement 6: การโต้ตอบกับ Word Card

**User Story:** ในฐานะผู้เรียน ฉันต้องการโต้ตอบกับการ์ดคำศัพท์ผ่านการเล่นเสียงและบุ๊กมาร์ก เพื่อเสริมการเรียนรู้

#### Acceptance Criteria

1. WHEN the user taps the audio button on a Word_Card, THE Word_Card SHALL play the Korean pronunciation using text-to-speech
2. WHEN the user taps the bookmark button on a Word_Card, THE Word_Card SHALL save the word to the user's Word_Feed_Store with a bookmarked flag
3. THE Word_Card SHALL visually indicate whether the word is currently bookmarked

### Requirement 7: ถ่ายรูปประกอบคำศัพท์

**User Story:** ในฐานะผู้เรียน ฉันต้องการถ่ายรูปของจริงเมื่อเจอสิ่งที่ตรงกับคำศัพท์ เพื่อช่วยจำคำศัพท์ผ่านภาพที่ถ่ายเอง

#### Acceptance Criteria

1. THE Card_Image_Area SHALL display as an empty placeholder with a camera icon when no image has been captured
2. WHEN the user taps the Card_Image_Area, THE Word_Card SHALL open the device camera for the user to capture a photo
3. WHEN the user captures a photo, THE Word_Feed_Store SHALL persist the image alongside the word record
4. WHEN a word record has a captured image, THE Card_Image_Area SHALL display the captured image instead of the placeholder
