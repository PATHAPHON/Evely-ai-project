import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthPage from '../page';
import * as authFormModule from '@/features/auth/hooks/useAuthForm';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn().mockReturnValue(null) }),
}));

vi.mock('@/shared/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

describe('AuthPage Loading Screen', () => {
  it('does not render loading overlay by default when isLoading is false', () => {
    vi.spyOn(authFormModule, 'useAuthForm').mockReturnValue({
      mode: 'login',
      setMode: vi.fn(),
      email: '',
      setEmail: vi.fn(),
      password: '',
      setPassword: vi.fn(),
      confirmPassword: '',
      setConfirmPassword: vi.fn(),
      tosAccepted: false,
      setTosAccepted: vi.fn(),
      isLoading: false,
      error: null,
      setError: vi.fn(),
      success: null,
      setSuccess: vi.fn(),
      hasSession: false,
      handleLogin: vi.fn(),
      handleRegister: vi.fn(),
      handleGoogleLogin: vi.fn(),
      goToRedirect: vi.fn(),
    });

    render(<AuthPage />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders loading overlay immediately when isLoading is true in login mode', () => {
    vi.spyOn(authFormModule, 'useAuthForm').mockReturnValue({
      mode: 'login',
      setMode: vi.fn(),
      email: 'test@example.com',
      setEmail: vi.fn(),
      password: 'password',
      setPassword: vi.fn(),
      confirmPassword: '',
      setConfirmPassword: vi.fn(),
      tosAccepted: false,
      setTosAccepted: vi.fn(),
      isLoading: true,
      error: null,
      setError: vi.fn(),
      success: null,
      setSuccess: vi.fn(),
      hasSession: false,
      handleLogin: vi.fn(),
      handleRegister: vi.fn(),
      handleGoogleLogin: vi.fn(),
      goToRedirect: vi.fn(),
    });

    render(<AuthPage />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(screen.getByText('กำลังเข้าสู่ระบบ...')).toBeInTheDocument();
    expect(screen.getByText('กรุณารอสักครู่...')).toBeInTheDocument();
  });

  it('renders loading overlay immediately when isLoading is true in register mode', () => {
    vi.spyOn(authFormModule, 'useAuthForm').mockReturnValue({
      mode: 'register',
      setMode: vi.fn(),
      email: 'new@example.com',
      setEmail: vi.fn(),
      password: 'password',
      setPassword: vi.fn(),
      confirmPassword: 'password',
      setConfirmPassword: vi.fn(),
      tosAccepted: true,
      setTosAccepted: vi.fn(),
      isLoading: true,
      error: null,
      setError: vi.fn(),
      success: null,
      setSuccess: vi.fn(),
      hasSession: false,
      handleLogin: vi.fn(),
      handleRegister: vi.fn(),
      handleGoogleLogin: vi.fn(),
      goToRedirect: vi.fn(),
    });

    render(<AuthPage />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(screen.getByText('กำลังสมัครสมาชิก...')).toBeInTheDocument();
    expect(screen.getByText('กรุณารอสักครู่...')).toBeInTheDocument();
  });

  it('shows success text and redirecting message when login succeeds and redirect is pending', () => {
    vi.spyOn(authFormModule, 'useAuthForm').mockReturnValue({
      mode: 'login',
      setMode: vi.fn(),
      email: 'test@example.com',
      setEmail: vi.fn(),
      password: 'password',
      setPassword: vi.fn(),
      confirmPassword: '',
      setConfirmPassword: vi.fn(),
      tosAccepted: false,
      setTosAccepted: vi.fn(),
      isLoading: true,
      error: null,
      setError: vi.fn(),
      success: 'เข้าสู่ระบบสำเร็จ!',
      setSuccess: vi.fn(),
      hasSession: false,
      handleLogin: vi.fn(),
      handleRegister: vi.fn(),
      handleGoogleLogin: vi.fn(),
      goToRedirect: vi.fn(),
    });

    render(<AuthPage />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(screen.getByText('เข้าสู่ระบบสำเร็จ!')).toBeInTheDocument();
    expect(screen.getByText('กำลังพาคุณเข้าสู่ระบบ...')).toBeInTheDocument();
  });
});
