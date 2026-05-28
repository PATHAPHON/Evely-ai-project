# Requirements Document

## Introduction

ฟีเจอร์ AI Flashcard สำหรับแอป Tarnly ที่ช่วยให้ผู้ใช้สามารถนำภาพที่ถ่ายจากกล้องส่งไปยัง DeepSeek AI API เพื่อระบุว่าวัตถุในภาพคืออะไร จากนั้นสร้าง Flashcard ที่แสดงรูปภาพพร้อมชื่อ/คำอธิบายวัตถุที่ AI ระบุได้ เพื่อใช้ในการเรียนรู้คำศัพท์

## Glossary

- **AI_Service**: โมดูลฝั่ง server ที่รับภาพจาก client และส่งไปยัง DeepSeek API เพื่อระบุวัตถุในภาพ
- **DeepSeek_API**: DeepSeek Vision API ที่ใช้ในการวิเคราะห์ภาพและระบุวัตถุ
- **Flashcard**: การ์ดแสดงข้อมูลที่ประกอบด้วยรูปภาพและชื่อวัตถุที่ AI ระบุได้ ใช้สำหรับการเรียนรู้คำศัพท์
- **Flashcard_View**: หน้าจอแสดง Flashcard ที่มีรูปภาพและข้อมูลวัตถุ พร้อมเอฟเฟกต์ flash animation
- **Object_Label**: ชื่อหรือคำอธิบายวัตถุที่ DeepSeek API ระบุจากภาพ
- **Captured_Image**: ภาพที่ถ่ายจากกล้องและเก็บไว้ใน capturedImageStore
- **User**: ผู้ใช้งานแอป Tarnly บนอุปกรณ์มือถือ
- **API_Route**: Next.js API Route ที่ทำหน้าที่เป็น proxy ระหว่าง client กับ DeepSeek_API

## Requirements

### Requirement 1: ส่งภาพไปยัง DeepSeek AI เพื่อระบุวัตถุ

**User Story:** As a User, I want to send my captured photo to the DeepSeek AI, so that the AI can identify what object is in the image.

#### Acceptance Criteria

1. WHEN the User confirms the captured image on the Photo_Preview screen, THE AI_Service SHALL send the Captured_Image to the DeepSeek_API for object identification
2. THE API_Route SHALL accept a POST request containing the image data encoded as base64 and forward the request to the DeepSeek_API with a prompt requesting object identification in Thai
3. WHEN the DeepSeek_API returns a successful response, THE AI_Service SHALL extract the Object_Label from the response and return it to the client as a JSON object containing the Object_Label string (maximum 100 characters)
4. THE API_Route SHALL store the DeepSeek API key as a server-side environment variable and never expose the key to the client
5. IF the image data exceeds 20MB in size, THEN THE AI_Service SHALL reject the request and return an error indicating the image is too large
6. WHEN the AI_Service sends a request to the DeepSeek_API, THE AI_Service SHALL set a timeout of 30 seconds for the API response
7. IF the request body is missing the base64 image data or the data is not a valid base64-encoded image, THEN THE AI_Service SHALL reject the request and return an error indicating invalid image data

### Requirement 2: จัดการข้อผิดพลาดจาก AI API

**User Story:** As a User, I want to be informed when the AI cannot identify the object, so that I can retry or take a new photo.

#### Acceptance Criteria

1. IF the DeepSeek_API returns an error response, THEN THE AI_Service SHALL return a JSON object to the client containing an error type field with value "api_error" and a user-facing message in Thai indicating the identification failed
2. IF the DeepSeek_API does not respond within 30 seconds, THEN THE AI_Service SHALL abort the request and return a JSON object to the client containing an error type field with value "timeout" and a user-facing message in Thai indicating the request timed out
3. IF the DeepSeek_API rate limit is exceeded, THEN THE AI_Service SHALL return a JSON object to the client containing an error type field with value "rate_limit" and a user-facing message in Thai indicating the User should try again later
4. IF the network connection to the DeepSeek_API fails, THEN THE AI_Service SHALL return a JSON object to the client containing an error type field with value "network_error" and a user-facing message in Thai indicating a network problem occurred
5. WHEN an error occurs during object identification, THE Flashcard_View SHALL display the error message received from the AI_Service and provide a "ลองใหม่" (Retry) button that re-sends the same Captured_Image to the AI_Service
6. IF the User has retried object identification 3 consecutive times without success, THEN THE Flashcard_View SHALL display the error message and provide only a "ถ่ายใหม่" (New Photo) button that navigates to the Camera_View (/scan) instead of the Retry button

