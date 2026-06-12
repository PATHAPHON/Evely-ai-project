import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  const { activeLanguage } = useActiveLanguage();
  return (
    <div>
      <span data-testid="language">{activeLanguage}</span>
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

  it('defaults to english when no value in localStorage', () => {
    render(
      <ActiveLanguageProvider>
        <TestConsumer />
      </ActiveLanguageProvider>
    );
    expect(screen.getByTestId('language').textContent).toBe(DEFAULT_LANGUAGE);
  });

  it('reads persisted value from localStorage on mount if valid', () => {
    localStorage.setItem(STORAGE_KEY, 'english');
    render(
      <ActiveLanguageProvider>
        <TestConsumer />
      </ActiveLanguageProvider>
    );
    expect(screen.getByTestId('language').textContent).toBe('english');
  });

  it('ignores invalid values in localStorage and defaults to english', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid-language');
    render(
      <ActiveLanguageProvider>
        <TestConsumer />
      </ActiveLanguageProvider>
    );
    expect(screen.getByTestId('language').textContent).toBe('english');
  });

  it('throws when useActiveLanguage is used outside provider', () => {
    expect(() => render(<TestConsumer />)).toThrow(
      'useActiveLanguage must be used within an ActiveLanguageProvider'
    );
  });
});

