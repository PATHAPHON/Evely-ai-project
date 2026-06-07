"use client";

import { useEffect } from "react";
import { useStrings } from "@/app/_lib/strings";
import type { UseUserProfileReturn } from "@/app/_lib/useUserProfile";
import SlothMascot from "./SlothMascot";

interface ProfileViewerModalProps {
  open: boolean;
  onClose: () => void;
  profile: UseUserProfileReturn;
  stats: { n: number; label: string }[];
  onEdit: () => void;
  onShare: () => void;
}

/**
 * Centered "business card" viewer for the full profile. Opens from the header
 * row; closes on backdrop tap or Escape.
 */
export default function ProfileViewerModal({
  open,
  onClose,
  profile,
  stats,
  onEdit,
  onShare,
}: ProfileViewerModalProps) {
  const t = useStrings();
  const { displayName, handle, role, bio, location } = profile;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`absolute inset-0 z-50 grid place-items-center p-6 transition-opacity duration-200 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.profile.viewProfileAria}
        className={`relative w-full overflow-hidden rounded-2xl border-3 border-border-color bg-card-bg shadow-nb-lg transition-all duration-300 ${
          open ? "scale-100 translate-y-0" : "scale-95 translate-y-3"
        }`}
      >
        {/* Cover */}
        <div className="relative h-24 border-b-3 border-border-color bg-accent-green">
          <button
            type="button"
            onClick={onClose}
            aria-label={t.profile.closeAria}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border-3 border-border-color bg-card-bg text-text-primary shadow-nb-sm active:translate-y-[2px] active:shadow-none cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="absolute -bottom-10 left-1/2 flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full border-3 border-border-color bg-accent-pink-bg shadow-nb-md">
            <SlothMascot size={56} />
          </div>
        </div>

        {/* Info */}
        <div className="px-6 pb-2 pt-12 text-center">
          <h2 className="text-xl font-extrabold text-text-primary">{displayName}</h2>
          {handle && (
            <p className="mt-0.5 font-mono text-sm text-text-secondary">@{handle}</p>
          )}
          {role && (
            <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-accent-green/15 px-3 py-1 text-xs font-bold text-accent-green">
              {role}
            </span>
          )}
          {(bio || location) && (
            <p className="mt-3.5 text-sm leading-relaxed text-text-secondary">
              {bio}
              {bio && location && " · "}
              {location && <span className="text-text-meta">📍 {location}</span>}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="mx-6 mt-4 grid grid-cols-3 border-t-3 border-border-color">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`px-2 py-3 text-center ${
                i < stats.length - 1 ? "border-r-3 border-border-color" : ""
              }`}
            >
              <div className="text-lg font-extrabold text-text-primary tabular-nums">
                {s.n}
              </div>
              <div className="mt-0.5 text-xs text-text-secondary">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 p-5">
          <button
            type="button"
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-3 border-border-color bg-accent-green px-3 py-2.5 text-sm font-extrabold text-text-primary shadow-nb-sm active:translate-y-[2px] active:shadow-none cursor-pointer"
          >
            {t.profile.editProfile}
          </button>
          <button
            type="button"
            onClick={onShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-3 border-border-color bg-card-bg px-3 py-2.5 text-sm font-extrabold text-text-primary shadow-nb-sm active:translate-y-[2px] active:shadow-none cursor-pointer"
          >
            {t.profile.shareProfile}
          </button>
        </div>
      </div>
    </div>
  );
}
