import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SpeakGame, { SpeakGameProps } from '../SpeakGame';
import { gameAudio } from '../../utils/gameAudio';

let mockStartListening = vi.fn();
let mockStopListening = vi.fn();
let mockSpeak = vi.fn();

vi.mock('@/shared/hooks/useTTS', () => ({
  useTTS: () => ({
    speak: mockSpeak,
    isSpeaking: false,
    stop: vi.fn(),
  }),
}));

vi.mock('@/shared/hooks/useSTT', () => ({
  useSTT: () => ({
    startListening: mockStartListening,
    stopListening: mockStopListening,
    isListening: false,
    level: 0.5,
    isTranscribing: false,
    isSupported: true,
  }),
}));

vi.mock('@/shared/components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('../../utils/gameAudio', () => ({
  gameAudio: {
    getMuted: vi.fn(() => false),
    toggleMute: vi.fn(() => true),
    playLaserBlast: vi.fn(),
    playTargetExplosion: vi.fn(),
    playShieldDeflect: vi.fn(),
  },
}));

describe('SpeakGame (Sonic Blaster)', () => {
  const baseProps: SpeakGameProps = {
    word: 'apple',
    thai: 'แอปเปิ้ล',
    wordBank: [],
    onDone: vi.fn(),
    onFallbackToTyping: vi.fn(),
    onSkip: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders Thai prompt text, Sonic Blaster HUD, and cannon trigger button', () => {
    render(<SpeakGame {...baseProps} />);

    expect(screen.getByText('SONIC BLASTER')).toBeInTheDocument();
    expect(screen.getByText('แอปเปิ้ล')).toBeInTheDocument();
    expect(screen.getByText(/เป้าหมายตรวจจับ: 100M/)).toBeInTheDocument();
    expect(screen.getByText(/ชาร์จพลังยิง/)).toBeInTheDocument();
    expect(screen.getByText('หลบหลีก')).toBeInTheDocument();
  });

  it('toggles audio mute when clicking the speaker button', () => {
    render(<SpeakGame {...baseProps} />);

    const muteBtn = screen.getByRole('button', { name: /ปิดเสียง/i });
    fireEvent.click(muteBtn);

    expect(gameAudio.toggleMute).toHaveBeenCalled();
  });

  it('triggers startListening when the player taps the cannon reactor', () => {
    render(<SpeakGame {...baseProps} />);

    const triggerBtn = screen.getByRole('button', { name: /แตะเพื่อชาร์จปืนใหญ่/i });
    fireEvent.click(triggerBtn);

    expect(mockStartListening).toHaveBeenCalledTimes(1);
  });

  it('fires laser beam, explodes target, and completes round when speech matches', () => {
    render(<SpeakGame {...baseProps} />);

    const triggerBtn = screen.getByRole('button', { name: /แตะเพื่อชาร์จปืนใหญ่/i });
    fireEvent.click(triggerBtn);

    // Simulate STT callback onEnd with matching word
    const callArgs = mockStartListening.mock.calls[0][0];
    act(() => {
      callArgs.onEnd('apple', null);
    });

    expect(gameAudio.playLaserBlast).toHaveBeenCalledTimes(1);

    // Advance 250ms for laser impact and target explosion
    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(gameAudio.playTargetExplosion).toHaveBeenCalledTimes(1);
    expect(screen.getByText('DIRECT HIT! PERFECT SHOT')).toBeInTheDocument();
    expect(mockSpeak).toHaveBeenCalledWith('apple', expect.any(Object));

    // Simulate TTS onEnd callback
    const ttsArgs = mockSpeak.mock.calls[0][1];
    act(() => {
      ttsArgs.onEnd();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(baseProps.onDone).toHaveBeenCalledWith(5);
  });

  it('triggers shield deflection on first mismatch and enters danger zone', () => {
    render(<SpeakGame {...baseProps} />);

    const triggerBtn = screen.getByRole('button', { name: /แตะเพื่อชาร์จปืนใหญ่/i });
    fireEvent.click(triggerBtn);

    // Simulate STT callback onEnd with wrong word
    const callArgs = mockStartListening.mock.calls[0][0];
    act(() => {
      callArgs.onEnd('orange', null);
    });

    expect(gameAudio.playShieldDeflect).toHaveBeenCalledTimes(1);
    expect(screen.getByText('DANGER ZONE')).toBeInTheDocument();
    expect(screen.getByText(/ระยะประชิด: 30M/)).toBeInTheDocument();
    expect(screen.getByText(/เกราะสะท้อนการยิง!/)).toBeInTheDocument();
  });

  it('calls onSkip after playing TTS when clicking skip button', () => {
    render(<SpeakGame {...baseProps} />);

    const skipBtn = screen.getByRole('button', { name: /หลบหลีกและข้ามคำนี้/i });
    fireEvent.click(skipBtn);

    expect(mockSpeak).toHaveBeenCalledWith('apple', expect.any(Object));

    const ttsArgs = mockSpeak.mock.calls[0][1];
    act(() => {
      ttsArgs.onEnd();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(baseProps.onSkip).toHaveBeenCalledTimes(1);
  });

  it('treats STT service error (e.g. OpenRouter Too Many Requests) as a wrong attempt without showing toast', () => {
    render(<SpeakGame {...baseProps} />);

    const triggerBtn = screen.getByRole('button', { name: /แตะเพื่อชาร์จปืนใหญ่/i });
    fireEvent.click(triggerBtn);

    const callArgs = mockStartListening.mock.calls[0][0];
    act(() => {
      callArgs.onEnd('', 'OpenRouter STT service failed: Too Many Requests');
    });

    expect(gameAudio.playShieldDeflect).toHaveBeenCalledTimes(1);
    expect(screen.getByText('DANGER ZONE')).toBeInTheDocument();
    expect(screen.getByText(/เกราะสะท้อนการยิง!/)).toBeInTheDocument();
  });
});
