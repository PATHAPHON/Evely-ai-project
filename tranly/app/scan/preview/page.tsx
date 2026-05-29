'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCapturedImage,
  clearCapturedImage,
} from '../_lib/capturedImageStore';
import { computeFitDimensions } from '../_lib/computeFitDimensions';
import { blobToBase64 } from '../flashcard/_lib/blobToBase64';
import { ERROR_MESSAGES } from '../flashcard/_lib/constants';
import type {
  IdentifyErrorResponse,
  IdentifySuccessResponse,
} from '../flashcard/_lib/types';
import { useWordStorage } from '@/app/learn/_lib/useWordStorage';

/**
 * Photo Preview page (/scan/preview).
 * Displays the captured image with Confirm and Retake actions.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.3
 */
export default function PreviewPage() {
  const router = useRouter();

  const { save } = useWordStorage();

  const [blob, setBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const imageNaturalSize = useRef<{ width: number; height: number } | null>(
    null
  );

  // Retrieve captured image on mount; redirect if none available
  useEffect(() => {
    const captured = getCapturedImage();
    if (!captured) {
      router.replace('/scan');
      return;
    }
    setBlob(captured);
    const url = URL.createObjectURL(captured);
    setObjectUrl(url);

    // Revoke object URL on unmount to prevent memory leaks
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [router]);

  // Compute fit dimensions based on natural image size and viewport
  const updateDimensions = useCallback(() => {
    if (!imageNaturalSize.current) return;
    const { width: natW, height: natH } = imageNaturalSize.current;
    // Reserve space for buttons at bottom (~140px) and some padding
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight - 160;
    const fit = computeFitDimensions(natW, natH, containerWidth, containerHeight);
    setDimensions(fit);
  }, []);

  // Listen to resize/orientation change for responsive sizing
  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, [updateDimensions]);

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      imageNaturalSize.current = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      updateDimensions();
    },
    [updateDimensions]
  );

  const handleConfirm = useCallback(async () => {
    if (!blob || isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const base64 = await blobToBase64(blob);
      const response = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      if (!response.ok) {
        const data: IdentifyErrorResponse = await response.json();
        setSaveError(data.error.message);
        setIsSaving(false);
        return;
      }

      const data: IdentifySuccessResponse = await response.json();
      // `label` stores the Thai word (used as the primary fallback for older
      // records and as the Thai line in the card UI).
      const thai = (data.label || '').trim();
      if (!thai && !data.korean && !data.english) {
        setSaveError(ERROR_MESSAGES.api_error);
        setIsSaving(false);
        return;
      }

      await save(blob, {
        label: thai || data.korean || data.english || '',
        korean: data.korean,
        reading: data.reading,
        romanization: data.romanization,
        english: data.english,
      });
      clearCapturedImage();
      router.push('/learn');
    } catch {
      setSaveError(ERROR_MESSAGES.network_error);
      setIsSaving(false);
    }
  }, [blob, isSaving, save, router]);

  const handleRetake = useCallback(() => {
    if (isSaving) return;
    clearCapturedImage();
    router.push('/scan');
  }, [isSaving, router]);

  // Don't render until we have the blob/url
  if (!objectUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Image preview area */}
      <div className="flex flex-1 items-center justify-center overflow-hidden px-2 pt-2">
        <img
          src={objectUrl}
          alt="Captured image"
          onLoad={handleImageLoad}
          style={
            dimensions
              ? { width: dimensions.width, height: dimensions.height }
              : undefined
          }
          className="object-contain"
        />
      </div>

      {/* Save error message */}
      {saveError && (
        <div className="mx-4 mb-2 rounded-xl border-3 border-black bg-[#FFF0F0] px-4 py-3 text-center shadow-[3px_3px_0_#000000] dark:border-border-color dark:bg-[#3d2020] dark:shadow-[3px_3px_0_rgba(0,0,0,0.4)]">
          <p className="text-sm font-bold text-red-600 dark:text-red-400">{saveError}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-4 px-6 pb-8 pt-4">
        {/* Retake button */}
        <button
          type="button"
          onClick={handleRetake}
          disabled={isSaving}
          className="flex-1 rounded-xl border-3 border-black bg-white px-4 py-3 text-center font-extrabold text-black shadow-[4px_4px_0_#000000] transition-all duration-100 active:translate-y-[2px] active:shadow-[2px_2px_0_#000000] disabled:opacity-50 disabled:cursor-not-allowed dark:border-border-color dark:bg-card-bg dark:text-text-primary dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)] cursor-pointer"
        >
          Retake
        </button>

        {/* Confirm button */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSaving}
          className="flex-1 rounded-xl border-3 border-black bg-[#52C41A] px-4 py-3 text-center font-extrabold text-white shadow-[4px_4px_0_#000000] transition-all duration-100 active:translate-y-[2px] active:shadow-[2px_2px_0_#000000] disabled:opacity-70 disabled:cursor-not-allowed dark:border-border-color dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)] cursor-pointer"
        >
          {isSaving ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving...
            </span>
          ) : (
            'Confirm'
          )}
        </button>
      </div>
    </div>
  );
}
