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
        interactive ? "hover:bg-card-bg/60 cursor-pointer" : ""
      } ${last ? "" : "border-b border-border-color"}`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          danger ? "bg-incorrect/10 text-incorrect" : "bg-primary-bg text-primary"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-bold ${danger ? "text-incorrect" : "text-foreground"}`}>
          {title}
        </span>
        {desc && <span className="mt-0.5 block text-xs text-foreground/60">{desc}</span>}
      </span>
      {rightElement ? (
        <span className="shrink-0">{rightElement}</span>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className={`shrink-0 ${danger ? "text-incorrect" : "text-foreground/45"}`} aria-hidden="true">
          <polyline points="9 6 15 12 9 18" />
        </svg>
      )}
    </Wrapper>
  );
}

export interface ToggleSwitchProps {
  on: boolean;
  onClick: () => void;
  label: string;
}

/** Pill-shaped on/off switch used in settings rows. */
export function ToggleSwitch({ on, onClick, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative h-[28px] w-[52px] rounded-full border border-border-color transition-colors duration-200 cursor-pointer bg-card-bg"
    >
      <span
        className={`absolute top-[2px] h-[22px] w-[22px] rounded-full shadow-sm transition-all duration-200 ${
          on ? "left-[28px] bg-primary" : "left-[2px] bg-foreground/30"
        }`}
      />
    </button>
  );
}

export function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mx-4 mt-4">
      {title && (
        <div className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-foreground/60">
          {title}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-border-color bg-card-bg shadow-soft-sm">
        {children}
      </div>
    </div>
  );
}
