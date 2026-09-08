'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ChatMessage, ReplySuggestion } from '@/shared/types/chatTypes';

interface UseSuggestionPanelArgs {
  lastMessage: ChatMessage | undefined;
  currentSuggestions: ReplySuggestion[];
  isLoading: boolean;
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

  // Collapse (hide) options at the start of each new AI turn
  const lastSuggestionsKey = lastMessage ? lastMessage.id : '';
  useEffect(() => {
    // Collapse options at the start of each new AI turn
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOptionsCollapsed(true);
  }, [lastSuggestionsKey]);

  const toggleOptions = useCallback((collapse: boolean) => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsOptionsCollapsed(collapse);
      setIsAnimating(false);
    }, 200); // 200ms smooth animation
  }, []);

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
    if (lastMessage) {
      setDismissedSuggestId(lastMessage.id);
    }
  }, [lastMessage]);

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
