'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { markBudgetExhausted } from '@/app/_lib/hooks/useBudgetExhausted';

export interface StartListeningOptions {
  /** Called once the transcription session ends, with the final transcript and error. */
  onEnd?: (transcript: string, error: string | null) => void;
  /** Automatically stop recording after a period of silence (in ms) */
  autoStopSilenceMs?: number;
  /** Automatically stop recording after a maximum duration (in ms) */
  maxDurationMs?: number;
}

export interface UseSTTReturn {
  startListening: (opts?: StartListeningOptions) => void;
  stopListening: () => void;
  isListening: boolean;
  isTranscribing: boolean;
  transcript: string;
  isSupported: boolean;
  error: string | null;
  level: number;
}

/** Analyser FFT size for the mic-level/silence-detection loop. */
const FFT_SIZE = 256;
/** Scales RMS (0..~0.3 in practice) up into a display-friendly 0..1 level. */
const RMS_TO_LEVEL_GAIN = 3;
/** RMS below this is treated as silence for auto-stop detection. */
const SILENCE_THRESHOLD = 0.015;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const base64Raw = base64data.split(',')[1];
      resolve(base64Raw);
    };
    reader.onerror = reject;
  });
}

/** Pick the best MediaRecorder mimeType this browser supports, and the matching /api/stt format. */
function pickMimeType(): { mimeType: string; format: string } {
  if (MediaRecorder.isTypeSupported('audio/webm')) {
    return { mimeType: 'audio/webm', format: 'webm' };
  }
  if (MediaRecorder.isTypeSupported('audio/mp4')) {
    return { mimeType: 'audio/mp4', format: 'mp4' };
  }
  return { mimeType: '', format: 'wav' };
}

/** /api/stt errors are either a plain string or `{type, message}` (auth/budget gates). */
function extractErrorMessage(errResult: unknown, fallback: string): string {
  const err = (errResult as { error?: unknown } | null)?.error;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return fallback;
}

/** POST a recorded blob to /api/stt and map the response into a transcript or an error message. */
async function transcribeBlob(blob: Blob, format: string): Promise<{ text: string } | { error: string }> {
  try {
    const base64 = await blobToBase64(blob);

    const res = await fetch('/api/stt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: base64, format }),
    });

    if (!res.ok) {
      const errResult = await res.json().catch(() => ({}));
      if (res.status === 402) {
        return { error: 'ยอดเงินคงเหลือในบัญชี OpenRouter ของคุณไม่เพียงพอ (402 Payment Required)' };
      }
      if (res.status === 401) {
        return { error: extractErrorMessage(errResult, 'กรุณาเข้าสู่ระบบใหม่') };
      }
      if (res.status === 429) {
        markBudgetExhausted();
        return { error: extractErrorMessage(errResult, 'งบ AI วันนี้หมดแล้ว') };
      }
      return { error: extractErrorMessage(errResult, `การถอดเสียงล้มเหลว: ${res.statusText}`) };
    }

    const dataResult = await res.json();
    return { text: dataResult.text };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อถอดเสียง';
    return { error: message };
  }
}

const noopSubscribe = () => () => {};
const getClientSupport = () =>
  typeof window !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function' &&
  typeof window.MediaRecorder !== 'undefined';
const getServerSupport = () => false;

export function useSTT(): UseSTTReturn {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isSupported = useSyncExternalStore(
    noopSubscribe,
    getClientSupport,
    getServerSupport,
  );

  const cleanupMedia = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setLevel(0);
    setIsListening(false);
  }, []);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startListening = useCallback(async (opts?: StartListeningOptions) => {
    if (!isSupported) {
      const errMsg = 'การบันทึกเสียงไม่รองรับในเบราว์เซอร์นี้';
      setError(errMsg);
      opts?.onEnd?.('', errMsg);
      return;
    }

    // Stop any active recording first
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanupMedia();

    setError(null);
    setTranscript('');
    setIsListening(true);
    setIsTranscribing(false);

    // Capture the callback for this specific session so a later session's
    // startListening (which fires this recorder's onstop synchronously) can't
    // overwrite which onEnd the old recorder reports to.
    const sessionOnEnd = opts?.onEnd;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const { mimeType, format } = pickMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // Chunks are local to this recorder so a new session's cleanup can't
      // clear the buffer the old recorder's onstop is about to read.
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const currentOnEnd = sessionOnEnd;

        cleanupMedia();

        const blob = new Blob(chunks, { type: mimeType || 'audio/ogg' });
        if (blob.size === 0) {
          setIsTranscribing(false);
          currentOnEnd?.('', 'ไม่มีข้อมูลเสียงที่บันทึก');
          return;
        }

        setIsTranscribing(true);
        const result = await transcribeBlob(blob, format);
        if ('error' in result) {
          setError(result.error);
          currentOnEnd?.('', result.error);
        } else {
          setTranscript(result.text);
          currentOnEnd?.(result.text, null);
        }
        setIsTranscribing(false);
      };

      // Connect Web Audio API to detect silence and track mic levels
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const data = new Uint8Array(bufferLength);
      let silenceStart: number | null = null;

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(data);

        let sum = 0;
        for (const v of data) {
          const d = (v - 128) / 128;
          sum += d * d;
        }
        const rms = Math.sqrt(sum / data.length);
        const currentLevel = Math.min(1, rms * RMS_TO_LEVEL_GAIN);
        setLevel(currentLevel);

        // Silence detection
        if (rms < SILENCE_THRESHOLD) {
          if (silenceStart === null) {
            silenceStart = Date.now();
          } else if (opts?.autoStopSilenceMs && Date.now() - silenceStart > opts.autoStopSilenceMs) {
            stopListening();
            return;
          }
        } else {
          silenceStart = null;
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      mediaRecorder.start();
      rafRef.current = requestAnimationFrame(tick);

      if (opts?.maxDurationMs) {
        timeoutRef.current = setTimeout(() => {
          stopListening();
        }, opts.maxDurationMs);
      }
    } catch (e: unknown) {
      const name = e instanceof DOMException ? e.name : undefined;
      const message = e instanceof Error ? e.message : String(e);
      const errMsg = message === 'Permission denied' || name === 'NotAllowedError'
        ? 'กรุณาอนุญาตการใช้ไมโครโฟนในการตั้งค่าเบราว์เซอร์'
        : `ไม่สามารถเข้าถึงไมโครโฟนได้: ${message || name}`;
      setError(errMsg);
      setIsListening(false);
      opts?.onEnd?.('', errMsg);
    }
  }, [isSupported, cleanupMedia, stopListening]);

  // Clean up on unmount
  useEffect(() => {
    return cleanupMedia;
  }, [cleanupMedia]);

  return {
    startListening,
    stopListening,
    isListening,
    isTranscribing,
    transcript,
    isSupported,
    error,
    level,
  };
}
