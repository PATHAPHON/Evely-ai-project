"use client";

import { Suspense } from "react";
import { useStrings } from "@/app/_lib/utils/strings";
import { useUserProfile } from "@/app/_lib/hooks/useUserProfile";
import { DAILY_BUDGET_MICROBAHT } from "@/app/api/_lib/utils/tokenCost";
import { computeUsagePct, usageBarColor, usageTextColor } from "@/app/_lib/utils/usage";
import AppShell from "@/app/_components/AppShell";

function UsagePageContent() {
  const t = useStrings();
  const { isPremium, energySpent } = useUserProfile();

  const usageLimit = isPremium
    ? DAILY_BUDGET_MICROBAHT.premium
    : DAILY_BUDGET_MICROBAHT.free;
  const usagePct = computeUsagePct(energySpent, usageLimit);
  const barColor = usageBarColor(usagePct);

  return (
    <AppShell
      title={t.profile.usageToday}
      showBackButton
      backPath="/profile"
      showNewChatButton={false}
    >
      <div className="relative flex-1 flex w-full select-none flex-col overflow-hidden bg-background font-sans text-foreground">
        <div className="flex-1 overflow-y-auto">
          <div className="animate-card-fade-in flex flex-col gap-4 pt-4 pb-12 max-w-md mx-auto w-full px-4">

            {/* ── Main usage card ── */}
            <div className="rounded-2xl border border-border-color bg-card-bg p-5 shadow-soft-sm">
              {/* Icon + heading */}
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-bg text-primary">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 3v18h18" />
                    <path d="M7 14l3-4 3 3 4-6" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-foreground">
                    {t.profile.usageToday}
                  </h2>
                </div>
              </div>

              {/* Numbers */}
              <div className="flex items-end justify-between mb-2">
                <p className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
                  {energySpent.toLocaleString()}{" "}
                  <span className="text-sm font-semibold text-foreground/60">
                    / {usageLimit.toLocaleString()}
                  </span>
                </p>
                <span className={`text-sm font-bold tabular-nums ${usageTextColor(usagePct)}`}>
                  {usagePct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-border-color">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>

              {/* Reset notice */}
              <p className="mt-3 text-xs text-foreground/60 flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="shrink-0 opacity-60"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {t.profile.usageResetMidnight}
              </p>
            </div>

            {/* ── Info / plan card ── */}
            <div className="rounded-2xl border border-border-color bg-card-bg p-5 shadow-soft-sm">
              {/* Plan badge row */}
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-bg text-primary">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M14.5 9a2.5 2.5 0 0 0-2.5-1.5c-1.4 0-2.5.8-2.5 2s1.1 1.8 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2A2.5 2.5 0 0 1 9.5 15M12 6v1.5M12 16.5V18" />
                  </svg>
                </span>
                <span className="text-sm font-bold text-foreground">
                  {t.profile.billing}
                </span>
                <span
                  className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    isPremium
                      ? "bg-warning/10 text-warning"
                      : "bg-background border border-border-color text-foreground/75"
                  }`}
                >
                  {isPremium ? t.profile.planPremium : t.profile.planFree}
                </span>
              </div>

              {/* Explanation */}
              <p className="text-[13px] leading-relaxed text-foreground/70">
                {isPremium ? (
                  <>
                    คุณใช้แพลน <strong className="text-foreground">Premium</strong> ที่มีงบ AI{" "}
                    <strong className="text-foreground tabular-nums">
                      {DAILY_BUDGET_MICROBAHT.premium.toLocaleString()}
                    </strong>{" "}
                    ต่อวัน งบจะรีเซ็ตใหม่ทุกเที่ยงคืน
                  </>
                ) : (
                  <>
                    คุณใช้แพลน <strong className="text-foreground">Free</strong> ที่มีงบ AI{" "}
                    <strong className="text-foreground tabular-nums">
                      {DAILY_BUDGET_MICROBAHT.free.toLocaleString()}
                    </strong>{" "}
                    ต่อวัน งบจะรีเซ็ตใหม่ทุกเที่ยงคืน
                  </>
                )}
              </p>

              {/* Upgrade hint for free users */}
              {!isPremium && (
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-primary-bg border border-primary/10 p-3.5">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-primary"
                    aria-hidden="true"
                  >
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-primary">
                      {t.profile.upgradePremium}
                    </p>
                    <p className="text-[11px] text-primary/70 mt-0.5">
                      ได้รับงบ AI เพิ่มเป็น{" "}
                      <strong className="tabular-nums">
                        {DAILY_BUDGET_MICROBAHT.premium.toLocaleString()}
                      </strong>{" "}
                      ต่อวัน
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function UsagePage() {
  return (
    <Suspense fallback={null}>
      <UsagePageContent />
    </Suspense>
  );
}
