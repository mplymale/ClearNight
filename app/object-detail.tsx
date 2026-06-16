import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { AltPoint } from '../src/data/mockForecast';
import { VERDICTS } from '../src/constants/verdicts';
import { usePlan } from '../src/context/PlanContext';
import { useLocations } from '../src/context/LocationsContext';

// ── Altitude chart ────────────────────────────────────────────────────────────

function AltChart({ points, accent }: { points: AltPoint[]; accent: string }) {
  const W = 280;
  const H = 110;
  const PAD = { top: 18, bottom: 28, left: 28, right: 8 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxAlt = Math.max(...points.map((p) => p.alt), 10);
  const scaleY = (alt: number) => PAD.top + chartH * (1 - alt / (maxAlt * 1.15));
  const scaleX = (i: number) => PAD.left + (i / (points.length - 1)) * chartW;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)} ${scaleY(p.alt).toFixed(1)}`)
    .join(' ');

  const peakIdx = points.reduce((best, p, i) => (p.alt > points[best].alt ? i : best), 0);
  const peakX = scaleX(peakIdx);
  const peakY = scaleY(points[peakIdx].alt);

  // Y-axis tick values
  const yTicks = [0, Math.round(maxAlt / 2), maxAlt];

  return (
    <Svg width={W} height={H}>
      {/* Y-axis ticks */}
      {yTicks.map((v) => (
        <SvgText
          key={v}
          x={PAD.left - 4}
          y={scaleY(v) + 4}
          textAnchor="end"
          fontSize={8}
          fill="rgba(255,255,255,0.35)"
        >
          {v}°
        </SvgText>
      ))}

      {/* Horizontal gridlines */}
      {yTicks.map((v) => (
        <Line
          key={v}
          x1={PAD.left}
          y1={scaleY(v)}
          x2={W - PAD.right}
          y2={scaleY(v)}
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={1}
        />
      ))}

      {/* Glow line (thick, dim) */}
      <Path
        d={pathD}
        stroke={accent}
        strokeWidth={8}
        strokeOpacity={0.15}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Main line */}
      <Path
        d={pathD}
        stroke={accent}
        strokeWidth={2}
        strokeOpacity={0.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Peak dot */}
      <Circle cx={peakX} cy={peakY} r={4} fill={accent} />

      {/* Peak label */}
      <SvgText
        x={peakX}
        y={peakY - 8}
        textAnchor="middle"
        fontSize={9}
        fontWeight="600"
        fill={accent}
      >
        {points[peakIdx].alt}°
      </SvgText>

      {/* X-axis labels */}
      {points.map((p, i) =>
        p.label ? (
          <SvgText
            key={i}
            x={scaleX(i)}
            y={H - 6}
            textAnchor="middle"
            fontSize={8}
            fill="rgba(255,255,255,0.4)"
          >
            {p.label}
          </SvgText>
        ) : null
      )}
    </Svg>
  );
}

// ── Compass ───────────────────────────────────────────────────────────────────

function Compass({ deg, accent }: { deg: number; accent: string }) {
  return (
    <Svg viewBox="0 0 64 64" width={56} height={56} fill="none">
      <Circle cx={32} cy={32} r={27} stroke="rgba(255,255,255,0.14)" fill="rgba(255,255,255,0.04)" />
      <SvgText x={32} y={11} textAnchor="middle" fontSize={9} fontWeight="600" fill="rgba(255,255,255,0.45)">N</SvgText>
      <SvgText x={32} y={59} textAnchor="middle" fontSize={9} fontWeight="600" fill="rgba(255,255,255,0.35)">S</SvgText>
      <Path d="M32 14 L37 36 L32 31 L27 36 Z" fill={accent} transform={`rotate(${deg} 32 32)`} />
      <Circle cx={32} cy={32} r={2.4} fill={accent} />
    </Svg>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ObjectDetailScreen() {
  const insets = useSafeAreaInsets();
  const { locIndex, type, objIndex } = useLocalSearchParams<{
    locIndex: string;
    type: 'prime' | 'object';
    objIndex?: string;
  }>();
  const { addToPlan, removeFromPlan, inPlan } = usePlan();
  const { locations } = useLocations();

  const loc = locations[Number(locIndex) ?? 0];
  const isPrime = type === 'prime';
  const obj = isPrime ? loc.prime : loc.objects[Number(objIndex)];
  const dayVerdict = loc.days[0].verdict;
  const v = VERDICTS[dayVerdict];
  const accent = v.accent;

  const planKey = `${locIndex}-${type}-${objIndex ?? 'prime'}`;
  const planned = inPlan(planKey);

  // Build detail fields from either prime or sky object
  const name = obj.name;
  const sub = isPrime ? (obj as typeof loc.prime).sub : `${(obj as typeof loc.objects[0]).type} · ${(obj as typeof loc.objects[0]).con}`;
  const window_ = isPrime ? (obj as typeof loc.prime).visible : (obj as typeof loc.objects[0]).window;
  const peakAlt = obj.peakAlt;
  const peakTime = obj.peakTime;
  const transit = obj.transit;
  const altCurve = obj.altCurve;
  const mag = isPrime ? '—' : String((obj as typeof loc.objects[0]).mag);
  const size = isPrime ? '—' : (obj as typeof loc.objects[0]).size;
  const dirLabel = isPrime ? (obj as typeof loc.prime).dir : (obj as typeof loc.objects[0]).dirLabel;
  const dirDeg = isPrime ? (obj as typeof loc.prime).dirDeg : (obj as typeof loc.objects[0]).dirDeg;
  const quality = isPrime ? v.label : (obj as typeof loc.objects[0]).quality.toUpperCase();

  // Hour bars for the best window (reuse first day hourly, show 7 bars)
  const hourBars = loc.days[0].hourly.slice(1, 8);
  const maxBar = Math.max(...hourBars);

  return (
    <LinearGradient colors={['#04060e', '#06121f', '#0a1e2e']} style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Nav */}
        <View style={styles.nav}>
          <TouchableOpacity style={styles.navBack} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.navBackChev}>‹</Text>
            <Text style={styles.navBackLabel}>Tonight</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navStar} activeOpacity={0.7}>
            <Text style={styles.navStarIcon}>☆</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: accent }]}>
            {isPrime ? 'PRIME TARGET' : (obj as typeof loc.objects[0]).type.toUpperCase()} · {quality}
          </Text>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.titleSub}>{sub}</Text>
        </View>

        {/* Altitude chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartLabel}>ALTITUDE TONIGHT</Text>
          <AltChart points={altCurve} accent={accent} />
        </View>

        {/* Best window card */}
        <View style={[styles.windowCard, { borderColor: accent + '55', backgroundColor: accent + '14' }]}>
          <Text style={[styles.windowLabel, { color: accent }]}>BEST WINDOW TONIGHT</Text>
          <Text style={styles.windowTime}>{window_}</Text>
          {/* Mini hour bars */}
          <View style={styles.miniBars}>
            {hourBars.map((v2, i) => (
              <View
                key={i}
                style={[styles.miniBar, {
                  height: Math.max(6, (v2 / maxBar) * 36),
                  backgroundColor: accent,
                  opacity: 0.5 + (v2 / maxBar) * 0.5,
                }]}
              />
            ))}
          </View>
        </View>

        {/* Stats 2×2 */}
        <View style={styles.statsGrid}>
          <StatCard label="PEAK ALTITUDE" value={`${peakAlt}°`} sub={`at ${peakTime}`} />
          <StatCard label="TRANSIT" value={transit.split(' ')[0]} sub={transit.split(' ').slice(1).join(' ')} />
          <StatCard label="MAGNITUDE" value={mag} />
          <StatCard label="APPARENT SIZE" value={size} />
        </View>

        {/* Direction */}
        <View style={styles.dirCard}>
          <View style={styles.dirLeft}>
            <Text style={styles.statLabel}>DIRECTION</Text>
            <Text style={styles.dirValue}>{dirLabel}</Text>
          </View>
          <Compass deg={dirDeg} accent={accent} />
        </View>
      </ScrollView>

      {/* Sticky bottom buttons */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.planBtn, planned && { borderColor: accent, backgroundColor: accent + '18' }]}
          onPress={() => planned ? removeFromPlan(planKey) : addToPlan(planKey)}
          activeOpacity={0.8}
        >
          <Text style={[styles.planBtnText, planned && { color: accent }]}>
            {planned ? '✓ In your plan' : 'Add to plan'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.alertBtn, { backgroundColor: accent }]} activeOpacity={0.8}>
          <Text style={[styles.alertBtnText, { color: '#04130f' }]}>Set alert</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 18 },

  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  navBack: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  navBackChev: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 20, color: '#7ef0d2', lineHeight: 24 },
  navBackLabel: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 15, color: '#7ef0d2' },
  navStar: { padding: 4 },
  navStarIcon: { fontSize: 20, color: 'rgba(255,255,255,0.5)' },

  header: { paddingTop: 8, paddingBottom: 18, gap: 3 },
  eyebrow: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 36,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  titleSub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },

  chartCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  chartLabel: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },

  windowCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  windowLabel: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  windowTime: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  miniBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 40,
  },
  miniBar: {
    flex: 1,
    borderRadius: 3,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    width: '47.5%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    gap: 2,
  },
  statLabel: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 9.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
  },
  statValue: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
    marginTop: 4,
  },
  statSub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.5)',
  },

  dirCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    marginBottom: 12,
  },
  dirLeft: { gap: 4 },
  dirValue: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
    marginTop: 4,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 14,
    backgroundColor: 'rgba(4,6,14,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  planBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
  },
  planBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  alertBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  alertBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
  },
});
