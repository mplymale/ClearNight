import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Svg, { Circle, Path } from 'react-native-svg';
import { useLocations } from '../src/context/LocationsContext';
import { mkLocFromPlace } from '../src/data/mockForecast';
import { haversineMiles, formatMiles } from '../src/services/geo';

const ACCENT = '#7ef0d2';

interface Place {
  name: string;
  state: string;
  bortle: number;
  lat: number;
  lon: number;
}

// A broader set of real IDA-certified (or similarly recognized) dark-sky
// places with global coverage, so "nearby" has a realistic chance of
// actually being nearby no matter where the user is.
const DARK_SKY_PLACES: Place[] = [
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

function SearchIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Circle cx={8} cy={8} r={5.5} stroke="rgba(255,255,255,0.35)" strokeWidth={1.6} />
      <Path d="M12.5 12.5 L16 16" stroke="rgba(255,255,255,0.35)" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function GpsIcon({ color = ACCENT }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path d="M9 1 L17 9 L9 17 L1 9 Z" fill={color} opacity={0.9} />
      <Circle cx={9} cy={9} r={2.5} fill="#04130f" />
    </Svg>
  );
}

function MoonIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      <Circle cx={11} cy={11} r={9} fill="rgba(126,240,210,0.12)" />
      <Path d="M11 4 A7 7 0 0 1 11 18 A7 7 0 0 0 11 4Z" fill={ACCENT} opacity={0.85} />
    </Svg>
  );
}

interface SearchResult {
  key: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
}

