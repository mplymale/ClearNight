import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Verdict } from '../../constants/verdicts';
import { DayForecast, Location } from '../../data/mockForecast';
import { useNightVision, NV_ACCENT, NV_TEXT, NV_TEXT_DIM, NV_TEXT_FAINT } from '../../context/NightVisionContext';
import { usePreferences, applyTimeFormat } from '../../context/PreferencesContext';

const ARC = { cx: 160, cy: 190, r: 133 };
const SVG_H = 199;

function polar(frac: number): [number, number] {
  const a = Math.PI * (1 - frac);
  return [ARC.cx + ARC.r * Math.cos(a), ARC.cy - ARC.r * Math.sin(a)];
}

function arcPath(f0: number, f1: number): string {
  const [x0, y0] = polar(f0);
  const [x1, y1] = polar(f1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A ${ARC.r} ${ARC.r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

interface Props {
  loc: Location;
  day: DayForecast;
  verdict: Verdict;
  freeMode?: boolean;
}

export function NightArc({ loc, day, verdict: v, freeMode = false }: Props) {
  const { nightVision } = useNightVision();
  const { use24h } = usePreferences();
  const fmt = (s: string) => applyTimeFormat(s, use24h);
  const accent = nightVision ? NV_ACCENT : v.accent;
  const textPrimary = nightVision ? NV_TEXT : '#fff';
  const textDim = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.6)';
  const textFaint = nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.45)';
  const capColor = nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.65)';
  const hasWin = !freeMode && !!day.window;
  const winEndpoints = hasWin && day.window
    ? [day.window.s, day.window.e].map((f) => polar(f))
    : [];

  return (
    <View style={styles.hero}>
      <Svg width="100%" height={SVG_H} viewBox={`0 0 320 199`} style={styles.arc}>
        <Defs>
          <LinearGradient id="winGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={accent} stopOpacity={0} />
            <Stop offset="50%" stopColor={accent} stopOpacity={1} />
            <Stop offset="100%" stopColor={accent} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path
          d={arcPath(0, 1)}
          stroke="rgba(255,255,255,0.13)"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
        {[0.25, 0.5, 0.75].map((t, i) => {
          const [cx, cy] = polar(t);
          return <Circle key={i} cx={cx} cy={cy} r={1.6} fill="rgba(255,255,255,0.3)" />;
        })}
        {hasWin && day.window && (
          <Path
            d={arcPath(day.window.s, day.window.e)}
            stroke="url(#winGrad)"
            strokeWidth={6}
            strokeLinecap="round"
            fill="none"
          />
        )}
        {winEndpoints.map(([cx, cy], i) => (
          <Circle key={i} cx={cx} cy={cy} r={4.5} fill={accent} />
        ))}
      </Svg>

      {/* Center content — inside the arc */}
      <View style={styles.arcCenter} pointerEvents="none">
        {freeMode ? (
          <>
            <Text style={[styles.arcCap, { color: capColor }]}>{v.label} Tonight</Text>
            <Text style={[styles.arcWinTime, { color: textPrimary }]}>{v.word}</Text>
            <Text style={[styles.arcSub, { color: textDim }]}>over {loc.name} · {day.cloud}% cloud</Text>
          </>
        ) : hasWin && day.window ? (
          <>
            <Text style={[styles.arcCap, { color: capColor }]}>{v.label} · Best Window</Text>
            <Text style={[styles.arcWinTime, { color: textPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {fmt(day.window.label)}
            </Text>
            <Text style={[styles.arcSub, { color: textDim }]}>{day.primeDark} of prime darkness · clear by {fmt(day.clearBy)}</Text>
          </>
        ) : (
          <>
            <Text style={[styles.arcCap, { color: capColor }]}>{v.label}</Text>
            <Text style={[styles.arcWinTime, { color: textPrimary }]}>No window</Text>
            <Text style={[styles.arcSub, { color: textDim }]}>{day.cloud}% cloud · {v.word.toLowerCase()} sky tonight</Text>
          </>
        )}
      </View>

      {/* Dusk / Dawn — pinned to bottom corners */}
      <View style={[styles.arcEnd, styles.arcEndLeft]} pointerEvents="none">
        <Text style={[styles.arcEndTime, { color: textPrimary }]}>{fmt(loc.dusk)}</Text>
        <Text style={[styles.arcEndLabel, { color: textFaint }]}>Dusk</Text>
      </View>
      <View style={[styles.arcEnd, styles.arcEndRight]} pointerEvents="none">
        <Text style={[styles.arcEndTime, { textAlign: 'right', color: textPrimary }]}>{fmt(loc.dawn)}</Text>
        <Text style={[styles.arcEndLabel, { textAlign: 'right', color: textFaint }]}>Dawn</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: 22,
    marginTop: -16,
    marginBottom: 8,
    position: 'relative',
  },
  arc: {
    width: '100%',
  },
  arcCenter: {
    position: 'absolute',
    left: 60,
    right: 60,
    bottom: 6,
    alignItems: 'center',
  },
  arcCap: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  arcWinTime: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: '#fff',
    marginTop: 2,
    marginBottom: 2,
    textAlign: 'center',
    width: '100%',
  },
  arcSub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 14,
    textAlign: 'center',
  },
  arcEnd: {
    position: 'absolute',
    bottom: 6,
  },
  arcEndLeft: {
    left: 2,
  },
  arcEndRight: {
    right: 2,
    alignItems: 'flex-end',
  },
  arcEndTime: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 17,
  },
  arcEndLabel: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
  },
});
