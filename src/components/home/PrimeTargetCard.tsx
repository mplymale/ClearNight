import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { Verdict } from '../../constants/verdicts';
import { DayForecast, Location } from '../../data/mockForecast';
import { useNightVision, NV_ACCENT, NV_ACCENT_SOFT, NV_BORDER, NV_CARD } from '../../context/NightVisionContext';
import { useFavorites, favoritedObjectIndices } from '../../context/FavoritesContext';
import { useInterests } from '../../context/InterestsContext';
import { usePreferences, applyTimeFormat } from '../../context/PreferencesContext';

function Compass({ deg, accent }: { deg: number; accent: string }) {
  return (
    <Svg viewBox="0 0 64 64" width={60} height={60} fill="none">
      <Circle cx={32} cy={32} r={27} stroke="rgba(255,255,255,0.16)" fill="rgba(255,255,255,0.04)" />
      {/* N label */}
      <SvgText
        x={32} y={13}
        textAnchor="middle"
        fontSize={9}
        fontWeight="600"
        fill="rgba(255,255,255,0.5)"
      >N</SvgText>
      {/* S label */}
      <SvgText
        x={32} y={55}
        textAnchor="middle"
        fontSize={9}
        fontWeight="600"
        fill="rgba(255,255,255,0.4)"
      >S</SvgText>
      {/* Needle — kept short so its tip clears the N/S labels at any rotation */}
      <Path
        d="M32 18 L36 35 L32 30 L28 35 Z"
        fill={accent}
        transform={`rotate(${deg} 32 32)`}
      />
      <Circle cx={32} cy={32} r={2.4} fill={accent} />
    </Svg>
  );
}

interface TargetDisplay {
  name: string;
  sub: string;
  visible: string;
  dir: string;
  dirDeg: number;
}

interface TargetCardProps {
  eyebrow: string;
  display: TargetDisplay;
  accent: string;
  cardBorder: string;
  cardBg: string;
  clouded: boolean;
  cloudPct: number;
  onPress: () => void;
}

