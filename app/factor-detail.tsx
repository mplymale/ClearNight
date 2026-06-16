import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { VERDICTS } from '../src/constants/verdicts';
import { useLocations } from '../src/context/LocationsContext';
import type { Location, DayForecast } from '../src/data/mockForecast';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_H = Math.round(SCREEN_H * 0.54);

// ── Bortle scale strip — class is fixed per location, so a 6-night bar
// chart of identical bars is meaningless. Show where it falls on 1–9 instead.

const BORTLE_STOPS: [number, string][] = [
  [0,    '#0a2a3a'], // 1 — excellent dark site
  [0.25, '#1f6e5c'], // 3 — rural
  [0.5,  '#c9a227'], // 5 — suburban
  [0.75, '#d96b2b'], // 7 — bright suburban/urban transition
  [1,    '#c9342f'], // 9 — inner city
];

const BORTLE_CLASS_NAMES: Record<number, string> = {
  1: 'Excellent dark site',
  2: 'Typical dark site',
  3: 'Rural sky',
  4: 'Rural/suburban',
  5: 'Suburban sky',
  6: 'Bright suburban',
  7: 'Suburban/urban',
  8: 'City sky',
  9: 'Inner-city sky',
};

function BortleScale({ bortle, accent }: { bortle: number; accent: string }) {
  const BAR_H = 14;
  const t = Math.max(0, Math.min(1, (bortle - 1) / 8));

  return (
    <View style={styles.bortleSection}>
      <Text style={styles.barsLabel}>WHERE THIS FALLS ON THE SCALE</Text>

      <View style={styles.bortleBarWrap}>
        <Svg width="100%" height={BAR_H} viewBox="0 0 300 14">
          <Defs>
            <LinearGradient id="bortleGrad" x1="0" y1="0" x2="1" y2="0">
              {BORTLE_STOPS.map(([offset, color], i) => (
                <Stop key={i} offset={offset} stopColor={color} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={300} height={14} rx={7} fill="url(#bortleGrad)" />
        </Svg>

        {/* Marker pinpointing this location's class */}
        <View
          style={[
            styles.bortleMarker,
            { left: `${t * 100}%` },
          ]}
        >
          <View style={[styles.bortleMarkerDot, { borderColor: accent }]} />
        </View>
      </View>

      <View style={styles.bortleEndLabels}>
        <Text style={styles.bortleEndLabel}>1 · Darkest</Text>
        <Text style={styles.bortleEndLabel}>9 · Brightest</Text>
      </View>

      {/* Full 1–9 legend with this location's class highlighted —
          scrollable as a safety net on shorter screens */}
      <ScrollView style={styles.bortleLegend} showsVerticalScrollIndicator={false}>
        {Array.from({ length: 9 }, (_, i) => i + 1).map((cls) => {
          const isSelected = cls === bortle;
          return (
            <View key={cls} style={styles.bortleLegendRow}>
              <Text style={[styles.bortleLegendNum, isSelected && { color: accent }]}>{cls}</Text>
              <Text style={[styles.bortleLegendName, isSelected && { color: '#fff', fontFamily: 'HankenGrotesk_600SemiBold' }]}>
                {BORTLE_CLASS_NAMES[cls]}
              </Text>
              {isSelected && <Text style={[styles.bortleLegendHere, { color: accent }]}>this spot</Text>}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── 6-night bar chart ─────────────────────────────────────────────────────────

function NightBars({
  days,
  getValue,
  accent,
  selectedIndex,
}: {
  days: DayForecast[];
  getValue: (d: DayForecast) => number; // 0–1 normalized
  accent: string;
  selectedIndex: number;
}) {
  const labels = days.map((d, i) => (i === 0 ? 'Now' : d.day));
  const BAR_MAX_H = 120;

  return (
    <View style={styles.barsSection}>
      <Text style={styles.barsLabel}>ACROSS THE NEXT 6 NIGHTS</Text>
      <View style={styles.bars}>
        {days.map((d, i) => {
          const pct = Math.max(0.04, getValue(d));
          const h = pct * BAR_MAX_H;
          const isSelected = i === selectedIndex;
          return (
            <View key={i} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: h,
                      backgroundColor: isSelected ? accent : 'rgba(255,255,255,0.12)',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barDay, isSelected && { color: '#fff', fontFamily: 'HankenGrotesk_600SemiBold' }]}>
                {labels[i]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Content per factor ────────────────────────────────────────────────────────

function getContent(
  factor: string,
  loc: Location,
  day: DayForecast,
  accent: string,
) {
  switch (factor) {
    case 'cloud': return {
      title: 'Cloud cover',
      valueLine: <Text style={[styles.headerValue, { color: accent }]}>{day.cloud}%</Text>,
      description: day.cloud < 15
        ? 'Skies are wide open — almost no cloud to block your targets.'
        : day.cloud < 40
        ? 'Mostly clear skies with some patchy cloud — good conditions overall.'
        : day.cloud < 65
        ? 'Significant cloud cover — observing will be interrupted frequently.'
        : 'Heavy overcast — observing not recommended tonight.',
      getValue: (d: typeof day) => d.cloud / 100,
    };

    case 'moon': return {
      title: 'Moonlight',
      valueLine: (
        <Text style={[styles.headerValue, { color: accent }]}>
          {day.moon}%{' '}
          <Text style={styles.headerValueSub}>· {day.moonPhase}</Text>
        </Text>
      ),
      description: day.moon < 20
        ? 'A thin moon means a properly dark sky for faint deep-sky objects.'
        : day.moon < 50
        ? 'Moderate moonlight — bright DSOs are fine, faint ones will suffer.'
        : day.moon < 80
        ? 'Bright moon will wash out most deep-sky targets tonight.'
        : 'Near-full moon — stick to the Moon itself, planets, and bright clusters.',
      getValue: (d: typeof day) => d.moon / 100,
    };

    case 'seeing': return {
      title: 'Seeing',
      valueLine: (
        <Text style={[styles.headerValue, { color: accent }]}>
          {day.seeingN}/5{' '}
          <Text style={styles.headerValueSub}>· {day.seeingWord}</Text>
        </Text>
      ),
      description: day.seeingN >= 4
        ? 'Steady atmosphere — stars hold tight, great for high magnification.'
        : day.seeingN === 3
        ? 'Average seeing — moderate detail on planets and double stars.'
        : 'Turbulent air — stick to wide-field and low-power views tonight.',
      getValue: (d: typeof day) => d.seeingN / 5,
    };

    case 'bortle': return {
      title: 'Light pollution',
      valueLine: <Text style={[styles.headerValue, { color: accent }]}>Class {day.bortle}</Text>,
      description: day.bortle <= 2
        ? 'A genuinely dark site — the Milky Way casts shadows here.'
        : day.bortle <= 4
        ? 'Good dark skies with some light pollution on the horizon.'
        : day.bortle <= 6
        ? 'Suburban skies — bright Messier objects are visible, faint ones are tough.'
        : 'Heavy light pollution — only the brightest objects are accessible.',
      getValue: (d: typeof day) => (10 - d.bortle) / 9,
    };

    default: return {
      title: factor,
      valueLine: null,
      description: '',
      getValue: () => 0,
    };
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function FactorDetailScreen() {
  const insets = useSafeAreaInsets();
  const { factor, locIndex, dayIndex } = useLocalSearchParams<{
    factor: string;
    locIndex: string;
    dayIndex: string;
  }>();

  const { locations } = useLocations();
  const loc = locations[Number(locIndex ?? 0)];
  const selectedDayIndex = Number(dayIndex ?? 0);
  const day = loc.days[selectedDayIndex];
  const accent = VERDICTS[day.verdict].accent;

  const { title, valueLine, description, getValue } = getContent(factor, loc, day, accent);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Tap-to-dismiss overlay with blur */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => router.back()}>
        <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
      </TouchableOpacity>

      {/* Sheet anchored to bottom */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header row */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          {valueLine}
        </View>

        {/* Description */}
        <Text style={styles.description}>{description}</Text>

        {/* Bortle is fixed per location — show where it falls on the 1–9
            scale instead of a 6-night bar chart of identical bars. Every
            other factor genuinely varies night to night, so keep those. */}
        {factor === 'bortle' ? (
          <BortleScale bortle={day.bortle} accent={accent} />
        ) : (
          <NightBars days={loc.days} getValue={getValue} accent={accent} selectedIndex={selectedDayIndex} />
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: SHEET_H,
  },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_H,
    backgroundColor: '#0e1420',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 14,
  },

  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'center',
    marginBottom: 22,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.3,
  },
  headerValue: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
    flexShrink: 1,
    textAlign: 'right',
  },
  headerValueSub: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
  },

  description: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 30,
  },

  bortleSection: {
    flex: 1,
  },
  bortleBarWrap: {
    position: 'relative',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  bortleMarker: {
    position: 'absolute',
    top: -3,
    marginLeft: -10,
    width: 20,
    alignItems: 'center',
  },
  bortleMarkerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0e1420',
    borderWidth: 3,
  },
  bortleEndLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  bortleEndLabel: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  bortleLegend: {
    flex: 1,
  },
  bortleLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 10,
  },
  bortleLegendNum: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    width: 16,
  },
  bortleLegendName: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    flex: 1,
  },
  bortleLegendHere: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  barsSection: {
    flex: 1,
  },
  barsLabel: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 16,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    flex: 1,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 8,
    minHeight: 4,
  },
  barDay: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
});
