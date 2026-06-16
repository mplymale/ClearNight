import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { Verdict } from '../../constants/verdicts';
import { DayForecast, Location } from '../../data/mockForecast';
import { useNightVision, NV_ACCENT, NV_ACCENT_SOFT, NV_BORDER, NV_CARD } from '../../context/NightVisionContext';

function Compass({ deg, accent }: { deg: number; accent: string }) {
  return (
    <Svg viewBox="0 0 64 64" width={60} height={60} fill="none">
      <Circle cx={32} cy={32} r={27} stroke="rgba(255,255,255,0.16)" fill="rgba(255,255,255,0.04)" />
      {/* N label */}
      <SvgText
        x={32} y={11}
        textAnchor="middle"
        fontSize={9}
        fontWeight="600"
        fill="rgba(255,255,255,0.5)"
      >N</SvgText>
      {/* S label */}
      <SvgText
        x={32} y={59}
        textAnchor="middle"
        fontSize={9}
        fontWeight="600"
        fill="rgba(255,255,255,0.4)"
      >S</SvgText>
      {/* Needle */}
      <Path
        d="M32 14 L37 36 L32 31 L27 36 Z"
        fill={accent}
        transform={`rotate(${deg} 32 32)`}
      />
      <Circle cx={32} cy={32} r={2.4} fill={accent} />
    </Svg>
  );
}

interface Props {
  loc: Location;
  day: DayForecast;
  verdict: Verdict;
  locIndex: number;
}

export function PrimeTargetCard({ loc, day, verdict: v, locIndex }: Props) {
  const { nightVision } = useNightVision();
  const accent = nightVision ? NV_ACCENT : v.accent;
  const accentSoft = nightVision ? NV_ACCENT_SOFT : v.accentSoft;
  const cardBorder = nightVision ? NV_BORDER : (day.verdict === 'poor' ? 'rgba(255,255,255,0.1)' : v.accentSoft);
  const cardBg = nightVision ? NV_CARD : 'rgba(255,255,255,0.055)';
  const clouded = day.verdict === 'poor';

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: cardBorder, backgroundColor: cardBg }]}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/object-detail', params: { locIndex: String(locIndex), type: 'prime' } })}
    >
      {clouded ? (
        <View style={styles.main}>
          <Text style={styles.eyebrow}>PRIME TARGET</Text>
          <Text style={[styles.name, { color: 'rgba(255,255,255,0.55)' }]}>
            Clouded out
          </Text>
          <Text style={styles.sub}>
            {loc.prime.name} hidden behind {day.cloud}% cloud
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.main}>
            <Text style={[styles.eyebrow, { color: accent }]}>
              PRIME TARGET
            </Text>
            <Text style={styles.name}>{loc.prime.name}</Text>
            <Text style={styles.sub}>{loc.prime.sub}</Text>
            <Text style={styles.meta}>
              Visible{' '}
              <Text style={styles.metaBold}>{loc.prime.visible}</Text>
            </Text>
          </View>
          <View style={styles.compass}>
            <Compass deg={loc.prime.dirDeg} accent={accent} />
            <Text style={styles.dir}>{loc.prime.dir.split(' ')[0]}</Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: 18,
    marginTop: 20,
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
