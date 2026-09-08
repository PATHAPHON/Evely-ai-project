export const metadata = {
  title: "ข้อกำหนดการใช้บริการ | EvelyAI",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 text-foreground">
      <h1 className="mb-2 text-2xl font-extrabold">ข้อกำหนดการใช้บริการ</h1>
      <p className="mb-6 text-sm text-foreground/60">
        ปรับปรุงล่าสุด: 25 สิงหาคม 2569
      </p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-foreground/90">
        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">1. การยอมรับข้อกำหนด</h2>
          <p>
            การเข้าใช้งานแอปพลิเคชัน EvelyAI (&ldquo;บริการ&rdquo;) ถือว่าคุณยอมรับและตกลง
            ปฏิบัติตามข้อกำหนดการใช้บริการนี้ หากคุณไม่ยอมรับข้อกำหนด กรุณายุติการใช้งานระบบ
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">2. การใช้งานบริการ</h2>
          <p>
            คุณตกลงใช้บริการเพื่อวัตถุประสงค์ในการฝึกฝนและเรียนรู้ภาษาอังกฤษเท่านั้น และจะไม่นำระบบไปใช้
            ในทางที่ผิดกฎหมาย ละเมิดสิทธิ์ผู้อื่น หรือพยายามรบกวนการทำงานของระบบเซิร์ฟเวอร์
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">3. นโยบายคุ้มครองข้อมูลส่วนบุคคล</h2>
          <p>
            เราเก็บรวบรวมและประมวลผลข้อมูลส่วนบุคคลของคุณตามที่ระบุไว้ใน{" "}
            <a href="/privacy" className="text-primary underline font-medium">
              นโยบายความเป็นส่วนตัว
            </a>{" "}
            ซึ่งสอดคล้องกับพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">4. ข้อจำกัดความรับผิดชอบ (AI-Generated Content)</h2>
          <p>
            คำตอบ ข้อความ การแปล และคำแนะนำทางไวยากรณ์ถูกสร้างขึ้นโดยแบบจำลองภาษาขนาดใหญ่ (LLM) แม้เราจะพัฒนาให้มีความแม่นยำสูง
            แต่ผู้ใช้ควรใช้วิจารณญาณในการนำไปอ้างอิงเชิงวิชาการหรือเอกสารทางการ
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">5. การสมัครสมาชิก Premium และการเรียกเก็บเงิน</h2>
          <p>
            สำหรับบริการแบบ Premium (เพิ่มงบประมาณรายวัน, คำแนะนำประโยคตอบกลับ, และการตรวจไวยากรณ์) คุณสามารถยกเลิกการสมัครสมาชิกได้ทุกเมื่อผ่านหน้าโปรไฟล์
            การยกเลิกจะมีผลเมื่อสิ้นสุดรอบบิลปัจจุบัน โดยไม่มีการเรียกเก็บเงินย้อนหลัง
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">6. การเปลี่ยนแปลงข้อกำหนด</h2>
          <p>
            เราอาจปรับปรุงข้อกำหนดนี้เป็นครั้งคราว การใช้บริการต่อเนื่องหลังการเปลี่ยนแปลงถือว่า
            คุณยอมรับข้อกำหนดฉบับใหม่
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">7. ช่องทางติดต่อ</h2>
          <p>
            โครงการ EvelyAI
            <br />
            คณะวิศวกรรมศาสตร์และเทคโนโลยีสารสนเทศ
            <br />
            อีเมล: support@evelyai.app
          </p>
        </section>
      </div>
    </main>
  );
}
