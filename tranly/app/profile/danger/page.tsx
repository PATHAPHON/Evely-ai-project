"use client";

import { useRouter } from "next/navigation";
import { useStrings } from "@/app/_lib/strings";
import DataManagement from "../_components/DataManagement";

/**
 * Danger Zone sub-page containing destructive settings like
 * resetting all user learning data.
 */
export default function DangerPage() {
  const router = useRouter();
  const t = useStrings();

  return (
    <div className="w-full h-dvh bg-background text-foreground flex flex-col font-sans select-none">
      {/* Header */}
      <div className="p-4 border-b-3 border-border-color flex items-center gap-3 bg-card-bg">
        <button
          onClick={() => router.push("/profile")}
          className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-border-color bg-card-bg text-text-primary shadow-nb-sm active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
          aria-label="Back to profile"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-text-primary">
          {t.profile.dangerZone}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl border-3 border-accent-red bg-card-bg p-4 shadow-nb-md flex flex-col gap-2">
          <p className="text-xs text-text-secondary leading-relaxed">
            {t.common.loading === 'กำลังโหลด...'
              ? 'ลบประวัติการเรียนรู้ คำศัพท์ที่บันทึกไว้ทั้งหมด รวมถึงบทสนทนาและประวัติแชทกับ AI (คำเตือน: การกระทำนี้ไม่สามารถย้อนกลับได้)'
              : 'Permanently delete all your learning stats, vocabulary, study sessions, and AI assistant chat transcripts. This action is irreversible.'}
          </p>
          <div className="mt-1">
            <DataManagement />
          </div>
        </div>
      </div>
    </div>
  );
}
