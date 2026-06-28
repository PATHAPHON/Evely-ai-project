# Tarnly — แผนการทดสอบและ UAT (Testing & UAT Plan)

> ระดับการทดสอบ + test case ต่อฟังก์ชัน F-01…F-08 + UAT checklist
> unit test ที่มีจริงอยู่ใน `app/_lib/__tests__/` (wordBankRow, wordStatusDerivation)
> ใช้คู่กับ `project-status.md` (สถานะจริง), `system-design.md` (flow)

---

## 1. ระดับการทดสอบ (Test Pyramid)

| ระดับ | ครอบ | เครื่องมือ | สถานะ |
| :-- | :-- | :-- | :-- |
| **Unit** | logic บริสุทธิ์: SM-2, สถานะคำ, map row | Jest/Vitest (`_lib/__tests__`) | ✅ มีบางส่วน |
| **Integration** | hook + Supabase + API route | Testing Library + mock fetch | 🔵 เพิ่ม |
| **E2E** | flow ผู้ใช้จริงบน browser | Playwright | 🔵 ออปชัน (คุ้มสุดสำหรับ chat/flashcard) |
| **UAT** | ผู้ใช้จริงตามเล่มโครงงาน | manual checklist (§4) | 🔵 ก่อนสอบจบ |

**กลยุทธ์ lazy:** logic ที่คำนวณ (SM-2, สถานะสี) = unit test ให้แน่น (จุดที่พังเงียบ). UI/flow = E2E เฉพาะเส้นทางวิกฤต (แชต, เก็บคำ, แฟลชการ์ด) ไม่ต้อง test ทุกปุ่ม

---

## 2. Test Case ต่อฟังก์ชัน (F-01…F-08)

### ตารางสรุปรวม

| รหัส | ฟังก์ชัน | Test case สำคัญ | ผลคาดหวัง | สถานะ |
| :-- | :-- | :-- | :-- | :-: |
| TC-01 | F-01 Auth | สมัคร email ซ้ำ / รหัสผิด / guest→email | error ชัด, session ถูกสร้าง, guest อัปเกรดไม่เสียข้อมูล | ✅ |
| TC-02 | F-03 Chat | ส่งข้อความ → stream | คำไหลทีละ token, บันทึก `conversation_messages` | ✅ |
| TC-03 | F-03 Chat | context > 20 ข้อความ | ส่ง LLM แค่ 20 ท้าย (เช็ค prompt) | ✅ |
| TC-04 | F-04 Translate | th→en และ en (grammar) | คืน `englishText/translation`, en คืน `grammarNotes` | ✅ |
| TC-05 | F-06 Word save | คลิกคำใหม่ | insert `words`+`word_progress`, คำเปลี่ยนสีทันที (optimistic) | ✅ |
| TC-06 | F-06 Word detail cache | ขอคำเดิม 2 ครั้ง | ครั้งที่ 2 มาจาก cache ไม่เรียก LLM | ✅ |
| TC-07 | F-07 SM-2 | quality < 3 | `interval=1, box=1`, `next_review_at`=พรุ่งนี้ | ✅ (unit) |
| TC-08 | F-07 SM-2 | quality >= 3 ครั้งที่ 1/2/3 | interval = 1/6/prev*EF, EF ไม่ต่ำกว่า 1.3 | ✅ (unit) |
| TC-09 | F-07 สถานะสี | `next_review_at <= now` | คำเป็น needs_review (เหลือง); หลัง review = known (เขียว) | ✅ (unit) |
| TC-10 | F-07 เกม UI | โหลดคำครบกำหนด → พลิก → ให้คะแนน | ดึงเฉพาะสีเหลือง, หน้าสรุปคืน energy | 🔵 รอ UI |
| TC-11 | F-08 Reset | กดล้างข้อมูล | `words/word_progress/conversations` ของ user ว่าง | ✅ |
| TC-12 | F-08 Theme | สลับ light/dark | บันทึก localStorage, persist ข้ามรีโหลด | ✅ |
| TC-14 | TTS | ไม่มี key | คืน 503 → fallback Web Speech ไม่ crash | ✅ |

---

### 2.1 F-01 — Authentication (รายละเอียด)

**Happy path**
| input | expected |
| :--- | :--- |
| สมัครด้วย email ใหม่ + password ≥ 8 ตัว | session สร้างสำเร็จ, redirect ไป `/chat` |
| login ด้วย email+password ถูก | session active, `profile` row พร้อมใช้ |
| เข้าแบบ guest (`signInAnonymously`) | session anonymous สร้างขึ้น, สามารถแชตได้ทันที |

