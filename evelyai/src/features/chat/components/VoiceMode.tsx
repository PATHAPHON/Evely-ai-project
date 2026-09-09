'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, X, Loader2, Volume2 } from 'lucide-react';
import { useSTT } from '@/shared/hooks/useSTT';
import { useTTS } from '@/shared/hooks/useTTS';
import type { ChatMessage, SpeechLang } from '@/shared/types/chatTypes';

export interface VoiceModeProps {
  speechLang: SpeechLang;
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => Promise<void>;
  onClose: () => void;
  onTranscribingChange?: (transcribing: boolean) => void;
  onAudioReady?: (messageId: string) => void;
}

export type VoiceStatus =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'synthesizing'
  | 'speaking';

const SILENCE_MS = 1500;
const MAX_TURN_MS = 20000;

const STATUS_LABEL: Record<VoiceStatus, string> = {
  idle: 'แตะไมค์เพื่อพูด',
  listening: 'กำลังฟัง...',
  transcribing: 'กำลังแปลงเสียง...',
  thinking: 'กำลังคิดคำตอบ...',
  synthesizing: 'กำลังสร้างเสียง...',
  speaking: 'กำลังพูด...',
};

export default function VoiceMode({
  speechLang,
  messages,
  isLoading,
  onSend,
  onClose,
  onTranscribingChange,
  onAudioReady,
}: VoiceModeProps) {
  const [status, setStatus] = useState<VoiceStatus>('idle');

  const { startListening, stopListening, isListening, level } = useSTT();
  const { speak, stop: stopSpeaking, isSpeaking } = useTTS(speechLang);

  // Track the last assistant message we've already spoken, so we never replay it.
  const lastSpokenIdRef = useRef<string | null>(
    [...messages].reverse().find((m) => m.role === 'assistant')?.id ?? null,
  );
  const wasSpeakingRef = useRef(false);

  // Stable refs for callbacks inside async closures
  const onSendRef = useRef(onSend);
  const onAudioReadyRef = useRef(onAudioReady);
  const onTranscribingChangeRef = useRef(onTranscribingChange);

  useEffect(() => {
    onSendRef.current = onSend;
    onAudioReadyRef.current = onAudioReady;
    onTranscribingChangeRef.current = onTranscribingChange;
  }, [onSend, onAudioReady, onTranscribingChange]);

  const beginListening = useCallback(() => {
    setStatus('listening');
    startListening({
      autoStopSilenceMs: SILENCE_MS,
      maxDurationMs: MAX_TURN_MS,
      onTranscribeStart: () => {
        setStatus('transcribing');
        onTranscribingChangeRef.current?.(true);
      },
      onEnd: (transcript: string) => {
        onTranscribingChangeRef.current?.(false);
        const text = transcript.trim();
        if (!text) {
          setStatus('idle');
          return;
        }
        setStatus('thinking');
        void onSendRef.current(text);
      },
    });
  }, [startListening]);

  // Tear everything down on close/unmount
  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
      onTranscribingChangeRef.current?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When AI reply lands (isLoading becomes false) while thinking, pre-load TTS audio before revealing
  useEffect(() => {
    if (status !== 'thinking' || isLoading) return;
    const last = messages[messages.length - 1];
    if (
      last &&
      last.role === 'assistant' &&
      last.status === 'sent' &&
      last.id !== lastSpokenIdRef.current &&
      last.englishText.trim()
    ) {
      lastSpokenIdRef.current = last.id;
      setStatus('synthesizing');

      speak(last.ttsText ?? last.englishText, {
        onReady: () => {
          // Notify ChatScreen to reveal the assistant message in chat output
          onAudioReadyRef.current?.(last.id);
        },
        onStart: () => {
          setStatus('speaking');
        },
        onEnd: () => {
          setStatus('idle');
        },
        onError: () => {
          // If TTS fails, reveal the message anyway and return to idle
          onAudioReadyRef.current?.(last.id);
          setStatus('idle');
        },
      });
    } else {
      // No usable reply (error/empty) — wait for user to tap mic
      setStatus('idle');
    }
  }, [status, isLoading, messages, speak]);

  // Fallback: If speaking finished via hook state (e.g. cancelled) → go idle
  useEffect(() => {
    if (wasSpeakingRef.current && !isSpeaking && status === 'speaking') {
      setStatus('idle');
    }
    wasSpeakingRef.current = isSpeaking;
  }, [isSpeaking, status]);

  const handleMicToggle = useCallback(() => {
    if (status === 'speaking') {
      stopSpeaking();
      setStatus('idle');
    } else if (status === 'transcribing' || status === 'synthesizing') {
      // Busy processing, ignore clicks
      return;
    } else if (isListening) {
      stopListening(); // triggers onstop -> isTranscribing -> onEnd
    } else {
      beginListening();
    }
  }, [status, isListening, stopSpeaking, stopListening, beginListening]);

  const handleClose = useCallback(() => {
    stopListening();
    stopSpeaking();
    onTranscribingChangeRef.current?.(false);
    onClose();
  }, [stopListening, stopSpeaking, onClose]);

  const pillScale = 1 + (status === 'listening' ? level * 0.15 : 0);

  const isBusy = status === 'transcribing' || status === 'thinking' || status === 'synthesizing';

  return (
    <div
      className="flex items-center justify-center gap-2.5 sm:gap-3 py-2 w-full max-w-sm mx-auto"
      role="group"
      aria-label={STATUS_LABEL[status]}
    >
      {/* Dynamic Status Pill */}
      <div
        className={`h-14 flex-1 max-w-[210px] min-w-0 px-4 shrink rounded-[40px] bg-gradient-to-b from-white to-[#dbeafe] dark:from-slate-800 dark:to-slate-900 border border-border-color shadow-soft-md transition-all duration-200 ease-out flex items-center justify-center gap-2 overflow-hidden ${
          status === 'speaking' ? 'animate-pulse ring-4 ring-primary/20' : ''
        }`}
        style={{ transform: `scale(${pillScale})` }}
        aria-live="polite"
      >
        {status === 'idle' && (
          <span className="text-xs font-semibold text-foreground/75 tracking-wide select-none truncate">
            แตะไมค์เพื่อพูด
          </span>
        )}

        {status === 'listening' && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-0.5 shrink-0">
              <span
                className="w-1 bg-primary rounded-full animate-pulse"
                style={{ height: `${Math.max(8, level * 28)}px` }}
              />
              <span
                className="w-1 bg-primary rounded-full animate-pulse"
                style={{ height: `${Math.max(12, level * 36)}px`, animationDelay: '100ms' }}
              />
              <span
                className="w-1 bg-primary rounded-full animate-pulse"
                style={{ height: `${Math.max(8, level * 24)}px`, animationDelay: '200ms' }}
              />
            </span>
            <span className="text-xs font-bold text-primary tracking-wide whitespace-nowrap">
              กำลังฟัง...
            </span>
          </div>
        )}

        {/* Loading state: subtle dots without text so the single floating capsule above is the only text window */}
        {(status === 'transcribing' || status === 'thinking' || status === 'synthesizing') && (
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
          </div>
        )}

        {status === 'speaking' && (
          <div className="flex items-center gap-2 min-w-0">
            <Volume2 size={16} className="text-primary animate-bounce shrink-0" />
            <span className="text-xs font-bold text-primary animate-pulse tracking-wide whitespace-nowrap">
              กำลังพูด...
            </span>
          </div>
        )}
      </div>

      {/* Microphone button */}
      <button
        type="button"
        onClick={handleMicToggle}
        disabled={isBusy}
        aria-label={status === 'listening' ? 'หยุดพูด' : 'ไมโครโฟน'}
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-soft-md transition-all duration-200 ${
          isBusy
            ? 'bg-card-bg text-primary/60 border border-border-color cursor-not-allowed opacity-80'
            : isListening
            ? 'bg-white dark:bg-slate-800 text-amber-500 ring-4 ring-amber-400/40 border-2 border-amber-500 animate-pulse cursor-pointer'
            : status === 'speaking'
            ? 'bg-primary text-white shadow-soft-lg hover:bg-primary-hover active:scale-95 cursor-pointer'
            : 'bg-white dark:bg-slate-800 text-foreground/80 hover:bg-white/95 dark:hover:bg-slate-700/90 border border-border-color cursor-pointer active:scale-95'
        }`}
      >
        {isBusy ? (
          <Loader2 size={24} className="animate-spin text-primary" />
        ) : (
          <Mic size={24} />
        )}
      </button>

      {/* Close voice mode button */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="ปิดโหมดเสียง"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-800 text-foreground/70 hover:text-foreground border border-border-color shadow-soft-md hover:bg-white/95 dark:hover:bg-slate-700/90 active:scale-95 transition-all duration-200 cursor-pointer"
      >
        <X size={24} />
      </button>
    </div>
  );
}
