import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SummaryScreen from '../SummaryScreen';
import type { WordReviewSummaryItem } from '../../gameTypes';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

const mockSpeak = vi.fn();
vi.mock('@/shared/hooks/useTTS', () => ({
  useTTS: () => ({
    speak: mockSpeak,
    isSpeaking: false,
    stop: vi.fn(),
  }),
}));

vi.mock('@/shared/components/AdSlot', () => ({
  default: () => <div data-testid="ad-slot">AdSlot</div>,
}));

vi.mock('@/shared/components/WordDetailPopup', () => ({
  default: ({ word, onClose }: { word: unknown; onClose: () => void }) =>
    word ? (
      <div data-testid="word-detail-popup">
        <button onClick={onClose}>Close Popup</button>
      </div>
    ) : null,
}));

describe('SummaryScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when total is 0 and no summaryItems', () => {
    render(
      <SummaryScreen
        total={0}
        improved={0}
        isPractice={false}
      />
    );

    expect(screen.getByText('ยังไม่มีคำครบกำหนด')).toBeInTheDocument();
    expect(screen.getByText('ไปสะสมคำที่แชต →')).toBeInTheDocument();
  });

  it('renders overview stats and breakdown cards when items are provided', () => {
    const items: WordReviewSummaryItem[] = [
      {
        wordId: 'w1',
        word: 'diligent',
        thai: 'ขยัน',
        partOfSpeech: 'adj.',
        quality: 5,
        mistakes: 0,
        isPassed: true,
        oldInterval: 1,
        newInterval: 6,
        nextReviewAt: new Date(Date.now() + 6 * 86400000),
        repetitions: 2,
        easeFactor: 2.5,
      },
      {
        wordId: 'w2',
        word: 'reluctant',
        thai: 'ไม่เต็มใจ',
        partOfSpeech: 'adj.',
        quality: 2,
        mistakes: 2,
        isPassed: false,
        oldInterval: 6,
        newInterval: 1,
        nextReviewAt: new Date(Date.now() + 1 * 86400000),
        repetitions: 0,
        easeFactor: 2.3,
      },
    ];

    render(
      <SummaryScreen
        total={2}
        improved={1}
        isPractice={false}
        summaryItems={items}
      />
    );

    expect(screen.getByText('รอบนี้เสร็จแล้ว!')).toBeInTheDocument();
    expect(screen.getByText('diligent')).toBeInTheDocument();
    expect(screen.getByText('reluctant')).toBeInTheDocument();
    expect(screen.getByText('จำแม่นแล้ว 🌟')).toBeInTheDocument();
    expect(screen.getByText('ต้องทบทวนเพิ่ม ⚠️')).toBeInTheDocument();
    expect(screen.getByText('ทบทวนอีกครั้ง: อีก 6 วัน (+6 วัน)')).toBeInTheDocument();
    expect(screen.getByText('ทบทวนอีกครั้ง: พรุ่งนี้ (+1 วัน)')).toBeInTheDocument();
  });

  it('renders practice badge in practice mode', () => {
    render(
      <SummaryScreen
        total={5}
        improved={3}
        isPractice={true}
      />
    );

    expect(screen.getByText('ฝึกซ้อมเสร็จแล้ว!')).toBeInTheDocument();
    expect(screen.getByText('โหมดฝึกซ้อม (ไม่กระทบตารางทบทวนหลัก)')).toBeInTheDocument();
  });

  it('calls onRetryMissed when clicking the retry missed words button', () => {
    const onRetryMissed = vi.fn();
    const items: WordReviewSummaryItem[] = [
      {
        wordId: 'w2',
        word: 'reluctant',
        thai: 'ไม่เต็มใจ',
        quality: 2,
        mistakes: 2,
        isPassed: false,
        oldInterval: 6,
        newInterval: 1,
        nextReviewAt: new Date(),
        repetitions: 0,
        easeFactor: 2.3,
      },
    ];

    render(
      <SummaryScreen
        total={1}
        improved={0}
        isPractice={false}
        summaryItems={items}
        onRetryMissed={onRetryMissed}
      />
    );

    const retryBtn = screen.getByText(/ทบทวนเฉพาะคำที่ผิดทันที/);
    fireEvent.click(retryBtn);
    expect(onRetryMissed).toHaveBeenCalledTimes(1);
  });

  it('triggers TTS speak when clicking speaker button', () => {
    const items: WordReviewSummaryItem[] = [
      {
        wordId: 'w1',
        word: 'diligent',
        thai: 'ขยัน',
        quality: 5,
        mistakes: 0,
        isPassed: true,
        oldInterval: 1,
        newInterval: 6,
        nextReviewAt: new Date(),
        repetitions: 2,
        easeFactor: 2.5,
      },
    ];

    render(
      <SummaryScreen
        total={1}
        improved={1}
        isPractice={false}
        summaryItems={items}
      />
    );

    const speakBtn = screen.getByTitle('ฟังเสียงอ่าน');
    fireEvent.click(speakBtn);
    expect(mockSpeak).toHaveBeenCalledWith('diligent');
  });

  it('opens WordDetailPopup when clicking on a word card', () => {
    const items: WordReviewSummaryItem[] = [
      {
        wordId: 'w1',
        word: 'diligent',
        thai: 'ขยัน',
        quality: 5,
        mistakes: 0,
        isPassed: true,
        oldInterval: 1,
        newInterval: 6,
        nextReviewAt: new Date(),
        repetitions: 2,
        easeFactor: 2.5,
      },
    ];

    render(
      <SummaryScreen
        total={1}
        improved={1}
        isPractice={false}
        summaryItems={items}
      />
    );

    expect(screen.queryByTestId('word-detail-popup')).not.toBeInTheDocument();
    const wordCard = screen.getByText('diligent').closest('[role="button"]');
    expect(wordCard).toBeInTheDocument();
    fireEvent.click(wordCard!);
    expect(screen.getByTestId('word-detail-popup')).toBeInTheDocument();
  });
});
