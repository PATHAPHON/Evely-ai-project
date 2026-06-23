"use client";

import { useCallback, useRef, useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useStrings } from "@/app/_lib/utils/strings";
import { supabase } from "@/app/_lib/supabase/supabaseClient";
import { useUserProfile } from "@/app/_lib/hooks/useUserProfile";
import { useTheme } from "./_lib/hooks/useTheme";
import { useLanguageLearningStats } from "./_lib/hooks/useLearningStats";
import AccountCard from "./_components/AccountCard";
import { Group, SettingsRow } from "./_components/SettingsList";
import AppInfo from "./_components/AppInfo";
import ProfileViewerModal from "./_components/ProfileViewerModal";
import EditProfileSheet from "./_components/EditProfileSheet";
import BottomSheet from "./_components/BottomSheet";
import GlobalLanguageSelector from "@/app/_components/GlobalLanguageSelector";
import LanguageSelector from "./_components/LanguageSelector";
import ThemeToggle from "./_components/ThemeToggle";
import GeminiLayout from "@/app/_components/GeminiLayout";

function ProfilePageContent() {
  const t = useStrings();
  const router = useRouter();

  const profile = useUserProfile();
  const stats = useLanguageLearningStats();
  const { theme } = useTheme();

  const [showEdit, setShowEdit] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  // Auth state for the account group (login vs logout row).
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;
        setEmail(user && !user.is_anonymous ? user.email || null : null);
      } catch (err) {
        console.error("Error checking user in ProfilePage:", err);
      }
    };
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => refresh());
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

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

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  }, []);

  const viewerStats = [
    { n: stats.wordCount, label: t.profile.statWords },
  ];

  const infoButton = (
    <button
      type="button"
      aria-label="Info"
      className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-95 cursor-pointer"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="11" x2="12" y2="16" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </button>
  );

  return (
    <GeminiLayout title={t.profile.title} showNewChatButton={false} rightElement={infoButton}>
      <div className="relative flex-1 flex w-full select-none flex-col overflow-hidden bg-white dark:bg-[#131314] font-sans text-foreground">
        <style>{`
          @keyframes cardFadeInUp { from { opacity:0; transform:translateY(12px);} to { opacity:1; transform:translateY(0);} }
          .animate-card-fade-in { animation: cardFadeInUp 0.45s cubic-bezier(0.215,0.61,0.355,1) forwards; }
        `}</style>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="animate-card-fade-in flex flex-col gap-3 pt-4 pb-12 max-w-md mx-auto w-full">
            <div className="px-4">
              <AccountCard profile={profile} onOpenViewer={() => setShowViewer(true)} />
            </div>

            {/* Account */}
            <Group>
              <SettingsRow
                title={t.profile.editProfile}
                onClick={() => setShowEdit(true)}
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
                  </svg>
                }
              />
              <SettingsRow
                title={t.profile.billing}
                onClick={() => {}}
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M14.5 9a2.5 2.5 0 0 0-2.5-1.5c-1.4 0-2.5.8-2.5 2s1.1 1.8 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2A2.5 2.5 0 0 1 9.5 15M12 6v1.5M12 16.5V18" />
                  </svg>
                }
              />
              <SettingsRow
                last
                title={t.profile.usage}
                onClick={() => {}}
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 3v18h18" />
                    <path d="M7 14l3-4 3 3 4-6" />
                  </svg>
                }
              />
            </Group>

            {/* Settings */}
            <Group>
              <SettingsRow
                title={t.profile.generalSection}
                onClick={() => setShowPreferences(true)}
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                }
              />
              <SettingsRow
                title={t.profile.darkMode}
                onClick={() => setShowPreferences(true)}
                rightElement={
                  <span className="text-xs font-semibold capitalize text-text-secondary">
                    {theme}
                  </span>
                }
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                }
              />
              <SettingsRow
                last
                title={t.profile.voice}
                onClick={() => {}}
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="4" y1="10" x2="4" y2="14" />
                    <line x1="8" y1="6" x2="8" y2="18" />
                    <line x1="12" y1="9" x2="12" y2="15" />
                    <line x1="16" y1="5" x2="16" y2="19" />
                    <line x1="20" y1="10" x2="20" y2="14" />
                  </svg>
                }
              />
            </Group>

            {/* Session (logout/login) — kept at the very bottom */}
            <Group>
              {email ? (
                <SettingsRow
                  last
                  danger
                  title={t.auth.logoutBtn}
                  onClick={handleLogout}
                  icon={
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  }
                />
              ) : (
                <SettingsRow
                  last
                  title={`${t.auth.loginBtn} / ${t.auth.registerBtn}`}
                  onClick={() => router.push("/auth")}
                  icon={
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                  }
                />
              )}
            </Group>

            <AppInfo />
          </div>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="pointer-events-none absolute bottom-[32px] left-1/2 z-[60] -translate-x-1/2 rounded-full bg-gray-900/90 dark:bg-gray-100/90 text-white dark:text-gray-950 px-5 py-2 text-sm font-semibold shadow-lg backdrop-blur-sm animate-card-fade-in">
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

        {/* General & Learning Preferences */}
        <BottomSheet
          open={showPreferences}
          onClose={() => setShowPreferences(false)}
          title={t.profile.generalSection}
          ariaLabel={t.profile.generalSection}
          closeAria={t.profile.closeAria}
        >
          <div className="p-4">
            <div className="flex flex-col gap-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e1f20] p-5 shadow-sm">
              <div>
                <p className="mb-3 text-sm font-semibold text-text-primary">
                  {t.profile.learningLanguage}
                </p>
                <GlobalLanguageSelector />
              </div>
              <div className="h-px bg-gray-100 dark:bg-gray-800/40" />
              <LanguageSelector />
              <div className="h-px bg-gray-100 dark:bg-gray-800/40" />
              <ThemeToggle />
            </div>
          </div>
        </BottomSheet>

      </div>
    </GeminiLayout>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageContent />
    </Suspense>
  );
}
