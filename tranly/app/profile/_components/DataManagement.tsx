"use client";

import { useState } from "react";
import { useDataReset } from "@/app/profile/_lib/useDataReset";

export default function DataManagement() {
  const { resetAllData, isResetting } = useDataReset();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = async () => {
    await resetAllData();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isResetting}
        className="w-full rounded-xl border-3 border-border-color bg-red-500 px-4 py-3 text-white font-bold shadow-nb-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isResetting ? "Resetting..." : "Reset All Data"}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl border-3 border-border-color bg-card-bg p-6 shadow-nb-lg">
            <p className="text-lg font-bold text-text-primary mb-2">
              Are you sure?
            </p>
            <p className="text-sm text-text-secondary mb-6">
              This will delete all your data.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isResetting}
                className="flex-1 rounded-xl border-3 border-border-color bg-card-bg px-4 py-2.5 font-bold text-text-primary shadow-nb-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_var(--shadow-color)] transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isResetting}
                className="flex-1 rounded-xl border-3 border-border-color bg-red-500 px-4 py-2.5 font-bold text-white shadow-nb-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_var(--shadow-color)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResetting ? "Deleting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
