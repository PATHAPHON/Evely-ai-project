import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useStudySessions } from '../hooks/useStudySessions';
import { ActiveLanguageProvider, STORAGE_KEY } from '../contexts/ActiveLanguageContext';
import type { StudySession } from '../types/studySessionTypes';

// --- In-memory mock database ---
let mockSessions: any[] = [];
let mockUser: any = { id: 'test-user-id' };

// --- Mock Supabase Client ---
vi.mock('@/app/_lib/supabase/supabaseClient', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: mockUser } })),
        getSession: vi.fn(async () => ({ data: { session: mockUser ? { user: mockUser } : null } })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
      from: vi.fn((table: string) => {
        if (table === 'study_sessions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((field1: string, val1: any) => {
                return {
                  eq: vi.fn((field2: string, val2: any) => {
                    return {
                      order: vi.fn(async (sortField: string, { ascending }: { ascending: boolean }) => {
                        let filtered = mockSessions.filter(
                          (s) => s.user_id === val1 && s.language === val2
                        );
                        filtered.sort((a, b) => {
                          const timeA = new Date(a.completed_at).getTime();
                          const timeB = new Date(b.completed_at).getTime();
                          return ascending ? timeA - timeB : timeB - timeA;
                        });
                        return { data: filtered, error: null };
                      }),
                    };
                  }),
                };
              }),
            })),
            insert: vi.fn(async (record: any) => {
              mockSessions.push(record);
              return { error: null };
            }),
          };
        }
        return {};
      }),
    },
  };
});

beforeEach(() => {
  mockSessions = [];
  mockUser = { id: 'test-user-id' };
  localStorage.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ActiveLanguageProvider>{children}</ActiveLanguageProvider>;
}

async function seedSessions(sessions: StudySession[]) {
  mockSessions = sessions.map((s) => ({
    id: s.id,
    user_id: 'test-user-id',
    language: s.language,
    flashcard_set_id: s.flashcardSetId,
    completed_at: new Date(s.completedAt).toISOString(),
    cards_reviewed: s.cardsReviewed,
  }));
}

describe('useStudySessions', () => {
  it('returns null sessions initially while loading', () => {
    const { result } = renderHook(() => useStudySessions(), { wrapper });
    expect(result.current.sessions).toBeNull();
  });

  it('returns empty array when no sessions exist', async () => {
    const { result } = renderHook(() => useStudySessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.sessions).not.toBeNull();
    });

    expect(result.current.sessions).toEqual([]);
  });

  it('records a study session with correct fields', async () => {
    const { result } = renderHook(() => useStudySessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.sessions).not.toBeNull();
    });

    await act(async () => {
      await result.current.recordSession('set-1', 5);
    });

    expect(result.current.sessions).toHaveLength(1);
    const session = result.current.sessions![0];
    expect(session.language).toBe('english');
    expect(session.flashcardSetId).toBe('set-1');
    expect(session.cardsReviewed).toBe(5);
    expect(session.completedAt).toBeGreaterThan(0);
    expect(session.id).toBeDefined();
  });

  it('does not record a session when cardsReviewed is less than 1', async () => {
    const { result } = renderHook(() => useStudySessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.sessions).not.toBeNull();
    });

    await act(async () => {
      await result.current.recordSession('set-1', 0);
    });

    expect(result.current.sessions).toEqual([]);
  });

  it('sorts sessions by completedAt descending (most recent first)', async () => {
    await seedSessions([
      {
        id: 'session-1',
        language: 'english',
        flashcardSetId: 'set-1',
        completedAt: 1000,
        cardsReviewed: 2,
      },
      {
        id: 'session-2',
        language: 'english',
        flashcardSetId: 'set-2',
        completedAt: 3000,
        cardsReviewed: 4,
      },
      {
        id: 'session-3',
        language: 'english',
        flashcardSetId: 'set-1',
        completedAt: 2000,
        cardsReviewed: 1,
      },
    ]);

    const { result } = renderHook(() => useStudySessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(3);
    });

    expect(result.current.sessions![0].completedAt).toBe(3000);
    expect(result.current.sessions![1].completedAt).toBe(2000);
    expect(result.current.sessions![2].completedAt).toBe(1000);
  });
});

