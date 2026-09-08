import Link from "next/link";
import { FileQuestion, ArrowLeft, MessageSquare } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-background text-foreground">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-3xl bg-card-bg border-2 border-border-color shadow-xl">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-primary-bg flex items-center justify-center border-2 border-primary/20 text-primary">
          <FileQuestion className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-black tracking-tight text-foreground font-mono">
            404
          </h1>
          <h2 className="text-xl font-bold text-foreground">
            ไม่พบหน้าที่คุณต้องการ
          </h2>
          <p className="text-sm text-foreground/70 leading-relaxed">
            หน้าที่คุณกำลังค้นหาอาจถูกย้าย ลบออกไปแล้ว หรือลิงก์อาจไม่ถูกต้อง
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/new"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
          >
            <MessageSquare className="w-4 h-4" />
            เริ่มแชทกับ AI
          </Link>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-background border border-border-color font-semibold text-sm hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            หน้าแรก
          </Link>
        </div>
      </div>
    </main>
  );
}
