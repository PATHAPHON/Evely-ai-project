# Tarnly — แบบจำลองคลาสระบบ (Class Diagram Blueprint)

> เอกสารระบุโครงสร้างการออกแบบเชิงวัตถุ (Object-Oriented Design) ของแอปพลิเคชัน **Tarnly** โดยแปลงโครงสร้างข้อมูลและส่วนประกอบการทำงานจริง (Entity, React Provider, Custom Hook และ Backend Service) ให้อยู่ในรูปของคลาส (Classes) เพื่อแสดงขอบเขตหน้าที่และความสัมพันธ์ระหว่างกัน
> อ้างอิงสถาปัตยกรรมและโค้ดจริงใน [frontend-architecture.md](frontend-architecture.md), [backend-architecture.md](backend-architecture.md) และ [database-design.md](database-design.md)

---

## 1. ภาพรวมสถาปัตยกรรมการออกแบบคลาส (System Architecture Overview)

เนื่องจากระบบ Tarnly พัฒนาด้วยเทคโนโลยีสมัยใหม่ (React 19 Functional Components + Next.js App Router) ซึ่งไม่ได้ใช้ OOP (Object-Oriented Programming) เป็นหลัก แผนภาพคลาสในเอกสารนี้จึงสร้างขึ้นโดยการจัดกลุ่มและวิเคราะห์โครงสร้างหน้าที่ดังนี้:
1. **Data Entities (คลาสข้อมูล):** จำลองจากตารางจริงในฐานข้อมูล Supabase PostgreSQL
2. **Client-Side Services & Hooks (บริการฝั่งหน้าบ้าน):** จำลองจาก React Context Providers และ Custom Hooks ที่ทำหน้าที่ควบคุมสถานะของ UI และเชื่อมต่อกับเซิร์ฟเวอร์
3. **Backend Route Handlers & Utilities (บริการฝั่งหลังบ้าน):** จำลองจาก Next.js API Routes และไลบรารีคำนวณอัลกอริทึมต่าง ๆ

---

## 2. แผนภาพคลาสข้อมูลและโครงสร้างข้อมูล (Data Entities Class Diagram)

แผนภาพแสดงความสัมพันธ์ของโครงสร้างข้อมูล (Schema) ในระบบ Tarnly ที่ถูกเก็บไว้บนฐานข้อมูล Supabase:

```mermaid
classDiagram
    direction TB
    
    class Profile {
        +uuid id PK
        +string display_name
        +string handle
        +int energy = 15
        +int streak = 0
        +string target_language
        +string ui_language
        +string subscription_status
        +string stripe_customer_id
        +datetime subscription_current_period_end
        +datetime created_at
        +datetime updated_at
    }

    class Word {
        +uuid id PK
        +uuid user_id FK
        +string label
        +string word
        +string english
        +string language = "english"
        +string thai
        +string ipa
        +string part_of_speech
        +string context_sentence
        +datetime created_at
    }

    class WordProgress {
        +uuid id PK
        +uuid word_id FK
        +int box = 1
        +int interval = 1
        +float ease_factor = 2.5
        +int repetitions = 0
        +float mastery_level = 0.0
        +datetime last_reviewed_at
        +datetime next_review_at
    }

    class Conversation {
        +uuid id PK
        +uuid user_id FK
        +string topic
        +bool completed = false
        +datetime created_at
        +datetime updated_at
    }

    class ConversationMessage {
        +uuid id PK
        +uuid session_id FK
        +string role
        +string english_text
        +string reading
        +string translation
        +json english_phrases
        +datetime created_at
    }

    class AiWordDetailCache {
        +uuid id PK
        +string cache_key
        +json response_json
        +datetime expires_at
        +datetime created_at
    }

    %% Relationships
    Profile "1" --> "*" Word : "owns (เจ้าของศัพท์)"
    Word "1" --> "1" WordProgress : "has state (มีสถานะ SM-2)"
    Profile "1" --> "*" Conversation : "has (มีประวัติคุย)"
    Conversation "1" --> "*" ConversationMessage : "contains (ประกอบด้วยข้อความ)"
```

---

## 3. แผนภาพคลาสบริการฝั่งหน้าบ้าน (Client Services & React Hooks Class Diagram)

คลาสเหล่านี้แสดงโครงสร้าง React Providers และ Custom Hooks ที่คุมสถานะ UI ในหน้าจอฝึกแชต คลังคำศัพท์ และระบบสังเคราะห์เสียงพูด:

```mermaid
classDiagram
    direction TB

    class WordStatusProvider {
        <<Context Provider>>
        +Word[] words
        +Record~uuid-WordProgress~ progress
        +bool loading
        +getStatus(word: string) WordStatus
        +getEntry(word: string) WordBankEntry
        +addWord(word: string, context?: string) Promise~void~
        +removeWord(word: string) Promise~void~
        +reviewWord(wordId: uuid, quality: int) Promise~void~
    }

    class ConversationSessionProvider {
        <<Context Provider>>
        +Conversation session
        +ConversationMessage[] messages
        +bool sending
        +bool quotaExceeded
        +startSession(topic?: string) Promise~void~
        +sendMessage(text: string, voice?: bool) Promise~void~
        +deleteSession(id: uuid) Promise~void~
        +refreshQuota() Promise~void~
    }

    class useChatApi {
        <<Custom Hook>>
        +send(messages: Message[]) Promise~ChatResponse~
        +parseChatResponse(text: string) ChatResponse
    }

    class useConversationHistory {
        <<Custom Hook>>
        +loadRecentSessions() Promise~Conversation[]~
        +loadSessionMessages(sessionId: uuid) Promise~ConversationMessage[]~
        +saveMessage(sessionId: uuid, msg: Message) Promise~void~
    }

    class useSpeechService {
        <<Custom Hook>>
        +bool speaking
        +bool listening
        +float ttsSpeed
        +speak(text: string, speed?: float) Promise~void~
        +stopSpeaking() void
        +listen() Promise~string~
        +stopListening() void
    }

    class BillingService {
        <<Service>>
        +createCheckoutSession() Promise~string~
        +openCustomerPortal() Promise~string~
    }

    class FlashcardGame {
        <<Page Component>>
        +Word[] dueCards
        +int currentCardIndex
        +loadDueCards() void
        +submitScore(wordId: uuid, quality: int) void
    }

    %% Dependency & Usage
    ConversationSessionProvider --> useChatApi : "calls /api/chat"
    ConversationSessionProvider --> useConversationHistory : "persists messages"
    ConversationSessionProvider --> useSpeechService : "uses TTS/STT for voice mode"
    FlashcardGame --> WordStatusProvider : "fetches due words & calls reviewWord"
```

---

## 4. แผนภาพคลาสและฟังก์ชันบริการฝั่งหลังบ้าน (Backend API & Services Class Diagram)

แสดงกลุ่ม Router Handlers และโมดูลช่วยคำนวณตรรกะเบื้องหลังบนเซิร์ฟเวอร์ รวมถึงระบบประมวลผลอัลกอริทึมเว้นระยะ:

```mermaid
classDiagram
    direction TB

    class SpacedRepetition {
        <<Utility Module>>
        +createInitialProgress() WordProgress
        +recalculateProgress(progress: WordProgress, quality: int) WordProgress
    }

    class WordStatusDerivation {
        <<Utility Module>>
        +deriveStatus(word: Word, progress: WordProgress, now: datetime) WordStatus
    }

    class ChatRouteHandler {
        <<API Endpoint /api/chat>>
        +POST(req: Request) Response
        -consumeQuota(userId: uuid) Promise~bool~
    }

    class WordDetailRouteHandler {
        <<API Endpoint /api/word-detail>>
        +POST(req: Request) Response
        -queryDeepSeekWordDetail(word: string) Promise~json~
        -checkCache(word: string) Promise~json~
        -writeCache(word: string, data: json) Promise~void~
    }

    class GrammarRouteHandler {
        <<API Endpoint /api/grammar>>
        +POST(req: Request) Response
    }

    class TtsRouteHandler {
        <<API Endpoint /api/tts>>
        +POST(req: Request) Response
    }

    %% Backend Dependencies
    ChatRouteHandler --> WordDetailRouteHandler : "provides context words"
    WordDetailRouteHandler --> WordStatusDerivation : "determines cache hit info"
    WordStatusDerivation --> SpacedRepetition : "SM-2 calculation rules"
```

---

## 5. รายละเอียดสมาชิกและหน้าที่ของแต่ละคลาส (Detailed Specifications)

### 5.1 คลาสข้อมูลหลัก (Data Entities)