// Single object/prime-target card — reused for both the no-favorites
// fallback and each row in the favorited list below.
function TargetCard({ eyebrow, display, accent, cardBorder, cardBg, clouded, cloudPct, onPress }: TargetCardProps) {
  const { use24h } = usePreferences();
  const fmt = (s: string) => applyTimeFormat(s, use24h);
  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: cardBorder, backgroundColor: cardBg }]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {clouded ? (
        <View style={styles.main}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={[styles.name, { color: 'rgba(255,255,255,0.55)' }]}>
            Clouded out
          </Text>
          <Text style={styles.sub}>
            {display.name} hidden behind {cloudPct}% cloud
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.main}>
            <Text style={[styles.eyebrow, { color: accent }]}>{eyebrow}</Text>
            <Text style={styles.name}>{display.name}</Text>
            <Text style={styles.sub}>{display.sub}</Text>
            <Text style={styles.meta}>
              Visible{' '}
              <Text style={styles.metaBold}>{fmt(display.visible)}</Text>
            </Text>
          </View>
          <View style={styles.compass}>
            <Compass deg={display.dirDeg} accent={accent} />
            <Text style={styles.dir}>{display.dir.split(' ')[0]}</Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

interface Props {
  loc: Location;
  day: DayForecast;
  verdict: Verdict;
  locIndex: number;
  freeMode?: boolean;
}

// Shows every object favorited (starred) for this location — as many as the
// user has picked, each as its own card, stacked in the page's existing
// ScrollView so it naturally scrolls if there are more than fit on screen.
// Falls back to the location's single default prime target when nothing's
// been starred yet.
export function FeaturedTargets({ loc, day, verdict: v, locIndex, freeMode }: Props) {
  const { nightVision } = useNightVision();
  const { favorites } = useFavorites();
  const { interests } = useInterests();
  const accent = nightVision ? NV_ACCENT : v.accent;
  const cardBorder = nightVision ? NV_BORDER : (day.verdict === 'poor' ? 'rgba(255,255,255,0.1)' : v.accentSoft);
  const cardBg = nightVision ? NV_CARD : 'rgba(255,255,255,0.055)';
  const clouded = day.verdict === 'poor';

  // Free users always see just the prime target — no favorites, no sky objects
  if (freeMode) {
    const display = {
      name: loc.prime.name,
      sub: loc.prime.sub,
      visible: loc.prime.visible,
      dir: loc.prime.dir,
      dirDeg: loc.prime.dirDeg,
    };
    return (
      <View style={styles.list}>
        <TargetCard
          eyebrow="PRIME TARGET"
          display={display}
          accent={accent}
          cardBorder={cardBorder}
          cardBg={cardBg}
          clouded={clouded}
          cloudPct={day.cloud}
          onPress={() => router.push({ pathname: '/object-detail', params: { locIndex: String(locIndex), type: 'prime' } })}
        />
      </View>
    );
  }

  const favIndices = favoritedObjectIndices(favorites, locIndex);
  const primeFavorited = favorites.has(`${locIndex}-prime-prime`);

  // The galactic core has a fixed, recognizable `sub` — if `loc.prime` shows
  // something else, the core wasn't well-placed tonight and a different
  // object got promoted to prime instead.
  const coreIsUp = loc.prime.sub === 'Sagittarius · Galactic center';
  const hasCategory = (cat: string) => loc.objects.some((o) => o.category === cat);

  const emptyNotes: string[] = [];
  if (interests.milky && !coreIsUp) emptyNotes.push("Milky Way core isn't visible from here tonight.");
  if (interests.deep && !hasCategory('deep')) emptyNotes.push('No deep-sky targets cleared the horizon tonight.');
  if (interests.planets && !hasCategory('planets')) emptyNotes.push('No planets visible from here tonight.');
  if (interests.meteors && !hasCategory('meteors')) emptyNotes.push('No active meteor showers in your area tonight.');

  const EmptyNotes = emptyNotes.length > 0 ? (
    <View style={styles.notesWrap}>
      {emptyNotes.map((note) => (
        <Text key={note} style={styles.noteText}>{note}</Text>
      ))}
    </View>
  ) : null;

  // Nothing starred at all yet — fall back to the single default pick.
  if (favIndices.length === 0 && !primeFavorited) {
    const display = {
      name: loc.prime.name,
      sub: loc.prime.sub,
      visible: loc.prime.visible,
      dir: loc.prime.dir,
      dirDeg: loc.prime.dirDeg,
    };
    return (
      <View style={styles.list}>
        <TargetCard
          eyebrow="PRIME TARGET"
          display={display}
          accent={accent}
          cardBorder={cardBorder}
          cardBg={cardBg}
          clouded={clouded}
          cloudPct={day.cloud}
          onPress={() => router.push({ pathname: '/object-detail', params: { locIndex: String(locIndex), type: 'prime' } })}
        />
        {EmptyNotes}
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {/* The prime target (often the galactic core) only shows up here when
          it was explicitly starred — otherwise it's just the no-favorites
          fallback above, which doesn't apply once anything else is starred. */}
      {primeFavorited && (
        <TargetCard
          eyebrow="YOUR PICK"
          display={{
            name: loc.prime.name,
            sub: loc.prime.sub,
            visible: loc.prime.visible,
            dir: loc.prime.dir,
            dirDeg: loc.prime.dirDeg,
          }}
          accent={accent}
          cardBorder={cardBorder}
          cardBg={cardBg}
          clouded={clouded}
          cloudPct={day.cloud}
          onPress={() => router.push({ pathname: '/object-detail', params: { locIndex: String(locIndex), type: 'prime' } })}
        />
      )}
      {favIndices.map((objIndex) => {
        const obj = loc.objects[objIndex];
        const display = {
          name: obj.name,
          sub: `${obj.type} · ${obj.con}`,
          visible: obj.window,
          dir: obj.dirLabel,
          dirDeg: obj.dirDeg,
        };
        return (
          <TargetCard
            key={objIndex}
            eyebrow="YOUR PICK"
            display={display}
            accent={accent}
            cardBorder={cardBorder}
            cardBg={cardBg}
            clouded={clouded}
            cloudPct={day.cloud}
            onPress={() => router.push({ pathname: '/object-detail', params: { locIndex: String(locIndex), type: 'object', objIndex: String(objIndex) } })}
          />
        );
      })}
      {EmptyNotes}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    marginTop: 20,
  },
  notesWrap: {
    gap: 6,
    marginHorizontal: 18,
    paddingHorizontal: 4,
  },
  noteText: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.4)',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: 18,
    padding: 15,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
  },
  main: {
    flex: 1,
    gap: 1,
  },
  eyebrow: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.5)',
  },
  name: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: '#fff',
    marginTop: 3,
  },
  sub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  meta: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 6,
  },
  metaBold: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontWeight: '600',
    color: '#fff',
  },
  compass: {
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  dir: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.4,
  },
});
