'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCapturedImage,
  clearCapturedImage,
} from '../_lib/capturedImageStore';
import { blobToBase64 } from '../_lib/blobToBase64';
import { ERROR_MESSAGES } from '../_lib/constants';
import type {
  IdentifyErrorResponse,
  IdentifySuccessResponse,
} from '../_lib/types';
import { useWordStorage } from '@/app/_lib/useWordStorage';
import { getCustomAIHeaders } from '@/app/_lib/getCustomAIHeaders';
import { useActiveLanguage } from '@/app/_lib/ActiveLanguageContext';
import { trimTransparentPixels, resizeImage } from '@/app/_lib/imageUtils';

import {
  extractWordsForLanguage,
  detectTextLanguage,
} from '../_lib/languageDetection';
import { saveCaptureRecord } from '../_lib/saveCapture';
import type { TargetLanguage } from '@/app/_lib/wordTypes';
import ScanLoadingMascot, { type ScanPhase } from './_components/ScanLoadingMascot';
import {
  extractAllTextFromResponse,
  filterMeaningfulWords,
  enrichWord,
  buildSaveInputFromResponse,
} from './_lib/wordExtraction';

/** Maximum number of words to display from a scan */
const MAX_WORDS = 50;

/** Language display names for UI messages */
const LANGUAGE_NAMES: Record<TargetLanguage, string> = {
  english: 'English',
};

