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
        className={`relative w-full overflow-hidden rounded-3xl border border-gray-250 dark:border-gray-800 bg-white dark:bg-[#1e1f20] shadow-2xl transition-all duration-300 ${
          open ? "scale-100 translate-y-0" : "scale-95 translate-y-3"
        }`}
      >
        {/* Cover */}
        <div className="relative h-24 bg-gradient-to-r from-blue-500 to-teal-500">
          <button
            type="button"
            onClick={onClose}
            aria-label={t.profile.closeAria}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 hover:bg-black/35 text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="absolute -bottom-10 left-1/2 flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full border border-gray-250 dark:border-gray-800 bg-pink-50/50 dark:bg-pink-950/20 shadow-md">
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
            <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
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
        <div className={`mx-6 mt-4 grid grid-cols-${stats.length} border-t border-gray-150 dark:border-gray-800`}>
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`px-2 py-3 text-center ${
                i < stats.length - 1 ? "border-r border-gray-150 dark:border-gray-800" : ""
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
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 text-sm font-bold shadow-sm transition-all active:scale-98 cursor-pointer"
          >
            {t.profile.editProfile}
          </button>
          <button
            type="button"
            onClick={onShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-250 dark:border-gray-800 bg-white dark:bg-[#1e1f20] text-gray-700 dark:text-gray-200 px-3 py-2.5 text-sm font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-98 cursor-pointer"
          >
            {t.profile.shareProfile}
          </button>
        </div>
      </div>
    </div>
  );
}
