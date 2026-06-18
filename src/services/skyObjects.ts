// Computes which deep-sky objects and planets are actually worth pointing a
// camera/scope at tonight, for a real lat/lon/date — replaces the old
// hardcoded "Andromeda + Orion, every time" placeholder with real
// positional astronomy.
import * as Astronomy from 'astronomy-engine';
import { AltPoint, PrimeTarget, SkyObject } from '../data/mockForecast';
import { SKY_CATALOG, GALACTIC_CORE, PLANET_NAMES, METEOR_SHOWERS, MeteorShower } from '../data/skyCatalog';

const MIN_PEAK_ALTITUDE = 20; // degrees — below this, not worth the effort
const SAMPLE_COUNT = 9; // matches the AltPoint curve length used elsewhere in the UI

// Meteor shower active windows repeat every year and can cross the Dec→Jan
// boundary (e.g. Quadrantids), so compare month/day on a fixed reference
// year rather than real dates.
function monthDayOrdinal(month: number, day: number): number {
  return month * 31 + day; // coarse but monotonic enough for range checks within a year
}

function isShowerActive(shower: MeteorShower, date: Date): boolean {
  const todayOrd = monthDayOrdinal(date.getMonth() + 1, date.getDate());
  const startOrd = monthDayOrdinal(shower.activeStart.month, shower.activeStart.day);
  const endOrd = monthDayOrdinal(shower.activeEnd.month, shower.activeEnd.day);

  if (startOrd <= endOrd) {
    return todayOrd >= startOrd && todayOrd <= endOrd;
  }
  // Window wraps the new year (e.g. Dec 28 → Jan 12).
  return todayOrd >= startOrd || todayOrd <= endOrd;
}

function compassDir(azimuth: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(azimuth / 45) % 8];
}

function formatClock(date: Date): string {
  let h = date.getHours();
  const m = date.getMinutes();
  const period = h < 12 ? 'am' : 'pm';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')}${period}`;
}

interface Track {
  points: AltPoint[];
  peakAlt: number;
  peakTime: Date;
  peakAz: number;
  riseAz: number; // azimuth at the start of the sampled window
  riseTime: Date | null;
  setTime: Date | null;
}

// Samples an object's altitude across the dusk→dawn span and finds its peak.
function trackObject(raHours: number, decDeg: number, observer: Astronomy.Observer, duskMs: number, dawnMs: number): Track {
  const span = dawnMs - duskMs;
  const points: AltPoint[] = [];
  let peakAlt = -90;
  let peakTime = new Date(duskMs);
  let peakAz = 0;
  let riseAz = 0;
  let riseTime: Date | null = null;
  let setTime: Date | null = null;
  let wasUp = false;

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const t = duskMs + (span * i) / (SAMPLE_COUNT - 1);
    const date = new Date(t);
    const hor = Astronomy.Horizon(date, observer, raHours, decDeg, 'normal');
    points.push({ label: '', alt: Math.max(0, Math.round(hor.altitude)) });

    if (i === 0) riseAz = hor.azimuth;

    if (hor.altitude > peakAlt) {
      peakAlt = hor.altitude;
      peakTime = date;
      peakAz = hor.azimuth;
    }

    const isUp = hor.altitude > 0;
    if (isUp && !wasUp) riseTime = date;
    if (!isUp && wasUp && !setTime) setTime = date;
    wasUp = isUp;
  }

  // Sparse compass labels at the ends, matching the style of the original mock altCurve data.
  if (points.length >= 2) {
    points[0].label = compassDir(riseAz);
    points[points.length - 1].label = compassDir(peakAz);
  }

  return { points, peakAlt, peakTime, peakAz, riseAz, riseTime, setTime };
}

function qualityFromAltAndMag(peakAlt: number, mag: number, bortle: number): SkyObject['quality'] {
  // Higher altitude + brighter (lower mag) + darker sky (lower bortle) = better.
  const score = peakAlt - mag * 4 - bortle * 2;
  if (score >= 35) return 'Excellent';
  if (score >= 15) return 'Good';
  return 'Mediocre';
}

