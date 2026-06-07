import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn().mockReturnValue(null),
  })),
}));

// Mock useLanguagePreference
vi.mock('@/app/_lib/useLanguagePreference', () => ({
  useLanguagePreference: vi.fn(() => ({ language: 'english', setLanguage: vi.fn() })),
}));

// Mock useActiveLanguage
vi.mock('@/app/_lib/ActiveLanguageContext', () => ({
  useActiveLanguage: vi.fn(() => ({
    activeLanguage: 'korean',
    setActiveLanguage: vi.fn(),
  })),
}));

// Mock StatsBar (simple div placeholder)
vi.mock('@/app/_components/StatsBar', () => ({
  default: () => <div data-testid="stats-bar">StatsBar</div>,
}));

// Mock useGems
vi.mock('@/app/_lib/GemsContext', () => ({
  useGems: vi.fn(() => ({
    gems: 176,
    energy: 15,
    earnGems: vi.fn(),
    spendGems: vi.fn().mockReturnValue(true),
    hasEnoughGems: vi.fn().mockReturnValue(true),
    recoverEnergy: vi.fn(),
    useEnergy: vi.fn().mockReturnValue(true),
  })),
}));

// Mock useConversationSession
vi.mock('@/app/chat/_lib/useConversationSession', () => ({
  useConversationSession: vi.fn(() => ({
    messages: [],
    sendMessage: vi.fn(),
    retryLastMessage: vi.fn(),
    isLoading: false,
    error: null,
    sessionConfig: null,
    isEnded: false,
    startSession: vi.fn(),
    endSession: vi.fn(),
  })),
}));

// Mock useTTS
vi.mock('@/app/chat/_lib/useTTS', () => ({
  useTTS: vi.fn(() => ({
    speak: vi.fn(),
    stop: vi.fn(),
    isSpeaking: false,
    isSupported: false,
  })),
}));

// Mock useSTT
vi.mock('@/app/chat/_lib/useSTT', () => ({
  useSTT: vi.fn(() => ({
    startListening: vi.fn(),
    stopListening: vi.fn(),
    isListening: false,
    transcript: '',
    isSupported: false,
  })),
}));

// Mock speechLangForLanguage
vi.mock('@/app/chat/_lib/speechLangForLanguage', () => ({
  speechLangForLanguage: vi.fn(() => 'ko-KR'),
}));

// Mock Supabase Client
vi.mock('@/app/_lib/supabaseClient', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'test-user-id' } }, error: null })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
        upsert: vi.fn(async () => ({ data: null, error: null })),
        insert: vi.fn(async () => ({ data: null, error: null })),
      })),
    },
  };
});

// Mock ChatList
vi.mock('@/app/chat/_components/ChatList', () => ({
  default: () => <div data-testid="chat-list">ChatList</div>,
}));

// Mock ChatInput
vi.mock('@/app/chat/_components/ChatInput', () => ({
  default: () => <div data-testid="chat-input">ChatInput</div>,
}));

// Mock ReplySuggestions
vi.mock('@/app/chat/_components/ReplySuggestions', () => ({
  default: () => <div data-testid="reply-suggestions">ReplySuggestions</div>,
}));

import { ChatLessonsContent } from './page';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ChatLessonsPage – page navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the lesson catalog (catalog view) on initial load', async () => {
    render(<ChatLessonsContent />);

    // The page header title should be visible
    expect(screen.getByText('Chat Lessons')).toBeInTheDocument();

    // StatsBar should be visible in catalog view
    expect(screen.getByTestId('stats-bar')).toBeInTheDocument();

    // Lesson cards should be rendered (lessons are loaded from getLessonsByLanguage('korean'))
    expect(await screen.findByText('Basic Greetings')).toBeInTheDocument();
  });

  it('transitions to chatting state when a lesson card is clicked', async () => {
    render(<ChatLessonsContent />);

    // Verify we start in catalog view
    expect(screen.getByText('Chat Lessons')).toBeInTheDocument();

    // Click the first lesson card (Basic Greetings)
    const lessonCardText = await screen.findByText('Basic Greetings');
    const lessonCard = lessonCardText.closest('.cursor-pointer');
    expect(lessonCard).not.toBeNull();
    fireEvent.click(lessonCard!);

    // After clicking, the view should transition to chatting state
    // The lesson title should appear in the chatting header
    await waitFor(() => {
      expect(screen.getByText('Basic Greetings')).toBeInTheDocument();
    });

    // The ChatList mock should be visible (chat interface is showing)
    expect(screen.getByTestId('chat-list')).toBeInTheDocument();

    // The catalog header "Chat Lessons" should no longer be visible
    expect(screen.queryByText('Chat Lessons')).not.toBeInTheDocument();

    // StatsBar should no longer be visible in chatting view
    expect(screen.queryByTestId('stats-bar')).not.toBeInTheDocument();
  });

  it('shows the End Chat button in chatting state', async () => {
    render(<ChatLessonsContent />);

    // Click a lesson card to enter chatting state
    const lessonCardText = await screen.findByText('Basic Greetings');
    const lessonCard = lessonCardText.closest('.cursor-pointer');
    fireEvent.click(lessonCard!);

    // End Chat button should be visible
    expect(await screen.findByText('End Chat')).toBeInTheDocument();
  });

  it('shows the chat input in chatting state', async () => {
    render(<ChatLessonsContent />);

    // Click a lesson card
    const lessonCardText = await screen.findByText('Basic Greetings');
    const lessonCard = lessonCardText.closest('.cursor-pointer');
    fireEvent.click(lessonCard!);

    // ChatInput mock should be rendered
    expect(await screen.findByTestId('chat-input')).toBeInTheDocument();
  });
});
