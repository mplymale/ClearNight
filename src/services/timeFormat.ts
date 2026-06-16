// Formats absolute UTC instants into the location's local wall-clock time,
// matching the exact string styles already used by the mock data.

function localParts(utcMs: number, utcOffsetSeconds: number) {
  const local = new Date(utcMs + utcOffsetSeconds * 1000);
  return { hour24: local.getUTCHours(), minute: local.getUTCMinutes() };
}

function to12Hour(hour24: number) {
  const period: 'am' | 'pm' = hour24 < 12 ? 'am' : 'pm';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, period };
}

// "8:58p" / "5:21a" — single-letter period, used for the arc's dusk/dawn labels
export function formatClockShort(utcMs: number, utcOffsetSeconds: number): string {
  const { hour24, minute } = localParts(utcMs, utcOffsetSeconds);
  const { hour12, period } = to12Hour(hour24);
  return `${hour12}:${String(minute).padStart(2, '0')}${period[0]}`;
}

// "12 am" / "11 pm" — used for "clear by ___"
export function formatHourWord(utcMs: number, utcOffsetSeconds: number): string {
  const { hour24 } = localParts(utcMs, utcOffsetSeconds);
  const { hour12, period } = to12Hour(hour24);
  return `${hour12} ${period}`;
}

// "12:40 – 4:30am" / "11:30pm – 4:00am" — full period shown on both ends
// only when they differ; omitted from the start when both ends share AM/PM.
export function formatWindowLabel(startUtcMs: number, endUtcMs: number, utcOffsetSeconds: number): string {
  const start = localParts(startUtcMs, utcOffsetSeconds);
  const end = localParts(endUtcMs, utcOffsetSeconds);
  const s = to12Hour(start.hour24);
  const e = to12Hour(end.hour24);

  const startStr = `${s.hour12}:${String(start.minute).padStart(2, '0')}`;
  const endStr = `${e.hour12}:${String(end.minute).padStart(2, '0')}${e.period}`;

  return s.period === e.period ? `${startStr} – ${endStr}` : `${startStr}${s.period} – ${endStr}`;
}

// "2h 10m"
export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}
