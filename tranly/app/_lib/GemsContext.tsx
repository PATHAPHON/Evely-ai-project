'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';

const KEY_PREFIX = 'tranly:';
const LEGACY_PREFIX = 'tarnly:';

const GEMS_SUBKEY = 'gems';
const ENERGY_SUBKEY = 'energy';

const DEFAULT_GEMS = 176;
const DEFAULT_ENERGY = 15;

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

interface GemsContextType {
  gems: number;
  energy: number;
  earnGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;
  hasEnoughGems: (amount: number) => boolean;
  recoverEnergy: (amount: number) => void;
  useEnergy: (amount: number) => boolean;
}

const GemsContext = createContext<GemsContextType | undefined>(undefined);

export function GemsProvider({ children }: { children: React.ReactNode }) {
  const [gems, setGemsState] = useState<number>(DEFAULT_GEMS);
  const [energy, setEnergyState] = useState<number>(DEFAULT_ENERGY);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const gemsRef = useRef<number>(DEFAULT_GEMS);
  const energyRef = useRef<number>(DEFAULT_ENERGY);

  // Keep refs in sync with state
  useEffect(() => {
    gemsRef.current = gems;
  }, [gems]);

  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);

  const loadGemsFromDB = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('gems, energy')
        .eq('id', uid)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        const dbGems = data.gems ?? DEFAULT_GEMS;
        const dbEnergy = data.energy ?? DEFAULT_ENERGY;
        setGemsState(dbGems);
        setEnergyState(dbEnergy);
        gemsRef.current = dbGems;
        energyRef.current = dbEnergy;
        setStoredItem(GEMS_SUBKEY, String(dbGems));
        setStoredItem(ENERGY_SUBKEY, String(dbEnergy));
      }
    } catch (err) {
      console.error('Failed to load gems/energy from database:', err);
    }
  }, []);

  // Initialize and subscribe to Auth changes
  useEffect(() => {
    let active = true;

    // Load from local storage for instant render
    const storedGems = getStoredItem(GEMS_SUBKEY);
    const storedEnergy = getStoredItem(ENERGY_SUBKEY);
    if (storedGems !== null) {
      const g = Number(storedGems);
      setGemsState(g);
      gemsRef.current = g;
    }
    if (storedEnergy !== null) {
      const e = Number(storedEnergy);
      setEnergyState(e);
      energyRef.current = e;
    }

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (active && uid) {
        setUserId(uid);
        await loadGemsFromDB(uid);
      }
      if (active) setIsLoaded(true);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id;
      if (active) {
        setUserId(uid || null);
      }
      if (uid) {
        loadGemsFromDB(uid);
      } else if (active) {
        setGemsState(DEFAULT_GEMS);
        setEnergyState(DEFAULT_ENERGY);
        gemsRef.current = DEFAULT_GEMS;
        energyRef.current = DEFAULT_ENERGY;
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadGemsFromDB]);

  const earnGems = useCallback((amount: number) => {
    const next = gemsRef.current + amount;
    gemsRef.current = next;
    setGemsState(next);
    setStoredItem(GEMS_SUBKEY, String(next));

    if (userId) {
      supabase
        .from('profiles')
        .update({ gems: next })
        .eq('id', userId)
        .then(
          ({ error }) => {
            if (error) console.error('Failed to update gems in DB:', error);
          },
          (err) => {
            console.error('Failed to update gems in DB:', err);
          }
        );
    }
  }, [userId]);

  const spendGems = useCallback((amount: number): boolean => {
    if (gemsRef.current >= amount) {
      const next = gemsRef.current - amount;
      gemsRef.current = next;
      setGemsState(next);
      setStoredItem(GEMS_SUBKEY, String(next));

      if (userId) {
        supabase
          .from('profiles')
          .update({ gems: next })
          .eq('id', userId)
          .then(
            ({ error }) => {
              if (error) console.error('Failed to update gems in DB:', error);
            },
            (err) => {
              console.error('Failed to update gems in DB:', err);
            }
          );
      }
      return true;
    }
    return false;
  }, [userId]);

  const hasEnoughGems = useCallback((amount: number): boolean => {
    return gemsRef.current >= amount;
  }, []);

  const recoverEnergy = useCallback((amount: number) => {
    const next = energyRef.current + amount;
    energyRef.current = next;
    setEnergyState(next);
    setStoredItem(ENERGY_SUBKEY, String(next));

    if (userId) {
      supabase
        .from('profiles')
        .update({ energy: next })
        .eq('id', userId)
        .then(
          ({ error }) => {
            if (error) console.error('Failed to update energy in DB:', error);
          },
          (err) => {
            console.error('Failed to update energy in DB:', err);
          }
        );
    }
  }, [userId]);

  const useEnergy = useCallback((amount: number): boolean => {
    if (energyRef.current >= amount) {
      const next = energyRef.current - amount;
      energyRef.current = next;
      setEnergyState(next);
      setStoredItem(ENERGY_SUBKEY, String(next));

      if (userId) {
        supabase
          .from('profiles')
          .update({ energy: next })
          .eq('id', userId)
          .then(
            ({ error }) => {
              if (error) console.error('Failed to update energy in DB:', error);
            },
            (err) => {
              console.error('Failed to update energy in DB:', err);
            }
          );
      }
      return true;
    }
    return false;
  }, [userId]);

  return (
    <GemsContext.Provider
      value={{
        gems,
        energy,
        earnGems,
        spendGems,
        hasEnoughGems,
        recoverEnergy,
        useEnergy,
      }}
    >
      {children}
    </GemsContext.Provider>
  );
}

export function useGems() {
  const context = useContext(GemsContext);
  if (!context) {
    throw new Error('useGems must be used within a GemsProvider');
  }
  return context;
}
