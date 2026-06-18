import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'clearnight:favorites';

interface FavoritesCtx {
  favorites: Set<string>;
  toggleFavorite: (key: string) => void;
  addFavorite: (key: string) => void;
  isFavorite: (key: string) => boolean;
}

const FavoritesContext = createContext<FavoritesCtx>({
  favorites: new Set(),
  toggleFavorite: () => {},
  addFavorite: () => {},
  isFavorite: () => false,
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setFavorites(new Set(JSON.parse(saved)));
      } catch {
        // Corrupt/unavailable storage — start fresh.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(favorites))).catch(() => {});
  }, [favorites, hydrated]);

  const toggleFavorite = (key: string) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const addFavorite = (key: string) =>
    setFavorites((prev) => new Set(prev).add(key));

  const isFavorite = (key: string) => favorites.has(key);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, addFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);

// Plan/favorite keys look like "${locIndex}-${type}-${objIndex ?? 'prime'}".
// Returns the favorited object indices for a given location, in ascending order.
export function favoritedObjectIndices(favorites: Set<string>, locIndex: number): number[] {
  const indices: number[] = [];
  for (const key of favorites) {
    const [locStr, type, objStr] = key.split('-');
    if (Number(locStr) !== locIndex || type !== 'object') continue;
    const idx = Number(objStr);
    if (!Number.isNaN(idx)) indices.push(idx);
  }
  return indices.sort((a, b) => a - b);
}
