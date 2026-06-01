'use client';

import type { ReactNode } from 'react';
import { ActiveLanguageProvider } from '../_lib/ActiveLanguageContext';

export default function AppProviders({ children }: { children: ReactNode }) {
  return <ActiveLanguageProvider>{children}</ActiveLanguageProvider>;
}
