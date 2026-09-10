"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useStrings } from "@/shared/utils/strings";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { useToast } from "@/shared/components/Toast";
import { clearBudgetExhausted } from "@/shared/hooks/useBudgetExhausted";
import { DAILY_BUDGET_MICROBAHT } from "@/app/api/_lib/utils/tokenCost";
import { computeUsagePct, usageBarColor, usageTextColor } from "@/shared/utils/usage";
import AppShell from "@/shared/components/AppShell";

function UsagePageContent() {
  const t = useStrings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { isPremium, isUnlimited, energySpent, refetchProfile } = useUserProfile();

  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const hasSyncedRef = useRef(false);

  const checkout = searchParams.get("checkout");
  const sessionId = searchParams.get("session_id");
  const isMock = searchParams.get("mock") === "1";

  // Auto-sync after Stripe checkout redirect
  useEffect(() => {
    if (checkout !== "success" || hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    setIsSyncing(true);

    const syncAndRefresh = async () => {
      try {
        const res = await fetch("/api/stripe/sync-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, isMock }),
        });

        if (res.ok) {
          clearBudgetExhausted();
          await refetchProfile();
          showToast("อัปเกรด Premium สำเร็จ! ได้รับงบ AI 50,000 tokens ต่อวันแล้ว", "info");
        } else {
          showToast("ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง", "error");
        }
      } catch (err) {
        console.error("Sync error:", err);
        showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
      } finally {
        setIsSyncing(false);
        router.replace("/profile/usage");
      }
    };

    void syncAndRefresh();
  }, [checkout, sessionId, isMock, refetchProfile, router, showToast]);

  // Upgrade directly from usage page
  const handleUpgrade = useCallback(async () => {
    setIsUpgrading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      showToast(data.error || "Failed to start checkout", "error");
    } catch (err) {
      console.error("Upgrade error:", err);
      showToast("Network error", "error");
    } finally {
      setIsUpgrading(false);
    }
  }, [showToast]);

  const usageLimit = isUnlimited
    ? Infinity
    : isPremium
    ? DAILY_BUDGET_MICROBAHT.premium
    : DAILY_BUDGET_MICROBAHT.free;
  const usagePct = isUnlimited ? 0 : computeUsagePct(energySpent, usageLimit);
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

            {/* ── Syncing banner ── */}
            {isSyncing && (
              <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-primary animate-pulse">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent shrink-0" />
                <div className="min-w-0 flex-1 text-xs font-bold">
                  กำลังอัปเดตสถานะ Premium และงบ AI...
                </div>
              </div>
            )}

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
                    / {isUnlimited ? "∞ (ไม่จำกัด)" : `${usageLimit.toLocaleString()} tokens`}
                  </span>
                </p>
                <span className={`text-sm font-bold tabular-nums ${isUnlimited ? 'text-primary' : usageTextColor(usagePct)}`}>
                  {isUnlimited ? "Unlimited" : `${usagePct}%`}
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
                    isUnlimited
                      ? "bg-primary/10 text-primary"
                      : isPremium
                      ? "bg-warning/10 text-warning"
                      : "bg-background border border-border-color text-foreground/75"
                  }`}
                >
                  {isUnlimited ? "Admin / Unlimited" : isPremium ? t.profile.planPremium : t.profile.planFree}
                </span>
              </div>

              {/* Explanation */}
              <p className="text-[13px] leading-relaxed text-foreground/70">
                {isUnlimited ? (
                  <>
                    คุณได้รับสิทธิ์ <strong className="text-foreground">Unlimited (Admin)</strong> ใช้งาน Token และ AI ได้อย่างไม่จำกัด
                  </>
                ) : isPremium ? (
                  <>
                    คุณใช้แพลน <strong className="text-foreground">Premium</strong> ที่มีงบ AI{" "}
                    <strong className="text-foreground tabular-nums">
                      {DAILY_BUDGET_MICROBAHT.premium.toLocaleString()} tokens
                    </strong>{" "}
                    ต่อวัน งบจะรีเซ็ตใหม่ทุกเที่ยงคืน
                  </>
                ) : (
                  <>
                    คุณใช้แพลน <strong className="text-foreground">Free</strong> ที่มีงบ AI{" "}
                    <strong className="text-foreground tabular-nums">
                      {DAILY_BUDGET_MICROBAHT.free.toLocaleString()} tokens
                    </strong>{" "}
                    ต่อวัน งบจะรีเซ็ตใหม่ทุกเที่ยงคืน
                  </>
                )}
              </p>

              {/* Upgrade box with action button for free users */}
              {!isPremium && !isUnlimited && (
                <div className="mt-4 rounded-xl bg-primary-bg border border-primary/10 p-4">
                  <div className="flex items-center gap-3">
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
                          {DAILY_BUDGET_MICROBAHT.premium.toLocaleString()} tokens
                        </strong>{" "}
                        ต่อวัน
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleUpgrade}
                    disabled={isUpgrading || isSyncing}
                    className="mt-3.5 w-full rounded-xl bg-primary hover:bg-primary-hover px-4 py-2.5 text-xs font-bold text-white dark:text-gray-900 shadow-soft-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUpgrading ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white dark:border-gray-900 border-t-transparent" />
                        <span>{t.common.loading}</span>
                      </>
                    ) : (
                      <span>{t.profile.upgradePremium}</span>
                    )}
                  </button>
                </div>
              )}

              {/* Manage subscription link for premium users */}
              {isPremium && (
                <div className="mt-4 pt-3 border-t border-border-color flex items-center justify-between">
                  <span className="text-xs text-foreground/70">{t.profile.billing}</span>
                  <button
                    type="button"
                    onClick={() => router.push("/profile/billing")}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {t.profile.manageBilling}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="9 6 15 12 9 18" />
                    </svg>
                  </button>
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
