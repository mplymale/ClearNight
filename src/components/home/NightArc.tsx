import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Verdict } from '../../constants/verdicts';
import { DayForecast, Location } from '../../data/mockForecast';
import { useNightVision, NV_ACCENT } from '../../context/NightVisionContext';

// Arc geometry — matches prototype exactly
const ARC = { cx: 160, cy: 120, r: 108 };

function polar(frac: number): [number, number] {
  const a = Math.PI * (1 - frac);
  return [ARC.cx + ARC.r * Math.cos(a), ARC.cy - ARC.r * Math.sin(a)];
}

function arcPath(f0: number, f1: number): string {
  const [x0, y0] = polar(f0);
  const [x1, y1] = polar(f1);
  // The whole arc only ever spans 180° (f: 0→1), so any sub-window's sweep
  // is always ≤180° — always take the minor arc. Using the major arc for
  // windows spanning more than half the span loops the path through the
  // invisible lower half of the circle, producing a stray diagonal line.
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
  const accent = nightVision ? NV_ACCENT : v.accent;
  const hasWin = !freeMode && !!day.window;
  const winEndpoints = hasWin && day.window
    ? [day.window.s, day.window.e].map((f) => polar(f))
    : [];

  const [leftX, leftY] = polar(0);
  const [rightX, rightY] = polar(1);

  return (
    <View style={styles.hero}>
      <Svg
        width="100%"
        height={168}
        viewBox="0 0 320 168"
        style={styles.arc}
      >
        <Defs>
          <LinearGradient id="winGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={accent} stopOpacity={0} />
            <Stop offset="50%" stopColor={accent} stopOpacity={1} />
            <Stop offset="100%" stopColor={accent} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Base arc */}
        <Path
          d={arcPath(0, 1)}
          stroke="rgba(255,255,255,0.13)"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />

        {/* Tick marks at quarter positions */}
        {[0.25, 0.5, 0.75].map((t, i) => {
          const [cx, cy] = polar(t);
          return (
            <Circle key={i} cx={cx} cy={cy} r={1.6} fill="rgba(255,255,255,0.3)" />
          );
        })}

        {/* Window arc — gradient fades to transparent at both ends for soft look */}
        {hasWin && day.window && (
          <Path
            d={arcPath(day.window.s, day.window.e)}
            stroke="url(#winGrad)"
            strokeWidth={6}
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Window endpoint dots */}
        {winEndpoints.map(([cx, cy], i) => (
          <Circle key={i} cx={cx} cy={cy} r={4.5} fill={accent} />
        ))}
      </Svg>

      {/* Dusk label — bottom left */}
      <View style={[styles.arcEnd, styles.arcEndLeft]}>
        <Text style={styles.arcEndTime}>{loc.dusk}</Text>
        <Text style={styles.arcEndLabel}>dusk</Text>
      </View>

      {/* Dawn label — bottom right */}
      <View style={[styles.arcEnd, styles.arcEndRight]}>
        <Text style={[styles.arcEndTime, { textAlign: 'right' }]}>{loc.dawn}</Text>
        <Text style={[styles.arcEndLabel, { textAlign: 'right' }]}>dawn</Text>
      </View>

      {/* Center overlay */}
      <View style={styles.arcCenter} pointerEvents="none">
        {freeMode ? (
          <>
            <Text style={[styles.arcCap, { color: 'rgba(255,255,255,0.65)' }]}>
              {v.label} TONIGHT
            </Text>
            <Text style={styles.arcWinTime}>{v.word}</Text>
            <Text style={styles.arcSub}>
              over {loc.name} · {day.cloud}% cloud
            </Text>
          </>
        ) : hasWin && day.window ? (
          <>
            <Text style={[styles.arcCap, { color: 'rgba(255,255,255,0.65)' }]}>
              {v.label} · BEST WINDOW
            </Text>
            <Text style={styles.arcWinTime}>{day.window.label}</Text>
            <Text style={styles.arcSub}>
              {day.primeDark} of prime darkness · clear by {day.clearBy}
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.arcCap, { color: 'rgba(255,255,255,0.65)' }]}>{v.label}</Text>
            <Text style={styles.arcWinTime}>No window</Text>
            <Text style={styles.arcSub}>
              {day.cloud}% cloud · {v.word.toLowerCase()} sky tonight
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: 22,
    marginTop: 4,
    height: 168,
    position: 'relative',
  },
  arc: {
    width: '100%',
    height: 168,
  },
  arcEnd: {
    position: 'absolute',
    bottom: 12,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 18,
  },
  arcEndLabel: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
  },
  arcCenter: {
    position: 'absolute',
    left: '50%' as unknown as number,
    top: 78,
    width: 240,
    transform: [{ translateX: -120 }],
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
    fontSize: 27,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: '#fff',
    marginTop: 3,
    marginBottom: 4,
    textAlign: 'center',
  },
  arcSub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 15,
    textAlign: 'center',
  },
});
