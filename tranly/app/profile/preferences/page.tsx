"use client";

import { useRouter } from "next/navigation";
import { useStrings } from "@/app/_lib/strings";
import LanguageSelector from "../_components/LanguageSelector";
import ThemeToggle from "../_components/ThemeToggle";

/**
 * Preferences sub-page containing learning target language,
 * translation preferences, and dark mode toggle.
 */
export default function PreferencesPage() {
  const router = useRouter();
  const t = useStrings();

  return (
    <div className="w-full h-dvh dot-grid-bg text-foreground flex flex-col font-sans select-none">
      {/* Header */}
      <div className="p-4 border-b-3 border-border-color flex items-center gap-3 bg-card-bg">
        <button
          onClick={() => router.push("/profile")}
          className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-border-color bg-card-bg text-text-primary shadow-nb-sm active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
          aria-label="Back to profile"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-text-primary">
          {t.profile.generalSection}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="rounded-2xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md flex flex-col gap-5">
          {/* Translation Language */}
          <LanguageSelector />

          {/* Divider */}
          <div className="h-[2px] bg-border-color/10 dark:bg-border-color/20" />

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
