import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { VERDICTS } from '../src/constants/verdicts';
import { useLocations } from '../src/context/LocationsContext';
import { useNightVision, NV_ACCENT, NV_BORDER, NV_TEXT, NV_TEXT_DIM, NV_TEXT_FAINT } from '../src/context/NightVisionContext';
import { usePreferences, applyWindFormat, windLabel } from '../src/context/PreferencesContext';
import type { Location, DayForecast } from '../src/data/mockForecast';


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

      <View style={{ height: 14 }} />

      <View style={styles.bortleBarWrap}>
        {/* Gradient bar as a View so it fills container edge-to-edge with real borderRadius */}
        <LinearGradient
          colors={BORTLE_STOPS.map(([, color]) => color) as [string, string, ...string[]]}
          locations={BORTLE_STOPS.map(([offset]) => offset) as [number, number, ...number[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bortleBar}
        />
        {/* Star overlaid via SVG — viewBox 0-300 maps to the same width as the bar */}
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 300 34" preserveAspectRatio="none">
          <Path
            d={`M${t * 300},${17 - 10} C${t * 300 + 1.5},${17 - 3} ${t * 300 + 3},${17 - 1.5} ${t * 300 + 10},${17} C${t * 300 + 3},${17 + 1.5} ${t * 300 + 1.5},${17 + 3} ${t * 300},${17 + 10} C${t * 300 - 1.5},${17 + 3} ${t * 300 - 3},${17 + 1.5} ${t * 300 - 10},${17} C${t * 300 - 3},${17 - 1.5} ${t * 300 - 1.5},${17 - 3} ${t * 300},${17 - 10} Z`}
            fill="#ffffff"
          />
        </Svg>
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
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── 6-night bar chart ─────────────────────────────────────────────────────────

// Maps a 0–1 quality score: blue (best) → teal → red (worst)
function qualityColor(q: number): string {
  if (q >= 0.7) return '#8fd0ff'; // excellent — blue
  if (q >= 0.4) return '#7ef0d2'; // good — teal
  return '#e07878';               // poor — red
}

const TICKS = [
  { pct: 1.0, label: 'High' },
  { pct: 0.5, label: 'Mid' },
  { pct: 0.0, label: 'Low' },
];

function NightBars({
  days,
  getValue,
  getQuality,
  selectedIndex,
  caption,
  tickLabels,
}: {
  days: DayForecast[];
  getValue: (d: DayForecast) => number;
  getQuality: (d: DayForecast) => number;
  selectedIndex: number;
  caption?: string;
  tickLabels?: [string, string, string]; // top, mid, bottom
}) {
  const labels = days.map((d, i) => (i === 0 ? 'Now' : d.day));
  const BAR_MAX_H = 120;
  const ticks = tickLabels
    ? TICKS.map((t, i) => ({ ...t, label: tickLabels[i] }))
    : TICKS;

  return (
    <View style={styles.barsSection}>
      <View style={styles.barsLabelRow}>
        <Text style={styles.barsLabel}>ACROSS THE NEXT 6 NIGHTS</Text>
        {caption && <Text style={styles.barsCaption}>{caption}</Text>}
      </View>
      <View style={styles.barsChartRow}>
        {/* Y-axis ticks — yAxis is taller than BAR_MAX_H to give the top label room */}
        <View style={[styles.yAxis, { height: BAR_MAX_H + 14 }]}>
          {ticks.map(({ pct, label }) => {
            // Heavy sits 14px above bar top (the extra headroom); Clear sits at bar floor (14px up from view bottom)
            const bottom = 14 + pct * BAR_MAX_H;
            return (
              <View key={label} style={[styles.tickRow, { bottom }]}>
                <Text style={styles.tickLabel}>{label}</Text>
                <View style={styles.tickMark} />
              </View>
            );
          })}
        </View>
        {/* Bars */}
        <View style={styles.bars}>
          {days.map((d, i) => {
            const pct = Math.max(0.04, getValue(d));
            const h = pct * BAR_MAX_H;
            const isSelected = i === selectedIndex;
            const barColor = qualityColor(getQuality(d));
            return (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: h,
                        backgroundColor: barColor,
                        opacity: isSelected ? 1 : 0.3,
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
    </View>
  );
}

// ── Content per factor ────────────────────────────────────────────────────────

function getContent(
  factor: string,
  loc: Location,
  day: DayForecast,
  accent: string,
  useKnots: boolean,
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
      getQuality: (d: typeof day) => 1 - d.cloud / 100,
      caption: 'lower = clearer skies',
      tickLabels: ['Heavy', 'Partial', 'Clear'] as [string, string, string],
    };

    case 'moon': {
      const dark = 100 - day.moon;
      return {
        title: 'Moon darkness',
        valueLine: (
          <Text style={[styles.headerValue, { color: accent }]}>
            {dark}% dark{' '}
            <Text style={styles.headerValueSub}>· {day.moonPhase}</Text>
          </Text>
        ),
        description: dark >= 80
          ? 'Near-new moon — the sky is properly dark for faint deep-sky objects and the Milky Way.'
          : dark >= 50
          ? 'Mostly dark sky — bright DSOs and the Milky Way core are fine; faint targets may suffer a little.'
          : dark >= 20
          ? 'Bright moon will wash out most deep-sky targets tonight. Stick to clusters and bright nebulae.'
          : 'Near-full moon — best spent observing the Moon itself, planets, and bright double stars.',
        getValue: (d: DayForecast) => 1 - d.moon / 100,
        getQuality: (d: DayForecast) => 1 - d.moon / 100,
        caption: 'higher = darker sky = better',
        tickLabels: ['Fully dark', '50% dark', 'Full moon'] as [string, string, string],
      };
    }

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
      getQuality: (d: typeof day) => d.seeingN / 5,
      caption: 'higher = steadier air = better',
      tickLabels: ['5/5', '3/5', '1/5'] as [string, string, string],
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
      getQuality: (d: typeof day) => (10 - d.bortle) / 9,
      caption: undefined,
    };

    case 'wind': {
      const wind = applyWindFormat(day.windKmh ?? 0, useKnots);
      const label = windLabel(day.windKmh ?? 0);
      return {
        title: 'Wind',
        valueLine: (
          <Text style={[styles.headerValue, { color: accent }]}>
            {wind.value} {wind.unit}
            <Text style={styles.headerValueSub}> · {label}</Text>
          </Text>
        ),
        description: label === 'Calm'
          ? 'Near-still air — perfect for long exposures and high-magnification work. Scope will hold steady all night.'
          : label === 'Light'
          ? 'Light breeze with minimal impact on observing. Long exposures should be fine; scope is stable.'
          : label === 'Breezy'
          ? 'Moderate wind may cause occasional scope vibration. Keep exposures shorter and avoid high magnification.'
          : label === 'Windy'
          ? 'Strong wind will degrade seeing and shake the scope. Wide-field only; imaging will be difficult.'
          : 'Gusty conditions — not worth setting up. Wind will ruin exposures and make observing uncomfortable.',
        getValue: (d: DayForecast) => Math.min(1, (d.windKmh ?? 0) / 60),
        getQuality: (d: DayForecast) => Math.max(0, 1 - (d.windKmh ?? 0) / 60),
        caption: 'lower = calmer = better',
        tickLabels: ['Gusty', 'Breezy', 'Calm'] as [string, string, string],
      };
    }

    case 'humidity': {
      const h = day.humidity ?? 0;
      const p = day.precipProb ?? 0;
      const rainNote = p >= 60 ? ' Rain is likely tonight.' : p >= 30 ? ' Some chance of rain — keep an eye on conditions.' : '';
      return {
        title: 'Humidity & Rain',
        valueLine: (
          <Text style={[styles.headerValue, { color: accent }]}>
            {h}%{p > 0 ? ` · ${p}% rain` : ''}
          </Text>
        ),
        description: h < 40
          ? `Dry air tonight — excellent transparency and no risk of dew forming on your optics.${rainNote}`
          : h < 60
          ? `Moderate humidity. Atmospheric clarity is good; dew is unlikely but worth monitoring on longer sessions.${rainNote}`
          : h < 80
          ? `High humidity will reduce transparency and haze out faint targets. Dew heaters recommended if you have them.${rainNote}`
          : `Very high humidity — expect dew on optics and hazy skies. Transparency will be poor for deep-sky work.${rainNote}`,
        getValue: (d: DayForecast) => (d.humidity ?? 0) / 100,
        getQuality: (d: DayForecast) => 1 - (d.humidity ?? 0) / 100,
        caption: 'lower = drier = better',
        tickLabels: ['100%', '50%', '0%'] as [string, string, string],
      };
    }

    default: return {
      title: factor,
      valueLine: null,
      description: '',
      getValue: () => 0,
      getQuality: () => 0,
      caption: undefined,
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
  const { nightVision } = useNightVision();
  const { useKnots } = usePreferences();
  const loc = locations[Number(locIndex ?? 0)];
  const selectedDayIndex = Number(dayIndex ?? 0);
  const tonight = loc.days[0]; // header/description always show tonight
  const accent = nightVision ? NV_ACCENT : VERDICTS[tonight.verdict].accent;
  const sheetBg = nightVision ? '#1a0400' : '#0e1420';
  const handleBg = nightVision ? NV_BORDER : 'rgba(255,255,255,0.22)';
  const textPrimary = nightVision ? NV_TEXT : '#fff';
  const textDim = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.6)';
  const textFaint = nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.35)';

  const { title, valueLine, description, getValue, getQuality, caption, tickLabels } = getContent(factor, loc, tonight, accent, useKnots) as ReturnType<typeof getContent> & { tickLabels?: [string, string, string] };

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Tap-to-dismiss overlay with blur */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => router.back()}>
        <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
      </TouchableOpacity>

      {/* Sheet anchored to bottom */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24, backgroundColor: sheetBg }]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: handleBg }]} />

        {/* Header row */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>{title}</Text>
          {valueLine}
        </View>

        {/* Description */}
        <Text style={[styles.description, { color: textDim }]}>{description}</Text>

        {/* Bortle is fixed per location — show where it falls on the 1–9
            scale instead of a 6-night bar chart of identical bars. Every
            other factor genuinely varies night to night, so keep those. */}
        {factor === 'bortle' ? (
          <BortleScale bortle={tonight.bortle} accent={accent} />
        ) : (
          <NightBars days={loc.days} getValue={getValue} getQuality={getQuality} selectedIndex={selectedDayIndex} caption={caption} tickLabels={tickLabels} />
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
    height: 34,
  },
  bortleBar: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    left: 0,
    right: 0,
    borderRadius: 7,
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
  barsChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  yAxis: {
    position: 'relative',
    width: 36,
    flexShrink: 0,
  },
  tickRow: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  tickLabel: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 9,
    color: 'rgba(255,255,255,0.28)',
    textAlign: 'right',
  },
  tickMark: {
    width: 4,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  barsLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  barsLabel: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)',
  },
  barsCaption: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    flex: 1,
    height: 120 + 14,
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
