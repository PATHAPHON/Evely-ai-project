"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useReveal } from "@/app/_lib/hooks/useReveal";

const FREE_FEATURES = [
  "งบ AI 20,000 µ฿/วัน",
  "คุย AI + แตะคำดูความหมาย",
  "คลังคำ + ทบทวน SRS",
];

const PREMIUM_FEATURES = [
  "งบ AI 50,000 µ฿/วัน",
  "ตัวเลือกคำตอบ (reply suggestions)",
  "ตรวจไวยากรณ์ประโยคของคุณ",
  "ไม่มีโฆษณา",
];

export default function Pricing() {
  const router = useRouter();
  const ref = useReveal<HTMLDivElement>();

  return (
    <section id="pricing" className="dot-grid-bg px-6 py-20">
      <div ref={ref} className="reveal mx-auto max-w-4xl text-center">
        <h2 className="mb-3 text-4xl font-black text-foreground">ราคาที่เข้าใจง่าย</h2>
        <p className="mb-12 font-semibold text-foreground/70">เริ่มฟรี อัปเกรดเมื่อพร้อม</p>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-border-color bg-card-bg p-8 text-left shadow-soft-sm">
            <h3 className="text-lg font-bold text-foreground/70">Free</h3>
            <p className="mb-6 text-4xl font-black text-foreground">฿0</p>
            <ul className="mb-8 space-y-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm font-semibold text-foreground/80">
                  <Check size={18} className="mt-0.5 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => router.push("/auth")}
              className="w-full rounded-xl border border-border-color px-4 py-3 font-semibold text-foreground transition-colors hover:bg-background cursor-pointer"
            >
              เริ่มใช้ฟรี
            </button>
          </div>

          {/* Premium */}
          <div className="rounded-2xl border-2 border-primary bg-card-bg p-8 text-left shadow-soft-lg">
            <h3 className="text-lg font-bold text-primary">Premium</h3>
            <p className="mb-6 text-4xl font-black text-foreground">
              ฿167<span className="text-base font-semibold text-foreground/60">/เดือน</span>
            </p>
            <ul className="mb-8 space-y-3">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm font-semibold text-foreground/80">
                  <Check size={18} className="mt-0.5 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => router.push("/auth")}
              className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white shadow-soft-sm transition-transform hover:bg-primary-hover active:scale-[0.98] dark:text-gray-900 cursor-pointer"
            >
              อัปเกรด Premium
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
