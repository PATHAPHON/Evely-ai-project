# แผนภาพลำดับ (Sequence Diagram)
### ระบบ Tarnly — AI Conversation Learning Platform

> Sequence diagram ของ flow หลัก อ้างอิง `app/api/` จริง ณ 2026-06-28
> ดูคู่กับ [api-specification.md](./api-specification.md) และ [dfd-context-diagram.md](./dfd-context-diagram.md)

---

## 1. สมัคร / ล็อกอิน (P-01)

```mermaid
sequenceDiagram
    autonumber
    actor U as 👤 ผู้เรียน
    participant FE as Next.js Client<br/>(useAuthForm)
    participant MW as Middleware
    participant SB as Supabase Auth

    U->>FE: กรอกอีเมล + รหัสผ่าน
    FE->>SB: signInWithPassword / signUp
    SB-->>FE: JWT session (set cookie)
    FE->>SB: โหลด profile (RLS)
    SB-->>FE: profile + subscription_status
    FE-->>U: เข้าหน้าแชต

    Note over MW: ทุก request ถัดไป
    U->>MW: เข้าหน้า protected
    MW->>SB: refresh token
    alt session valid
        MW-->>U: ผ่าน
    else ไม่มี session
        MW-->>U: redirect /auth?redirect=
    end
```

---

## 2. สนทนากับ AI + ตรวจ Grammar (P-02 + P-03, ขนาน)

```mermaid
sequenceDiagram
    autonumber
    actor U as 👤 ผู้เรียน
    participant FE as ChatScreen<br/>(useChatApi)
    participant CHAT as POST /api/chat
    participant GRAM as POST /api/grammar
    participant OR as 🤖 OpenRouter<br/>(Llama 3.1)
    participant KKU as 🧠 KKU DeepSeek
    participant SB as 🗄️ Supabase

    U->>FE: พิมพ์ข้อความ
    par Chat (JSON Response)
        FE->>CHAT: { messages, language }
        CHAT->>SB: getRequestUser() + checkBudget
        alt budget หมด
            CHAT-->>FE: 429
        else ok
            CHAT->>OR: prompt + ประวัติทั้งหมด (unlimited)
            OR-->>CHAT: ข้อความดิบ (JSON string)
            CHAT-->>FE: text/plain (JSON string)
            FE->>FE: แกะคำตอบ (parseChatResponse)
            FE-->>U: แสดงผลกล่องข้อความเต็ม
            CHAT->>SB: debitBudget (microbaht)
        end
    and Grammar
        FE->>GRAM: { text }
        GRAM->>SB: getRequestUser()
        GRAM->>KKU: ตรวจ grammar + แปล
        KKU-->>GRAM: { englishText, grammarNotes, translation }
        GRAM-->>FE: ผลตรวจ
        FE-->>U: Grammar Notes + คำแปล (premium toggle)
    end
    FE->>SB: บันทึกแชต (RLS)
```

---

## 3. พูด → ข้อความ (STT, P-04)

```mermaid
sequenceDiagram
    autonumber
    actor U as 👤 ผู้เรียน
    participant FE as ChatInput / VoiceMode<br/>(useSTT)
    participant STT as POST /api/stt
    participant W as 🎙️ Whisper

    U->>FE: กดไมค์ พูด
    FE->>FE: บันทึก webm → base64
    FE->>STT: { audio, format: "webm" }
    STT->>W: whisper-large-v3
    W-->>STT: { text }
    STT-->>FE: ข้อความที่ถอด
    FE-->>U: เติมในช่องพิมพ์ → ส่งเข้า flow #2
```

---

## 4. เสียงอ่าน (TTS, P-05)