function visibleWindowLabel(track: Track): string {
  const start = track.riseTime ?? track.peakTime;
  const end = track.setTime ?? track.peakTime;
  return `${formatClock(start)} – ${formatClock(end)}`;
}

// A trackable candidate, unifying fixed deep-sky catalog entries,
// dynamically-positioned planets, and active meteor shower radiants into
// one shape before scoring/sorting.
interface Candidate {
  name: string;
  cat: string;
  con: string;
  type: string;
  mag: number;
  size: string;
  category: 'deep' | 'planets' | 'meteors';
  raHours: number;
  decDeg: number;
}

function buildSkyObject(candidate: Candidate, track: Track, bortle: number): SkyObject {
  return {
    name: candidate.name,
    cat: candidate.cat,
    con: candidate.con,
    type: candidate.type,
    mag: candidate.mag,
    size: candidate.size,
    category: candidate.category,
    quality: qualityFromAltAndMag(track.peakAlt, candidate.mag, bortle),
    window: visibleWindowLabel(track),
    peakAlt: Math.round(track.peakAlt),
    peakTime: formatClock(track.peakTime),
    transit: `${formatClock(track.peakTime)} ${compassDir(track.peakAz)}`,
    dirLabel: `${compassDir(track.riseAz)} → ${compassDir(track.peakAz)}`,
    dirDeg: track.peakAz,
    altCurve: track.points,
    raHours: candidate.raHours,
    decDeg: candidate.decDeg,
  };
}

function skyObjectToPrime(obj: SkyObject): PrimeTarget {
  return {
    name: obj.name,
    sub: `${obj.type} · ${obj.con}`,
    visible: obj.window,
    dir: obj.dirLabel,
    dirDeg: obj.dirDeg,
    peakAlt: obj.peakAlt,
    peakTime: obj.peakTime,
    transit: obj.transit,
    altCurve: obj.altCurve,
    raHours: obj.raHours,
    decDeg: obj.decDeg,
  };
}

// Re-compute a single object's visibility window for any night given its sky
// coords and that night's dusk/dawn bounds. Used in object-detail when the
// user taps a different day in the week strip.
export function computeObjectWindow(
  raHours: number,
  decDeg: number,
  lat: number,
  lon: number,
  duskMs: number,
  dawnMs: number,
): string {
  const observer = new Astronomy.Observer(lat, lon, 0);
  const track = trackObject(raHours, decDeg, observer, duskMs, dawnMs);
  if (track.peakAlt < MIN_PEAK_ALTITUDE) return 'Below horizon';
  return visibleWindowLabel(track);
}

const FLAT_CURVE: AltPoint[] = Array.from({ length: SAMPLE_COUNT }, () => ({ label: '', alt: 0 }));

const NOTHING_UP_PRIME: PrimeTarget = {
  name: 'Milky Way Core',
  sub: 'Sagittarius · Galactic center',
  visible: 'Below horizon tonight',
  dir: 'S',
  dirDeg: 180,
  peakAlt: 0,
  peakTime: '—',
  transit: '—',
  altCurve: FLAT_CURVE,
};

export interface ComputedSky {
  prime: PrimeTarget;
  objects: SkyObject[];
}

