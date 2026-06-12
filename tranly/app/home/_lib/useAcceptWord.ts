'use client';

import { useCallback } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import { useWordStorage } from '@/app/_lib/useWordStorage';
import { trimTransparentPixels, resizeImage } from '@/app/_lib/imageUtils';
import type { FeedWordRecord } from './types';
import { generateWordPlaceholderBlob, getPrimaryWord } from './feedHelpers';

export interface UseAcceptWordReturn {
  acceptWord: (target: FeedWordRecord, coverImageIndex: number) => Promise<void>;
}

/**
 * Handles "รับ" (accept) of a feed word: turn it into a sticker (fetch image,
 * remove background, trim) and persist it to the Word page storage (/learn).
 * Pulls the cover image at `coverImageIndex`, falling back to a text placeholder.
 */
export function useAcceptWord({ messageApi }: { messageApi: MessageInstance }): UseAcceptWordReturn {
  const { save: saveLearnWord, list: listLearnWords } = useWordStorage();

  const acceptWord = useCallback(
    async (target: FeedWordRecord, coverImageIndex: number): Promise<void> => {
      const primaryWord = getPrimaryWord(target);

      const key = 'sticker-loading';
      setTimeout(() => {
        messageApi.open({
          key,
          type: 'loading',
          content: 'กำลังแปลงเป็นสติกเกอร์...',
          duration: 0,
        });
      }, 0);
      try {
        const existing = await listLearnWords();
        if (existing.some((w) => w.english === primaryWord)) {
          setTimeout(() => {
            messageApi.destroy(key);
          }, 0);
          return;
        }

        let blob: Blob | null = null;
        const coverUrl = (target.imageUrls && target.imageUrls.length > 0)
          ? (target.imageUrls[coverImageIndex] || target.imageUrls[0])
          : target.imageUrl;

        if (coverUrl) {
          try {
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(coverUrl)}`;
            const res = await fetch(proxyUrl);
            if (res.ok) {
              blob = await res.blob();
            }
          } catch (err) {
            console.error("Failed to fetch image via proxy:", err);
          }
        }

        // Fallback to text placeholder if image fetching fails or no image is set
        if (!blob) {
          blob = await generateWordPlaceholderBlob(primaryWord);
        }

        if (blob) {
          try {
            const resizedBlob = await resizeImage(blob, 600);

            try {
              // @ts-ignore
              const { env } = await import('onnxruntime-web');
              env.logLevel = 'error';
            } catch (e) {
              console.warn("Failed to set ONNX Runtime log level:", e);
            }

            const { removeBackground } = await import('@imgly/background-removal');
            const processed = await removeBackground(resizedBlob, {
              device: 'gpu',
              model: 'isnet',
              debug: false,
            });
            const trimmed = await trimTransparentPixels(processed);
            blob = trimmed;
          } catch (err) {
            console.error("Failed to remove background for feed word:", err);
          }
        }

        if (!blob) {
          setTimeout(() => {
            messageApi.destroy(key);
          }, 0);
          return;
        }

        await saveLearnWord(blob, {
          label: target.thai,
          english: target.word || primaryWord,
          reading: target.ipa || '',
          partOfSpeech: target.partOfSpeech || '',
        });
        setTimeout(() => {
          messageApi.open({
            key,
            type: 'success',
            content: 'สร้างสติกเกอร์และบันทึกในสมุดแล้ว! ✨',
            duration: 3,
          });
        }, 0);
      } catch (err) {
        setTimeout(() => {
          messageApi.destroy(key);
        }, 0);
        console.error("Accept word save failed:", err);
      }
    },
    [listLearnWords, saveLearnWord, messageApi]
  );

  return { acceptWord };
}