### Requirement 3: สร้างและแสดง Flashcard

**User Story:** As a User, I want to see a flashcard with the image and the AI-identified object name, so that I can learn vocabulary from real-world objects.

#### Acceptance Criteria

1. WHEN the AI_Service returns a successful Object_Label, THE Flashcard_View SHALL display a Flashcard containing the Captured_Image and the Object_Label
2. THE Flashcard SHALL display the Captured_Image in the upper portion of the card, scaled to fit within the card width while maintaining the original aspect ratio, with a maximum image height of 60% of the viewport height
3. THE Flashcard SHALL display the Object_Label in bold text below the image with a font size of at least 24px
4. WHEN the AI_Service returns a successful Object_Label, THE Flashcard_View SHALL play a reveal animation that transitions the Object_Label area from hidden to visible within 500 milliseconds, while the Captured_Image remains visible throughout
5. THE Flashcard SHALL display the Object_Label in Thai language
6. WHILE the AI_Service is processing the image, THE Flashcard_View SHALL display a spinning loading indicator with the text "กำลังวิเคราะห์ภาพ..." (Analyzing image...)
7. IF the AI_Service returns a successful response but the Object_Label is empty or contains only whitespace, THEN THE Flashcard_View SHALL treat this as an error and display a message indicating the object could not be identified

### Requirement 4: นำทางไปยัง Flashcard View

**User Story:** As a User, I want to navigate to the flashcard screen after confirming my photo, so that I can see the AI result as a flashcard.

#### Acceptance Criteria

1. WHEN the User taps the "ยืนยัน" button on the Photo_Preview screen, THE Photo_Preview SHALL retain the Captured_Image in the capturedImageStore and navigate to the Flashcard_View at /scan/flashcard without saving the image to local storage
2. WHEN the Flashcard_View is opened, THE Flashcard_View SHALL retrieve the Captured_Image from the capturedImageStore and send it to the API_Route as a base64-encoded POST request to initiate the AI identification process
3. IF no Captured_Image is available in the capturedImageStore when the Flashcard_View is opened, THEN THE Flashcard_View SHALL redirect the User to the scan page (/scan) within 100 milliseconds
4. THE Flashcard_View SHALL be accessible at the URL path /scan/flashcard
5. WHEN the User navigates away from the Flashcard_View, THE Flashcard_View SHALL clear the Captured_Image from the capturedImageStore

### Requirement 5: การดำเนินการหลังดู Flashcard

**User Story:** As a User, I want to save the flashcard or take a new photo after viewing the result, so that I can continue learning.

#### Acceptance Criteria

1. THE Flashcard_View SHALL provide a "บันทึก" (Save) button that saves the Flashcard data (Captured_Image and Object_Label) to IndexedDB local storage
2. THE Flashcard_View SHALL provide a "ถ่ายใหม่" (New Photo) button that clears the current Captured_Image from the capturedImageStore and navigates to the Camera_View (/scan)
3. WHEN the User taps the "บันทึก" button, THE Flashcard_View SHALL disable both the "บันทึก" and "ถ่ายใหม่" buttons, save the Flashcard data to IndexedDB, and display a success confirmation message upon completion
4. IF the Flashcard fails to save to IndexedDB, THEN THE Flashcard_View SHALL display an error message indicating the save failure, re-enable the "บันทึก" button so the User can tap it again to retry, and retain the Flashcard on screen
5. WHEN the User taps the "บันทึก" button successfully, THE Flashcard_View SHALL display the success confirmation for 1 second, clear the Captured_Image from the capturedImageStore, and then navigate to the Home screen (/home)
6. WHILE the Flashcard_View is saving data to IndexedDB, THE Flashcard_View SHALL display a loading indicator on the "บันทึก" button to indicate the save is in progress