**Edge case**
| สถานการณ์ | expected |
| :--- | :--- |
| guest อัปเกรด → email (ผ่าน `linkIdentity`) | session เดิมยังอยู่, ข้อมูลคำและประวัติแชตไม่หาย |
| token หมดอายุระหว่างใช้งาน | `middleware.ts` refresh อัตโนมัติ ไม่ redirect กะทันหัน |
| login ผ่าน Google OAuth แล้วกลับมา | `redirect` param พาไปหน้าเดิมที่ตั้งใจเข้า |

**Negative test**
| input ผิด | expected |
| :--- | :--- |
| email ซ้ำในระบบ | Supabase error → UI แสดง "อีเมลนี้มีอยู่แล้ว" |
| password ผิด | error "รหัสผ่านไม่ถูกต้อง" ไม่ crash |
| email รูปแบบผิด (`abc@`) | validation ก่อน submit, ไม่เรียก Supabase |
| เข้าหน้า `/chat` โดยไม่ login | `middleware.ts` เด้งไป `/auth?redirect=/chat` |

---

### 2.2 F-03 — AI Chat (รายละเอียด)

**Happy path**
| input | expected |
| :--- | :--- |
| ส่งข้อความอังกฤษ | stream เริ่มภายใน 2 วิ (K1), คำไหลทีละ chunk, บันทึก `conversation_messages` เมื่อจบ |
| ส่งข้อความไทย | LLM ตอบอังกฤษ พร้อม `readings` + `translations` ใต้ประโยค |
| context ยาว 25 ข้อความ | API ส่ง LLM แค่ 20 ท้ายสุด (วัดจาก payload ใน DevTools Network) |

**Edge case**
| สถานการณ์ | expected |
| :--- | :--- |
| `energy = 0` (quota หมด 15 ครั้ง/วัน) | RPC `consume_chat_quota` ปฏิเสธ → route คืน `429` → UI แสดงข้อความ "โควต้าวันนี้หมดแล้ว" ชัดเจน, ไม่ crash |
| stream ขาดกลางคัน (network drop) | partial message ไม่ถูกบันทึก, UI แสดง error inline, ผู้ใช้ส่งใหม่ได้ทันที |
| LLM timeout (> 30 วิ) | `AbortController` ตัด → คืน `500`, client แสดง "AI ตอบช้า ลองอีกครั้ง" |
| `suggestions` field ว่าง/null | Suggestion Panel ไม่แสดง ไม่ crash |

**Negative test**
| input | expected |
| :--- | :--- |
| body ไม่มี `messages` field | `400 { "error": "messages required" }` |
| ไม่มี session (ไม่ login) | `401 { "error": "Unauthorized" }` |
| `messages` เป็น array ว่าง `[]` | `400` หรือ LLM ตอบกลับ error — ไม่ crash |

---

### 2.3 F-06 — Word Bank / Word Detail Cache (รายละเอียด)

**Happy path**
| สถานการณ์ | expected |
| :--- | :--- |
| คลิกคำใหม่ → กด "เก็บ" | insert `words` + `word_progress` (box=1, interval=1, EF=2.5), คำเปลี่ยนสีทันที (optimistic update) |
| เปิดหน้า `/words` | แสดงรายการคำจัดกลุ่มตามวันที่บันทึก ไม่ซ้ำ |

**Edge case**
| สถานการณ์ | expected |
| :--- | :--- |
| คลิกคำเดิมที่เคยบันทึกแล้ว → กด "เก็บ" อีกครั้ง | `upsert` ไม่ duplicate — row ใน `words` ยังมีแค่ 1 แถว |
| ขอ word detail คำเดิม 2 ครั้งติดกัน (cache hit) | ครั้งที่ 2 ตอบกลับ < 300 ms (K2), ไม่เรียก KKU LLM (ตรวจ server log) |
| cache หมดอายุ (expires_at < now) | เรียก LLM ใหม่ + เขียน cache ใหม่ ผ่าน `after()` non-blocking |
| LLM คืน `ipa` / `partOfSpeech` เป็น string ว่าง | UI แสดง placeholder เงียบ ไม่ crash |

**Negative test**
| input | expected |
| :--- | :--- |
| body ไม่มี `word` field | `400` |
| `word` เป็น string ยาวเกิน 100 ตัวอักษร | `400` หรือ LLM ตอบ error — ไม่เก็บ cache |
| ไม่มี session | `401` |

---

### 2.4 F-07 — SM-2 Spaced Repetition (รายละเอียด)

> ไฟล์ทดสอบหลัก: `app/_lib/__tests__/spacedRepetition.test.ts`
> ฟังก์ชันหลัก: `reviewWord(wordProgress, quality)` → `WordProgress` ใหม่

