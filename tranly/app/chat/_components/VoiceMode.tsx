'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, X, Video, SquareArrowUp } from 'lucide-react';
import { useSTT } from '../_lib/hooks/useSTT';
import { useTTS } from '../_lib/hooks/useTTS';
import type { ChatMessage, SpeechLang } from '../_lib/types/types';

export interface VoiceModeProps {
  speechLang: SpeechLang;
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => Promise<void>;
  onClose: () => void;
}

type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

const SILENCE_MS = 1500;
const MAX_TURN_MS = 20000;

const STATUS_LABEL: Record<VoiceStatus, string> = {
  idle: 'แตะไมค์เพื่อพูด',
  listening: 'กำลังฟัง...',
  thinking: 'กำลังคิด...',
  speaking: 'กำลังพูด...',
};

export default function VoiceMode({
  speechLang,
  messages,
  isLoading,
  onSend,
  onClose,
}: VoiceModeProps) {
  const [status, setStatus] = useState<VoiceStatus>('idle');

  const { startListening, stopListening, isListening, level } = useSTT();
  const { speak, stop: stopSpeaking, isSpeaking } = useTTS(speechLang);

  // Track the last assistant message we've already spoken, so we never replay it.
  // Seed with the current last assistant id so a pre-existing reply isn't spoken on open.
  const lastSpokenIdRef = useRef<string | null>(
    [...messages].reverse().find((m) => m.role === 'assistant')?.id ?? null,
  );
  const wasSpeakingRef = useRef(false);

  // Stable ref so the STT onEnd closure always sees the latest handler.
  const onSendRef = useRef(onSend);

  const beginListening = useCallback(() => {
    setStatus('listening');
    startListening({
      autoStopSilenceMs: SILENCE_MS,
      maxDurationMs: MAX_TURN_MS,
      onEnd: (transcript) => {
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

  useEffect(() => {
    onSendRef.current = onSend;
  }, [onSend]);

  // Tear everything down on close/unmount.
  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the AI reply lands (or fails), speak it then loop — or just loop on error.
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
      setStatus('speaking');
      speak(last.englishText);
    } else {
      // No usable reply (error/empty) — wait for user to tap mic.
      setStatus('idle');
    }
  }, [status, isLoading, messages, speak]);

  // Speaking finished (isSpeaking true→false) → go idle, wait for user to tap mic.
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
    } else if (isListening) {
      stopListening(); // ends the turn → onEnd fires with whatever was captured
    } else {
      beginListening();
    }
  }, [status, isListening, stopSpeaking, stopListening, beginListening]);

  const pillScale = 1 + (status === 'listening' ? level * 0.18 : 0);

  return (
    <div
      className="flex items-center justify-center gap-3 py-2"
      role="group"
      aria-label={STATUS_LABEL[status]}
    >
      {/* ตกแต่งตามดีไซน์ — ยังไม่มีฟังก์ชัน (vision/upload) */}
      <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-soft-md">
        <Video size={24} />
      </span>
      <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-soft-md">
        <SquareArrowUp size={24} />
      </span>

      {/* Pill กลาง: เต้นตามระดับเสียง */}
      <div
        className="h-14 w-28 shrink-0 rounded-[40px] bg-gradient-to-b from-white to-[#7ba9f5] shadow-soft-md transition-transform duration-100 ease-out"
        style={{ transform: `scale(${pillScale})` }}
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={handleMicToggle}
        aria-label="ไมโครโฟน"
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-soft-md transition-all duration-200 cursor-pointer ${
          isListening ? 'bg-white text-incorrect animate-pulse' : 'bg-white text-slate-700 hover:bg-white/90'
        }`}
      >
        <Mic size={24} />
      </button>

      <button
        type="button"
        onClick={onClose}
        aria-label="ปิดโหมดเสียง"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-soft-md hover:bg-white/90 transition-all duration-200 cursor-pointer"
      >
        <X size={24} />
      </button>
    </div>
  );
}
