// Open-Meteo hourly cloud cover — free, no API key required.
// https://open-meteo.com/en/docs

export interface CloudPoint {
  utcMs: number;    // absolute UTC instant
  cloudPct: number; // 0-100
  humidity: number; // 0-100 relative humidity %
  windKmh: number;  // wind speed in km/h (converted to mph/kts at display time)
}

export interface CloudSeries {
  points: CloudPoint[];
  precipProbByDay: number[]; // daily max precipitation probability 0-100, index 0 = today
  utcOffsetSeconds: number;
  timezone: string;
}

export async function fetchCloudCover(lat: number, lon: number): Promise<CloudSeries> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&hourly=cloudcover,relative_humidity_2m,windspeed_10m&daily=precipitation_probability_max&timezone=auto&forecast_days=7`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo request failed: ${res.status}`);
  const json = await res.json();

  const utcOffsetSeconds: number = json.utc_offset_seconds ?? 0;
  const timezone: string = json.timezone ?? 'UTC';
  const times: string[] = json.hourly?.time ?? [];
  const clouds: number[] = json.hourly?.cloudcover ?? [];
  const humidities: number[] = json.hourly?.relative_humidity_2m ?? [];
  const winds: number[] = json.hourly?.windspeed_10m ?? [];
  const precipProbByDay: number[] = json.daily?.precipitation_probability_max ?? [];

  const points: CloudPoint[] = times.map((t, i) => ({
    utcMs: Date.parse(`${t}:00Z`) - utcOffsetSeconds * 1000,
    cloudPct: clouds[i] ?? 0,
    humidity: humidities[i] ?? 0,
    windKmh: winds[i] ?? 0,
  }));

  return { points, precipProbByDay, utcOffsetSeconds, timezone };
}

function nearest(series: CloudSeries, utcMs: number): CloudPoint {
  if (series.points.length === 0) return { utcMs, cloudPct: 50, humidity: 60, windKmh: 0 };
  let best = series.points[0];
  let bestDiff = Math.abs(best.utcMs - utcMs);
  for (const p of series.points) {
    const diff = Math.abs(p.utcMs - utcMs);
    if (diff < bestDiff) { best = p; bestDiff = diff; }
  }
  return best;
}

// Nearest cloud % to a given absolute UTC instant
export function cloudAt(series: CloudSeries, utcMs: number): number {
  return nearest(series, utcMs).cloudPct;
}

// Nearest humidity % to a given absolute UTC instant
export function humidityAt(series: CloudSeries, utcMs: number): number {
  return nearest(series, utcMs).humidity;
}

// Nearest wind speed (km/h) to a given absolute UTC instant
export function windAt(series: CloudSeries, utcMs: number): number {
  return nearest(series, utcMs).windKmh;
}
