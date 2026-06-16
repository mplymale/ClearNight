// Combines cloud cover, moon illumination, seeing, and Bortle darkness into
// a single 0-100 score, and searches a night's hourly data for the best
// contiguous clear/dark window.

export interface HourPoint {
  utcMs: number;
  cloudPct: number;
  score: number; // 0-100
}

const WEIGHTS = {
  cloud: 0.45,
  moon: 0.20,
  seeing: 0.15,
  bortle: 0.20,
};

export function computeScore(cloudPct: number, moonIlluminationPct: number, seeingApp: number, bortle: number): number {
  const cloudFactor = (100 - cloudPct) / 100;
  const moonFactor = (100 - moonIlluminationPct) / 100;
  const seeingFactor = seeingApp / 5;
  const bortleFactor = (10 - bortle) / 9;

  const raw =
    WEIGHTS.cloud * cloudFactor +
    WEIGHTS.moon * moonFactor +
    WEIGHTS.seeing * seeingFactor +
    WEIGHTS.bortle * bortleFactor;

  return Math.max(0, Math.min(100, Math.round(raw * 100)));
}

// A clear hour for window purposes — mostly about cloud, since that's the
// hour-to-hour-varying factor (moon/seeing/bortle are held constant per night).
const CLEAR_CLOUD_THRESHOLD = 35;

export interface BestWindowResult {
  startUtcMs: number;
  endUtcMs: number;
  avgCloud: number;
}

// Finds the longest contiguous run of "clear" hours within [rangeStart, rangeEnd].
// Among equal-length runs, picks the one with the lowest average cloud cover.
export function findBestWindow(hours: HourPoint[], rangeStartMs: number, rangeEndMs: number): BestWindowResult | null {
  const inRange = hours
    .filter((h) => h.utcMs >= rangeStartMs && h.utcMs <= rangeEndMs)
    .sort((a, b) => a.utcMs - b.utcMs);

  if (inRange.length === 0) return null;

  let bestRun: HourPoint[] = [];
  let bestAvgCloud = Infinity;
  let current: HourPoint[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const avgCloud = current.reduce((s, h) => s + h.cloudPct, 0) / current.length;
    if (
      current.length > bestRun.length ||
      (current.length === bestRun.length && avgCloud < bestAvgCloud)
    ) {
      bestRun = current;
      bestAvgCloud = avgCloud;
    }
    current = [];
  };

  for (const h of inRange) {
    if (h.cloudPct <= CLEAR_CLOUD_THRESHOLD) {
      current.push(h);
    } else {
      flush();
    }
  }
  flush();

  if (bestRun.length === 0) return null;

  // Hours represent the start of an hour-long sample; extend the end by one
  // hour so the window covers the full final hour rather than a single instant.
  return {
    startUtcMs: bestRun[0].utcMs,
    endUtcMs: bestRun[bestRun.length - 1].utcMs + 3600 * 1000,
    avgCloud: Math.round(bestAvgCloud),
  };
}