| คลาส / แหล่งเก็บข้อมูล | หน้าที่และความสำคัญ | สมาชิกหลัก (Fields/Properties) |
| :--- | :--- | :--- |
| **Profile** | บัญชีข้อมูลหลักของผู้ใช้ระบบ ควบคุมสิทธิ์การใช้แชตและธีมระบบ | `id` (คีย์หลัก), `display_name` (ชื่อแสดงผล), `handle` (แฮนเดิลเฉพาะ), `energy` (โควต้า microbaht ฟรี), `subscription_status` (สถานะการจ่ายเงิน: free/active) |
| **Word** | ตารางเก็บคำศัพท์เดี่ยวแต่ละคำที่ผู้เรียนคลิกและกดบันทึก | `id`, `user_id` (โยงหาโปรไฟล์), `word` (คำศัพท์ตัวพิมพ์เล็ก), `ipa` (การออกเสียง), `thai` (คำแปลไทย), `part_of_speech` (ประเภทคำ) |
| **WordProgress** | เก็บประวัติและสเกลการทบทวนของคำศัพท์แต่ละคำด้วยระบบ SM-2 | `word_id` (โยงหาคำศัพท์), `box` (กล่องระดับ), `interval` (ระยะห่างวัน), `ease_factor` (ความจำง่ายขั้นต่ำ 1.3), `next_review_at` (กำหนดทบทวนครั้งหน้า) |
| **Conversation** | รายชื่อเซสชันหรือหน้าต่างฝึกคุยสนทนาที่ผ่านมา | `id`, `user_id`, `topic` (คำสรุปหัวข้อแชตเพื่อแสดงผลที่ Sidebar), `completed` (สถานะปิดแชต) |
| **ConversationMessage** | ประโยคโต้ตอบจริงในแชตแต่ละบรรทัด | `id`, `session_id`, `role` (ผู้ใช้/AI), `english_text` (ประโยคอังกฤษ), `translation` (คำแปลไทย), `english_phrases` (ไวยากรณ์/POS ย่อย) |

### 5.2 คลาสบริการหน้าบ้าน (Client Services & Custom Hooks)

| คลาสบริการ | สิทธิ์ / บริการที่รับผิดชอบ | ฟังก์ชันสำคัญ (Core Methods) |
| :--- | :--- | :--- |
| **WordStatusProvider** | จัดการโหลดคลังศัพท์ ประสานงานเพิ่ม/ลบศัพท์ และส่งรีวิวเข้าฐานข้อมูล | `addWord()` (เพิ่มคำเข้าคลังแบบออปติมิสติกลดดีเลย์), `reviewWord()` (ส่งผลประเมิน), `getStatus()` (เช็กว่าสีเขียวหรือสีเหลือง) |
| **ConversationSessionProvider** | ควบคุมสถานะบทสนทนาที่กำลังเกิดขึ้น และการจัดการสิทธิเข้าคุย | `startSession()` (สร้างหน้าต่างคุยใหม่), `sendMessage()` (ส่งข้อความ + วิเคราะห์), `refreshQuota()` (โหลดสถานะโควต้าล่าสุด) |
| **useSpeechService** | ตัวประสานงานเชื่อมต่อไมโครโฟน ถอดความ และสังเคราะห์เสียงอ่าน | `speak()` (สั่งแปลงเสียงด้วย Kokoro 82M), `listen()` (เปิดการฟังถอดเสียงผู้ใช้ด้วย Web Speech API/Whisper) |

### 5.3 คลาสและโมดูลบริการหลังบ้าน (Backend Logic)

| คลาส / บริการ | หน้าที่และความสำคัญ | ตรรกะสำคัญ (Internal Logic) |
| :--- | :--- | :--- |
| **SpacedRepetition** | ดำเนินการคํานวณตามสูตร SM-2 (SuperMemo 2) เพื่อจัดตารางทบทวน | `recalculateProgress()`: ป้อนระดับความจำ $q$ (0-5) ประมวลค่า `interval` และ `ease_factor` ตัวใหม่ โดยจำกัดค่า $EF \geq 1.3$ และปัดเศษวันเป็นจำนวนเต็ม |
| **WordStatusDerivation** | ตรวจสอบสีคำศัพท์ว่าควรเป็นสีเหลือง (Needs Review) หรือยัง | `deriveStatus()`: เปรียบเทียบ `next_review_at` หากค่าน้อยกว่าหรือเท่ากับวันเวลาปัจจุบันจะระบุเป็นสีเหลืองทันที เพื่อแยกนำไปแสดงในเกมทบทวน |
| **WordDetailRouteHandler** | ดึงความหมายศัพท์เชิงลึกผ่าน LLM และดูแลการโหลดจาก Cache | `POST()`: ตรวจสอบคำศัพท์ใน `ai_word_detail_cache` ก่อน หากไม่มี จึงจะสั่งเรียก DeepSeek วิเคราะห์คำศัพท์ จากนั้นเขียนแคชลง DB มีอายุการใช้งาน 30 วัน |
