import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ActiveLanguageProvider,
  useActiveLanguage,
  STORAGE_KEY,
  DEFAULT_LANGUAGE,
} from '../ActiveLanguageContext';

const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });
const mockOnAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

const mockEq = vi.fn().mockResolvedValue({ error: null });
const mockLimit = vi.fn().mockResolvedValue({ error: null });
const mockSelect = vi.fn().mockReturnValue({
  limit: (...args: any[]) => mockLimit(...args),
});
const mockUpdate = vi.fn().mockReturnValue({
  eq: (...args: any[]) => mockEq(...args),
});
const mockFrom = vi.fn().mockReturnValue({
  update: (...args: any[]) => mockUpdate(...args),
  select: (...args: any[]) => mockSelect(...args),
});

vi.mock('@/app/_lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
    },
    from: (...args: any[]) => mockFrom(...args),
  },
}));

function TestConsumer() {
  const { activeLanguage, setActiveLanguage, switchError, clearSwitchError } =
    useActiveLanguage();
  return (
    <div>
      <span data-testid="language">{activeLanguage}</span>
      <span data-testid="error">{switchError ?? ''}</span>
      <button onClick={() => setActiveLanguage('japanese')}>Switch to Japanese</button>
      <button onClick={() => setActiveLanguage('english')}>Switch to English</button>
      <button onClick={clearSwitchError}>Clear Error</button>
    </div>
  );
}

describe('ActiveLanguageContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mockEq.mockResolvedValue({ error: null });
    mockLimit.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to korean when no value in localStorage', () => {
    render(
      <ActiveLanguageProvider>
        <TestConsumer />
      </ActiveLanguageProvider>
    );
    expect(screen.getByTestId('language').textContent).toBe(DEFAULT_LANGUAGE);
  });

  it('reads persisted value from localStorage on mount', () => {
    localStorage.setItem(STORAGE_KEY, 'japanese');
    render(
      <ActiveLanguageProvider>
        <TestConsumer />
      </ActiveLanguageProvider>
    );
    expect(screen.getByTestId('language').textContent).toBe('japanese');
  });

  it('persists selection to localStorage when setActiveLanguage is called', () => {
    render(
      <ActiveLanguageProvider>
        <TestConsumer />
      </ActiveLanguageProvider>
    );
    act(() => {
      screen.getByText('Switch to Japanese').click();
    });
    expect(screen.getByTestId('language').textContent).toBe('japanese');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('japanese');
  });

  it('ignores invalid values in localStorage and defaults to korean', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid-language');
    render(
      <ActiveLanguageProvider>
        <TestConsumer />
      </ActiveLanguageProvider>
    );
    expect(screen.getByTestId('language').textContent).toBe('korean');
  });

  it('throws when useActiveLanguage is used outside provider', () => {
    expect(() => render(<TestConsumer />)).toThrow(
      'useActiveLanguage must be used within an ActiveLanguageProvider'
    );
  });

  describe('error handling and rollback', () => {
    it('reverts to previous language and shows error when database query fails', async () => {
      mockLimit.mockResolvedValueOnce({ error: new Error('Database error') });

      render(
        <ActiveLanguageProvider>
          <TestConsumer />
        </ActiveLanguageProvider>
      );

      // Initial state is korean
      expect(screen.getByTestId('language').textContent).toBe('korean');

      act(() => {
        screen.getByText('Switch to Japanese').click();
      });

      // Optimistically shows japanese
      expect(screen.getByTestId('language').textContent).toBe('japanese');

      // Wait for the async probe to fail and rollback
      await waitFor(() => {
        expect(screen.getByTestId('language').textContent).toBe('korean');
      });

      // Error message should be set
      await waitFor(() => {
        expect(screen.getByTestId('error').textContent).toContain(
          'Language switch failed'
        );
      });

      // localStorage should be reverted
      expect(localStorage.getItem(STORAGE_KEY)).toBe('korean');
    });

    it('does not revert language when data load is slow (no timeout rollback)', async () => {
      vi.useFakeTimers();

      mockLimit.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 2000))
      );

      render(
        <ActiveLanguageProvider>
          <TestConsumer />
        </ActiveLanguageProvider>
      );

      expect(screen.getByTestId('language').textContent).toBe('korean');

      act(() => {
        screen.getByText('Switch to Japanese').click();
      });

      // Optimistically shows japanese
      expect(screen.getByTestId('language').textContent).toBe('japanese');

      // Advance past a hypothetical timeout
      await act(async () => {
        vi.advanceTimersByTime(1010);
      });

      // Should still show japanese
      expect(screen.getByTestId('language').textContent).toBe('japanese');
      expect(screen.getByTestId('error').textContent).toBe('');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('japanese');
    });

    it('clearSwitchError clears the error message', async () => {
      mockLimit.mockResolvedValueOnce({ error: new Error('fail') });

      render(
        <ActiveLanguageProvider>
          <TestConsumer />
        </ActiveLanguageProvider>
      );

      act(() => {
        screen.getByText('Switch to Japanese').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error').textContent).not.toBe('');
      });

      act(() => {
        screen.getByText('Clear Error').click();
      });

      expect(screen.getByTestId('error').textContent).toBe('');
    });
  });
});
