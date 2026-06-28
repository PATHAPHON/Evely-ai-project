# Tarnly — สถาปัตยกรรมฝั่งหน้าบ้าน (Frontend Architecture)

> สรุปโครงสร้าง frontend จริงในโค้ด (Next.js App Router) ณ 2026-06-28

---

## 1. Tech Stack จริง

| ด้าน | เครื่องมือ |
| :--- | :--- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 4; dark mode class-based |
| UI Icons | Lucide React (`lucide-react`) |
| State | React Context (ไม่มี Redux/Zustand) |
| Data/Auth | Supabase (auth + Postgres) ผ่าน `@supabase/ssr` |
| Font | Outfit (หลัก), Noto Sans Thai (ไทย), Geist Mono (mono) |

---

## 2. โครงสร้างไฟล์

```
app/
├─ layout.tsx
├─ page.tsx                    # splash → redirect
├─ globals.css
├─ _components/                # ใช้ร่วมทั้งแอป
│  ├─ GeminiLayout.tsx         # shell: bottom nav + drawer
│  ├─ WordRenderer.tsx         # render text เป็น clickable words
│  ├─ WordDetailPopup.tsx      # popup รายละเอียดคำ (แทน /word-detail page)
│  ├─ AdSlot.tsx               # Google AdSense placeholder
│  └─ Toast.tsx
├─ _lib/                       # shared logic
│  ├─ contexts/
│  ├─ hooks/
│  │  ├─ useWordBank.ts        # CRUD + status คำศัพท์
│  │  ├─ useWordStorage.ts     # Supabase CRUD words
│  │  ├─ useUserProfile.ts     # profile sync
│  │  └─ useBudgetExhausted.ts # ตรวจ daily budget หมด
│  ├─ types/
│  ├─ utils/
│  │  ├─ wordBankRow.ts
│  │  ├─ wordStatusDerivation.ts
│  │  ├─ wordTokenizer.ts
│  │  ├─ strings.ts            # i18n strings (Thai UI)
│  │  ├─ relativeTime.ts
│  │  ├─ randomId.ts
│  │  └─ translateToThai.ts    # client helper → /api/translate
│  └─ supabase/
├─ api/                        # server route handlers
├─ auth/                       # login / register / reset / update-password
├─ chat/
│  ├─ [id]/                    # dynamic route per conversation
│  │  └─ page.tsx              # โหลด ChatScreen ด้วย session id
│  └─ _components/
│     ├─ ChatScreen.tsx        # main chat UI (แยกออกมาจาก page)
│     ├─ AIMessage.tsx
│     ├─ UserMessage.tsx
│     ├─ ChatInput.tsx
│     ├─ ChatList.tsx
│     ├─ SuggestionOptions.tsx # reply suggestions (Premium)
│     ├─ ElephantMascot.tsx
│     └─ VoiceMode.tsx         # hands-free voice conversation
├─ new/                        # create new conversation → redirect chat/[id]
├─ recents/                    # รายการบทสนทนาเก่า (search/sort/delete)
├─ words/                      # word bank
├─ refresh/                    # mini-game SM-2
├─ profile/
│  ├─ page.tsx                 # iOS-style settings menu
│  ├─ billing/                 # Stripe subscription info
│  └─ _components/
│     ├─ AccountCard.tsx
│     ├─ SettingsList.tsx
│     └─ SlothMascot.tsx
├─ privacy/                    # PDPA privacy page
└─ terms/                      # ToS page
middleware.ts
```

---

## 3. โครงสร้าง Route

| Route | ทำอะไร | สถานะ |
| :--- | :--- | :---: |
| `/` | splash → เช็ค auth → redirect `/chat/[id]` หรือ `/auth` | ✅ |
| `/auth` | login / register (email, Google); ไม่มี guest | ✅ |
| `/auth/reset` | ขอ reset password ทางอีเมล | ✅ |
| `/auth/update-password` | ตั้งรหัสผ่านใหม่จากลิงก์อีเมล | ✅ |
| `/new` | สร้าง session ใหม่ → redirect `/chat/[id]` | ✅ |
| `/chat/[id]` | หน้าแชต AI หลัก (Voice Mode) | ✅ |
| `/recents` | รายการบทสนทนาเก่า (search/sort/delete) | ✅ |
| `/words` | คลังคำศัพท์ + สถานะ SM-2 | ✅ |
| `/refresh` | mini-game hub (SM-2, 4 เกม) | 🟡 |
| `/profile` | settings iOS-style | ✅ |
| `/profile/billing` | Stripe subscription + upgrade | ✅ |
| `/privacy` | นโยบายความเป็นส่วนตัว (PDPA) | ✅ |
| `/terms` | ข้อตกลงการใช้งาน | ✅ |

