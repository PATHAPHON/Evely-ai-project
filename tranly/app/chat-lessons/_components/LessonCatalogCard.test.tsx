import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LessonCatalogCard from './LessonCatalogCard';
import type { PreLoadedLesson } from '../_lib/types';

// Mock useLanguagePreference to control the language output
vi.mock('@/app/_lib/useLanguagePreference', () => ({
  useLanguagePreference: vi.fn(() => ({ language: 'thai', setLanguage: vi.fn() })),
}));

import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';

const mockLesson: PreLoadedLesson = {
  id: 'test-lesson-1',
  titleTh: 'ทักทายเบื้องต้น',
  titleEn: 'Basic Greetings',
  category: 'greetings',
  proficiencyLevel: 'beginner',
  targetLanguage: 'korean',
  descriptionTh: 'เรียนรู้คำทักทายพื้นฐานในภาษาเกาหลี',
  descriptionEn: 'Learn basic greeting phrases in Korean',
  wordContext: ['안녕하세요', '감사합니다'],
  goal: 'Practice basic greetings',
  systemContext: 'Teach basic Korean greetings',
  icon: 'SmileOutlined',
};

describe('LessonCatalogCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the lesson title in Thai when language is thai', () => {
    vi.mocked(useLanguagePreference).mockReturnValue({ language: 'thai', setLanguage: vi.fn() });
    render(<LessonCatalogCard lesson={mockLesson} onSelect={vi.fn()} />);
    expect(screen.getByText('ทักทายเบื้องต้น')).toBeInTheDocument();
  });

  it('renders the lesson title in English when language is english', () => {
    vi.mocked(useLanguagePreference).mockReturnValue({ language: 'english', setLanguage: vi.fn() });
    render(<LessonCatalogCard lesson={mockLesson} onSelect={vi.fn()} />);
    expect(screen.getByText('Basic Greetings')).toBeInTheDocument();
  });

  it('renders the level badge text in Thai when language is thai', () => {
    vi.mocked(useLanguagePreference).mockReturnValue({ language: 'thai', setLanguage: vi.fn() });
    render(<LessonCatalogCard lesson={mockLesson} onSelect={vi.fn()} />);
    expect(screen.getByText('เริ่มต้น')).toBeInTheDocument();
  });

  it('renders the level badge text in English when language is english', () => {
    vi.mocked(useLanguagePreference).mockReturnValue({ language: 'english', setLanguage: vi.fn() });
    render(<LessonCatalogCard lesson={mockLesson} onSelect={vi.fn()} />);
    expect(screen.getByText('Beginner')).toBeInTheDocument();
  });

  it('renders the lesson description in Thai when language is thai', () => {
    vi.mocked(useLanguagePreference).mockReturnValue({ language: 'thai', setLanguage: vi.fn() });
    render(<LessonCatalogCard lesson={mockLesson} onSelect={vi.fn()} />);
    expect(screen.getByText('เรียนรู้คำทักทายพื้นฐานในภาษาเกาหลี')).toBeInTheDocument();
  });

  it('renders the lesson description in English when language is english', () => {
    vi.mocked(useLanguagePreference).mockReturnValue({ language: 'english', setLanguage: vi.fn() });
    render(<LessonCatalogCard lesson={mockLesson} onSelect={vi.fn()} />);
    expect(screen.getByText('Learn basic greeting phrases in Korean')).toBeInTheDocument();
  });

  it('calls onSelect with the lesson when clicked', () => {
    vi.mocked(useLanguagePreference).mockReturnValue({ language: 'thai', setLanguage: vi.fn() });
    const onSelect = vi.fn();
    render(<LessonCatalogCard lesson={mockLesson} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockLesson);
  });
});
