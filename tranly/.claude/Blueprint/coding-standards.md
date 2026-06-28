# Tarnly — มาตรฐานการเขียนโค้ด (Coding Standards & Conventions)

> กติกาให้ทีมเขียนโค้ดไปทางเดียวกัน — สรุปจาก pattern จริงในโปรเจกต์ + แนวที่ควรรักษา
> ใช้คู่กับ `frontend-architecture.md` (โครงสร้างจริง), `backend-architecture.md`

---

## 1. โครงสร้างโฟลเดอร์ (App Router)

```
app/
├── <route>/page.tsx              หนึ่งหน้า = หนึ่งโฟลเดอร์
├── <route>/_components/          component เฉพาะหน้านั้น (ขีดล่าง = ไม่เป็น route)
├── <route>/_lib/                 logic เฉพาะหน้านั้น
├── _components/                  component ใช้ร่วมทั้งแอป (GeminiLayout, WordRenderer...)
├── _lib/                         logic/hook/type ใช้ร่วม + __tests__/
└── api/<route>/route.ts          API route (POST), api/_lib/ = helper ฝั่ง server
```

**กติกา:** ของใช้ที่เดียว → วางใต้ route นั้น. ใช้ ≥2 ที่ → ยกขึ้น `app/_components` หรือ `app/_lib`. อย่ายกขึ้นก่อนมีคนใช้ซ้ำจริง (YAGNI)

---

## 2. Naming

| สิ่งของ | แบบ | ตัวอย่าง |
| :-- | :-- | :-- |
| Component / Context | PascalCase | `WordRenderer.tsx`, `ActiveLanguageContext.tsx` |
| hook | camelCase ขึ้นต้น `use` | `useChatApi.ts`, `useWordStorage.ts` |
| module logic / util | camelCase | `spacedRepetition.ts`, `wordStatusDerivation.ts` |
| type/interface | PascalCase | `WordRecord`, `WordBankEntry` |
| คอลัมน์ DB | snake_case | `next_review_at`, `ease_factor` |
| ตัวแปร/ฟังก์ชัน TS | camelCase | `nextReviewAt` (map จาก snake_case ตอนอ่าน row) |
| env var | UPPER_SNAKE | `KKU_API_KEY` |

> **กฎสำคัญ:** DB = snake_case, TS = camelCase. แปลงที่ชั้น map (`wordBankRow.ts`) ที่เดียว อย่าให้ snake_case รั่วเข้า component

---

## 3. State / Data

- **State = React Context เท่านั้น** (ไม่มี Redux/Zustand — อย่าเพิ่งเพิ่ม). global state ใหม่ → provider ใน `AppProviders.tsx`
- **ชั้นเก็บข้อมูล:** Supabase (หลัก) · localStorage (ภาษา/ธีม/ชื่อ) · sessionStorage (ส่งคำเข้า `/word-detail`)
- **Optimistic update:** เขียน cache ใน memory ก่อน → sync Supabase เบื้องหลัง (ดู `addWord`) เพื่อ UI ไว
- **อย่า fetch ใน component ตรงๆ** — ครอบใน hook (`useXxx`) ให้ test/reuse ได้

---

## 4. API Route

- เป็น **proxy บางๆ** เรียก LLM/TTS เท่านั้น — logic หนักอยู่ฝั่ง client หรือ DB
- ตัด context/จำกัด input ก่อนยิง LLM (กัน prompt บวม + ค่าใช้จ่าย) — เช่น chat เหลือ 20 ข้อความท้าย
- งานเขียนที่ไม่ต้องรอ → `after()` (non-blocking) เช่นเขียน cache
- รับ custom AI header (`x-custom-*`) ทุก route ที่เรียก LLM
- คืน error เป็น `{error}` + HTTP status ที่ตรง (ดู `api-specification.md`)

---

## 5. Database / Migration

- **ทุกการแก้ schema ผ่าน migration** (`apply_migration` / `supabase db push`) — **ห้ามแก้มือบน prod**
- ทุกตาราง **เปิด RLS** + policy `user_id = auth.uid()` — ยืนยันด้วย `get_advisors`
- ตั้ง default ใน schema (เช่น `daily_spend_microbaht=0`, `ease_factor=2.5`) ไม่ใช่ใน app code
- ก่อน drop คอลัมน์/ตาราง → ยืนยันไม่มีโค้ดอ้าง (ดู `project-status.md` §4)

---

## 6. TypeScript / สไตล์

- `strict` เปิด — ห้าม `any` ลอย, ใช้ type จาก `wordTypes.ts` ให้ตรง
- type ที่ใช้ร่วม → `_lib/wordTypes.ts`; อย่านิยาม type ซ้ำหลายที่
- ฟังก์ชัน logic บริสุทธิ์ (เช่น SM-2) แยกเป็น module ไม่ผูก React → test ง่าย
- comment เท่าที่จำเป็น; โค้ดที่ตั้งใจทำง่ายแบบมีเพดาน มาร์ค `// ponytail: ...` พร้อมทางอัปเกรด

---

## 7. Git / กระบวนการ

- commit แบบ conventional: `feat(chat): ...`, `fix(types): ...`, `refactor: ...` (ตรงกับ log จริง)
- branch จาก `main`, PR เข้า preview (Vercel ออก URL ให้) ก่อน merge
- ก่อน merge: `npm run lint` + `npm test` + `next build` ผ่าน
- ไม่ commit secret / `.env`

---

## 8. Definition of Done (เขียนโค้ด)

โค้ดเสร็จเมื่อ: type ผ่าน · lint ผ่าน · logic ไม่ trivial มี unit test · ไม่มี dead import/orphan · ทำผ่าน migration ถ้าแตะ DB · ใช้ pattern เดิม (hook/context) ไม่สร้าง abstraction ใหม่โดยไม่จำเป็น
