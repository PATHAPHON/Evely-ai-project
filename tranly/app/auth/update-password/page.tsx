'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/_lib/supabase/supabaseClient';
import { useStrings } from '@/app/_lib/utils/strings';
import { AUTH_FIELD_CLASS as fieldClass, MIN_PASSWORD_LENGTH } from '../_lib/utils/fieldStyles';

export default function UpdatePasswordPage() {
  const t = useStrings();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) { setError(t.auth.errorPasswordLength); return; }
    if (password !== confirm) { setError(t.auth.errorPasswordMismatch); return; }

    setIsLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (err) {
      setError(t.auth.errorGeneric);
    } else {
      setDone(true);
      setTimeout(() => router.push('/new'), 1500);
    }
  }

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px] flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">
            {t.auth.updatePasswordTitle}
          </h1>
        </div>

        <div className="rounded-2xl border border-border-color bg-card-bg p-6 shadow-soft-md">
          {done ? (
            <div className="p-3.5 border border-correct/20 bg-correct/5 text-correct rounded-xl text-sm font-semibold">
              🎉 {t.auth.updatePasswordSuccess}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="p-3.5 border border-incorrect/20 bg-incorrect/5 text-incorrect rounded-xl text-xs font-semibold">
                  ⚠️ {error}
                </div>
              )}
              <input
                type="password"
                required
                className={fieldClass}
                placeholder={t.auth.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <input
                type="password"
                required
                className={fieldClass}
                placeholder={t.auth.confirmPasswordPlaceholder}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-primary hover:bg-primary-hover py-3 text-sm font-bold text-white dark:text-gray-900 shadow-soft-sm transition-all active:scale-98 cursor-pointer"
              >
                {isLoading ? t.common.loading : t.auth.updatePasswordBtn}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
