# Tarnly — แผนขึ้น Production (Launch Plan)

> roadmap ปั้นจาก core ปัจจุบัน → **production launch แบบ full-monetize** (mobile-only)
> อ้างสถานะปัจจุบันจาก [`project-status.md`](project-status.md) · มาร์คสถานะ: ✅ มีแล้ว · 🟡 มี logic ยังไม่มี UI · 🔵 ยังไม่ทำ
> ตัดสินใจจากรอบ requirement review (ดู §"การตัดสินใจที่ตกลง" ท้ายไฟล์)

---

## Context

core ทำงานแล้ว (auth → chat AI → คลิกคำเก็บคลัง → SM-2 หลังบ้าน) แต่จุดขายและองค์ประกอบ production ยังขาด: เกมทบทวน (`/refresh` = placeholder), payment, premium gating, legal pages, account management (reset รหัส/ลบบัญชี), หน้า profile ยังเป็น stub บางส่วน.

เป้าหมาย: ครบ production launch โดย **reuse logic ที่มีอยู่ให้มากที่สุด** ไม่ทำซ้ำ.

**ข้อจำกัดจริง:** ยังไม่มี legal entity → Stripe รัน **test mode**, AdSense ใส่ **placeholder** (เสียบ client ID จริงทีหลัง), legal pages เว้นช่องข้อมูลบริษัท.

---

## รากฐานที่ต้องทำก่อน (blocker ของทุก premium feature) 🔵

### 0. เพิ่ม `subscription_status` ใน DB + อ่านฝั่ง server
- **Migration:** เพิ่ม columns ใน `profiles`: `subscription_status text default 'free'` (`free`|`active`), `subscription_current_period_end timestamptz`, `stripe_customer_id text`.
- ขยาย `getRequestUser()` (`app/api/_lib/utils/requireUser.ts`) → คืน `{ id, isPremium }` (query `profiles.subscription_status === 'active'`). ใช้ตัวเดียวทุก API route.
- ขยาย `useUserProfile()` (`app/_lib/hooks/useUserProfile.ts`) → expose `subscriptionStatus`, `isPremium`, `periodEnd` (เพิ่มใน select เดิม).
- Premium-aware quota: `DAILY_CHAT_LIMIT` ใน `app/api/chat/route.ts` → 15 (free) / 45 (premium). ส่ง limit ตาม `isPremium` เข้า `consumeChatQuota()`.

---

## Phase A — Auth & Account (production must-have) 🔵

