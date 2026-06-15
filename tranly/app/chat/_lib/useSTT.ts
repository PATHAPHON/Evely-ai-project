'use client';

import { useCallback, useRef, useState } from 'react';
import type { SpeechLang } from './types';

// Web Speech API type declarations (not yet in all TypeScript DOM libs)
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseSTTReturn {
  startListening: (lang?: SpeechLang) => void;
  stopListening: () => void;
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  error: string | null;
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function useSTT(): UseSTTReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const isSupported = typeof window !== 'undefined' && getSpeechRecognitionConstructor() !== null;

  const startListening = useCallback((lang: SpeechLang = 'en-US') => {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    // Stop any existing recognition session
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    setError(null);
    setTranscript('');

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      if (result && result[0]) {
        setTranscript(result[0].transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      switch (event.error) {
        case 'not-allowed':
          setError('กรุณาอนุญาตการใช้ไมโครโฟนในการตั้งค่าเบราว์เซอร์');
          break;
        case 'network':
          setError('ไม่สามารถรับเสียงได้ กรุณาตรวจสอบอินเทอร์เน็ต');
          break;
        case 'no-speech':
          setError('ไม่ได้ยินเสียงพูด กรุณาลองอีกครั้ง');
          break;
        case 'aborted':
          // User-initiated abort, no error to show
          break;
        default:
          setError(`เกิดข้อผิดพลาดในการรับเสียง: ${event.error}`);
          break;
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setError('ไม่สามารถเริ่มการรับเสียงได้');
      setIsListening(false);
      recognitionRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  return {
    startListening,
    stopListening,
    isListening,
    transcript,
    isSupported,
    error,
  };
}
