"use client";

import { useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

export default function LandingHeader() {
  const router = useRouter();

  return (
    <header className="sticky top-4 z-50 flex w-full justify-center px-4">
      <div className="flex w-fit items-center gap-6 sm:gap-8 rounded-full border border-border-color bg-background/80 px-5 py-2 backdrop-blur-md shadow-soft-md">
        <span className="text-lg font-black text-foreground select-none">
          Tarn<span className="text-primary">ly</span>
        </span>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => router.push("/auth")}
            className="hidden text-sm font-semibold text-foreground/70 hover:text-foreground sm:block cursor-pointer"
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => router.push("/auth")}
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white shadow-soft-sm transition-transform hover:bg-primary-hover active:scale-[0.98] dark:text-gray-900 cursor-pointer"
          >
            เริ่มใช้ฟรี
          </button>
        </div>
      </div>
    </header>
  );
}
