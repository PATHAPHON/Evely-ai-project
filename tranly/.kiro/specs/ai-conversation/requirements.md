# Requirements Document

## Introduction

ฟีเจอร์ AI Conversation เพิ่มหน้าแชทสนทนากับ AI เป็นภาษาเกาหลี ผู้ใช้สามารถกำหนดหัวข้อที่ต้องการสนทนา เลือกระดับความยากของภาษา และนำคำศัพท์ที่บันทึกไว้ (จาก Word Store และ Feed Words) มาใช้เป็นบริบทในการสร้างบทสนทนา AI จะตอบกลับเป็นภาษาเกาหลีพร้อมคำอ่านและคำแปล เพื่อให้ผู้ใช้ฝึกสนทนาภาษาเกาหลีในบริบทที่ต้องการ

## Glossary

- **Conversation_Screen**: หน้าจอหลักของฟีเจอร์แชทสนทนากับ AI เข้าถึงได้จาก tab bar
- **Chat_API**: API endpoint ฝั่ง backend ที่รับผิดชอบการสร้างข้อความตอบกลับจาก AI
- **Conversation_Session**: เซสชันการสนทนาที่มีหัวข้อ ระดับภาษา และประวัติข้อความ
- **Topic_Selector**: องค์ประกอบ UI ที่ให้ผู้ใช้กำหนดหัวข้อสนทนา
- **Proficiency_Level**: ระดับความสามารถทางภาษาของผู้ใช้ แบ่งเป็น Beginner (TOPIK 1-2), Intermediate (TOPIK 3-4), Advanced (TOPIK 5-6)
- **Saved_Words**: คำศัพท์ที่ผู้ใช้บันทึกไว้จาก Word Store และ Feed Words ที่มี bookmarked flag
- **Word_Context**: รายการคำศัพท์ที่ผู้ใช้เลือกมาใช้เป็นบริบทในการสร้างบทสนทนา
- **Chat_Message**: ข้อความเดี่ยวในบทสนทนา ประกอบด้วยข้อความภาษาเกาหลี คำอ่านภาษาไทย romanization และคำแปล
- **Conversation_Store**: Object store ใน IndexedDB ที่เก็บประวัติบทสนทนาไว้ในเครื่อง
- **Microphone_Button**: ปุ่มไมโครโฟนที่อยู่ข้างช่องพิมพ์ข้อความ ใช้เริ่มและหยุดการรับเสียงพูด
- **Speech_Recognition**: Web Speech API (SpeechRecognition) ที่แปลงเสียงพูดเป็นข้อความ รองรับภาษาเกาหลี ไทย และอังกฤษ
- **Recording_Indicator**: สัญลักษณ์แสดงสถานะว่ากำลังบันทึกเสียงอยู่

## Requirements

### Requirement 1: เริ่มเซสชันสนทนาใหม่

**User Story:** ในฐานะผู้เรียน ฉันต้องการเริ่มบทสนทนาใหม่กับ AI โดยกำหนดหัวข้อและระดับภาษา เพื่อฝึกสนทนาภาษาเกาหลีในบริบทที่ต้องการ

#### Acceptance Criteria

1. WHEN the user opens the Conversation_Screen, THE Topic_Selector SHALL display an input field for the user to specify a conversation topic in Thai or English with a minimum length of 2 characters and a maximum length of 100 characters
2. THE Conversation_Screen SHALL display a Proficiency_Level selector with three options: Beginner (TOPIK 1-2), Intermediate (TOPIK 3-4), Advanced (TOPIK 5-6) with no default selection
3. WHEN the user selects Beginner level, THE Chat_API SHALL generate responses using basic vocabulary, short sentences (under 10 words per sentence), and simple grammar patterns (present tense, basic particles)
4. WHEN the user selects Intermediate level, THE Chat_API SHALL generate responses using common vocabulary, compound sentences, and standard grammar patterns (past/future tense, conjunctions, honorifics)
5. WHEN the user selects Advanced level, THE Chat_API SHALL generate responses using advanced vocabulary, complex sentences, and formal/informal speech registers (idioms, proverbs, nuanced expressions)
6. WHEN the user provides a topic and selects a proficiency level, THE Conversation_Screen SHALL enable the start-conversation button
7. WHEN the user opens the Conversation_Screen for the first time, THE Topic_Selector SHALL be empty and the Proficiency_Level selector SHALL have no pre-selected option

### Requirement 2: นำคำศัพท์ที่บันทึกไว้มาสร้างบทสนทนา

**User Story:** ในฐานะผู้เรียน ฉันต้องการนำคำศัพท์ที่บันทึกไว้มาใช้ในบทสนทนา เพื่อฝึกใช้คำที่เรียนไปแล้วในบริบทจริง

#### Acceptance Criteria

