"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  role: string;
  bio: string;
  location: string;
}

export interface UseUserProfileReturn extends ProfileFields {
  avatarInitial: string;
  setDisplayName: (name: string) => void;
  updateProfile: (partial: Partial<ProfileFields>) => void;
  claimedChests: number[];
  claimChest: (unitId: number) => Promise<void>;
}

export function useUserProfile(): UseUserProfileReturn {
  const [displayName, setDisplayNameState] = useState<string>(DEFAULT_NAME);
  const [handle, setHandle] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  
  const [claimedChests, setClaimedChests] = useState<number[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const claimedChestsRef = useRef<number[]>([]);

  // Sync refs with state
  useEffect(() => {
    claimedChestsRef.current = claimedChests;
  }, [claimedChests]);

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
            gems: 176,
            energy: 15,
            streak: 0,
            max_streak: 0,
            target_language: "english",
            ui_language: "th",
            claimed_chests: [],
          };
          await supabase.from("profiles").insert(defaultProfile);
          return;
        }
        throw error;
      }

      if (data) {
        setDisplayNameState(data.display_name || DEFAULT_NAME);
        setHandle(data.handle || "");
        setRole(data.role || "");
        setBio(data.bio || "");
        setLocation(data.location || "");

        const dbChests = data.claimed_chests || [];
        setClaimedChests(dbChests);
        claimedChestsRef.current = dbChests;

        // Sync back to local storage
        setStoredItem('display-name', data.display_name || DEFAULT_NAME);
        setStoredItem('profile:handle', data.handle || "");
        setStoredItem('profile:role', data.role || "");
        setStoredItem('profile:bio', data.bio || "");
        setStoredItem('profile:location', data.location || "");

        // Sync claimed chests to local storage keys
        dbChests.forEach((unitId: number) => {
          setStoredItem(`chest-claimed:unit-${unitId}`, "true");
        });
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
    setRole(getStoredItem('profile:role') || "");
    setBio(getStoredItem('profile:bio') || "");
    setLocation(getStoredItem('profile:location') || "");

    // Load local chests
    const localChests: number[] = [];
    for (let i = 1; i <= 10; i++) {
      if (getStoredItem(`chest-claimed:unit-${i}`) === "true") {
        localChests.push(i);
      }
    }
    setClaimedChests(localChests);
    claimedChestsRef.current = localChests;

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
        setRole("");
        setBio("");
        setLocation("");
        setClaimedChests([]);
        claimedChestsRef.current = [];
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
      persist('profile:role', partial.role, setRole);
      persist('profile:bio', partial.bio, setBio);
      persist('profile:location', partial.location, setLocation);

      // 2. Sync to Supabase profile
      if (userId) {
        const updates: Record<string, string | null> = {};
        if (partial.displayName !== undefined) {
          updates.display_name = partial.displayName.trim() || DEFAULT_NAME;
        }
        if (partial.handle !== undefined) {
          updates.handle = partial.handle.trim() || null;
        }
        if (partial.role !== undefined) {
          updates.role = partial.role.trim() || null;
        }
        if (partial.bio !== undefined) {
          updates.bio = partial.bio.trim() || null;
        }
        if (partial.location !== undefined) {
          updates.location = partial.location.trim() || null;
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

  const claimChest = useCallback(async (unitId: number) => {
    if (claimedChestsRef.current.includes(unitId)) return;
    const next = [...claimedChestsRef.current, unitId];
    claimedChestsRef.current = next;
    setClaimedChests(next);
    setStoredItem(`chest-claimed:unit-${unitId}`, "true");

    if (userId) {
      supabase
        .from("profiles")
        .update({ claimed_chests: next })
        .eq("id", userId)
        .then(
          ({ error }) => {
            if (error) console.error("Failed to sync claimed chest to database:", error);
          },
          (err) => {
            console.error("Failed to sync claimed chest to database:", err);
          }
        );
    }
  }, [userId]);

  const avatarInitial = displayName.length > 0 ? displayName[0] : "L";

  return {
    displayName,
    handle,
    role,
    bio,
    location,
    avatarInitial,
    setDisplayName,
    updateProfile,
    claimedChests,
    claimChest,
  };
}
