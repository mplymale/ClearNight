import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'starcast:subscriptionStatus';

// 'trial' and 'subscribed' both unlock premium features — the distinction
// is just whether the trial banner/CTA should still show. 'free' is the
// locked-down tier shown when neither applies.
export type SubscriptionStatus = 'free' | 'trial' | 'subscribed';

interface SubscriptionCtx {
  status: SubscriptionStatus;
  setStatus: (next: SubscriptionStatus) => void;
}

const SubscriptionContext = createContext<SubscriptionCtx>({
  status: 'trial',
  setStatus: () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  // Defaults to 'trial' so a fresh install behaves like today's "premium
  // trial" demo experience until the user actually subscribes or the trial
  // is explicitly ended.
  const [status, setStatusState] = useState<SubscriptionStatus>('free');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'free' || saved === 'trial' || saved === 'subscribed') {
          setStatusState(saved);
        }
      } catch {
        // Corrupt/unavailable storage — start fresh.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, status).catch(() => {});
  }, [status, hydrated]);

  const setStatus = (next: SubscriptionStatus) => setStatusState(next);

  return (
    <SubscriptionContext.Provider value={{ status, setStatus }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
