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
import { getCustomAIHeaders } from '@/app/_lib/getCustomAIHeaders';
import { useActiveLanguage } from '@/app/_lib/ActiveLanguageContext';
import {
  extractWordsForLanguage,
  detectTextLanguage,
} from '../_lib/languageDetection';
import type { TargetLanguage } from '@/app/_lib/wordTypes';
import { WORDS_STORE, openDatabase } from '@/app/_lib/db';
import { createWordRecord } from '../_lib/createWordRecord';

/** Maximum number of words to display from a scan */
const MAX_WORDS = 50;

/** Language display names for UI messages */
const LANGUAGE_NAMES: Record<TargetLanguage, string> = {
  english: 'English',
  japanese: '日本語',
  korean: '한국어',
  chinese: '中文',
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
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Text extraction state
  const [isExtracting, setIsExtracting] = useState(false);
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

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [router]);

  // Auto-extract text when blob is available
  useEffect(() => {
    if (!blob) return;
    extractText(blob);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  // Compute fit dimensions based on natural image size and viewport
  const updateDimensions = useCallback(() => {
    if (!imageNaturalSize.current) return;
    const { width: natW, height: natH } = imageNaturalSize.current;
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight - 320; // Reserve space for word list and buttons
    const fit = computeFitDimensions(natW, natH, containerWidth, containerHeight);
    setDimensions(fit);
  }, []);

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
          return;
        }

        const data: IdentifySuccessResponse = await response.json();

        // Combine all text fields from the response for word extraction
        const allText = extractAllTextFromResponse(data);

        // Extract words matching the active language's character set
        const words = extractWordsForLanguage(allText, activeLanguage);
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
        } else {
          setExtractedWords(uniqueWords);
          // Auto-select all words by default
          setSelectedWords(new Set(uniqueWords));
        }

        setIsExtracting(false);
      } catch {
        setExtractError(ERROR_MESSAGES.network_error);
        setLegacyMode(true);
        setIsExtracting(false);
      }
    },
    [activeLanguage]
  );

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
   * Save selected words as WordRecords in the active language's store.
   */
  const handleSaveWords = useCallback(async () => {
    if (selectedWords.size === 0 || !blob || isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const db = await openDatabase();
      const tx = db.transaction(WORDS_STORE, 'readwrite');
      const store = tx.objectStore(WORDS_STORE);

      const wordsToSave = Array.from(selectedWords);

      for (const word of wordsToSave) {
        const record = createWordRecord(word, activeLanguage, blob);
        store.put(record);
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      setSaveSuccess(true);
      setTimeout(() => {
        clearCapturedImage();
        router.push('/learn');
      }, 1000);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to save words. Please try again.';
      setSaveError(message);
      setIsSaving(false);
    }
  }, [selectedWords, blob, isSaving, activeLanguage, router]);

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
      await save(blob, saveInput);
      clearCapturedImage();
      router.push('/learn');
    } catch {
      setSaveError(ERROR_MESSAGES.network_error);
      setIsSaving(false);
    }
  }, [blob, isSaving, save, router, activeLanguage]);

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
      <div className="flex shrink-0 items-center justify-center overflow-hidden px-2 pt-2">
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

      {/* Word extraction results */}
      <div className="flex-1 overflow-y-auto px-4 pt-3">
        {/* Loading state */}
        {isExtracting && (
          <div className="flex items-center justify-center gap-3 py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <p className="text-sm font-bold text-white">Extracting text...</p>
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
              <p className="text-xs font-bold text-white/70">
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
                  className="text-xs font-bold text-white/50 underline cursor-pointer"
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
                  className={`rounded-lg border-2 px-3 py-1.5 text-sm font-bold transition-all duration-100 cursor-pointer ${
                    selectedWords.has(word)
                      ? 'border-accent-green bg-accent-green/20 text-white'
                      : 'border-white/30 bg-white/10 text-white/60'
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

/**
 * Extracts all text fields from an identify response regardless of language type.
 */
function extractAllTextFromResponse(data: IdentifySuccessResponse): string {
  const parts: string[] = [data.label || ''];

  if ('korean' in data) {
    parts.push(data.korean || '', data.reading || '', data.romanization || '', data.english || '');
  }
  if ('kanji' in data) {
    parts.push(data.kanji || '', data.hiragana || '', data.romaji || '', data.english || '');
  }
  if ('hanzi' in data) {
    parts.push(data.hanzi || '', data.pinyin || '', data.english || '');
  }
  if ('word' in data) {
    parts.push(data.word || '', data.ipa || '', data.thai || '');
  }

  return parts.join(' ');
}

/**
 * Builds a save input object from the identify response for legacy mode.
 */
function buildSaveInputFromResponse(data: IdentifySuccessResponse): { label: string; korean?: string; reading?: string; romanization?: string; english?: string } {
  if ('korean' in data) {
    return {
      label: data.label || data.korean || data.english || '',
      korean: data.korean,
      reading: data.reading,
      romanization: data.romanization,
      english: data.english,
    };
  }
  if ('kanji' in data) {
    return {
      label: data.label || data.kanji || data.english || '',
      english: data.english,
    };
  }
  if ('hanzi' in data) {
    return {
      label: data.label || data.hanzi || data.english || '',
      english: data.english,
    };
  }
  // English response
  if ('word' in data) {
    return {
      label: data.label || data.word || '',
      english: data.word,
    };
  }
  return { label: data.label || '' };
}

