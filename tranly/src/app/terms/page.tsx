export const metadata = {
  title: "ข้อกำหนดการใช้บริการ | จีจีจบล่ะ",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 text-foreground">
      <h1 className="mb-2 text-2xl font-extrabold">ข้อกำหนดการใช้บริการ</h1>
      <p className="mb-6 text-sm text-text-secondary">
        ปรับปรุงล่าสุด: [วันที่]
      </p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-text-primary">
        <section>
          <h2 className="mb-2 text-lg font-bold">1. การยอมรับข้อกำหนด</h2>
          <p>
            การเข้าใช้งานแอปพลิเคชัน จีจีจบล่ะ (&ldquo;บริการ&rdquo;) ถือว่าคุณยอมรับและตกลง
            ปฏิบัติตามข้อกำหนดการใช้บริการนี้ หากคุณไม่ยอมรับข้อกำหนด กรุณาหยุดใช้บริการ
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">2. การใช้งานบริการ</h2>
          <p>
            คุณตกลงใช้บริการเพื่อวัตถุประสงค์ในการเรียนรู้ภาษาเท่านั้น และจะไม่ใช้บริการ
            ในทางที่ผิดกฎหมาย ละเมิดสิทธิ์ผู้อื่น หรือรบกวนการทำงานของระบบ
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">3. การเก็บข้อมูล</h2>
          <p>
            เราเก็บรวบรวมและประมวลผลข้อมูลส่วนบุคคลของคุณตามที่ระบุไว้ใน{" "}
            <a href="/privacy" className="text-blue-600 underline dark:text-blue-400">
              นโยบายความเป็นส่วนตัว
            </a>{" "}
            ซึ่งสอดคล้องกับพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">4. ความรับผิดชอบ</h2>
          <p>
            บริการนี้ให้บริการตามสภาพ (&ldquo;as is&rdquo;) เราไม่รับประกันความถูกต้อง
            สมบูรณ์ หรือความเหมาะสมของเนื้อหาที่สร้างโดย AI และไม่รับผิดชอบต่อความเสียหาย
            ใด ๆ ที่เกิดจากการใช้บริการ
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">5. การชำระเงินและการยกเลิก</h2>
          <p>
            สำหรับบริการแบบ Premium คุณสามารถยกเลิกการสมัครสมาชิกได้ทุกเมื่อผ่านหน้าจัดการ
            การเรียกเก็บเงิน การยกเลิกจะมีผลเมื่อสิ้นสุดรอบการเรียกเก็บเงินปัจจุบัน โดยไม่มี
            การคืนเงินสำหรับรอบที่ใช้งานไปแล้ว
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">6. การเปลี่ยนแปลงข้อกำหนด</h2>
          <p>
            เราอาจปรับปรุงข้อกำหนดนี้เป็นครั้งคราว การใช้บริการต่อหลังการเปลี่ยนแปลงถือว่า
            คุณยอมรับข้อกำหนดฉบับใหม่
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">7. ติดต่อเรา</h2>
          <p>
            ผู้ให้บริการ: [ชื่อ]
            <br />
            ที่อยู่: [ที่อยู่]
            <br />
            ติดต่อ: [อีเมล/เบอร์ติดต่อ]
          </p>
        </section>
      </div>
    </main>
  );
}
