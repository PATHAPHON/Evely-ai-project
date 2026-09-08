import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ChatInput, { type ChatInputProps } from '../ChatInput';
import type { SavedWord } from '@/shared/types/chatTypes';

const defaultProps: ChatInputProps = {
  onSend: vi.fn(),
  isLoading: false,
  sttSupported: true,
  isListening: false,
  onStartListening: vi.fn(),
  onStopListening: vi.fn(),
  transcript: '',
  selectedWords: [],
  onRemoveWord: vi.fn(),
};

function renderChatInput(overrides: Partial<ChatInputProps> = {}) {
  return render(<ChatInput {...defaultProps} {...overrides} />);
}

describe('ChatInput', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders text input field', () => {
    renderChatInput();
    expect(screen.getByLabelText('ช่องพิมพ์ข้อความ')).toBeInTheDocument();
  });

  it('does not render send button when input is empty', () => {
    renderChatInput();
    expect(screen.queryByLabelText('ส่งข้อความ')).not.toBeInTheDocument();
  });

  it('enables send button when input has non-whitespace text', () => {
    renderChatInput();
    const input = screen.getByLabelText('ช่องพิมพ์ข้อความ');
    fireEvent.change(input, { target: { value: '안녕하세요' } });
    expect(screen.getByLabelText('ส่งข้อความ')).not.toBeDisabled();
  });

  it('does not render send button when input is only whitespace', () => {
    renderChatInput();
    const input = screen.getByLabelText('ช่องพิมพ์ข้อความ');
    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.queryByLabelText('ส่งข้อความ')).not.toBeInTheDocument();
  });

  it('calls onSend with trimmed text when send button is clicked', () => {
    const onSend = vi.fn();
    renderChatInput({ onSend });
    const input = screen.getByLabelText('ช่องพิมพ์ข้อความ');
    fireEvent.change(input, { target: { value: '  hello  ' } });
    fireEvent.click(screen.getByLabelText('ส่งข้อความ'));
    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('clears input after sending', () => {
    renderChatInput();
    const input = screen.getByLabelText('ช่องพิมพ์ข้อความ') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.click(screen.getByLabelText('ส่งข้อความ'));
    expect(input.value).toBe('');
  });

  it('sends message on Enter key press', () => {
    const onSend = vi.fn();
    renderChatInput({ onSend });
    const input = screen.getByLabelText('ช่องพิมพ์ข้อความ');
    fireEvent.change(input, { target: { value: 'enter test' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('enter test');
  });

  it('does not send on Shift+Enter', () => {
    const onSend = vi.fn();
    renderChatInput({ onSend });
    const input = screen.getByLabelText('ช่องพิมพ์ข้อความ');
    fireEvent.change(input, { target: { value: 'no send' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('constrains input to 500 characters', () => {
    renderChatInput();
    const input = screen.getByLabelText('ช่องพิมพ์ข้อความ') as HTMLInputElement;
    const longText = 'a'.repeat(600);
    fireEvent.change(input, { target: { value: longText } });
    expect(input.value.length).toBeLessThanOrEqual(500);
  });

  it('hides microphone button when STT is not supported', () => {
    renderChatInput({ sttSupported: false });
    expect(screen.queryByLabelText('เริ่มพูด')).not.toBeInTheDocument();
  });

  it('shows microphone button when STT is supported', () => {
    renderChatInput({ sttSupported: true });
    expect(screen.getByLabelText('เริ่มพูด')).toBeInTheDocument();
  });

  it('calls onStartListening when mic button is clicked and not listening', () => {
    const onStartListening = vi.fn();
    renderChatInput({ onStartListening, isListening: false });
    fireEvent.click(screen.getByLabelText('เริ่มพูด'));
    expect(onStartListening).toHaveBeenCalledTimes(1);
  });

  it('calls onStopListening when mic button is clicked and is listening', () => {
    const onStopListening = vi.fn();
    renderChatInput({ onStopListening, isListening: true });
    fireEvent.click(screen.getByLabelText('หยุดพูด'));
    expect(onStopListening).toHaveBeenCalledTimes(1);
  });

  it('shows pulsing animation on mic button when listening', () => {
    renderChatInput({ isListening: true });
    const micBtn = screen.getByLabelText('หยุดพูด');
    expect(micBtn.className).toContain('animate-pulse');
    expect(micBtn.className).toContain('bg-incorrect');
  });

  it('inserts transcript into input field', () => {
    const { rerender } = render(<ChatInput {...defaultProps} transcript="" />);
    rerender(<ChatInput {...defaultProps} transcript="안녕" />);
    const input = screen.getByLabelText('ช่องพิมพ์ข้อความ') as HTMLInputElement;
    expect(input.value).toContain('안녕');
  });

  it('displays selected words as removable tags', () => {
    const words: SavedWord[] = [
      { id: '1', englishText: 'apple', english: 'apple', thai: 'แอปเปิ้ล', source: 'word-store' },
      { id: '2', englishText: 'banana', english: 'banana', thai: 'กล้วย', source: 'feed-words' },
    ];
    renderChatInput({ selectedWords: words });
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('banana')).toBeInTheDocument();
  });

  it('calls onRemoveWord when remove button on tag is clicked', () => {
    const onRemoveWord = vi.fn();
    const words: SavedWord[] = [
      { id: '1', englishText: 'apple', english: 'apple', thai: 'แอปเปิ้ล', source: 'word-store' },
    ];
    renderChatInput({ selectedWords: words, onRemoveWord });
    fireEvent.click(screen.getByLabelText('ลบ apple'));
    expect(onRemoveWord).toHaveBeenCalledWith('1');
  });

  it('disables input when isLoading is true, and disables send button when input has text', () => {
    renderChatInput({ isLoading: true });
    const input = screen.getByLabelText('ช่องพิมพ์ข้อความ') as HTMLInputElement;
    expect(input).toBeDisabled();

    // Type some text to make the send button appear
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(screen.getByLabelText('ส่งข้อความ')).toBeDisabled();
  });
});