export default function AddLocationScreen() {
  const insets = useSafeAreaInsets();
  const { addLocation, locations, activeLocIndex } = useLocations();
  const [query, setQuery] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchSeq = useRef(0);

  // Resolve a real reference point for "nearby": prefer the device's actual
  // GPS position (if permission was already granted), otherwise fall back to
  // whichever spot the user currently has open — still real coordinates,
  // just not necessarily where they're standing right now.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos =
            (await Location.getLastKnownPositionAsync()) ??
            (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
          if (pos && !cancelled) {
            setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
            return;
          }
        }
      } catch {
        // fall through to the location fallback below
      }
      const active = locations[activeLocIndex];
      if (active && !cancelled) {
        setUserCoords({ lat: active.latitude, lon: active.longitude });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const NEARBY_COUNT = 6;

  const placesWithDistance = DARK_SKY_PLACES.map(p => ({
    ...p,
    distMi: userCoords ? haversineMiles(userCoords.lat, userCoords.lon, p.lat, p.lon) : null,
  }))
    .sort((a, b) => (a.distMi ?? Infinity) - (b.distMi ?? Infinity))
    .slice(0, NEARBY_COUNT);

  const showingSearch = query.trim().length >= 2;

  // Debounced geocode search — same approach as onboarding: resolve the
  // free-text query to coordinates via expo-location, then reverse-geocode
  // each match to get a human-readable city/region for display.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    const mySeq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      try {
        const matches = await Location.geocodeAsync(q);
        if (searchSeq.current !== mySeq) return;

        const top = matches.slice(0, 4);
        const resolved = await Promise.all(
          top.map(async (m) => {
            try {
              const [geo] = await Location.reverseGeocodeAsync({
                latitude: m.latitude,
                longitude: m.longitude,
              });
              const city = geo?.city ?? geo?.subregion ?? geo?.name ?? q;
              const region = geo?.region ?? geo?.country ?? '';
              return { key: `${m.latitude},${m.longitude}`, city, region, latitude: m.latitude, longitude: m.longitude };
            } catch {
              return null;
            }
          })
        );
        if (searchSeq.current !== mySeq) return;

        const seen = new Set<string>();
        const unique = resolved.filter((r): r is SearchResult => {
          if (!r) return false;
          const k = `${r.city}|${r.region}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        setResults(unique);
        if (unique.length === 0) setSearchError('No matches found.');
      } catch {
        if (searchSeq.current === mySeq) setSearchError('Search failed. Check your connection.');
      } finally {
        if (searchSeq.current === mySeq) setSearching(false);
      }
    }, 550);

    return () => clearTimeout(timer);
  }, [query]);

  async function handleUseLocation() {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is needed to use your current position.');
        setGpsLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      const city = geo?.city ?? geo?.subregion ?? 'Current Location';
      const region = geo?.region ?? geo?.country ?? '';

      // Estimate bortle from city — a real app would call a dark-sky API
      const estimatedBortle = 4; // suburb assumption for GPS

      const loc = mkLocFromPlace(city, region, estimatedBortle, pos.coords.latitude, pos.coords.longitude);
      addLocation(loc);
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Could not get your location. Please try again.');
    } finally {
      setGpsLoading(false);
    }
  }

  function handleAddPlace(place: Place) {
    const alreadyAdded = locations.some(l => l.name === place.name);
    if (alreadyAdded) {
      Alert.alert('Already added', `${place.name} is already in your spots.`);
      return;
    }
    const loc = mkLocFromPlace(place.name, place.state, place.bortle, place.lat, place.lon);
    addLocation(loc);
    router.back();
  }

  function handleSearchResult(r: SearchResult) {
    const alreadyAdded = locations.some(l => l.name === r.city);
    if (alreadyAdded) {
      Alert.alert('Already added', `${r.city} is already in your spots.`);
      return;
    }
    const loc = mkLocFromPlace(r.city, r.region, 4, r.latitude, r.longitude);
    addLocation(loc);
    router.back();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Add a Spot</Text>
        <View style={styles.navRight} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search */}
        <View style={styles.searchBox}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder="Search a place or park..."
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="words"
          />
          {searching && <ActivityIndicator size="small" color={ACCENT} />}
        </View>

        {/* Use current location */}
        <TouchableOpacity
          style={styles.gpsRow}
          onPress={handleUseLocation}
          activeOpacity={0.8}
          disabled={gpsLoading}
        >
          <View style={styles.gpsIconWrap}>
            {gpsLoading
              ? <ActivityIndicator size="small" color={ACCENT} />
              : <GpsIcon />
            }
          </View>
          <View style={styles.gpsMain}>
            <Text style={styles.gpsTitle}>Use my current location</Text>
            <Text style={styles.gpsSub}>GPS · most accurate</Text>
          </View>
          {!gpsLoading && <Text style={styles.gpsChev}>›</Text>}
        </TouchableOpacity>

        {showingSearch ? (
          <>
            <Text style={styles.sectionLabel}>SEARCH RESULTS</Text>
            <View style={styles.placeList}>
              {results.length > 0 ? (
                results.map((r) => {
                  const added = locations.some(l => l.name === r.city);
                  const distMi = userCoords ? haversineMiles(userCoords.lat, userCoords.lon, r.latitude, r.longitude) : null;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      style={[styles.placeRow, added && styles.placeRowAdded]}
                      activeOpacity={0.8}
                      onPress={() => handleSearchResult(r)}
                    >
                      <View style={styles.moonIcon}>
                        <MoonIcon />
                      </View>
                      <View style={styles.placeMain}>
                        <Text style={styles.placeName}>{r.city}</Text>
                        <Text style={styles.placeMeta}>
                          {r.region}{distMi !== null ? ` · ${formatMiles(distMi)}` : ''}
                        </Text>
                      </View>
                      {added && <Text style={styles.placeAdded}>✓</Text>}
                    </TouchableOpacity>
                  );
                })
              ) : (
                !searching && searchError && (
                  <Text style={styles.searchEmptyText}>{searchError}</Text>
                )
              )}
            </View>
          </>
        ) : (
          <>
            {/* Dark-sky places nearby */}
            <Text style={styles.sectionLabel}>DARK-SKY PLACES NEARBY</Text>

            <View style={styles.placeList}>
              {placesWithDistance.map((place, i) => {
                const added = locations.some(l => l.name === place.name);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.placeRow, added && styles.placeRowAdded]}
                    activeOpacity={0.8}
                    onPress={() => handleAddPlace(place)}
                  >
                    <View style={styles.moonIcon}>
                      <MoonIcon />
                    </View>
                    <View style={styles.placeMain}>
                      <Text style={styles.placeName}>{place.name}</Text>
                      <Text style={styles.placeMeta}>
                        {place.state}{place.distMi !== null ? ` · ${formatMiles(place.distMi)}` : ''}
                      </Text>
                    </View>
                    {added
                      ? <Text style={styles.placeAdded}>✓</Text>
                      : <Text style={styles.placeBortle}>B{place.bortle}</Text>
                    }
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080b12',
  },

  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  cancelBtn: { minWidth: 70 },
  cancelText: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  navTitle: {
    flex: 1,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  navRight: { minWidth: 70 },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 16,
    color: '#fff',
  },
  searchEmptyText: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    paddingVertical: 8,
  },

  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 24,
  },
  gpsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(126,240,210,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gpsMain: { flex: 1 },
  gpsTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  gpsSub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  gpsChev: {
    fontSize: 20,
    color: ACCENT,
    flexShrink: 0,
  },

  sectionLabel: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 10.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.38)',
    marginBottom: 12,
  },

  placeList: { gap: 8 },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  placeRowAdded: {
    borderColor: `${ACCENT}40`,
    backgroundColor: 'rgba(126,240,210,0.05)',
  },
  moonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  placeMain: { flex: 1 },
  placeName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.1,
  },
  placeMeta: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  placeBortle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.2,
    flexShrink: 0,
  },
  placeAdded: {
    fontSize: 16,
    color: ACCENT,
    flexShrink: 0,
  },
});
