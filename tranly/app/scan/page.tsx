'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCameraStream } from './_lib/useCameraStream';
import { setCapturedImage } from './_lib/capturedImageStore';
import ErrorOverlay from './_components/ErrorOverlay';
import { useStrings } from '@/app/_lib/strings';

/**
 * Camera View page (/scan).
 * Displays a full-screen live camera feed with capture and close controls.
 *
 * Requirements: 1.1, 1.2, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 5.3
 */
export default function ScanPage() {
  const router = useRouter();
  const t = useStrings();
  const { videoRef, error, capture, retry, stop } = useCameraStream();
  const [isCapturing, setIsCapturing] = useState(false);

  // Track viewport dimensions to force video element re-render on resize/orientation change
  // This ensures the video feed resizes within 500ms of the event (Requirement 5.3)
  const [viewportKey, setViewportKey] = useState(0);

  useEffect(() => {
    const handleViewportChange = () => {
      setViewportKey((k) => k + 1);
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, []);

  const handleCapture = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      const blob = await capture();
      setCapturedImage(blob);
      router.push('/scan/preview');
    } catch {
      // Re-enable button on failure — error is handled by the hook
      setIsCapturing(false);
    }
  }, [isCapturing, capture, router]);

  const handleClose = useCallback(() => {
    stop();
    router.push('/home');
  }, [stop, router]);

  const handleRetry = useCallback(() => {
    retry();
  }, [retry]);

  const handleDismiss = useCallback(() => {
    stop();
    router.push('/home');
  }, [stop, router]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Full-screen video feed — re-renders on resize/orientation change via viewportKey state */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
        data-viewport-key={viewportKey}
      />

      {/* Close button — top-left, 44×44px minimum tap target */}
      <button
        type="button"
        aria-label={t.scan.closeAria}
        onClick={handleClose}
        className="absolute top-4 left-4 z-10 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-3 border-black bg-white/90 shadow-nb-sm transition-all duration-100 active:translate-y-[1px] active:shadow-[1px_1px_0_var(--shadow-color)] dark:border-border-color dark:bg-card-bg/90 dark:shadow-nb-sm cursor-pointer"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Capture button — bottom-center */}
      <div className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2">
        <CaptureButton
          onPress={handleCapture}
          disabled={isCapturing}
          label={t.scan.captureAria}
        />
      </div>

      {/* Error overlay */}
      {error && (
        <ErrorOverlay
          error={error}
          onRetry={handleRetry}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}

/**
 * Circular capture button with Neobrutalist styling and scale-down press animation.
 *
 * Requirements: 2.1, 2.2, 2.4
 */
function CaptureButton({
  onPress,
  disabled,
  label,
}: {
  onPress: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      disabled={disabled}
      className={`
        flex h-[72px] w-[72px] items-center justify-center rounded-full
        border-[4px] border-black bg-white
        shadow-nb-md
        transition-transform duration-150 ease-in-out
        active:scale-90
        disabled:opacity-50 disabled:cursor-not-allowed
        dark:border-border-color dark:bg-card-bg
        cursor-pointer
      `}
    >
      {disabled ? (
        /* Loading spinner during capture */
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-black border-t-transparent dark:border-white dark:border-t-transparent" />
      ) : (
        /* Inner circle indicator */
        <div className="h-[52px] w-[52px] rounded-full border-3 border-black bg-accent-red dark:border-border-color" />
      )}
    </button>
  );
}
