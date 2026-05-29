"use client";

import { useRouter } from "next/navigation";
import ScanButton from "@/app/scan/_components/ScanButton";
import PageHeader from "@/app/_components/PageHeader";
import UserHeader from "./_components/UserHeader";
import LearningStats from "./_components/LearningStats";
import SettingsSection from "./_components/SettingsSection";
import LanguageSelector from "./_components/LanguageSelector";
import AIConfigPanel from "./_components/AIConfigPanel";
import ThemeToggle from "./_components/ThemeToggle";
import DataManagement from "./_components/DataManagement";
import AppInfo from "./_components/AppInfo";
import { useStrings } from "@/app/_lib/strings";

export default function ProfilePage() {
  const router = useRouter();
  const t = useStrings();

  return (
    <div className="w-full h-dvh bg-background text-foreground flex flex-col relative overflow-hidden font-sans select-none">
      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))" }}
      >
        <PageHeader
          title={t.profile.title}
          subtitle={t.profile.subtitle}
        />

        <div className="px-4 mt-6 flex flex-col gap-6">
          {/* User Header */}
          <UserHeader />

          {/* Learning Stats */}
          <LearningStats />

          {/* Settings */}
          <SettingsSection title={t.profile.settings}>
            <LanguageSelector />
            <AIConfigPanel />
            <ThemeToggle />
            <DataManagement />
          </SettingsSection>

          {/* App Info */}
          <AppInfo />
        </div>
      </div>

      {/* Bottom nav bar */}
      <div
        className="absolute left-4 right-4 h-[80px] bg-card-bg border-3 border-border-color p-[8px_8px_14px] grid grid-cols-5 z-40 rounded-2xl shadow-nb-md"
        style={{ bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
      >
        <a
          className="flex flex-col items-center gap-1 cursor-pointer text-text-secondary"
          onClick={() => router.push("/home")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabHome}</span>
        </a>

        <a
          className="flex flex-col items-center gap-1 cursor-pointer text-text-secondary"
          onClick={() => router.push("/learn")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabWord}</span>
        </a>

        <ScanButton />

        <a
          className="flex flex-col items-center gap-1 cursor-pointer text-text-secondary"
          onClick={() => router.push("/chat")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v2" /><path d="M12 19v2" /><path d="M5 12H3" /><path d="M21 12h-2" />
              <path d="M6.3 6.3 4.9 4.9" /><path d="M19.1 19.1 17.7 17.7" />
              <path d="M6.3 17.7 4.9 19.1" /><path d="M19.1 4.9 17.7 6.3" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabAI}</span>
        </a>

        <a className="flex flex-col items-center gap-1 cursor-pointer text-text-primary">
          <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent-pink-bg border-3 border-border-color shadow-nb-sm">
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
