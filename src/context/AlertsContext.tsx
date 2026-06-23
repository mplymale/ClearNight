import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Location } from '../data/mockForecast';
import { cancelLocalAlert, ensureNotificationPermission, parseWindowStartDate, scheduleLocalAlert } from '../services/alertScheduling';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'clearnight:alerts';

interface ScheduledFire {
  notificationId: string;
  fireDateMs: number;
}

export interface AlertPreference {
  threshold: number;
  nightsMode: 'any' | 'weekends' | 'pick';
  pickedDays?: number[];
  timing: 'evening' | 'dayBefore';
}

export interface AlertRecord {
  label: string;
  alertType: 'location' | 'target';
  enabled: boolean;
  preference: AlertPreference;
  fires: ScheduledFire[];
}

interface AlertsCtx {
  alerts: Record<string, AlertRecord>;
  saveAlertPreference: (key: string, label: string, alertType: 'location' | 'target', preference: AlertPreference) => void;
  evaluateAndSchedule: (locations: Location[], quietStart: number, quietEnd: number) => Promise<void>;
  clearAlert: (key: string) => Promise<void>;
  toggleAlert: (key: string) => void;
  hasAlert: (key: string) => boolean;
  getAlert: (key: string) => AlertRecord | undefined;
}

const AlertsContext = createContext<AlertsCtx>({
  alerts: {},
  saveAlertPreference: () => {},
  evaluateAndSchedule: async () => {},
  clearAlert: async () => {},
  toggleAlert: () => {},
  hasAlert: () => false,
  getAlert: () => undefined,
});

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function syncAlertsToSupabase(alerts: Record<string, AlertRecord>) {
  const userId = await getUserId();
  if (!userId) return;
  const rows = Object.entries(alerts).map(([key, data]) => ({
    user_id: userId,
    key,
    data,
  }));
  if (rows.length === 0) return;
  await supabase.from('alerts').upsert(rows, { onConflict: 'user_id,key' });
}

async function deleteAlertFromSupabase(key: string) {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('alerts').delete().eq('user_id', userId).eq('key', key);
}