```mermaid
sequenceDiagram
    autonumber
    actor U as 👤 ผู้เรียน
    participant FE as AIMessage<br/>(useTTS)
    participant TTS as POST /api/tts
    participant K as 🎵 Kokoro 82M

    U->>FE: กดเล่นเสียง
    FE->>TTS: { text, voice, speed }
    alt มี OPENROUTER_API_KEY
        TTS->>TTS: เช็ค in-memory cache (max 500)
        alt cache hit
            TTS-->>FE: MP3 (cached)
        else miss
            TTS->>K: สังเคราะห์เสียง
            K-->>TTS: MP3
            TTS->>TTS: เขียน cache
            TTS-->>FE: audio/mpeg
        end
        FE-->>U: เล่นเสียง
    else ไม่มี key
        TTS-->>FE: 503
        FE-->>U: fallback Web Speech API
    end
```

---

## 5. คลิกคำศัพท์ + shared cache (P-06)

```mermaid
sequenceDiagram
    autonumber
    actor U as 👤 ผู้เรียน
    participant FE as WordRenderer<br/>(useWordBank)
    participant WD as POST /api/word-detail
    participant SB as 🗄️ Supabase<br/>(ai_word_detail_cache)
    participant KKU as 🧠 KKU DeepSeek

    U->>FE: คลิกคำในบทสนทนา
    FE->>WD: { word, context }
    WD->>SB: เช็ค shared cache
    alt cache hit
        SB-->>WD: รายละเอียดคำ
    else miss
        WD->>KKU: ขอ IPA / ประเภทคำ / ตัวอย่าง
        KKU-->>WD: รายละเอียดคำ
        WD-->>FE: ผล (คืนก่อน)
        WD->>SB: after() เขียน cache (non-blocking)
    end
    WD-->>FE: { word, ipa, thai, partOfSpeech, ... }
    FE->>SB: บันทึกคำลงคลัง (RLS)
    FE-->>U: popup + สีสถานะในแชต
```

---

## 6. มินิเกมทบทวน SM-2 (P-07)

```mermaid
sequenceDiagram
    autonumber
    actor U as 👤 ผู้เรียน
    participant FE as เกมทบทวน<br/>(useWordStorage)
    participant SB as 🗄️ Supabase

    FE->>SB: ดึงคำถึงกำหนด (สีเหลือง, next_review_at <= now)
    SB-->>FE: รายการคำ
    loop ต่อคำ
        FE-->>U: เล่นเกม 1 ใน 3 แบบ (Matching / Typing / Speak)
        U->>FE: ให้คะแนนตนเอง 0–5 (Quality Score)
        FE->>FE: คำนวณ SM-2 (interval, ease, repetitions)
        FE->>SB: อัปเดต next_review_at & word_progress (RLS)
    end
    FE-->>U: แสดงหน้าสรุปผล (จำนวนคำที่เปลี่ยน เหลือง → เขียว)
```

### คำอธิบายอัลกอริทึม SM-2 และสีสถานะคำศัพท์ (SM-2 Calculation & Word Statuses)

