"use client";

import { useState, useEffect, useCallback } from "react";

const NAME_KEY = "tarnly:display-name";
const HANDLE_KEY = "tarnly:profile:handle";
const ROLE_KEY = "tarnly:profile:role";
const BIO_KEY = "tarnly:profile:bio";
const LOCATION_KEY = "tarnly:profile:location";

const DEFAULT_NAME = "Learner";

/** Editable profile fields persisted to localStorage. */
export interface ProfileFields {
  /** Display name (also drives the avatar initial). */
  displayName: string;
  /** Username without the leading "@". */
  handle: string;
  /** Short status / "currently learning" line. */
  role: string;
  /** Free-form bio. */
  bio: string;
  /** Location text. */
  location: string;
}

export interface UseUserProfileReturn extends ProfileFields {
  /** Avatar initial derived from the display name. */
  avatarInitial: string;
  /** Update the display name (empty resets to the default). */
  setDisplayName: (name: string) => void;
  /** Patch one or more profile fields and persist them. */
  updateProfile: (partial: Partial<ProfileFields>) => void;
}

function readStored(key: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(key) ?? "";
}

export function useUserProfile(): UseUserProfileReturn {
  const [displayName, setDisplayNameState] = useState<string>(DEFAULT_NAME);
  const [handle, setHandle] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    const storedName = localStorage.getItem(NAME_KEY);
    if (storedName) setDisplayNameState(storedName);
    setHandle(readStored(HANDLE_KEY));
    setRole(readStored(ROLE_KEY));
    setBio(readStored(BIO_KEY));
    setLocation(readStored(LOCATION_KEY));
  }, []);

  const setDisplayName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      localStorage.removeItem(NAME_KEY);
      setDisplayNameState(DEFAULT_NAME);
    } else {
      localStorage.setItem(NAME_KEY, trimmed);
      setDisplayNameState(trimmed);
    }
  }, []);

  const updateProfile = useCallback(
    (partial: Partial<ProfileFields>) => {
      if (partial.displayName !== undefined) {
        setDisplayName(partial.displayName);
      }
      const persist = (
        key: string,
        value: string | undefined,
        setter: (v: string) => void
      ) => {
        if (value === undefined) return;
        const trimmed = value.trim();
        if (trimmed.length === 0) localStorage.removeItem(key);
        else localStorage.setItem(key, trimmed);
        setter(trimmed);
      };
      persist(HANDLE_KEY, partial.handle, setHandle);
      persist(ROLE_KEY, partial.role, setRole);
      persist(BIO_KEY, partial.bio, setBio);
      persist(LOCATION_KEY, partial.location, setLocation);
    },
    [setDisplayName]
  );

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
  };
}
