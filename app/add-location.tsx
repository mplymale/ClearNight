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
import { useFavorites } from '../src/context/FavoritesContext';
import { useSubscription } from '../src/context/SubscriptionContext';
import { useNightVision, NV_ACCENT, NV_BORDER, NV_CARD, NV_TEXT, NV_TEXT_DIM, NV_TEXT_FAINT } from '../src/context/NightVisionContext';
import { CheckIcon } from '../src/components/common/CheckIcon';
import { mkLocFromPlace } from '../src/data/mockForecast';
import { haversineMiles, formatMiles } from '../src/services/geo';
import { estimateBortle } from '../src/services/bortleEstimate';
import { DARK_SKY_PLACES, DarkSkyPlace as Place } from '../src/data/darkSkyPlaces';

function SearchIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Circle cx={8} cy={8} r={5.5} stroke="rgba(255,255,255,0.35)" strokeWidth={1.6} />
      <Path d="M12.5 12.5 L16 16" stroke="rgba(255,255,255,0.35)" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function GpsIcon({ color = '#7ef0d2' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path d="M9 1 L17 9 L9 17 L1 9 Z" fill={color} opacity={0.9} />
      <Circle cx={9} cy={9} r={2.5} fill="#04130f" />
    </Svg>
  );
}

function MoonIcon({ color = '#7ef0d2' }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      <Circle cx={11} cy={11} r={9} fill="rgba(126,240,210,0.12)" />
      <Path d="M11 4 A7 7 0 0 1 11 18 A7 7 0 0 0 11 4Z" fill={color} opacity={0.85} />
    </Svg>
  );
}

interface SearchResult {
  key: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  isDarkSky?: boolean;
}

function searchDarkSkyPlaces(q: string): SearchResult[] {
  const lower = q.toLowerCase();
  return DARK_SKY_PLACES
    .filter(p => p.name.toLowerCase().includes(lower) || p.state.toLowerCase().includes(lower))
    .slice(0, 3)
    .map(p => ({
      key: `dsp-${p.name}`,
      city: p.name,
      region: p.state,
      latitude: p.lat,
      longitude: p.lon,
      isDarkSky: true,
    }));
}

