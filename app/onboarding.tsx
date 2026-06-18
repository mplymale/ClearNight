import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import * as Location from 'expo-location';
import { StarField } from '../src/components/home/StarField';
import { useLocations } from '../src/context/LocationsContext';
import { useFavorites } from '../src/context/FavoritesContext';
import { useInterests } from '../src/context/InterestsContext';
import { mkLocFromPlace } from '../src/data/mockForecast';
import { DARK_SKY_PLACES } from '../src/data/darkSkyPlaces';
import { haversineMiles, formatMiles } from '../src/services/geo';
import { estimateBortle } from '../src/services/bortleEstimate';
import { getNightBounds } from '../src/services/moon';
import { computeTonightsSky } from '../src/services/skyObjects';
import { CheckIcon } from '../src/components/common/CheckIcon';
import { AppLogo } from '../src/components/common/AppLogo';

const ACCENT = '#7ef0d2';
const ACCENT_SOFT = 'rgba(126,240,210,0.14)';
const SKY: [string, string, string] = ['#04060e', '#061520', '#0a2030'];

// ── Background: gradient + faint diagonal line texture ─────────────────────────

function ObBackground() {
  const { width, height } = useWindowDimensions();
  const lineCount = Math.ceil((width + height) / 9) + 2;
  const lines = Array.from({ length: lineCount }, (_, i) => i * 9 - height);

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={SKY} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
        {lines.map((offset, i) => (
          <Line
            key={i}
            x1={offset}
            y1={0}
            x2={offset + height}
            y2={height}
            stroke="rgba(255,255,255,0.018)"
            strokeWidth={1}
          />
        ))}
      </Svg>
    </View>
  );
}

// ── Staggered fade-up entrance wrapper ──────────────────────────────────────────

function FadeInUp({
  delay = 0,
  style,
  children,
}: {
  delay?: number;
  style?: any;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 700, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, useNativeDriver: true, tension: 36, friction: 11 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────


function SearchIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 17 17" fill="none">
      <Circle cx={7.5} cy={7.5} r={5.5} stroke="rgba(255,255,255,0.5)" strokeWidth={1.6} />
      <Path d="M11.5 11.5 L15 15" stroke="rgba(255,255,255,0.5)" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function LocationArrow() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11.5L21 3L12.5 21L10.5 13.5L3 11.5Z" fill="#04130f" />
    </Svg>
  );
}

// ── Progress dots ─────────────────────────────────────────────────────────────

function Dots({ step }: { step: number }) {
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === step && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

// ── Preference cards ──────────────────────────────────────────────────────────

const PREFS = [
  { k: 'milky',   emoji: '🌌', name: 'Milky Way',  sub: 'Wide-field core season' },
  { k: 'deep',    emoji: '✦',  name: 'Deep sky',   sub: 'Nebulae & galaxies' },
  { k: 'planets', emoji: '🪐', name: 'Planets',    sub: 'Moon, Jupiter, Saturn' },
  { k: 'meteors', emoji: '☄',  name: 'Meteors',    sub: 'Showers & fireballs' },
];

// ── Suggested locations ───────────────────────────────────────────────────────

const SUGGESTIONS = [
  { name: 'Cherry Springs', meta: 'Pennsylvania · Bortle 2' },
  { name: 'Big Bend NP',    meta: 'Texas · Bortle 1' },
];

// ── Step 0 — Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <ObBackground />
      <StarField intensity={1} count={40} seed={7} twinkle />
      <View style={[styles.ob, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        {/* Top: brand + copy */}
        <View style={styles.obTop}>
          <View style={styles.brand}>
            <AppLogo size={90} animate />
            <FadeInUp delay={500}>
              <Text style={styles.brandWord}>
                Clear<Text style={styles.brandWordFaded}>Night</Text>
              </Text>
            </FadeInUp>
          </View>
          <FadeInUp delay={750}>
            <Text style={styles.obTitle}>Plan your{'\n'}night sky.</Text>
          </FadeInUp>
          <FadeInUp delay={1000}>
            <Text style={styles.obBody}>
              Know before you go. Get a complete forecast for stargazing and astrophotography in a single view.
            </Text>
          </FadeInUp>
        </View>

        {/* Bottom: CTA + dots */}
        <FadeInUp delay={1300} style={styles.obFoot}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onNext} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Get started</Text>
          </TouchableOpacity>
          <Dots step={0} />
        </FadeInUp>
      </View>
    </View>
  );
}

