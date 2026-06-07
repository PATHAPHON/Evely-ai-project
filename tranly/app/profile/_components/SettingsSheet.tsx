"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { version } from "@/package.json";
import { useStrings } from "@/app/_lib/strings";
import { supabase } from "@/app/_lib/supabaseClient";
import BottomSheet from "./BottomSheet";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  onEditProfile: () => void;
  onOpenPreferences: () => void;
  onOpenDanger: () => void;
}

interface RowProps {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  onClick: () => void;
  danger?: boolean;
  last?: boolean;
}

function SettingsRow({ icon, title, desc, onClick, danger, last }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer ${
        last ? "" : "border-b-3 border-border-color"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          danger ? "bg-accent-red/15 text-accent-red" : "bg-accent-green/15 text-accent-green"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-bold ${danger ? "text-accent-red" : "text-text-primary"}`}>
          {title}
        </span>
        {desc && <span className="mt-0.5 block text-xs text-text-secondary">{desc}</span>}
      </span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className={`shrink-0 ${danger ? "text-accent-red" : "text-text-secondary"}`} aria-hidden="true">
        <polyline points="9 6 15 12 9 18" />
      </svg>
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-4 mt-4">
      <div className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-text-secondary">
        {title}
      </div>
      <div className="overflow-hidden rounded-2xl border-3 border-border-color bg-card-bg shadow-nb-md">
        {children}
      </div>
    </div>
  );
}

/** Settings bottom sheet linking to the real preferences / AI / danger routes. */
export default function SettingsSheet({
  open,
  onClose,
  onEditProfile,
  onOpenPreferences,
  onOpenDanger,
}: SettingsSheetProps) {
  const router = useRouter();
  const t = useStrings();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !user.is_anonymous) {
          setEmail(user.email || null);
        } else {
          setEmail(null);
        }
      } catch (err) {
        console.error("Error checking user in SettingsSheet:", err);
      }
    };
    if (open) {
      checkUser();
    }
  }, [open]);

  // Close this sheet first, then open the requested detail popup.
  const openDetail = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t.profile.settings}
      ariaLabel={t.profile.settings}
      closeAria={t.profile.closeAria}
      heightClass="max-h-[80%]"
    >
      <div className="pb-6">
        <Group title={t.profile.account}>
          <SettingsRow
            title={t.profile.accountItem}
            desc={t.profile.accountDesc}
            onClick={openDetail(onEditProfile)}
            icon={
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
              </svg>
            }
          />
          {email ? (
            <SettingsRow
              last
              danger
              title={t.auth.logoutBtn}
              desc={`${t.auth.loggedInAs}: ${email}`}
              onClick={async () => {
                onClose();
                try {
                  await supabase.auth.signOut();
                } catch (err) {
                  console.error("Failed to sign out:", err);
                }
              }}
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
              desc={t.auth.anonymousAccountNotice}
              onClick={() => {
                onClose();
                router.push("/auth");
              }}
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

        <Group title={t.profile.settings}>
          <SettingsRow
            last
            title={t.profile.generalSection}
            desc={t.profile.generalDesc}
            onClick={openDetail(onOpenPreferences)}
            icon={
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            }
          />
        </Group>

        <Group title={t.profile.dangerZone}>
          <SettingsRow
            last
            danger
            title={t.profile.dangerZone}
            desc={t.profile.dangerDesc}
            onClick={openDetail(onOpenDanger)}
            icon={
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
            }
          />
        </Group>

        <div className="mt-5 text-center font-mono text-xs text-text-meta">
          Tarnly · v{version}
        </div>
      </div>
    </BottomSheet>
  );
}
