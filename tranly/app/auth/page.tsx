"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfigProvider } from "antd";
import useIllustrationTheme from "@/app/theme/illustrationTheme";
import { supabase } from "@/app/_lib/supabaseClient";
import { useStrings } from "@/app/_lib/strings";

const fieldClass =
  "w-full rounded-xl border-3 border-border-color bg-background px-3.5 py-3 text-[15px] text-text-primary outline-none transition-shadow focus:shadow-nb-sm dark:placeholder-white/40 placeholder-black/40";
const labelClass =
  "mb-2 block text-xs font-bold uppercase tracking-wide text-text-secondary";

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/backoffice";
  const t = useStrings();
  const configProps = useIllustrationTheme();

  const [mode, setMode] = useState<"login" | "register">("login");
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
      const { data, error: loginErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginErr) throw loginErr;

      setSuccess(t.auth.successLogin);
      setTimeout(() => {
        const target = data.user?.email === 'admin@tranly.com' ? '/backoffice' : redirectTarget;
        router.push(target);
      }, 1200);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || t.auth.errorGeneric);
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
            const target = updateData.user?.email === 'admin@tranly.com' ? '/backoffice' : redirectTarget;
            router.push(target);
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
            const target = signUpData.user?.email === 'admin@tranly.com' ? '/backoffice' : redirectTarget;
            router.push(target);
          }, 1200);
        } else {
          setSuccess(t.auth.successRegister);
        }
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || t.auth.errorGeneric);
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
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError(err.message || t.auth.errorGeneric);
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { data, error: guestErr } = await supabase.auth.signInAnonymously();
      if (guestErr) throw guestErr;
      
      setSuccess(t.auth.successGuest);
      setTimeout(() => {
        router.push("/home");
      }, 1200);
    } catch (err: any) {
      console.error("Guest login error:", err);
      setError(err.message || t.auth.errorGeneric);
      setIsLoading(false);
    }
  };

  return (
    <ConfigProvider {...configProps}>
      <div className="relative flex min-h-dvh w-full select-none flex-col justify-center dot-grid-bg px-4 py-8 text-foreground font-sans">
        
        {/* Decorative elements conforming to reduced motion */}
        <div className="absolute top-10 left-10 text-text-meta text-opacity-20 font-bold text-7xl select-none pointer-events-none hidden md:block">
          한
        </div>
        <div className="absolute bottom-10 right-10 text-text-meta text-opacity-20 font-bold text-7xl select-none pointer-events-none hidden md:block">
          국
        </div>

        <div className="mx-auto w-full max-w-[420px] flex flex-col gap-6">
          
          {/* Header */}
          <div className="text-center flex flex-col gap-2">
            <h1 
              className="text-4xl font-black tracking-tight text-text-primary uppercase"
              style={{ fontFamily: "var(--font-outfit), sans-serif" }}
            >
              Tarnly
            </h1>
            <p className="text-sm font-semibold text-text-secondary">
              {mode === "login" ? t.auth.loginSubtitle : t.auth.registerSubtitle}
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border-3 border-border-color bg-card-bg p-6 shadow-nb-md">
            
            {/* Guest notice */}
            {isGuest && mode === "register" && (
              <div className="mb-5 p-3.5 border-3 border-border-color bg-accent-pink-bg text-text-primary rounded-xl text-xs font-bold leading-relaxed">
                📢 {t.auth.anonymousAccountNotice}
              </div>
            )}

            {/* Error & Success States */}
            {error && (
              <div className="mb-5 p-3.5 border-3 border-accent-red bg-accent-red/15 text-accent-red rounded-xl text-xs font-bold leading-relaxed">
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div className="mb-5 p-3.5 border-3 border-accent-green bg-accent-green/15 text-accent-green rounded-xl text-xs font-bold leading-relaxed">
                🎉 {success}
              </div>
            )}

            <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="flex flex-col gap-4">
              <div>
                <label className={labelClass} htmlFor="auth-email">{t.auth.emailLabel}</label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  className={fieldClass}
                  placeholder={t.auth.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoCapitalize="none"
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="auth-password">{t.auth.passwordLabel}</label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  className={fieldClass}
                  placeholder={t.auth.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {mode === "register" && (
                <div>
                  <label className={labelClass} htmlFor="auth-confirm-password">{t.auth.confirmPasswordLabel}</label>
                  <input
                    id="auth-confirm-password"
                    type="password"
                    required
                    className={fieldClass}
                    placeholder={t.auth.confirmPasswordPlaceholder}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full rounded-xl border-3 border-border-color bg-accent-green py-3 text-sm font-extrabold text-text-primary shadow-nb-sm active:translate-y-[2px] active:shadow-none hover:bg-accent-green/90 transition-transform cursor-pointer uppercase select-none"
              >
                {isLoading ? t.common.loading : (mode === "login" ? t.auth.loginBtn : t.auth.registerBtn)}
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-[3px] flex-1 bg-border-color/10 dark:bg-border-color/20" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary select-none">
                or
              </span>
              <div className="h-[3px] flex-1 bg-border-color/10 dark:bg-border-color/20" />
            </div>

            {/* Google Button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3 w-full rounded-xl border-3 border-border-color bg-background py-3 text-sm font-extrabold text-text-primary shadow-nb-sm active:translate-y-[2px] active:shadow-none hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer transition-transform select-none"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t.auth.googleBtn}
            </button>

            {/* Guest Button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGuestLogin}
              className="mt-3 flex items-center justify-center gap-3 w-full rounded-xl border-3 border-border-color bg-accent-yellow py-3 text-sm font-extrabold text-text-primary shadow-nb-sm active:translate-y-[2px] active:shadow-none hover:bg-accent-yellow/90 cursor-pointer transition-transform select-none uppercase"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="8" r="4" />
              </svg>
              {t.auth.guestBtn}
            </button>

            {/* Toggle Mode */}
            <div className="mt-5 text-center text-xs font-semibold text-text-secondary">
              {mode === "login" ? (
                <>
                  {t.auth.dontHaveAccount}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-accent-blue font-extrabold cursor-pointer hover:underline"
                  >
                    {t.auth.switchToRegister}
                  </button>
                </>
              ) : (
                <>
                  {t.auth.alreadyHaveAccount}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-accent-blue font-extrabold cursor-pointer hover:underline"
                  >
                    {t.auth.switchToLogin}
                  </button>
                </>
              )}
            </div>

          </div>

          {/* Back button */}
          {hasSession && (
            <button
              type="button"
              onClick={() => router.push(redirectTarget)}
              className="flex items-center justify-center gap-2 rounded-xl border-3 border-border-color bg-card-bg py-2.5 text-xs font-extrabold text-text-primary shadow-nb-sm active:translate-y-[2px] active:shadow-none cursor-pointer uppercase transition-transform"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              {t.auth.backToProfile}
            </button>
          )}

        </div>
      </div>
    </ConfigProvider>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex h-dvh w-full items-center justify-center dot-grid-bg">
        <div className="text-sm font-bold text-text-secondary">Loading...</div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}
