// Mirrors the existing notificationRouting.ts pattern: whenever the app
// becomes active, checks whether the WeeklyConditionsIntent left a "the
// user asked Siri about this spot" marker in shared storage, and if so
// jumps straight to that saved location instead of leaving the user
// wherever the app last was.

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, NativeModules } from 'react-native';
import { router } from 'expo-router';
import { useLocations } from '../context/LocationsContext';

const { ClearNightSiriBridge } = NativeModules as {
  ClearNightSiriBridge?: {
    readPendingNavigation: () => Promise<string | null>;
    clearPendingNavigation: () => Promise<void>;
  };
};

interface PendingSiriNavigation {
  locationName: string;
}

async function consumePendingNavigation(): Promise<PendingSiriNavigation | null> {
  if (!ClearNightSiriBridge?.readPendingNavigation) return null;
  try {
    const json = await ClearNightSiriBridge.readPendingNavigation();
    if (!json) return null;
    await ClearNightSiriBridge.clearPendingNavigation?.();
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function useSiriRouting(): void {
  const { locations, setActiveLocIndex } = useLocations();
  const locationsRef = useRef(locations);
  locationsRef.current = locations;

  useEffect(() => {
    const routeIfPending = async () => {
      const pending = await consumePendingNavigation();
      if (!pending) return;
      const idx = locationsRef.current.findIndex((l) => l.name === pending.locationName);
      if (idx >= 0) setActiveLocIndex(idx);
      router.replace('/(tabs)');
    };

    routeIfPending();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') routeIfPending();
    });
    return () => sub.remove();
  }, [setActiveLocIndex]);
}
