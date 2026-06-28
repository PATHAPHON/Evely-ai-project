# Tarnly — ข้อกำหนดผลิตภัณฑ์ (Product Requirements Document)

> สเปกที่ตรวจรับได้ (measurable) ใช้เป็น source-of-truth ของขอบเขตงาน
> *เนื้อ problem/solution/scope/IPO/schema/architecture ไม่ซ้ำที่นี่ — อ้างอิง `Requirements.md` §2.2, §2.3, §2.4, §4, §6*

## 1. Executive Summary
* **Problem:** ผู้เรียนไทยขาดคู่ฝึกสนทนาอังกฤษที่ไม่กดดัน และจำศัพท์แบบท่องตารางไม่ยั่งยืน (รายละเอียด `Requirements.md` §2.2)
* **Solution:** เว็บแอปคู่สนทนา AI แบบสตรีม + คลังศัพท์ที่คลิกเก็บจากแชตได้ + เกมแฟลชการ์ดทบทวนตาม SM-2
* **Success Criteria (KPI ที่วัดผลได้):**
  | # | ตัวชี้วัด | เป้า |
  | :--- | :--- | :--- |
  | K1 | latency เริ่มสตรีมประโยคแรกของ AI (TTFB ของ stream) | ≤ 2.0 วินาที (p90) |
  | K2 | latency คืน IPA+POS+คำแปลเมื่อคลิกคำ (cache hit) | ≤ 300 มิลลิวินาที (p90) |
  | K3 | ความถูกต้องของ grammar note + คำแปลไทย (ประเมินด้วยชุดทดสอบ §4) | ≥ 90% |
  | K4 | คำสีเหลือง (`next_review_at <= now()`) ถูกดึงเข้าเกมครบถ้วน | 100% (ไม่มีคำตกค้าง) |
  | K5 | สัดส่วนคำที่กู้สถานะ เหลือง→เขียว สำเร็จหลังเล่นเกมจบ 1 เซสชัน | ≥ 95% ของคำที่โหวต q≥3 |

## 2. User Personas
* **P1 — นักศึกษาผู้ฝึก (primary):** อายุ 18-25 อยากฝึกพูด/เขียนอังกฤษโดยไม่อายที่จะผิด ใช้บนเดสก์ท็อปเป็นหลัก
* **P2 — ผู้ทบทวนศัพท์:** มีคลังศัพท์สะสมแล้ว เข้ามาเพื่อเคลียร์คำสีเหลืองให้กลับเขียวเป็นรอบ ๆ

## 3. User Stories + Acceptance Criteria
> สถานะอิง `project-status.md` (✅ เสร็จ · 🟡 บางส่วน)

* **US-1 (F-03 ✅):** *ในฐานะ P1 ฉันอยากคุยกับ AI tutor เป็นภาษาอังกฤษ เพื่อฝึกสื่อสารโดยไม่กลัวผิด*
  * AC: คำตอบ AI สตรีมทีละประโยค; บันทึกลง `conversation_messages`; โควต้า 15 ครั้ง/วันบังคับฝั่ง server (RPC `consume_chat_quota`)
* **US-2 (F-04 ✅):** *ฉันอยากเห็นคำแปลไทยและคำแนะนำไวยากรณ์ใต้ประโยค เพื่อรู้ว่าพูดถูกไหม*
  * AC: ทุกประโยคผู้ใช้มี reading + translation; ประโยคที่ผิดไวยากรณ์แสดง grammar note
* **US-3 (F-06 ✅):** *ฉันอยากคลิกคำในแชตเพื่อดู IPA/ประเภทคำ แล้วเก็บลงคลัง*
  * AC: คลิกคำ → คืน IPA+POS+คำแปล (cache ผ่าน `ai_word_detail_cache`); กดบันทึก → เพิ่มแถวใน `words` + `word_progress` (ค่าเริ่ม box=1, interval=1, EF=2.5)
* **US-4 (F-07 🟡 — งานหลักที่เหลือ):** *ฉันอยากเล่นเกมแฟลชการ์ดทบทวนคำสีเหลือง เพื่อกู้สถานะเป็นเขียว*
  * AC: ดึงเฉพาะคำ `next_review_at <= now()` เรียงตามค้างนานสุด; การ์ด 3D พลิกได้ (หน้า: คำ+IPA+ปุ่ม TTS / หลัง: คำแปล+POS+ประโยคบริบท); โหวต 0-5 → เรียก `reviewWord()` (SM-2 `Requirements.md` §4.1.3) → อัปเดต `next_review_at`; มีหน้าสรุปจำนวนคำที่กู้เป็นเขียว
* **US-5 (F-05 🟡):** *ฉันอยากเห็นคำแนะนำศัพท์ตามบริบทที่กำลังคุย* — AC: Suggestion Panel แสดงคำจาก field `suggestions` ที่แชตคืนมาแล้ว
* **US-6 (F-08 🟡):** *ฉันอยากแก้โปรไฟล์ สลับธีม และล้างข้อมูลเพื่อเริ่มใหม่* — AC: แก้ display name/avatar ✅, สลับ light/dark (localStorage) ✅, reset ล้าง `words`/`conversations` ✅; **เหลือ:** ตั้งค่าสปีด TTS

