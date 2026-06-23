"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/_lib/supabase/supabaseClient";
import { useStrings } from "@/app/_lib/utils/strings";

type AuthMode = "login" | "register";

/**
 * All auth-screen state and submit handlers (email login/register, Google
 * OAuth, guest sign-in). The page component only renders the returned values.
 */
export function useAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/chat";
  const t = useStrings();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  // Check if currently anonymous guest
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setHasSession(!!session);
        if (session?.user?.is_anonymous) {
          setIsGuest(true);
        }
      } catch (err) {
        console.error("Failed to check session type:", err);
      }
    };
    checkSession();
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
      setTimeout(() => {
        router.push(redirectTarget);
      }, 1200);
    } catch (err: unknown) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : t.auth.errorGeneric);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validations
    if (!email.includes("@")) {
      setError(t.auth.errorInvalidEmail);
      return;
    }
    if (password.length < 6) {
      setError(t.auth.errorPasswordLength);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.auth.errorPasswordMismatch);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Check if the user is currently guest/anonymous
      const { data: { session } } = await supabase.auth.getSession();
      const currentIsAnon = session?.user?.is_anonymous;

      if (currentIsAnon) {
        // Convert/upgrade the anonymous user to email user
        const { data: updateData, error: updateErr } = await supabase.auth.updateUser({
          email: email.trim(),
          password: password,
        });

        if (updateErr) throw updateErr;

        // If email confirmation is enabled, they need to verify it.
        // If not, they are immediately converted.
        if (updateData.user?.new_email || !updateData.user?.email_confirmed_at) {
          setSuccess(t.auth.successRegister);
        } else {
          setSuccess(t.auth.successLogin);
          setTimeout(() => {
            router.push(redirectTarget);
          }, 1200);
        }
      } else {
        // Standard clean signup (no current guest session to link)
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signUpErr) throw signUpErr;

        if (signUpData.session) {
          setSuccess(t.auth.successLogin);
          setTimeout(() => {
            router.push(redirectTarget);
          }, 1200);
        } else {
          setSuccess(t.auth.successRegister);
        }
      }
    } catch (err: unknown) {
      console.error("Registration error:", err);
      setError(err instanceof Error ? err.message : t.auth.errorGeneric);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentIsAnon = session?.user?.is_anonymous;
      const redirectTo = `${window.location.origin}${redirectTarget}`;

      if (currentIsAnon) {
        // Link identity to guest user so their data is preserved!
        const { error: linkErr } = await supabase.auth.linkIdentity({
          provider: "google",
          options: {
            redirectTo,
          },
        });
        if (linkErr) throw linkErr;
      } else {
        // Standard OAuth sign in
        const { error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
          },
        });
        if (oauthErr) throw oauthErr;
      }
    } catch (err: unknown) {
      console.error("Google Auth error:", err);
      setError(err instanceof Error ? err.message : t.auth.errorGeneric);
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: guestErr } = await supabase.auth.signInAnonymously();
      if (guestErr) throw guestErr;

      setSuccess(t.auth.successGuest);
      setTimeout(() => {
        router.push("/chat");
      }, 1200);
    } catch (err: unknown) {
      console.error("Guest login error:", err);
      setError(err instanceof Error ? err.message : t.auth.errorGeneric);
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
    isLoading,
    error,
    setError,
    success,
    setSuccess,
    isGuest,
    hasSession,
    handleLogin,
    handleRegister,
    handleGoogleLogin,
    handleGuestLogin,
    goToRedirect,
  };
}
