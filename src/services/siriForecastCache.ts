// Builds the trimmed snapshot the native Siri App Intents read, and pushes
// it to the shared App Group container via the ClearNightSiriBridge native
// module. Called from LocationsContext whenever a location's forecast
// finishes refreshing — the same moment it's already synced to AsyncStorage
// and Supabase, so Siri always reflects exactly what's on screen.

import { NativeModules } from 'react-native';
import { Location, DayForecast } from '../data/mockForecast';
import { VERDICTS } from '../constants/verdicts';

const { ClearNightSiriBridge } = NativeModules as {
  ClearNightSiriBridge?: {
    writeForecastCache: (json: string) => Promise<void>;
  };
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

// day.day is already a weekday abbreviation for every night except the
// first ("Tonight"), computed by forecastEngine from the location's own
// local date — so this is exact for i > 0, and a reasonable device-local
// approximation for tonight.
function weekdayIndexFor(day: DayForecast): number {
  if (day.day in WEEKDAY_INDEX) return WEEKDAY_INDEX[day.day];
  return new Date(day.duskMs).getDay();
}

export interface SiriCachedNight {
  day: string;
  date: string;
  weekdayIndex: number;
  verdict: string;
  verdictWord: string;
  score: number;
  windowLabel: string | null;
  clearBy: string | null;
  primeDark: string | null;
  moonPhase: string;
  seeingWord: string;
}

export interface SiriCachedLocation {
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  updatedAtMs: number;
  nights: SiriCachedNight[];
}

export function buildSiriCachePayload(locations: Location[]): SiriCachedLocation[] {
  const now = Date.now();
  return locations
    .filter((loc) => loc.days.length > 0)
    .map((loc) => ({
      name: loc.name,
      region: loc.region,
      latitude: loc.latitude,
      longitude: loc.longitude,
      updatedAtMs: now,
      nights: loc.days.map((d) => ({
        day: d.day,
        date: d.date,
        weekdayIndex: weekdayIndexFor(d),
        verdict: d.verdict,
        verdictWord: VERDICTS[d.verdict]?.word ?? d.verdict,
        score: d.score,
        windowLabel: d.window ? d.window.label : null,
        clearBy: d.clearBy && d.clearBy !== '—' ? d.clearBy : null,
        primeDark: d.primeDark && d.primeDark !== '—' ? d.primeDark : null,
        moonPhase: d.moonPhase,
        seeingWord: d.seeingWord,
      })),
    }));
}

let lastSyncedJson = '';

// Best-effort and silent — Siri having slightly stale data is never worth
// surfacing an error to the user over.
export function syncSiriCache(locations: Location[]): void {
  if (!ClearNightSiriBridge?.writeForecastCache) return;
  try {
    const payload = buildSiriCachePayload(locations);
    if (payload.length === 0) return;
    const json = JSON.stringify(payload);
    if (json === lastSyncedJson) return;
    lastSyncedJson = json;
    ClearNightSiriBridge.writeForecastCache(json).catch(() => {});
  } catch {
    // Ignore — this is a nice-to-have side channel, not core app function.
  }
}
