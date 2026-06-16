export interface DarkSkyPlace {
  name: string;
  state: string;
  bortle: number;
  lat: number;
  lon: number;
}

// A broader set of real IDA-certified (or similarly recognized) dark-sky
// places with global coverage, so "nearby" has a realistic chance of
// actually being nearby no matter where the user is.
export const DARK_SKY_PLACES: DarkSkyPlace[] = [
  // United States
  { name: 'Big Bend NP',           state: 'Texas',          bortle: 1, lat: 29.1275,  lon: -103.2425 },
  { name: 'Death Valley NP',       state: 'California',     bortle: 2, lat: 36.5054,  lon: -117.0794 },
  { name: 'Mauna Kea',             state: 'Hawaii',          bortle: 2, lat: 19.8207,  lon: -155.4681 },
  { name: 'Joshua Tree NP',        state: 'California',     bortle: 3, lat: 33.8734,  lon: -115.9010 },
  { name: 'Cherry Springs',        state: 'Pennsylvania',   bortle: 2, lat: 41.6643,  lon: -77.8226 },
  { name: 'Natural Bridges NM',    state: 'Utah',           bortle: 1, lat: 37.6028,  lon: -110.0138 },
  { name: 'Canyonlands NP',        state: 'Utah',           bortle: 1, lat: 38.3269,  lon: -109.8783 },
  { name: 'Capitol Reef NP',       state: 'Utah',           bortle: 2, lat: 38.3670,  lon: -111.2615 },
  { name: 'Great Basin NP',        state: 'Nevada',         bortle: 1, lat: 38.9831,  lon: -114.3000 },
  { name: 'Chaco Culture NHP',     state: 'New Mexico',     bortle: 1, lat: 36.0608,  lon: -107.9215 },
  { name: 'Cosmic Campground',     state: 'New Mexico',     bortle: 1, lat: 33.4836,  lon: -108.9211 },
  { name: 'Antelope Island SP',    state: 'Utah',           bortle: 3, lat: 41.0058,  lon: -112.2188 },
  { name: 'Headlands DSP',         state: 'Michigan',       bortle: 2, lat: 45.7884,  lon: -84.7286 },
  { name: 'Geauga Observatory Pk', state: 'Ohio',           bortle: 3, lat: 41.5601,  lon: -81.1698 },
  { name: 'Salt Fork SP',          state: 'Ohio',           bortle: 3, lat: 40.0822,  lon: -81.4892 },
  { name: 'Staunton River SP',     state: 'Virginia',       bortle: 2, lat: 36.6862,  lon: -78.6928 },
  { name: 'Mayland Earth to Sky',  state: 'North Carolina', bortle: 2, lat: 36.0490,  lon: -82.1390 },
  { name: 'Enchanted Rock SNA',    state: 'Texas',          bortle: 2, lat: 30.5061,  lon: -98.8198 },
  { name: 'Copper Breaks SP',      state: 'Texas',          bortle: 2, lat: 34.1147,  lon: -99.7565 },
  { name: 'Massacre Rim',          state: 'Nevada',         bortle: 1, lat: 41.6883,  lon: -119.6928 },
  { name: 'Beaver Meadow Audubon', state: 'New York',       bortle: 3, lat: 42.7170,  lon: -78.4525 },
  { name: 'Moab',                  state: 'Utah',           bortle: 2, lat: 38.5733,  lon: -109.5498 },

  // International
  { name: 'Aoraki Mackenzie',      state: 'New Zealand',    bortle: 1, lat: -43.9325, lon: 170.4651 },
  { name: 'NamibRand Reserve',     state: 'Namibia',        bortle: 1, lat: -24.8333, lon: 16.0167 },
  { name: 'Exmoor NP',             state: 'United Kingdom', bortle: 2, lat: 51.1352,  lon: -3.6483 },
  { name: 'Brecon Beacons',        state: 'United Kingdom', bortle: 2, lat: 51.8843,  lon: -3.4360 },
  { name: 'Westhavelland',         state: 'Germany',        bortle: 2, lat: 52.6167,  lon: 12.4167 },
  { name: 'Warrumbungle NP',       state: 'Australia',      bortle: 1, lat: -31.2756, lon: 149.0046 },
];
