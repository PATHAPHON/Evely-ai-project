'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { markBudgetExhausted } from '@/shared/hooks/useBudgetExhausted';
import { useToast } from '@/shared/components/Toast';
import type { SpeechLang } from '../types/chatTypes';

const noopSubscribe = () => () => {};
const getClientSupport = () =>
  typeof window !== 'undefined' && typeof Audio !== 'undefined';
const getServerSupport = () => false;

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: unknown) => void;
  /** Called as soon as the audio blob is fetched and decoded, before playback begins */
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
const ERROR_MESSAGE = 'ระบบเสียงยังไม่พร้อมใช้งาน กรุณารอสักครู่';

export function useTTS(
  lang: SpeechLang = DEFAULT_LANG,
  voice?: string,
): UseTTSReturn {
  void lang;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const isSupported = useSyncExternalStore(
    noopSubscribe,
    getClientSupport,
    getServerSupport,
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
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

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    releaseAudio();
    setIsSynthesizing(false);
    setIsSpeaking(false);
  }, [releaseAudio]);

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

      // Stop any in-flight playback before starting new.
      releaseAudio();
      setError(null);

      if (typeof window === 'undefined') {
        options?.onReady?.();
        options?.onEnd?.();
        return;
      }

      setIsSynthesizing(true);

      const handleSpeechError = (err?: unknown) => {
        if (requestIdRef.current !== currentRequestId) return;
        setIsSynthesizing(false);
        setIsSpeaking(false);
        releaseAudio();
        setError(ERROR_MESSAGE);
        showToast(ERROR_MESSAGE, 'warning');
        options?.onError?.(err ?? new Error(ERROR_MESSAGE));
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
            handleSpeechError(new Error(`TTS request failed with status ${response.status}`));
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
          audio.onerror = (e) => {
            if (requestIdRef.current !== currentRequestId) return;
            handleSpeechError(e);
          };

          const playPromise = audio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch((err) => {
              if (requestIdRef.current !== currentRequestId) return;
              if (err instanceof Error && err.name === 'AbortError') return;
              handleSpeechError(err);
            });
          }
        } catch (err) {
          if (requestIdRef.current !== currentRequestId) return;
          handleSpeechError(err);
        }
      })();
    },
    [voice, releaseAudio, showToast],
  );

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      releaseAudio();
    };
  }, [releaseAudio]);

  return { speak, stop, isSpeaking, isSynthesizing, isSupported, error };
}
