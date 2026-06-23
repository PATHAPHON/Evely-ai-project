'use client';

import { createContext, type ReactNode } from 'react';
import { useWordBank, type WordStatusContextValue } from '@/app/_lib/hooks/useWordBank';

const WordStatusContext = createContext<WordStatusContextValue | undefined>(undefined);

export function WordStatusProvider({ children }: { children: ReactNode }) {
  const value = useWordBank();

  return (
    <WordStatusContext.Provider value={value}>
      {children}
    </WordStatusContext.Provider>
  );
}

export { WordStatusContext };
export type { WordStatusContextValue };
