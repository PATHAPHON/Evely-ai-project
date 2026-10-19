import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TypingGame from '../TypingGame';
import { gameAudio } from '../../utils/gameAudio';

// Mock Web Audio
vi.mock('../../utils/gameAudio', () => ({
  gameAudio: {
    startBgm: vi.fn(),
    stopBgm: vi.fn(),
    getMuted: vi.fn(() => false),
    toggleMute: vi.fn(() => true),
    playKeyClick: vi.fn(),
    playWordSuccess: vi.fn(),
    playWordMiss: vi.fn(),
  },
}));

describe('TypingGame 4-Lane Component', () => {
  const mockItems = [
    { id: '1', wordId: 'w1', word: 'cat', thai: 'แมว' },
    { id: '2', wordId: 'w2', word: 'fruit', thai: 'ผลไม้' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock speech synthesis
    window.speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
    } as unknown as SpeechSynthesis;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders 4-lane stage, header with Thai translation, and on-screen QWERTY keyboard', () => {
    render(<TypingGame items={mockItems} />);

    expect(screen.getByText(/คำที่ 1 \/ 2/)).toBeInTheDocument();
    expect(screen.getByText('แมว')).toBeInTheDocument();
    expect(screen.getByText('เปิดเสียง BGM')).toBeInTheDocument();
    expect(gameAudio.startBgm).toHaveBeenCalledTimes(1);

    // Check QWERTY buttons exist
    expect(screen.getByRole('button', { name: 'Q' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Z' })).toBeInTheDocument();
  });

  it('toggles audio mute when clicking the audio button', () => {
    render(<TypingGame items={mockItems} />);

    const audioBtn = screen.getByText('เปิดเสียง BGM');
    fireEvent.click(audioBtn);

    expect(gameAudio.toggleMute).toHaveBeenCalled();
  });

  it('allows clicking on-screen QWERTY buttons to hit notes when in hit zone', async () => {
    render(<TypingGame items={mockItems} />);

    // Advance time to bring the first note ('C') into hit zone (around 2.8s)
    act(() => {
      vi.advanceTimersByTime(2800);
    });

    // Click 'C' on virtual keyboard
    const cKey = screen.getByRole('button', { name: 'C' });
    act(() => {
      fireEvent.click(cKey);
    });

    expect(gameAudio.playKeyClick).toHaveBeenCalled();
  });

  it('supports long words like "fruit" (5 letters) with multiple lanes', () => {
    render(<TypingGame items={[{ id: '2', wordId: 'w2', word: 'fruit', thai: 'ผลไม้' }]} />);

    expect(screen.getByText('ผลไม้')).toBeInTheDocument();
    // Progress slots should exist
    const slots = screen.getAllByText('_');
    expect(slots.length).toBeGreaterThanOrEqual(4);
  });

  it('stops BGM on unmount', () => {
    const { unmount } = render(<TypingGame items={mockItems} />);
    unmount();
    expect(gameAudio.stopBgm).toHaveBeenCalled();
  });
});
