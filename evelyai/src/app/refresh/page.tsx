'use client';

import { useRouter } from 'next/navigation';
import { useWordBank } from '@/shared/hooks/useWordBank';
import { useBudgetExhausted } from '@/shared/hooks/useBudgetExhausted';
import RefreshMenu from '@/features/refresh/components/RefreshMenu';

const WORDS_PER_MODE = 5;

export default function RefreshPage() {
  const router = useRouter();
  const { words, isLoading } = useWordBank();
  const { exhausted: isBudgetExhausted } = useBudgetExhausted();

  // Deduplicate yellow words that have Thai translation
  const yellowMap = new Map<string, typeof words[number]>();
  for (const w of words) {
    if (w.status === 'needs_review' && w.thai && w.thai.trim()) {
      const k = w.word.toLowerCase().trim();
      if (!yellowMap.has(k)) yellowMap.set(k, w);
    }
  }
  const yellowCount = yellowMap.size;

  const modeCount = isBudgetExhausted ? 2 : 3;
  const minRequired = modeCount * WORDS_PER_MODE;
  const canPlay = yellowCount >= minRequired;

  function start() {
    router.push('/refresh/play');
  }

  return (
    <RefreshMenu
      onStart={start}
      disabled={isLoading || !canPlay}
      withThai={yellowCount}
      minRequired={minRequired}
      isLoading={isLoading}
      isBudgetExhausted={isBudgetExhausted}
    />
  );
}