**Happy path — ทดสอบ `spacedRepetition.ts` โดยตรง**
| input (quality) | expected interval | expected ease_factor | หมายเหตุ |
| :---: | :---: | :--- | :--- |
| q = 5 (จำได้ดีมาก, ครั้งที่ 1) | 1 วัน | EF เพิ่ม (> 2.5 ถ้า EF เริ่มที่ 2.5) | box → 2 |
| q = 5 (ครั้งที่ 2) | 6 วัน | EF เพิ่มต่อ | box → 3 |
| q = 5 (ครั้งที่ 3+) | `ceil(prev × EF)` วัน | EF เพิ่มขึ้นอีก | |
| q = 3 (ผ่านแต่ยากสุด) | ปกติตาม SM-2 | EF ลดลงเล็กน้อย แต่ยังไม่ต่ำกว่า **1.3** | |
| q = 4 | ปกติตาม SM-2 | EF คงที่หรือเพิ่มเล็กน้อย | |

**Edge case**
| สถานการณ์ | expected |
| :--- | :--- |
| q = 0 (ลืมสนิท) | `interval = 1`, `box = 1`, `next_review_at` = วันพรุ่งนี้ |
| q = 1 | `interval = 1`, `box = 1`, reset เหมือน q = 0 |
| q = 2 (ยังลืม) | `interval = 1`, `box = 1` |
| EF ลดจนใกล้ 1.3 แล้ว q=3 อีก | EF ต้องคงที่ที่ **1.3** ไม่ต่ำกว่า (`Math.max(1.3, ...)`) |
| q = 5 หลายรอบ | `interval` เพิ่มขึ้นเรื่อย ๆ ไม่มี cap (ตาม SM-2 ต้นฉบับ) |
| เล่นเกมตอนไม่มีคำสีเหลือง (`next_review_at > now`) | empty state แสดงข้อความ "ยังไม่มีคำที่ต้องทบทวน" ไม่ใช่ error |

**Negative test**
| สถานการณ์ | expected |
| :--- | :--- |
| quality นอกช่วง 0-5 (เช่น -1, 6, null) | throw error หรือ clamp — ไม่บันทึก state ผิด |
| `word_progress` ไม่มีใน DB (word_id ไม่ตรง) | RLS คืน empty → UI แสดง error ชัด ไม่ crash |

---

## 3. Edge case / Negative test ที่ต้องครอบ

- คลิกคำเดิมซ้ำ → ไม่ insert ซ้ำ (idempotent)
- เน็ตหลุดกลาง stream แชต → ไม่บันทึกข้อความพัง, retry ได้
- energy = 0 → กันส่งแชต, ข้อความชัด (เป็น rate limit ตามดีไซน์)
- คำที่ LLM คืน IPA/POS ว่าง → ไม่ทำ UI พัง
- เล่นแฟลชการ์ดตอนไม่มีคำครบกำหนด → empty state ไม่ใช่ error
- RLS: user A ขอข้อมูล user B → ได้ว่าง/403 ไม่ใช่หลุด

---

## 4. UAT Checklist (ก่อนสอบจบ / เปิดจริง)

ให้ผู้ใช้จริง (ไม่ใช่ผู้พัฒนา) ทำตามแล้วบันทึกผ่าน/ไม่ผ่าน:

- [ ] สมัครใหม่ → ใช้งานได้ใน < 1 นาที โดยไม่ต้องสอน
- [ ] แชตคุยภาษาอังกฤษ → เข้าใจคำแปลไทย + grammar note
- [ ] คลิกคำไม่รู้จัก → เห็น IPA/POS/แปล → เก็บได้
- [ ] เปิด `/words` → เห็นคำที่เก็บ จัดกลุ่มตามวัน เล่นเสียงได้
- [ ] (Phase 2) เล่นแฟลชการ์ดคำสีเหลือง → ให้คะแนน → คำกลับเขียว
- [ ] สลับ dark mode → สบายตา, ค้างหลังรีโหลด
- [ ] รีเซ็ตข้อมูล → เริ่มใหม่สะอาด
- [ ] ใช้บนมือถือ → layout ไม่พัง
- [ ] วัดความพึงพอใจ (แบบสอบถาม Likert 1-5) ตามระเบียบวิธีวิจัย

---

## 5. เกณฑ์ผ่าน (Definition of Done ต่อฟีเจอร์)

ฟีเจอร์ถือว่าเสร็จเมื่อ: logic มี unit test ผ่าน · flow หลักทำงานบน production · edge case วิกฤต (§3) ไม่ crash · ผ่าน UAT อย่างน้อย 1 รอบ
