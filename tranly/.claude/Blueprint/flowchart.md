# Tarnly — แผนผังการทำงานของระบบ (System Flowcharts)

> เอกสารอธิบายขั้นตอนการทำงานของระบบ (Workflow) ของแอปพลิเคชัน **Tarnly** ผ่านแผนผังการไหลของข้อมูลและการตัดสินใจ (Flowcharts) เพื่อเป็นแนวทางให้นักพัฒนาเห็นภาพการทำงานของระบบตั้งแต่ต้นจนจบ
> อ้างอิงสถาปัตยกรรมและการเชื่อมต่อข้อมูลจริงใน [sitemap.md](sitemap.md) และ [database-design.md](database-design.md)

---

## 1. แผนผังการใช้งานระบบโดยรวม (Overall System Flowchart)

แผนผังแสดงเส้นทางการเดินทางของคู่สนทนาเมื่อเข้ามาในระบบ โดยจะผ่านการตรวจสอบสิทธิ์การเข้าใช้งาน (Middleware Auth) และสิทธิ์สมาชิก (Subscription Gating):

```mermaid
flowchart TD
    Start([เริ่มต้น: เข้าสู่แอป]) --> CheckSession{มี Session หรือไม่?}
    
    CheckSession -- "ไม่มี (Guest)" --> AuthPage[หน้า /auth: ล็อกอิน/สมัครสมาชิก]
    AuthPage --> AuthProcess{เข้าสู่ระบบสำเร็จ?}
    AuthProcess -- ไม่สำเร็จ --> AuthPage
    AuthProcess -- สำเร็จ --> RedirectNew[รีไดเรกต์ไปหน้า /new]
    
    CheckSession -- "มี (Authenticated)" --> RedirectNew
    
    RedirectNew --> UserMenu{เลือกเมนูหลัก}
    
    UserMenu -- "1. ฝึกแชต AI" --> ChatFlow[เข้าหน้า /chat/:id - ฝึกสนทนา]
    UserMenu -- "2. คลังคำศัพท์" --> WordBank[เข้าหน้า /words - คลังศัพท์ส่วนตัว]
    UserMenu -- "3. เล่นเกมทบทวน" --> RefreshMenu[เข้าหน้า /refresh - เมนูฝึกฝน]
    UserMenu -- "4. ตั้งค่าโปรไฟล์" --> ProfileMenu[เข้าหน้า /profile - เมนูตั้งค่า]

    %% Styles
    classDef startEnd fill:#4a5568,stroke:#2d3748,stroke-width:2px,color:#fff;
    classDef process fill:#f7fafc,stroke:#cbd5e0,stroke-width:1.5px,color:#2d3748;
    classDef decision fill:#ebf8ff,stroke:#bee3f8,stroke-width:2px,color:#2b6cb0;
    
    class Start,RedirectNew,AuthPage,WordBank,RefreshMenu,ProfileMenu,ChatFlow process;
    class CheckSession,AuthProcess,UserMenu decision;
```

---

## 2. ขั้นตอนการฝึกสนทนาและการบันทึกคำศัพท์ (AI Tutor Chat & Word Capturing Flow)

ขั้นตอนนี้จะจำลองการตรวจสอบสิทธิ์การแชตประจำวัน (Daily Quota) และกระบวนการดึงข้อมูลศัพท์เชิงลึกเพื่อจัดเก็บลงคลัง:

