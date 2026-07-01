"use client";

import { useEffect, useState } from "react";
import { useStrings } from "@/app/_lib/utils/strings";
import { supabase } from "@/app/_lib/supabase/supabaseClient";
import type { UseUserProfileReturn } from "@/app/_lib/hooks/useUserProfile";
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
        setEmail(user?.email || null);
      } catch (err) {
        console.error("Error checking user in AccountCard:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const subtitle = email || '';

  return (
    <button
      type="button"
      onClick={onOpenViewer}
      aria-label={t.profile.viewProfileAria}
      className="flex w-full items-center gap-3.5 rounded-2xl border border-border-color bg-card-bg px-4 py-3.5 text-left shadow-soft-sm transition-colors hover:bg-card-bg/70 cursor-pointer"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary-bg bg-primary-bg/40">
        <SlothMascot size={34} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-extrabold text-foreground">
          {displayName}
        </p>
        <p className="truncate text-xs text-foreground/70">{subtitle}</p>
      </div>

      <span className="shrink-0 rounded-full px-3 py-1 text-xs font-bold bg-foreground text-background">
        {t.profile.badgeMember}
      </span>
    </button>
  );
}
