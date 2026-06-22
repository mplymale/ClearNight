import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Location } from '../data/mockForecast';
import { buildRealForecast } from '../services/forecastEngine';
import { supabase } from '../lib/supabase';

const STORAGE_KEY_LOCATIONS = 'clearnight:locations';
const STORAGE_KEY_ACTIVE_INDEX = 'clearnight:activeLocIndex';

interface LocationsContextValue {
  locations: Location[];
  activeLocIndex: number;
  setActiveLocIndex: (i: number) => void;
  addLocation: (loc: Location) => void;
  removeLocation: (index: number) => void;
  hydrated: boolean;
  refreshingNames: Set<string>;
  fetchErrorNames: Set<string>;
  clearFetchError: (name: string) => void;
}

const LocationsContext = createContext<LocationsContextValue>({
  locations: [],
  activeLocIndex: 0,
  setActiveLocIndex: () => {},
  addLocation: () => {},
  removeLocation: () => {},
  hydrated: false,
  refreshingNames: new Set(),
  fetchErrorNames: new Set(),
  clearFetchError: () => {},
});

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function syncLocationsToSupabase(locations: Location[]) {
  const userId = await getUserId();
  if (!userId) return;
  // Upsert all locations
  const rows = locations.map((loc, i) => ({
    user_id: userId,
    name: loc.name,
    latitude: loc.latitude,
    longitude: loc.longitude,
    bortle: loc.bortle,
    sort_order: i,
  }));
  if (rows.length > 0) {
    await supabase.from('locations').upsert(rows, { onConflict: 'user_id,name' });
  }
}

async function removeLocationFromSupabase(name: string) {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('locations').delete().eq('user_id', userId).eq('name', name);
}

async function loadLocationsFromSupabase(): Promise<{ name: string; latitude: number; longitude: number; bortle: number; sort_order: number }[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from('locations')
    .select('name, latitude, longitude, bortle, sort_order')
    .eq('user_id', userId)
    .order('sort_order');
  return data ?? [];
}

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeLocIndex, setActiveLocIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [refreshingNames, setRefreshingNames] = useState<Set<string>>(new Set());
  const [fetchErrorNames, setFetchErrorNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        // Load from AsyncStorage first for instant display
        const [savedLocations, savedIndex] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_LOCATIONS),
          AsyncStorage.getItem(STORAGE_KEY_ACTIVE_INDEX),
        ]);
        let parsed: Location[] = [];
        if (savedLocations) {
          parsed = JSON.parse(savedLocations);
          parsed.forEach(loc => loc.days.forEach(d => { d.humidity ??= 65; d.precipProb ??= 0; d.windKmh ??= 0; }));
          setLocations(parsed);
          if (savedIndex) {
            const idx = Number(savedIndex);
            setActiveLocIndex(Math.max(0, Math.min(idx, parsed.length - 1)));
          }
        }

        // Then try to pull from Supabase — merge in any locations not in local cache
        const remote = await loadLocationsFromSupabase();
        if (remote.length > 0) {
          const localNames = new Set(parsed.map(l => l.name));
          const newFromRemote = remote
            .filter(r => !localNames.has(r.name))
            .map(r => ({
              name: r.name,
              region: '',
              latitude: r.latitude,
              longitude: r.longitude,
              bortle: r.bortle,
              days: [],
              dusk: '',
              dawn: '',
              prime: null as any,
              objects: [],
            } as unknown as Location));
          if (newFromRemote.length > 0) {
            setLocations(prev => [...prev, ...newFromRemote]);
          }
        }
      } catch {
        // Start fresh on error
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(locations)).catch(() => {});
    syncLocationsToSupabase(locations).catch(() => {});
  }, [locations, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY_ACTIVE_INDEX, String(activeLocIndex)).catch(() => {});
  }, [activeLocIndex, hydrated]);

  const refreshFromApis = useCallback((loc: Location) => {
    setRefreshingNames(prev => new Set([...prev, loc.name]));
    buildRealForecast(loc.latitude, loc.longitude, loc.bortle)
      .then(({ days, dusk, dawn, prime, objects }) => {
        setLocations(prev =>
          prev.map(l => (l.name === loc.name ? { ...l, days, dusk, dawn, prime, objects } : l))
        );
      })
      .catch(() => {
        setFetchErrorNames(prev => new Set([...prev, loc.name]));
      })
      .finally(() => {
        setRefreshingNames(prev => { const n = new Set(prev); n.delete(loc.name); return n; });
      });
  }, []);

  const refreshedOnHydrate = useRef(false);
  useEffect(() => {
    if (!hydrated || refreshedOnHydrate.current) return;
    refreshedOnHydrate.current = true;
    locations.forEach(refreshFromApis);
  }, [hydrated, locations, refreshFromApis]);

  const addLocation = useCallback((loc: Location) => {
    setLocations(prev => {
      const existingIndex = prev.findIndex(l => l.name === loc.name);
      if (existingIndex !== -1) {
        setActiveLocIndex(existingIndex);
        return prev;
      }
      const next = [...prev, loc];
      setActiveLocIndex(next.length - 1);
      return next;
    });
    refreshFromApis(loc);
  }, [refreshFromApis]);

  const removeLocation = useCallback((index: number) => {
    setLocations(prev => {
      const removed = prev[index];
      if (removed) removeLocationFromSupabase(removed.name).catch(() => {});
      const next = prev.filter((_, i) => i !== index);
      setActiveLocIndex(i => Math.min(i, Math.max(0, next.length - 1)));
      return next;
    });
  }, []);

  const clearFetchError = useCallback((name: string) => {
    setFetchErrorNames(prev => { const n = new Set(prev); n.delete(name); return n; });
  }, []);

  return (
    <LocationsContext.Provider value={{ locations, activeLocIndex, setActiveLocIndex, addLocation, removeLocation, hydrated, refreshingNames, fetchErrorNames, clearFetchError }}>
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations() {
  return useContext(LocationsContext);
}
