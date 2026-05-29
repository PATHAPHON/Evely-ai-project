'use client';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Container component for a group of settings with a section title.
 * Uses neobrutalist styling consistent with the rest of the app.
 */
export default function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section>
      <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">
        {title}
      </h2>
      <div className="flex flex-col gap-4">
        {children}
      </div>
    </section>
  );
}