1. THE Conversation_Screen SHALL display a word-selection button that shows the count of available Saved_Words from both the Word Store and bookmarked Feed Words
2. WHEN the user taps the word-selection button, THE Conversation_Screen SHALL display a scrollable list of Saved_Words from both the Word Store and bookmarked Feed Words
3. THE word selection list SHALL display each word with its Korean text in Hangul, reading in Thai script, and Thai or English translation
4. WHEN the user selects words from the list, THE Conversation_Screen SHALL add the selected words to the Word_Context with a maximum of 10 words per session
5. WHEN a Conversation_Session starts with Word_Context, THE Chat_API SHALL incorporate the selected words naturally into the generated conversation within the first 5 exchanges
6. THE Conversation_Screen SHALL display the selected Word_Context words as removable tags above the chat input, each showing the Korean text
7. WHEN the user taps the remove icon on a Word_Context tag, THE Conversation_Screen SHALL remove that word from the Word_Context
8. IF no Saved_Words are available, THE word-selection button SHALL be disabled and display a count of zero

### Requirement 3: แสดงข้อความสนทนา

**User Story:** ในฐานะผู้เรียน ฉันต้องการเห็นข้อความสนทนาพร้อมคำอ่านและคำแปล เพื่อเข้าใจและเรียนรู้จากบทสนทนา

#### Acceptance Criteria

1. THE Conversation_Screen SHALL display Chat_Message elements in a vertical scrollable list with the newest message at the bottom and auto-scroll to the latest message when a new message is added
2. THE Chat_Message from AI SHALL display the Korean text in Hangul as the primary content with larger font size
3. THE Chat_Message from AI SHALL display the pronunciation in Thai script below the Korean text
4. THE Chat_Message from AI SHALL display the romanization below the Thai pronunciation
5. THE Chat_Message from AI SHALL display the Thai translation below the romanization
6. WHEN the user sends a message, THE Conversation_Screen SHALL display the user message aligned to the right side, visually distinct from AI messages which are aligned to the left side
7. THE Conversation_Screen SHALL display a text input field with a send button; the user SHALL be able to send a message by tapping the send button or pressing the Enter key
8. THE Conversation_Screen SHALL NOT allow sending an empty message; the send button SHALL be disabled when the input field is empty
9. THE text input field SHALL accept messages in Korean, Thai, or English with a maximum length of 500 characters

### Requirement 4: สร้างข้อความตอบกลับจาก AI

**User Story:** ในฐานะผู้เรียน ฉันต้องการให้ AI ตอบกลับเป็นภาษาเกาหลีที่เหมาะกับระดับของฉัน เพื่อฝึกอ่านและเข้าใจภาษาเกาหลีในบริบทสนทนา

#### Acceptance Criteria

1. WHEN the user sends a message, THE Chat_API SHALL generate a response in Korean appropriate to the selected Proficiency_Level and return the response within 30 seconds
2. THE Chat_API SHALL return for each response: Korean text in Hangul, pronunciation in Thai script, romanization in Latin script, and Thai translation as separate fields in a structured response
3. WHILE the Chat_API is generating a response, THE Conversation_Screen SHALL display a loading indicator and disable the message input
4. IF the Chat_API fails to respond due to timeout (exceeding 30 seconds), network error, or server error, THEN THE Conversation_Screen SHALL display an error message indicating the failure type and a retry button
5. THE Chat_API SHALL maintain conversation context by including up to the 20 most recent messages in the session when generating responses
6. WHEN the user taps the retry button after a failed response, THE Chat_API SHALL re-send the last user message with the same conversation context to generate a new response

### Requirement 5: เล่นเสียงข้อความภาษาเกาหลี

**User Story:** ในฐานะผู้เรียน ฉันต้องการฟังเสียงอ่านข้อความภาษาเกาหลี เพื่อฝึกการออกเสียงและการฟัง

#### Acceptance Criteria

1. THE Chat_Message from AI SHALL display an audio button next to the Korean text
2. WHEN the user taps the audio button on a Chat_Message, THE Conversation_Screen SHALL play the Korean text using text-to-speech with Korean language setting
3. WHILE text-to-speech is playing, THE audio button SHALL display a visual indicator that audio is active
4. WHEN text-to-speech playback completes or is interrupted, THE audio button SHALL return to its default idle state
5. WHEN the user taps an audio button while another Chat_Message audio is already playing, THE Conversation_Screen SHALL stop the current playback and start playing the newly selected message
6. IF text-to-speech is unavailable or fails to play, THEN THE Conversation_Screen SHALL display an error message indicating that audio playback is not supported on the current browser

### Requirement 6: บันทึกประวัติบทสนทนา

**User Story:** ในฐานะผู้เรียน ฉันต้องการให้ประวัติบทสนทนาถูกบันทึกไว้ เพื่อดูย้อนหลังและทบทวนสิ่งที่เรียนรู้

#### Acceptance Criteria

