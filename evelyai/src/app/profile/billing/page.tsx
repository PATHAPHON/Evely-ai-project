"use client";

import { useState, useCallback, Suspense } from "react";
import { useStrings } from "@/shared/utils/strings";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { useToast } from "@/shared/components/Toast";
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
  const { showToast } = useToast();
  const { isPremium, isUnlimited, subscriptionStatus, periodEnd } = useUserProfile();
  const [loading, setLoading] = useState(false);
  const [showSandboxModal, setShowSandboxModal] = useState(false);

  // User is an active paying Stripe subscriber with an existing subscription
  const hasActiveStripeSub = subscriptionStatus === 'active' && !isUnlimited;

  /* Redirect to Stripe checkout (create checkout session) */
  const handleCheckout = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", { method: "POST" });
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
      const res = await fetch("/api/stripe/portal", { method: "POST" });
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
                disabled={loading}
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