// ── Step 1 — Location ─────────────────────────────────────────────────────────

const NEARBY_SUGGESTION_COUNT = 2;

interface SearchResult {
  key: string;
  city: string;
  region: string;
  meta: string;
  latitude: number;
  longitude: number;
}

function StepLocation({ onNext }: { onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const { addLocation } = useLocations();
  const [gpsLoading, setGpsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchSeq = useRef(0);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Quietly use a GPS fix if permission was already granted from a previous
  // session — never prompt here, since "Use my current location" below is
  // the explicit ask. Without permission, suggestions just stay unsorted.
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
          }
        }
      } catch {
        // no permission yet — fine, suggestions fall back to default order
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const nearbySuggestions = DARK_SKY_PLACES
    .map(p => ({
      ...p,
      distMi: userCoords ? haversineMiles(userCoords.lat, userCoords.lon, p.lat, p.lon) : null,
    }))
    .sort((a, b) => (a.distMi ?? Infinity) - (b.distMi ?? Infinity))
    .slice(0, NEARBY_SUGGESTION_COUNT);

  // Debounced geocode search — expo-location's geocodeAsync resolves a
  // free-text query to coordinates, then we reverse-geocode each match
  // to get back a human-readable city/region for display.
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
        if (searchSeq.current !== mySeq) return; // a newer query superseded this one

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
              return { key: `${m.latitude},${m.longitude}`, city, region, meta: region, latitude: m.latitude, longitude: m.longitude };
            } catch {
              return null;
            }
          })
        );
        if (searchSeq.current !== mySeq) return;

        // De-dupe by city+region
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

  async function handleGPS() {
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
      const bortle = estimateBortle(pos.coords.latitude, pos.coords.longitude);
      addLocation(mkLocFromPlace(city, region, bortle, pos.coords.latitude, pos.coords.longitude));
      onNext();
    } catch {
      Alert.alert('Error', 'Could not get your location. Please try again.');
    } finally {
      setGpsLoading(false);
    }
  }

  function handleSuggestion(s: typeof nearbySuggestions[0]) {
    addLocation(mkLocFromPlace(s.name, s.state, s.bortle, s.lat, s.lon));
    onNext();
  }

  function handleSearchResult(r: SearchResult) {
    addLocation(mkLocFromPlace(r.city, r.region, estimateBortle(r.latitude, r.longitude), r.latitude, r.longitude));
    onNext();
  }

  const showingSearch = query.trim().length >= 2;

  return (
    <View style={styles.page}>
      <ObBackground />
      <StarField intensity={0.9} count={36} seed={9} />
      <FadeInUp
        style={[styles.ob, styles.obStart, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}
      >
        <Text style={styles.kicker}>Step 1 of 2</Text>
        <Text style={[styles.obTitle, styles.obTitleSm]}>Where do you{'\n'}watch from?</Text>
        <Text style={styles.obBody}>
          We'll forecast the sky for this exact spot. You can add more later.
        </Text>

        {/* Use current location */}
        <TouchableOpacity
          style={[styles.primaryBtn, styles.locBtn, gpsLoading && styles.btnDisabled]}
          onPress={handleGPS}
          activeOpacity={0.85}
          disabled={gpsLoading}
        >
          {gpsLoading
            ? <ActivityIndicator size="small" color="#1a2e28" />
            : <LocationArrow />
          }
          <Text style={styles.primaryBtnText}>Use my current location</Text>
        </TouchableOpacity>

        {/* Or divider */}
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.orLine} />
        </View>

        {/* Search box */}
        <View style={styles.searchBox}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder="Search a place or park…"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="words"
          />
          {searching && <ActivityIndicator size="small" color={ACCENT} />}
        </View>

        {/* Live search results (city/place geocoding) or fallback dark-sky suggestions */}
        <View style={styles.resultList}>
          {showingSearch ? (
            results.length > 0 ? (
              results.map((r) => (
                <TouchableOpacity key={r.key} style={styles.resultRow} onPress={() => handleSearchResult(r)} activeOpacity={0.8}>
                  <View style={styles.resultPin}>
                    <Text style={{ color: ACCENT, fontSize: 14 }}>◐</Text>
                  </View>
                  <View style={styles.resultMain}>
                    <Text style={styles.resultName}>{r.city}</Text>
                    <Text style={styles.resultMeta}>{r.meta}</Text>
                  </View>
                  <Text style={[styles.resultPlus, { color: ACCENT }]}>+</Text>
                </TouchableOpacity>
              ))
            ) : (
              !searching && searchError && (
                <Text style={styles.searchEmptyText}>{searchError}</Text>
              )
            )
          ) : (
            nearbySuggestions.map((s) => (
              <TouchableOpacity key={s.name} style={styles.resultRow} onPress={() => handleSuggestion(s)} activeOpacity={0.8}>
                <View style={styles.resultPin}>
                  <Text style={{ color: ACCENT, fontSize: 14 }}>◐</Text>
                </View>
                <View style={styles.resultMain}>
                  <Text style={styles.resultName}>{s.name}</Text>
                  <Text style={styles.resultMeta}>
                    {s.state} · Bortle {s.bortle}{s.distMi !== null ? ` · ${formatMiles(s.distMi)}` : ''}
                  </Text>
                </View>
                <Text style={[styles.resultPlus, { color: ACCENT }]}>+</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={[styles.obFoot, { marginTop: 'auto' }]}>
          <Dots step={1} />
        </View>
      </FadeInUp>
    </View>
  );
}

// ── Step 2 — Interests ────────────────────────────────────────────────────────

function StepInterests({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { locations } = useLocations();
  const { addFavorite } = useFavorites();
  const { setInterests } = useInterests();
  const [selected, setSelected] = useState<Record<string, boolean>>({
    milky: true, deep: true, planets: false, meteors: false,
  });

  const toggle = (k: string) => setSelected((p) => ({ ...p, [k]: !p[k] }));

  function handleDone() {
    // The spot added in the previous step is the most recently appended one.
    const locIndex = locations.length - 1;
    const loc = locations[locIndex];
    if (loc) {
      if (selected.milky) {
        addFavorite(`${locIndex}-prime-prime`);
      }
      if (selected.deep || selected.planets || selected.meteors) {
        // Compute the *real* tonight's sky here (pure math, no network) so
        // we favorite the same objects/indices the location will settle on
        // once its real forecast loads — not the temporary placeholder data.
        const bounds = getNightBounds(new Date(), loc.latitude, loc.longitude);
        const sky = computeTonightsSky(loc.latitude, loc.longitude, loc.bortle, bounds.duskUtcMs, bounds.dawnUtcMs);
        sky.objects.forEach((obj, i) => {
          if (obj.category === 'deep' && selected.deep) addFavorite(`${locIndex}-object-${i}`);
          if (obj.category === 'planets' && selected.planets) addFavorite(`${locIndex}-object-${i}`);
          if (obj.category === 'meteors' && selected.meteors) addFavorite(`${locIndex}-object-${i}`);
        });
      }
    }
    setInterests({
      milky: !!selected.milky,
      deep: !!selected.deep,
      planets: !!selected.planets,
      meteors: !!selected.meteors,
    });
    onDone();
  }

  return (
    <View style={styles.page}>
      <ObBackground />
      <StarField intensity={1} count={40} seed={11} />
      <FadeInUp
        style={[styles.ob, styles.obStart, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}
      >
        <Text style={styles.kicker}>Step 2 of 2</Text>
        <Text style={[styles.obTitle, styles.obTitleSm]}>What do you{'\n'}chase?</Text>
        <Text style={styles.obBody}>
          Pick a few. We'll surface the right targets and only ping you when they're up.
        </Text>

        {/* 2×2 preference grid */}
        <View style={styles.prefGrid}>
          {PREFS.map((p) => {
            const on = selected[p.k];
            return (
              <TouchableOpacity
                key={p.k}
                style={[styles.pref, on && { borderColor: ACCENT, backgroundColor: ACCENT_SOFT }]}
                onPress={() => toggle(p.k)}
                activeOpacity={0.8}
              >
                {/* Check circle */}
                <View style={[styles.prefCheck, on && { backgroundColor: ACCENT, borderColor: ACCENT }]}>
                  {on && <CheckIcon size={12} color="#04130f" strokeWidth={2.8} />}
                </View>
                <Text style={styles.prefEmoji}>{p.emoji}</Text>
                <Text style={styles.prefName}>{p.name}</Text>
                <Text style={styles.prefSub}>{p.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.obFoot}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleDone} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Show me tonight</Text>
          </TouchableOpacity>
          <Dots step={2} />
        </View>
      </FadeInUp>
    </View>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);

  if (step === 0) return <StepWelcome onNext={() => setStep(1)} />;
  if (step === 1) return <StepLocation onNext={() => setStep(2)} />;
  return <StepInterests onDone={() => router.replace('/(tabs)')} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: { flex: 1 },

  ob: {
    flex: 1,
    paddingHorizontal: 26,
    zIndex: 3,
  },
  obStart: {
    justifyContent: 'flex-start',
  },
  obTop: {
    flex: 1,
    justifyContent: 'center',
  },

  brand: {
    alignItems: 'flex-start',
    gap: 2,
    marginBottom: 28,
  },
  brandWord: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#fff',
    lineHeight: 34,
  },
  brandWordFaded: {
    opacity: 0.5,
  },

  kicker: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: ACCENT,
    marginBottom: 10,
  },

  obTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 38,
    fontWeight: '600',
    letterSpacing: -0.7,
    lineHeight: 42,
    color: '#fff',
    marginBottom: 14,
  },
  obTitleSm: {
    fontSize: 30,
    lineHeight: 34,
    marginTop: 4,
  },
  obBody: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 15.5,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.65)',
    maxWidth: 300,
    marginBottom: 28,
  },

  obFoot: {
    paddingVertical: 22,
    gap: 16,
    flexShrink: 0,
  },

  // Dots
  dots: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: 22,
    backgroundColor: ACCENT,
  },

  // Buttons
  primaryBtn: {
    borderRadius: 999,
    backgroundColor: ACCENT,
    paddingVertical: 17,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2e28',
  },
  locBtn: {
    marginBottom: 0,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Or divider
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 18,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  orText: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 10,
  },
  searchPlaceholder: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 15,
    color: '#fff',
  },
  searchEmptyText: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Results
  resultList: { gap: 10 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  resultPin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resultMain: { flex: 1 },
  resultName: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  resultMeta: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  resultPlus: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 20,
    fontWeight: '600',
  },

  // Pref grid
  prefGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  pref: {
    width: '47%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 18,
    paddingHorizontal: 16,
    gap: 8,
    position: 'relative',
  },
  prefCheck: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefCheckMark: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    fontWeight: '700',
    color: '#04130f',
    lineHeight: 13,
  },
  prefEmoji: { fontSize: 24 },
  prefName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  prefSub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 15,
  },
});
