// 7Timer! astro product — free, no API key required.
// http://www.7timer.info/doc.php?lang=en#astro
// `seeing` is reported on a 1–8 scale (1 = best, <0.5" of arc; 8 = worst, >2.5").
// We map it onto the app's existing 1–5 scale (5 = best) used by SkyObject/DayForecast.

export interface SeeingPoint {
  utcMs: number;
  seeingApp: number; // 1-5, 5 = best
}

export interface SeeingSeries {
  points: SeeingPoint[];
}

function mapSeeingScale(raw1to8: number): number {
  // 7Timer 1-8 (lower better) -> app 1-5 (higher better)
  if (raw1to8 <= 2) return 5;
  if (raw1to8 <= 3) return 4;
  if (raw1to8 <= 5) return 3;
  if (raw1to8 === 6) return 2;
  return 1;
}

export async function fetchSeeing(lat: number, lon: number): Promise<SeeingSeries> {
  const url = `https://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=astro&output=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`7Timer request failed: ${res.status}`);
  const json = await res.json();

  const init: string = json.init; // "YYYYMMDDHH", UTC
  const initUtcMs = Date.UTC(
    Number(init.slice(0, 4)),
    Number(init.slice(4, 6)) - 1,
    Number(init.slice(6, 8)),
    Number(init.slice(8, 10))
  );

  const series: any[] = json.dataseries ?? [];
  const points: SeeingPoint[] = series.map((d) => ({
    utcMs: initUtcMs + d.timepoint * 3600 * 1000,
    seeingApp: mapSeeingScale(d.seeing ?? 5),
  }));

  return { points };
}

export function seeingAt(series: SeeingSeries, utcMs: number): number {
  if (series.points.length === 0) return 3;
  let best = series.points[0];
  let bestDiff = Math.abs(best.utcMs - utcMs);
  for (const p of series.points) {
    const diff = Math.abs(p.utcMs - utcMs);
    if (diff < bestDiff) {
      best = p;
      bestDiff = diff;
    }
  }
  return best.seeingApp;
}
