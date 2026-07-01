'use client';

import { useEffect, useRef } from 'react';
import type { TargetLanguage } from '@/app/_lib/types/wordTypes';
import type { ChatMessage } from '../types/types';

/** restoredRef sentinel for a brand-new (not-yet-saved) open session. */
const OPEN_SESSION = '__open__';

interface UseSessionUrlSyncArgs {
  /** Existing session id to restore, or null for a brand-new open session. */
  sessionParam: string | null;
  activeLanguage: TargetLanguage;
  restoreSession: (sessionId: string, language: TargetLanguage) => Promise<void>;
  /** Begin a fresh open-ended session. */
  startOpenSession: () => void;
  /** Current in-memory session id (assigned once a fresh session starts). */
  sessionId: string | null;
  isSessionLoading: boolean;
  messages: ChatMessage[];
}

/**
 * Coordinates a chat screen's session with the URL.
 *
 * On mount (or when `sessionParam` changes) it restores an existing
 * conversation, otherwise begins a fresh one. A `restoredRef` sentinel guards
 * against re-starting a fresh session when the effect re-runs purely because a
 * callback dep's identity changed.
 *
 * Once the first exchange is durably saved, it reflects the new session id in
 * the URL. replaceState across route segments (/new → /chat/[id]) makes Next
 * re-sync the router and remount the screen, which re-restores from the DB;
 * firing before the save completes would load an empty session and wipe the
 * in-memory conversation. Gating on a saved assistant reply guarantees the
 * restore finds real data.
 */
export function useSessionUrlSync({
  sessionParam,
  activeLanguage,
  restoreSession,
  startOpenSession,
  sessionId,
  isSessionLoading,
  messages,
}: UseSessionUrlSyncArgs): void {
  const restoredRef = useRef<string | null>(null);

  useEffect(() => {
    if (sessionParam) {
      if (restoredRef.current === sessionParam) return;
      restoredRef.current = sessionParam;
      void restoreSession(sessionParam, activeLanguage);
    } else {
      if (restoredRef.current === OPEN_SESSION) return;
      restoredRef.current = OPEN_SESSION;
      startOpenSession();
    }
  }, [sessionParam, activeLanguage, restoreSession, startOpenSession]);

  useEffect(() => {
    const hasSavedReply =
      !isSessionLoading &&
      messages.some((m) => m.role === 'assistant' && m.status === 'sent');
    if (!sessionParam && sessionId && hasSavedReply) {
      restoredRef.current = sessionId;
      window.history.replaceState(null, '', `/chat/${sessionId}`);
    }
  }, [sessionParam, sessionId, isSessionLoading, messages]);
}
