# Dead Code Report

รายงานนี้ **list อย่างเดียว ไม่ลบ** ตามที่ตกลงไว้ — ให้ทีมตัดสินใจเอง.

วิธีตรวจ: `npx ts-prune` + ยืนยันด้วย `grep` ว่า symbol ถูกอ้างถึงในไฟล์อื่นนอกเหนือจากไฟล์ที่ประกาศมันหรือไม่ (ไม่นับไฟล์ `*.test.*`).

## 1. Unused Files (ไฟล์ที่ไม่ได้ใช้งานเลยทั้งไฟล์)
เหล่านี้คือไฟล์และคอมโพเนนต์ที่ไม่มีการ import จากไฟล์อื่นในส่วนใช้งานจริง (Active code) เลย สามารถลบออกได้ทั้งไฟล์

### 📁 Shared Components & Libraries (ส่วนกลาง)
* [BottomNav.tsx](file:///Users/pat/Project/tranly-free-version/tranly/app/_components/BottomNav.tsx) - ถูกสร้างไว้แต่ไม่ได้นำมาประกอบกับระบบนำทางหลักของแอป
* [PageHeader.tsx](file:///Users/pat/Project/tranly-free-version/tranly/app/_components/PageHeader.tsx) - แถบหัวกระดาษแบบเดิม ถูกแทนที่ด้วยการประยุกต์ใช้ [GeminiLayout.tsx](file:///Users/pat/Project/tranly-free-version/tranly/app/_components/GeminiLayout.tsx) แล้ว
* [LanguageWordCard.tsx](file:///Users/pat/Project/tranly-free-version/tranly/app/_components/LanguageWordCard.tsx) - การ์ดแสดงคำศัพท์ดั้งเดิม ไม่ถูกเรียกใช้ในหน้าใดๆ
* [WordDetailOverlay.tsx](file:///Users/pat/Project/tranly-free-version/tranly/app/_components/WordDetailOverlay.tsx) - ตัว Overlay รายละเอียดคำศัพท์ ไม่ได้ถูกใช้งาน
* [WordDetailSheet.tsx](file:///Users/pat/Project/tranly-free-version/tranly/app/_components/WordDetailSheet.tsx) - ตัว BottomSheet ดั้งเดิมสำหรับคำศัพท์ ไม่ได้ใช้งาน
* [useWordStatus.ts](file:///Users/pat/Project/tranly-free-version/tranly/app/_lib/useWordStatus.ts) - เปลี่ยนไปใช้ `useWordStatusContext` จาก `WordStatusProvider.tsx` แทน
* [useDbWriteError.ts](file:///Users/pat/Project/tranly-free-version/tranly/app/_lib/useDbWriteError.ts) - จัดการเขียนขัดข้องของ IndexedDB เดิม ปัจจุบันใช้งาน Supabase ทั้งหมดแล้ว
* [wordStatusCache.ts](file:///Users/pat/Project/tranly-free-version/tranly/app/_lib/wordStatusCache.ts) - ระบบ Caching/Offline Queue สำหรับ Local Storage เดิม ไม่ได้ใช้งาน

### 📁 Home (หน้าหลัก)
* [ProgressIndicator.tsx](file:///Users/pat/Project/tranly-free-version/tranly/app/home/_components/ProgressIndicator.tsx) - ตัวเลขบอกลำดับการ์ดเดิม (เช่น 1/15) ไม่ได้ใช้แล้ว
* [formatProgress.ts](file:///Users/pat/Project/tranly-free-version/tranly/app/home/_lib/formatProgress.ts) - ยูทิลิตีจัดฟอร์แมตความคืบหน้าของ `ProgressIndicator`
* [shouldFetchToday.ts](file:///Users/pat/Project/tranly-free-version/tranly/app/home/_lib/shouldFetchToday.ts) - ฟังก์ชันเช็คการดึงฟีดประจำวัน ไม่ได้ถูกเรียกใช้จากโค้ดหลัก

### 📁 Chat & Lessons (แชทและบทเรียน)
ฟีเจอร์ "บทเรียนคำศัพท์ (Vocabulary Lessons)" เดิม ไม่ถูกนำมาใช้อีกต่อไป เพราะแอปเปลี่ยนระบบหลักเป็นเน้นสนทนากับ AI (Evely Open-ended Chat) และทำข้อสอบ (Exams) ผ่านคำสั่งแชทแทน ไฟล์เหล่านี้จึงไม่ได้ใช้งานเลย:
* [LessonHistory.tsx](file:///Users/pat/Project/tranly-free-version/tranly/app/chat/_components/LessonHistory.tsx) - ประวัติการเรียนบทเรียน
* [LessonPlayer.tsx](file:///Users/pat/Project/tranly-free-version/tranly/app/chat/_components/LessonPlayer.tsx) - ตัวเล่นกิจกรรมบทเรียน (กิจกรรมจับคู่ ตอบตัวเลือก)
* [LessonSetup.tsx](file:///Users/pat/Project/tranly-free-version/tranly/app/chat/_components/LessonSetup.tsx) - การตั้งค่าจำนวนและโหมดก่อนเริ่มเรียนบทเรียน
* [LessonComplete.tsx](file:///Users/pat/Project/tranly-free-version/tranly/app/chat/_components/LessonComplete.tsx) - หน้าสรุปคะแนนหลังจบบทเรียน
* [pendingLesson.ts](file:///Users/pat/Project/tranly-free-version/tranly/app/_lib/pendingLesson.ts) - โครงสร้างบันทึกบทเรียนค้างชั่วคราว
* [useLessonSession.ts](file:///Users/pat/Project/tranly-free-version/tranly/app/chat/_lib/useLessonSession.ts) - Hook จัดการสเตตัสการตอบคำถามในบทเรียน
* [useLessonHistory.ts](file:///Users/pat/Project/tranly-free-version/tranly/app/chat/_lib/useLessonHistory.ts) - Hook บันทึกและดึงประวัติการเรียนบทเรียนจาก Supabase
* [useWordContext.ts](file:///Users/pat/Project/tranly-free-version/tranly/app/chat/_lib/useWordContext.ts) - Hook คอนเทกสต์คำศัพท์ในระบบบทเรียน

### 📁 Profile & Settings (โปรไฟล์และการตั้งค่า)
* [StreakCard.tsx](file:///Users/pat/Project/tranly-free-version/tranly/app/profile/_components/StreakCard.tsx) - การ์ดสรุปการเรียนต่อเนื่องรายสัปดาห์ ไม่ได้ถูกเรียกใช้งาน
* [danger/page.tsx](file:///Users/pat/Project/tranly-free-version/tranly/app/profile/danger/page.tsx) - หน้าลบข้อมูลแบบซับเพจเดิม ปัจจุบันยุบรวมไปแสดงผลบน BottomSheet ในหน้าหลักแทนแล้ว
* [preferences/page.tsx](file:///Users/pat/Project/tranly-free-version/tranly/app/profile/preferences/page.tsx) - หน้าตั้งค่าธีมและภาษาแบบซับเพจเดิม ปัจจุบันยุบรวมไปอยู่ใน BottomSheet หน้าหลักแทนแล้ว

### 📁 API Routes (เซิร์ฟเวอร์หลังบ้าน)
* [api/lesson/route.ts](file:///Users/pat/Project/tranly-free-version/tranly/app/api/lesson/route.ts) - API สำหรับเจนเนอเรตและตรวจเช็คบทเรียนจาก AI (ไม่มีตัวเรียกใช้หลังยกเลิกฟีเจอร์บทเรียน)
* [api/lesson/parseLessonResponse.ts](file:///Users/pat/Project/tranly-free-version/tranly/app/api/lesson/parseLessonResponse.ts) - ตัวช่วยแปลง JSON กิจกรรมบทเรียนของ AI

---

## 2. Unused Exports (ไฟล์ยังใช้งานอยู่ แต่บางฟังก์ชัน/Type ถูกทิ้งไว้)
เหล่านี้คือตัวแปรหรือฟังก์ชันที่ถูก export ไว้ภายในไฟล์ที่ยังใช้งานอยู่ แต่ตัวแปรเหล่านั้นไม่มีไฟล์อื่นอ้างอิงถึงแล้ว สามารถลบเฉพาะบรรทัดประกาศ หรือลบคำว่า `export` ออกได้

| Symbol | ไฟล์:บรรทัด | ชนิด | คำอธิบาย/บริบท |
|--------|-------------|------|----------------|
| `useWordStatusContext` | `app/_components/WordStatusProvider.tsx:568` | hook | ถูกสร้างขึ้นมาแต่แอปไปเรียก `useContext(WordStatusContext)` แทนโดยตรง |
| `useGems` | `app/_lib/GemsContext.tsx:183` | hook | ตัวจัดเก็บพลังงาน (energy) ถูกอิมพอร์ตเฉพาะ Provider คลุมแอป แต่ยังไม่มีฟีเจอร์ใดเรียกใช้ตัวแปรพลังงานนี้ |
| `useLearningStats` | `app/profile/_lib/useLearningStats.ts:21` | hook | ในไฟล์มี 2 Hook โดยหน้าจอโปรไฟล์เลือกใช้แค่ `useLanguageLearningStats` เพื่อแสดงสถิติรายภาษา |
| `STAGE_QUESTION_COUNT` | `app/exam/_lib/stages.ts:16` | const | ตัวแปรตั้งค่าจำนวนคำถามต่อระดับของห้องสอบ ไม่ได้อ้างอิงจากด้านนอก |
| `ExamState` | `app/exam/_lib/types.ts:9` | type | Type โครงสร้างสถานะจำลองสอบ |
| `ExamResult` | `app/exam/_lib/types.ts:47` | type | Type โครงสร้างคะแนนผลลัพธ์สอบ |
| `ConversationMessageRecord` | `app/chat/_lib/types.ts:27` | type | Type โครงสร้างประวัติข้อความแชทยุคเก่า |
| `IdentifyRequest` | `app/scan/flashcard/_lib/types.ts:7` | type | Type โครงสร้างการส่งภาพไปแยกคำศัพท์ของ AI |
| `FlashcardRecord` | `app/scan/flashcard/_lib/types.ts:75` | type | Type โครงสร้างเก็บข้อมูลชุดแฟลชการ์ดเดิม |
| `INDEXED_DB_CONFIG` | `app/scan/_lib/constants.ts:29` | const | ตัวแปรตั้งค่าฐานข้อมูลออฟไลน์เก่าที่เคยใช้เก็บภาพ |

### ข้อควรระวังก่อนลบ
- **Type/Interface:** บางตัวอาจตั้งใจออกแบบไว้เป็น "Schema Documentation" หรือเป็นแบบร่างสำหรับ API ก่อนลบควรยืนยันกับผู้ดูแลโมดูลนั้นๆ
- **useGems / useLearningStats:** ตรวจสอบว่าระบบพลังงานหรือหน้าโปรไฟล์จะมีการดึงตัวแปรเหล่านี้มาพัฒนาต่อในอนาคตอันใกล้หรือไม่

## วิธี re-run
```bash
npx ts-prune | grep -v "(used in module)"
# แล้วยืนยันแต่ละ symbol:
grep -rln "\bSYMBOL\b" app | grep -v '\.test\.'
```
