export const metadata = {
  title: "นโยบายความเป็นส่วนตัว | จีจีจบล่ะ",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 text-foreground">
      <h1 className="mb-2 text-2xl font-extrabold">นโยบายความเป็นส่วนตัว</h1>
      <p className="mb-6 text-sm text-foreground/60">
        ปรับปรุงล่าสุด: 25 สิงหาคม 2569
      </p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-foreground/90">
        <section>
          <p>
            นโยบายนี้อธิบายวิธีที่ GeeGeeJobLa (จีจีจบล่ะ) (&ldquo;เรา&rdquo;) เก็บรวบรวม ใช้ และเปิดเผย
            ข้อมูลส่วนบุคคลของคุณ ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">1. ข้อมูลที่เราเก็บ</h2>
          <p>
            เราเก็บข้อมูลบัญชี (อีเมล, ชื่อที่แสดง) ข้อมูลความก้าวหน้าในการเรียนรู้
            (คลังคำศัพท์, ค่า Spaced Repetition SM-2, ประวัติการสนทนา) และข้อมูลการใช้งานทางเทคนิคที่จำเป็นต่อการให้บริการ
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">2. วัตถุประสงค์ในการใช้ข้อมูล</h2>
          <p>
            เราใช้ข้อมูลเพื่อให้บริการคู่สนทนาภาษาอังกฤษ AI, คำนวณตารางทบทวนคำศัพท์, ปรับปรุงประสบการณ์การเรียนรู้, จัดการบัญชีและการชำระเงิน,
            และรักษาความปลอดภัยของระบบ
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">3. การเปิดเผยข้อมูลและ AI Services</h2>
          <p>
            เราไม่จำหน่ายข้อมูลส่วนบุคคลของคุณ ข้อมูลข้อความในบทสนทนาจะถูกส่งไปยังผู้ให้บริการประมวลผล LLM (เช่น OpenRouter และ KKU AI)
            เพื่อสร้างข้อความตอบกลับและตรวจสอบไวยากรณ์ตามความจำเป็นในการให้บริการ
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">4. ระยะเวลาการเก็บข้อมูลและการลบอัตโนมัติ</h2>
          <p>
            เราเก็บข้อมูลเท่าที่จำเป็นต่อการให้บริการ โดยประวัติข้อความบทสนทนา (Chat Messages) จะถูกลบออกจากระบบโดยอัตโนมัติหลังจาก 3 วัน
            และผู้ใช้สามารถกด &ldquo;ลบบัญชีถาวร&rdquo; หรือ &ldquo;รีเซ็ตข้อมูล&rdquo; ได้ตลอดเวลาผ่านหน้าโปรไฟล์
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">5. สิทธิ์ของผู้ใช้ตามกฎหมาย PDPA</h2>
          <p>
            คุณมีสิทธิ์เข้าถึง แก้ไข ลบ หรือขอโอนย้ายข้อมูลส่วนบุคคลของคุณ รวมถึงสิทธิ์
            ในการเพิกถอนความยินยอมได้ตลอดเวลาผ่านการตั้งค่าในแอปพลิเคชัน
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">6. ช่องทางติดต่อ</h2>
          <p>
            โครงการ GeeGeeJobLa (จีจีจบล่ะ)
            <br />
            คณะวิศวกรรมศาสตร์และเทคโนโลยีสารสนเทศ
            <br />
            อีเมล: support@geegeejobla.app
          </p>
        </section>
      </div>
    </main>
  );
}
