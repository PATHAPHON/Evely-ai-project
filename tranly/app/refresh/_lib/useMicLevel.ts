'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface MicRefs {
  ctx: AudioContext;
  stream: MediaStream;
  raf: number;
}

/**
 * Reads live microphone amplitude via an AnalyserNode, returning `level` (0-1).
 * Runs in parallel with SpeechRecognition so the waveform reflects real voice.
 * Best-effort: if mic capture fails, level stays 0 and STT is unaffected.
 */
export function useMicLevel() {
  const [level, setLevel] = useState(0);
  const refs = useRef<MicRefs | null>(null);

  const stop = useCallback(() => {
    const r = refs.current;
    if (!r) return;
    refs.current = null;
    cancelAnimationFrame(r.raf);
    r.stream.getTracks().forEach((t) => t.stop());
    void r.ctx.close();
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    if (refs.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        // RMS deviation from the 128 midpoint → 0-1 amplitude.
        let sum = 0;
        for (const v of data) {
          const d = (v - 128) / 128;
          sum += d * d;
        }
        const rms = Math.sqrt(sum / data.length);
        setLevel(Math.min(1, rms * 3));
        if (refs.current) refs.current.raf = requestAnimationFrame(tick);
      };

      refs.current = { ctx, stream, raf: requestAnimationFrame(tick) };
    } catch {
      // ponytail: waveform is optional; swallow so STT keeps working
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { level, start, stop };
}
