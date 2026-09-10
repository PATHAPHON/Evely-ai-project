import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SandboxCheckoutModal from '../components/SandboxCheckoutModal';

describe('SandboxCheckoutModal', () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('does not render when isOpen is false', () => {
    render(
      <SandboxCheckoutModal
        isOpen={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );
    expect(screen.queryByText('ทดสอบการชำระเงิน')).not.toBeInTheDocument();
  });

  it('renders test card credentials correctly when isOpen is true', () => {
    render(
      <SandboxCheckoutModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('ทดสอบการชำระเงิน')).toBeInTheDocument();
    expect(screen.getByText('Sandbox')).toBeInTheDocument();
    expect(screen.getByText('4242 4242 4242 4242')).toBeInTheDocument();
    expect(screen.getByText('01/30')).toBeInTheDocument();
    expect(screen.getByText('424')).toBeInTheDocument();
    expect(screen.getByText('ไปยังหน้าชำระเงิน')).toBeInTheDocument();
    expect(screen.getByText('ยกเลิก')).toBeInTheDocument();
  });

  it('calls onConfirm when clicking proceed button', () => {
    render(
      <SandboxCheckoutModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByText('ไปยังหน้าชำระเงิน'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking cancel button or close X button', () => {
    render(
      <SandboxCheckoutModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByText('ยกเลิก'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('ปิด'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('copies card number to clipboard when clicking copy button', async () => {
    render(
      <SandboxCheckoutModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    const copyBtn = screen.getByTitle('คัดลอกหมายเลขบัตร');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('4242424242424242');
    await waitFor(() => {
      expect(screen.getByText('คัดลอกแล้ว')).toBeInTheDocument();
    });
  });

  it('shows loading state when loading is true', () => {
    render(
      <SandboxCheckoutModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        loading={true}
      />
    );

    expect(screen.getByText('กำลังเตรียมหน้าชำระเงิน...')).toBeInTheDocument();
    expect(screen.getByText('กำลังเตรียมหน้าชำระเงิน...').closest('button')).toBeDisabled();
  });
});
