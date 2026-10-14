import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CustomRoleModal from '../CustomRoleModal';

describe('CustomRoleModal', () => {
  const onClose = vi.fn();
  const onSave = vi.fn();
  const onClear = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <CustomRoleModal
        isOpen={false}
        onClose={onClose}
        currentPrompt="Test prompt"
        onSave={onSave}
        onClear={onClear}
      />
    );

    expect(screen.queryByText('ตั้งค่าบทบาท AI')).not.toBeInTheDocument();
  });

  it('renders modal content correctly when isOpen is true', () => {
    render(
      <CustomRoleModal
        isOpen={true}
        onClose={onClose}
        currentPrompt=""
        onSave={onSave}
        onClear={onClear}
      />
    );

    expect(screen.getByText('ตั้งค่าบทบาท AI')).toBeInTheDocument();
    expect(screen.getByText('Custom Persona / Role')).toBeInTheDocument();
    expect(
      screen.getByText(/กำหนดบทบาท บุคลิก หรือสถานการณ์ให้ AI/i)
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        'เช่น คุณคือครูสอนภาษาอังกฤษใจดีที่คอยช่วยแนะนำคำศัพท์และแก้ประโยคให้เข้าใจง่าย...'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('0/1000')).toBeInTheDocument();
    expect(screen.getByText('ยกเลิก')).toBeInTheDocument();
    expect(screen.getByText('บันทึกบทบาท')).toBeInTheDocument();
    // When currentPrompt is empty, clear button shouldn't appear
    expect(screen.queryByText('ล้างค่าบทบาท')).not.toBeInTheDocument();
  });

  it('initializes draft text with currentPrompt and displays character count', () => {
    render(
      <CustomRoleModal
        isOpen={true}
        onClose={onClose}
        currentPrompt="คุณคือบาริสต้า"
        onSave={onSave}
        onClear={onClear}
      />
    );

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('คุณคือบาริสต้า');
    expect(screen.getByText(`${'คุณคือบาริสต้า'.length}/1000`)).toBeInTheDocument();
    expect(screen.getByText('ล้างค่าบทบาท')).toBeInTheDocument();
  });

  it('calls onSave with updated draft and calls onClose when saving', () => {
    render(
      <CustomRoleModal
        isOpen={true}
        onClose={onClose}
        currentPrompt="Prompt 1"
        onSave={onSave}
        onClear={onClear}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New persona updated' } });

    expect(screen.getByText(`${'New persona updated'.length}/1000`)).toBeInTheDocument();

    const saveButton = screen.getByText('บันทึกบทบาท');
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith('New persona updated');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClear and onClose when clicking ล้างค่าบทบาท', () => {
    render(
      <CustomRoleModal
        isOpen={true}
        onClose={onClose}
        currentPrompt="Existing persona"
        onSave={onSave}
        onClear={onClear}
      />
    );

    const clearButton = screen.getByText('ล้างค่าบทบาท');
    fireEvent.click(clearButton);

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking ยกเลิก or close button', () => {
    render(
      <CustomRoleModal
        isOpen={true}
        onClose={onClose}
        currentPrompt=""
        onSave={onSave}
        onClear={onClear}
      />
    );

    const cancelButton = screen.getByText('ยกเลิก');
    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalledTimes(1);

    const closeButton = screen.getByLabelText('ปิด');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('calls onClose when pressing Escape key', () => {
    render(
      <CustomRoleModal
        isOpen={true}
        onClose={onClose}
        currentPrompt=""
        onSave={onSave}
        onClear={onClear}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking outside modal backdrop', () => {
    const { container } = render(
      <CustomRoleModal
        isOpen={true}
        onClose={onClose}
        currentPrompt=""
        onSave={onSave}
        onClear={onClear}
      />
    );

    const backdrop = document.querySelector('.animate-fade-in');
    expect(backdrop).toBeInTheDocument();

    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('does not call onClose when clicking inside the modal dialog', () => {
    render(
      <CustomRoleModal
        isOpen={true}
        onClose={onClose}
        currentPrompt=""
        onSave={onSave}
        onClear={onClear}
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
  });
});
