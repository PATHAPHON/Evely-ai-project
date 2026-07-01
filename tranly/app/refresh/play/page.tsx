'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWordBank } from '@/app/_lib/hooks/useWordBank';
import { useUserProfile } from '@/app/_lib/hooks/useUserProfile';
import { useSTT } from '@/app/chat/_lib/hooks/useSTT';
import GameShell from '@/app/refresh/_components/GameShell';
import MatchingGame from '@/app/refresh/_components/MatchingGame';
import TypingGame from '@/app/refresh/_components/TypingGame';
import SpeakGame from '@/app/refresh/_components/SpeakGame';
import SummaryScreen from '@/app/refresh/_components/SummaryScreen';

type GameKind = 'matching' | 'typing' | 'speak';
type Phase = 'loading' | 'playing' | 'summary';

interface QueueItem {
  id: string;
  word: string;
  thai: string;
  game: GameKind;
}

const MAX_WORDS = 20;

const TITLES: Record<GameKind, string> = {
  matching: 'จับคู่ให้ถูกต้อง',
  typing: 'แปลคำต่อไปนี้',
  speak: 'พูดคำต่อไปนี้',
};

export default function RefreshPlayPage() {
  const router = useRouter();
  const { words, reviewWord, isLoading } = useWordBank();
  const { isPremium } = useUserProfile();
  const { isSupported: sttSupported } = useSTT();

  const [phase, setPhase] = useState<Phase>('loading');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [improved, setImproved] = useState(0);
  const [isPractice, setIsPractice] = useState(false);

  useEffect(() => {
    if (isLoading || phase !== 'loading') return;

    const pool: GameKind[] = ['matching', 'typing', 'speak'];

    const hasThai = (w: typeof words[number]) => !!w.thai && !!w.thai.trim();

    let practice = false;
    let selected = words.filter((w) => w.status === 'needs_review' && hasThai(w));
    if (selected.length === 0) {
      practice = true;
      selected = words.filter((w) => w.status === 'known' && hasThai(w));
    }
    selected = selected.slice(0, MAX_WORDS);

    const items: QueueItem[] = selected.map((w) => ({
      id: w.id,
      word: w.word,
      thai: w.thai as string,
      game: pool[Math.floor(Math.random() * pool.length)],
    }));

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQueue(items);
    setIsPractice(practice);
    setIndex(0);
    setImproved(0);
    setPhase(items.length === 0 ? 'summary' : 'playing');
  }, [isLoading, words, sttSupported, phase]);

  async function handleDone(quality: number) {
    const item = queue[index];
    if (item && !isPractice) {
      await reviewWord(item.id, quality);
    }
    if (quality >= 3) {
      setImproved((m) => m + 1);
    }
    const nextIdx = index + 1;
    if (nextIdx >= queue.length) {
      setPhase('summary');
    } else {
      setIndex(nextIdx);
    }
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
        total={queue.length}
        improved={improved}
        isPractice={isPractice}
        isPremium={isPremium}
      />
    );
  }

  const item = queue[index];
  if (!item) return null;

  const props = {
    word: item.word,
    thai: item.thai,
    wordBank: words,
    onDone: handleDone,
  };

  return (
    <GameShell
      progress={index / queue.length}
      onClose={() => router.push('/refresh')}
      title={TITLES[item.game]}
    >
      {item.game === 'matching' && <MatchingGame key={item.id} {...props} />}
      {item.game === 'typing' && <TypingGame key={item.id} {...props} />}
      {item.game === 'speak' && <SpeakGame key={item.id} {...props} />}
    </GameShell>
  );
}
