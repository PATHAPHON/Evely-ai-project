import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpeakGame, { SpeakGameProps } from '../SpeakGame';

vi.mock('@/shared/hooks/useTTS', () => ({
  useTTS: () => ({
    speak: vi.fn(),
    isSpeaking: false,
    stop: vi.fn(),
  }),
}));

vi.mock('@/shared/hooks/useSTT', () => ({
  useSTT: () => ({
    startListening: vi.fn(),
    stopListening: vi.fn(),
    isListening: false,
    level: 0,
    isTranscribing: false,
    isSupported: true,
  }),
}));

vi.mock('@/shared/components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

describe('SpeakGame rendering', () => {
  const baseProps: SpeakGameProps = {
    word: 'apple',
    thai: 'แอปเปิ้ล',
    wordBank: [],
    onDone: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Thai prompt text and volume icon', () => {
    const { container } = render(<SpeakGame {...baseProps} />);

    expect(screen.getByText('แอปเปิ้ล')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    // Check volume icon SVG exists
    const svg = container.querySelector('svg.lucide-volume-2');
    expect(svg).toBeInTheDocument();
  });
});
