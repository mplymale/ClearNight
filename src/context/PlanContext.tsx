import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PLAN = 'clearnight:plan';
const STORAGE_KEY_CAPTURED = 'clearnight:planCaptured';

interface PlanCtx {
  plan: Set<string>;
  addToPlan: (key: string) => void;
  removeFromPlan: (key: string) => void;
  inPlan: (key: string) => boolean;
  captured: Set<string>;
  toggleCaptured: (key: string) => void;
  isCaptured: (key: string) => boolean;
}

const PlanContext = createContext<PlanCtx>({
  plan: new Set(),
  addToPlan: () => {},
  removeFromPlan: () => {},
  inPlan: () => false,
  captured: new Set(),
  toggleCaptured: () => {},
  isCaptured: () => false,
});

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<Set<string>>(new Set());
  const [captured, setCaptured] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [savedPlan, savedCaptured] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_PLAN),
          AsyncStorage.getItem(STORAGE_KEY_CAPTURED),
        ]);
        if (savedPlan) setPlan(new Set(JSON.parse(savedPlan)));
        if (savedCaptured) setCaptured(new Set(JSON.parse(savedCaptured)));
      } catch {
        // Corrupt/unavailable storage — start fresh.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(Array.from(plan))).catch(() => {});
  }, [plan, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY_CAPTURED, JSON.stringify(Array.from(captured))).catch(() => {});
  }, [captured, hydrated]);

  const addToPlan = (key: string) =>
    setPlan((prev) => new Set([...prev, key]));

  const removeFromPlan = (key: string) => {
    setPlan((prev) => { const n = new Set(prev); n.delete(key); return n; });
    setCaptured((prev) => { const n = new Set(prev); n.delete(key); return n; });
  };

  const inPlan = (key: string) => plan.has(key);

  const toggleCaptured = (key: string) =>
    setCaptured((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const isCaptured = (key: string) => captured.has(key);

  return (
    <PlanContext.Provider value={{ plan, addToPlan, removeFromPlan, inPlan, captured, toggleCaptured, isCaptured }}>
      {children}
    </PlanContext.Provider>
  );
}

export const usePlan = () => useContext(PlanContext);
