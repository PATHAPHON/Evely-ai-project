"use client";

export interface SettingsRowProps {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  onClick?: () => void;
  danger?: boolean;
  last?: boolean;
  /** Optional element rendered on the right (e.g. toggle/value). Hides the chevron when set. */
  rightElement?: React.ReactNode;
}

export function SettingsRow({
  icon,
  title,
  desc,
  onClick,
  danger,
  last,
  rightElement,
}: SettingsRowProps) {
  const interactive = typeof onClick === "function";
  const Wrapper = interactive ? "button" : "div";

  return (
    <Wrapper
      {...(interactive ? { type: "button" as const, onClick } : {})}
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
        interactive ? "hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer" : ""
      } ${last ? "" : "border-b border-gray-100 dark:border-gray-800/40"}`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          danger ? "bg-red-50 dark:bg-red-950/40 text-red-600" : "bg-blue-50 dark:bg-blue-950/40 text-blue-600"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-bold ${danger ? "text-red-600" : "text-text-primary"}`}>
          {title}
        </span>
        {desc && <span className="mt-0.5 block text-xs text-text-secondary">{desc}</span>}
      </span>
      {rightElement ? (
        <span className="shrink-0">{rightElement}</span>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className={`shrink-0 ${danger ? "text-red-600" : "text-text-secondary"}`} aria-hidden="true">
          <polyline points="9 6 15 12 9 18" />
        </svg>
      )}
    </Wrapper>
  );
}

export function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mx-4 mt-4">
      {title && (
        <div className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-text-secondary">
          {title}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e1f20] shadow-sm">
        {children}
      </div>
    </div>
  );
}
