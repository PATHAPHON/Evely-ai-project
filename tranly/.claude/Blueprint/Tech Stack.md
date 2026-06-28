# Tarnly — เทคโนโลยีและเครื่องมือที่ใช้ (Tech Stack Blueprint)

> เอกสารสรุปรายการเทคโนโลยี ไลบรารี และบริการภายนอก (Tech Stack) ที่ใช้งานจริงในระบบ **Tarnly** (หรือชื่อปัจจุบัน **GeeGeeJobLa**) อัปเดตล่าสุดอิงจากไฟล์อิมพอร์ตและ `package.json` จริงในปัจจุบัน
> อ้างอิงสอดคล้องกับ [package.json](file:///Users/pat/Project/tranly-free-version/tranly/package.json) และ [frontend-architecture.md](frontend-architecture.md)

---

## 1. ภาพรวมสถาปัตยกรรม (Architecture Overview)

ระบบ Tarnly ถูกสร้างขึ้นด้วยสถาปัตยกรรม **Full-stack Single-page Application (SPA)** โดยมี Next.js 16 เป็นฐานในการรันระบบ ทั้งหน้าบ้านและระบบหลังบ้านในรูปแบบ Serverless API Routes ร่วมกับการใช้บริการคลาวด์ภายนอก เช่น Supabase สำหรับระบบฐานข้อมูลและการล็อกอิน และ Stripe สำหรับการรับชำระเงิน

```mermaid
graph TD
    Client["📱 Frontend (React 19 / Next.js 16)"]
    Server["⚙️ Backend (Next.js API Routes)"]
    Supabase["🗄️ Supabase (Auth / PostgreSQL)"]
    Stripe["💳 Stripe (Payment Platform)"]
    KKU["🧠 KKU IntelSphere (DeepSeek LLM)"]
    OpenRouter["🤖 OpenRouter (Kokoro TTS / Whisper STT)"]

    Client -->|1. พิมพ์แชต/ขอแปลศัพท์| Server
    Server -->|2. เรียกใช้ LLM & AI| KKU
    Server -->|3. แปลงเสียงพูด/ฟังเสียง| OpenRouter
    Server -->|4. บันทึกข้อมูล/เช็กสิทธิ์| Supabase
    Client -->|5. สมัครสมาชิก Premium| Stripe
    Stripe -->|6. แจ้งเตือนสถานะสำเร็จ (Webhook)| Server
```

---

## 2. ส่วนติดต่อผู้ใช้งานฝั่งหน้าบ้าน (Frontend Tech Stack)

เครื่องมือและไลบรารีที่รันบนบราวเซอร์ของฝั่งผู้ใช้งาน (Client-Side):

| หมวดหมู่ | เทคโนโลยีที่เลือกใช้ | รายละเอียดการใช้งานในระบบ |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16.2.6** (App Router) | รองรับการทำงานในรูปแบบ App Router, Routing หน้าจออย่างรวดเร็ว และ Client-Side React rendering |
| **Language** | **React 19.2.4 + TypeScript** | เพิ่มประสิทธิภาพการจัดลำดับการแสดงผล (Concurrent Features) และเพิ่ม Type Safety ทั้งแอปพลิเคชัน |
| **Styling** | **Tailwind CSS 4.0** | ใช้แต่ง UI ทั้งระบบตามแนวคิด Neobrutalist (ตามธีมการออกแบบของแอป) โดยรองรับ Dark Mode ระดับ Class-based ในตัวผ่านสคริปต์ใน layout |
| **Icons** | **Lucide React 1.21.0** | ชุดไอคอน UI หลักสไตล์ Minimalist ที่โหลดง่ายและปรับแต่งสะดวก |
| **Fonts** | **Google Fonts via `next/font`** | - `Outfit`: ฟอนต์หลักสำหรับตัวภาษาอังกฤษและหัวข้อเด่น<br/>- `Noto Sans Thai`: ฟอนต์หลักสำหรับแปลภาษาไทยและเนื้อความภาษาไทย<br/>- `Geist Mono`: ฟอนต์เฉพาะสำหรับข้อความเชิงโปรแกรม (Monospace) |
| **State Management** | **React Context** (ไม่มี Redux/Zustand) | - `ActiveLanguageProvider`: คุมภาษาเป้าหมายที่เรียน<br/>- `WordStatusProvider`: คุมสถานะคำศัพท์เหลือง/เขียว และการซิงก์ DB<br/>- `ToastProvider`: ระบบแสดงข้อความแจ้งเตือนป๊อปอัป |

---

## 3. บริการฝั่งหลังบ้านและระบบเซิร์ฟเวอร์ (Backend & Cloud Services)

บริการที่ประมวลผลบนคลาวด์และเซิร์ฟเวอร์เบื้องหลัง (Server-Side):

| หมวดหมู่ | เทคโนโลยีที่เลือกใช้ | รายละเอียดการใช้งานในระบบ |
| :--- | :--- | :--- |
| **Server Runtime** | **Next.js API Routes** (Serverless) | ประมวลผล API ภายใต้โฟลเดอร์ `app/api/*` เพื่อซ่อนความลับ API key และจำกัดโควต้าแชตฝั่งหลังบ้าน |
| **Database & Auth** | **Supabase (PostgreSQL)** | - ระบบจัดเก็บข้อมูลหลัก (`words`, `word_progress`, `conversations`) และแคชข้อความ<br/>- `@supabase/ssr` สำหรับดึง Session ข้ามหน้าจออย่างปลอดภัย<br/>- Supabase Auth ดูแลการยืนยันตัวตน (Email/Password & Google OAuth) |
| **Payment Gateway** | **Stripe (stripe-node 22.3.0)** | เชื่อมต่อระบบชำระเงินของ Stripe Checkout สำหรับอัปเกรดเป็นสิทธิ์ Premium และ Stripe Webhook ในการอัปเดตบทบาทผู้ใช้งานในฐานข้อมูลอัตโนมัติ |

---

## 4. ระบบปัญญาประดิษฐ์และโมดูลการประมวลผลเสียง (AI & Voice Engine Stack)

ส่วนประกอบในการประมวลผลข้อความและสังเคราะห์เสียงจากแบบจำลอง AI:

| ฟังก์ชันการทำงาน | แบบจำลอง AI (Model) | ช่องทางการเชื่อมต่อ (Integration Point) |
| :--- | :--- | :--- |
| **AI Tutor Chat & Grammar** | **DeepSeek-V4-Flash** | ผ่านบริการ **KKU IntelSphere API** (`gen.ai.kku.ac.th`) |
| **Text-to-Speech (TTS)** | **hexgrad/kokoro-82m** | เรียกใช้ผ่าน **OpenRouter API** สำหรับออกเสียงอ่านบทสนทนา (มีระบบ Fallback ไปใช้ **Web Speech API** บนเบราว์เซอร์อัตโนมัติหากไม่มีอินเทอร์เน็ตหรือไม่มี API Key) |
| **Speech-to-Text (STT)** | **OpenAI Whisper API / Web Speech API** | แปลงเสียงพูดของผู้ใช้งานกลับเป็นข้อความเพื่อคุยใน Hands-free Voice Mode |

---

## 5. เครื่องมือทดสอบและกระบวนการทำงาน (Tooling & Quality Assurance)

| ส่วนการทำงาน | เครื่องมือที่เลือกใช้ | รายละเอียดและคำสั่งสั่งรัน |
| :--- | :--- | :--- |
| **Dev Server** | **Next CLI (SSL/HTTPS ready)** | - `npm run dev`: รันแบบ HTTP ทั่วไป<br/>- `npm run dev:https`: รันผ่าน HTTPS ด้วย SSL key ที่ออกให้ localhost เพื่อทดสอบ Voice Mode/ไมโครโฟนบนอุปกรณ์อื่นในวง LAN |
| **Testing** | **Vitest 4.1.7** | ชุดทดสอบ Unit Test ความถูกต้องของอัลกอริทึม SM-2 และ React Hooks (`vitest.config.ts`) ร่วมกับ `@testing-library/react` และ `jsdom` |
| **Linter** | **ESLint 9** | ใช้ตรวจเช็กคุณภาพโค้ดและแจ้งเตือนการเขียนฟังก์ชันที่ไม่ถูกต้องตามมาตรฐาน (`eslint.config.mjs`) |