### 3.1 Non-Goals (ไม่ทำในขอบเขตนี้)
* TOPIK / ข้อสอบ, OCR/สแกนภาพ, backoffice, ฟีเจอร์ภาพ (ถอดออกแล้ว — ดู `project-status.md` §4)
* ภาษาเป้าหมายอื่นนอกจากอังกฤษ (ไทยเป็นภาษาอ้างอิงเท่านั้น)

### 4.1 SM-2 Algorithm Correctness

ข้อกำหนดเฉพาะสำหรับ implementation ของ SM-2 ใน `app/_lib/spacedRepetition.ts`:

| พารามิเตอร์ | ข้อกำหนด | เหตุผล |
| :--- | :--- | :--- |
| `ease_factor` | ต้องไม่ต่ำกว่า **1.3** เสมอ | SM-2 ต้นฉบับ Wozniak กำหนดค่าต่ำสุดไว้ที่ 1.3 — ถ้าต่ำกว่านี้ interval จะลดลงเร็วผิดปกติ |
| `interval` | ต้องเป็น **integer จำนวนเต็มวัน** เสมอ (ปัดขึ้น `Math.ceil`) | การ schedule `next_review_at` ใช้หน่วยวัน — ทศนิยมทำให้ timestamp คำนวณผิด |
| `interval` เมื่อ q < 3 | reset เป็น **1** (วัน) และ box กลับเป็น 1 | การ "ลืม" ควรเริ่มนับใหม่ตั้งแต่วันถัดไป |
| `interval` ครั้งที่ 1 (q≥3) | **1** วัน | |
| `interval` ครั้งที่ 2 (q≥3) | **6** วัน | |
| `interval` ครั้งที่ n≥3 (q≥3) | `round(prev_interval × ease_factor)` | |
| `ease_factor` เมื่อ q≥3 | `max(1.3, ef + (0.1 - (5-q)×(0.08 + (5-q)×0.02)))` | q=5 → EF เพิ่ม; q=3 → EF ลดเล็กน้อย |

**unit test reference:** `app/_lib/__tests__/spacedRepetition.test.ts` — ทดสอบครบทุก q=0..5 และตรวจ boundary `ease_factor >= 1.3`

## 4. AI System Requirements
* **Tools / APIs:** LLM `deepseek-v4-flash` ผ่าน KKU IntelSphere (`gen.ai.kku.ac.th`) สำหรับ chat/translate/word-detail; TTS = Kokoro 82M (OpenRouter) (fallback Web Speech API); STT = Web Speech API
* **Evaluation Strategy:**
  * ชุดทดสอบ 30-50 ประโยคที่มี grammar error ที่รู้คำตอบ → วัด K3 (grammar note + คำแปลถูก ≥ 90%)
  * SM-2 unit test: ป้อน q=0..5 ตรวจ `interval`/`ease_factor`/`next_review_at` ตรงสูตร proposal §4.1.3 (มี `spacedRepetition.test.ts`)
  * cache correctness: คลิกคำเดิมซ้ำต้องได้ผลเดิมจาก `ai_word_detail_cache` ไม่ยิง LLM ใหม่ (วัด K2)

## 5. Technical Specifications
* **Architecture / data flow:** ดู proposal §6 (diagram) + `frontend-architecture.md`, `backend-architecture.md`
* **Integration points:** Supabase (Auth + PostgreSQL), KKU LLM, Kokoro 82M (OpenRouter) — ดูสเปก request/response ใน `api-specification.md`
* **Security & Privacy:**
  * แยกข้อมูลรายผู้ใช้ด้วย Supabase RLS (`user_id` ทุกตารางหลัก); API key LLM/TTS อยู่ฝั่ง server เท่านั้น ห้ามหลุดไป client
  * โควต้าแชตบังคับฝั่ง server (กันการเรียก LLM เกิน); reset ข้อมูลต้องลบเฉพาะของ `user_id` ที่ล็อกอิน

## 6. Risks & Roadmap
* **Phased rollout:**
  * **MVP (เสร็จแล้ว):** F-01, F-03, F-04, F-06 — auth → แชต → คลิกเก็บคำ → SM-2 หลังบ้าน
  * **v1.0 (งานที่เหลือ ตามลำดับใน `project-status.md` §3):** UI เกมแฟลชการ์ด (F-07) → เก็บกวาด DB orphans → ตั้งค่าสปีด TTS (F-08) → Suggestion Panel (F-05)
* **Technical risks:**
  | ความเสี่ยง | ผลกระทบ | การรับมือ |
  | :--- | :--- | :--- |
  | LLM KKU ช้า/ล่ม | กระทบ K1, แชตใช้ไม่ได้ | สตรีมประโยคแรกเร็ว + ข้อความ error ชัด; cache word-detail ลดภาระ |
  | TTS ไม่มี API key | ออกเสียงไม่ได้ | fallback Web Speech API (มีแล้ว) |
  | DB orphans (`captures`, `study_sessions`, คอลัมน์ค้าง) | สับสน/บั๊กตอนต่อยอด | drop ผ่าน migration หลังยืนยันไม่มีโค้ดอ้าง (`project-status.md` §4) |
