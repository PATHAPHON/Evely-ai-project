"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ScanOutlined } from "@ant-design/icons";
import { setCapturedImage } from "../_lib/capturedImageStore";

/**
 * Floating action button for camera capture.
 *
 * - If getUserMedia is available (secure context): navigates to /scan for live camera view
 * - If not (e.g., HTTP over LAN): uses native file input with capture="environment"
 *   to open the device camera directly, then goes to /scan/preview
 *
 * Requirements: 1.1, 5.2
 */
export default function ScanButton() {
  const router = useRouter();
  const [hasGetUserMedia, setHasGetUserMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supported = !!(
      navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    );
    setHasGetUserMedia(supported);
  }, []);

  const handleClick = useCallback(() => {
    if (hasGetUserMedia) {
      // Secure context — use the full camera view with live stream
      router.push("/scan");
    } else {
      // Non-secure context — trigger native file picker with camera
      fileInputRef.current?.click();
    }
  }, [hasGetUserMedia, router]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setCapturedImage(file);
        router.push("/scan/preview");
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [router]
  );

  return (
    <>
      <a
        onClick={handleClick}
        className="flex flex-col items-center gap-1 cursor-pointer transition-colors text-black dark:text-white"
      >
        <span className="w-10 h-10 flex items-center justify-center rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-[#52C41A] text-white shadow-[2px_2px_0_#000000] dark:shadow-[2px_2px_0_rgba(0,0,0,0.4)] active:translate-y-[1px] active:shadow-[1px_1px_0_#000000] dark:active:shadow-[1px_1px_0_rgba(0,0,0,0.4)]">
          <ScanOutlined style={{ fontSize: 20 }} />
        </span>
        <span className="text-[11px] font-bold tracking-wider">Scan</span>
      </a>

      {/* Hidden file input for non-secure context fallback */}
      {!hasGetUserMedia && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
      )}
    </>
  );
}
