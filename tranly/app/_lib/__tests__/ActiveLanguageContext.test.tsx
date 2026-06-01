import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ActiveLanguageProvider,
  useActiveLanguage,
  STORAGE_KEY,
  DEFAULT_LANGUAGE,
  SWITCH_TIMEOUT_MS,
} from '../ActiveLanguageContext';

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
    vi.restoreAllMocks();
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
    it('reverts to previous language and shows error when IndexedDB query fails', async () => {
      // Mock the db module to simulate a failure
      vi.doMock('../db', () => ({
        openDatabase: vi.fn().mockResolvedValue({}),
        queryByLanguage: vi.fn().mockRejectedValue(new Error('IndexedDB error')),
      }));

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

      vi.doUnmock('../db');
    });

    it('reverts to previous language when data load exceeds timeout', async () => {
      vi.useFakeTimers();

      // Mock the db module to simulate a slow response
      vi.doMock('../db', () => ({
        openDatabase: vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({}), 1000))
        ),
        queryByLanguage: vi.fn().mockResolvedValue([]),
      }));

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

      // Advance past the timeout
      await act(async () => {
        vi.advanceTimersByTime(SWITCH_TIMEOUT_MS + 10);
      });

      // Should revert to korean
      expect(screen.getByTestId('language').textContent).toBe('korean');
      expect(screen.getByTestId('error').textContent).toContain('timed out');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('korean');

      vi.doUnmock('../db');
    });

    it('clearSwitchError clears the error message', async () => {
      vi.doMock('../db', () => ({
        openDatabase: vi.fn().mockResolvedValue({}),
        queryByLanguage: vi.fn().mockRejectedValue(new Error('fail')),
      }));

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

      vi.doUnmock('../db');
    });
  });
});