1. **Reset password**
   - `app/auth/reset/page.tsx`: กรอก email → `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
   - `app/auth/update-password/page.tsx`: หลังคลิกลิงก์ใน email → `supabase.auth.updateUser({ password })`.
   - เพิ่มลิงก์ "ลืมรหัสผ่าน?" ในฟอร์ม login (`app/auth/page.tsx`).
2. **ลบบัญชี (PDPA)** — danger zone ใน Edit Profile
   - ต้องใช้ service-role ลบ auth user → `app/api/account/delete/route.ts` (verify session, ลบ rows ของ user แล้ว admin deleteUser). Reuse pattern ลบจาก `useDataReset.ts`.
   - UI: ปุ่มแดงล่างสุดใน `EditProfileSheet` + confirm modal (พิมพ์ยืนยัน).
3. **Map error → ไทย** — `app/auth/_lib/utils/authErrorMessage.ts` map Supabase error → `t.auth.*`. ใช้ใน `useAuthForm.ts` แทนการโยน `err.message` ดิบ.
4. **ตัด guest** — ลบ `handleGuestLogin` + ปุ่ม guest จาก `useAuthForm.ts`/`auth/page.tsx`. ลบ branch `is_anonymous` ใน register/google. ปรับ middleware: root `/` ที่เป็น anon → `/auth` ปกติ.

---

## Phase B — `/refresh` มินิเกมคำศัพท์ (จุดขาย) 🔵

โครง: `app/refresh/page.tsx` = เมนูเลือกเล่น → engine สุ่มเกมต่อคำ → summary.

- **เลือกคำ:** `useWordBank()` → filter `deriveWordStatus(...) === 'needs_review'` (due/เหลือง) เป็นหลัก. due ว่าง → practice mode ด้วยคำ `known` (ไม่เรียก `reviewWord`).
- **flow:** mixed — ต่อ 1 คำ สุ่ม 1 เกมจาก 3 เกม → คำนวณ quality 0-5 → `reviewWord(wordId, quality)` commit ทันที (NFR-08). cap **20 คำ/รอบ**.
- **scoring → SM-2 quality 0-5 จริง** (จาก signal เกม, ไม่ใช่ binary; q≥3 ผ่าน, q<3 reset ตาม `recalculateProgress`):
  - **Matching:** นับครั้งจับผิดต่อคู่ — 0=5 · 1=4 · 2=3 · ≥3=2
  - **Typing:** edit distance (สัดส่วนความยาวคำ) — เป๊ะ=5 · พลาด1=4 · 2=3 · ใกล้ครึ่ง=2 · ว่าง/มั่ว=0
  - **Speak:** นับครั้งพูดผิด (tolerance STT, ลองได้ 2) — ถูกครั้งแรก=5 · ครั้งสอง=3 · ผิดหมด=2 · ไม่มีเสียง=0
  - แยก pure fn ต่อเกมใน `app/refresh/_lib/quality.ts` + unit test
- **3 เกม** (`app/refresh/_components/`):
  - `MatchingGame` — จับคู่ word↔thai (ชุด 4-5 คู่).
  - `TypingGame` — เห็น thai พิมพ์ word ให้ตรง (normalize lowercase + edit distance).
  - `SpeakGame` — `useTTS().speak(word)` + `useSTT()` จับ `transcript` เทียบคำ; `!isSupported` → ข้ามเกมนี้ สุ่มเกมอื่นแทน.
  - *(MultipleChoice ตัดออก — หน้าตาซ้ำกับ Matching)*
  - *(Flashcard ตัดออก — ไม่มี input objective วัด 0-5 ไม่ได้)*
- **card data:** จาก `getEntry(word)` (.thai/.ipa/.partOfSpeech). example → `/api/word-detail` (cache แล้ว, reuse).
- **summary:** จำนวนคำทบทวน + จำนวนกลับเป็นเขียว. เรียก `recordSession('game:refresh:<date>', count)` (`useStudySessions`).
- **AdSense (Phase D)** แสดงบน summary เฉพาะ free.
- **reuse hooks:** `useTTS`, `useSTT`, `useWordBank`, `recalculateProgress`, `useStudySessions` — มีหมดแล้ว.
- **middleware:** เพิ่ม `/refresh` ใน protected prefixes (`middleware.ts`).

---

## Phase C — Premium gating: reply suggestions → Premium only 🔵

- **Server gate** (`app/api/chat/route.ts`): ถ้า `!isPremium` → ตัด instruction เรื่อง `suggestions` ออกจาก system prompt (ไม่ generate = ประหยัด token). ส่ง flag `suggestionsLocked: true` ใน response สำหรับ free.
- **Client** (`app/chat/page.tsx` + `SuggestionOptions.tsx`/`useSuggestionPanel.ts`): free เห็นปุ่ม 🔒 "อัปเกรด Premium เพื่อปลดล็อกตัวเลือกการตอบ" แทนการ์ด → กดไป `/profile` Billing.
- *(vocab Suggestion Panel F-10 = **ไม่ทำ**. translation/reading/romanization premium gating ตาม FR-03/04 — ตรวจว่ามี gate หรือยัง; ถ้ายังไม่มี ใส่ที่ parser/route เดียวกัน)*

---

## Phase D — Monetization: Stripe + AdSense 🔵

### Stripe (test mode + Customer Portal)
- env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PRICE_ID` (167฿/เดือน).
- `app/api/stripe/create-checkout-session/route.ts` — Checkout Session (price + user_id metadata) → คืน URL.
- `app/api/stripe/webhook/route.ts` — verify signature, idempotent. `checkout.session.completed` → `subscription_status='active'` + `stripe_customer_id` + `period_end`; `customer.subscription.deleted` → `'free'` (FR-19).
- `app/api/stripe/portal/route.ts` — Customer Portal session (ยกเลิก/เปลี่ยนบัตร/ใบเสร็จ — ไม่เขียน UI เอง).
- **ไม่ทำ:** sub management UI เอง, tax/VAT (รอ legal entity → live).

### AdSense (placeholder)
- `app/_components/AdSlot.tsx` — รับ `isPremium`; premium → null; free → placeholder box (เสียบ `<ins class="adsbygoogle">` + client ID จริงทีหลัง).
- ใช้บนหน้า summary ของ `/refresh` (FR-18).

---

## Phase E — Profile restructure + Usage + Legal + Infra 🔵

