'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWordBank } from '@/shared/hooks/useWordBank';
import { useUserProfile } from '@/shared/hooks/useUserProfile';
import { useBudgetExhausted } from '@/shared/hooks/useBudgetExhausted';
import GameShell from '@/features/refresh/components/GameShell';
import MatchingGame, { MatchingResult } from '@/features/refresh/components/MatchingGame';
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
  imageUrl?: string;
}

const WORDS_PER_MODE = 5;

const TITLES: Record<GameKind, string> = {
  matching: 'จับคู่ให้ถูกต้อง',
  typing: 'แปลคำต่อไปนี้',
  speak: 'บอกคำภาษาอังกฤษ',
};

function RefreshPlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawMode = searchParams.get('mode');
  const targetMode: GameKind = rawMode === 'typing' || rawMode === 'speak' ? rawMode : 'matching';

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

    // Check if mode is speak but budget is exhausted
    if (targetMode === 'speak' && isBudgetExhausted) {
      router.replace('/refresh');
      return;
    }

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

    const minRequired = targetMode === 'matching' ? 3 : WORDS_PER_MODE;

    // Gate: require minimum words to play (3 for matching, 5 for typing/speak)
    if (yellow.length < minRequired) {
      setQueue([]);
      setInitialTotal(0);
      setIsPractice(false);
      setIndex(0);
      setImproved(0);
      setPhase('summary');
      return;
    }

    // Matching mode: 3 words per round, up to 6 words (max 2 rounds)
    if (targetMode === 'matching') {
      const takeCount = yellow.length >= 6 ? 6 : 3;
      const selected = yellow.slice(0, takeCount);
      shuffle(selected);

      const items: QueueItem[] = selected.map((w) => ({
        id: `${w.id}-${targetMode}`,
        wordId: w.id,
        word: w.word,
        thai: w.thai as string,
        game: targetMode,
      }));

      setQueue(items);
      setInitialTotal(items.length);
      setIsPractice(false);
      setIndex(0);
      setImproved(0);
      setPhase('playing');
      return;
    }

    const requiredTotal = WORDS_PER_MODE;
    const selected = yellow.slice(0, requiredTotal);
    shuffle(selected);

    if (targetMode === 'typing') {
      const wordsToFetch = selected.map((w) => ({ word: w.word, thai: w.thai }));
      fetch('/api/word-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: wordsToFetch }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const images: Record<string, string> = data?.images || {};
          const items: QueueItem[] = selected.map((w) => {
            const k = w.word.toLowerCase().trim();
            return {
              id: `${w.id}-${targetMode}`,
              wordId: w.id,
              word: w.word,
              thai: w.thai as string,
              game: targetMode,
              imageUrl: images[k],
            };
          });
          setQueue(items);
          setInitialTotal(items.length);
          setIsPractice(false);
          setIndex(0);
          setImproved(0);
          setPhase('playing');
        })
        .catch((err) => {
          console.warn('Failed to prefetch word images, falling back to text:', err);
          const items: QueueItem[] = selected.map((w) => ({
            id: `${w.id}-${targetMode}`,
            wordId: w.id,
            word: w.word,
            thai: w.thai as string,
            game: targetMode,
          }));
          setQueue(items);
          setInitialTotal(items.length);
          setIsPractice(false);
          setIndex(0);
          setImproved(0);
          setPhase('playing');
        });
      return;
    }

    const items: QueueItem[] = selected.map((w) => ({
      id: `${w.id}-${targetMode}`,
      wordId: w.id,
      word: w.word,
      thai: w.thai as string,
      game: targetMode,
    }));

    setQueue(items);
    setInitialTotal(items.length);
    setIsPractice(false);
    setIndex(0);
    setImproved(0);
    setPhase('playing');
  }, [isLoading, words, phase, isBudgetExhausted, targetMode, router]);

  function handlePlayAgain() {
    setIndex(0);
    setImproved(0);
    setQueue([]);
    setInitialTotal(0);
    setPhase('loading');
  }

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

  async function handleMatchingRoundDone(results: MatchingResult[]) {
    if (!isPractice) {
      for (const res of results) {
        try {
          await reviewWord(res.wordId, res.quality);
        } catch (err) {
          console.error('Failed to record word review in database:', err);
        }
      }
    }

    const improvedCount = results.filter((r) => r.quality >= 3).length;
    setImproved((m) => m + improvedCount);

    const nextIdx = index + 3;
    if (nextIdx >= queue.length) {
      setPhase('summary');
    } else {
      setIndex(nextIdx);
    }
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
        onPlayAgain={handlePlayAgain}
        onBackToMenu={() => router.push('/refresh')}
      />
    );
  }

  const item = queue[index];
  if (!item) return null;

  if (item.game === 'matching') {
    const roundItems = queue.slice(index, index + 3);
    const roundNumber = Math.floor(index / 3) + 1;
    const totalRounds = Math.ceil(queue.length / 3);
    const progress = totalRounds > 0 ? (roundNumber - 1) / totalRounds : 0;

    return (
      <GameShell
        progress={progress}
        onClose={() => router.push('/refresh')}
        title={TITLES.matching}
      >
        <MatchingGame
          key={`matching-round-${roundNumber}`}
          items={roundItems}
          roundNumber={roundNumber}
          totalRounds={totalRounds}
          onRoundComplete={handleMatchingRoundDone}
        />
      </GameShell>
    );
  }

  const excludeWords = new Set(queue.map((q) => q.word.toLowerCase().trim()));

  const props = {
    word: item.word,
    thai: item.thai,
    wordBank: words,
    onDone: handleDone,
    excludeWords,
    imageUrl: item.imageUrl,
  };

  return (
    <GameShell
      progress={queue.length > 0 ? Math.min(1, index / queue.length) : 0}
      onClose={() => router.push('/refresh')}
      title={TITLES[item.game]}
    >
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

export default function RefreshPlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex flex-col items-center justify-center bg-background text-foreground">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="text-sm text-foreground/60 font-medium">กำลังเตรียมคำถาม...</span>
          </div>
        </div>
      }
    >
      <RefreshPlayContent />
    </Suspense>
  );
}
