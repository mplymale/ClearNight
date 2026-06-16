import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cancelLocalAlert, scheduleLocalAlert } from '../services/alertScheduling';

const STORAGE_KEY = 'starcast:alerts';

interface ScheduledFire {
  notificationId: string;
  fireDateMs: number;
}

export interface AlertPreference {
  threshold: number; // 0-100, "only when night score is at least this"
  nightsMode: 'any' | 'weekends' | 'pick';
  pickedDays?: number[]; // day indices (0=tonight) when nightsMode === 'pick'
  timing: 'evening' | 'dayBefore';
}

interface AlertRecord {
  preference: AlertPreference;
  fires: ScheduledFire[];
}

interface AlertsCtx {
  alerts: Record<string, AlertRecord>;
  // Schedules one local notification per qualifying fire date, replacing
  // any previously scheduled notifications for this key. Returns how many
  // were actually scheduled (fire dates already in the past are skipped).
  setMultiAlert: (
    key: string,
    preference: AlertPreference,
    fires: { title: string; body: string; fireDate: Date; quietStart?: number; quietEnd?: number }[]
  ) => Promise<number>;
  clearAlert: (key: string) => Promise<void>;
  hasAlert: (key: string) => boolean;
  getAlert: (key: string) => AlertRecord | undefined;
}

const AlertsContext = createContext<AlertsCtx>({
  alerts: {},
  setMultiAlert: async () => 0,
  clearAlert: async () => {},
  hasAlert: () => false,
  getAlert: () => undefined,
});

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<Record<string, AlertRecord>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: Record<string, AlertRecord> = JSON.parse(saved);
          // Drop any individual fires whose time already passed; drop the
          // whole record if nothing's left.
          const now = Date.now();
          const fresh: Record<string, AlertRecord> = {};
          for (const [key, rec] of Object.entries(parsed)) {
            const liveFires = rec.fires.filter((f) => f.fireDateMs > now);
            if (liveFires.length > 0) fresh[key] = { ...rec, fires: liveFires };
          }
          setAlerts(fresh);
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(alerts)).catch(() => {});
  }, [alerts, hydrated]);

  const setMultiAlert = async (
    key: string,
    preference: AlertPreference,
    fires: { title: string; body: string; fireDate: Date; quietStart?: number; quietEnd?: number }[]
  ): Promise<number> => {
    // Replace any previously scheduled notifications for this key first.
    const existing = alerts[key];
    if (existing) {
      await Promise.all(existing.fires.map((f) => cancelLocalAlert(f.notificationId)));
    }

    const scheduled: ScheduledFire[] = [];
    for (const f of fires) {
      const notificationId = await scheduleLocalAlert(f);
      if (notificationId) scheduled.push({ notificationId, fireDateMs: f.fireDate.getTime() });
    }

    if (scheduled.length === 0) {
      setAlerts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return 0;
    }

    setAlerts((prev) => ({ ...prev, [key]: { preference, fires: scheduled } }));
    return scheduled.length;
  };

  const clearAlert = async (key: string) => {
    const existing = alerts[key];
    if (existing) await Promise.all(existing.fires.map((f) => cancelLocalAlert(f.notificationId)));
    setAlerts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const hasAlert = (key: string) => !!alerts[key];
  const getAlert = (key: string) => alerts[key];

  return (
    <AlertsContext.Provider value={{ alerts, setMultiAlert, clearAlert, hasAlert, getAlert }}>
      {children}
    </AlertsContext.Provider>
  );
}

export const useAlerts = () => useContext(AlertsContext);
