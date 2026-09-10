import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { FormEvent } from 'react';
import type { AuthResponse, AuthTokenResponsePassword } from '@supabase/supabase-js';
import { useAuthForm } from '../hooks/useAuthForm';
import { supabase } from '@/shared/supabase/supabaseClient';

const pushMock = vi.fn();
const replaceMock = vi.fn();
const refreshMock = vi.fn();
const getSearchParamMock = vi.fn().mockReturnValue(null);

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    refresh: refreshMock,
  }),
  useSearchParams: () => ({
    get: getSearchParamMock,
  }),
}));

vi.mock('@/shared/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}));

const mockFormEvent = { preventDefault: vi.fn() } as unknown as FormEvent;

describe('useAuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default login mode and not loading', () => {
    const { result } = renderHook(() => useAuthForm());
    expect(result.current.mode).toBe('login');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBeNull();
  });

  it('handleLogin replaces the auth page and refreshes the route immediately on success', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: { user: {}, session: {} },
                error: null,
              } as unknown as AuthTokenResponsePassword),
            50
          )
        )
    );

    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setEmail('user@test.com');
      result.current.setPassword('secret123');
    });

    let loginPromise: Promise<void>;
    act(() => {
      loginPromise = result.current.handleLogin(mockFormEvent);
    });

    // Immediately after calling handleLogin, isLoading MUST be true
    expect(result.current.isLoading).toBe(true);

    // Fast-forward auth response
    await act(async () => {
      vi.advanceTimersByTime(50);
      await loginPromise;
    });

    // Keep the loading overlay mounted until the route is replaced.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.success).toBeTruthy();
    expect(replaceMock).toHaveBeenCalledWith('/new');
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('handleLogin resets isLoading=false and sets error on auth failure', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: new Error('Invalid login credentials'),
    } as unknown as AuthTokenResponsePassword);

    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setEmail('user@test.com');
      result.current.setPassword('wrongpass');
    });

    await act(async () => {
      await result.current.handleLogin(mockFormEvent);
    });

    // Error must reset loading so user returns to the form
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('handleRegister validates fields before loading', async () => {
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setMode('register');
      result.current.setEmail('invalidemail');
    });

    await act(async () => {
      await result.current.handleRegister(mockFormEvent);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('กรุณากรอกอีเมลที่ถูกต้อง');
  });

  it('handleRegister sets isLoading=true and handles session redirect on success', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: { user: {}, session: { access_token: 'abc' } },
      error: null,
    } as unknown as AuthResponse);

    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setMode('register');
      result.current.setEmail('new@test.com');
      result.current.setPassword('secret123');
      result.current.setConfirmPassword('secret123');
      result.current.setTosAccepted(true);
    });

    let registerPromise: Promise<void>;
    act(() => {
      registerPromise = result.current.handleRegister(mockFormEvent);
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await registerPromise;
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.success).toBeTruthy();

    expect(replaceMock).toHaveBeenCalledWith('/new');
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('handleRegister sets isLoading=false when email confirmation is needed without session', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: { user: {}, session: null },
      error: null,
    } as unknown as AuthResponse);

    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setMode('register');
      result.current.setEmail('confirm@test.com');
      result.current.setPassword('secret123');
      result.current.setConfirmPassword('secret123');
      result.current.setTosAccepted(true);
    });

    await act(async () => {
      await result.current.handleRegister(mockFormEvent);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.success).toContain('ตรวจสอบอีเมล');
  });
});
