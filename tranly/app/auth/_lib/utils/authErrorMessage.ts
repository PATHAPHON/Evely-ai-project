import type { UIStrings } from '@/app/_lib/utils/strings';

/** Map a raw Supabase auth error to a user-facing Thai string. */
export function mapAuthError(err: unknown, t: UIStrings['auth']): string {
  if (!(err instanceof Error)) return t.errorGeneric;

  const msg = err.message.toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
    return t.errorInvalidCredentials;
  }
  if (msg.includes('email not confirmed')) {
    return t.errorEmailNotConfirmed;
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return t.errorEmailAlreadyRegistered;
  }
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return t.errorTooManyRequests;
  }
  if (msg.includes('password should be') || msg.includes('password must be')) {
    return t.errorPasswordLength;
  }

  return t.errorGeneric;
}
