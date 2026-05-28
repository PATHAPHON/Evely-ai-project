'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraError } from './types';
import { DEFAULT_CONSTRAINTS, FALLBACK_CONSTRAINTS } from './constants';

export interface UseCameraStreamReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  isLoading: boolean;
  error: CameraError | null;
  capture: () => Promise<Blob>;
  retry: () => void;
  stop: () => void;
}

function mapError(err: unknown): CameraError {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
        return {
          type: 'permission_denied',
          message: 'Please allow camera access in your device settings.',
        };
      case 'NotFoundError':
        return {
          type: 'not_found',
          message: 'No camera found on this device.',
        };
      default:
        return {
          type: 'stream_interrupted',
          message: 'Camera connection lost.',
        };
    }
  }
  return {
    type: 'stream_interrupted',
    message: 'Camera connection lost.',
  };
}

export function useCameraStream(): UseCameraStreamReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingStreamRef = useRef<Promise<MediaStream> | null>(null);
  const cancelledRef = useRef<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<CameraError | null>(null);

  const stopStream = useCallback(() => {
    cancelledRef.current = true;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    // If a getUserMedia request is in-flight, ensure its resulting stream is
    // stopped as soon as it resolves so we don't leak the camera device.
    if (pendingStreamRef.current) {
      const pending = pendingStreamRef.current;
      pending
        .then((s) => s.getTracks().forEach((t) => t.stop()))
        .catch(() => {});
      pendingStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startStream = useCallback(async () => {
    cancelledRef.current = false;
    setIsLoading(true);
    setError(null);

    try {
      const request = (async () => {
        try {
          return await navigator.mediaDevices.getUserMedia(DEFAULT_CONSTRAINTS);
        } catch (primaryErr) {
          if (
            primaryErr instanceof DOMException &&
            (primaryErr.name === 'OverconstrainedError' ||
              primaryErr.name === 'NotReadableError')
          ) {
            return await navigator.mediaDevices.getUserMedia(
              FALLBACK_CONSTRAINTS
            );
          }
          throw primaryErr;
        }
      })();
      pendingStreamRef.current = request;
      const mediaStream = await request;

      // If the component was unmounted (or stopStream was called) while
      // getUserMedia was in flight, immediately release the camera.
      if (cancelledRef.current) {
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }

      pendingStreamRef.current = null;
      streamRef.current = mediaStream;
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      if (cancelledRef.current) return;
      setError(mapError(err));
    } finally {
      pendingStreamRef.current = null;
      if (!cancelledRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const capture = useCallback(async (): Promise<Blob> => {
    const video = videoRef.current;
    if (!video || !streamRef.current) {
      throw new Error('No active video stream');
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        'image/jpeg',
        0.85
      );
    });
  }, []);

  const retry = useCallback(() => {
    stopStream();
    startStream();
  }, [stopStream, startStream]);

  const stop = useCallback(() => {
    stopStream();
  }, [stopStream]);

  // Start stream on mount, clean up on unmount
  useEffect(() => {
    startStream();

    return () => {
      cancelledRef.current = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (pendingStreamRef.current) {
        const pending = pendingStreamRef.current;
        pending
          .then((s) => s.getTracks().forEach((t) => t.stop()))
          .catch(() => {});
        pendingStreamRef.current = null;
      }
    };
  }, [startStream]);

  return {
    videoRef,
    stream,
    isLoading,
    error,
    capture,
    retry,
    stop,
  };
}
