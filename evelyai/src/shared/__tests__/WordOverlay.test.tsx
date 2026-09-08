import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WordOverlay } from '../components/WordOverlay';

describe('WordOverlay', () => {
  const defaultProps = {
    word: 'hello',
    x: 100,
    top: 200,
    bottom: 220,
    onClose: vi.fn(),
    onAdd: vi.fn().mockResolvedValue(undefined),
    onForget: vi.fn().mockResolvedValue(undefined),
    onDetail: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders green Add button and Detail button for unknown status', () => {
    render(<WordOverlay {...defaultProps} status="unknown" />);

    expect(screen.getByLabelText('Add')).toBeInTheDocument();
    expect(screen.getByLabelText('รายละเอียด')).toBeInTheDocument();
    expect(screen.queryByLabelText('ลืม / ทบทวน')).not.toBeInTheDocument();
  });

  it('renders yellow Forget button and Detail button for known status (no Add button)', () => {
    render(<WordOverlay {...defaultProps} status="known" />);

    expect(screen.queryByLabelText('Add')).not.toBeInTheDocument();
    expect(screen.getByLabelText('ลืม / ทบทวน')).toBeInTheDocument();
    expect(screen.getByLabelText('รายละเอียด')).toBeInTheDocument();
  });

  it('renders only Detail button for needs_review status (no Add or Forget button)', () => {
    render(<WordOverlay {...defaultProps} status="needs_review" />);

    expect(screen.queryByLabelText('Add')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('ลืม / ทบทวน')).not.toBeInTheDocument();
    expect(screen.getByLabelText('รายละเอียด')).toBeInTheDocument();
  });

  it('calls onAdd and closes when Add button is clicked', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<WordOverlay {...defaultProps} status="unknown" onAdd={onAdd} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Add'));

    expect(onAdd).toHaveBeenCalledWith('hello');
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('calls onForget and closes when Forget button is clicked', async () => {
    const onForget = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<WordOverlay {...defaultProps} status="known" onForget={onForget} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('ลืม / ทบทวน'));

    expect(onForget).toHaveBeenCalledWith('hello');
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('calls onDetail and closes when Detail button is clicked', async () => {
    const onDetail = vi.fn();
    const onClose = vi.fn();
    render(<WordOverlay {...defaultProps} status="known" onDetail={onDetail} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('รายละเอียด'));

    expect(onDetail).toHaveBeenCalledWith('hello');
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
