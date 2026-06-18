import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Location } from '../data/mockForecast';
import { buildRealForecast } from '../services/forecastEngine';

const STORAGE_KEY_LOCATIONS = 'clearnight:locations';
const STORAGE_KEY_ACTIVE_INDEX = 'clearnight:activeLocIndex';

interface LocationsContextValue {
  locations: Location[];
  activeLocIndex: number;
  setActiveLocIndex: (i: number) => void;
  addLocation: (loc: Location) => void;
  removeLocation: (index: number) => void;
  hydrated: boolean;
}

const LocationsContext = createContext<LocationsContextValue>({
  locations: [],
  activeLocIndex: 0,
  setActiveLocIndex: () => {},
  addLocation: () => {},
  removeLocation: () => {},
  hydrated: false,
});

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  // Starts empty — onboarding is what adds the user's first real spot.
  // Built-in mock demo data is never auto-loaded for real users.
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeLocIndex, setActiveLocIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Load whatever was saved from a previous session before anything else runs.
  useEffect(() => {
    (async () => {
      try {
        const [savedLocations, savedIndex] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_LOCATIONS),
          AsyncStorage.getItem(STORAGE_KEY_ACTIVE_INDEX),
        ]);
        if (savedLocations) {
          const parsed: Location[] = JSON.parse(savedLocations);
          setLocations(parsed);
          if (savedIndex) {
            const idx = Number(savedIndex);
            setActiveLocIndex(Math.max(0, Math.min(idx, parsed.length - 1)));
          }
        }
      } catch {
        // Corrupt/unavailable storage — start fresh rather than crash.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Persist on every change, but only after the initial load completes —
  // otherwise we'd briefly overwrite saved data with the empty initial state.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(locations)).catch(() => {});
  }, [locations, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY_ACTIVE_INDEX, String(activeLocIndex)).catch(() => {});
  }, [activeLocIndex, hydrated]);

  // Replaces a location's synthetic placeholder days AND its hardcoded
  // "Andromeda + Orion" placeholder objects with real cloud/seeing/moon
  // forecasts and real positional-astronomy sky targets, matched by name
  // once the fetch/computation resolves.
  const refreshFromApis = useCallback((loc: Location) => {
    buildRealForecast(loc.latitude, loc.longitude, loc.bortle)
      .then(({ days, dusk, dawn, prime, objects }) => {
        setLocations(prev =>
          prev.map(l => (l.name === loc.name ? { ...l, days, dusk, dawn, prime, objects } : l))
        );
      })
      .catch(() => {
        // Network/API failure — keep the synthetic mock data as a fallback.
      });
  }, []);

  // Refresh real data for every restored location once on hydration too,
  // so reopening the app doesn't show stale numbers indefinitely.
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
      const next = prev.filter((_, i) => i !== index);
      setActiveLocIndex(i => Math.min(i, Math.max(0, next.length - 1)));
      return next;
    });
  }, []);

  return (
    <LocationsContext.Provider value={{ locations, activeLocIndex, setActiveLocIndex, addLocation, removeLocation, hydrated }}>
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations() {
  return useContext(LocationsContext);
}