export default function AddLocationScreen() {
  const insets = useSafeAreaInsets();
  const { addLocation, locations, activeLocIndex } = useLocations();
  const { addFavorite } = useFavorites();
  const { status } = useSubscription();
  const { nightVision } = useNightVision();
  const nvAccent = nightVision ? NV_ACCENT : '#7ef0d2';
  const containerBg = nightVision ? '#150400' : '#080b12';
  const cardBg = nightVision ? NV_CARD : 'rgba(255,255,255,0.04)';
  const cardBorder = nightVision ? NV_BORDER : 'rgba(255,255,255,0.09)';
  const textPrimary = nightVision ? NV_TEXT : '#fff';
  const textDim = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.5)';
  const textFaint = nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.38)';
  const isFree = status === 'free';
  const hasLocation = locations.length > 0;
  const [query, setQuery] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsDenied, setGpsDenied] = useState(false);
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
        // Dark sky places search is instant — no network call needed.
        const darkSkyResults = searchDarkSkyPlaces(q);

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

        const seen = new Set<string>(darkSkyResults.map(r => `${r.city}|${r.region}`));
        const cityResults = resolved.filter((r): r is SearchResult => {
          if (!r) return false;
          const k = `${r.city}|${r.region}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        const combined = [...darkSkyResults, ...cityResults];
        setResults(combined);
        if (combined.length === 0) setSearchError('No matches found.');
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
        setGpsDenied(true);
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
      const estimatedBortle = estimateBortle(pos.coords.latitude, pos.coords.longitude);

      const loc = mkLocFromPlace(city, region, estimatedBortle, pos.coords.latitude, pos.coords.longitude);
      const newIdx = locations.length;
      addLocation(loc);
      addFavorite(`${newIdx}-prime-prime`);
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
    const newIdx = locations.length;
    addLocation(loc);
    addFavorite(`${newIdx}-prime-prime`);
    router.back();
  }

  function handleSearchResult(r: SearchResult) {
    const alreadyAdded = locations.some(l => l.name === r.city);
    if (alreadyAdded) {
      Alert.alert('Already added', `${r.city} is already in your spots.`);
      return;
    }
    const loc = mkLocFromPlace(r.city, r.region, estimateBortle(r.latitude, r.longitude), r.latitude, r.longitude);
    const newIdx = locations.length;
    addLocation(loc);
    addFavorite(`${newIdx}-prime-prime`);
    router.back();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: containerBg }]}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Text style={[styles.backChev, { color: nvAccent }]}>‹</Text>
          <Text style={[styles.backLabel, { color: nvAccent }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: textPrimary }]}>Add a Spot</Text>
        <View style={styles.navRight} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SearchIcon />
          <TextInput
            style={[styles.searchInput, { color: textPrimary }]}
            placeholder="Search a place or park..."
            placeholderTextColor={textFaint}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="words"
          />
          {searching && <ActivityIndicator size="small" color={nvAccent} />}
        </View>

        {/* Use current location */}
        {gpsDenied ? (
          <View style={[styles.gpsRow, { backgroundColor: cardBg, borderColor: cardBorder, opacity: 0.55 }]}>
            <View style={[styles.gpsIconWrap, nightVision && { backgroundColor: 'rgba(224,120,48,0.12)' }]}>
              <GpsIcon color={textFaint} />
            </View>
            <View style={styles.gpsMain}>
              <Text style={[styles.gpsTitle, { color: textDim }]}>Location access denied</Text>
              <Text style={[styles.gpsSub, { color: textFaint }]}>Search for a city below to add a spot</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.gpsRow, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={isFree && hasLocation ? () => router.push('/paywall') : handleUseLocation}
            activeOpacity={0.8}
            disabled={gpsLoading}
          >
            <View style={[styles.gpsIconWrap, nightVision && { backgroundColor: 'rgba(224,120,48,0.12)' }]}>
              {gpsLoading
                ? <ActivityIndicator size="small" color={nvAccent} />
                : <GpsIcon color={nvAccent} />
              }
            </View>
            <View style={styles.gpsMain}>
              <Text style={[styles.gpsTitle, { color: textPrimary }]}>Use my current location</Text>
              <Text style={[styles.gpsSub, { color: textDim }]}>GPS · most accurate</Text>
            </View>
            {!gpsLoading && <Text style={[styles.gpsChev, { color: nvAccent }]}>›</Text>}
          </TouchableOpacity>
        )}

        {/* Free tier: upgrade banner for multiple spots */}
        {isFree && hasLocation && (
          <TouchableOpacity style={styles.upgradeBanner} activeOpacity={0.8} onPress={() => router.push('/paywall')}>
            <View style={styles.upgradeBannerMain}>
              <Text style={[styles.upgradeBannerTitle, { color: textPrimary }]}>⭐ Unlock multiple spots</Text>
              <Text style={[styles.upgradeBannerSub, { color: textDim }]}>Premium lets you save home, dark sites, and travel spots — switch between them instantly.</Text>
            </View>
            <Text style={[styles.upgradeBannerCta, { color: nvAccent }]}>Upgrade</Text>
          </TouchableOpacity>
        )}

        {showingSearch ? (
          <>
            <Text style={[styles.sectionLabel, { color: textFaint }]}>SEARCH RESULTS</Text>
            <View style={styles.placeList}>
              {results.length > 0 ? (
                results.map((r) => {
                  const added = locations.some(l => l.name === r.city);
                  const distMi = userCoords ? haversineMiles(userCoords.lat, userCoords.lon, r.latitude, r.longitude) : null;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      style={[styles.placeRow, { backgroundColor: cardBg, borderColor: cardBorder }, added && { borderColor: `${nvAccent}40`, backgroundColor: nightVision ? 'rgba(224,120,48,0.05)' : 'rgba(126,240,210,0.05)' }]}
                      activeOpacity={0.8}
                      onPress={() => isFree && hasLocation ? router.push('/paywall') : handleSearchResult(r)}
                    >
                      <View style={[styles.moonIcon, nightVision && { backgroundColor: 'rgba(224,120,48,0.07)' }]}>
                        <MoonIcon color={nvAccent} />
                      </View>
                      <View style={styles.placeMain}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.placeName, { color: textPrimary }]}>{r.city}</Text>
                          {r.isDarkSky && (
                            <View style={[styles.darkSkyBadge, { borderColor: `${nvAccent}60` }]}>
                              <Text style={[styles.darkSkyBadgeText, { color: nvAccent }]}>★ Dark Sky</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.placeMeta, { color: textDim }]}>
                          {r.region}{distMi !== null ? ` · ${formatMiles(distMi)}` : ''}
                        </Text>
                      </View>
                      {added && <CheckIcon size={16} color={nvAccent} strokeWidth={2.5} />}
                    </TouchableOpacity>
                  );
                })
              ) : (
                !searching && searchError && (
                  <Text style={[styles.searchEmptyText, { color: textFaint }]}>{searchError}</Text>
                )
              )}
            </View>
          </>
        ) : (
          <>
            {/* Dark-sky places nearby */}
            <Text style={[styles.sectionLabel, { color: textFaint }]}>DARK-SKY PLACES NEARBY</Text>

            <View style={styles.placeList}>
              {placesWithDistance.map((place, i) => {
                const added = locations.some(l => l.name === place.name);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.placeRow, { backgroundColor: cardBg, borderColor: cardBorder }, added && { borderColor: `${nvAccent}40`, backgroundColor: nightVision ? 'rgba(224,120,48,0.05)' : 'rgba(126,240,210,0.05)' }]}
                    activeOpacity={0.8}
                    onPress={() => isFree && hasLocation ? router.push('/paywall') : handleAddPlace(place)}
                  >
                    <View style={[styles.moonIcon, nightVision && { backgroundColor: 'rgba(224,120,48,0.07)' }]}>
                      <MoonIcon color={nvAccent} />
                    </View>
                    <View style={styles.placeMain}>
                      <Text style={[styles.placeName, { color: textPrimary }]}>{place.name}</Text>
                      <Text style={[styles.placeMeta, { color: textDim }]}>
                        {place.state}{place.distMi !== null ? ` · ${formatMiles(place.distMi)}` : ''}
                      </Text>
                    </View>
                    {added
                      ? <CheckIcon size={16} color={nvAccent} strokeWidth={2.5} />
                      : <Text style={[styles.placeBortle, { color: textFaint }]}>B{place.bortle}</Text>
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
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 70 },
  backChev: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 28, lineHeight: 32 },
  backLabel: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 15 },
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
    color: '#7ef0d2',
    flexShrink: 0,
  },

  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(126,240,210,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(126,240,210,0.25)',
    marginBottom: 24,
  },
  upgradeBannerMain: { flex: 1, gap: 3 },
  upgradeBannerTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  upgradeBannerSub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 16,
  },
  upgradeBannerCta: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
    color: '#7ef0d2',
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
    borderColor: '#7ef0d240',
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
  darkSkyBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  darkSkyBadgeText: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 10,
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
    color: '#7ef0d2',
    flexShrink: 0,
  },
});
