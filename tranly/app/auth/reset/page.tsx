'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/_lib/supabase/supabaseClient';
import { useStrings } from '@/app/_lib/utils/strings';
import { AUTH_FIELD_CLASS as fieldClass } from '../_lib/utils/fieldStyles';

export default function ResetPasswordPage() {
  const t = useStrings();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    setIsLoading(false);
    if (err) {
      setError(t.auth.errorGeneric);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px] flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">
            {t.auth.resetPasswordTitle}
          </h1>
          <p className="mt-2 text-sm text-foreground/70">{t.auth.resetPasswordSubtitle}</p>
        </div>

        <div className="rounded-2xl border border-border-color bg-card-bg p-6 shadow-soft-md">
          {sent ? (
            <div className="p-3.5 border border-correct/20 bg-correct/5 text-correct rounded-xl text-sm font-semibold">
              🎉 {t.auth.resetPasswordEmailSent}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="p-3.5 border border-incorrect/20 bg-incorrect/5 text-incorrect rounded-xl text-xs font-semibold">
                  ⚠️ {error}
                </div>
              )}
              <input
                type="email"
                required
                className={fieldClass}
                placeholder={t.auth.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoCapitalize="none"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-primary hover:bg-primary-hover py-3 text-sm font-bold text-white dark:text-gray-900 shadow-soft-sm transition-all active:scale-98 cursor-pointer"
              >
                {isLoading ? t.common.loading : t.auth.resetPasswordBtn}
              </button>
            </form>
          )}
        </div>

        <button
          type="button"
          onClick={() => router.push('/auth')}
          className="text-center text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          {t.auth.backToProfile}
        </button>
      </div>
    </div>
  );
}
