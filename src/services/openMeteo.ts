// Open-Meteo hourly cloud cover — free, no API key required.
// https://open-meteo.com/en/docs

export interface CloudPoint {
  utcMs: number; // absolute UTC instant
  cloudPct: number; // 0-100
}

export interface CloudSeries {
  points: CloudPoint[];
  utcOffsetSeconds: number;
  timezone: string;
}

export async function fetchCloudCover(lat: number, lon: number): Promise<CloudSeries> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&hourly=cloudcover&timezone=auto&forecast_days=7`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo request failed: ${res.status}`);
  const json = await res.json();

  const utcOffsetSeconds: number = json.utc_offset_seconds ?? 0;
  const timezone: string = json.timezone ?? 'UTC';
  const times: string[] = json.hourly?.time ?? [];
  const clouds: number[] = json.hourly?.cloudcover ?? [];

  // hourly.time strings are local-naive (no "Z"). Date.parse(t + 'Z') reads
  // the wall-clock digits as if they were UTC — call that "naive UTC". The
  // true UTC instant is naive UTC minus the offset, since local = UTC + offset.
  const points: CloudPoint[] = times.map((t, i) => ({
    utcMs: Date.parse(`${t}:00Z`) - utcOffsetSeconds * 1000,
    cloudPct: clouds[i] ?? 0,
  }));

  return { points, utcOffsetSeconds, timezone };
}

// Nearest cloud % to a given absolute UTC instant
export function cloudAt(series: CloudSeries, utcMs: number): number {
  if (series.points.length === 0) return 50;
  let best = series.points[0];
  let bestDiff = Math.abs(best.utcMs - utcMs);
  for (const p of series.points) {
    const diff = Math.abs(p.utcMs - utcMs);
    if (diff < bestDiff) {
      best = p;
      bestDiff = diff;
    }
  }
  return best.cloudPct;
}
