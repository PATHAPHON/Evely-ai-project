# Tarnly — API Specification

> สเปก request/response ของ Next.js API Routes จริง (`app/api/`) ณ 2026-06-28
> ทุก route เป็น POST, เนื้อหา JSON (ยกเว้น TTS คืน MP3, STT รับ JSON ส่ง audio base64)

---

## ข้อกำหนดร่วม

- **Auth:** Supabase session cookie. ทุก route เรียก `getRequestUser()` → 401 ถ้าไม่ผ่าน
- **Error format:** `{ "error": { "type": string, "message": string } }` หรือ `{ "error": string }`
- **maxDuration:** `/api/chat` = 60s, `/api/grammar` = 60s, `/api/stt` = 60s

---

## Data Layer

ไม่มี Axios/wrapper. 2 ช่องทาง:
1. **AI features** → `fetch /api/*` (native, relative path)
2. **User data** → Supabase client ตรง (RLS)

Auth: Supabase session cookie อัตโนมัติ — ไม่มี Bearer header  
Middleware: refresh token + guard protected routes → `/auth?redirect=`  
ไม่มี global error interceptor — แต่ละ call site จัดการ error เอง

---

## `POST /api/chat` ✅

แชต AI — OpenRouter Llama 3.1, system prompt English, ประวัติทั้งหมด (unlimited)

**Request**
```jsonc
{
  "messages": [{ "role": "user|assistant", "content": "string" }],
  "language": "english"
}
```

**Response** — `text/plain` (JSON string). parse ด้วย `parseChatResponse.ts`
```jsonc
{
  "sentences":    ["string"],   // ประโยคอังกฤษ AI
  "readings":     ["string"],   // คำอ่านภาษาไทย (premium)
  "translations": ["string"],   // แปลไทย (premium)
  "suggestions":  ["string"]    // reply suggestions (premium เท่านั้น; free = [] + suggestionsLocked: true)
}
```

**Budget:** `checkBudget` → `debitBudget` (microbaht) ฝั่ง server; หมด → `429`

---

## `POST /api/grammar` ✅

ตรวจ grammar + แปลไทยของข้อความผู้ใช้ (parallel กับ chat, DeepSeek, reasoning off)

**Request**
```jsonc
{ "text": "string" }
```

**Response**
```jsonc
{
  "englishText":    "string",   // ข้อความที่แก้แล้ว
  "grammarCorrect": true,       // ไม่มีข้อผิดพลาด
  "grammarNotes":   "string",   // คำแนะนำภาษาไทย (ทุก user)
  "translation":    "string"    // คำแปลไทย (ทุก user ผ่าน route นี้)
}
```

> client ควบคุมการ**แสดง** translation ด้วย `useShowTranslation` (Premium toggle)  
> budget: นับรวมใน daily budget ของผู้ใช้

---

## `POST /api/translate` ✅

แปล English→Thai (ใช้โดย `translateToThai.ts` helper)

**Request**
```jsonc
{ "text": "string" }
```

**Response**
```jsonc
{ "translation": "string" }
```

---

## `POST /api/word-detail` ✅

รายละเอียดคำ + shared permanent cache ใน `ai_word_detail_cache` (write non-blocking ด้วย `after()`)

**Request**
```jsonc
{ "word": "string", "context": "string?" }
```

**Response**
```jsonc
{
  "word": "string", "ipa": "string", "thai": "string",
  "partOfSpeech": "string",
  "context": "string", "examples": ["string"], "grammar": "string"
}
```

Flow: เช็ค cache → miss → KKU DeepSeek → คืนผล + เขียน cache เบื้องหลัง

---

## `POST /api/stt` ✅

ถอดเสียงพูดเป็นข้อความ (OpenRouter Whisper `whisper-large-v3`)

**Request**
```jsonc
{ "audio": "base64string", "format": "webm" }
```

**Response**
```jsonc
{ "text": "string" }
```

ใช้จาก: ปุ่มไมค์ใน ChatInput + Voice Mode (`VoiceMode.tsx`)

---

## `POST /api/tts` ✅

สังเคราะห์เสียง MP3 (Kokoro 82M (OpenRouter)), in-memory cache max 500

**Request**
```jsonc
{ "text": "string", "voice": "en-US-Standard-A?", "speed": 1.0 }
```

**Response** — `audio/mpeg` (binary MP3)  
**`503`** ถ้าไม่มี `OPENROUTER_API_KEY` → client fallback Web Speech API

---

## `POST /api/stripe/create-checkout-session` ✅ (test mode)

สร้าง Stripe Checkout Session

**Request:** (ไม่มี body — ใช้ session user)  
**Response**
```jsonc
{ "url": "string" }  // Stripe Hosted Checkout URL
```

---

## `POST /api/stripe/portal` ✅

เปิด Stripe Customer Portal (ยกเลิก/เปลี่ยนบัตร/ดูใบเสร็จ)

**Request:** (ไม่มี body)  
**Response**
```jsonc
{ "url": "string" }  // Stripe Customer Portal URL
```

---

## `POST /api/stripe/webhook` ✅

รับ Stripe webhook (verify signature)

Events ที่จัดการ:
- `checkout.session.completed` → `subscription_status='active'`, `energy=premium_budget`, `stripe_customer_id`
- `customer.subscription.deleted` → `subscription_status='free'`, reset `energy`

---

## `POST /api/account/delete` ✅

ลบบัญชีถาวร (PDPA) — ใช้ service-role key

**Request:** (ไม่มี body — ใช้ session user)  
**Response:** `200 {}` หรือ `401`

Flow: verify session → delete rows ทุกตาราง → `adminDeleteUser(userId)`

---

## Error Codes

| HTTP | เงื่อนไข | Route |
| :---: | :--- | :--- |
| `400` | body ผิดรูปแบบ / field หาย | ทุก route |
| `401` | ไม่มี session / หมดอายุ | ทุก route |
| `429` | daily budget หมด (microbaht) | `/api/chat`, `/api/grammar` |
| `500` | LLM/TTS timeout หรือ parse error | AI routes |
| `503` | ไม่มี `OPENROUTER_API_KEY` | `/api/tts` → client fallback |
