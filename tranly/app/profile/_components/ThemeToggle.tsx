'use client';

import { useTheme } from '../_lib/useTheme';
import { useStrings } from '@/app/_lib/strings';

/**
 * Neobrutalist toggle switch for switching between light and dark mode.
 * Uses sun/moon icons to indicate the current theme state.
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const t = useStrings();
  const isDark = theme === 'dark';

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-text-primary">
        {t.profile.darkMode}
      </span>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="relative w-[72px] h-[38px] rounded-full border-3 border-border-color shadow-nb-sm transition-colors duration-200 cursor-pointer bg-[#F0F0F0] dark:bg-[#2d2d44]"
      >
        {/* Sliding knob */}
        <span
          className={`absolute top-[3px] w-[28px] h-[28px] rounded-full border-3 border-border-color flex items-center justify-center transition-all duration-200 ${
            isDark
              ? 'left-[37px] bg-[#1a1a2e]'
              : 'left-[3px] bg-[#FAAD14]'
          }`}
        >
          {isDark ? (
            // Moon icon
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            // Sun icon
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="black"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </span>
      </button>
    </div>
  );
}
