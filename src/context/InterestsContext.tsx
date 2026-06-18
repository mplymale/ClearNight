import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'clearnight:interests';

export interface Interests {
  milky: boolean;
  deep: boolean;
  planets: boolean;
  meteors: boolean;
}

const DEFAULT_INTERESTS: Interests = { milky: false, deep: false, planets: false, meteors: false };

interface InterestsCtx {
  interests: Interests;
  setInterests: (next: Interests) => void;
}

const InterestsContext = createContext<InterestsCtx>({
  interests: DEFAULT_INTERESTS,
  setInterests: () => {},
});

export function InterestsProvider({ children }: { children: React.ReactNode }) {
  const [interests, setInterestsState] = useState<Interests>(DEFAULT_INTERESTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setInterestsState(JSON.parse(saved));
      } catch {
        // Corrupt/unavailable storage — start fresh.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(interests)).catch(() => {});
  }, [interests, hydrated]);

  const setInterests = (next: Interests) => setInterestsState(next);

  return (
    <InterestsContext.Provider value={{ interests, setInterests }}>
      {children}
    </InterestsContext.Provider>
  );
}

export const useInterests = () => useContext(InterestsContext);
