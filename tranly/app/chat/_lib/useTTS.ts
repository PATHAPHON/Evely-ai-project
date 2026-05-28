'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpeechLang } from './types';

export interface UseTTSReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  error: string | null;
}

const DEFAULT_LANG: SpeechLang = 'ko-KR';

export function useTTS(lang: SpeechLang = DEFAULT_LANG): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, [isSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) {
        setError('Failed to play audio.');
        return;
      }

      // Stop any current playback before starting new (single audio playback invariant)
      window.speechSynthesis.cancel();
      setError(null);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        // 'interrupted' and 'canceled' are expected when stop() is called
        if (event.error === 'interrupted' || event.error === 'canceled') {
          setIsSpeaking(false);
          utteranceRef.current = null;
          return;
        }
        setError('Failed to play audio.');
        setIsSpeaking(false);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, lang],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported, error };
}
