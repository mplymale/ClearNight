import { haversineMiles } from './geo';

// We don't have a real light-pollution dataset wired in yet, so this
// approximates Bortle class by proximity to known major metro centers
// (their downtown cores are reliably Bortle 8-9). Anywhere far from all of
// these falls back to a generic suburban guess — better data here is a
// good candidate for a future real light-pollution API integration.
interface MajorCity {
  name: string;
  lat: number;
  lon: number;
  coreBortle: number; // Bortle class right at the city center
  radiusMi: number; // rough distance over which light pollution tapers off
}

const MAJOR_CITIES: MajorCity[] = [
  { name: 'New York',     lat: 40.7128,  lon: -74.0060,  coreBortle: 9, radiusMi: 35 },
  { name: 'Boston',       lat: 42.3601,  lon: -71.0589,  coreBortle: 8, radiusMi: 22 },
  { name: 'Los Angeles',  lat: 34.0522,  lon: -118.2437, coreBortle: 9, radiusMi: 35 },
  { name: 'Chicago',      lat: 41.8781,  lon: -87.6298,  coreBortle: 8, radiusMi: 28 },
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194, coreBortle: 8, radiusMi: 22 },
  { name: 'Washington DC', lat: 38.9072, lon: -77.0369,  coreBortle: 8, radiusMi: 22 },
  { name: 'Philadelphia', lat: 39.9526,  lon: -75.1652,  coreBortle: 8, radiusMi: 18 },
  { name: 'Houston',      lat: 29.7604,  lon: -95.3698,  coreBortle: 8, radiusMi: 25 },
  { name: 'Atlanta',      lat: 33.7490,  lon: -84.3880,  coreBortle: 8, radiusMi: 22 },
  { name: 'Miami',        lat: 25.7617,  lon: -80.1918,  coreBortle: 8, radiusMi: 22 },
  { name: 'Seattle',      lat: 47.6062,  lon: -122.3321, coreBortle: 8, radiusMi: 18 },
  { name: 'Dallas',       lat: 32.7767,  lon: -96.7970,  coreBortle: 8, radiusMi: 22 },
  { name: 'Denver',       lat: 39.7392,  lon: -104.9903, coreBortle: 7, radiusMi: 18 },
  { name: 'Phoenix',      lat: 33.4484,  lon: -112.0740, coreBortle: 8, radiusMi: 22 },
  { name: 'Detroit',      lat: 42.3314,  lon: -83.0458,  coreBortle: 8, radiusMi: 20 },
  { name: 'London',       lat: 51.5072,  lon: -0.1276,   coreBortle: 9, radiusMi: 28 },
  { name: 'Paris',        lat: 48.8566,  lon: 2.3522,    coreBortle: 9, radiusMi: 24 },
  { name: 'Tokyo',        lat: 35.6762,  lon: 139.6503,  coreBortle: 9, radiusMi: 32 },
  { name: 'Berlin',       lat: 52.5200,  lon: 13.4050,   coreBortle: 8, radiusMi: 20 },
  { name: 'Sydney',       lat: -33.8688, lon: 151.2093,  coreBortle: 8, radiusMi: 24 },
  { name: 'Toronto',      lat: 43.6532,  lon: -79.3832,  coreBortle: 8, radiusMi: 24 },
];

const FALLBACK_BORTLE = 4; // generic suburban guess when far from any known metro

export function estimateBortle(lat: number, lon: number): number {
  let nearest: { distMi: number; city: MajorCity } | null = null;
  for (const city of MAJOR_CITIES) {
    const distMi = haversineMiles(lat, lon, city.lat, city.lon);
    if (!nearest || distMi < nearest.distMi) nearest = { distMi, city };
  }
  if (!nearest) return FALLBACK_BORTLE;

  const { distMi, city } = nearest;

  // Inside the dense core — full urban reading.
  if (distMi <= city.radiusMi * 0.4) return city.coreBortle;

  // Tapering ring — interpolate down to a "bright suburban" reading (~5) at the radius edge.
  if (distMi <= city.radiusMi) {
    const t = (distMi - city.radiusMi * 0.4) / (city.radiusMi * 0.6);
    return Math.round(city.coreBortle - t * (city.coreBortle - 5));
  }

  // Outer ring — keep fading toward the generic fallback.
  if (distMi <= city.radiusMi * 2.5) {
    const t = (distMi - city.radiusMi) / (city.radiusMi * 1.5);
    return Math.round(5 - t * (5 - FALLBACK_BORTLE));
  }

  return FALLBACK_BORTLE;
}
