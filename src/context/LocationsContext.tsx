import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { FORECAST, Location } from '../data/mockForecast';
import { buildRealForecast } from '../services/forecastEngine';

interface LocationsContextValue {
  locations: Location[];
  activeLocIndex: number;
  setActiveLocIndex: (i: number) => void;
  addLocation: (loc: Location) => void;
  removeLocation: (index: number) => void;
}

const LocationsContext = createContext<LocationsContextValue>({
  locations: FORECAST,
  activeLocIndex: 0,
  setActiveLocIndex: () => {},
  addLocation: () => {},
  removeLocation: () => {},
});

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<Location[]>(FORECAST);
  const [activeLocIndex, setActiveLocIndex] = useState(0);

  // Replaces a location's synthetic placeholder days with real
  // cloud/seeing/moon-derived data, matched by name once the fetch resolves.
  const refreshFromApis = useCallback((loc: Location) => {
    buildRealForecast(loc.latitude, loc.longitude, loc.bortle)
      .then(({ days, dusk, dawn }) => {
        setLocations(prev =>
          prev.map(l => (l.name === loc.name ? { ...l, days, dusk, dawn } : l))
        );
      })
      .catch(() => {
        // Network/API failure — keep the synthetic mock data as a fallback.
      });
  }, []);

  // Backfill real data for the built-in demo locations on first load too.
  useEffect(() => {
    FORECAST.forEach(refreshFromApis);
  }, [refreshFromApis]);

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
    <LocationsContext.Provider value={{ locations, activeLocIndex, setActiveLocIndex, addLocation, removeLocation }}>
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations() {
  return useContext(LocationsContext);
}
