import { haversineMiles } from './geo';
import { DARK_SKY_PLACES } from '../data/darkSkyPlaces';

interface MajorCity {
  name: string;
  lat: number;
  lon: number;
  coreBortle: number;
  radiusMi: number;
}

const MAJOR_CITIES: MajorCity[] = [
  // United States
  { name: 'New York',      lat: 40.7128,  lon: -74.0060,  coreBortle: 9, radiusMi: 35 },
  { name: 'Los Angeles',   lat: 34.0522,  lon: -118.2437, coreBortle: 9, radiusMi: 35 },
  { name: 'Chicago',       lat: 41.8781,  lon: -87.6298,  coreBortle: 8, radiusMi: 28 },
  { name: 'Houston',       lat: 29.7604,  lon: -95.3698,  coreBortle: 8, radiusMi: 25 },
  { name: 'Phoenix',       lat: 33.4484,  lon: -112.0740, coreBortle: 8, radiusMi: 22 },
  { name: 'Philadelphia',  lat: 39.9526,  lon: -75.1652,  coreBortle: 8, radiusMi: 18 },
  { name: 'San Antonio',   lat: 29.4241,  lon: -98.4936,  coreBortle: 7, radiusMi: 16 },
  { name: 'San Diego',     lat: 32.7157,  lon: -117.1611, coreBortle: 8, radiusMi: 18 },
  { name: 'Dallas',        lat: 32.7767,  lon: -96.7970,  coreBortle: 8, radiusMi: 22 },
  { name: 'San Jose',      lat: 37.3382,  lon: -121.8863, coreBortle: 8, radiusMi: 16 },
  { name: 'San Francisco', lat: 37.7749,  lon: -122.4194, coreBortle: 8, radiusMi: 18 },
  { name: 'Austin',        lat: 30.2672,  lon: -97.7431,  coreBortle: 7, radiusMi: 16 },
  { name: 'Jacksonville',  lat: 30.3322,  lon: -81.6557,  coreBortle: 7, radiusMi: 14 },
  { name: 'Columbus',      lat: 39.9612,  lon: -82.9988,  coreBortle: 7, radiusMi: 16 },
  { name: 'Indianapolis',  lat: 39.7684,  lon: -86.1581,  coreBortle: 7, radiusMi: 16 },
  { name: 'Fort Worth',    lat: 32.7555,  lon: -97.3308,  coreBortle: 7, radiusMi: 16 },
  { name: 'Charlotte',     lat: 35.2271,  lon: -80.8431,  coreBortle: 7, radiusMi: 16 },
  { name: 'Memphis',       lat: 35.1495,  lon: -90.0490,  coreBortle: 7, radiusMi: 16 },
  { name: 'Boston',        lat: 42.3601,  lon: -71.0589,  coreBortle: 8, radiusMi: 22 },
  { name: 'El Paso',       lat: 31.7619,  lon: -106.4850, coreBortle: 7, radiusMi: 14 },
  { name: 'Denver',        lat: 39.7392,  lon: -104.9903, coreBortle: 7, radiusMi: 18 },
  { name: 'Seattle',       lat: 47.6062,  lon: -122.3321, coreBortle: 8, radiusMi: 18 },
  { name: 'Washington DC', lat: 38.9072,  lon: -77.0369,  coreBortle: 8, radiusMi: 22 },
  { name: 'Nashville',     lat: 36.1627,  lon: -86.7816,  coreBortle: 7, radiusMi: 16 },
  { name: 'Las Vegas',     lat: 36.1699,  lon: -115.1398, coreBortle: 8, radiusMi: 18 },
  { name: 'Louisville',    lat: 38.2527,  lon: -85.7585,  coreBortle: 7, radiusMi: 14 },
  { name: 'Baltimore',     lat: 39.2904,  lon: -76.6122,  coreBortle: 7, radiusMi: 16 },
  { name: 'Milwaukee',     lat: 43.0389,  lon: -87.9065,  coreBortle: 7, radiusMi: 14 },
  { name: 'Albuquerque',   lat: 35.0844,  lon: -106.6504, coreBortle: 7, radiusMi: 14 },
  { name: 'Tucson',        lat: 32.2226,  lon: -110.9747, coreBortle: 7, radiusMi: 14 },
  { name: 'Fresno',        lat: 36.7378,  lon: -119.7871, coreBortle: 7, radiusMi: 14 },
  { name: 'Sacramento',    lat: 38.5816,  lon: -121.4944, coreBortle: 7, radiusMi: 16 },
  { name: 'Kansas City',   lat: 39.0997,  lon: -94.5786,  coreBortle: 7, radiusMi: 16 },
  { name: 'Mesa',          lat: 33.4152,  lon: -111.8315, coreBortle: 7, radiusMi: 12 },
  { name: 'Atlanta',       lat: 33.7490,  lon: -84.3880,  coreBortle: 8, radiusMi: 22 },
  { name: 'Omaha',         lat: 41.2565,  lon: -95.9345,  coreBortle: 7, radiusMi: 14 },
  { name: 'Colorado Spgs', lat: 38.8339,  lon: -104.8214, coreBortle: 7, radiusMi: 12 },
  { name: 'Raleigh',       lat: 35.7796,  lon: -78.6382,  coreBortle: 7, radiusMi: 14 },
  { name: 'Virginia Beach',lat: 36.8529,  lon: -75.9780,  coreBortle: 7, radiusMi: 14 },
  { name: 'Minneapolis',   lat: 44.9778,  lon: -93.2650,  coreBortle: 7, radiusMi: 18 },
  { name: 'Tampa',         lat: 27.9506,  lon: -82.4572,  coreBortle: 7, radiusMi: 16 },
  { name: 'Orlando',       lat: 28.5383,  lon: -81.3792,  coreBortle: 7, radiusMi: 16 },
  { name: 'Miami',         lat: 25.7617,  lon: -80.1918,  coreBortle: 8, radiusMi: 22 },
  { name: 'Portland OR',   lat: 45.5231,  lon: -122.6765, coreBortle: 7, radiusMi: 16 },
  { name: 'Salt Lake City',lat: 40.7608,  lon: -111.8910, coreBortle: 7, radiusMi: 16 },
  { name: 'Pittsburgh',    lat: 40.4406,  lon: -79.9959,  coreBortle: 7, radiusMi: 16 },
  { name: 'Cincinnati',    lat: 39.1031,  lon: -84.5120,  coreBortle: 7, radiusMi: 14 },
  { name: 'Detroit',       lat: 42.3314,  lon: -83.0458,  coreBortle: 8, radiusMi: 20 },
  { name: 'St Louis',      lat: 38.6270,  lon: -90.1994,  coreBortle: 7, radiusMi: 16 },
  { name: 'Cleveland',     lat: 41.4993,  lon: -81.6944,  coreBortle: 7, radiusMi: 16 },
  // International
  { name: 'London',        lat: 51.5072,  lon: -0.1276,   coreBortle: 9, radiusMi: 28 },
  { name: 'Paris',         lat: 48.8566,  lon: 2.3522,    coreBortle: 9, radiusMi: 24 },
  { name: 'Tokyo',         lat: 35.6762,  lon: 139.6503,  coreBortle: 9, radiusMi: 32 },
  { name: 'Beijing',       lat: 39.9042,  lon: 116.4074,  coreBortle: 9, radiusMi: 30 },
  { name: 'Shanghai',      lat: 31.2304,  lon: 121.4737,  coreBortle: 9, radiusMi: 28 },
  { name: 'Mumbai',        lat: 19.0760,  lon: 72.8777,   coreBortle: 9, radiusMi: 24 },
  { name: 'Delhi',         lat: 28.6139,  lon: 77.2090,   coreBortle: 9, radiusMi: 28 },
  { name: 'Seoul',         lat: 37.5665,  lon: 126.9780,  coreBortle: 9, radiusMi: 24 },
  { name: 'Mexico City',   lat: 19.4326,  lon: -99.1332,  coreBortle: 9, radiusMi: 28 },
  { name: 'São Paulo',     lat: -23.5505, lon: -46.6333,  coreBortle: 9, radiusMi: 28 },
  { name: 'Cairo',         lat: 30.0444,  lon: 31.2357,   coreBortle: 8, radiusMi: 22 },
  { name: 'Berlin',        lat: 52.5200,  lon: 13.4050,   coreBortle: 8, radiusMi: 20 },
  { name: 'Madrid',        lat: 40.4168,  lon: -3.7038,   coreBortle: 8, radiusMi: 20 },
  { name: 'Rome',          lat: 41.9028,  lon: 12.4964,   coreBortle: 8, radiusMi: 20 },
  { name: 'Sydney',        lat: -33.8688, lon: 151.2093,  coreBortle: 8, radiusMi: 24 },
  { name: 'Melbourne',     lat: -37.8136, lon: 144.9631,  coreBortle: 8, radiusMi: 20 },
  { name: 'Toronto',       lat: 43.6532,  lon: -79.3832,  coreBortle: 8, radiusMi: 24 },
  { name: 'Vancouver',     lat: 49.2827,  lon: -123.1207, coreBortle: 7, radiusMi: 16 },
  { name: 'Montreal',      lat: 45.5017,  lon: -73.5673,  coreBortle: 8, radiusMi: 18 },
  { name: 'Calgary',       lat: 51.0447,  lon: -114.0719, coreBortle: 7, radiusMi: 16 },
  { name: 'Amsterdam',     lat: 52.3676,  lon: 4.9041,    coreBortle: 8, radiusMi: 18 },
  { name: 'Brussels',      lat: 50.8503,  lon: 4.3517,    coreBortle: 8, radiusMi: 16 },
  { name: 'Vienna',        lat: 48.2082,  lon: 16.3738,   coreBortle: 8, radiusMi: 16 },
  { name: 'Warsaw',        lat: 52.2297,  lon: 21.0122,   coreBortle: 7, radiusMi: 16 },
  { name: 'Stockholm',     lat: 59.3293,  lon: 18.0686,   coreBortle: 7, radiusMi: 16 },
  { name: 'Oslo',          lat: 59.9139,  lon: 10.7522,   coreBortle: 7, radiusMi: 14 },
  { name: 'Copenhagen',    lat: 55.6761,  lon: 12.5683,   coreBortle: 7, radiusMi: 14 },
  { name: 'Helsinki',      lat: 60.1699,  lon: 24.9384,   coreBortle: 7, radiusMi: 14 },
  { name: 'Johannesburg',  lat: -26.2041, lon: 28.0473,   coreBortle: 8, radiusMi: 20 },
  { name: 'Buenos Aires',  lat: -34.6037, lon: -58.3816,  coreBortle: 8, radiusMi: 22 },
  { name: 'Santiago',      lat: -33.4489, lon: -70.6693,  coreBortle: 7, radiusMi: 16 },
  { name: 'Bogotá',        lat: 4.7110,   lon: -74.0721,  coreBortle: 8, radiusMi: 18 },
  { name: 'Lima',          lat: -12.0464, lon: -77.0428,  coreBortle: 8, radiusMi: 18 },
  { name: 'Bangkok',       lat: 13.7563,  lon: 100.5018,  coreBortle: 9, radiusMi: 22 },
  { name: 'Singapore',     lat: 1.3521,   lon: 103.8198,  coreBortle: 9, radiusMi: 16 },
  { name: 'Jakarta',       lat: -6.2088,  lon: 106.8456,  coreBortle: 9, radiusMi: 22 },
  { name: 'Karachi',       lat: 24.8607,  lon: 67.0011,   coreBortle: 8, radiusMi: 20 },
  { name: 'Lagos',         lat: 6.5244,   lon: 3.3792,    coreBortle: 8, radiusMi: 18 },
  { name: 'Nairobi',       lat: -1.2921,  lon: 36.8219,   coreBortle: 7, radiusMi: 14 },
  { name: 'Dubai',         lat: 25.2048,  lon: 55.2708,   coreBortle: 8, radiusMi: 16 },
  { name: 'Istanbul',      lat: 41.0082,  lon: 28.9784,   coreBortle: 8, radiusMi: 20 },
  { name: 'Osaka',         lat: 34.6937,  lon: 135.5023,  coreBortle: 9, radiusMi: 20 },
];

