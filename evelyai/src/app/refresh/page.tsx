'use client';

import { useRouter } from 'next/navigation';
import { useWordBank } from '@/shared/hooks/useWordBank';
import { useUserProfile } from '@/shared/hooks/useUserProfile';
import { useBudgetExhausted } from '@/shared/hooks/useBudgetExhausted';
import RefreshMenu from '@/features/refresh/components/RefreshMenu';

import type { RefreshMode } from '@/features/refresh/components/RefreshMenu';

export default function RefreshPage() {
  const router = useRouter();
  const { words, isLoading } = useWordBank();
  const { isBudgetExhausted: userBudgetExhausted } = useUserProfile();
  const { exhausted: localBudgetExhausted } = useBudgetExhausted();
  const isBudgetExhausted = userBudgetExhausted || localBudgetExhausted;

  // Deduplicate playable words that have Thai translation
  const totalPlayableMap = new Map<string, typeof words[number]>();
  const yellowMap = new Map<string, typeof words[number]>();
  const greenMap = new Map<string, typeof words[number]>();

  for (const w of words) {
    if (w.thai && w.thai.trim()) {
      const k = w.word.toLowerCase().trim();
      if (!totalPlayableMap.has(k)) {
        totalPlayableMap.set(k, w);
      }
      if (w.status === 'needs_review') {
        if (!yellowMap.has(k)) {
          yellowMap.set(k, w);
        }
      } else {
        if (!greenMap.has(k)) {
          greenMap.set(k, w);
        }
      }
    }
  }

  const totalPlayableCount = totalPlayableMap.size;
  const yellowCount = yellowMap.size;
  const greenCount = greenMap.size;

  function handleStartMode(mode: RefreshMode) {
    router.push(`/refresh/play?mode=${mode}`);
  }

  return (
    <RefreshMenu
      onStartMode={handleStartMode}
      totalPlayable={totalPlayableCount}
      yellowCount={yellowCount}
      greenCount={greenCount}
      withThai={totalPlayableCount}
      isLoading={isLoading}
      isBudgetExhausted={isBudgetExhausted}
    />
  );
}
