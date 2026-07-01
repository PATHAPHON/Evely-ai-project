"use client";

import { useState, useCallback, Suspense } from "react";
import { useStrings } from "@/app/_lib/utils/strings";
import { useUserProfile } from "@/app/_lib/hooks/useUserProfile";
import GeminiLayout from "@/app/_components/GeminiLayout";

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
  const { isPremium, periodEnd } = useUserProfile();
  const [loading, setLoading] = useState(false);

  /* Redirect to Stripe portal (manage) or checkout (upgrade) */
  const handleBilling = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isPremium
        ? "/api/stripe/portal"
        : "/api/stripe/create-checkout-session";
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      console.error("Billing error:", data.error);
    } catch (err) {
      console.error("Billing request failed:", err);
    } finally {
      setLoading(false);
    }
  }, [isPremium]);

  const expiryText = periodEnd
    ? new Date(periodEnd).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const features = isPremium ? PREMIUM_FEATURES : FREE_FEATURES;

  return (
    <GeminiLayout
      title={t.profile.billing}
      showBackButton
      backPath="/profile"
      showNewChatButton={false}
    >
      <div className="relative flex-1 flex w-full select-none flex-col overflow-hidden bg-background font-sans text-foreground">
        {/* fadeInUp keyframe — mirrors profile/page.tsx */}
        <style>{`
          @keyframes cardFadeInUp { from { opacity:0; transform:translateY(12px);} to { opacity:1; transform:translateY(0);} }
          .animate-card-fade-in { animation: cardFadeInUp 0.45s cubic-bezier(0.215,0.61,0.355,1) forwards; }
        `}</style>

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
                  isPremium
                    ? "bg-warning/10 text-warning"
                    : "bg-background border border-border-color text-foreground/75"
                }`}
              >
                {isPremium ? t.profile.planPremium : t.profile.planFree}
              </span>

              {/* Expiry (premium only) */}
              {isPremium && expiryText && (
                <p className="mt-2 text-xs text-foreground/70">
                  {t.profile.expiresOn} {expiryText}
                </p>
              )}

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
                onClick={handleBilling}
                disabled={loading}
                className="mt-6 w-full rounded-xl bg-primary hover:bg-primary-hover px-4 py-3 text-sm font-bold text-white dark:text-gray-900 shadow-soft-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? t.common.loading
                  : isPremium
                    ? t.profile.manageBilling
                    : t.profile.upgradePremium}
              </button>
            </div>
          </div>
        </div>
      </div>
    </GeminiLayout>
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