```mermaid
flowchart TD
    StartChat([เริ่มเซสชันแชต]) --> UserInput[ผู้ใช้พิมพ์/พูดส่งประโยคภาษาอังกฤษ]
    UserInput --> CheckQuota{ตรวจสอบโควต้าผู้ใช้}
    
    CheckQuota -- "Free User & โควต้าหมด (>= 15)" --> ShowPromo[แสดงป๊อปอัปแจ้งเตือนและชวนสมัคร Premium]
    ShowPromo --> RedirectBilling[ไปหน้าชำระเงิน /profile/billing]
    
    CheckQuota -- "Premium User หรือ Free User & โควต้าไม่เกิน (< 15)" --> CallKKU[ยิง API ไปยัง /api/chat]
    CallKKU --> APIProcess[KKU IntelSphere เรียก DeepSeek-V4-Flash + หักโควต้า RPC]
    APIProcess --> StreamAIResponse[AI สตรีมคำตอบทีละประโยคกลับมาแสดงผล]
    APIProcess --> CallGrammar[ระบบยิง API ตรวจ Grammar ขนานแบบ Async]
    
    CallGrammar --> ShowCorrections[แสดง Grammar Correction + คำแปลใต้ข้อความแชต]
    
    StreamAIResponse --> UserAction{ผู้ใช้อ่านแชต}
    
    UserAction -- "ต้องการฟังเสียงอ่าน" --> CallTTS[ยิง API /api/tts เพื่อแปลงเสียง Kokoro-82M]
    CallTTS --> PlayAudio[เล่นเสียงประโยคให้ผู้ใช้ฟัง]
    
    UserAction -- "คลิกคำศัพท์ที่ไม่รู้จัก" --> CheckWordCache{มีคำศัพท์ใน Cache หรือไม่?}
    
    CheckWordCache -- "มี (Cache Hit)" --> ShowWordDetail[แสดงรายละเอียดศัพท์ IPA + คำแปล ทันที ≤ 300ms]
    CheckWordCache -- "ไม่มี (Cache Miss)" --> CallWordDetailAPI[ยิง API /api/word-detail ดึงผลจาก DeepSeek]
    CallWordDetailAPI --> CacheResult[บันทึกผลลงตาราง ai_word_detail_cache]
    CacheResult --> ShowWordDetail
    
    ShowWordDetail --> ClickSave{ผู้ใช้กดบันทึกคำศัพท์?}
    ClickSave -- "ไม่เซฟ" --> EndChat([กลับไปแชตต่อ])
    ClickSave -- "เซฟลงคลัง" --> SaveWordDB[เพิ่มคำศัพท์ในตาราง words + ตั้งค่าแรกเริ่มใน word_progress]
    SaveWordDB --> SetGreenStatus[กำหนดสถานะ Known - สีเขียว]
    SetGreenStatus --> EndChat

    %% Styles
    classDef startEnd fill:#4a5568,stroke:#2d3748,stroke-width:2px,color:#fff;
    classDef process fill:#f7fafc,stroke:#cbd5e0,stroke-width:1.5px,color:#2d3748;
    classDef decision fill:#ebf8ff,stroke:#bee3f8,stroke-width:2px,color:#2b6cb0;
    
    class StartChat,UserInput,CallKKU,APIProcess,StreamAIResponse,CallGrammar,ShowCorrections,CallTTS,PlayAudio,CallWordDetailAPI,CacheResult,ShowWordDetail,SaveWordDB,SetGreenStatus,ShowPromo,RedirectBilling process;
    class CheckQuota,UserAction,CheckWordCache,ClickSave decision;
```

---

## 3. ขั้นตอนการทบทวนคำศัพท์ด้วย SM-2 (Spaced Repetition & Flashcard Game Flow)

ขั้นตอนนี้จะอธิบายสภาวะและการอัปเดตสเกลเวลาทบทวนคำศัพท์ตามอัลกอริทึม SM-2 เมื่อผู้ใช้งานเข้ามาทำสอบผ่านมินิเกม:

