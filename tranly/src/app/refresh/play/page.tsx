'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWordBank } from '@/shared/hooks/useWordBank';
import { useUserProfile } from '@/shared/hooks/useUserProfile';
import { useBudgetExhausted } from '@/shared/hooks/useBudgetExhausted';
import GameShell from '@/features/refresh/components/GameShell';
import MatchingGame from '@/features/refresh/components/MatchingGame';
import TypingGame from '@/features/refresh/components/TypingGame';
import SpeakGame from '@/features/refresh/components/SpeakGame';
import SummaryScreen from '@/features/refresh/components/SummaryScreen';
import { shuffle } from '@/features/refresh/utils/shuffle';

type GameKind = 'matching' | 'typing' | 'speak';
type Phase = 'loading' | 'playing' | 'summary';

interface QueueItem {
  id: string;
  wordId: string;
  word: string;
  thai: string;
  game: GameKind;
}

const WORDS_PER_MODE = 5;

const TITLES: Record<GameKind, string> = {
  matching: 'จับคู่ให้ถูกต้อง',
  typing: 'แปลคำต่อไปนี้',
  speak: 'บอกคำภาษาอังกฤษ',
};

export default function RefreshPlayPage() {
  const router = useRouter();
  const { words, reviewWord, isLoading } = useWordBank();
  const { isPremium } = useUserProfile();
  const { exhausted: isBudgetExhausted } = useBudgetExhausted();

  const [phase, setPhase] = useState<Phase>('loading');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [initialTotal, setInitialTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const [improved, setImproved] = useState(0);
  const [isPractice, setIsPractice] = useState(false);

  useEffect(() => {
    if (isLoading || phase !== 'loading') return;

    const hasThai = (w: typeof words[number]) => !!w.thai && !!w.thai.trim();

    // Dedup by normalized word, then shuffle — ensures no duplicate words in one session
    function dedupShuffle<T extends { word: string }>(list: T[]): T[] {
      const m = new Map<string, T>();
      for (const e of list) {
        const k = e.word.toLowerCase().trim();
        if (!m.has(k)) m.set(k, e);
      }
      const arr = [...m.values()];
      shuffle(arr);
      return arr;
    }

    const yellow = dedupShuffle(words.filter((w) => w.status === 'needs_review' && hasThai(w)));

    const availableModes: GameKind[] = isBudgetExhausted
      ? ['matching', 'typing']
      : ['matching', 'typing', 'speak'];

    const requiredTotal = availableModes.length * WORDS_PER_MODE;

    // Gate: require at least requiredTotal (15 or 10) yellow words to play
    if (yellow.length < requiredTotal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQueue([]);
      setInitialTotal(0);
      setIsPractice(false);
      setIndex(0);
      setImproved(0);
      setPhase('summary');
      return;
    }

    // Pick exactly requiredTotal yellow words
    const selected = yellow.slice(0, requiredTotal);
    shuffle(selected);

    // Group mode by mode: exactly 5 words per mode, sequential progression
    const items: QueueItem[] = availableModes.flatMap((mode, modeIndex) => {
      const modeWords = selected.slice(
        modeIndex * WORDS_PER_MODE,
        (modeIndex + 1) * WORDS_PER_MODE
      );
      return modeWords.map((w) => ({
        id: `${w.id}-${mode}`,
        wordId: w.id,
        word: w.word,
        thai: w.thai as string,
        game: mode,
      }));
    });

    setQueue(items);
    setInitialTotal(items.length);
    setIsPractice(false);
    setIndex(0);
    setImproved(0);
    setPhase('playing');
  }, [isLoading, words, phase, isBudgetExhausted]);

  function handleFallbackToTyping() {
    setQueue((prevQueue) =>
      prevQueue.map((q, idx) => {
        if (idx >= index && q.game === 'speak') {
          return { ...q, game: 'typing' };
        }
        return q;
      })
    );
  }

  async function handleDone(quality: number) {
    const item = queue[index];
    if (item && !isPractice) {
      try {
        await reviewWord(item.wordId, quality);
      } catch (err) {
        console.error('Failed to record word review in database:', err);
      }
    }
    if (quality >= 3) {
      setImproved((m) => m + 1);
    }

    // If failed (quality < 3), re-queue word at the end of current game mode's block
    const willRequeue = quality < 3 && !!item;
    if (willRequeue) {
      setQueue((prev) => {
        let lastSameGameIdx = index;
        for (let i = prev.length - 1; i >= index; i--) {
          if (prev[i].game === item.game) {
            lastSameGameIdx = i;
            break;
          }
        }
        const copy = [...prev];
        copy.splice(lastSameGameIdx + 1, 0, {
          ...item,
          id: `${item.wordId}-retry-${Date.now()}`,
        });
        return copy;
      });
    }

    const nextIdx = index + 1;
    if (!willRequeue && nextIdx >= queue.length) {
      setPhase('summary');
    } else {
      setIndex(nextIdx);
    }
  }

  function handleSkip() {
    const item = queue[index];
    if (!item) return;

    // Re-queue the word at the end of current game mode's block without scoring yet
    setQueue((prev) => {
      let lastSameGameIdx = index;
      for (let i = prev.length - 1; i >= index; i--) {
        if (prev[i].game === item.game) {
          lastSameGameIdx = i;
          break;
        }
      }
      const copy = [...prev];
      copy.splice(lastSameGameIdx + 1, 0, {
        ...item,
        id: `${item.wordId}-skip-${Date.now()}`,
      });
      return copy;
    });

    const nextIdx = index + 1;
    setIndex(nextIdx);
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-sm text-foreground/60 font-medium">กำลังเตรียมคำถาม...</span>
        </div>
      </div>
    );
  }

  if (phase === 'summary') {
    return (
      <SummaryScreen
        total={initialTotal || queue.length}
        improved={improved}
        isPractice={isPractice}
        isPremium={isPremium}
      />
    );
  }

  const item = queue[index];
  if (!item) return null;

  const excludeWords = new Set(queue.map((q) => q.word.toLowerCase().trim()));

  const props = {
    word: item.word,
    thai: item.thai,
    wordBank: words,
    onDone: handleDone,
    excludeWords,
  };

  return (
    <GameShell
      progress={queue.length > 0 ? Math.min(1, index / queue.length) : 0}
      onClose={() => router.push('/refresh')}
      title={TITLES[item.game]}
    >
      {item.game === 'matching' && <MatchingGame key={item.id + '-' + item.game} {...props} />}
      {item.game === 'typing' && <TypingGame key={item.id + '-' + item.game} {...props} />}
      {item.game === 'speak' && (
        <SpeakGame
          key={item.id + '-' + item.game}
          {...props}
          onFallbackToTyping={handleFallbackToTyping}
          onSkip={handleSkip}
        />
      )}
    </GameShell>
  );
}
