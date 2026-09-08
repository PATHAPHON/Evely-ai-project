import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ElephantMascot from '@/shared/components/mascots/ElephantMascot';

describe('ElephantMascot', () => {
  it('renders a tappable mascot with an accessible label', () => {
    render(<ElephantMascot />);
    expect(
      screen.getByRole('button', { name: "มาสคอตช้าง Evely AI" }),
    ).toBeInTheDocument();
  });

  it('uses the breathing animation when idle', () => {
    const { container } = render(<ElephantMascot state="idle" />);
    expect(container.querySelector('svg')).toHaveClass('mascot-breathe');
  });

  it('uses the thinking animation while the AI generates', () => {
    const { container } = render(<ElephantMascot state="thinking" />);
    expect(container.querySelector('svg')).toHaveClass('mascot-think');
  });

  it('hops with the bounce animation on a fresh reply', () => {
    const { container } = render(<ElephantMascot state="happy" />);
    expect(container.querySelector('svg')).toHaveClass('mascot-bounce');
  });

  it('reacts with a bounce when tapped', () => {
    const { container } = render(<ElephantMascot state="idle" />);
    fireEvent.click(screen.getByRole('button', { name: "มาสคอตช้าง Evely AI" }));
    expect(container.querySelector('svg')).toHaveClass('mascot-bounce');
  });

  it('respects an explicit size', () => {
    const { container } = render(<ElephantMascot size={64} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '64');
    expect(svg).toHaveAttribute('height', '64');
  });
});
