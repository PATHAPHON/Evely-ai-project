"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "tarnly:display-name";
const DEFAULT_NAME = "Learner";

export interface UseUserProfileReturn {
  displayName: string;
  setDisplayName: (name: string) => void;
  avatarInitial: string;
}

export function useUserProfile(): UseUserProfileReturn {
  const [displayName, setDisplayNameState] = useState<string>(DEFAULT_NAME);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setDisplayNameState(stored);
    }
  }, []);

  const setDisplayName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      setDisplayNameState(DEFAULT_NAME);
    } else {
      localStorage.setItem(STORAGE_KEY, trimmed);
      setDisplayNameState(trimmed);
    }
  }, []);

  const avatarInitial = displayName.length > 0 ? displayName[0] : "L";

  return { displayName, setDisplayName, avatarInitial };
}
