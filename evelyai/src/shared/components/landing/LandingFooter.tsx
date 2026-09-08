import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="flex flex-col items-center gap-4 border-t border-border-color px-6 py-10 text-sm text-foreground/60 sm:flex-row sm:justify-between">
      <span className="font-black text-foreground/80">
        Tarn<span className="text-primary">ly</span>
      </span>
      <div className="flex gap-6">
        <Link href="/privacy" className="hover:text-foreground">
          นโยบายความเป็นส่วนตัว
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          ข้อตกลงการใช้งาน
        </Link>
      </div>
    </footer>
  );
}
