"use client";

import { Suspense } from "react";
import { useStrings } from "@/shared/utils/strings";
import { useAuthForm } from "@/features/auth/hooks/useAuthForm";
import { AUTH_FIELD_CLASS as fieldClass, AUTH_LABEL_CLASS as labelClass } from "@/features/auth/utils/fieldStyles";

function AuthPageContent() {
  const t = useStrings();

  const {
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
  } = useAuthForm();

  return (
      <div className="relative flex min-h-dvh w-full select-none flex-col justify-center bg-background px-4 py-8 text-foreground font-sans">
        
        {/* Decorative elements conforming to reduced motion */}
        <div className="absolute top-10 left-10 text-foreground/5 font-bold text-7xl select-none pointer-events-none hidden md:block">
          한
        </div>
        <div className="absolute bottom-10 right-10 text-foreground/5 font-bold text-7xl select-none pointer-events-none hidden md:block">
          국
        </div>

        <div className="mx-auto w-full max-w-[400px] flex flex-col gap-6">
          
          {/* Header */}
          <div className="text-center flex flex-col gap-2">
            <h1 
              className="text-4xl font-extrabold tracking-tight text-primary uppercase"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {t.common.appName}
            </h1>
            <p className="text-sm font-semibold text-foreground/60">
              {mode === "login" ? t.auth.loginSubtitle : t.auth.registerSubtitle}
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-border-color bg-card-bg p-6 shadow-soft-md">
            
            {/* Error & Success States */}
            {error && (
              <div className="mb-5 p-3.5 border border-incorrect/20 bg-incorrect/5 text-incorrect rounded-xl text-xs font-semibold leading-relaxed">
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div className="mb-5 p-3.5 border border-correct/20 bg-correct/5 text-correct rounded-xl text-xs font-semibold leading-relaxed">
                🎉 {success}
              </div>
            )}

            <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="flex flex-col gap-4">
              <div>
                <label className={labelClass} htmlFor="auth-email">{t.auth.emailLabel}</label>
                <input
                  id="auth-email"
                  type={mode === 'login' ? 'text' : 'email'}
                  required
                  className={fieldClass}
                  placeholder={mode === 'login' ? 'admin หรือ email' : t.auth.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className={labelClass} htmlFor="auth-password">{t.auth.passwordLabel}</label>
                  {mode === 'login' && (
                    <a href="/auth/reset" className="text-xs font-semibold text-primary hover:underline">
                      {t.auth.forgotPassword}
                    </a>
                  )}
                </div>
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

              {mode === "register" && (
                <label className="flex items-start gap-2.5 text-xs font-medium text-foreground/70 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={tosAccepted}
                    onChange={(e) => setTosAccepted(e.target.checked)}
                    disabled={isLoading}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
                  />
                  <span className="leading-relaxed">
                    {t.auth.tosPrefix}{" "}
                    <a href="/terms" target="_blank" className="font-bold text-primary hover:underline">
                      {t.auth.tosTerms}
                    </a>{" "}
                    {t.auth.tosAnd}{" "}
                    <a href="/privacy" target="_blank" className="font-bold text-primary hover:underline">
                      {t.auth.tosPrivacy}
                    </a>
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={isLoading || (mode === "register" && !tosAccepted)}
                className="mt-2 w-full rounded-xl bg-primary hover:bg-primary-hover py-3 text-sm font-bold text-white dark:text-gray-900 shadow-soft-sm transition-all active:scale-98 cursor-pointer uppercase select-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? t.common.loading : (mode === "login" ? t.auth.loginBtn : t.auth.registerBtn)}
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border-color" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 select-none">
                {t.common.or}
              </span>
              <div className="h-px flex-1 bg-border-color" />
            </div>

            {/* Google Button */}
            <button
              type="button"
              disabled
              title="Coming Soon"
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-2 sm:gap-3 w-full rounded-xl border border-border-color bg-background/60 py-3 text-xs sm:text-sm font-bold text-foreground/60 shadow-soft-sm cursor-not-allowed select-none"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-60">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>{t.auth.googleBtn}</span>
            </button>

            {/* Toggle Mode */}
            <div className="mt-5 text-center text-xs font-semibold text-foreground/75">
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
                    className="text-primary hover:text-primary-hover font-bold cursor-pointer hover:underline"
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
                    className="text-primary hover:text-primary-hover font-bold cursor-pointer hover:underline"
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
              onClick={goToRedirect}
              className="flex items-center justify-center gap-2 rounded-xl border border-border-color bg-background py-2.5 text-xs font-bold text-foreground shadow-soft-sm hover:bg-card-bg/60 cursor-pointer uppercase transition-all active:scale-98"
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
  );
}

function AuthLoadingFallback() {
  const t = useStrings();
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-white dark:bg-[#131314]">
      <div className="text-sm font-bold text-text-secondary">{t.common.loading}</div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <AuthPageContent />
    </Suspense>
  );
}
