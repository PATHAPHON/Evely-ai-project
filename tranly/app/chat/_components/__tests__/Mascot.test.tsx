import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Mascot from '../Mascot';

describe('Mascot', () => {
  it('renders a tappable mascot with an accessible label', () => {
    render(<Mascot />);
    expect(
      screen.getByRole('button', { name: /elephant mascot/i }),
    ).toBeInTheDocument();
  });

  it('uses the breathing animation when idle', () => {
    const { container } = render(<Mascot state="idle" />);
    expect(container.querySelector('svg')).toHaveClass('mascot-breathe');
  });

  it('uses the thinking animation while the AI generates', () => {
    const { container } = render(<Mascot state="thinking" />);
    expect(container.querySelector('svg')).toHaveClass('mascot-think');
  });

  it('hops with the bounce animation on a fresh reply', () => {
    const { container } = render(<Mascot state="happy" />);
    expect(container.querySelector('svg')).toHaveClass('mascot-bounce');
  });

  it('reacts with a bounce when tapped', () => {
    const { container } = render(<Mascot state="idle" />);
    fireEvent.click(screen.getByRole('button', { name: /elephant mascot/i }));
    expect(container.querySelector('svg')).toHaveClass('mascot-bounce');
  });

  it('respects an explicit size', () => {
    const { container } = render(<Mascot size={64} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '64');
    expect(svg).toHaveAttribute('height', '64');
  });
});
