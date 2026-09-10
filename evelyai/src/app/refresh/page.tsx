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

  // Deduplicate yellow words that have Thai translation
  const yellowMap = new Map<string, typeof words[number]>();
  for (const w of words) {
    if (w.status === 'needs_review' && w.thai && w.thai.trim()) {
      const k = w.word.toLowerCase().trim();
      if (!yellowMap.has(k)) yellowMap.set(k, w);
    }
  }
  const yellowCount = yellowMap.size;

  function handleStartMode(mode: RefreshMode) {
    router.push(`/refresh/play?mode=${mode}`);
  }

  return (
    <RefreshMenu
      onStartMode={handleStartMode}
      withThai={yellowCount}
      isLoading={isLoading}
      isBudgetExhausted={isBudgetExhausted}
    />
  );
}
