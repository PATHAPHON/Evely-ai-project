import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UserMessage from '../UserMessage';
import type { ChatMessage } from '@/shared/types/chatTypes';

const baseMsg: ChatMessage = {
  id: 'msg-1',
  role: 'user',
  englishText: 'Hello world',
  translation: 'สวัสดีชาวโลก',
  english: 'Hello world',
  rawText: 'Hello world',
  timestamp: new Date().toISOString(),
  status: 'sent',
};

describe('UserMessage', () => {
  it('renders correctly when grammar is correct', () => {
    const msg: ChatMessage = {
      ...baseMsg,
      grammarCorrect: true,
    };
    render(<UserMessage message={msg} />);
    expect(screen.getByTitle('ไวยากรณ์ถูกต้อง')).toBeInTheDocument();
  });

  it('renders error icon and opens modal showing incorrect sentence, corrected sentence, and explanation', () => {
    const msg: ChatMessage = {
      ...baseMsg,
      englishText: 'I went to school yesterday.',
      rawText: 'I goes to school yesterday',
      originalText: 'I goes to school yesterday',
      correctedText: 'I went to school yesterday.',
      grammarCorrect: false,
      grammarNotes: 'ควรใช้ "went" แทน "goes" เพราะมี yesterday บอกอดีต',
    };
    render(<UserMessage message={msg} />);

    // Check error button is rendered
    const errorBtn = screen.getByLabelText('ดูรายละเอียดจุดที่ผิด');
    expect(errorBtn).toBeInTheDocument();

    // Click to open modal
    fireEvent.click(errorBtn);

    // Modal title
    expect(screen.getByText('จุดที่ไวยากรณ์ผิด')).toBeInTheDocument();

    // Sections
    expect(screen.getByText('ประโยคเดิมที่ผิด')).toBeInTheDocument();
    expect(screen.getByText('I goes to school yesterday')).toBeInTheDocument();

    expect(screen.getByText('ประโยคที่ถูกต้อง')).toBeInTheDocument();
    expect(screen.getAllByText('I went to school yesterday.').length).toBeGreaterThan(0);

    expect(screen.getByText('คำอธิบายวิธีแก้ไข')).toBeInTheDocument();
    expect(screen.getByText('ควรใช้ "went" แทน "goes" เพราะมี yesterday บอกอดีต')).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: 'ปิด' });
    fireEvent.click(closeBtn);
    expect(screen.queryByText('จุดที่ไวยากรณ์ผิด')).not.toBeInTheDocument();
  });

  it('renders fallback error icon and modal when grammarError is present', () => {
    const msg: ChatMessage = {
      ...baseMsg,
      grammarError: 'งบประมาณการตรวจสอบไวยากรณ์รายวันหมดแล้ว',
    };
    render(<UserMessage message={msg} />);

    // Check fallback error button is rendered
    const statusBtn = screen.getByLabelText('สถานะการตรวจไวยากรณ์');
    expect(statusBtn).toBeInTheDocument();

    // Click to open modal
    fireEvent.click(statusBtn);

    // Modal shows status
    expect(screen.getByText('สถานะการตรวจไวยากรณ์')).toBeInTheDocument();
    expect(screen.getByText('ไม่สามารถตรวจสอบไวยากรณ์ได้ในขณะนี้')).toBeInTheDocument();
    expect(screen.getByText('งบประมาณการตรวจสอบไวยากรณ์รายวันหมดแล้ว')).toBeInTheDocument();
  });

  it('renders slash command plain without grammar indicator', () => {
    const msg: ChatMessage = {
      ...baseMsg,
      englishText: '',
      rawText: '/topic travel',
      grammarCorrect: true,
    };
    render(<UserMessage message={msg} />);
    expect(screen.getByText('/topic travel')).toBeInTheDocument();
    expect(screen.queryByTitle('ไวยากรณ์ถูกต้อง')).not.toBeInTheDocument();
  });
});
