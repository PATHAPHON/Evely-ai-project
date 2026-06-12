"use client";

import { ScanOutlined } from "@ant-design/icons";
import { useScanAction } from "../_lib/useScanAction";

/**
 * Floating action button for camera capture.
 *
 * - If getUserMedia is available (secure context): navigates to /scan for live camera view
 * - If not (e.g., HTTP over LAN): uses native file input with capture="environment"
 *   to open the device camera directly, then goes to /scan/preview
 *
 * Requirements: 1.1, 5.2
 */
export default function ScanButton({
  disabled = false,
  variant = "tab",
}: {
  disabled?: boolean;
  variant?: "tab" | "fab";
}) {
  const { hasGetUserMedia, fileInputRef, startScan, handleFileChange } =
    useScanAction(disabled);

  return (
    <>
      {variant === "fab" ? (
        <button
          type="button"
          onClick={startScan}
          disabled={disabled}
          aria-label="Scan"
          className={`w-14 h-14 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all active:scale-95 ${
            disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <ScanOutlined style={{ fontSize: 24 }} />
        </button>
      ) : (
        <a
          onClick={startScan}
          aria-disabled={disabled}
          className={`flex flex-col items-center gap-1 transition-colors text-gray-700 dark:text-gray-200 ${
            disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all">
            <ScanOutlined style={{ fontSize: 20 }} />
          </span>
          <span className="text-[11px] font-bold tracking-wider">Scan</span>
        </a>
      )}

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
