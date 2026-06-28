# Tarnly — การ Deploy, Caching, Performance และการ Scale ถึง 10,000+ Users

> ท่อนปลายน้ำของ Blueprint: จาก "โค้ดรันได้บนเครื่อง" → "ขึ้น production จริง รองรับผู้ใช้หลักหมื่น"
> ใช้คู่กับ `backend-architecture.md`, `frontend-architecture.md`, `project-status.md`
> อิง stack จริง: Next.js 16 (App Router) · Supabase · KKU IntelSphere · Kokoro 82M (OpenRouter)

---

## 1. ภาพรวมโครงสร้างการ Deploy (Hosting Topology)

ระบบเป็น **serverless** ล้วน — ไม่มีเซิร์ฟเวอร์ stateful ให้ดูแลเอง

```
                         ┌──────────────────────────┐
   ผู้ใช้ (Browser) ─────►│  Vercel Edge / CDN        │  static assets, SSR, RSC
                         │  (Next.js 16 App Router)  │
                         └──────┬──────────┬─────────┘
                                │          │
                  fetch /api/*  │          │  Supabase JS (จาก client ตรง)
                                ▼          ▼
                   ┌────────────────┐   ┌──────────────────────────┐
                   │ Next API Route │   │ Supabase                 │
                   │ (Serverless Fn)│   │  ├─ Auth (JWT)           │
                   └───┬────────┬───┘   │  ├─ Postgres 17 (+RLS)   │
                       │        │       │  └─ Storage (TTS/avatar) │
              KKU LLM ◄┘        └► Kokoro 82M (OpenRouter)                │
        gen.ai.kku.ac.th                └──────────────────────────┘
```

**ทำไมเลือก Vercel + Supabase:** code เป็น Next.js อยู่แล้ว → Vercel deploy ตรง zero-config, CDN/Edge แถมฟรี. Supabase เป็น auth+DB อยู่แล้ว → ไม่ต้องย้าย. ทั้งคู่ scale แนวนอนอัตโนมัติ ไม่ต้องจัดการ server เอง

> ทางเลือกอื่นถ้าไม่ใช้ Vercel: Cloudflare Pages, Netlify, หรือ self-host ผ่าน `next start` บน VPS/Docker (ต้องตั้ง CDN + auto-scale เอง — แนะนำเฉพาะถ้ามีเหตุผลด้านต้นทุน/ข้อมูล)

---

## 2. ขั้นตอน Deploy ขึ้น Production (ครั้งแรก)

1. **เตรียม Supabase production project** — แยกจาก dev (`parluohzcoagguyrhgdo` คือตัวที่ใช้อยู่; ทำ project ใหม่สำหรับ prod หรือยืนยันว่าตัวนี้คือ prod)
   - รัน migration ทั้งหมดผ่าน `supabase db push` / `apply_migration` (อย่าแก้มือ)
   - ยืนยันทุกตารางเปิด **RLS** และมี policy ครบ (ดู §7)
