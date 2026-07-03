"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/shared/supabase/supabaseClient";

export interface UseDataResetReturn {
  resetAllData: () => Promise<void>;
  isResetting: boolean;
}

function clearLocalStorageKeys(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith("tarnly:") || key.startsWith("tranly:"))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export function useDataReset(): UseDataResetReturn {
  const [isResetting, setIsResetting] = useState(false);

  const resetAllData = useCallback(async () => {
    setIsResetting(true);
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;

      if (userId) {
        // 1. Delete all user records from Supabase tables
        await Promise.all([
          supabase.from("words").delete().eq("user_id", userId),
          supabase.from("conversations").delete().eq("user_id", userId),
        ]);

        // 2. Reset profile energy
        await supabase
          .from("profiles")
          .update({
            daily_spend_microbaht: 0,
          })
          .eq("id", userId);
      }

      // 4. Clear localStorage keys
      clearLocalStorageKeys();
    } catch (error) {
      console.error("Failed to reset data:", error);
      throw error;
    } finally {
      setIsResetting(false);
    }
  }, []);

  return { resetAllData, isResetting };
}