async function loadAlertsFromSupabase(): Promise<Record<string, AlertRecord>> {
  const userId = await getUserId();
  if (!userId) return {};
  const { data } = await supabase
    .from('alerts')
    .select('key, data')
    .eq('user_id', userId);
  if (!data) return {};
  return Object.fromEntries(data.map(row => [row.key, row.data as AlertRecord]));
}

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<Record<string, AlertRecord>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setAlerts(JSON.parse(saved));

        // Merge in any alerts from Supabase not in local cache
        const remote = await loadAlertsFromSupabase();
        if (Object.keys(remote).length > 0) {
          setAlerts(prev => ({ ...remote, ...prev }));
        }
      } catch {
        // Corrupt storage — start fresh.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(alerts)).catch(() => {});
    syncAlertsToSupabase(alerts).catch(() => {});
  }, [alerts, hydrated]);

  const saveAlertPreference = (
    key: string,
    label: string,
    alertType: 'location' | 'target',
    preference: AlertPreference,
  ) => {
    setAlerts(prev => ({
      ...prev,
      [key]: {
        label,
        alertType,
        enabled: true,
        preference,
        fires: prev[key]?.fires ?? [],
      },
    }));
  };

  const evaluateAndSchedule = async (locations: Location[], quietStart: number, quietEnd: number) => {
    const granted = await ensureNotificationPermission();
    if (!granted) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setAlerts(prev => {
      const next = { ...prev };

      (async () => {
        for (const [key, rec] of Object.entries(prev)) {
          if (!rec.enabled) continue;

          const locMatch = key.match(/^alert-loc-(\d+)$/);
          const targetMatch = key.match(/^alert-(\d+)-(prime|object)-(.*)$/);
          const locIndex = locMatch
            ? parseInt(locMatch[1], 10)
            : targetMatch
            ? parseInt(targetMatch[1], 10)
            : -1;

          const loc = locations[locIndex];
          if (!loc) continue;

          const { threshold, nightsMode, pickedDays, timing } = rec.preference;

          await Promise.all(rec.fires.map(f => cancelLocalAlert(f.notificationId)));

          const qualifyingDays = loc.days
            .map((d, i) => ({ d, i }))
            .filter(({ d, i }) => {
              if (d.score < threshold) return false;
              if (nightsMode === 'pick') return pickedDays?.includes(i) ?? false;
              if (nightsMode === 'weekends') {
                const dow = new Date(today.getTime() + i * 86400000).getDay();
                return dow === 0 || dow === 6;
              }
              return true;
            });

          const scheduled: ScheduledFire[] = [];

          for (const { i } of qualifyingDays) {
            const dayBase = new Date(today.getTime() + i * 86400000);
            const nightLabel = i === 0 ? 'tonight' : loc.days[i].day;
            let fireDate: Date;
            let title: string;
            let body: string;

            if (locMatch) {
              if (timing === 'dayBefore') {
                fireDate = new Date(dayBase.getTime() - 86400000);
                fireDate.setHours(18, 0, 0, 0);
              } else {
                const duskMs = loc.days[i].duskMs;
                fireDate = duskMs ? new Date(duskMs) : new Date(dayBase.getTime());
                if (!duskMs) fireDate.setHours(18, 0, 0, 0);
              }
              const verdict = loc.days[i].verdict.toUpperCase();
              title = timing === 'dayBefore'
                ? `${verdict} night ahead at ${loc.name}`
                : `${verdict} — skies are open at ${loc.name}`;
              body = timing === 'dayBefore'
                ? `Tomorrow night is looking ${verdict} — score ${loc.days[i].score}. Plan your session.`
                : `Score ${loc.days[i].score} tonight at ${loc.name}. Time to head out.`;
            } else if (targetMatch) {
              const type = targetMatch[2] as 'prime' | 'object';
              const objIndex = targetMatch[3];
              const obj = type === 'prime' ? loc.prime : loc.objects[parseInt(objIndex, 10)];
              if (!obj) continue;
              const windowLabel = type === 'prime'
                ? (loc.prime as typeof loc.prime).visible
                : (loc.objects[parseInt(objIndex, 10)] as typeof loc.objects[0]).window;
              const windowStart = windowLabel ? parseWindowStartDate(windowLabel, dayBase) : null;
              if (!windowStart) continue;

              if (timing === 'dayBefore') {
                fireDate = new Date(dayBase.getTime() - 86400000);
                fireDate.setHours(18, 0, 0, 0);
              } else {
                fireDate = windowStart;
              }
              const targetVerdict = loc.days[i].verdict.toUpperCase();
              title = timing === 'dayBefore'
                ? `${rec.label} is up tomorrow night`
                : `${rec.label} window is open now`;
              body = timing === 'dayBefore'
                ? `${targetVerdict} conditions tomorrow — score ${loc.days[i].score}. Good night for ${rec.label}.`
                : `${targetVerdict} skies — score ${loc.days[i].score}. ${rec.label} is visible now.`;
            } else {
              continue;
            }

            if (fireDate.getTime() <= Date.now()) continue;
            const notificationId = await scheduleLocalAlert({ title, body, fireDate, quietStart, quietEnd });
            if (notificationId) scheduled.push({ notificationId, fireDateMs: fireDate.getTime() });
          }

          next[key] = { ...rec, fires: scheduled };
        }

        setAlerts({ ...next });
      })();

      return next;
    });
  };

  const clearAlert = async (key: string) => {
    const existing = alerts[key];
    if (existing) await Promise.all(existing.fires.map(f => cancelLocalAlert(f.notificationId)));
    deleteAlertFromSupabase(key).catch(() => {});
    setAlerts(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const toggleAlert = (key: string) => {
    setAlerts(prev => {
      if (!prev[key]) return prev;
      return { ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } };
    });
  };

  const hasAlert = (key: string) => !!alerts[key];
  const getAlert = (key: string) => alerts[key];

  return (
    <AlertsContext.Provider value={{ alerts, saveAlertPreference, evaluateAndSchedule, clearAlert, toggleAlert, hasAlert, getAlert }}>
      {children}
    </AlertsContext.Provider>
  );
}

export const useAlerts = () => useContext(AlertsContext);
