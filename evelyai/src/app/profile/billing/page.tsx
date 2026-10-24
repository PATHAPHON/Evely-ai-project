"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStrings } from "@/shared/utils/strings";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { useToast } from "@/shared/components/Toast";
import { clearBudgetExhausted } from "@/shared/hooks/useBudgetExhausted";
import AppShell from "@/shared/components/AppShell";
import SandboxCheckoutModal from "@/shared/components/SandboxCheckoutModal";

/* ── Plan feature lists (hard-coded; no string keys exist yet) ─── */
const FREE_FEATURES = [
  "Basic translations",
  "Limited daily usage",
  "Standard response speed",
];
const PREMIUM_FEATURES = [
  "Unlimited translations",
  "Priority response speed",
  "Advanced vocabulary tools",
  "Extended daily usage quota",
  "Early access to new features",
];

/* ── Inner content (rendered inside Suspense) ────────────────── */
function BillingPageContent() {
  const t = useStrings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { isPremium, isUnlimited, subscriptionStatus, periodEnd, refetchProfile } = useUserProfile();
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSandboxModal, setShowSandboxModal] = useState(false);
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
        router.replace("/profile/billing");
      }
    };

    void syncAndRefresh();
  }, [checkout, sessionId, isMock, refetchProfile, router, showToast]);

  // Manual sync for users who completed payment or need status refreshed
  const handleManualSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/stripe/sync-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        clearBudgetExhausted();
        await refetchProfile();
        showToast("ซิงค์สถานะ Premium สำเร็จแล้ว!", "info");
      } else {
        showToast(
          data.error === "No active subscription found"
            ? "ไม่พบข้อมูลการชำระเงินที่ใช้งานอยู่สำหรับอีเมลนี้"
            : (data.error || "ไม่พบข้อมูลการสมัครสมาชิก"),
          "warning"
        );
      }
    } catch (err) {
      console.error("Manual sync failed:", err);
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setIsSyncing(false);
    }
  }, [refetchProfile, showToast]);

  // User is an active paying Stripe subscriber with an existing subscription
  const hasActiveStripeSub = subscriptionStatus === 'active' && !isUnlimited;

  /* Redirect to Stripe checkout (create checkout session) */
  const handleCheckout = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: window.location.origin,
          returnPath: "/profile/billing",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      console.error("Checkout session error:", data.error);
      showToast(typeof data.error === 'string' ? data.error : 'ไม่สามารถดำเนินการเรื่องการชำระเงินได้ในขณะนี้', 'error');
    } catch (err) {
      console.error("Checkout request failed:", err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /* Redirect to Stripe customer portal (manage existing subscription) */
  const handleManagePortal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: window.location.origin,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      console.error("Billing portal error:", data.error);
      if (data.error === 'No subscription found') {
        showToast('ไม่พบข้อมูลการสมัครสมาชิกใน Stripe สำหรับบัญชีนี้', 'warning');
        setShowSandboxModal(true);
      } else {
        showToast(typeof data.error === 'string' ? data.error : 'ไม่สามารถเปิดหน้าจัดการการเรียกเก็บเงินได้', 'error');
      }
    } catch (err) {
      console.error("Portal request failed:", err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /* Primary action click handler */
  const handleClickAction = useCallback(() => {
    if (hasActiveStripeSub) {
      void handleManagePortal();
    } else {
      setShowSandboxModal(true);
    }
  }, [hasActiveStripeSub, handleManagePortal]);

  const expiryText = periodEnd
    ? new Date(periodEnd).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const features = (isPremium || isUnlimited) ? PREMIUM_FEATURES : FREE_FEATURES;

  return (
    <AppShell
      title={t.profile.billing}
      showBackButton
      backPath="/profile"
      showNewChatButton={false}
    >
      <div className="relative flex-1 flex w-full select-none flex-col overflow-hidden bg-background font-sans text-foreground">
        <div className="flex-1 overflow-y-auto">
          <div className="animate-card-fade-in max-w-md mx-auto w-full px-4 py-6 flex flex-col gap-5">

            {/* ── Syncing banner ── */}
            {isSyncing && (
              <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-primary animate-pulse">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent shrink-0" />
                <div className="min-w-0 flex-1 text-xs font-bold text-left">
                  กำลังซิงค์สถานะการสมัครสมาชิกกับ Stripe...
                </div>
              </div>
            )}

            {/* ── Main billing card ─────────────────────────── */}
            <div className="rounded-2xl border border-border-color bg-card-bg shadow-soft-md p-5 flex flex-col items-center text-center">

              {/* Dollar circle icon */}
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-bg text-primary">
                <svg
                  width="28"
                  height="28"
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

              {/* Plan badge */}
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                  isUnlimited
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : isPremium
                    ? "bg-warning/10 text-warning"
                    : "bg-background border border-border-color text-foreground/75"
                }`}
              >
                {isUnlimited ? "Admin / Unlimited" : isPremium ? t.profile.planPremium : t.profile.planFree}
              </span>

              {/* Plan description or Expiry */}
              {isUnlimited ? (
                <p className="mt-2 text-xs text-primary font-semibold">
                  สิทธิ์ผู้ดูแลระบบ (Admin) • ใช้งานได้ไม่จำกัด
                </p>
              ) : isPremium && expiryText ? (
                <p className="mt-2 text-xs text-foreground/70">
                  {t.profile.expiresOn} {expiryText}
                </p>
              ) : null}

              {/* Feature list */}
              <ul className="mt-5 w-full space-y-2 text-left">
                {features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <svg
                      className="mt-0.5 shrink-0 text-primary"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {feat}
                  </li>
                ))}
              </ul>

              {/* Big action button */}
              <button
                type="button"
                onClick={handleClickAction}
                disabled={loading || isSyncing}
                className="mt-6 w-full rounded-xl bg-primary hover:bg-primary-hover px-4 py-3 text-sm font-bold text-white dark:text-gray-900 shadow-soft-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? t.common.loading
                  : hasActiveStripeSub
                    ? t.profile.manageBilling
                    : isUnlimited
                    ? "ทดสอบชำระเงิน (Sandbox)"
                    : t.profile.upgradePremium}
              </button>

              {!hasActiveStripeSub && (
                <p className="mt-3 text-[11px] text-foreground/50">
                  (ระบบทดสอบ Sandbox พร้อมบัตรตัวอย่าง)
                </p>
              )}

              {/* Manual sync button */}
              <div className="mt-4 pt-3 border-t border-border-color/60 w-full flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing || loading}
                  className="text-xs font-semibold text-foreground/60 hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5 py-1 disabled:opacity-50"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={isSyncing ? "animate-spin" : ""}
                  >
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <span>{isSyncing ? "กำลังตรวจสอบสถานะกับ Stripe..." : "ซิงค์สถานะการชำระเงินกับ Stripe"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sandbox Payment test credentials modal */}
        <SandboxCheckoutModal
          isOpen={showSandboxModal}
          onClose={() => setShowSandboxModal(false)}
          onConfirm={handleCheckout}
          loading={loading}
        />
      </div>
    </AppShell>
  );
}

/* ── Page export with Suspense boundary ──────────────────────── */
export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingPageContent />
    </Suspense>
  );
}