2. **ตั้ง Environment Variables บน Vercel** (Production scope) — ดูตารางใน `backend-architecture.md` §4:
   - `KKU_API_KEY` ✅ · `NEXT_PUBLIC_SUPABASE_URL` ✅ · `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
   - `OPENROUTER_API_KEY` / `OPENROUTER_TTS_VOICE` ⬜ (ไม่มีก็ fallback Web Speech)
   - ลบ `PEXELS_API_KEY` ทิ้ง (ไม่ใช้แล้ว)
   - ⚠️ ห้ามใส่ secret ที่ไม่มี prefix `NEXT_PUBLIC_` ไว้ฝั่ง client — มันรั่วไป browser
3. **เชื่อม Git → Vercel** — push `main` = deploy prod, push branch/PR = preview URL อัตโนมัติ
4. **ตั้ง custom domain** + บังคับ HTTPS (Vercel ออก cert ให้)
5. **ตั้ง Supabase Auth redirect URLs** ให้ตรง production domain (ไม่งั้น Google OAuth / magic link พัง)
6. **Smoke test บน production**: สมัคร → แชตสนทนา → คลิกคำ → เล่นเสียง → reset

**CI/CD:** Vercel build ทุก push อยู่แล้ว. เพิ่มเช็คก่อน merge ผ่าน GitHub Actions / Vercel:
`npm run lint` + `npm test` (มี test ใน `app/_lib/__tests__/`) + `next build`. แค่นี้พอ — อย่าเพิ่ง over-engineer pipeline

---

## 3. กลยุทธ์ Caching (รวมศูนย์ — ของที่มี + ที่ต้องเพิ่ม)

แบ่งตามชั้น (ใกล้ผู้ใช้ที่สุด → แพงที่สุด):

| ชั้น | cache อะไร | สถานะตอนนี้ | สิ่งที่ต้องทำเพื่อ scale |
| :--- | :--- | :--- | :--- |
| **CDN (Vercel Edge)** | static assets, JS/CSS bundle, รูป | อัตโนมัติ | ตั้ง `Cache-Control` immutable ให้ asset hash แล้ว (Next ทำให้) |
| **Browser** | คลังคำ (SWR ใน `/words`), localStorage (ภาษา/ธีม/energy), **รายละเอียดคำ (word-detail)** | ✅ SWR + localStorage; ⬜ word-detail ยังไม่ cache ฝั่ง browser | เพิ่ม **localStorage cache ของ word-detail** เป็นด่าน 1 (ดู §3.2) |
| **API in-memory** | TTS MP3 (max 500 ใน `/api/tts`) | ✅ มี | ⚠️ **หายตอน cold start** — ดู §3.1 |
| **DB shared cache** | รายละเอียดคำจาก AI (`ai_word_detail_cache`, TTL 30 วัน) | ✅ มี, เขียน non-blocking ด้วย `after()` | **ด่าน 2** — แชร์ข้าม user ทุกคน ลดเรียก LLM ซ้ำมหาศาล (**ห้ามถอด**) |
| **LLM chat** | คำตอบแชต | ❌ ไม่ cache (ถูกต้อง — แชตต้องสด/personal) | คงไว้ไม่ cache |

### 3.1 ปัญหา cold start ของ TTS cache (ต้องแก้ก่อน scale)
in-memory cache ใน serverless function **หายทุกครั้งที่ instance ใหม่ตื่น** → ที่ 10k users จะมีหลาย instance แต่ละตัว cache แยกกัน = miss rate สูง = เรียก Kokoro 82M ถี่ = ช้า+แพง

**ทางแก้ (lazy ก่อน):** ย้าย MP3 cache ไป **Supabase Storage** โดย key = hash(text+voice+speed). flow: เช็ค Storage ก่อน → ไม่มีค่อยเรียก Google → อัปขึ้น Storage. Storage มี CDN ในตัว → ครั้งที่ 2 เสิร์ฟจาก edge ไม่แตะ function เลย
> เสียงคำเดิมซ้ำกันเยอะมาก (IPA/ตัวอย่างประโยค) → hit rate จะสูงมากหลังอุ่นเครื่อง

### 3.2 word-detail cache 3 ชั้น (เพิ่ม localStorage เป็นด่าน 1)
ของแพงคือ **การเรียก LLM** ไม่ใช่การ "ดึงค่า" → browser cache กับ DB cache **คนละหน้าที่** ใช้คู่กันเป็นชั้นๆ ไม่แทนกัน:

| ด่าน | ที่เก็บ | ขอบเขต | ตัดอะไรออก |
| :-: | :--- | :--- | :--- |
| 1 | **localStorage** (เพิ่มใหม่) | คนเดียว/เครื่องเดียว | ไม่แตะเน็ตเลย — เร็วสุด |
| 2 | `ai_word_detail_cache` (DB) | **แชร์ทุก user** | ไม่แตะ LLM — คุมบิล/quota KKU |
| 3 | KKU LLM | — | จ่ายจริง (เกิดครั้งแรกของคำนั้นทั้งระบบ) |

**flow ที่ `WordRenderer`/word-detail ควรเป็น:**
```
อ่าน localStorage[word]  → เจอ? คืนเลย
   miss → POST /api/word-detail  (route เช็ค ai_word_detail_cache → LLM ถ้า miss)
        → ได้ผล → เขียนกลับ localStorage[word] (เป็น JSON, อาจตั้ง TTL/เวอร์ชัน key)
