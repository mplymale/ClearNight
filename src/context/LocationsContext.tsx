import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Location } from '../data/mockForecast';
import { buildRealForecast } from '../services/forecastEngine';
import { supabase } from '../lib/supabase';
import { syncSiriCache } from '../services/siriForecastCache';

const STORAGE_KEY_LOCATIONS = 'clearnight:locations';
const STORAGE_KEY_ACTIVE_INDEX = 'clearnight:activeLocIndex';

// If the app has been backgrounded longer than this, refresh forecasts on
// return rather than showing whatever was last fetched (possibly stale by
// hours). Chosen to avoid refetching on a quick app-switch glance.
const STALE_AFTER_MS = 20 * 60 * 1000;

interface LocationsContextValue {
  locations: Location[];
  activeLocIndex: number;
  setActiveLocIndex: (i: number) => void;
  addLocation: (loc: Location) => void;
  removeLocation: (index: number) => void;
  clearAllLocations: () => void;
  refreshAll: () => Promise<void>;
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
  clearAllLocations: () => {},
  refreshAll: async () => {},
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
    // Tonight's already-computed score/window, so the server-side alert
    // check reads the exact same result the app itself displays instead of
    // recalculating with a different (and looser) approximation.
    tonight_score: loc.days[0]?.score ?? null,
    has_window: loc.days[0] ? loc.days[0].window != null : null,
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
    // Keeps the Siri App Intents' shared cache in lockstep with whatever the
    // app itself just displayed — same moment, same data, no separate fetch.
    syncSiriCache(locations);
  }, [locations, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY_ACTIVE_INDEX, String(activeLocIndex)).catch(() => {});
  }, [activeLocIndex, hydrated]);

  const refreshFromApis = useCallback((loc: Location): Promise<void> => {
    setRefreshingNames(prev => new Set([...prev, loc.name]));
    return buildRealForecast(loc.latitude, loc.longitude, loc.bortle)
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

  // Re-fetch every saved location's forecast — used by pull-to-refresh and
  // by the foreground-return check below. Reads current locations via a
  // ref so callers don't need to depend on the array identity.
  const locationsRef = useRef(locations);
  locationsRef.current = locations;
  const refreshAll = useCallback(async () => {
    await Promise.all(locationsRef.current.map(refreshFromApis));
  }, [refreshFromApis]);

  // Refresh on returning to the foreground if the app sat backgrounded long
  // enough that the last-fetched conditions could plausibly be stale.
  const backgroundedAtRef = useRef<number | null>(null);
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'active') {
        const backgroundedAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (backgroundedAt != null && Date.now() - backgroundedAt > STALE_AFTER_MS) {
          refreshAll().catch(() => {});
        }
      } else {
        backgroundedAtRef.current = Date.now();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [refreshAll]);

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

  const clearAllLocations = useCallback(() => {
    setLocations([]);
    setActiveLocIndex(0);
  }, []);

  return (
    <LocationsContext.Provider value={{ locations, activeLocIndex, setActiveLocIndex, addLocation, removeLocation, clearAllLocations, refreshAll, hydrated, refreshingNames, fetchErrorNames, clearFetchError }}>
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations() {
  return useContext(LocationsContext);
}
