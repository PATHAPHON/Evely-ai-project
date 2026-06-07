"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStrings } from "@/app/_lib/strings";

export type BottomNavTab = "home" | "library" | "word" | "chat" | "topik" | "profile";

/**
 * Shared bottom navigation bar (Neobrutalist 5-tab layout).
 *
 * Tabs: Daily · Words · Evely (center) · TOPIK · More.
 * The center slot is the prominent Evely button (navigates to /chat). Pass
 * `active` to highlight the current page's tab.
 */
export default function BottomNav({ active }: { active: BottomNavTab }) {
  const router = useRouter();
  const t = useStrings();
  const [menuOpen, setMenuOpen] = useState(false);

  const iconSpan = (isActive: boolean) =>
    `w-10 h-10 flex items-center justify-center rounded-xl transition-all${
      isActive
        ? " bg-accent-pink-bg border-3 border-border-color shadow-nb-sm"
        : ""
    }`;

  const tabClass = (isActive: boolean) =>
    `flex flex-col items-center gap-1 cursor-pointer transition-colors ${
      isActive ? "text-text-primary" : "text-text-secondary"
    }`;

  return (
    <div
      className="absolute left-4 right-4 h-[80px] bg-card-bg border-3 border-border-color p-[8px_8px_14px] grid grid-cols-5 z-40 rounded-2xl shadow-nb-md"
      style={{ bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Tab: Home */}
      <a
        className={tabClass(active === "home")}
        onClick={active === "home" ? undefined : () => router.push("/home")}
      >
        <span className={iconSpan(active === "home")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
          </svg>
        </span>
        <span className="text-[11px] font-bold tracking-wider">{t.common.tabHome}</span>
      </a>

      {/* Tab: Word (saved words) */}
      <a
        className={tabClass(active === "word")}
        onClick={active === "word" ? undefined : () => router.push("/words")}
      >
        <span className={iconSpan(active === "word")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19V7a2 2 0 0 1 2-2h9l5 5v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
            <path d="M8 11h6" />
            <path d="M8 15h8" />
          </svg>
        </span>
        <span className="text-[11px] font-bold tracking-wider">{t.common.tabWord}</span>
      </a>

      {/* Tab: Evely (center, prominent) */}
      <a
        className="flex flex-col items-center gap-1 transition-colors text-black dark:text-white cursor-pointer"
        onClick={active === "chat" ? undefined : () => router.push("/chat")}
      >
        <span className="w-10 h-10 flex items-center justify-center rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-accent-green text-white shadow-nb-sm active:translate-y-[1px] active:shadow-[1px_1px_0_var(--shadow-color)]">
          <svg width="22" height="22" viewBox="0 0 18 18" shapeRendering="crispEdges" style={{ display: "block" }}>
            <rect x="6" y="1" width="1" height="2" fill="currentColor" />
            <rect x="11" y="1" width="1" height="2" fill="currentColor" />
            <rect x="1" y="6" width="3" height="6" fill="currentColor" />
            <rect x="14" y="6" width="3" height="6" fill="currentColor" />
            <rect x="4" y="3" width="10" height="10" fill="currentColor" />
            <rect x="8" y="13" width="2" height="4" fill="currentColor" />
            <rect x="5" y="13" width="2" height="2" fill="currentColor" />
            <rect x="11" y="13" width="2" height="2" fill="currentColor" />
            <rect x="7" y="7" width="1" height="2" fill="#0b3d66" />
            <rect x="10" y="7" width="1" height="2" fill="#0b3d66" />
          </svg>
        </span>
        <span className="text-[11px] font-bold tracking-wider">{t.common.tabAIScan}</span>
      </a>

      {/* Tab: TOPIK */}
      <a
        className={tabClass(active === "topik")}
        onClick={active === "topik" ? undefined : () => router.push("/topik")}
      >
        <span className={iconSpan(active === "topik")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
            <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
          </svg>
        </span>
        <span className="text-[11px] font-bold tracking-wider">{t.common.tabTopik}</span>
      </a>

      {/* Tab: More (kebab menu) */}
      <a
        className={tabClass(menuOpen || active === "profile")}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span className={iconSpan(menuOpen || active === "profile")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </span>
        <span className="text-[11px] font-bold tracking-wider">{t.common.tabMore}</span>
      </a>

      {/* Dropdown menu for the kebab tab */}
      {menuOpen && (
        <>
          {/* Backdrop to dismiss on outside tap */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute right-0 bottom-[calc(100%+10px)] z-50 flex w-44 flex-col gap-1 rounded-2xl border-3 border-border-color bg-card-bg p-2 shadow-nb-md"
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                router.push("/library");
              }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left font-bold text-text-primary transition-colors active:bg-accent-pink-bg cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
              <span className="text-sm">{t.common.tabLibrary}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                router.push("/profile");
              }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left font-bold text-text-primary transition-colors active:bg-accent-pink-bg cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
              <span className="text-sm">{t.common.tabProfile}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
