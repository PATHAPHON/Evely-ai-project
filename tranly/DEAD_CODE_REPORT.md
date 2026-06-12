# Dead Code Report

รายงานนี้ **list อย่างเดียว ไม่ลบ** ตามที่ตกลงไว้ — ให้ทีมตัดสินใจเอง.

วิธีตรวจ: `npx ts-prune` + ยืนยันด้วย `grep` ว่า symbol ถูกอ้างถึงในไฟล์อื่น
นอกเหนือจากไฟล์ที่ประกาศมันหรือไม่ (ไม่นับไฟล์ `*.test.*`).

> หมายเหตุ: ts-prune ยัง flag default export ของ Next.js (page.tsx, route.ts
> `POST`/`GET`, `middleware`, `config`, `manifest`, `*.config.ts`, `layout`)
> ซึ่ง **ไม่ใช่ dead code** — framework เรียกผ่าน convention. ตัดออกจากรายการแล้ว.

## Unused exports (ถูกอ้างถึงเฉพาะในไฟล์ที่ประกาศ — น่าจะลบได้)

| Symbol | ไฟล์:บรรทัด | ชนิด |
|--------|-------------|------|
| `setPendingLesson` | `app/_lib/pendingLesson.ts:11` | function |
| `takePendingLesson` | `app/_lib/pendingLesson.ts:25` | function |
| `useWordStatus` | `app/_lib/useWordStatus.ts:22` | hook |
| `useWordContext` | `app/chat/_lib/useWordContext.ts:65` | hook |
| `useLessonSession` | `app/chat/_lib/useLessonSession.ts:39` | hook |
| `STAGE_QUESTION_COUNT` | `app/exam/_lib/stages.ts:16` | const |
| `INDEXED_DB_CONFIG` | `app/scan/_lib/constants.ts:29` | const |
| `FeedRequest` | `app/home/_lib/types.ts:45` | type |
| `ConversationMessageRecord` | `app/chat/_lib/types.ts:27` | type |
| `ExamState` | `app/exam/_lib/types.ts:9` | type |
| `ExamResult` | `app/exam/_lib/types.ts:47` | type |
| `CapturedImage` | `app/scan/_lib/types.ts:16` | type |
| `CameraPageState` | `app/scan/_lib/types.ts:25` | type |
| `PreviewPageState` | `app/scan/_lib/types.ts:34` | type |
| `IdentifyRequest` | `app/scan/flashcard/_lib/types.ts:7` | type |
| `FlashcardRecord` | `app/scan/flashcard/_lib/types.ts:75` | type |

### ข้อควรระวังก่อนลบ
- `useWordStatus` / `useWordContext` / `useLessonSession`: เป็น public hook —
  เช็คว่าเคยตั้งใจให้เป็น API สำหรับ feature ที่ยังไม่ต่อหรือไม่ ก่อนลบ.
- type ที่ไม่ถูกใช้: ปลอดภัยจะลบ แต่บางตัวอาจเป็น "schema documentation" ที่
  ตั้งใจ export ไว้ — ยืนยันกับเจ้าของ feature.

## วิธี re-run
```bash
npx ts-prune | grep -v "(used in module)"
# แล้วยืนยันแต่ละ symbol:
grep -rln "\bSYMBOL\b" app | grep -v '\.test\.'
```
