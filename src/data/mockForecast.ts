import { VerdictKey, verdictFromScore } from '../constants/verdicts';

export interface NightWindow {
  label: string;
  s: number; // arc fraction 0–1
  e: number;
}

export interface DayForecast {
  day: string;
  date: string;
  score: number;
  cloud: number;
  moon: number;
  seeingN: number;
  bortle: number;
  verdict: VerdictKey;
  seeingWord: string;
  moonPhase: string;
  window: NightWindow | null;
  clearBy: string;
  primeDark: string;
  hourly: number[];
}

export interface AltPoint { label: string; alt: number; }

export interface SkyObject {
  name: string;
  cat: string;
  con: string;
  type: string;
  mag: number;
  size: string;
  quality: 'Excellent' | 'Good' | 'Mediocre';
  // detail fields
  window: string;
  peakAlt: number;
  peakTime: string;
  transit: string;
  dirLabel: string;
  dirDeg: number;
  altCurve: AltPoint[];
  // Which onboarding interest this object matches, for auto-favoriting.
  // Optional since hand-authored mock objects don't set it.
  category?: 'deep' | 'planets' | 'meteors';
}

export interface PrimeTarget {
  name: string;
  sub: string;
  visible: string;
  dir: string;
  dirDeg: number;
  // detail fields
  peakAlt: number;
  peakTime: string;
  transit: string;
  altCurve: AltPoint[];
}

export interface Location {
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  bortle: number;
  dusk: string;
  dawn: string;
  days: DayForecast[];
  prime: PrimeTarget;
  objects: SkyObject[];
}

