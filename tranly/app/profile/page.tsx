"use client";

import { useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useStrings } from "@/app/_lib/utils/strings";
import { supabase } from "@/app/_lib/supabase/supabaseClient";
import { useUserProfile } from "@/app/_lib/hooks/useUserProfile";
import { DAILY_BUDGET_MICROBAHT } from "@/app/api/_lib/utils/tokenCost";
import { useTheme } from "./_lib/hooks/useTheme";
import { useShowTranslation } from "./_lib/hooks/useShowTranslation";
import AccountCard from "./_components/AccountCard";
import { Group, SettingsRow } from "./_components/SettingsList";
import GeminiLayout from "@/app/_components/GeminiLayout";

function ProfilePageContent() {
  const t = useStrings();
  const router = useRouter();

  const profile = useUserProfile();
  const { isPremium, energySpent } = profile;
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const { showTranslation, toggleShowTranslation } = useShowTranslation();

  // Usage summary for the menu row.
  const usageLimit = isPremium
    ? DAILY_BUDGET_MICROBAHT.premium
    : DAILY_BUDGET_MICROBAHT.free;
  const usagePct = Math.min(
    100,
    Math.round((energySpent / usageLimit) * 100) || 0
  );

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
    router.push("/auth");
  }, [router]);

  const infoButton = (
    <button
      type="button"
      aria-label={t.profile.infoAria}
      className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-card-bg active:scale-95 cursor-pointer"
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
      <div className="relative flex-1 flex w-full select-none flex-col overflow-hidden bg-background font-sans text-foreground">
        <style>{`
          @keyframes cardFadeInUp { from { opacity:0; transform:translateY(12px);} to { opacity:1; transform:translateY(0);} }
          .animate-card-fade-in { animation: cardFadeInUp 0.45s cubic-bezier(0.215,0.61,0.355,1) forwards; }
        `}</style>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="animate-card-fade-in flex flex-col gap-3 pt-4 pb-12 max-w-md mx-auto w-full">
            <div className="px-4">
              <AccountCard profile={profile} onOpenViewer={() => router.push("/profile/edit")} />
            </div>

            {/* Edit Profile / Billing / AI Usage — one group */}
            <Group>
              <SettingsRow
                title={t.profile.editProfile}
                onClick={() => router.push("/profile/edit")}
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
                  </svg>
                }
              />
              <SettingsRow
                title={t.profile.billing}
                onClick={() => router.push("/profile/billing")}
                rightElement={
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        isPremium
                          ? "bg-warning/10 text-warning"
                          : "bg-card-bg text-foreground/70"
                      }`}
                    >
                      {isPremium ? t.profile.planPremium : t.profile.planFree}
                    </span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="shrink-0 text-foreground/45" aria-hidden="true">
                      <polyline points="9 6 15 12 9 18" />
                    </svg>
                  </div>
                }
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M14.5 9a2.5 2.5 0 0 0-2.5-1.5c-1.4 0-2.5.8-2.5 2s1.1 1.8 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2A2.5 2.5 0 0 1 9.5 15M12 6v1.5M12 16.5V18" />
                  </svg>
                }
              />
              <SettingsRow
                last
                title={t.profile.usageToday}
                onClick={() => router.push("/profile/usage")}
                rightElement={
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground/70">
                      {usagePct}%
                    </span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="shrink-0 text-foreground/45" aria-hidden="true">
                      <polyline points="9 6 15 12 9 18" />
                    </svg>
                  </div>
                }
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 3v18h18" />
                    <path d="M7 14l3-4 3 3 4-6" />
                  </svg>
                }
              />
            </Group>

            {/* Display Settings */}
            <Group>
              <SettingsRow
                title={t.profile.darkMode}
                rightElement={
                  <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={isDark ? t.profile.themeToLight : t.profile.themeToDark}
                    className="relative h-[28px] w-[52px] rounded-full border border-border-color transition-colors duration-200 cursor-pointer bg-card-bg"
                  >
                    <span
                      className={`absolute top-[2px] h-[22px] w-[22px] rounded-full shadow-sm transition-all duration-200 ${
                        isDark ? "left-[28px] bg-primary" : "left-[2px] bg-foreground/30"
                      }`}
                    />
                  </button>
                }
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                }
              />
              <SettingsRow
                last
                title={t.profile.showTranslation}
                rightElement={
                  <button
                    type="button"
                    onClick={toggleShowTranslation}
                    aria-label={t.profile.showTranslation}
                    className="relative h-[28px] w-[52px] rounded-full border border-border-color transition-colors duration-200 cursor-pointer bg-card-bg"
                  >
                    <span
                      className={`absolute top-[2px] h-[22px] w-[22px] rounded-full shadow-sm transition-all duration-200 ${
                        showTranslation ? "left-[28px] bg-primary" : "left-[2px] bg-foreground/30"
                      }`}
                    />
                  </button>
                }
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 3l14 0M5 9l6 0M5 15l14 0M5 21l6 0" />
                  </svg>
                }
              />
            </Group>

            {/* Log Out */}
            <Group>
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
            </Group>

            {/* Legal footer */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-foreground/60">
              <a href="/terms" className="hover:underline">{t.profile.legalTerms}</a>
              <span>·</span>
              <a href="/privacy" className="hover:underline">{t.profile.legalPrivacy}</a>
            </div>
          </div>
        </div>
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
