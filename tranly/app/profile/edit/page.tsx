"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/_lib/supabase/supabaseClient";
import { useStrings } from "@/app/_lib/utils/strings";
import { useUserProfile } from "@/app/_lib/hooks/useUserProfile";
import AppShell from "@/app/_components/AppShell";
import SlothMascot from "../_components/SlothMascot";

const fieldClass =
  "w-full rounded-xl border border-border-color bg-background px-3.5 py-3 text-[15px] text-foreground outline-none transition-all focus:border-primary focus:shadow-soft-sm";
const labelClass =
  "mb-2 block text-xs font-bold uppercase tracking-wide text-foreground/70";

function EditProfilePageContent() {
  const t = useStrings();
  const router = useRouter();
  const profile = useUserProfile();

  const [name, setName] = useState(profile.displayName);

  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync fields from profile on first meaningful load
  const [synced, setSynced] = useState(false);
  if (
    !synced &&
    profile.displayName &&
    profile.displayName !== "Learner"
  ) {
    setSynced(true);
    setName(profile.displayName);
  }

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 1800);
  }, []);

  const handleSave = useCallback(() => {
    setSaving(true);
    profile.updateProfile({
      displayName: name,
    });
    showToast(t.profile.saved);
    setTimeout(() => {
      router.push("/profile");
    }, 600);
  }, [profile, name, showToast, t.profile.saved, router]);

  const handleCancel = useCallback(() => {
    router.push("/profile");
  }, [router]);

  const handleDeleteAccount = useCallback(async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      await supabase.auth.signOut();
      router.push("/auth");
    } catch {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteInput("");
    }
  }, [router]);

  return (
    <AppShell
      title={t.profile.editProfile}
      showBackButton
      backPath="/profile"
      showNewChatButton={false}
    >
      <div className="relative flex-1 flex w-full select-none flex-col overflow-hidden bg-background font-sans text-foreground">
        <style>{`
          @keyframes cardFadeInUp { from { opacity:0; transform:translateY(12px);} to { opacity:1; transform:translateY(0);} }
          .animate-card-fade-in { animation: cardFadeInUp 0.45s cubic-bezier(0.215,0.61,0.355,1) forwards; }
        `}</style>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="animate-card-fade-in max-w-md mx-auto w-full px-4 py-6">
            <div className="flex flex-col gap-5">
              {/* Avatar preview */}
              <div className="flex flex-col items-center gap-3 pt-2 pb-1">
                <div className="relative">
                  <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full border-2 border-primary-bg bg-gradient-to-br from-primary-bg to-card-bg shadow-soft-md">
                    <SlothMascot size={56} interactive />
                  </div>
                  {/* Camera badge */}
                  <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary shadow-soft-sm ring-2 ring-background">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className={labelClass} htmlFor="ep-name">
                  {t.profile.displayNameLabel}
                </label>
                <input
                  id="ep-name"
                  className={fieldClass}
                  type="text"
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* ─── Danger Zone ─── */}
              <div className="mt-6 rounded-2xl border border-incorrect/20 bg-incorrect/5 p-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-incorrect" aria-hidden="true">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-wide text-incorrect">
                    {t.profile.deleteAccount}
                  </span>
                </div>
                <p className="mb-3 text-xs leading-relaxed text-foreground/70">
                  {t.profile.deleteAccountWarning}
                </p>

                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="rounded-xl border border-incorrect/35 bg-incorrect/5 px-4 py-2.5 text-xs font-bold text-incorrect transition-all hover:bg-incorrect/15 active:scale-[0.98] cursor-pointer"
                  >
                    {t.profile.deleteAccount}
                  </button>
                ) : (
                  <div className="flex flex-col gap-2.5 animate-card-fade-in">
                    <p className="text-xs text-foreground/70">
                      พิมพ์ &ldquo;
                      <strong className="text-incorrect">
                        {t.profile.deleteAccountConfirmWord}
                      </strong>
                      &rdquo; เพื่อยืนยันการลบ
                    </p>
                    <input
                      className={`${fieldClass} border-incorrect/40 focus:border-incorrect`}
                      type="text"
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder={t.profile.deleteAccountConfirmWord}
                      disabled={isDeleting}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteInput("");
                        }}
                        className="flex-1 rounded-xl border border-border-color bg-background py-2.5 text-xs font-bold text-foreground/80 transition-all hover:bg-card-bg/60 active:scale-[0.98] cursor-pointer"
                        disabled={isDeleting}
                      >
                        {t.profile.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={
                          deleteInput !== t.profile.deleteAccountConfirmWord ||
                          isDeleting
                        }
                        className="flex-1 rounded-xl bg-incorrect py-2.5 text-xs font-bold text-white dark:text-gray-900 shadow-soft-sm disabled:opacity-40 transition-all active:scale-[0.98] cursor-pointer"
                      >
                        {isDeleting
                          ? t.common.loading
                          : t.profile.deleteAccountBtn}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom spacer for sticky bar */}
              <div className="h-24" />
            </div>
          </div>
        </div>

        {/* Sticky Save / Cancel footer */}
        <div className="sticky bottom-0 left-0 right-0 border-t border-border-color bg-background/80 backdrop-blur-xl" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="max-w-md mx-auto w-full px-4 pt-3 pb-1 flex gap-2.5">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 rounded-xl border border-border-color bg-background py-3 text-sm font-bold text-foreground/80 shadow-soft-sm transition-all hover:bg-card-bg/60 active:scale-[0.98] cursor-pointer"
            >
              {t.profile.cancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl bg-primary hover:bg-primary-hover py-3 text-sm font-bold text-white dark:text-gray-900 shadow-soft-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? t.common.loading : t.profile.save}
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="pointer-events-none absolute bottom-[100px] left-1/2 z-[60] -translate-x-1/2 rounded-full bg-foreground text-background px-5 py-2 text-sm font-semibold shadow-soft-lg backdrop-blur-sm animate-card-fade-in">
            {toastMsg}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function EditProfilePage() {
  return (
    <Suspense fallback={null}>
      <EditProfilePageContent />
    </Suspense>
  );
}
