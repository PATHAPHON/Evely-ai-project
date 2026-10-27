import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RefreshMenu from '../RefreshMenu';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => '/refresh',
}));

describe('RefreshMenu', () => {
  it('unlocks modes when total playable words (yellow + green) is at least 6', () => {
    const onStartMode = vi.fn();
    render(
      <RefreshMenu
        onStartMode={onStartMode}
        totalPlayable={6}
        yellowCount={2}
      />
    );

    expect(screen.getByText('6 คำ')).toBeInTheDocument();
    expect(screen.getByText('ทบทวนด่วน 2 คำ (เล่นก่อน)')).toBeInTheDocument();
    expect(screen.getByText('พร้อมทบทวน')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    const matchingBtn = buttons.find((b) => b.textContent?.includes('Bubble Pop'));
    const typingBtn = buttons.find((b) => b.textContent?.includes('พิมพ์ศัพท์จับจังหวะ'));

    expect(matchingBtn).toBeEnabled();
    expect(typingBtn).toBeEnabled();

    if (typingBtn) {
      fireEvent.click(typingBtn);
      expect(onStartMode).toHaveBeenCalledWith('typing');
    }
  });

  it('locks modes when total words is less than 6 (e.g. 4 words)', () => {
    const onStartMode = vi.fn();
    render(
      <RefreshMenu
        onStartMode={onStartMode}
        totalPlayable={4}
        yellowCount={1}
      />
    );

    expect(screen.getByText('4 คำ')).toBeInTheDocument();
    expect(screen.getByText('ทบทวนด่วน 1 คำ (เล่นก่อน)')).toBeInTheDocument();
    expect(screen.getByText('ไปสะสมคำที่แชต →')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    const typingBtn = buttons.find((b) => b.textContent?.includes('พิมพ์ศัพท์จับจังหวะ'));
    expect(typingBtn).toBeDisabled();

    // Check lock reason shows remaining needed
    expect(screen.getAllByText('ต้องการอีก 2 คำ').length).toBeGreaterThan(0);
  });

  it('locks modes when totalPlayable is 0', () => {
    const onStartMode = vi.fn();
    render(
      <RefreshMenu
        onStartMode={onStartMode}
        totalPlayable={0}
        yellowCount={0}
      />
    );

    expect(screen.getByText('0 คำ')).toBeInTheDocument();
    expect(screen.getByText('ไปสะสมคำที่แชต →')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    const typingBtn = buttons.find((b) => b.textContent?.includes('พิมพ์ศัพท์จับจังหวะ'));
    expect(typingBtn).toBeDisabled();
    expect(screen.getAllByText('ต้องการอีก 6 คำ').length).toBeGreaterThan(0);
  });

  it('keeps speak mode unlocked when budget is exhausted as long as words are available', () => {
    render(
      <RefreshMenu
        onStartMode={vi.fn()}
        totalPlayable={10}
        yellowCount={0}
        isBudgetExhausted={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    const speakBtn = buttons.find((b) => b.textContent?.includes('Sonic Blaster'));
    expect(speakBtn).toBeEnabled();

    const typingBtn = buttons.find((b) => b.textContent?.includes('พิมพ์ศัพท์จับจังหวะ'));
    expect(typingBtn).toBeEnabled();
  });
});
