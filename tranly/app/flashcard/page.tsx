'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { message as antdMessage } from 'antd';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import { useStrings } from '@/app/_lib/strings';
import { useWordContext } from '@/app/chat/_lib/useWordContext';
import FlashcardSetupGuide from '@/app/chat/_components/FlashcardSetupGuide';
import { FlashcardMode } from '@/app/learn/_components/FlashcardMode';
import type { SavedWord } from '@/app/chat/_lib/types';

type FlashcardView = 'setup' | 'study';

export default function FlashcardPage() {
  const router = useRouter();
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';
  const t = useStrings();
  const [messageApi, navMessageHolder] = antdMessage.useMessage();

  const { savedWords, loadSavedWords } = useWordContext();
  const [view, setView] = useState<FlashcardView>('setup');
  const [flashcardWords, setFlashcardWords] = useState<SavedWord[]>([]);
  const [flashcardStudying, setFlashcardStudying] = useState(false);
  const [wordsLoaded, setWordsLoaded] = useState(false);

  // Load saved words on mount
  useEffect(() => {
    void loadSavedWords().finally(() => setWordsLoaded(true));
  }, [loadSavedWords]);

  // Navigation away is locked while a study session is in progress.
  const navLocked = flashcardStudying;

  const handleNav = useCallback(
    (path: string) => {
      if (navLocked) {
        messageApi.open({ key: 'nav-locked', type: 'info', content: t.chat.navLockedHint });
        return;
      }
      router.push(path);
    },
    [navLocked, router, messageApi, t],
  );

  const handleStartFlashcards = useCallback((filtered: SavedWord[]) => {
    setFlashcardWords(filtered);
    setView('study');
  }, []);

  // Only treat "no words" as final once the initial load has completed, so the
  // empty state doesn't flash while IndexedDB is still being read.
  const hasNoWords = wordsLoaded && savedWords.length === 0;

  return (
    <div className="flex flex-col h-dvh bg-background relative">
      {navMessageHolder}

      {/* Local styles for premium silky page-load transitions */}
      <style>{`
        @keyframes cardFadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-card-fade-in {
          animation: cardFadeInUp 0.45s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
        }
      `}</style>

      {/* Exit button — floats over the setup guide so the learner can back out
          to the chat hub. Mirrors the tutor page. */}
      {view === 'setup' && (
        <button
          type="button"
          onClick={() => handleNav('/chat')}
          className="absolute top-5 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border-3 border-border-color bg-card-bg text-text-primary shadow-nb-sm transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:bg-gray-50 dark:hover:bg-[#3d3d5c]"
          aria-label={isThai ? 'ออก' : 'Exit'}
        >
          <ArrowLeftOutlined style={{ fontSize: 18 }} />
        </button>
      )}

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden animate-card-fade-in" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {hasNoWords ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="text-5xl">🎴</div>
            <p className="text-base font-bold text-text-primary">
              {isThai ? 'ยังไม่มีคำศัพท์ในคลัง' : 'No saved words yet'}
            </p>
            <p className="text-sm text-text-secondary">
              {isThai
                ? 'กรุณาสแกนคำศัพท์เข้าคลังก่อนเริ่มเล่นบัตรคำนะจ๊ะ!'
                : 'Please scan and save some words first!'}
            </p>
            <button
              type="button"
              onClick={() => router.push('/chat')}
              className="rounded-xl border-3 border-border-color bg-accent-green px-6 py-3 text-base font-bold text-white shadow-nb-md transition-all cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm"
            >
              {isThai ? 'ไปสแกนคำศัพท์' : 'Go scan words'}
            </button>
          </div>
        ) : (
          <>
            {/* ===== Flashcard Setup Guide Q&A ===== */}
            {view === 'setup' && wordsLoaded && (
              <FlashcardSetupGuide
                savedWords={savedWords}
                onStartFlashcards={handleStartFlashcards}
              />
            )}

            {/* ===== Flashcard study view ===== */}
            {view === 'study' && flashcardWords && flashcardWords.length > 0 && (
              <div className="flex-1 overflow-y-auto px-4 mt-2">
                <FlashcardMode
                  words={flashcardWords.map((w: any) => ({
                    id: w.id,
                    imageBlob: w.imageBlob || new Blob(),
                    label: w.thai || w.translation || w.label || '',
                    language: w.language || 'korean',
                    korean: w.korean || '',
                    reading: w.reading || '',
                    romanization: w.romanization || '',
                    english: w.english || '',
                    createdAt: w.createdAt || Date.now(),
                  }))}
                  onStudyingChange={setFlashcardStudying}
                />
              </div>
            )}
          </>
        )}
      </main>

    </div>
  );
}