/**
 * Photo Preview page (/scan/preview).
 * Displays the captured image, extracts text via AI, filters words by active language,
 * and allows the user to select and save words.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export default function PreviewPage() {
  const router = useRouter();
  const { activeLanguage } = useActiveLanguage();


  const { save } = useWordStorage();

  const [blob, setBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Background removal states
  const [isBgRemovalEnabled, setIsBgRemovalEnabled] = useState(false);
  const [bgRemovedBlob, setBgRemovedBlob] = useState<Blob | null>(null);
  const [bgRemovedUrl, setBgRemovedUrl] = useState<string | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  // Text extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle');
  const [extractedWords, setExtractedWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [mismatchMessage, setMismatchMessage] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<TargetLanguage | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Legacy single-word flow state (fallback when no text extraction)
  const [legacyMode, setLegacyMode] = useState(false);

  // Retrieve captured image on mount; redirect if none available
  useEffect(() => {
    const captured = getCapturedImage();
    if (!captured) {
      router.replace('/scan');
      return;
    }

    const url = URL.createObjectURL(captured);
    const timer = setTimeout(() => {
      setBlob(captured);
      setObjectUrl(url);
    }, 0);

    return () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
    };
  }, [router]);

  // Handle clean up of bg removed URL separately
  useEffect(() => {
    return () => {
      if (bgRemovedUrl) {
        URL.revokeObjectURL(bgRemovedUrl);
      }
    };
  }, [bgRemovedUrl]);

  const handleBgRemovalToggle = useCallback(async (enabled: boolean) => {
    setIsBgRemovalEnabled(enabled);
    if (!enabled) return;
    if (bgRemovedBlob) return;
    if (!blob) return;

    setIsRemovingBg(true);
    setSaveError(null);
    try {
      // 1. Resize image to 600px max dimension to speed up processing and prevent memory crash on mobile devices
      const resizedBlob = await resizeImage(blob, 600);
      
      try {
        // @ts-ignore
        const { env } = await import('onnxruntime-web');
        env.logLevel = 'error';
      } catch (e) {
        console.warn("Failed to set ONNX Runtime log level:", e);
      }

      // 2. Load background removal library and execute with WebGPU acceleration and high-quality 'isnet' model
      const { removeBackground } = await import('@imgly/background-removal');
      const processed = await removeBackground(resizedBlob, {
        device: 'gpu',
        model: 'isnet',
        debug: false,
      });
      
      // 3. Trim the transparent pixels from margins to crop it nicely as a sticker
      const trimmed = await trimTransparentPixels(processed);
      setBgRemovedBlob(trimmed);
      const url = URL.createObjectURL(trimmed);
      setBgRemovedUrl(url);
    } catch (err) {
      console.error('Failed to remove background:', err);
      setSaveError('Failed to remove background. Please try again.');
      setIsBgRemovalEnabled(false);
    } finally {
      setIsRemovingBg(false);
    }
  }, [blob, bgRemovedBlob]);

  /**
   * Extract text from the image using the identify API, then filter words
   * by the active language's character set.
   */
  const extractText = useCallback(
    async (imageBlob: Blob) => {
      setIsExtracting(true);
      setExtractError(null);
      setMismatchMessage(null);
      setExtractedWords([]);
      setSelectedWords(new Set());

      // Mascot loading sequence: suck the photo in, then think while the AI works.
      setScanPhase('suck');
      const suckTimer = setTimeout(() => {
        setScanPhase((p) => (p === 'suck' ? 'think' : p));
      }, 1000);

      try {
        const base64 = await blobToBase64(imageBlob);
        const headers = getCustomAIHeaders();
        const response = await fetch('/api/identify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({ image: base64, language: activeLanguage }),
        });

        if (!response.ok) {
          const data: IdentifyErrorResponse = await response.json();
          setExtractError(data.error.message);
          setLegacyMode(true);
          setIsExtracting(false);
          clearTimeout(suckTimer);
          setScanPhase('idle');
          return;
        }

        const data: IdentifySuccessResponse = await response.json();

        // Log capture to database asynchronously in the background
        saveCaptureRecord(imageBlob, data).catch((err) => {
          console.error('Failed to save capture record:', err);
        });

        // Combine all text fields from the response for word extraction
        const allText = extractAllTextFromResponse(data);

        // Extract words matching the active language's character set
        const words = filterMeaningfulWords(
          extractWordsForLanguage(allText, activeLanguage)
        );
        const uniqueWords = [...new Set(words)].slice(0, MAX_WORDS);

        if (uniqueWords.length === 0) {
          // No matching characters - detect what language the text is in
          const detected = detectTextLanguage(allText);
          setDetectedLanguage(detected);

          if (detected && detected !== activeLanguage) {
            setMismatchMessage(
              `No ${LANGUAGE_NAMES[activeLanguage]} characters detected. Try switching to ${LANGUAGE_NAMES[detected]}.`
            );
          } else {
            // Fall back to legacy single-word mode
            setLegacyMode(true);
          }
          clearTimeout(suckTimer);
          setScanPhase('idle');
        } else {
          setExtractedWords(uniqueWords);
          // Auto-select all words by default
          setSelectedWords(new Set(uniqueWords));
          // Reveal: mascot pops happy, then the overlay clears to show the chips.
          clearTimeout(suckTimer);
          setScanPhase('reveal');
          setTimeout(() => setScanPhase('idle'), 800);
        }

        setIsExtracting(false);
      } catch {
        setExtractError(ERROR_MESSAGES.network_error);
        setLegacyMode(true);
        setIsExtracting(false);
        clearTimeout(suckTimer);
        setScanPhase('idle');
      }
    },
    [activeLanguage]
  );

  // Auto-extract text when blob is available
  useEffect(() => {
    if (!blob) return;
    const timer = setTimeout(() => {
      extractText(blob);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  /** Toggle word selection */
  const toggleWord = useCallback((word: string) => {
    setSelectedWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) {
        next.delete(word);
      } else {
        next.add(word);
      }
      return next;
    });
  }, []);

  /** Select all words */
  const selectAll = useCallback(() => {
    setSelectedWords(new Set(extractedWords));
  }, [extractedWords]);

  /** Deselect all words */
  const deselectAll = useCallback(() => {
    setSelectedWords(new Set());
  }, []);

  /**
   * Save selected words as WordRecords. Each word is enriched via /api/translate
   * to populate its reading/romanization/translation before saving, so the
   * Library can show the word, its reading, and play its pronunciation.
   */
  const handleSaveWords = useCallback(async () => {
    if (selectedWords.size === 0 || !blob || isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const wordsToSave = Array.from(selectedWords);
      const headers = getCustomAIHeaders();

      // Enrich each word in parallel; fall back to the raw word on failure so
      // it still displays and remains pronounceable in the Library.
      const inputs = await Promise.all(
        wordsToSave.map((word) => enrichWord(word, headers))
      );

      // Use transparent background blob if enabled
      const blobToSave = (isBgRemovalEnabled && bgRemovedBlob) ? bgRemovedBlob : blob;

      for (const input of inputs) {
        await save(blobToSave, input);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        clearCapturedImage();
        router.push('/words');
      }, 1000);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to save words. Please try again.';
      setSaveError(message);
      setIsSaving(false);
    }
  }, [selectedWords, blob, isSaving, save, router, isBgRemovalEnabled, bgRemovedBlob]);

  /**
   * Legacy confirm handler - sends image to identify API and saves single word.
   */
  const handleLegacyConfirm = useCallback(async () => {
    if (!blob || isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const base64 = await blobToBase64(blob);
      const headers = getCustomAIHeaders();
      const response = await fetch('/api/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ image: base64, language: activeLanguage }),
      });

      if (!response.ok) {
        const data: IdentifyErrorResponse = await response.json();
        setSaveError(data.error.message);
        setIsSaving(false);
        return;
      }

      const data: IdentifySuccessResponse = await response.json();
      const label = data.label || '';
      if (!label) {
        setSaveError(ERROR_MESSAGES.api_error);
        setIsSaving(false);
        return;
      }

      // Build save input based on response type
      const saveInput = buildSaveInputFromResponse(data);
      
      // Use transparent background blob if enabled
      const blobToSave = (isBgRemovalEnabled && bgRemovedBlob) ? bgRemovedBlob : blob;
      await save(blobToSave, saveInput);
      clearCapturedImage();
      router.push('/words');
    } catch {
      setSaveError(ERROR_MESSAGES.network_error);
      setIsSaving(false);
    }
  }, [blob, isSaving, save, router, activeLanguage, isBgRemovalEnabled, bgRemovedBlob]);

  const handleRetake = useCallback(() => {
    if (isSaving) return;
    clearCapturedImage();
    router.push('/scan');
  }, [isSaving, router]);

  // Don't render until we have the blob/url
  if (!objectUrl) {
    return null;
  }

  const displayUrl = (isBgRemovalEnabled && bgRemovedUrl) ? bgRemovedUrl : objectUrl;

  return (
    <div className="fixed inset-0 z-50 flex flex-col dot-grid-bg text-text-primary">

      {/* Mascot loading overlay: sucks the photo in, thinks, then reveals words */}
      <ScanLoadingMascot phase={scanPhase} imageUrl={objectUrl} />

      {/* Image preview area — neobrutalist framed card with a dark overlay layer */}
      <div className="flex flex-1 items-center justify-center overflow-hidden p-3 relative">
        <div className="relative max-h-full max-w-full overflow-hidden rounded-2xl border-3 border-border-color bg-black shadow-nb-md">
          <img
            src={displayUrl}
            alt="Captured image"
            className="block max-h-full max-w-full object-contain"
          />
          {/* Subtle dark gradient layer for depth, matching the design system */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

          {/* Loading overlay for background removal */}
          {isRemovingBg && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 text-white z-20">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-accent-green border-t-transparent" />
              <p className="text-sm font-bold">กำลังลบพื้นหลัง...</p>
            </div>
          )}
        </div>
      </div>

      {/* Background Removal Toggle */}
      <div className="px-6 py-3.5 flex items-center justify-between bg-card-bg border-y-3 border-border-color shrink-0">
        <div className="flex flex-col">
          <span className="text-sm font-extrabold text-text-primary">ลบพื้นหลังรูปภาพ (Sticker)</span>
          <span className="text-[10px] text-text-secondary font-medium">ตัดเฉพาะวัตถุเพื่อสร้างสติกเกอร์โค้งเว้า</span>
        </div>
        <button
          type="button"
          onClick={() => handleBgRemovalToggle(!isBgRemovalEnabled)}
          disabled={isRemovingBg || isSaving}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-border-color transition-colors duration-200 ease-in-out focus:outline-none ${
            isBgRemovalEnabled ? 'bg-accent-green' : 'bg-gray-200 dark:bg-gray-700'
          }`}
          role="switch"
          aria-checked={isBgRemovalEnabled}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white border-2 border-border-color shadow transition duration-200 ease-in-out ${
              isBgRemovalEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Word extraction results */}
      <div className="max-h-[40%] shrink-0 overflow-y-auto px-4 pt-3">
        {/* Loading state (only when the mascot overlay isn't showing) */}
        {isExtracting && scanPhase === 'idle' && (
          <div className="flex items-center justify-center gap-3 py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-green border-t-transparent" />
            <p className="text-sm font-bold text-text-secondary">Extracting text...</p>
          </div>
        )}

        {/* Mismatch message */}
        {mismatchMessage && (
          <div className="rounded-xl border-3 border-black bg-[#FFF8E1] px-4 py-3 shadow-nb-sm dark:border-border-color dark:bg-[#3d3520]">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
              {mismatchMessage}
            </p>
            {detectedLanguage && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Detected language: {LANGUAGE_NAMES[detectedLanguage]}
              </p>
            )}
          </div>
        )}

        {/* Extraction error */}
        {extractError && !legacyMode && (
          <div className="rounded-xl border-3 border-black bg-[#FFF0F0] px-4 py-3 shadow-nb-sm dark:border-border-color dark:bg-[#3d2020]">
            <p className="text-sm font-bold text-red-600 dark:text-red-400">
              {extractError}
            </p>
          </div>
        )}

        {/* Selectable word list */}
        {extractedWords.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-text-secondary">
                {selectedWords.size} / {extractedWords.length} words selected
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs font-bold text-accent-green underline cursor-pointer"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-xs font-bold text-text-meta underline cursor-pointer"
                >
                  None
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {extractedWords.map((word) => (
                <button
                  key={word}
                  type="button"
                  onClick={() => toggleWord(word)}
                  className={`rounded-lg border-3 px-3 py-1.5 text-sm font-bold transition-all duration-100 cursor-pointer ${
                    selectedWords.has(word)
                      ? 'border-border-color bg-accent-green text-white shadow-nb-sm'
                      : 'border-border-color bg-card-bg text-text-secondary'
                  }`}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save error message */}
      {saveError && (
        <div className="mx-4 mb-2 rounded-xl border-3 border-black bg-[#FFF0F0] px-4 py-3 text-center shadow-nb-sm dark:border-border-color dark:bg-[#3d2020] dark:shadow-nb-sm">
          <p className="text-sm font-bold text-red-600 dark:text-red-400">{saveError}</p>
        </div>
      )}

      {/* Save success message */}
      {saveSuccess && (
        <div className="mx-4 mb-2 rounded-xl border-3 border-black bg-[#F0FFF0] px-4 py-3 text-center shadow-nb-sm dark:border-border-color dark:bg-[#1a3d1a] dark:shadow-nb-sm">
          <p className="text-sm font-bold text-green-600 dark:text-green-400">
            Saved {selectedWords.size} word{selectedWords.size !== 1 ? 's' : ''}!
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-4 px-6 pb-8 pt-4">
        {/* Retake button */}
        <button
          type="button"
          onClick={handleRetake}
          disabled={isSaving}
          className="flex-1 rounded-xl border-3 border-black bg-white px-4 py-3 text-center font-extrabold text-black shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-nb-sm disabled:opacity-50 disabled:cursor-not-allowed dark:border-border-color dark:bg-card-bg dark:text-text-primary cursor-pointer"
        >
          Retake
        </button>

        {/* Save/Confirm button */}
        {legacyMode ? (
          <button
            type="button"
            onClick={handleLegacyConfirm}
            disabled={isSaving}
            className="flex-1 rounded-xl border-3 border-black bg-accent-green px-4 py-3 text-center font-extrabold text-white shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-nb-sm disabled:opacity-70 disabled:cursor-not-allowed dark:border-border-color cursor-pointer"
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
        ) : (
          <button
            type="button"
            onClick={handleSaveWords}
            disabled={isSaving || selectedWords.size === 0 || isExtracting}
            className="flex-1 rounded-xl border-3 border-black bg-accent-green px-4 py-3 text-center font-extrabold text-white shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-nb-sm disabled:opacity-70 disabled:cursor-not-allowed dark:border-border-color cursor-pointer"
          >
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </span>
            ) : (
              `Save ${selectedWords.size} word${selectedWords.size !== 1 ? 's' : ''}`
            )}
          </button>
        )}
      </div>
    </div>
  );
}