const SEEING_WORD: Record<number, string> = { 5: 'Excellent', 4: 'Good', 3: 'Fair', 2: 'Poor', 1: 'Bad' };
const MOON_PHASES = ['Waxing crescent', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Waxing gibbous', 'Waxing gibbous'];

function genHourly(score: number, seedN: number): number[] {
  let s = seedN * 131 + 7;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const peak = 3.5 + rnd() * 1.5;
  return Array.from({ length: 9 }, (_, i) => {
    const bell = 1 - Math.abs(i - peak) / 6.2;
    const v = score * 0.5 + score * 0.55 * bell + (rnd() * 16 - 8);
    return Math.max(4, Math.min(99, Math.round(v)));
  });
}

type RowTuple = [string, string, number, number, number, number, string | null, number, number, string, string];

function mkLoc(
  name: string,
  region: string,
  latitude: number,
  longitude: number,
  bortle: number,
  dusk: string,
  dawn: string,
  prime: PrimeTarget,
  objects: SkyObject[],
  rows: RowTuple[],
): Location {
  return {
    name, region, latitude, longitude, bortle, dusk, dawn, prime, objects,
    days: rows.map((r, i) => {
      const [day, date, score, cloud, moon, seeingN, wlabel, sF, eF, clearBy, primeDark] = r;
      return {
        day, date, score, cloud, moon, seeingN, bortle,
        verdict: verdictFromScore(score),
        seeingWord: SEEING_WORD[seeingN],
        moonPhase: MOON_PHASES[i] ?? 'Waxing gibbous',
        window: wlabel ? { label: wlabel, s: sF, e: eF } : null,
        clearBy,
        primeDark,
        hourly: genHourly(score, i + name.length),
      };
    }),
  };
}

const GALACTIC_CORE_CURVE: AltPoint[] = [
  { label: 'SE', alt: 4 }, { label: '', alt: 12 }, { label: '', alt: 20 },
  { label: 'S', alt: 26 }, { label: '', alt: 28 }, { label: '', alt: 25 },
  { label: '', alt: 18 }, { label: 'SW', alt: 10 }, { label: '', alt: 3 },
];

export const FORECAST: Location[] = [
  mkLoc(
    'Cherry Springs', 'Pennsylvania', 41.6643, -77.8226, 2, '8:58p', '5:21a',
    {
      name: 'Galactic Core', sub: 'Milky Way · Sagittarius', visible: '11:10pm – 4:20am',
      dir: 'SE → S', dirDeg: 158,
      peakAlt: 28, peakTime: '1:50am', transit: '1:50am S',
      altCurve: GALACTIC_CORE_CURVE,
    },
    [
      {
        name: 'Lagoon Nebula', cat: 'M8', con: 'Sagittarius', type: 'Emission nebula',
        mag: 6.0, size: "90'", quality: 'Excellent',
        window: '11:10pm – 4:20am', peakAlt: 30, peakTime: '1:45am', transit: '1:45am S',
        dirLabel: 'SE → S', dirDeg: 155,
        altCurve: [
          { label: 'SE', alt: 6 }, { label: '', alt: 16 }, { label: '', alt: 24 },
          { label: 'S', alt: 29 }, { label: '', alt: 30 }, { label: '', alt: 26 },
          { label: '', alt: 18 }, { label: 'SW', alt: 9 }, { label: '', alt: 2 },
        ],
      },
      {
        name: 'Trifid Nebula', cat: 'M20', con: 'Sagittarius', type: 'Emission / reflection',
        mag: 6.3, size: "28'", quality: 'Excellent',
        window: '11:20pm – 4:10am', peakAlt: 27, peakTime: '1:55am', transit: '1:55am S',
        dirLabel: 'SE → S', dirDeg: 160,
        altCurve: [
          { label: 'SE', alt: 4 }, { label: '', alt: 13 }, { label: '', alt: 21 },
          { label: 'S', alt: 26 }, { label: '', alt: 27 }, { label: '', alt: 23 },
          { label: '', alt: 15 }, { label: 'SW', alt: 7 }, { label: '', alt: 1 },
        ],
      },
      {
        name: 'Eagle Nebula', cat: 'M16', con: 'Serpens', type: 'Emission nebula',
        mag: 6.4, size: "35'", quality: 'Good',
        window: '11:00pm – 3:50am', peakAlt: 22, peakTime: '1:20am', transit: '1:20am S',
        dirLabel: 'SE → S', dirDeg: 148,
        altCurve: [
          { label: 'SE', alt: 5 }, { label: '', alt: 12 }, { label: '', alt: 19 },
          { label: 'S', alt: 22 }, { label: '', alt: 21 }, { label: '', alt: 17 },
          { label: '', alt: 11 }, { label: 'SW', alt: 5 }, { label: '', alt: 0 },
        ],
      },
      {
        name: 'Hercules Cluster', cat: 'M13', con: 'Hercules', type: 'Globular cluster',
        mag: 5.8, size: "20'", quality: 'Good',
        window: '10:00pm – 2:30am', peakAlt: 68, peakTime: '12:15am', transit: '12:15am S',
        dirLabel: 'E → S', dirDeg: 102,
        altCurve: [
          { label: 'E', alt: 32 }, { label: '', alt: 50 }, { label: '', alt: 63 },
          { label: 'S', alt: 68 }, { label: '', alt: 65 }, { label: '', alt: 52 },
          { label: '', alt: 36 }, { label: 'SW', alt: 18 }, { label: '', alt: 5 },
        ],
      },
      {
        name: 'Andromeda Galaxy', cat: 'M31', con: 'Andromeda', type: 'Spiral galaxy',
        mag: 3.4, size: "178'", quality: 'Mediocre',
        window: '3:00am – 5:20am', peakAlt: 18, peakTime: '4:30am', transit: '4:30am NE',
        dirLabel: 'NE → N', dirDeg: 42,
        altCurve: [
          { label: 'NE', alt: 2 }, { label: '', alt: 6 }, { label: '', alt: 11 },
          { label: 'N', alt: 16 }, { label: '', alt: 18 }, { label: '', alt: 17 },
          { label: '', alt: 13 }, { label: 'NW', alt: 7 }, { label: '', alt: 2 },
        ],
      },
    ],
    [
      ['Tonight', 'Jun 15', 82, 8,  14, 5, '2:15 – 5:00am', 0.55, 0.94, '1 am',  '2h 45m'],
      ['Mon',     'Jun 16', 34, 68, 22, 2, null,             0,    0,    '—',     '—'],
      ['Tue',     'Jun 17', 28, 78, 31, 2, null,             0,    0,    '—',     '—'],
      ['Wed',     'Jun 18', 55, 40, 42, 3, '2:40 – 4:30am', 0.62, 0.85, '2 am',  '1h 20m'],
      ['Thu',     'Jun 19', 88, 5,  54, 5, '12:30 – 5:05am',0.40, 0.96, '11 pm', '3h 40m'],
      ['Fri',     'Jun 20', 79, 14, 66, 4, '1:30 – 4:50am', 0.50, 0.90, '12 am', '2h 30m'],
    ],
  ),
  mkLoc(
    'Acworth', 'Georgia', 34.0754, -84.6772, 6, '8:46p', '6:08a',
    {
      name: 'Jupiter', sub: 'Planet · Taurus', visible: '1:05am – 5:40am',
      dir: 'E → SE', dirDeg: 110,
      peakAlt: 42, peakTime: '3:20am', transit: '3:20am SE',
      altCurve: [
        { label: 'E', alt: 8 }, { label: '', alt: 22 }, { label: '', alt: 35 },
        { label: 'SE', alt: 41 }, { label: '', alt: 42 }, { label: '', alt: 38 },
        { label: '', alt: 28 }, { label: 'S', alt: 15 }, { label: '', alt: 4 },
      ],
    },
    [
      { name: 'The Moon', cat: '—', con: 'Cancer', type: 'Lunar', mag: -8.1, size: "31'", quality: 'Good', window: '9:00pm – 2:00am', peakAlt: 55, peakTime: '11:30pm', transit: '11:30pm S', dirLabel: 'E → W', dirDeg: 180, altCurve: [{ label: 'E', alt: 20 },{ label: '', alt: 40 },{ label: '', alt: 52 },{ label: 'S', alt: 55 },{ label: '', alt: 50 },{ label: '', alt: 38 },{ label: '', alt: 22 },{ label: 'W', alt: 8 },{ label: '', alt: 0 }] },
      { name: 'Albireo', cat: 'β Cyg', con: 'Cygnus', type: 'Double star', mag: 3.1, size: '—', quality: 'Good', window: '10:00pm – 3:00am', peakAlt: 72, peakTime: '12:30am', transit: '12:30am S', dirLabel: 'E → W', dirDeg: 178, altCurve: [{ label: 'E', alt: 35 },{ label: '', alt: 55 },{ label: '', alt: 68 },{ label: 'S', alt: 72 },{ label: '', alt: 68 },{ label: '', alt: 55 },{ label: '', alt: 38 },{ label: 'W', alt: 18 },{ label: '', alt: 4 }] },
      { name: 'Ring Nebula', cat: 'M57', con: 'Lyra', type: 'Planetary nebula', mag: 8.8, size: "1.4'", quality: 'Mediocre', window: '10:30pm – 2:30am', peakAlt: 60, peakTime: '12:00am', transit: '12:00am S', dirLabel: 'E → W', dirDeg: 175, altCurve: [{ label: 'E', alt: 28 },{ label: '', alt: 46 },{ label: '', alt: 57 },{ label: 'S', alt: 60 },{ label: '', alt: 57 },{ label: '', alt: 46 },{ label: '', alt: 30 },{ label: 'W', alt: 14 },{ label: '', alt: 2 }] },
      { name: 'Hercules Cluster', cat: 'M13', con: 'Hercules', type: 'Globular cluster', mag: 5.8, size: "20'", quality: 'Mediocre', window: '9:30pm – 1:30am', peakAlt: 55, peakTime: '11:00pm', transit: '11:00pm S', dirLabel: 'SW → S', dirDeg: 195, altCurve: [{ label: 'SW', alt: 45 },{ label: '', alt: 52 },{ label: '', alt: 55 },{ label: 'S', alt: 54 },{ label: '', alt: 48 },{ label: '', alt: 36 },{ label: '', alt: 22 },{ label: 'SE', alt: 8 },{ label: '', alt: 0 }] },
    ],
    [
      ['Tonight', 'Jun 15', 31, 74, 14, 2, null,              0,    0,    '—',    '—'],
      ['Mon',     'Jun 16', 22, 82, 22, 1, null,              0,    0,    '—',    '—'],
      ['Tue',     'Jun 17', 44, 52, 31, 3, '1:50 – 3:30am',  0.60, 0.80, '1 am', '1h 10m'],
      ['Wed',     'Jun 18', 38, 60, 42, 2, null,              0,    0,    '—',    '—'],
      ['Thu',     'Jun 19', 52, 44, 54, 3, '1:20 – 3:20am',  0.55, 0.78, '1 am', '1h 05m'],
      ['Fri',     'Jun 20', 60, 30, 66, 4, '12:50 – 3:40am', 0.48, 0.82, '12 am','1h 40m'],
    ],
  ),
  mkLoc(
    'Moab', 'Utah', 38.5733, -109.5498, 2, '8:52p', '5:58a',
    {
      name: 'Galactic Core', sub: 'Milky Way · Sagittarius', visible: '11:40pm – 4:35am',
      dir: 'SE → S', dirDeg: 162,
      peakAlt: 32, peakTime: '2:10am', transit: '2:10am S',
      altCurve: GALACTIC_CORE_CURVE,
    },
    [
      { name: 'Whirlpool Galaxy', cat: 'M51', con: 'Canes Ven.', type: 'Spiral galaxy', mag: 8.4, size: "11'", quality: 'Good', window: '10:00pm – 1:30am', peakAlt: 58, peakTime: '11:45pm', transit: '11:45pm S', dirLabel: 'SW → S', dirDeg: 188, altCurve: [{ label: 'SW', alt: 38 },{ label: '', alt: 50 },{ label: '', alt: 57 },{ label: 'S', alt: 58 },{ label: '', alt: 52 },{ label: '', alt: 40 },{ label: '', alt: 24 },{ label: 'SE', alt: 9 },{ label: '', alt: 0 }] },
      { name: 'Lagoon Nebula', cat: 'M8', con: 'Sagittarius', type: 'Emission nebula', mag: 6.0, size: "90'", quality: 'Excellent', window: '11:40pm – 4:35am', peakAlt: 32, peakTime: '2:10am', transit: '2:10am S', dirLabel: 'SE → S', dirDeg: 158, altCurve: [{ label: 'SE', alt: 6 },{ label: '', alt: 16 },{ label: '', alt: 26 },{ label: 'S', alt: 31 },{ label: '', alt: 32 },{ label: '', alt: 28 },{ label: '', alt: 20 },{ label: 'SW', alt: 10 },{ label: '', alt: 2 }] },
      { name: 'Sombrero Galaxy', cat: 'M104', con: 'Virgo', type: 'Spiral galaxy', mag: 8.0, size: "9'", quality: 'Good', window: '9:30pm – 12:30am', peakAlt: 38, peakTime: '10:45pm', transit: '10:45pm S', dirLabel: 'SW → S', dirDeg: 200, altCurve: [{ label: 'SW', alt: 30 },{ label: '', alt: 36 },{ label: '', alt: 38 },{ label: 'S', alt: 37 },{ label: '', alt: 32 },{ label: '', alt: 22 },{ label: '', alt: 12 },{ label: 'SE', alt: 4 },{ label: '', alt: 0 }] },
      { name: 'Pinwheel Galaxy', cat: 'M101', con: 'Ursa Major', type: 'Spiral galaxy', mag: 7.9, size: "29'", quality: 'Mediocre', window: '9:00pm – 1:00am', peakAlt: 48, peakTime: '11:00pm', transit: '11:00pm N', dirLabel: 'NW → N', dirDeg: 355, altCurve: [{ label: 'NW', alt: 42 },{ label: '', alt: 46 },{ label: '', alt: 48 },{ label: 'N', alt: 47 },{ label: '', alt: 43 },{ label: '', alt: 36 },{ label: '', alt: 26 },{ label: 'NE', alt: 14 },{ label: '', alt: 4 }] },
    ],
    [
      ['Tonight', 'Jun 15', 71, 22, 14, 4, '12:40 – 4:30am', 0.45, 0.90, '12 am', '2h 10m'],
      ['Mon',     'Jun 16', 64, 30, 22, 4, '1:00 – 4:10am',  0.50, 0.86, '12 am', '2h 00m'],
      ['Tue',     'Jun 17', 48, 48, 31, 3, '1:40 – 3:30am',  0.58, 0.80, '1 am',  '1h 15m'],
      ['Wed',     'Jun 18', 70, 24, 42, 4, '1:10 – 4:30am',  0.52, 0.92, '12 am', '2h 20m'],
      ['Thu',     'Jun 19', 75, 16, 54, 5, '12:50 – 4:50am', 0.46, 0.95, '11 pm', '2h 50m'],
      ['Fri',     'Jun 20', 58, 34, 66, 3, '1:30 – 3:50am',  0.55, 0.84, '1 am',  '1h 30m'],
    ],
  ),
];

// Generate a plausible Location from minimal place info (for add-location)
export function mkLocFromPlace(
  name: string,
  region: string,
  bortle: number,
  latitude: number,
  longitude: number,
): Location {
  const seed = name.length * 17 + bortle * 3;
  const rnd = (n: number) => ((seed * n * 31 + 97) % 100);

  const objects: SkyObject[] = [
    {
      name: 'Andromeda Galaxy', cat: 'M31', con: 'Andromeda', type: 'Galaxy',
      mag: 3.4, size: "178'", quality: bortle <= 2 ? 'Excellent' : 'Good',
      window: '9:00pm – 2:00am', peakAlt: 72, peakTime: '11:30pm', transit: '11:30pm S',
      dirLabel: 'E → S', dirDeg: 90,
      altCurve: [
        { label: 'E', alt: 20 }, { label: '', alt: 45 }, { label: '', alt: 65 },
        { label: 'S', alt: 72 }, { label: '', alt: 60 }, { label: '', alt: 40 },
        { label: '', alt: 22 }, { label: 'W', alt: 8 }, { label: '', alt: 0 },
      ],
    },
    {
      name: 'Orion Nebula', cat: 'M42', con: 'Orion', type: 'Emission nebula',
      mag: 4.0, size: "65'", quality: bortle <= 2 ? 'Excellent' : 'Good',
      window: '10:00pm – 3:00am', peakAlt: 55, peakTime: '1:00am', transit: '1:00am S',
      dirLabel: 'SE → S', dirDeg: 150,
      altCurve: [
        { label: 'SE', alt: 10 }, { label: '', alt: 28 }, { label: '', alt: 44 },
        { label: 'S', alt: 55 }, { label: '', alt: 50 }, { label: '', alt: 36 },
        { label: '', alt: 20 }, { label: 'SW', alt: 8 }, { label: '', alt: 0 },
      ],
    },
  ];

  const prime: PrimeTarget = {
    name: 'Milky Way Core', sub: 'Sagittarius · Galactic center',
    visible: '11:00pm – 4:00am', dir: 'S', dirDeg: 180,
    peakAlt: 26, peakTime: '1:30am', transit: '1:30am S',
    altCurve: [
      { label: 'SE', alt: 4 }, { label: '', alt: 12 }, { label: '', alt: 20 },
      { label: 'S', alt: 26 }, { label: '', alt: 24 }, { label: '', alt: 18 },
      { label: '', alt: 10 }, { label: 'SW', alt: 4 }, { label: '', alt: 0 },
    ],
  };

  const rows: [string, string, number, number, number, number, string | null, number, number, string, string][] = [
    ['Tonight', 'Jun 15', 80 + rnd(1) % 15, 10 + rnd(2) % 20, 20 + rnd(3) % 30, 4, '11:30pm – 4:00am', 0.44, 0.92, '11 pm', '2h 30m'],
    ['Mon',     'Jun 16', 65 + rnd(4) % 20, 20 + rnd(5) % 30, 30 + rnd(6) % 20, 4, '12:00 – 4:00am',   0.50, 0.92, '12 am', '2h 00m'],
    ['Tue',     'Jun 17', 70 + rnd(7) % 20, 15 + rnd(8) % 25, 25 + rnd(9) % 30, 4, '11:45pm – 4:00am', 0.46, 0.92, '11 pm', '2h 15m'],
    ['Wed',     'Jun 18', 55 + rnd(10) % 30, 30 + rnd(11) % 30, 40 + rnd(12) % 25, 3, null, 0, 0, '1 am', '0h 00m'],
    ['Thu',     'Jun 19', 75 + rnd(13) % 15, 12 + rnd(14) % 20, 22 + rnd(15) % 25, 5, '12:30 – 4:00am', 0.52, 0.92, '12 am', '2h 00m'],
    ['Fri',     'Jun 20', 60 + rnd(16) % 25, 25 + rnd(17) % 30, 35 + rnd(18) % 20, 4, '1:00 – 3:30am',  0.54, 0.88, '1 am', '1h 30m'],
  ];

  return mkLoc(name, region, latitude, longitude, bortle, '8:45p', '5:15a', prime, objects, rows);
}
