import { DayForecast, NightWindow, PrimeTarget, SkyObject } from '../data/mockForecast';
import { verdictFromScore } from '../constants/verdicts';
import { fetchCloudCover, cloudAt, CloudSeries } from './openMeteo';
import { fetchSeeing, seeingAt, SeeingSeries } from './sevenTimer';
import { getNightBounds, getMoonIlluminationPct, getMoonPhaseName } from './moon';
import { computeScore, findBestWindow, HourPoint } from './scoreEngine';
import { formatClockShort, formatHourWord, formatWindowLabel, formatDuration } from './timeFormat';
import { computeTonightsSky } from './skyObjects';

const SEEING_WORD: Record<number, string> = { 5: 'Excellent', 4: 'Good', 3: 'Fair', 2: 'Poor', 1: 'Bad' };
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HOUR_CLOCK_LABELS = [21, 22, 23, 0, 1, 2, 3, 4, 5]; // 9p .. 5a, matches BottomSheet's HOURS

export interface RealForecastResult {
  days: DayForecast[];
  dusk: string; // tonight's dusk, for the arc's fixed end label
  dawn: string; // tonight's dawn
  prime: PrimeTarget;
  objects: SkyObject[];
}

export async function buildRealForecast(lat: number, lon: number, bortle: number): Promise<RealForecastResult> {
  const [cloud, seeing] = await Promise.all([fetchCloudCover(lat, lon), fetchSeeing(lat, lon)]);
  const utcOffsetSeconds = cloud.utcOffsetSeconds;

  // The location's current local calendar date, derived from its own offset
  // (not the device's) so "Tonight" means tonight where the spot actually is.
  const localNow = new Date(Date.now() + utcOffsetSeconds * 1000);
  const baseY = localNow.getUTCFullYear();
  const baseM = localNow.getUTCMonth();
  const baseD = localNow.getUTCDate();

  const days: DayForecast[] = [];
  let tonightDusk = '';
  let tonightDawn = '';
  let tonightDuskMs = 0;
  let tonightDawnMs = 0;

  for (let i = 0; i < 6; i++) {
    // Noon, local time at the spot, converted to an absolute UTC instant —
    // used purely to tell SunCalc which calendar day to compute.
    const localNoonAsUtc = Date.UTC(baseY, baseM, baseD + i, 12, 0, 0) - utcOffsetSeconds * 1000;
    const noonDate = new Date(localNoonAsUtc);

    const bounds = getNightBounds(noonDate, lat, lon);
    const moonPct = getMoonIlluminationPct(noonDate);
    const moonPhase = getMoonPhaseName(noonDate);
    const seeingApp = seeingAt(seeing, (bounds.duskUtcMs + bounds.dawnUtcMs) / 2);

    // Sample every hour across the dusk→dawn span for window-finding + the score
    const hourPoints: HourPoint[] = [];
    for (let t = bounds.duskUtcMs; t <= bounds.dawnUtcMs; t += 3600 * 1000) {
      const cloudPct = cloudAt(cloud, t);
      const score = computeScore(cloudPct, moonPct, seeingApp, bortle);
      hourPoints.push({ utcMs: t, cloudPct, score });
    }

    const avgCloud = hourPoints.length
      ? Math.round(hourPoints.reduce((s, h) => s + h.cloudPct, 0) / hourPoints.length)
      : 50;
    const dayScore = computeScore(avgCloud, moonPct, seeingApp, bortle);

    const best = findBestWindow(hourPoints, bounds.astroNightStartUtcMs, bounds.astroNightEndUtcMs);
    let window: NightWindow | null = null;
    let clearBy = '—';
    let primeDark = '—';

    if (best) {
      const span = bounds.dawnUtcMs - bounds.duskUtcMs;
      window = {
        label: formatWindowLabel(best.startUtcMs, best.endUtcMs, utcOffsetSeconds),
        s: span > 0 ? Math.max(0, Math.min(1, (best.startUtcMs - bounds.duskUtcMs) / span)) : 0,
        e: span > 0 ? Math.max(0, Math.min(1, (best.endUtcMs - bounds.duskUtcMs) / span)) : 1,
      };
      clearBy = formatHourWord(best.startUtcMs, utcOffsetSeconds);
      primeDark = formatDuration(best.endUtcMs - best.startUtcMs);
    }

    // 9-point hourly array for the bottom-sheet bar chart (9p, 10, 11, 12, 1a, 2, 3, 4, 5)
    const eveningLocalY = baseY, eveningLocalM = baseM, eveningLocalD = baseD + i;
    const hourly = HOUR_CLOCK_LABELS.map((clockHour) => {
      // Hours 0-5 are past midnight, so they land on the next local day.
      const dayOffset = clockHour <= 5 ? 1 : 0;
      const targetLocalAsUtc =
        Date.UTC(eveningLocalY, eveningLocalM, eveningLocalD + dayOffset, clockHour, 0, 0) - utcOffsetSeconds * 1000;
      const cloudPct = cloudAt(cloud, targetLocalAsUtc);
      return Math.max(4, Math.min(99, Math.round(100 - cloudPct)));
    });

    const dateLabel = new Date(localNoonAsUtc + utcOffsetSeconds * 1000);
    const day: DayForecast = {
      day: i === 0 ? 'Tonight' : WEEKDAY[dateLabel.getUTCDay()],
      date: `${MONTH[dateLabel.getUTCMonth()]} ${dateLabel.getUTCDate()}`,
      score: dayScore,
      cloud: avgCloud,
      moon: moonPct,
      seeingN: seeingApp,
      bortle,
      verdict: verdictFromScore(dayScore),
      seeingWord: SEEING_WORD[seeingApp] ?? 'Fair',
      moonPhase,
      window,
      clearBy,
      primeDark,
      hourly,
    };
    days.push(day);

    if (i === 0) {
      tonightDusk = formatClockShort(bounds.duskUtcMs, utcOffsetSeconds);
      tonightDawn = formatClockShort(bounds.dawnUtcMs, utcOffsetSeconds);
      tonightDuskMs = bounds.duskUtcMs;
      tonightDawnMs = bounds.dawnUtcMs;
    }
  }

  const sky = computeTonightsSky(lat, lon, bortle, tonightDuskMs, tonightDawnMs);

  return { days, dusk: tonightDusk, dawn: tonightDawn, prime: sky.prime, objects: sky.objects };
}