ระบบจัดเก็บและวิเคราะห์คำศัพท์ผ่านตรรกะ Spaced Repetition (SM-2) ตามโครงสร้างในโค้ดจริง ([spacedRepetition.ts](file:///Users/pat/Project/tranly-free-version/tranly/app/_lib/utils/spacedRepetition.ts) และ [wordStatusDerivation.ts](file:///Users/pat/Project/tranly-free-version/tranly/app/_lib/utils/wordStatusDerivation.ts)) โดยสรุปกระบวนการดังนี้:

#### 1. การเพิ่มคำศัพท์ครั้งแรก (Initial State)
* เมื่อกดเก็บบันทึกคำศัพท์ ระบบจะสร้างเรคคอร์ดความก้าวหน้าเริ่มต้น (ฟังก์ชัน `createInitialProgress`) โดยกำหนดค่า:
  * `repetitions = 0` (จำนวนครั้งทบทวนสำเร็จสะสม)
  * `box = 1` (กล่องระดับที่ 1)
  * `interval = 1` (ระยะเวลาทบทวนถัดไปเป็น 1 วัน)
  * `easeFactor = 2.5` (ตัวคูณความง่ายเริ่มต้น)
  * `nextReviewAt = now + 1 วัน` (24 ชั่วโมงถัดไป)
* **สีสถานะช่วงเริ่มต้น:** ตราบใดที่ `nextReviewAt > now` ฟังก์ชัน `deriveWordStatus` จะประเมินผลเป็นสถานะ **สีเขียว (`known` - รู้แล้ว)**
* **การเปลี่ยนเป็นสีเหลืองครั้งแรก:** เมื่อเวลาผ่านไปครบ 1 วัน (24 ชั่วโมง) จนทำให้เงื่อนไข `nextReviewAt <= now` เป็นจริง คำศัพท์คำนี้จะถูกดึงเข้าเกม และสถานะจะกลายเป็น **สีเหลือง (`needs_review` - ต้องทบทวน)** โดยอัตโนมัติ

#### 2. ระบบการให้คะแนนทบทวน (Quality Score 0-5)
หลังจากการเล่นมินิเกม (จับคู่ พิมพ์คำแปล หรือพูดออกเสียง) ผู้เรียนจะประเมินคะแนนคุณภาพการระลึกความจำของตัวเองจาก `0 ถึง 5` คะแนน:
* **ผ่าน (Pass) คะแนนระดับ 3–5:**
  * **5 (Perfect response):** นึกออกสมบูรณ์แบบทันทีโดยไม่ต้องลังเล
  * **4 (Correct response after hesitation):** นึกออกถูกต้อง แต่คิดช้าเล็กน้อยหรือลังเล
  * **3 (Correct response but with serious difficulty):** นึกออกถูกต้อง แต่ยากมาก/เกือบจะลืม
* **ตก (Fail) คะแนนระดับ 0–2:**
  * **2 (Incorrect response; correct one seemed easy to recall):** ตอบผิด แต่พอเฉลยแล้วจำได้ทันที
  * **1 (Incorrect response; correct one remembered):** ตอบผิด และพอเห็นเฉลยแล้วรู้สึกคุ้น ๆ แต่จำแทบไม่ได้
  * **0 (Complete blackout):** จำไม่ได้เลยสะกดไม่ออกเลย

#### 3. การคำนวณตัวคูณความง่ายใหม่ (Ease Factor - EF)
ในทุกรอบการทบทวน ค่า `easeFactor` จะถูกอัปเดตใหม่ตามสูตร:
$$\text{Ease Factor}' = \max(1.3, \text{Ease Factor} + (0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02)))$$
* *หมายเหตุ:* ค่า Ease Factor จะถูกจำกัดเพดานขั้นต่ำไว้ที่ **1.3** เสมอ เพื่อไม่ให้ความถี่ถอยเร็วเกินไปเมื่อตอบผิดบ่อย ๆ

#### 4. สูตรกำหนดวันส่งทบทวนใหม่ (Interval Calculation)
* **กรณีสอบผ่าน (q >= 3):**
  * ขยายจำนวนครั้งการจำสำเร็จ `repetitions = repetitions + 1` และขยับระดับกล่องขึ้น `box = box + 1`
  * คำนวณช่วงเวลาห่างของการทบทวนรอบถัดไป (`interval`) ในหน่วยวันดังนี้:
    * **ทบทวนผ่านครั้งที่ 1 (repetitions == 1):** `interval = 1` วัน (คำกลับเป็น **สีเขียว** อยู่ได้ 1 วัน แล้วจึงเปลี่ยนเป็นสีเหลืองอีกครั้ง)
    * **ทบทวนผ่านครั้งที่ 2 (repetitions == 2):** `interval = 6` วัน (คำกลับเป็น **สีเขียว** อยู่ได้ 6 วัน แล้วจึงเปลี่ยนเป็นสีเหลืองอีกครั้ง)
    * **ทบทวนผ่านครั้งที่ 3 ขึ้นไป (repetitions >= 3):** `interval = Math.round(previous\_interval * newEaseFactor)` วัน (เช่น 6 วัน $\times$ 2.5 = 15 วัน)
* **กรณีสอบตก (q < 3):**
  * ล้างค่าสถิติทั้งหมดกลับสู่จุดเริ่มต้น: `repetitions = 0`, `box = 1`, `interval = 1`
  * คำนวณค่า Ease Factor ใหม่ (ซึ่งจะลดลงตามสูตร)
  * ตั้งค่า `nextReviewAt = now + 1 วัน` (คำศัพท์จะกลับเป็น **สีเขียว** มีสถานะเสมือนพักทบทวนเป็นเวลา 1 วัน เพื่อเตรียมเปลี่ยนกลับมาเป็น **สีเหลือง** ให้ทบทวนซ้ำอีกครั้งในวันถัดไปทันที)

#### 5. ตารางจำลองช่วงเวลาทบทวน (Pass Simulation ที่ Ease Factor = 2.5)

| ลำดับการทบทวน | สภาพการเล่นและคะแนนโหวต | ระยะเวลาห่าง (Interval) | สถานะภาพสีที่แสดง |
| :---: | :--- | :---: | :--- |
| **รอบเริ่มต้น** | บันทึกศัพท์ลงคลังครั้งแรก | 1 วัน | 🟢 สีเขียว (อยู่ได้ 1 วัน จนกลายเป็นสีเหลือง 🟡) |
| **รอบที่ 1** | ทบทวนและผ่าน (โหวต $\ge$ 3) | 1 วัน | 🟢 สีเขียว (อยู่ได้ 1 วัน จนกลายเป็นสีเหลือง 🟡) |
| **รอบที่ 2** | ทบทวนและผ่าน (โหวต $\ge$ 3) | 6 วัน | 🟢 สีเขียว (อยู่ได้ 6 วัน จนกลายเป็นสีเหลือง 🟡) |
| **รอบที่ 3** | ทบทวนและผ่าน (โหวต $\ge$ 3) | 15 วัน (6 $\times$ 2.5) | 🟢 สีเขียว (อยู่ได้ 15 วัน จนกลายเป็นสีเหลือง 🟡) |
| **รอบที่ 4** | ทบทวนและผ่าน (โหวต $\ge$ 3) | 38 วัน (15 $\times$ 2.5) | 🟢 สีเขียว (อยู่ได้ 38 วัน จนกลายเป็นสีเหลือง 🟡) |

*หากสอบตก (โหวต 0, 1, 2) ณ รอบใดก็ตาม สิทธิ์ช่วงเวลาทบทวนจะถูกรีเซ็ตกลับไปที่รอบที่ 1 ทันที (เป็นสีเขียว 1 วันแล้วกลับมาเป็นสีเหลือง)*

---

## 7. อัปเกรด Premium (P-08)

```mermaid
sequenceDiagram
    autonumber
    actor U as 👤 ผู้เรียน
    participant FE as Next.js Client
    participant CO as POST /api/stripe/<br/>create-checkout-session
    participant WH as POST /api/stripe/webhook
    participant ST as 💳 Stripe
    participant SB as 🗄️ Supabase

    U->>FE: กดอัปเกรด
    FE->>CO: (session user)
    CO->>ST: create Checkout Session
    ST-->>CO: { url }
    CO-->>FE: url
    FE-->>U: redirect → Stripe Hosted Checkout
    U->>ST: ชำระเงิน
    ST->>WH: checkout.session.completed (signed)
    WH->>WH: verify signature
    WH->>SB: status='active', energy=premium_budget,<br/>stripe_customer_id
    Note over U,SB: ยกเลิกภายหลัง
    ST->>WH: customer.subscription.deleted
    WH->>SB: status='free', reset energy
```

---

## 8. ลบบัญชีถาวร (PDPA, P-09)

```mermaid
sequenceDiagram
    autonumber
    actor U as 👤 ผู้เรียน
    participant FE as Settings
    participant DEL as POST /api/account/delete
    participant SB as 🗄️ Supabase<br/>(service-role)

    U->>FE: ยืนยันลบบัญชี
    FE->>DEL: (session user)
    DEL->>SB: verify session
    DEL->>SB: delete rows ทุกตาราง
    DEL->>SB: adminDeleteUser(userId)
    DEL-->>FE: 200 {}
    FE-->>U: ออกจากระบบ
```