```
> ทำไมต้องมีทั้งคู่: localStorage ช่วยแค่ "ตัวเองเปิดซ้ำ" (เกิดไม่บ่อย) แต่ DB cache ช่วย "ทั้งชุมชนเปิดคำเดียวกัน" (เกิดตลอด). ที่ 10k users คำพื้นฐานทับกันหนัก → ถ้าถอด DB cache จะยิง LLM นับหมื่นครั้งเปล่าๆ
> lazy: localStorage cache = เพิ่มไม่กี่บรรทัด, ฟรี, ไม่มี dependency. ระวังแค่ขนาด localStorage (~5MB) — ถ้าคำเยอะมากค่อยใส่ LRU/จำกัดจำนวน key

### 3.3 เพิ่ม cache ระดับ DB query (ถ้าจำเป็นตอนโตจริง)
ถ้า read หนัก (เช่นคำศัพท์ระบบที่ทุกคนเห็นเหมือนกัน) → cache ด้วย Next.js `unstable_cache` / `revalidate` แทนยิง Supabase ทุก request
> ponytail: ยังไม่ต้องทำตอนนี้ — เพิ่มเมื่อ Supabase dashboard โชว์ query ตัวนี้ร้อนจริง

---

## 4. Performance (ทำให้ "ลื่น")

### Frontend
- **การตอบสนองของแชต** — เปลี่ยนเป็น JSON REST Response ที่ได้รับคำตอบทั้งก้อนแทนการสตรีมคำ เพื่อความเสถียรและเรียบง่ายของระบบ ✅
- **Lazy-load ข้อความยาว** — `WordRenderer` มี lazy >500 คำแล้ว ✅
- **Code splitting** — Next App Router แยก bundle ต่อ route ให้อัตโนมัติ; ใช้ `next/dynamic` กับของหนักที่ไม่ได้เห็นทันที (เช่น 3D flip card ใน `/refresh`)
- **antd bundle** — antd 6 ใหญ่; ใช้ tree-shaking import เฉพาะที่ใช้ อย่า import ทั้งก้อน
- **รูป avatar** — เสิร์ฟผ่าน `next/image` + Supabase Storage CDN (อย่าโหลดรูปดิบ)
- เป้า: LCP < 2.5s, แชตตอบ token แรก < 1s

### API / Backend
- **ประวัติบทสนทนาแบบไม่จำกัด** — ส่งประวัติทั้งหมด (unlimited) เพื่อให้ AI จดจำความบริบทได้ตลอดเซสชัน ✅
- **`after()` เขียน cache แบบ non-blocking** — มีแล้วใน `/api/word-detail` ✅ (ไม่หน่วง response)
- **Region** — ตั้ง Vercel function region ให้ใกล้ Supabase + KKU (เอเชีย เช่น `sin1`/Singapore) ลด latency ข้าม region
- **Connection pooling** — สำคัญสุดตอน scale, ดู §5.1

---

## 5. การ Scale ถึง 10,000+ Users

แต่ละชิ้นของ stack scale ไม่เท่ากัน — ตัวที่จะพังก่อนคือ **DB connections** กับ **LLM throughput/cost** ไม่ใช่ frontend

### 5.1 Supabase / Postgres — คอขวดอันดับ 1
- **Connection pooling เป็นเรื่องคอขวด:** serverless function แต่ละ invocation เปิด connection ใหม่ → Postgres มี limit (free ~60). ที่ 10k users **ต้องต่อผ่าน Supavisor pooler (transaction mode, port 6543)** ไม่ใช่ direct (5432). นี่คือสิ่งที่ทำให้ระบบล่มถ้าลืม
- **อัป Supabase Pro** ($25/mo) — เพิ่ม compute, connection limit, daily backup, ไม่ pause
- **Index:** เพิ่ม index คอลัมน์ที่ query บ่อย — `words.user_id`, `word_progress(user_id, next_review_at)` (query เกมแฟลชการ์ด!), `conversations.user_id`, `conversation_messages.session_id`, `ai_word_detail_cache.cache_key` (unique อยู่แล้ว)
- **RLS = ทุก query มี `user_id = auth.uid()`** → index `user_id` ช่วยทั้ง performance และความถูกต้อง
- **เก็บกวาด orphan** (ดู `project-status.md` §4) ก่อน scale — ตาราง/คอลัมน์ตายทำ backup/migration ช้าเปล่าๆ

### 5.2 LLM (KKU IntelSphere) — คอขวด + ต้นทุนอันดับ 2
- ทุกข้อความแชต + translate + word-detail = 1 เรียก LLM. ที่ 10k users active นี่คือก้อนค่าใช้จ่าย+rate limit หลัก
- **โควต้าแชตรายวัน (server-side)** — `/api/chat` เรียก RPC `consume_chat_quota(15)` หัก `profiles.energy` แบบ atomic, reset เป็น 15 ครั้งแรกของวันใหม่ (`profiles.energy_reset_at`), หมดโควต้าคืน `429`. = rate limiter กัน abuse + คุมต้นทุน บังคับฝั่ง server กัน bypass
- เพิ่ม **rate limit ระดับ IP/user** ที่ API route (เช่น Vercel KV / Upstash Redis) กัน abuse นอกเหนือ energy
- เช็ค **quota/concurrency limit ของ KKU** — ถ้าชนเพดาน ต้องคุยกับผู้ให้บริการหรือ queue คำขอ
- `ai_word_detail_cache` (§3) ช่วยตัดเรียก LLM ซ้ำคำเดิมได้มาก → hit rate ยิ่งสูงเมื่อ user เยอะ (คำศัพท์ทับกัน)

### 5.3 Kokoro 82M (OpenRouter)
- คิดเงินตามตัวอักษร → cache MP3 ใน Storage (§3.1) ตัดต้นทุนได้เกือบหมดสำหรับคำซ้ำ
- มี fallback Web Speech อยู่แล้ว → ถ้า quota หมด/ล่ม ระบบไม่พัง แค่เสียงคุณภาพต่ำลง

### 5.4 Frontend / Vercel
- static + SSR scale แนวนอนอัตโนมัติผ่าน CDN — **แทบไม่ใช่คอขวด**
- ระวัง serverless function timeout (default สั้น) สำหรับ API รองรับได้ไม่หมดเวลา → ตั้ง `maxDuration` ให้พอ

### สรุปลำดับที่จะพังเมื่อโต (แก้ตามนี้)
1. **DB connections** → ใช้ Supavisor pooler (transaction mode) — แก้ก่อนสุด
2. **LLM cost/rate** → energy system + cache + rate limit
3. **TTS cost** → Storage cache
4. Frontend → แทบไม่ต้องห่วง

---

## 6. Monitoring & Ops (รู้ก่อนพัง)

- **Vercel Analytics + Logs** — error rate, function duration, traffic
- **Supabase Dashboard** — `get_advisors` (security+performance), `get_logs`, slow query, connection count
- **Error tracking** — Sentry (`@sentry/nextjs`) จับ error ฝั่ง client+API; เริ่มแค่ alert error rate พอ
- **Uptime** — ping `/` ด้วย UptimeRobot (ฟรี)
- ตั้ง **alert**: error rate > X%, DB connection ใกล้เต็ม, LLM cost รายวันเกินเพดาน

---

## 7. Security & Data ก่อนขึ้น Production

- **RLS ทุกตาราง** — ยืนยันด้วย `get_advisors(type: security)` ว่าไม่มีตาราง public รั่ว
- **Secret** — อยู่ใน Vercel env เท่านั้น, ห้าม commit, ห้าม `NEXT_PUBLIC_` กับ key ลับ
- **`middleware.ts`** กันหน้า protected อยู่แล้ว — แต่ **อย่าพึ่ง middleware อย่างเดียว**, RLS คือด่านจริงฝั่ง DB
- **CORS / API route** — ตรวจว่า API route ไม่เปิดให้ origin อื่นเรียก
- **Backup** — Supabase Pro มี daily backup; ทดสอบ restore จริงอย่างน้อย 1 ครั้ง
- **PDPA/ความเป็นส่วนตัว** — มี reset ข้อมูลแล้ว (`useDataReset`); เพิ่ม "ลบบัญชี" ถาวรถ้าจะเปิดสาธารณะ

---

## 8. ประมาณการต้นทุน (ballpark ที่ ~10k users)

| บริการ | tier | ต้นทุน/เดือน (โดยประมาณ) |
| :--- | :--- | :--- |
| Vercel | Pro | ~$20 + usage |
| Supabase | Pro | ~$25 + compute add-on ถ้าต้องการ |
| KKU IntelSphere (LLM) | ตามดีล/quota | **ก้อนใหญ่สุด — ขึ้นกับ active users × ข้อความ** |
| Kokoro 82M (OpenRouter) | pay-as-you-go | ต่ำมากถ้า cache ดี |
| **ตัวแปรหลักของบิล = จำนวนเรียก LLM** → energy system + cache คือสิ่งที่คุมต้นทุนจริง |

---

## 9. Checklist ก่อนเปิดให้คนหลักหมื่นใช้

- [ ] ต่อ Supabase ผ่าน **Supavisor pooler (transaction, 6543)** ไม่ใช่ direct
- [ ] เพิ่ม index: `word_progress(user_id, next_review_at)`, `words.user_id`, ฯลฯ (§5.1)
- [ ] ย้าย TTS cache → Supabase Storage (§3.1)
- [ ] `get_advisors` ผ่านทั้ง security + performance ไม่มี critical
- [ ] เก็บกวาด DB orphans (`project-status.md` §4)
- [ ] ตั้ง env บน Vercel ครบ + ลบ `PEXELS_API_KEY`
- [ ] ตั้ง Vercel region + `maxDuration` ให้ API รองรับได้ไม่หมดเวลา
- [ ] rate limit ระดับ user/IP ที่ API route
- [ ] Sentry + uptime monitor + alert ต้นทุน LLM
- [ ] Supabase Auth redirect URLs ตรง production domain
- [ ] ทดสอบ restore backup 1 ครั้ง
