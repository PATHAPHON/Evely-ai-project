import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MatchingGame from '../MatchingGame';
import { gameAudio } from '../../utils/gameAudio';

// Mock useTTS
const mockSpeak = vi.fn((_text: string, options?: { onEnd?: () => void }) => {
  options?.onEnd?.();
});

vi.mock('@/shared/hooks/useTTS', () => ({
  useTTS: () => ({
    speak: mockSpeak,
    isSpeaking: false,
    stop: vi.fn(),
  }),
}));

// Mock game audio methods
vi.mock('../../utils/gameAudio', () => ({
  gameAudio: {
    getMuted: vi.fn(() => false),
    toggleMute: vi.fn(() => true),
    playBubbleSelect: vi.fn(),
    playBubblePop: vi.fn(),
    playBubbleMismatch: vi.fn(),
    playWordSuccess: vi.fn(),
    playWordMiss: vi.fn(),
  },
}));

describe('MatchingGame (Neon Bubble Pop)', () => {
  const mockItems = [
    { id: 'item-1', wordId: 'w1', word: 'apple', thai: 'แอปเปิ้ล' },
    { id: 'item-2', wordId: 'w2', word: 'book', thai: 'หนังสือ' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders round indicator, bubbles for words and translations, and timer bar', () => {
    render(
      <MatchingGame
        items={mockItems}
        roundNumber={1}
        totalRounds={2}
        onRoundComplete={vi.fn()}
      />
    );

    expect(screen.getByText(/รอบที่ 1\/2/)).toBeInTheDocument();
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('แอปเปิ้ล')).toBeInTheDocument();
    expect(screen.getByText('book')).toBeInTheDocument();
    expect(screen.getByText('หนังสือ')).toBeInTheDocument();
    expect(screen.getByText(/คำศัพท์อังกฤษ/)).toBeInTheDocument();
    expect(screen.getByText(/คำแปลไทย/)).toBeInTheDocument();
  });

  it('toggles audio mute when clicking the speaker button', () => {
    render(
      <MatchingGame
        items={mockItems}
        roundNumber={1}
        totalRounds={2}
        onRoundComplete={vi.fn()}
      />
    );

    const muteBtn = screen.getByRole('button', { name: /ปิดเสียง/i });
    fireEvent.click(muteBtn);

    expect(gameAudio.toggleMute).toHaveBeenCalled();
  });

  it('selects bubble on first click and plays select sound', () => {
    render(
      <MatchingGame
        items={mockItems}
        roundNumber={1}
        totalRounds={2}
        onRoundComplete={vi.fn()}
      />
    );

    const engBtn = screen.getByText('apple').closest('button')!;
    fireEvent.click(engBtn);

    expect(gameAudio.playBubbleSelect).toHaveBeenCalledTimes(1);
  });

  it('handles mismatch: plays mismatch sound, shakes, and records mistake', () => {
    render(
      <MatchingGame
        items={mockItems}
        roundNumber={1}
        totalRounds={2}
        onRoundComplete={vi.fn()}
      />
    );

    // Click 'apple' then wrong Thai 'หนังสือ'
    const appleBtn = screen.getByText('apple').closest('button')!;
    const bookThaiBtn = screen.getByText('หนังสือ').closest('button')!;

    fireEvent.click(appleBtn);
    fireEvent.click(bookThaiBtn);

    expect(gameAudio.playBubbleMismatch).toHaveBeenCalledTimes(1);
  });

  it('pops matched pair and completes the round with SM-2 score', () => {
    const onRoundCompleteMock = vi.fn();
    render(
      <MatchingGame
        items={mockItems}
        roundNumber={1}
        totalRounds={1}
        onRoundComplete={onRoundCompleteMock}
      />
    );

    // Pair 1: apple + แอปเปิ้ล
    fireEvent.click(screen.getByText('apple').closest('button')!);
    fireEvent.click(screen.getByText('แอปเปิ้ล').closest('button')!);

    expect(gameAudio.playBubblePop).toHaveBeenCalledWith(1);

    // Advance timers for merge animation
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Pair 2: book + หนังสือ
    fireEvent.click(screen.getByText('book').closest('button')!);
    fireEvent.click(screen.getByText('หนังสือ').closest('button')!);

    expect(gameAudio.playBubblePop).toHaveBeenCalledWith(2);

    // Advance timers for merge and finish transition
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('ยอดเยี่ยม!')).toBeInTheDocument();
    expect(gameAudio.playWordSuccess).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onRoundCompleteMock).toHaveBeenCalledTimes(1);
    const results = onRoundCompleteMock.mock.calls[0][0];
    expect(results).toHaveLength(2);
    expect(results[0].quality).toBe(5); // No mistakes
    expect(results[0].mistakes).toBe(0);
  });

  it('does not respawn bubbles or reshuffle when parent re-renders with new array reference of same items', () => {
    const { rerender } = render(
      <MatchingGame
        items={mockItems}
        roundNumber={1}
        totalRounds={2}
        onRoundComplete={vi.fn()}
      />
    );

    // Pop apple + แอปเปิ้ล
    fireEvent.click(screen.getByText('apple').closest('button')!);
    fireEvent.click(screen.getByText('แอปเปิ้ล').closest('button')!);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // apple should be popped (not in document)
    expect(screen.queryByText('apple')).not.toBeInTheDocument();

    // Parent re-renders with new array reference containing same items
    rerender(
      <MatchingGame
        items={[...mockItems]}
        roundNumber={1}
        totalRounds={2}
        onRoundComplete={vi.fn()}
      />
    );

    // apple should STILL be popped! It should not respawn!
    expect(screen.queryByText('apple')).not.toBeInTheDocument();
  });

  it('waits for TTS voice speech onEnd on the final match before calling onRoundComplete', () => {
    let capturedOnEnd: (() => void) | undefined;
    mockSpeak.mockImplementation((_text: string, options?: { onEnd?: () => void }) => {
      capturedOnEnd = options?.onEnd;
    });

    const onRoundCompleteMock = vi.fn();
    render(
      <MatchingGame
        items={mockItems}
        roundNumber={1}
        totalRounds={1}
        onRoundComplete={onRoundCompleteMock}
      />
    );

    // Pop Pair 1: apple + แอปเปิ้ล
    fireEvent.click(screen.getByText('apple').closest('button')!);
    fireEvent.click(screen.getByText('แอปเปิ้ล').closest('button')!);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockSpeak).toHaveBeenCalledWith('apple');

    // Pop Pair 2: book + หนังสือ (Last pair in round)
    fireEvent.click(screen.getByText('book').closest('button')!);
    fireEvent.click(screen.getByText('หนังสือ').closest('button')!);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('ยอดเยี่ยม!')).toBeInTheDocument();
    expect(mockSpeak).toHaveBeenCalledWith('book', expect.any(Object));

    // Before TTS onEnd is called, it should NOT have completed yet
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onRoundCompleteMock).not.toHaveBeenCalled();

    // Now call onEnd
    act(() => {
      capturedOnEnd?.();
    });

    // Advance 500ms after audio finishes
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onRoundCompleteMock).toHaveBeenCalledTimes(1);
  });
});