```mermaid
flowchart TD
    StartRefresh([เข้าสู่ระบบทบทวนคำศัพท์]) --> FetchWords[ระบบดึงคำศัพท์ที่มีค่า next_review_at <= ปัจจุบัน]
    FetchWords --> FilterYellow[แสดงคำศัพท์เหล่านั้นเป็นสถานะ Needs Review - สีเหลือง]
    
    FilterYellow --> StartGame[เริ่มมินิเกมที่เมนู /refresh/play]
    StartGame --> Render3DCard[แสดงการ์ด 3D พลิกได้: แสดงตัวศัพท์, IPA, และปุ่มกดฟังเสียง TTS]
    Render3DCard --> FlipCard[ผู้ใช้พลิกการ์ดเพื่อดูคำแปลไทย + ประโยคบริบทดั้งเดิมที่เก็บจากแชต]
    
    FlipCard --> GradeMemory[ผู้ใช้ประเมินความจำตนเอง ให้คะแนน q: 0 ถึง 5]
    GradeMemory --> CheckGrade{คะแนนความจำ q >= 3 หรือไม่?}
    
    %% ทางแยกล้มเหลว (ลืมคำศัพท์)
    CheckGrade -- "ไม่ผ่าน (q < 3)" --> ResetProgress[รีเซ็ตความคืบหน้าคำศัพท์]
    ResetProgress --> SM2CalcFail["คำนวณ SM-2:
    - box = 1
    - interval = 1 วัน
    - ease_factor = max(1.3, EF - 0.2)"]
    SM2CalcFail --> KeepYellow[คำศัพท์คงสถานะเป็นสีเหลือง Needs Review]
    
    %% ทางแยกสำเร็จ (จำคำศัพท์ได้)
    CheckGrade -- "ผ่าน (q >= 3)" --> UpdateProgress[อัปเดตค่าความจำสะสม]
    UpdateProgress --> SM2CalcSuccess["คำนวณ SM-2:
    - box = box + 1
    - interval = ครั้งแรก 1 วัน, ครั้งสอง 6 วัน, ครั้งถัดไป ceil(prev_interval * EF)
    - ease_factor = max(1.3, EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02)))"]
    
    SM2CalcSuccess --> UpdateNextReview[กำหนดวันรีวิวรอบถัดไป next_review_at = ปัจจุบัน + interval]
    UpdateNextReview --> UpdateGreenStatus[เปลี่ยนสถานะคำศัพท์กลับเป็นสีเขียว Known]
    
    KeepYellow --> CheckNextCard{เหลือการ์ดคำศัพท์ถัดไป?}
    UpdateGreenStatus --> CheckNextCard
    
    CheckNextCard -- "มีคำอื่นต่อ" --> Render3DCard
    CheckNextCard -- "หมดทุกคำ" --> ShowSummary[แสดงหน้าสรุปสถิติผลลัพธ์การกู้คำศัพท์]
    ShowSummary --> EndRefresh([เสร็จสิ้นเซสชันการเล่นเกม])

    %% Styles
    classDef startEnd fill:#4a5568,stroke:#2d3748,stroke-width:2px,color:#fff;
    classDef process fill:#f7fafc,stroke:#cbd5e0,stroke-width:1.5px,color:#2d3748;
    classDef decision fill:#ebf8ff,stroke:#bee3f8,stroke-width:2px,color:#2b6cb0;
    
    class StartRefresh,FetchWords,FilterYellow,StartGame,Render3DCard,FlipCard,GradeMemory,ResetProgress,SM2CalcFail,KeepYellow,UpdateProgress,SM2CalcSuccess,UpdateNextReview,UpdateGreenStatus,ShowSummary process;
    class CheckGrade,CheckNextCard decision;
```

---

## 4. ขั้นตอนการชำระเงินและสมัครสมาชิก Premium (Stripe Payment Flow)

ขั้นตอนการร้องขอเปลี่ยนสถานะผู้ใช้งานจาก Free $\rightarrow$ Premium ผ่านการผสานระบบชำระเงินของ Stripe:

```mermaid
flowchart TD
    StartBilling([เข้าเมนู /profile/billing]) --> ClickSubscribe[ผู้ใช้กดปุ่ม 'สมัครสมาชิก Premium']
    ClickSubscribe --> CreateSession[ยิง API /api/stripe/create-checkout-session]
    CreateSession --> RedirectStripe[ระบบส่งผู้ใช้ไปยังหน้า Stripe Checkout (Hosted Page)]
    
    RedirectStripe --> StripeCheckout{ดำเนินการชำระเงิน}
    StripeCheckout -- "ยกเลิกการชำระเงิน" --> RedirectCancel[ส่งกลับแอป หน้า /profile/billing พร้อมข้อความยกเลิก]
    
    StripeCheckout -- "ชำระเงินสำเร็จ" --> StripeWebhook[Stripe ยิง Webhook event: checkout.session.completed]
    StripeWebhook --> ValidateSignature[ระบบทำการตรวจสอบ Signature และดึง userId จาก Metadata]
    ValidateSignature --> UpdateUserRole[อัปเดตข้อมูลผู้ใช้ใน Supabase: subscription_status = 'active']
    UpdateUserRole --> RedirectSuccess[ส่งกลับแอป หน้า /profile/billing แสดงผลพรีเมียมเรียบร้อย]
    
    RedirectSuccess --> UnlockFeatures[เปิดใช้งานสิทธิ์แชตคุยไม่จำกัด และล้างโควต้าเดิม]

    %% Styles
    classDef startEnd fill:#4a5568,stroke:#2d3748,stroke-width:2px,color:#fff;
    classDef process fill:#f7fafc,stroke:#cbd5e0,stroke-width:1.5px,color:#2d3748;
    classDef decision fill:#ebf8ff,stroke:#bee3f8,stroke-width:2px,color:#2b6cb0;
    
    class StartBilling,ClickSubscribe,CreateSession,RedirectStripe,RedirectCancel,StripeWebhook,ValidateSignature,UpdateUserRole,RedirectSuccess,UnlockFeatures process;
    class StripeCheckout decision;
```
