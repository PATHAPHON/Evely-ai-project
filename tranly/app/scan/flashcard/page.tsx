'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCapturedImage,
  clearCapturedImage,
} from '../_lib/capturedImageStore';
import { useObjectIdentification } from './_lib/useObjectIdentification';
import { useWordStorage } from '@/app/learn/_lib/useWordStorage';
import { flashcardImageDimensions } from './_lib/flashcardImageDimensions';
import { ANIMATION_DURATION_MS } from './_lib/constants';

/**
 * Flashcard View page (/scan/flashcard).
 * Displays the AI-identified object label as a flashcard with the captured image.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export default function FlashcardPage() {
  const router = useRouter();
  const { label, isLoading, error, retryCount, identify, retry, canRetry } =
    useObjectIdentification();
  const {
    save,
    isLoading: isSaving,
    error: saveError,
  } = useWordStorage();

  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);

  const imageNaturalSize = useRef<{ width: number; height: number } | null>(
    null
  );
  const mountedRef = useRef(true);

  // Retrieve captured image on mount; redirect if none available
  useEffect(() => {
    const captured = getCapturedImage();
    if (!captured) {
      router.replace('/scan');
      return;
    }
    setImageBlob(captured);
    const url = URL.createObjectURL(captured);
    setObjectUrl(url);

    // Automatically start identification
    identify(captured);

    return () => {
      URL.revokeObjectURL(url);
      mountedRef.current = false;
      clearCapturedImage();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger reveal animation when label arrives
  useEffect(() => {
    if (label) {
      // Small delay to ensure the DOM has rendered before triggering transition
      const timer = setTimeout(() => {
        setRevealed(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setRevealed(false);
    }
  }, [label]);

  // Compute image dimensions based on viewport
  const updateDimensions = useCallback(() => {
    if (!imageNaturalSize.current) return;
    const { width: natW, height: natH } = imageNaturalSize.current;
    const dims = flashcardImageDimensions(
      natW,
      natH,
      window.innerWidth - 32, // account for card padding
      window.innerHeight
    );
    setImageDimensions(dims);
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
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

  const handleSave = useCallback(async () => {
    if (!imageBlob || !label) return;
    setButtonsDisabled(true);

    try {
      await save(imageBlob, label);
      setSaveSuccess(true);

      // Show success for 1 second, then navigate
      setTimeout(() => {
        if (mountedRef.current) {
          clearCapturedImage();
          router.push('/learn');
        }
      }, 1000);
    } catch {
      // Re-enable buttons on failure
      setButtonsDisabled(false);
    }
  }, [imageBlob, label, save, router]);

  const handleRetake = useCallback(() => {
    clearCapturedImage();
    router.push('/scan');
  }, [router]);

  const handleRetry = useCallback(() => {
    retry();
  }, [retry]);

  // Don't render until we have the image URL
  if (!objectUrl) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <p className="text-lg font-bold text-white">Analyzing image...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !label) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black px-6">
        <div className="w-full max-w-sm rounded-2xl border-3 border-black bg-white p-6 shadow-[4px_4px_0_#000000] dark:border-border-color dark:bg-card-bg dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)]">
          <p className="mb-6 text-center text-base font-bold text-red-600 dark:text-red-400">
            {error.message}
          </p>
          <div className="flex gap-4">
            {canRetry ? (
              <button
                type="button"
                onClick={handleRetry}
                className="flex-1 rounded-xl border-3 border-black bg-[#52C41A] px-4 py-3 text-center font-extrabold text-white shadow-[4px_4px_0_#000000] transition-all duration-100 active:translate-y-[2px] active:shadow-[2px_2px_0_#000000] dark:border-border-color dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)] cursor-pointer"
              >
                Retry
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 rounded-xl border-3 border-black bg-white px-4 py-3 text-center font-extrabold text-black shadow-[4px_4px_0_#000000] transition-all duration-100 active:translate-y-[2px] active:shadow-[2px_2px_0_#000000] dark:border-border-color dark:bg-card-bg dark:text-text-primary dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)] cursor-pointer"
              >
                Retake
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success state - Flashcard display
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Flashcard card */}
      <div className="flex flex-1 items-center justify-center overflow-hidden px-4 pt-4">
        <div className="w-full max-w-sm rounded-2xl border-3 border-black bg-white p-4 shadow-[4px_4px_0_#000000] dark:border-border-color dark:bg-card-bg dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)]">
          {/* Image */}
          <div className="flex items-center justify-center overflow-hidden rounded-xl">
            <img
              src={objectUrl}
              alt="Captured image"
              onLoad={handleImageLoad}
              style={
                imageDimensions
                  ? {
                      width: imageDimensions.width,
                      height: imageDimensions.height,
                    }
                  : undefined
              }
              className="object-contain"
            />
          </div>

          {/* Label with reveal animation */}
          <div
            className="mt-4 overflow-hidden transition-all"
            style={{
              transitionDuration: `${ANIMATION_DURATION_MS}ms`,
              maxHeight: revealed ? '200px' : '0px',
              opacity: revealed ? 1 : 0,
            }}
          >
            <p className="text-center text-2xl font-bold text-black dark:text-text-primary">
              {label}
            </p>
          </div>
        </div>
      </div>

      {/* Save error message */}
      {saveError && (
        <div className="mx-4 mb-2 rounded-xl border-3 border-black bg-[#FFF0F0] px-4 py-3 text-center shadow-[3px_3px_0_#000000] dark:border-border-color dark:bg-[#3d2020] dark:shadow-[3px_3px_0_rgba(0,0,0,0.4)]">
          <p className="text-sm font-bold text-red-600 dark:text-red-400">{saveError}</p>
        </div>
      )}

      {/* Success confirmation */}
      {saveSuccess && (
        <div className="mx-4 mb-2 rounded-xl border-3 border-black bg-[#F0FFF0] px-4 py-3 text-center shadow-[3px_3px_0_#000000] dark:border-border-color dark:bg-[#1a3d1a] dark:shadow-[3px_3px_0_rgba(0,0,0,0.4)]">
          <p className="text-sm font-bold text-green-600 dark:text-green-400">
            Saved!
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-4 px-6 pb-8 pt-4">
        {/* Retake button */}
        <button
          type="button"
          onClick={handleRetake}
          disabled={buttonsDisabled}
          className="flex-1 rounded-xl border-3 border-black bg-white px-4 py-3 text-center font-extrabold text-black shadow-[4px_4px_0_#000000] transition-all duration-100 active:translate-y-[2px] active:shadow-[2px_2px_0_#000000] disabled:opacity-50 disabled:cursor-not-allowed dark:border-border-color dark:bg-card-bg dark:text-text-primary dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)] cursor-pointer"
        >
          ถ่ายใหม่
        </button>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={buttonsDisabled}
          className="flex-1 rounded-xl border-3 border-black bg-[#52C41A] px-4 py-3 text-center font-extrabold text-white shadow-[4px_4px_0_#000000] transition-all duration-100 active:translate-y-[2px] active:shadow-[2px_2px_0_#000000] disabled:opacity-50 disabled:cursor-not-allowed dark:border-border-color dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)] cursor-pointer"
        >
          {isSaving ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving...
            </span>
          ) : (
            'Save'
          )}
        </button>
      </div>
    </div>
  );
}
