"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/app/_lib/supabaseClient";

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
          supabase.from("feed_words").delete().eq("user_id", userId),
          supabase.from("conversations").delete().eq("user_id", userId),
          supabase.from("lessons").delete().eq("user_id", userId),
          supabase.from("captures").delete().eq("user_id", userId),
          supabase.from("study_sessions").delete().eq("user_id", userId),
          supabase.from("flashcard_sets").delete().eq("user_id", userId),
        ]);

        // 2. Reset profile settings, gems, and energy
        await supabase
          .from("profiles")
          .update({
            gems: 176,
            energy: 15,
            streak: 0,
            max_streak: 0,
            claimed_chests: [],
            completed_exams: [],
          })
          .eq("id", userId);

        // 3. Clear Supabase Storage files
        const folders = ["words", "feed", "captures"];
        for (const folder of folders) {
          const pathPrefix = `authenticated/${userId}/${folder}`;
          const { data: files } = await supabase.storage
            .from("tarnly-media")
            .list(pathPrefix);

          if (files && files.length > 0) {
            const filePaths = files.map((f) => `${pathPrefix}/${f.name}`);
            await supabase.storage.from("tarnly-media").remove(filePaths);
          }
        }
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
