// Local moon illumination + sun/twilight times via SunCalc — no network call.
import SunCalc from 'suncalc';

export interface NightBounds {
  duskUtcMs: number; // civil dusk — sky starts getting dark
  dawnUtcMs: number; // civil dawn — sky starts getting light
  astroNightStartUtcMs: number; // sun -18°, true darkness begins
  astroNightEndUtcMs: number; // sun -18°, true darkness ends
}

// `dateUtcNoon` should be a Date at ~noon UTC on the target local calendar
// day, so SunCalc resolves sunset/sunrise for the correct day at this lat/lon.
export function getNightBounds(dateUtcNoon: Date, lat: number, lon: number): NightBounds {
  const today = SunCalc.getTimes(dateUtcNoon, lat, lon);
  const tomorrow = SunCalc.getTimes(new Date(dateUtcNoon.getTime() + 86400000), lat, lon);

  return {
    duskUtcMs: today.dusk.getTime(),
    dawnUtcMs: tomorrow.dawn.getTime(),
    astroNightStartUtcMs: today.night.getTime(),
    astroNightEndUtcMs: tomorrow.nightEnd.getTime(),
  };
}

export function getMoonIlluminationPct(date: Date): number {
  const { fraction } = SunCalc.getMoonIllumination(date);
  return Math.round(fraction * 100);
}

export function getMoonPhaseName(date: Date): string {
  const { phase } = SunCalc.getMoonIllumination(date);
  if (phase < 0.03 || phase > 0.97) return 'New moon';
  if (phase < 0.22) return 'Waxing crescent';
  if (phase < 0.28) return 'First quarter';
  if (phase < 0.47) return 'Waxing gibbous';
  if (phase < 0.53) return 'Full moon';
  if (phase < 0.72) return 'Waning gibbous';
  if (phase < 0.78) return 'Last quarter';
  return 'Waning crescent';
}
