"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStrings } from "@/app/_lib/strings";
import { useUserProfile } from "./_lib/useUserProfile";
import { useLanguageLearningStats } from "./_lib/useLearningStats";
import { useStudyHeatmap } from "./_lib/useStudyHeatmap";
import ProfileHeader from "./_components/ProfileHeader";
import LearningStats from "./_components/LearningStats";
import LearningHeatmap from "./_components/LearningHeatmap";
import StreakCard from "./_components/StreakCard";
import AppInfo from "./_components/AppInfo";
import ProfileViewerModal from "./_components/ProfileViewerModal";
import EditProfileSheet from "./_components/EditProfileSheet";
import SettingsSheet from "./_components/SettingsSheet";
import BottomSheet from "./_components/BottomSheet";
import GlobalLanguageSelector from "@/app/_components/GlobalLanguageSelector";
import LanguageSelector from "./_components/LanguageSelector";
import ThemeToggle from "./_components/ThemeToggle";
import AIConfigPanel from "./_components/AIConfigPanel";
import DataManagement from "./_components/DataManagement";

export default function ProfilePage() {
  const router = useRouter();
  const t = useStrings();

  const profile = useUserProfile();
  const stats = useLanguageLearningStats();
  const heatmap = useStudyHeatmap(53);
  const streak = heatmap?.currentStreak ?? 0;

  const [showSettings, setShowSettings] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showDanger, setShowDanger] = useState(false);

  // Lightweight toast.
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 1800);
  }, []);

  const handleShare = useCallback(() => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/profile`
        : "/profile";
    navigator.clipboard?.writeText(url).catch(() => {});
    showToast(t.profile.shareCopied);
  }, [showToast, t.profile.shareCopied]);

  const viewerStats = [
    { n: stats.wordCount, label: t.profile.statWords },
    { n: stats.flashcardSetCount, label: t.profile.statFlashcards },
    { n: streak, label: t.profile.statStreak },
  ];

  return (
    <div className="relative flex h-dvh w-full select-none flex-col overflow-hidden bg-background font-sans text-foreground">
      <style>{`
        @keyframes cardFadeInUp { from { opacity:0; transform:translateY(12px);} to { opacity:1; transform:translateY(0);} }
        .animate-card-fade-in { animation: cardFadeInUp 0.45s cubic-bezier(0.215,0.61,0.355,1) forwards; }
      `}</style>

      {/* App bar */}
      <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-6">
        <h1
          className="text-3xl font-extrabold leading-tight tracking-tight text-text-primary"
          style={{ fontFamily: "var(--font-outfit), sans-serif" }}
        >
          {t.profile.title}
        </h1>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          aria-label={t.profile.settingsAria}
          className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-border-color bg-card-bg text-text-primary shadow-nb-sm active:translate-y-[2px] active:shadow-none cursor-pointer"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="animate-card-fade-in flex flex-col gap-6 px-4 pt-2">
          <ProfileHeader
            profile={profile}
            onEdit={() => setShowEdit(true)}
            onShare={handleShare}
            onOpenViewer={() => setShowViewer(true)}
          />

          <LearningStats
            wordCount={stats.wordCount}
            flashcardSetCount={stats.flashcardSetCount}
            studySessionCount={stats.studySessionCount}
            streak={streak}
            isLoading={stats.isLoading}
          />

          <LearningHeatmap heatmap={heatmap} />

          <StreakCard heatmap={heatmap} />

          <AppInfo />
        </div>
      </div>

      {/* Bottom nav */}
      <div
        className="absolute left-4 right-4 z-40 grid h-[80px] grid-cols-4 rounded-2xl border-3 border-border-color bg-card-bg p-[8px_8px_14px] shadow-nb-md"
        style={{ bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
      >
        <a className="flex cursor-pointer flex-col items-center gap-1 text-text-secondary" onClick={() => router.push("/home")}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabHome}</span>
        </a>

        <a className="flex cursor-pointer flex-col items-center gap-1 text-text-secondary" onClick={() => router.push("/library")}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabLibrary}</span>
        </a>

        <a className="flex cursor-pointer flex-col items-center gap-1 text-text-secondary" onClick={() => router.push("/chat")}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl">
            <svg width="22" height="22" viewBox="0 0 18 18" shapeRendering="crispEdges" style={{ display: "block" }}>
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

        <a className="flex cursor-pointer flex-col items-center gap-1 text-text-primary">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-border-color bg-accent-pink-bg shadow-nb-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabProfile}</span>
        </a>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="pointer-events-none absolute bottom-[112px] left-1/2 z-[60] -translate-x-1/2 rounded-xl border-3 border-border-color bg-text-primary px-4 py-2 text-sm font-bold text-background shadow-nb-md">
          {toastMsg}
        </div>
      )}

      {/* Overlays */}
      <ProfileViewerModal
        open={showViewer}
        onClose={() => setShowViewer(false)}
        profile={profile}
        stats={viewerStats}
        onEdit={() => {
          setShowViewer(false);
          setShowEdit(true);
        }}
        onShare={handleShare}
      />

      <EditProfileSheet
        open={showEdit}
        onClose={() => setShowEdit(false)}
        profile={profile}
        onSaved={() => showToast(t.profile.saved)}
      />

      <SettingsSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onEditProfile={() => setShowEdit(true)}
        onOpenPreferences={() => setShowPreferences(true)}
        onOpenAI={() => setShowAI(true)}
        onOpenDanger={() => setShowDanger(true)}
      />

      {/* General & Learning */}
      <BottomSheet
        open={showPreferences}
        onClose={() => setShowPreferences(false)}
        title={t.profile.generalSection}
        ariaLabel={t.profile.generalSection}
        closeAria={t.profile.closeAria}
      >
        <div className="p-4">
          <div className="flex flex-col gap-5 rounded-2xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md">
            <div>
              <p className="mb-3 text-sm font-semibold text-text-primary">
                {t.profile.learningLanguage}
              </p>
              <GlobalLanguageSelector />
            </div>
            <div className="h-[2px] bg-border-color/10 dark:bg-border-color/20" />
            <LanguageSelector />
            <div className="h-[2px] bg-border-color/10 dark:bg-border-color/20" />
            <ThemeToggle />
          </div>
        </div>
      </BottomSheet>

      {/* AI Assistant Settings */}
      <BottomSheet
        open={showAI}
        onClose={() => setShowAI(false)}
        title={t.profile.aiSection}
        ariaLabel={t.profile.aiSection}
        closeAria={t.profile.closeAria}
        heightClass="h-[88%]"
      >
        <div className="p-4">
          <div className="rounded-2xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md">
            <AIConfigPanel />
          </div>
        </div>
      </BottomSheet>

      {/* Danger Zone */}
      <BottomSheet
        open={showDanger}
        onClose={() => setShowDanger(false)}
        title={t.profile.dangerZone}
        ariaLabel={t.profile.dangerZone}
        closeAria={t.profile.closeAria}
        heightClass="max-h-[60%]"
      >
        <div className="p-4">
          <div className="flex flex-col gap-2 rounded-2xl border-3 border-accent-red bg-card-bg p-4 shadow-nb-md">
            <p className="text-xs leading-relaxed text-text-secondary">
              {t.profile.dangerWarning}
            </p>
            <div className="mt-1">
              <DataManagement />
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
