'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'tranly:budget-exhausted-until';

/** เที่ยงคืนไทยถัดไป (Bangkok = UTC+7 คงที่) เป็น UTC instant. */
function nextThaiMidnight(): Date {
  const bkk = new Date(Date.now() + 7 * 3600 * 1000);
  bkk.setUTCHours(24, 0, 0, 0);
  return new Date(bkk.getTime() - 7 * 3600 * 1000);
}

function readUntil(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms) || ms <= Date.now()) return null;
  return ms;
}

export function markBudgetExhausted(): void {
  if (typeof window === 'undefined') return;
  const value = nextThaiMidnight().toISOString();
  localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: value }));
}

export function clearBudgetExhausted(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(STORAGE_KEY) === null) return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: null }));
}

export function useBudgetExhausted(): { exhausted: boolean } {
  const [until, setUntil] = useState<number | null>(null);

  const refresh = useCallback(() => setUntil(readUntil()), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  // Auto-clear เมื่อถึงเวลา reset
  useEffect(() => {
    if (until === null) return;
    const timer = setTimeout(() => clearBudgetExhausted(), until - Date.now());
    return () => clearTimeout(timer);
  }, [until]);

  return { exhausted: until !== null };
}
