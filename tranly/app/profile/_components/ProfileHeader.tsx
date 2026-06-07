"use client";

import { useStrings } from "@/app/_lib/strings";
import type { UseUserProfileReturn } from "@/app/_lib/useUserProfile";
import SlothMascot from "./SlothMascot";

interface ProfileHeaderProps {
  profile: UseUserProfileReturn;
  onEdit: () => void;
  onShare: () => void;
  onOpenViewer: () => void;
}

/**
 * Profile identity block: tappable avatar + name row that opens the full
 * profile viewer, plus Edit / Share actions. Neobrutalist styling throughout.
 */
export default function ProfileHeader({
  profile,
  onEdit,
  onShare,
  onOpenViewer,
}: ProfileHeaderProps) {
  const t = useStrings();
  const { displayName, handle, role, bio, location } = profile;

  return (
    <div className="flex flex-col gap-4">
      {/* Tappable identity row */}
      <button
        type="button"
        onClick={onOpenViewer}
        aria-label={t.profile.viewProfileAria}
        className="-mx-2 flex items-center gap-4 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer"
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-3 border-border-color bg-accent-pink-bg shadow-nb-md">
          <SlothMascot size={44} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-extrabold text-text-primary">
            {displayName}
          </h2>
          {handle && (
            <p className="truncate font-mono text-sm text-text-secondary">
              @{handle}
            </p>
          )}
          {role && (
            <span className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-accent-green/15 px-2.5 py-1 text-xs font-bold text-accent-green">
              {role}
            </span>
          )}
        </div>

        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          className="shrink-0 text-text-secondary" aria-hidden="true"
        >
          <polyline points="9 6 15 12 9 18" />
        </svg>
      </button>

      {/* Bio + location */}
      <p className="text-sm leading-relaxed text-text-secondary">
        {bio || t.profile.noBio}
        {location && (
          <>
            <br />
            <span className="text-text-meta">📍 {location}</span>
          </>
        )}
      </p>

      {/* Actions */}
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-3 border-border-color bg-accent-green px-3 py-2.5 text-sm font-extrabold text-text-primary shadow-nb-sm transition-transform active:translate-y-[2px] active:shadow-none cursor-pointer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          {t.profile.editProfile}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-3 border-border-color bg-card-bg px-3 py-2.5 text-sm font-extrabold text-text-primary shadow-nb-sm transition-transform active:translate-y-[2px] active:shadow-none cursor-pointer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
          </svg>
          {t.profile.shareProfile}
        </button>
      </div>
    </div>
  );
}
