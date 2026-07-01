"use client";

import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import { useReveal } from "@/app/_lib/hooks/useReveal";

export default function FinalCTA() {
  const router = useRouter();
  const ref = useReveal<HTMLDivElement>();

  return (
    <section className="px-6 py-20 text-center">
      <div ref={ref} className="reveal mx-auto max-w-2xl">
        <h2 className="mb-4 text-4xl font-black text-foreground">พร้อมเรียนอังกฤษวันนี้หรือยัง?</h2>
        <p className="mb-8 font-semibold text-foreground/70">สมัครฟรี ไม่ต้องใช้บัตรเครดิต</p>
        <button
          type="button"
          onClick={() => router.push("/auth")}
          className="mx-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 font-semibold uppercase tracking-wide text-white shadow-soft-md transition-transform hover:bg-primary-hover active:scale-[0.98] dark:text-gray-900 cursor-pointer"
        >
          <Rocket size={18} />
          เริ่มเรียนฟรี
        </button>
      </div>
    </section>
  );
}
