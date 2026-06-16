// A compact catalog of well-known deep-sky objects, good for naked-eye/
// binoculars/small-scope viewing. Coordinates (RA/Dec) are fixed — they
// don't depend on location or date, only the observer's position/time does
// (computed separately in skyObjects.ts).
export interface CatalogObject {
  name: string;
  cat: string; // Messier/NGC designation
  con: string; // constellation
  type: string;
  mag: number; // apparent magnitude — lower is brighter
  size: string; // angular size
  raHours: number; // right ascension, hours (0-24)
  decDeg: number; // declination, degrees (-90 to +90)
}

export const SKY_CATALOG: CatalogObject[] = [
  { name: 'Andromeda Galaxy', cat: 'M31', con: 'Andromeda', type: 'Spiral galaxy', mag: 3.4, size: "178'", raHours: 0.712, decDeg: 41.27 },
  { name: 'Triangulum Galaxy', cat: 'M33', con: 'Triangulum', type: 'Spiral galaxy', mag: 5.7, size: "62'", raHours: 1.564, decDeg: 30.66 },
  { name: 'Orion Nebula', cat: 'M42', con: 'Orion', type: 'Emission nebula', mag: 4.0, size: "65'", raHours: 5.591, decDeg: -5.39 },
  { name: 'Pleiades', cat: 'M45', con: 'Taurus', type: 'Open cluster', mag: 1.6, size: "110'", raHours: 3.791, decDeg: 24.12 },
  { name: 'Crab Nebula', cat: 'M1', con: 'Taurus', type: 'Supernova remnant', mag: 8.4, size: "6'", raHours: 5.575, decDeg: 22.01 },
  { name: 'Hercules Cluster', cat: 'M13', con: 'Hercules', type: 'Globular cluster', mag: 5.8, size: "20'", raHours: 16.695, decDeg: 36.46 },
  { name: 'Ring Nebula', cat: 'M57', con: 'Lyra', type: 'Planetary nebula', mag: 8.8, size: "1.4'", raHours: 18.893, decDeg: 33.03 },
  { name: 'Dumbbell Nebula', cat: 'M27', con: 'Vulpecula', type: 'Planetary nebula', mag: 7.5, size: "8'", raHours: 19.994, decDeg: 22.72 },
  { name: 'Lagoon Nebula', cat: 'M8', con: 'Sagittarius', type: 'Emission nebula', mag: 6.0, size: "90'", raHours: 18.061, decDeg: -24.38 },
  { name: 'Trifid Nebula', cat: 'M20', con: 'Sagittarius', type: 'Emission/reflection', mag: 6.3, size: "28'", raHours: 18.045, decDeg: -23.03 },
  { name: 'Eagle Nebula', cat: 'M16', con: 'Serpens', type: 'Emission nebula', mag: 6.4, size: "35'", raHours: 18.313, decDeg: -13.79 },
  { name: 'Omega Nebula', cat: 'M17', con: 'Sagittarius', type: 'Emission nebula', mag: 6.0, size: "11'", raHours: 18.346, decDeg: -16.18 },
  { name: 'Whirlpool Galaxy', cat: 'M51', con: 'Canes Venatici', type: 'Spiral galaxy', mag: 8.4, size: "11'", raHours: 13.498, decDeg: 47.20 },
  { name: 'Sombrero Galaxy', cat: 'M104', con: 'Virgo', type: 'Spiral galaxy', mag: 8.0, size: "9'", raHours: 12.667, decDeg: -11.62 },
  { name: 'Pinwheel Galaxy', cat: 'M101', con: 'Ursa Major', type: 'Spiral galaxy', mag: 7.9, size: "29'", raHours: 14.054, decDeg: 54.35 },
  { name: 'Bode’s Galaxy', cat: 'M81', con: 'Ursa Major', type: 'Spiral galaxy', mag: 6.9, size: "27'", raHours: 9.926, decDeg: 69.07 },
  { name: 'Cigar Galaxy', cat: 'M82', con: 'Ursa Major', type: 'Starburst galaxy', mag: 8.4, size: "11'", raHours: 9.931, decDeg: 69.68 },
  { name: 'Beehive Cluster', cat: 'M44', con: 'Cancer', type: 'Open cluster', mag: 3.7, size: "95'", raHours: 8.667, decDeg: 19.98 },
  { name: 'Wild Duck Cluster', cat: 'M11', con: 'Scutum', type: 'Open cluster', mag: 5.8, size: "14'", raHours: 18.853, decDeg: -6.27 },
  { name: 'Butterfly Cluster', cat: 'M6', con: 'Scorpius', type: 'Open cluster', mag: 4.2, size: "25'", raHours: 17.668, decDeg: -32.22 },
  { name: 'Ptolemy Cluster', cat: 'M7', con: 'Scorpius', type: 'Open cluster', mag: 3.3, size: "80'", raHours: 17.897, decDeg: -34.79 },
  { name: 'Owl Nebula', cat: 'M97', con: 'Ursa Major', type: 'Planetary nebula', mag: 9.9, size: "3.4\'", raHours: 11.248, decDeg: 55.02 },
  { name: 'Black Eye Galaxy', cat: 'M64', con: 'Coma Berenices', type: 'Spiral galaxy', mag: 8.5, size: "10'", raHours: 12.945, decDeg: 21.68 },
  { name: 'Leo Triplet (M66)', cat: 'M66', con: 'Leo', type: 'Spiral galaxy', mag: 8.9, size: "9'", raHours: 11.337, decDeg: 12.99 },
  { name: 'Hercules Globular (M92)', cat: 'M92', con: 'Hercules', type: 'Globular cluster', mag: 6.4, size: "14'", raHours: 17.286, decDeg: 43.14 },
  { name: 'Double Cluster', cat: 'NGC 869/884', con: 'Perseus', type: 'Open cluster', mag: 4.3, size: "60'", raHours: 2.317, decDeg: 57.13 },
  { name: 'North America Nebula', cat: 'NGC 7000', con: 'Cygnus', type: 'Emission nebula', mag: 4.0, size: "120'", raHours: 20.983, decDeg: 44.33 },
];

