import type { ReactNode } from "react";

/**
 * Shared screen header used across Home, Word, and Profile.
 *
 * Replaces the header block that was copy-pasted on each page. Spacing follows
 * the design scale (px-4 / pt-6) instead of arbitrary `p-[20px_16px_0]` values,
 * and applies a 3-tier weight hierarchy: extrabold title, semibold subtitle.
 *
 * `action` renders a right-aligned slot (e.g. the Home avatar). `children`
 * renders below the title block (e.g. a mode toggle).
 */
export default function PageHeader({
  title,
  subtitle,
  action,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="px-4 pt-6">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h1
            className="font-extrabold text-3xl tracking-tight leading-tight text-text-primary"
            style={{ fontFamily: "var(--font-outfit), sans-serif" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-text-secondary text-sm mt-1 font-semibold">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