1. WHEN a Conversation_Session starts, THE Conversation_Store SHALL create a new session record containing the topic (maximum 100 characters), proficiency level, Word_Context, and creation timestamp in ISO 8601 format
2. WHEN a new Chat_Message is sent or received, THE Conversation_Store SHALL persist the message to the current session record including the sender role (user or AI), message content (Korean text, pronunciation, romanization, and translation for AI messages; raw text for user messages), and a timestamp
3. THE Conversation_Screen SHALL display a list of previous Conversation_Session records sorted by most recent first, showing each session's topic, proficiency level, and creation date
4. WHEN the user taps a previous session, THE Conversation_Screen SHALL load and display the full message history for that session in chronological order
5. WHEN the user taps the delete button on a session, THE Conversation_Screen SHALL display a confirmation prompt before deletion
6. WHEN the user confirms session deletion, THE Conversation_Store SHALL remove the session and all associated messages permanently
7. IF the Conversation_Store fails to persist a session or message, THEN THE Conversation_Screen SHALL display an error message indicating the save failure and retain the unsaved data in memory until the next successful write

### Requirement 7: เริ่มบทสนทนาใหม่จากหน้าประวัติ

**User Story:** ในฐานะผู้เรียน ฉันต้องการเริ่มบทสนทนาใหม่ได้ง่ายจากหน้าประวัติ เพื่อสลับระหว่างการดูประวัติและการเริ่มสนทนาใหม่

#### Acceptance Criteria

1. THE Conversation_Screen SHALL display a new-conversation button that remains visible without scrolling in both the session list view and the active chat view
2. WHEN the user taps the new-conversation button, THE Conversation_Screen SHALL navigate to the topic and level selection view with all fields reset to their default empty state
3. WHILE a Conversation_Session is active, WHEN the user taps the new-conversation button, THE Conversation_Store SHALL save all messages of the current session before navigating away
4. IF the Conversation_Store fails to save the current session when starting a new conversation, THEN THE Conversation_Screen SHALL display an error message indicating the save failure and remain on the current session without navigating away

### Requirement 8: จบการสนทนาปัจจุบัน

**User Story:** ในฐานะผู้เรียน ฉันต้องการจบบทสนทนาปัจจุบันเมื่อไม่อยากคุยในเรื่องนี้แล้ว เพื่อบันทึกสิ่งที่เรียนรู้และเริ่มหัวข้อใหม่ได้

#### Acceptance Criteria

1. THE Conversation_Screen SHALL display an end-conversation button that is visible in the active chat view while a Conversation_Session is in progress
2. WHEN the user taps the end-conversation button, THE Conversation_Screen SHALL display a confirmation prompt asking the user to confirm ending the current session
3. WHEN the user confirms ending the session, THE Conversation_Store SHALL save all messages of the current session and mark the session as completed with an end timestamp
4. AFTER the session is ended, THE Conversation_Screen SHALL navigate to the topic and level selection view, allowing the user to start a new conversation on a different topic
5. IF the user cancels the end-conversation confirmation, THE Conversation_Screen SHALL remain on the current active chat without any changes
6. THE ended session SHALL appear in the session history list with a visual indicator showing it was completed (not abandoned)

### Requirement 9: พูดส่งข้อความด้วยเสียง (Speech-to-Text Voice Input)

**User Story:** ในฐานะผู้เรียน ฉันต้องการพูดส่งข้อความแทนการพิมพ์ เพื่อฝึกการออกเสียงและส่งข้อความได้สะดวกขึ้น

#### Acceptance Criteria

1. THE Conversation_Screen SHALL display a Microphone_Button adjacent to the text input field and send button
2. WHEN the user taps the Microphone_Button, THE Speech_Recognition SHALL start listening for speech input using the Web Speech API (SpeechRecognition)
3. WHILE Speech_Recognition is actively listening, THE Conversation_Screen SHALL display a Recording_Indicator with a distinct visual state (pulsing animation and color change) on the Microphone_Button to indicate recording is in progress
4. WHILE Speech_Recognition is actively listening, THE Microphone_Button SHALL function as a stop-recording button; WHEN the user taps the Microphone_Button during recording, THE Speech_Recognition SHALL stop listening
5. THE Speech_Recognition SHALL support recognition in Korean (ko-KR), Thai (th-TH), and English (en-US) languages, using the language matching the current Conversation_Session context or a user-selectable language option
6. WHEN Speech_Recognition produces a result, THE Conversation_Screen SHALL insert the converted text into the text input field without automatically sending the message
7. WHEN converted text appears in the text input field, THE user SHALL be able to edit, append to, or delete the converted text before sending
8. IF the Web Speech API is not supported by the current browser, THEN THE Conversation_Screen SHALL hide the Microphone_Button
9. IF Speech_Recognition fails due to a network error, no speech detected, or permission denied, THEN THE Conversation_Screen SHALL display an error message describing the failure reason and return the Microphone_Button to its default idle state
10. WHEN the user denies microphone permission, THE Conversation_Screen SHALL display a message instructing the user to grant microphone access in browser settings and return the Microphone_Button to its default idle state