// Sagittarius A* — the Milky Way's galactic center. Treated specially as
// the app's flagship "prime target" rather than a generic catalog entry.
export const GALACTIC_CORE = { raHours: 17.761, decDeg: -29.008 };

// Naked-eye/binocular-friendly planets — these don't have fixed RA/Dec like
// the catalog above (they move), so their position is computed fresh per
// night in skyObjects.ts using astronomy-engine's built-in ephemeris.
export const PLANET_NAMES = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'] as const;
export type PlanetName = typeof PLANET_NAMES[number];

// Major annual meteor showers. A shower has no single "position" the way a
// star or planet does — what's fixed is its radiant (the point meteors
// appear to streak from) and its active date window, both of which repeat
// every year. `prominence` is a hand-set mag-like value (lower = more
// worth featuring) standing in for the shower's zenith hourly rate (ZHR),
// since true visual magnitude doesn't apply to a shower the way it does a
// single object.
export interface MeteorShower {
  name: string;
  con: string; // constellation the radiant sits in
  radiantRaHours: number;
  radiantDecDeg: number;
  zhr: number; // peak zenith hourly rate, meteors/hour under ideal dark skies
  prominence: number;
  activeStart: { month: number; day: number }; // 1-indexed month
  activeEnd: { month: number; day: number };
  peak: { month: number; day: number };
}

export const METEOR_SHOWERS: MeteorShower[] = [
  { name: 'Quadrantids', con: 'Boötes', radiantRaHours: 15.33, radiantDecDeg: 49.7, zhr: 120, prominence: 3.0,
    activeStart: { month: 12, day: 28 }, activeEnd: { month: 1, day: 12 }, peak: { month: 1, day: 3 } },
  { name: 'Lyrids', con: 'Lyra', radiantRaHours: 18.17, radiantDecDeg: 33.3, zhr: 18, prominence: 5.5,
    activeStart: { month: 4, day: 16 }, activeEnd: { month: 4, day: 25 }, peak: { month: 4, day: 22 } },
  { name: 'Eta Aquariids', con: 'Aquarius', radiantRaHours: 22.5, radiantDecDeg: -1.0, zhr: 50, prominence: 4.5,
    activeStart: { month: 4, day: 19 }, activeEnd: { month: 5, day: 28 }, peak: { month: 5, day: 6 } },
  { name: 'Perseids', con: 'Perseus', radiantRaHours: 3.22, radiantDecDeg: 58.0, zhr: 100, prominence: 2.5,
    activeStart: { month: 7, day: 17 }, activeEnd: { month: 8, day: 24 }, peak: { month: 8, day: 12 } },
  { name: 'Orionids', con: 'Orion', radiantRaHours: 6.35, radiantDecDeg: 15.6, zhr: 20, prominence: 5.0,
    activeStart: { month: 10, day: 2 }, activeEnd: { month: 11, day: 7 }, peak: { month: 10, day: 21 } },
  { name: 'Leonids', con: 'Leo', radiantRaHours: 10.2, radiantDecDeg: 21.6, zhr: 15, prominence: 5.5,
    activeStart: { month: 11, day: 6 }, activeEnd: { month: 11, day: 30 }, peak: { month: 11, day: 17 } },
  { name: 'Geminids', con: 'Gemini', radiantRaHours: 7.47, radiantDecDeg: 32.6, zhr: 150, prominence: 2.0,
    activeStart: { month: 12, day: 4 }, activeEnd: { month: 12, day: 17 }, peak: { month: 12, day: 13 } },
  { name: 'Ursids', con: 'Ursa Minor', radiantRaHours: 14.47, radiantDecDeg: 75.3, zhr: 10, prominence: 6.0,
    activeStart: { month: 12, day: 17 }, activeEnd: { month: 12, day: 26 }, peak: { month: 12, day: 22 } },
];
