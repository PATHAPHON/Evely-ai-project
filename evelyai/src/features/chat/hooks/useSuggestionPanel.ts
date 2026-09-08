'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ChatMessage, ReplySuggestion } from '@/shared/types/chatTypes';

interface UseSuggestionPanelArgs {
  lastMessage: ChatMessage | undefined;
  currentSuggestions: ReplySuggestion[];
  isLoading: boolean;
}

function getSessionItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function setSessionItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage quota or security errors
  }
}

function removeSessionItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

/**
 * UI state for the suggestion/options panel that merges with the chat input.
 *
 * Tracks the collapsed/animating state of the expanding option card, the
 * per-turn "dismissed" suggestion id (for "ข้าม" in normal chat), and the
 * input reset key. Derives `optionsMode` — whether options should show.
 */
export function useSuggestionPanel({
  lastMessage,
  currentSuggestions,
  isLoading,
}: UseSuggestionPanelArgs) {
  // Reply suggestions a user skipped ("ข้าม") — keyed by message id so the
  // panel stays hidden for that turn but returns on the next AI reply.
  const [dismissedSuggestId, setDismissedSuggestId] = useState<string | null>(null);

  // Track collapsed state for option suggestions (default to true so they do not pop up automatically)
  const [isOptionsCollapsed, setIsOptionsCollapsed] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [inputResetKey, setInputResetKey] = useState(0);

  // Sync / restore state for the latest AI message
  const lastMsgId = lastMessage ? lastMessage.id : '';
  useEffect(() => {
    if (!lastMsgId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOptionsCollapsed(true);
      return;
    }
    const isDismissed = getSessionItem(`suggestion_dismissed_${lastMsgId}`) === 'true';
    if (isDismissed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissedSuggestId(lastMsgId);
    }
    const isOpen = getSessionItem(`suggestion_open_${lastMsgId}`) === 'true';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOptionsCollapsed(!isOpen);
  }, [lastMsgId]);

  const toggleOptions = useCallback(
    (collapse: boolean) => {
      setIsAnimating(true);
      setTimeout(() => {
        setIsOptionsCollapsed(collapse);
        setIsAnimating(false);
        if (lastMessage?.id) {
          if (collapse) {
            removeSessionItem(`suggestion_open_${lastMessage.id}`);
          } else {
            setSessionItem(`suggestion_open_${lastMessage.id}`, 'true');
            removeSessionItem(`suggestion_dismissed_${lastMessage.id}`);
          }
        }
      }, 200); // 200ms smooth animation
    },
    [lastMessage?.id]
  );

  const handleToggleSuggestions = useCallback(() => {
    setInputResetKey((prev) => prev + 1);
    toggleOptions(false);
  }, [toggleOptions]);

  // Whenever the latest AI message has options ready, the input merges with
  // the option list into a single expanding card.
  const optionsMode =
    currentSuggestions.length > 0 &&
    !isLoading &&
    lastMessage != null &&
    dismissedSuggestId !== lastMessage.id;

  // "ข้าม": dismiss the options and show the plain input again for this turn.
  const handleOptionsSkip = useCallback(() => {
    if (lastMessage?.id) {
      setDismissedSuggestId(lastMessage.id);
      setSessionItem(`suggestion_dismissed_${lastMessage.id}`, 'true');
      removeSessionItem(`suggestion_open_${lastMessage.id}`);
    }
  }, [lastMessage?.id]);

  return {
    isOptionsCollapsed,
    isAnimating,
    inputResetKey,
    optionsMode,
    toggleOptions,
    handleToggleSuggestions,
    handleOptionsSkip,
  };
}
