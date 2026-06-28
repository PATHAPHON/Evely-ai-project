# Tarnly — สถานะความคืบหน้าโครงงาน (Project Status)

> อัปเดตจากการสำรวจโค้ดจริง + git diff ณ 2026-06-28

---

## 1. ภาพรวมหนึ่งบรรทัด

**core ครบ + premium gate ครบ + Stripe wired** (auth → multi-session chat → grammar/translate → word bank → SM-2 → mini-games `/refresh` → billing). เหลืองาน polish + ต่อ AdSense จริง + live Stripe mode

---

## 2. ตารางสถานะตามฟังก์ชันหลัก

| รหัส | โมดูล | สถานะ | หมายเหตุ |
| :---: | :--- | :---: | :--- |
| **F-01a** | สมัครสมาชิก (email) | ✅ | `useAuthForm`, checkbox ToS/Privacy, verify email |
| **F-01b** | Login / Session | ✅ | Supabase JWT cookie, `useUserProfile` |
| **F-01c** | Reset password + Delete account | ✅ | `auth/reset/`, `auth/update-password/`, `/api/account/delete` (service-role) |
| **F-02** | AI Chat (JSON, multi-session) | ✅ | OpenRouter Llama 3.1, dynamic route `chat/[id]/`, `/recents`, `/new` |
| **F-03** | Grammar + Translation | ✅ | `/api/grammar` (DeepSeek, parallel) · คำแปลเปิด/ปิดด้วย `useShowTranslation` |
| **F-04** | Reply Suggestions (Premium gate) | ✅ | server gate — free ไม่ generate; client แสดง 🔒 |
| **F-05** | Word tokenization + save | ✅ | `WordRenderer` คลิกคำ → `WordDetailPopup` (inline popup แทน `/word-detail` page) |
| **F-06** | Mini-game hub `/refresh` (SM-2) | 🟡 | logic + 4 เกม connect แล้ว แต่ยังต้องตรวจสอบ Speak (STT) |
| **F-07** | Settings / Profile | ✅ | iOS-style menu: Edit Profile, Billing, Usage, Dark Mode, Logout |
| **F-08** | Stripe Checkout + Webhook | ✅ (test mode) | `/api/stripe/`, webhook verify signature, อัปเดต `profiles.subscription_status` |
| **F-09** | AdSense placeholder | ✅ | `AdSlot.tsx` render กล่องเปล่า (free only) |
| **F-10** | Voice Mode (hands-free) | ✅ | `VoiceMode.tsx`: บันทึกเสียง → `/api/stt` (Whisper) → chat → TTS วนต่อ |

---

## 3. งานที่เหลือ

1. **ทดสอบ Speak game** — ตรวจว่า STT ใน `/refresh` ทำงานครบทุก browser
2. **AdSense live** — เสียบ client ID จริงหลัง Google approve
3. **Stripe live mode** — รอ legal entity + VAT registered
4. **DB cleanup** — drop orphan tables/columns (ดูข้อ 4)

---

## 4. หนี้ DB (orphan จาก feature ที่ถอดออก)

| สิ่งที่ค้าง | สาเหตุ | แนะนำ |
| :--- | :--- | :--- |
| ตาราง `captures` | OCR/scan ถูกถอด | drop |
| ตาราง `study_sessions` | อ้าง `flashcard_set_id` ที่ไม่มีตารางรองรับ | redesign หรือ drop |
| `conversations.proficiency_level` | ลบออกจากโค้ดแล้ว | drop column |
| `rejected_words.image_url` | image feature ถูกถอด | drop column |
| `ai_word_detail_cache.expires_at` | cache เป็น permanent แล้ว (โค้ดไม่เซต/กรอง expires_at) | drop column ได้ทีหลัง |

> ทำผ่าน `apply_migration` — อย่าแก้มือบน prod

---

## 5. ข้อมูลจริงจาก Supabase (ณ 2026-06-22)

`words` 50 · `word_progress` 24 · `conversations` 29 · `conversation_messages` 226 · `ai_word_detail_cache` 74 · `study_sessions` 0 · `profiles` 2
