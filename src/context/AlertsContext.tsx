import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertNavData, cancelLocalAlert, ensureNotificationPermission, parseWindowEndDate, parseWindowStartDate, scheduleLocalAlert } from '../services/alertScheduling';
import { registerPushToken } from '../services/pushTokens';
import { supabase } from '../lib/supabase';
import { useLocations } from './LocationsContext';
import { usePreferences } from './PreferencesContext';

const STORAGE_KEY = 'clearnight:alerts';

interface ScheduledFire {
  notificationId: string;
  fireDateMs: number;
  title: string;
  body: string;
  // Which forecast day (0 = tonight) this fire was planned for. Lets a
  // later evaluation recognize "we already handled today" even though the
  // immediate-fire branch below would otherwise mint a brand new
  // timestamp every time it re-runs.
  dayIndex: number;
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
  clearAlert: (key: string) => Promise<void>;
  clearAllAlerts: () => Promise<void>;
  toggleAlert: (key: string) => void;
  hasAlert: (key: string) => boolean;
  getAlert: (key: string) => AlertRecord | undefined;
}

const AlertsContext = createContext<AlertsCtx>({
  alerts: {},
  saveAlertPreference: () => {},
  clearAlert: async () => {},
  clearAllAlerts: async () => {},
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
  const { locations } = useLocations();
  const { quietStart, quietEnd } = usePreferences();

  // evaluateAndSchedule runs once per `locations`/`alerts` change, and each
  // of a user's locations resolves its own forecast independently — so
  // several overlapping runs are normal. Without this, whichever run
  // happens to *finish* last wins (via setAlerts), even if it started
  // earliest and computed its fires from stale/placeholder location data.
  // The guard below ensures only the most recently *started* run's result
  // ever lands.
  const evalSeqRef = useRef(0);

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
    // The user just explicitly opted into an alert — this is the correct,
    // contextual moment to request notification permission.
    ensureNotificationPermission().then((granted) => {
      if (granted) registerPushToken().catch(() => {});
    });
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

  const evaluateAndSchedule = async () => {
    // Only touch notification permission if there's actually an enabled
    // alert to schedule — this runs on every locations refresh (including
    // plain app launch), so it must stay silent until the user opts in.
    if (!Object.values(alerts).some(rec => rec.enabled)) return;

    const granted = await ensureNotificationPermission();
    if (!granted) return;
    registerPushToken().catch(() => {});

    const mySeq = ++evalSeqRef.current;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Only fires get committed below — never the rest of the record. This
    // run captures `rec` at the start of a (possibly long) async pass; if
    // the user toggles/edits/clears this same alert while it's in flight,
    // spreading the stale captured `rec` back in would silently undo that
    // change (e.g. a toggle-off flipping back to enabled).
    const updates: Record<string, ScheduledFire[]> = {};

    for (const [key, rec] of Object.entries(alerts)) {
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

      // Keyed by day index so the immediate-fire branch below can tell
      // "already planned/fired for this day" apart from "this is new" —
      // without this, re-deriving a fresh Date.now() on every re-run would
      // look like a changed plan forever and spam a new duplicate
      // notification on every locations/alerts refresh.
      const existingByDay = new Map(rec.fires.map(f => [f.dayIndex, f]));

      // Plan the target fires first, without actually scheduling anything —
      // scheduleLocalAlert has a side effect (it creates a real OS
      // notification), so we don't want to run it until we know the plan
      // actually differs from what's already scheduled. This function
      // reruns on every `alerts` change (including the state update it
      // itself makes at the end), so recomputing an identical plan every
      // time and rescheduling anyway would both spam cancel/reschedule
      // calls and loop forever re-triggering that same `alerts` change.
      const plan: { fireDateMs: number; title: string; body: string; navData: AlertNavData; dayIndex: number }[] = [];

      for (const { i } of qualifyingDays) {
        const dayBase = new Date(today.getTime() + i * 86400000);
        let fireDate: Date;
        let title: string;
        let body: string;
        let navData: AlertNavData;

        if (locMatch) {
          if (timing === 'dayBefore') {
            fireDate = new Date(dayBase.getTime() - 86400000);
            fireDate.setHours(18, 0, 0, 0);
          } else {
            const duskMs = loc.days[i].duskMs;
            const dawnMs = loc.days[i].dawnMs;
            const rightNow = Date.now();
            if (duskMs && duskMs <= rightNow && (!dawnMs || rightNow < dawnMs)) {
              // Dusk already passed but we're still inside tonight's
              // window and conditions qualify right now — notify
              // immediately instead of silently dropping a fire time
              // that's already in the past. Reuse the day's existing fire
              // time (if already planned/fired) rather than minting a
              // fresh Date.now() — otherwise every re-run of this effect
              // (app foreground, locations refresh, etc.) looks like a
              // brand new plan and fires a duplicate notification.
              const existing = existingByDay.get(i);
              fireDate = existing ? new Date(existing.fireDateMs) : new Date(rightNow + 2000);
            } else {
              fireDate = duskMs ? new Date(duskMs) : new Date(dayBase.getTime());
              if (!duskMs) fireDate.setHours(18, 0, 0, 0);
            }
          }
          const verdict = loc.days[i].verdict.toUpperCase();
          title = timing === 'dayBefore'
            ? `${verdict} night ahead at ${loc.name}`
            : `${verdict} — skies are open at ${loc.name}`;
          body = timing === 'dayBefore'
            ? `Tomorrow night is looking ${verdict} — score ${loc.days[i].score}. Plan your session.`
            : `Score ${loc.days[i].score} tonight at ${loc.name}. Time to head out.`;
          navData = { kind: 'location', locationName: loc.name };
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
            const windowEnd = windowLabel ? parseWindowEndDate(windowLabel, dayBase) : null;
            const rightNow = Date.now();
            if (windowStart.getTime() <= rightNow && (!windowEnd || rightNow < windowEnd.getTime())) {
              // Window already started but we're still inside it and
              // conditions qualify right now — notify immediately instead
              // of silently dropping a fire time already past. Reuse the
              // day's existing fire time (if already planned/fired)
              // instead of minting a fresh Date.now() — see the matching
              // comment in the location branch above.
              const existing = existingByDay.get(i);
              fireDate = existing ? new Date(existing.fireDateMs) : new Date(rightNow + 2000);
            } else {
              fireDate = windowStart;
            }
          }
          const targetVerdict = loc.days[i].verdict.toUpperCase();
          title = timing === 'dayBefore'
            ? `${rec.label} is up tomorrow night`
            : `${rec.label} window is open now`;
          body = timing === 'dayBefore'
            ? `${targetVerdict} conditions tomorrow — score ${loc.days[i].score}. Good night for ${rec.label}.`
            : `${targetVerdict} skies — score ${loc.days[i].score}. ${rec.label} is visible now.`;
          navData = {
            kind: 'target',
            locationName: loc.name,
            targetType: type,
            objIndex: type === 'object' ? parseInt(objIndex, 10) : undefined,
          };
        } else {
          continue;
        }

        if (fireDate.getTime() <= Date.now()) continue;
        plan.push({ fireDateMs: fireDate.getTime(), title, body, navData, dayIndex: i });
      }

      const plannedMs = plan.map(p => p.fireDateMs).sort().join(',');
      const existingMs = rec.fires.map(f => f.fireDateMs).sort().join(',');
      if (plannedMs === existingMs) continue;

      await Promise.all(rec.fires.map(f => cancelLocalAlert(f.notificationId)));

      const scheduled: ScheduledFire[] = [];
      for (const { fireDateMs, title, body, navData, dayIndex } of plan) {
        const notificationId = await scheduleLocalAlert({ title, body, fireDate: new Date(fireDateMs), quietStart, quietEnd, navData });
        if (notificationId) scheduled.push({ notificationId, fireDateMs, title, body, dayIndex });
      }

      updates[key] = scheduled;
    }

    if (Object.keys(updates).length === 0) return;

    // A newer evaluateAndSchedule call started (and may already have
    // finished) after this one — its result is fresher, so don't let this
    // stale pass clobber it.
    if (mySeq !== evalSeqRef.current) return;

    setAlerts(prev => {
      const next = { ...prev };
      for (const [key, fires] of Object.entries(updates)) {
        if (!next[key]) continue; // cleared while this run was in flight
        next[key] = { ...next[key], fires };
      }
      return next;
    });
  };

  // Trigger re-evaluation here, at the provider root, rather than from a
  // screen's effect — a screen sitting behind another one in the stack
  // (e.g. Home behind Settings) gets frozen by react-native-screens, so an
  // effect living there silently stops firing while it's not focused. This
  // provider is always mounted above the navigator, so it isn't subject to
  // that freeze and reacts immediately regardless of which screen is up.
  useEffect(() => {
    if (locations.length > 0) {
      evaluateAndSchedule();
    }
  }, [locations, alerts, quietStart, quietEnd]);

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
      const nowEnabled = !prev[key].enabled;
      if (nowEnabled) {
        ensureNotificationPermission().then((granted) => {
          if (granted) registerPushToken().catch(() => {});
        });
      }
      return { ...prev, [key]: { ...prev[key], enabled: nowEnabled } };
    });
  };

  const hasAlert = (key: string) => !!alerts[key];
  const getAlert = (key: string) => alerts[key];

  const clearAllAlerts = async () => {
    await Promise.all(
      Object.values(alerts).flatMap(rec => rec.fires.map(f => cancelLocalAlert(f.notificationId)))
    );
    setAlerts({});
  };

  return (
    <AlertsContext.Provider value={{ alerts, saveAlertPreference, clearAlert, clearAllAlerts, toggleAlert, hasAlert, getAlert }}>
      {children}
    </AlertsContext.Provider>
  );
}

export const useAlerts = () => useContext(AlertsContext);