### Profile (iOS-style menu, reuse `SettingsRow`/`Group`)
จัดใหม่ใน `app/profile/page.tsx`:
- **Edit Profile** → `EditProfileSheet` (+ reset รหัส + ลบบัญชี danger zone)
- **Billing** → subscription status + ปุ่มไป Stripe Checkout (free) / Customer Portal (premium)
- **Usage** → AI quota วันนี้ (อ่าน `profiles.energy` / limit ตาม tier, รีเซ็ตเที่ยงคืน) — `useDailyUsage` เล็กๆ หรือ extend `useUserProfile`
- **Dark Mode** → `ThemeToggle` inline (reuse `useTheme`)
- **Log Out**
- **ตัดออก:** General & Learning (ภาษาอยู่ chat/words header แล้ว), Voice, stats/heatmap. ลบ rows + ของที่กลายเป็น orphan ที่ change นี้ทำให้ไม่ถูกใช้ (เช่น `LanguageSelector` ใน profile, `useLearningStats`/`useStudyHeatmap` — เช็คก่อนลบ).

### Legal
- `app/terms/page.tsx`, `app/privacy/page.tsx` — เนื้อ PDPA มาตรฐาน เว้น `[ชื่อ/ที่อยู่/ติดต่อ]`. ลิงก์จาก profile/footer.
- checkbox "ยอมรับ ToS/Privacy" ในฟอร์ม register (`auth/page.tsx`) — required.

### Infra
- **pg_cron** (Supabase): job ลบ `conversation_messages` เก่ากว่า 3 วัน (NFR-11). เขียนเป็น migration SQL.

---

## ลำดับแนะนำ

`0 (DB+subscription)` → `A (auth/account)` → `B (/refresh เกม)` → `C (gating)` → `D (Stripe/AdSense)` → `E (profile/legal/infra)`.
B ทำคู่ขนานได้ เพราะไม่พึ่ง premium.

---

## Verification

- **DB/subscription:** สมัคร → `subscription_status='free'`; `stripe trigger checkout.session.completed` → `'active'`; quota free=15/premium=45 (เช็ค 429 ตอนเกิน).
- **Auth:** reset password ครบ loop; ลบบัญชี → row หาย + login ไม่ได้; error ไทยตอน login ผิด; ไม่มีปุ่ม guest.
- **`/refresh`:** unit test scoring→quality + `recalculateProgress` (มี `spacedRepetition.test.ts`). E2E: คำ due → เล่นแต่ละเกม → ผ่าน → เปลี่ยนเขียว + `word_progress.next_review_at` อัปเดต; due ว่าง → practice mode ไม่แตะ progress; summary นับถูก.
- **Gating:** free เห็น 🔒 (ไม่เห็นการ์ด), API ไม่ generate suggestions ให้ free; premium เห็นครบ.
- **Stripe:** test card `4242...` → premium; Customer Portal เปิดได้; cancel → webhook → free สิ้นรอบ.
- **AdSense:** free เห็น placeholder บน summary, premium ไม่เห็น.
- **Profile:** เมนู 5 แถวตามดีไซน์; Usage โชว์ quota จริง; Dark Mode toggle ทำงาน; build ไม่มี import orphan.
- **Infra:** รัน pg_cron job มือ → chat >3 วันหาย.
- รวม: `npm run build`, `npm test`, lint ผ่าน.

---

## ไม่ทำ (ตัดออกจาก scope launch)

vocab Suggestion Panel (F-10), guest mode, Voice/TTS-speed setting, stats/heatmap ใน profile, Stripe live + VAT, sub management UI เอง, การเลือกเสียง TTS.

---

## การตัดสินใจที่ตกลง (จาก requirement review)

| หัวข้อ | สรุป |
| :--- | :--- |
| เป้าหมาย | production จริง, full monetize, mobile-only |
| Auth | เก็บ email/Google เดิม + reset password + ลบบัญชี (PDPA) + map error ไทย |
| Guest | **ตัดทิ้ง** (ทุกคนต้องสมัคร, ลดขยะ row + คุม budget) |
| Stripe | test mode ก่อน + Customer Portal (สลับ live เมื่อมี legal entity + VAT) |
| AdSense | placeholder + gating (เสียบ client ID จริงทีหลัง) |
| Legal | `/terms` `/privacy` โครง PDPA เว้นช่อง entity + consent checkbox ตอนสมัคร |
| `/refresh` | 3 มินิเกม (matching/typing/speak — ตัด multiple-choice + flashcard), สุ่มต่อคำ, due หลัก + practice mode, cap 20, **quality 0-5 จริงจาก signal เกม** (ไม่ใช่ binary) |
| Profile | เมนู iOS-style: Edit Profile / Billing / Usage / Dark Mode / Log Out. ตัด General&Learning, Voice, stats/heatmap |
| Chat | reply suggestions → Premium (gate ที่ API, free เห็น 🔒); vocab panel F-10 ตัดทิ้ง |
| Infra | pg_cron ลบ chat >3 วัน |
