# Requirements Document

## Introduction

ฟีเจอร์ปุ่ม Scan สำหรับแอป Tarnly Korean ที่ช่วยให้ผู้ใช้สามารถถ่ายภาพผ่านกล้องมือถือได้โดยตรงจากแอป เพื่อนำภาพที่ถ่ายไปใช้ในการเรียนรู้ภาษาเกาหลี เช่น การแปลข้อความจากภาพ หรือการจดจำตัวอักษรเกาหลี

## Glossary

- **Scan_Button**: ปุ่มลอย (floating action button) บนหน้า Home ที่ใช้เปิดฟังก์ชันกล้องถ่ายภาพ
- **Camera_View**: หน้าจอแสดงภาพจากกล้องแบบเต็มจอที่ผู้ใช้สามารถดูตัวอย่างภาพก่อนถ่าย
- **Capture_Button**: ปุ่มกดถ่ายภาพภายใน Camera View
- **Photo_Preview**: หน้าจอแสดงภาพที่ถ่ายแล้ว พร้อมตัวเลือกยืนยันหรือถ่ายใหม่
- **Camera_API**: Web API สำหรับเข้าถึงกล้องของอุปกรณ์ (MediaDevices.getUserMedia)
- **User**: ผู้ใช้งานแอป Tarnly Korean บนอุปกรณ์มือถือ

## Requirements

### Requirement 1: เปิดกล้องจากปุ่ม Scan

**User Story:** As a User, I want to tap the Scan button to open the camera, so that I can take a photo of Korean text for learning purposes.

#### Acceptance Criteria

1. WHEN the User taps the Scan_Button, THE Camera_View SHALL request camera access permission from the device via the Camera_API
2. WHEN camera permission is granted, THE Camera_View SHALL display a live camera feed in full-screen mode within 3 seconds of permission being granted
3. IF camera permission is denied, THEN THE Camera_View SHALL display an error message indicating that camera access is required and instructing the User how to enable it in device settings
4. THE Camera_View SHALL use the rear-facing camera as the default camera source
5. IF the device does not have a rear-facing camera, THEN THE Camera_View SHALL fall back to the available camera source
6. IF the User has previously granted camera permission, THEN THE Camera_View SHALL skip the permission request and display the live camera feed directly within 3 seconds of tapping the Scan_Button

### Requirement 2: ถ่ายภาพ

**User Story:** As a User, I want to capture a photo from the camera view, so that I can use the captured image for Korean text recognition.

#### Acceptance Criteria

1. WHILE the Camera_View is active, THE Camera_View SHALL display a Capture_Button at the bottom center of the screen
2. WHEN the User taps the Capture_Button, THE Camera_View SHALL capture the current camera frame as a still image and disable the Capture_Button until the capture process completes or fails
3. WHEN a photo is captured successfully, THE Camera_View SHALL navigate to the Photo_Preview screen displaying the captured image within 2 seconds of the tap
4. WHEN the User taps the Capture_Button, THE Capture_Button SHALL display a pressed state with a scale-down animation for a minimum of 150 milliseconds
5. IF the photo capture fails, THEN THE Camera_View SHALL re-enable the Capture_Button, display an error message indicating the capture failed, and remain on the Camera_View with the live camera feed active

### Requirement 3: ดูตัวอย่างและยืนยันภาพ

**User Story:** As a User, I want to preview the captured photo and choose to confirm or retake it, so that I can ensure the image quality is acceptable.

#### Acceptance Criteria

1. THE Photo_Preview SHALL display the captured image scaled to fit within the device viewport while maintaining the original aspect ratio
2. THE Photo_Preview SHALL provide a "ยืนยัน" (Confirm) button and a "ถ่ายใหม่" (Retake) button positioned at the bottom of the screen
3. WHEN the User taps the "ถ่ายใหม่" button, THE Photo_Preview SHALL discard the captured image from memory and return to the Camera_View with the live camera feed
4. WHEN the User taps the "ยืนยัน" button, THE Photo_Preview SHALL save the captured image in its original resolution to local storage and return to the Home screen within 3 seconds
5. IF the image fails to save to local storage, THEN THE Photo_Preview SHALL display an error message indicating the save failure and retain the captured image on the preview screen for the User to retry

### Requirement 4: ปิดกล้องและกลับหน้า Home

**User Story:** As a User, I want to close the camera and return to the home screen, so that I can navigate away without taking a photo.

#### Acceptance Criteria

1. WHILE the Camera_View is active, THE Camera_View SHALL display a close button in the top-left corner with a minimum tap target size of 44×44 pixels
2. WHEN the User taps the close button, THE Camera_View SHALL stop the camera stream and navigate back to the Home screen
3. IF the User taps the close button while a photo capture is in progress, THEN THE Camera_View SHALL cancel the capture operation, stop the camera stream, and navigate back to the Home screen
4. WHEN the Camera_View is closed, THE Camera_API SHALL release all camera resources within 500 milliseconds of the close action

### Requirement 5: รองรับ PWA บนมือถือ

**User Story:** As a User, I want the scan feature to work reliably on my mobile browser as a PWA, so that I can use it without installing a native app.

#### Acceptance Criteria

1. THE Camera_API SHALL use the MediaDevices.getUserMedia API with video constraints specifying the rear-facing camera (facingMode: "environment")
2. WHILE the device does not support the Camera_API, THE Scan_Button SHALL be hidden from the User interface
3. WHEN the device orientation changes between portrait and landscape, THE Camera_View SHALL resize the camera feed to fill the viewport width while maintaining the original aspect ratio within 500 milliseconds
4. IF the camera stream is interrupted unexpectedly, THEN THE Camera_View SHALL stop the current stream, display an error message indicating the camera was disconnected, and provide a retry button that re-initiates the getUserMedia request when tapped
5. WHILE the app is running in PWA standalone mode, THE Camera_API SHALL request camera access using the same getUserMedia flow as in-browser mode
6. WHEN the Camera_View is opened, THE Camera_API SHALL request a video resolution of at least 720p (1280×720) to ensure captured text is legible for recognition
