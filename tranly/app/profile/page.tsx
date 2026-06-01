"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UserHeader from "./_components/UserHeader";
import LearningStats from "./_components/LearningStats";
import SettingsSection from "./_components/SettingsSection";
import AppInfo from "./_components/AppInfo";
import { useStrings } from "@/app/_lib/strings";

export default function ProfilePage() {
  const router = useRouter();
  const t = useStrings();
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-dvh bg-background text-foreground flex flex-col relative overflow-hidden font-sans select-none">
      {/* Local styles for premium silky page-load transitions */}
      <style>{`
        @keyframes cardFadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-card-fade-in {
          animation: cardFadeInUp 0.45s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
        }
      `}</style>
      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))" }}
      >
        {isPageLoading ? (
          <div className="px-4 mt-6 flex flex-col gap-6 animate-pulse">
            {/* User Header Skeleton */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-[#3d3d5c] border-3 border-border-color shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-1/3 h-5 rounded bg-gray-200 dark:bg-[#3d3d5c]" />
                <div className="w-2/3 h-3.5 rounded bg-gray-200 dark:bg-[#3d3d5c]" />
              </div>
            </div>

            {/* Stats Skeleton */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3d3d5c]" />
                  <div className="w-12 h-6 rounded bg-gray-200 dark:bg-[#3d3d5c]" />
                  <div className="w-16 h-4 rounded bg-gray-200 dark:bg-[#3d3d5c]" />
                </div>
              ))}
            </div>

            {/* Settings Section Skeleton */}
            <div className="flex flex-col gap-2">
              <div className="w-24 h-5 rounded bg-gray-200 dark:bg-[#3d3d5c] mb-1" />
              <div className="rounded-2xl border-3 border-border-color bg-card-bg shadow-nb-md p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center py-1">
                    <div className="flex-1 space-y-2">
                      <div className="w-1/4 h-4 rounded bg-gray-200 dark:bg-[#3d3d5c]" />
                      <div className="w-1/2 h-3 rounded bg-gray-200 dark:bg-[#3d3d5c]" />
                    </div>
                    <div className="w-5 h-5 rounded bg-gray-200 dark:bg-[#3d3d5c]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 mt-6 flex flex-col gap-6 animate-card-fade-in">
            {/* User Header */}
            <UserHeader />

          {/* Learning Stats */}
          <LearningStats />

          {/* Settings Menu Links */}
          <SettingsSection title={t.profile.settings}>
            <div className="rounded-2xl border-3 border-border-color bg-card-bg shadow-nb-md overflow-hidden flex flex-col">
              {/* Item 1: Preferences */}
              <button
                onClick={() => router.push("/profile/preferences")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#3d3d5c] transition-colors cursor-pointer text-left"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-text-primary">
                    {t.profile.generalSection}
                  </span>
                  <span className="text-xs text-text-secondary mt-0.5">
                    {t.common.loading === "กำลังโหลด..."
                      ? "เปลี่ยนภาษาหลัก โหมดมืด และคำแปล"
                      : "Change learning language, dark mode, and translations"}
                  </span>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-secondary shrink-0" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {/* Divider */}
              <div className="h-[3px] bg-border-color" />

              {/* Item 2: AI Settings */}
              <button
                onClick={() => router.push("/profile/ai")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#3d3d5c] transition-colors cursor-pointer text-left"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-text-primary">
                    {t.profile.aiSection}
                  </span>
                  <span className="text-xs text-text-secondary mt-0.5">
                    {t.common.loading === "กำลังโหลด..."
                      ? "ตั้งค่าคีย์ API และเวอร์ชันโมเดลสำหรับผู้ช่วย AI"
                      : "Configure API key and model version for AI assistant"}
                  </span>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-secondary shrink-0" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {/* Divider */}
              <div className="h-[3px] bg-border-color" />

              {/* Item 3: Danger Zone */}
              <button
                onClick={() => router.push("/profile/danger")}
                className="w-full flex items-center justify-between p-4 hover:bg-red-50/30 dark:hover:bg-red-950/20 transition-colors cursor-pointer text-left"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-accent-red">
                    {t.profile.dangerZone}
                  </span>
                  <span className="text-xs text-text-secondary mt-0.5">
                    {t.common.loading === "กำลังโหลด..."
                      ? "ลบหรือล้างข้อมูลประวัติการเรียนทั้งหมดของคุณ"
                      : "Delete or reset all of your learning history data"}
                  </span>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent-red shrink-0" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </SettingsSection>

          {/* App Info */}
          <AppInfo />
        </div>
        )}
      </div>

      {/* Bottom nav bar */}
      <div
        className="absolute left-4 right-4 h-[80px] bg-card-bg border-3 border-border-color p-[8px_8px_14px] grid grid-cols-4 z-40 rounded-2xl shadow-nb-md"
        style={{ bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
      >
        <a
          className="flex flex-col items-center gap-1 cursor-pointer text-text-secondary transition-colors"
          onClick={() => router.push("/home")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl transition-all">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabHome}</span>
        </a>

        <a
          className="flex flex-col items-center gap-1 cursor-pointer text-text-secondary transition-colors"
          onClick={() => router.push("/library")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl transition-all">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabLibrary}</span>
        </a>

        <a
          className="flex flex-col items-center gap-1 cursor-pointer text-text-secondary transition-colors"
          onClick={() => router.push("/chat")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl transition-all">
            <svg width="22" height="22" viewBox="0 0 18 18" shapeRendering="crispEdges" style={{ display: 'block' }}>
              <rect x="6" y="1" width="1" height="2" fill="currentColor" />
              <rect x="11" y="1" width="1" height="2" fill="currentColor" />
              <rect x="1" y="6" width="3" height="6" fill="currentColor" />
              <rect x="14" y="6" width="3" height="6" fill="currentColor" />
              <rect x="4" y="3" width="10" height="10" fill="currentColor" />
              <rect x="8" y="13" width="2" height="4" fill="currentColor" />
              <rect x="5" y="13" width="2" height="2" fill="currentColor" />
              <rect x="11" y="13" width="2" height="2" fill="currentColor" />
              <rect x="7" y="7" width="1" height="2" fill="#0b3d66" />
              <rect x="10" y="7" width="1" height="2" fill="#0b3d66" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabAIScan}</span>
        </a>

        <a className="flex flex-col items-center gap-1 cursor-pointer text-text-primary transition-colors">
          <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent-pink-bg border-3 border-border-color shadow-nb-sm transition-all">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabProfile}</span>
        </a>
      </div>
    </div>
  );
}
