import React, { createContext, useContext, useState } from 'react';

interface PlanCtx {
  plan: Set<string>;
  addToPlan: (key: string) => void;
  removeFromPlan: (key: string) => void;
  inPlan: (key: string) => boolean;
}

const PlanContext = createContext<PlanCtx>({
  plan: new Set(),
  addToPlan: () => {},
  removeFromPlan: () => {},
  inPlan: () => false,
});

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<Set<string>>(new Set());

  const addToPlan = (key: string) =>
    setPlan((prev) => new Set([...prev, key]));

  const removeFromPlan = (key: string) =>
    setPlan((prev) => { const n = new Set(prev); n.delete(key); return n; });

  const inPlan = (key: string) => plan.has(key);

  return (
    <PlanContext.Provider value={{ plan, addToPlan, removeFromPlan, inPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export const usePlan = () => useContext(PlanContext);
