import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WordDetailPopup, { computeReviewSchedule } from '../components/WordDetailPopup';
import type { FeedWordRecord } from '@/shared/types/wordTypes';

vi.mock('@/shared/hooks/useTTS', () => ({
  useTTS: () => ({
    speak: vi.fn(),
    isSpeaking: false,
    stop: vi.fn(),
  }),
}));

vi.mock('@/shared/supabase/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    },
  },
}));

describe('computeReviewSchedule', () => {
  it('returns null when nextReviewDate is not provided', () => {
    expect(computeReviewSchedule(null)).toBeNull();
    expect(computeReviewSchedule(undefined)).toBeNull();
  });

  it('calculates due status when review date is in the past or today', () => {
    const past = new Date(Date.now() - 24 * 3600 * 1000);
    const result = computeReviewSchedule(past, 1);
    expect(result).not.toBeNull();
    expect(result?.isDue).toBe(true);
    expect(result?.label).toContain('ครบกำหนดทบทวนแล้ว');
  });

  it('calculates 1 day for tomorrow', () => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const result = computeReviewSchedule(tomorrow, 1);
    expect(result).not.toBeNull();
    expect(result?.days).toBe(1);
    expect(result?.label).toContain('ทบทวนอีกครั้งใน 1 วัน');
    expect(result?.label).toContain('พรุ่งนี้');
  });

  it('calculates multiple days for future dates', () => {
    const in6Days = new Date(Date.now() + 6 * 24 * 3600 * 1000);
    const result = computeReviewSchedule(in6Days, 6);
    expect(result).not.toBeNull();
    expect(result?.days).toBe(6);
    expect(result?.label).toContain('ทบทวนอีกครั้งในอีก 6 วัน');
    expect(result?.interval).toBe(6);
  });
});

describe('WordDetailPopup review schedule banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        definition: 'Growing means developing or increasing.',
        usage: 'There is a growing concern.',
        thai: 'ที่กำลังเติบโต',
      }),
    });
  });

  it('renders review schedule banner when word has nextReviewAt', async () => {
    const targetDate = new Date(Date.now() + 6 * 24 * 3600 * 1000);
    const word: FeedWordRecord = {
      id: 'w-growing',
      language: 'english',
      generatedDate: '',
      thai: 'ที่กำลังเติบโต',
      bookmarked: false,
      createdAt: 0,
      partOfSpeech: 'adj.',
      word: 'growing',
      nextReviewAt: targetDate,
      interval: 6,
    };

    render(<WordDetailPopup word={word} onClose={vi.fn()} />);

    expect(await screen.findByText('growing')).toBeInTheDocument();
    expect(screen.getByText(/ทบทวนอีกครั้งในอีก 6 วัน/)).toBeInTheDocument();
    expect(screen.getByText('รอบ 6 วัน')).toBeInTheDocument();
  });
});
