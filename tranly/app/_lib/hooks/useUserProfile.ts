"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/app/_lib/supabase/supabaseClient";

const KEY_PREFIX = 'tranly:';
const LEGACY_PREFIX = 'tarnly:';

const DEFAULT_NAME = "Learner";

function getStoredItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const primary = localStorage.getItem(KEY_PREFIX + key);
  if (primary !== null) return primary;
  const legacy = localStorage.getItem(LEGACY_PREFIX + key);
  if (legacy !== null) {
    // Migrate legacy key
    localStorage.setItem(KEY_PREFIX + key, legacy);
    localStorage.removeItem(LEGACY_PREFIX + key);
    return legacy;
  }
  return null;
}

function setStoredItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_PREFIX + key, value);
  localStorage.removeItem(LEGACY_PREFIX + key);
}

function removeStoredItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY_PREFIX + key);
  localStorage.removeItem(LEGACY_PREFIX + key);
}

export interface ProfileFields {
  displayName: string;
  handle: string;
}

export interface UseUserProfileReturn extends ProfileFields {
  avatarInitial: string;
  setDisplayName: (name: string) => void;
  updateProfile: (partial: Partial<ProfileFields>) => void;
  isPremium: boolean;
  subscriptionStatus: 'free' | 'active';
  periodEnd: string | null;
  energySpent: number;
}

export function useUserProfile(): UseUserProfileReturn {
  const [displayName, setDisplayNameState] = useState<string>(DEFAULT_NAME);
  const [handle, setHandle] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<'free' | 'active'>('free');
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [energySpent, setEnergySpent] = useState<number>(0);

  const [userId, setUserId] = useState<string | null>(null);

  const loadProfileFromDB = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();

      if (error) {
        // Handle no profile found (PGRST116) by creating default
        if (error.code === "PGRST116") {
          const defaultProfile = {
            id: uid,
            display_name: DEFAULT_NAME,
            energy: 0,
            target_language: "english",
            ui_language: "th",
          };
          await supabase.from("profiles").insert(defaultProfile);
          return;
        }
        throw error;
      }

      if (data) {
        setDisplayNameState(data.display_name || DEFAULT_NAME);
        setHandle(data.handle || "");
        setSubscriptionStatus(data.subscription_status === 'active' ? 'active' : 'free');
        setPeriodEnd(data.subscription_current_period_end ?? null);
        setEnergySpent(data.energy ?? 0);

        // Sync back to local storage
        setStoredItem('display-name', data.display_name || DEFAULT_NAME);
        setStoredItem('profile:handle', data.handle || "");
      }
    } catch (err) {
      console.error("Failed to load profile from database:", err);
    }
  }, []);

  useEffect(() => {
    // 1. Sync from local storage first for speed (after mount, avoids SSR mismatch)
    const storedName = getStoredItem('display-name');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (storedName) setDisplayNameState(storedName);
    setHandle(getStoredItem('profile:handle') || "");

    // 2. Fetch and sync from Supabase profiles table
    let active = true;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (active && uid) {
        setUserId(uid);
        await loadProfileFromDB(uid);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id;
      if (active) {
        setUserId(uid || null);
      }
      if (uid) {
        loadProfileFromDB(uid);
      } else if (active) {
        setDisplayNameState(DEFAULT_NAME);
        setHandle("");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfileFromDB]);

  const setDisplayName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      removeStoredItem('display-name');
      setDisplayNameState(DEFAULT_NAME);
    } else {
      setStoredItem('display-name', trimmed);
      setDisplayNameState(trimmed);
    }
  }, []);

  const updateProfile = useCallback(
    (partial: Partial<ProfileFields>) => {
      // 1. Save to state and local storage
      if (partial.displayName !== undefined) {
        setDisplayName(partial.displayName);
      }
      const persist = (
        subKey: string,
        value: string | undefined,
        setter: (v: string) => void
      ) => {
        if (value === undefined) return;
        const trimmed = value.trim();
        if (trimmed.length === 0) removeStoredItem(subKey);
        else setStoredItem(subKey, trimmed);
        setter(trimmed);
      };
      persist('profile:handle', partial.handle, setHandle);

      // 2. Sync to Supabase profile
      if (userId) {
        const updates: Record<string, string | null> = {};
        if (partial.displayName !== undefined) {
          updates.display_name = partial.displayName.trim() || DEFAULT_NAME;
        }
        if (partial.handle !== undefined) {
          updates.handle = partial.handle.trim() || null;
        }

        supabase
          .from("profiles")
          .update(updates)
          .eq("id", userId)
          .then(
            ({ error }) => {
              if (error) console.error("Failed to update profile in database:", error);
            },
            (err) => {
              console.error("Failed to update profile in database:", err);
            }
          );
      }
    },
    [userId, setDisplayName]
  );

  const avatarInitial = displayName.length > 0 ? displayName[0] : "L";

  return {
    displayName,
    handle,
    avatarInitial,
    setDisplayName,
    updateProfile,
    isPremium: subscriptionStatus === 'active',
    subscriptionStatus,
    periodEnd,
    energySpent,
  };
}
