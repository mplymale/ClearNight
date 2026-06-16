import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'starcast:preferences';

interface Preferences {
  use24h: boolean;
  useCelsius: boolean;
  quietStart: number; // hour 0-23, e.g. 23 = 11pm
  quietEnd: number;   // hour 0-23, e.g. 7 = 7am
}

interface PreferencesCtx extends Preferences {
  setUse24h: (v: boolean) => void;
  setUseCelsius: (v: boolean) => void;
  setQuietStart: (h: number) => void;
  setQuietEnd: (h: number) => void;
}

const PreferencesContext = createContext<PreferencesCtx>({
  use24h: false,
  useCelsius: false,
  quietStart: 23,
  quietEnd: 7,
  setUse24h: () => {},
  setUseCelsius: () => {},
  setQuietStart: () => {},
  setQuietEnd: () => {},
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [use24h, setUse24hState] = useState(false);
  const [useCelsius, setUseCelsiusState] = useState(false);
  const [quietStart, setQuietStartState] = useState(23);
  const [quietEnd, setQuietEndState] = useState(7);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.use24h === 'boolean') setUse24hState(parsed.use24h);
          if (typeof parsed.useCelsius === 'boolean') setUseCelsiusState(parsed.useCelsius);
          if (typeof parsed.quietStart === 'number') setQuietStartState(parsed.quietStart);
          if (typeof parsed.quietEnd === 'number') setQuietEndState(parsed.quietEnd);
        }
      } catch {}
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ use24h, useCelsius, quietStart, quietEnd })).catch(() => {});
  }, [use24h, useCelsius, quietStart, quietEnd, hydrated]);

  return (
    <PreferencesContext.Provider value={{
      use24h,
      useCelsius,
      quietStart,
      quietEnd,
      setUse24h: setUse24hState,
      setUseCelsius: setUseCelsiusState,
      setQuietStart: setQuietStartState,
      setQuietEnd: setQuietEndState,
    }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export const usePreferences = () => useContext(PreferencesContext);

// ── Time conversion helpers ───────────────────────────────────────────────────
// The forecast engine bakes 12h strings like "9:22pm" into the data.
// These utilities reformat them for 24h display without touching the data layer.

function token12to24(token: string): string {
  // Matches: "9:22pm", "12:00am", "9:22p", "5:58a"
  const m = token.match(/^(\d{1,2}):(\d{2})\s*(am?|pm?)$/i);
  if (!m) return token;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const period = m[3].toLowerCase();
  const isPm = period.startsWith('p');
  if (isPm && h !== 12) h += 12;
  if (!isPm && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${min}`;
}

// Converts any string that may contain 12h time tokens to 24h.
// Handles: "9:22pm", "9:22pm – 1:40am", "1:40am S", "9:22p", "5:58a"
export function applyTimeFormat(str: string, use24h: boolean): string {
  if (!use24h) return str;
  // Replace all 12h time tokens in the string
  return str.replace(/\d{1,2}:\d{2}\s*[ap]m?/gi, token12to24);
}

// Returns true if the given Date falls inside the quiet window.
// Handles overnight spans (e.g. 23→7 wraps midnight).
export function isInQuietHours(date: Date, quietStart: number, quietEnd: number): boolean {
  const h = date.getHours();
  if (quietStart <= quietEnd) {
    return h >= quietStart && h < quietEnd;
  }
  // Overnight: e.g. 23 → 7 means 23,0,1,2,3,4,5,6
  return h >= quietStart || h < quietEnd;
}

export function formatQuietHours(quietStart: number, quietEnd: number, use24h: boolean): string {
  const fmt = (h: number) => {
    if (use24h) return `${String(h).padStart(2, '0')}:00`;
    const period = h < 12 ? 'am' : 'pm';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${period}`;
  };
  return `${fmt(quietStart)} – ${fmt(quietEnd)}`;
}

// Convert °F value to °C string
export function applyTempFormat(fahrenheit: number, useCelsius: boolean): string {
  if (useCelsius) {
    return `${Math.round((fahrenheit - 32) * 5 / 9)}°C`;
  }
  return `${Math.round(fahrenheit)}°F`;
}
