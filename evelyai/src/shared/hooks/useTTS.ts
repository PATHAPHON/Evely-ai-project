'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { markBudgetExhausted } from '@/shared/hooks/useBudgetExhausted';
import type { SpeechLang } from '../types/chatTypes';

const noopSubscribe = () => () => {};
const getClientSupport = () =>
  typeof window !== 'undefined' && typeof Audio !== 'undefined';
const getServerSupport = () => false;

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: unknown) => void;
  /** Called as soon as the audio blob is fetched and decoded (or when fallback initiates), before playback begins */
  onReady?: () => void;
}

export interface UseTTSReturn {
  speak: (text: string, options?: SpeakOptions) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSynthesizing: boolean;
  isSupported: boolean;
  error: string | null;
}

const DEFAULT_LANG: SpeechLang = 'en-US';
const ERROR_MESSAGE = 'ไม่สามารถเล่นเสียงได้';

export function useTTS(
  lang: SpeechLang = DEFAULT_LANG,
  voice?: string,
): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSupported = useSyncExternalStore(
    noopSubscribe,
    getClientSupport,
    getServerSupport,
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const requestIdRef = useRef(0);

  const releaseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onplay = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  const cancelSpeechSynthesis = useCallback(() => {
    if (typeof window === 'undefined') return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
  }, []);

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    releaseAudio();
    cancelSpeechSynthesis();
    setIsSynthesizing(false);
    setIsSpeaking(false);
  }, [releaseAudio, cancelSpeechSynthesis]);

  const speakViaWebSpeech = useCallback(
    (text: string, options?: SpeakOptions) => {
      setIsSynthesizing(false);
      options?.onReady?.();

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setError(ERROR_MESSAGE);
        setIsSpeaking(false);
        options?.onError?.(new Error(ERROR_MESSAGE));
        return;
      }

      window.speechSynthesis.cancel();
      // Strip any audio tags like [cheerful], [curious], [whispers] so browser doesn't speak "bracket ..."
      const cleanText = text.replace(/\[[a-zA-Z0-9_-]+\]\s*/g, '').trim();
      if (!cleanText) {
        setIsSpeaking(false);
        options?.onEnd?.();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang;

      utterance.onstart = () => {
        setIsSpeaking(true);
        options?.onStart?.();
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
        options?.onEnd?.();
      };
      utterance.onerror = (event) => {
        if (event.error === 'interrupted' || event.error === 'canceled') {
          setIsSpeaking(false);
          utteranceRef.current = null;
          options?.onEnd?.();
          return;
        }
        setError(ERROR_MESSAGE);
        setIsSpeaking(false);
        utteranceRef.current = null;
        options?.onError?.(event);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [lang],
  );

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      const trimmed = text.trim();
      if (trimmed.length === 0) {
        options?.onReady?.();
        options?.onEnd?.();
        return;
      }

      // Bump the request id and snapshot for staleness checks across async work.
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;

      // Stop any in-flight playback (both channels) before starting new.
      releaseAudio();
      cancelSpeechSynthesis();
      setError(null);

      if (typeof window === 'undefined') {
        options?.onReady?.();
        options?.onEnd?.();
        return;
      }

      setIsSynthesizing(true);

      const fallback = () => {
        if (requestIdRef.current !== currentRequestId) return;
        setIsSynthesizing(false);
        speakViaWebSpeech(trimmed, options);
      };

      void (async () => {
        try {
          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: trimmed, voice }),
          });

          if (requestIdRef.current !== currentRequestId) return;

          if (!response.ok) {
            if (response.status === 429) {
              markBudgetExhausted();
            }
            fallback();
            return;
          }

          const blob = await response.blob();
          if (requestIdRef.current !== currentRequestId) return;

          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioUrlRef.current = url;
          audioRef.current = audio;

          // Audio blob is fetched and decoded into Audio instance!
          setIsSynthesizing(false);
          options?.onReady?.();

          audio.onplay = () => {
            if (requestIdRef.current !== currentRequestId) return;
            setIsSpeaking(true);
            options?.onStart?.();
          };
          audio.onended = () => {
            if (requestIdRef.current !== currentRequestId) return;
            setIsSpeaking(false);
            releaseAudio();
            options?.onEnd?.();
          };
          audio.onerror = () => {
            if (requestIdRef.current !== currentRequestId) return;
            releaseAudio();
            fallback();
          };

          const playPromise = audio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
              if (requestIdRef.current !== currentRequestId) return;
              releaseAudio();
              fallback();
            });
          }
        } catch {
          if (requestIdRef.current !== currentRequestId) return;
          fallback();
        }
      })();
    },
    [voice, releaseAudio, cancelSpeechSynthesis, speakViaWebSpeech],
  );

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      releaseAudio();
      cancelSpeechSynthesis();
    };
  }, [releaseAudio, cancelSpeechSynthesis]);

  return { speak, stop, isSpeaking, isSynthesizing, isSupported, error };
}
