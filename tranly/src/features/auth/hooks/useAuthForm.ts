'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/shared/supabase/supabaseClient';
import { useStrings } from '@/shared/utils/strings';
import { mapAuthError } from '../utils/authErrorMessage';
import { MIN_PASSWORD_LENGTH } from '../utils/fieldStyles';

type AuthMode = 'login' | 'register';

export function useAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/new';
  const t = useStrings();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    }).catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginErr) throw loginErr;

      setSuccess(t.auth.successLogin);
      setTimeout(() => router.push(redirectTarget), 1200);
    } catch (err: unknown) {
      setError(mapAuthError(err, t.auth));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.includes('@')) { setError(t.auth.errorInvalidEmail); return; }
    if (password.length < MIN_PASSWORD_LENGTH) { setError(t.auth.errorPasswordLength); return; }
    if (password !== confirmPassword) { setError(t.auth.errorPasswordMismatch); return; }
    if (!tosAccepted) { setError(t.auth.tosError); return; }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpErr) throw signUpErr;

      if (signUpData.session) {
        setSuccess(t.auth.successLogin);
        setTimeout(() => router.push(redirectTarget), 1200);
      } else {
        setSuccess(t.auth.successRegister);
      }
    } catch (err: unknown) {
      setError(mapAuthError(err, t.auth));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}${redirectTarget}` },
      });
      if (oauthErr) throw oauthErr;
    } catch (err: unknown) {
      setError(mapAuthError(err, t.auth));
      setIsLoading(false);
    }
  };

  const goToRedirect = () => router.push(redirectTarget);

  return {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    tosAccepted,
    setTosAccepted,
    isLoading,
    error,
    setError,
    success,
    setSuccess,
    hasSession,
    handleLogin,
    handleRegister,
    handleGoogleLogin,
    goToRedirect,
  };
}