// `duskMs`/`dawnMs` bound tonight's dark window for this location.
export function computeTonightsSky(lat: number, lon: number, bortle: number, duskMs: number, dawnMs: number): ComputedSky {
  const observer = new Astronomy.Observer(lat, lon, 0);
  const midNight = new Date((duskMs + dawnMs) / 2);

  // Galactic core is the flagship "prime target" when it's well placed.
  const coreTrack = trackObject(GALACTIC_CORE.raHours, GALACTIC_CORE.decDeg, observer, duskMs, dawnMs);

  const deepCandidates: Candidate[] = SKY_CATALOG.map((cat) => ({
    name: cat.name, cat: cat.cat, con: cat.con, type: cat.type, mag: cat.mag, size: cat.size,
    category: 'deep', raHours: cat.raHours, decDeg: cat.decDeg,
  }));

  // Planets move, so their RA/Dec is computed fresh for tonight (once, at
  // local midnight — close enough over a single night for this purpose),
  // rather than stored as a fixed catalog value like the stars above.
  const planetCandidates: Candidate[] = PLANET_NAMES.map((name) => {
    const body = Astronomy.Body[name];
    const eq = Astronomy.Equator(body, midNight, observer, true, true);
    const mag = Astronomy.Illumination(body, midNight).mag;
    return {
      name, cat: name, con: '', type: 'Planet', mag, size: '—',
      category: 'planets', raHours: eq.ra, decDeg: eq.dec,
    };
  });

  // Only showers whose active date window includes tonight are candidates —
  // their radiant is a fixed point, same as a deep-sky object, for the
  // purposes of checking whether it's above the horizon.
  const meteorCandidates: Candidate[] = METEOR_SHOWERS
    .filter((shower) => isShowerActive(shower, midNight))
    .map((shower) => ({
      name: `${shower.name} meteors`, cat: shower.name, con: shower.con, type: 'Meteor shower',
      mag: shower.prominence, size: `ZHR ~${shower.zhr}/hr`,
      category: 'meteors', raHours: shower.radiantRaHours, decDeg: shower.radiantDecDeg,
    }));

  // Score each category separately and reserve slots per category, rather
  // than one global ranking — otherwise the much larger deep-sky catalog
  // (27 entries) crowds out planets/meteors (≤7 and ≤8 candidates) every
  // time, even on nights where a planet genuinely clears the altitude bar.
  function scoreCategory(candidates: Candidate[], cap: number) {
    return candidates
      .map((candidate) => ({ candidate, track: trackObject(candidate.raHours, candidate.decDeg, observer, duskMs, dawnMs) }))
      .filter(({ track }) => track.peakAlt >= MIN_PEAK_ALTITUDE)
      .sort((a, b) => (b.track.peakAlt - a.track.peakAlt) || (a.candidate.mag - b.candidate.mag))
      .slice(0, cap);
  }

  const scored = [
    ...scoreCategory(deepCandidates, 5),
    ...scoreCategory(planetCandidates, 4),
    ...scoreCategory(meteorCandidates, 2),
  ];

  const allObjects: SkyObject[] = scored.map(({ candidate, track }) => buildSkyObject(candidate, track, bortle));

  if (coreTrack.peakAlt >= MIN_PEAK_ALTITUDE) {
    const corePrime: PrimeTarget = {
      name: 'Milky Way Core',
      sub: 'Sagittarius · Galactic center',
      visible: visibleWindowLabel(coreTrack),
      dir: `${compassDir(coreTrack.riseAz)} → ${compassDir(coreTrack.peakAz)}`,
      dirDeg: coreTrack.peakAz,
      peakAlt: Math.round(coreTrack.peakAlt),
      peakTime: formatClock(coreTrack.peakTime),
      transit: `${formatClock(coreTrack.peakTime)} ${compassDir(coreTrack.peakAz)}`,
      altCurve: coreTrack.points,
      raHours: GALACTIC_CORE.raHours,
      decDeg: GALACTIC_CORE.decDeg,
    };
    // allObjects is already capped sensibly per category (≤11 total) —
    // no further global slice, so planets/meteors can't get crowded out.
    return { prime: corePrime, objects: allObjects };
  }

  // Core isn't up tonight — promote the single best candidate *across all
  // categories* to prime instead (allObjects is grouped by category, so
  // allObjects[0] would just always be the best deep-sky pick otherwise).
  if (allObjects.length === 0) {
    return { prime: NOTHING_UP_PRIME, objects: [] };
  }
  const bestIndex = allObjects.reduce(
    (best, obj, i) => (obj.peakAlt > allObjects[best].peakAlt ? i : best), 0
  );
  const prime = skyObjectToPrime(allObjects[bestIndex]);
  const remaining = allObjects.filter((_, i) => i !== bestIndex);
  return { prime, objects: remaining };
}
