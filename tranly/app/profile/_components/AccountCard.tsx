"use client";

import { useEffect, useState } from "react";
import { useStrings } from "@/app/_lib/strings";
import { supabase } from "@/app/_lib/supabaseClient";
import type { UseUserProfileReturn } from "@/app/_lib/useUserProfile";
import SlothMascot from "./SlothMascot";

interface AccountCardProps {
  profile: UseUserProfileReturn;
  onOpenViewer: () => void;
}

/**
 * Account identity card shown at the top of the profile page (ChatGPT-style):
 * avatar + display name / email, with a login-status badge on the right.
 * Tapping the card opens the full profile viewer.
 */
export default function AccountCard({ profile, onOpenViewer }: AccountCardProps) {
  const t = useStrings();
  const { displayName } = profile;
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;
        setEmail(user && !user.is_anonymous ? user.email || null : null);
      } catch (err) {
        console.error("Error checking user in AccountCard:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const isMember = Boolean(email);
  const subtitle = email || t.auth.anonymousAccountNotice;

  return (
    <button
      type="button"
      onClick={onOpenViewer}
      aria-label={t.profile.viewProfileAria}
      className="flex w-full items-center gap-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e1f20] px-4 py-3.5 text-left shadow-sm transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-pink-100 dark:border-pink-900 bg-pink-50/50 dark:bg-pink-950/20">
        <SlothMascot size={34} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-extrabold text-text-primary">
          {displayName}
        </p>
        <p className="truncate text-xs text-text-secondary">{subtitle}</p>
      </div>

      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
          isMember
            ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-950"
            : "border border-gray-200 dark:border-gray-700 text-text-secondary"
        }`}
      >
        {isMember ? t.profile.badgeMember : t.profile.badgeGuest}
      </span>
    </button>
  );
}
