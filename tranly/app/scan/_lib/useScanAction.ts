'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { setCapturedImage } from './capturedImageStore';

/**
 * Shared camera-capture behaviour used by the scan entry points.
 *
 * - Secure context (getUserMedia available): navigates to /scan for the live
 *   camera view.
 * - Otherwise (e.g. HTTP over LAN): triggers a native file input with
 *   capture="environment" and goes to /scan/preview with the picked image.
 *
 * When `hasGetUserMedia` is false, the caller must render a hidden file input
 * wired with `fileInputRef` and `handleFileChange`.
 */
export function useScanAction(disabled = false) {
  const router = useRouter();
  const [hasGetUserMedia, setHasGetUserMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasGetUserMedia(
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    );
  }, []);

  const startScan = useCallback(() => {
    if (disabled) return;
    if (hasGetUserMedia) {
      router.push('/scan');
    } else {
      fileInputRef.current?.click();
    }
  }, [disabled, hasGetUserMedia, router]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setCapturedImage(file);
        router.push('/scan/preview');
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [router]
  );

  return { hasGetUserMedia, fileInputRef, startScan, handleFileChange };
}