// If the coordinate falls within this many miles of a known dark sky place,
// trust that place's measured Bortle over the city-proximity heuristic.
const DARK_SKY_PROXIMITY_MI = 30;

const FALLBACK_BORTLE = 4;

export function estimateBortle(lat: number, lon: number): number {
  // 1. Check proximity to known dark sky places first — these have real measured values.
  let nearestDark: { distMi: number; bortle: number } | null = null;
  for (const place of DARK_SKY_PLACES) {
    const distMi = haversineMiles(lat, lon, place.lat, place.lon);
    if (distMi <= DARK_SKY_PROXIMITY_MI) {
      if (!nearestDark || distMi < nearestDark.distMi) {
        nearestDark = { distMi, bortle: place.bortle };
      }
    }
  }
  if (nearestDark) return nearestDark.bortle;

  // 2. Fall back to city-proximity heuristic.
  let nearest: { distMi: number; city: MajorCity } | null = null;
  for (const city of MAJOR_CITIES) {
    const distMi = haversineMiles(lat, lon, city.lat, city.lon);
    if (!nearest || distMi < nearest.distMi) nearest = { distMi, city };
  }
  if (!nearest) return FALLBACK_BORTLE;

  const { distMi, city } = nearest;

  if (distMi <= city.radiusMi * 0.4) return city.coreBortle;

  if (distMi <= city.radiusMi) {
    const t = (distMi - city.radiusMi * 0.4) / (city.radiusMi * 0.6);
    return Math.round(city.coreBortle - t * (city.coreBortle - 5));
  }

  if (distMi <= city.radiusMi * 2.5) {
    const t = (distMi - city.radiusMi) / (city.radiusMi * 1.5);
    return Math.round(5 - t * (5 - FALLBACK_BORTLE));
  }

  return FALLBACK_BORTLE;
}