**ลบออก:** `/word-detail` (ย้ายเป็น `WordDetailPopup` inline), `/gem`

---

## 4. คอมโพเนนต์แกนหลัก

### `GeminiLayout.tsx`
Shell หน้าจอ: bottom navigation bar (Chat / Words / Refresh / Profile), drawer ซ้ายสำหรับรายการแชต, ปุ่มสร้างแชตใหม่

### `WordRenderer.tsx`
Render ข้อความอังกฤษเป็น token คลิกได้ ลงสีตามสถานะ (unknown/known/needs_review); แตะ → `WordDetailPopup`

### `WordDetailPopup.tsx`
Popup inline แสดง IPA, ประเภทคำ, คำแปลไทย, ปุ่มบันทึกลงคลัง — แทน `/word-detail` page เดิม

### `VoiceMode.tsx`
โหมดสนทนาด้วยเสียง hands-free: อัดเสียง (หยุดเมื่อเงียบ 1.5s / สูงสุด 20s) → `/api/stt` (Whisper) → chat flow → TTS → วนต่อ; แสดงสถานะ กำลังฟัง/กำลังคิด/กำลังพูด

### `AdSlot.tsx`
Google AdSense slot — render กล่องเปล่า (free only); เสียบ client ID จริงหลัง Google approve

---

## 5. Data Layer ฝั่ง client (`app/_lib/`)

| ไฟล์ | หน้าที่ |
| :--- | :--- |
| `hooks/useWordBank.ts` | CRUD + status คำศัพท์ (save/remove/review) |
| `hooks/useWordStorage.ts` | Supabase CRUD ตาราง `words` |
| `hooks/useUserProfile.ts` | sync profile (display_name, avatar) ↔ Supabase |
| `hooks/useBudgetExhausted.ts` | ตรวจ daily budget หมด → banner |
| `utils/wordStatusDerivation.ts` | คำนวณสถานะ known/needs_review จาก `next_review_at` |
| `utils/wordBankRow.ts` | map Supabase row → `WordBankEntry` |
| `utils/strings.ts` | Thai UI strings |
| `utils/relativeTime.ts` | แสดงเวลาสัมพัทธ์ภาษาไทย |
| `utils/translateToThai.ts` | helper เรียก `/api/translate` จาก client |

**ลบออก:** `useLanguagePreference`, `ActiveLanguageContext`, `languageDisplay.ts`, `useIllustrationTheme`, `useStudyHeatmap`

---

## 6. เส้นทางข้อมูล: คลิกคำใน chat → เก็บลงคลัง

```
1. ผู้ใช้คลิกคำใน WordRenderer
2. เปิด WordDetailPopup (ดึง IPA/thai/pos จาก /api/word-detail + shared cache)
3. ผู้ใช้กด "บันทึก" → useWordBank.save() → insert words + word_progress
4. WordRenderer อัปเดตสีคำทันที (optimistic)
5. ภายหลัง /refresh → reviewWord() อัปเดต SM-2 → next_review_at ใหม่
```

ชั้นเก็บข้อมูล: **Supabase** (หลัก) · **localStorage** (ธีม) · ไม่มี sessionStorage แล้ว (ตัด word-detail page)

---

## 7. กฎ convention

- logic ใช้ร่วมหลาย route → `app/_lib/{hooks,types,utils}/`
- logic เฉพาะ route → `<route>/_lib/`
- UI เฉพาะ route → `<route>/_components/`
- route ใหม่ = โฟลเดอร์ + `page.tsx`; แตก `_components/` / `_lib/` เมื่อไฟล์เริ่มเยอะ
