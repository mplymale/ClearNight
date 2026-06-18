import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';

const ACCENT = '#7ef0d2';
const ACCENT_HI = '#bdf8e7';
const STAR_FILL = '#eafff9';
const HALO = '126,240,210';

function fmSmooth(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

function sparklePts(cx: number, cy: number, r: number, inner = r * 0.18): string {
  const i = inner;
  return [
    [cx, cy - r], [cx + i, cy - i], [cx + r, cy], [cx + i, cy + i],
    [cx, cy + r], [cx - i, cy + i], [cx - r, cy], [cx - i, cy - i],
  ].map((p) => p.join(',')).join(' ');
}

const CURVE_PTS = [
  { x: 12, y: 80 }, { x: 36, y: 64 }, { x: 60, y: 53 },
  { x: 86, y: 47 }, { x: 110, y: 45 },
];
const NOW_IDX = 2;
const PAST_PATH = fmSmooth(CURVE_PTS.slice(0, NOW_IDX + 1));
const FUTURE_PATH = fmSmooth(CURVE_PTS.slice(NOW_IDX));
const NOW = CURVE_PTS[NOW_IDX];

const FIELD = [
  { x: 22, y: 26, r: 1.1, a: 0.8, spark: true },
  { x: 46, y: 18, r: 0.8, a: 0.5, spark: false },
  { x: 84, y: 20, r: 1.0, a: 0.7, spark: true },
  { x: 102, y: 52, r: 0.8, a: 0.55, spark: false },
  { x: 16, y: 56, r: 0.8, a: 0.5, spark: false },
  { x: 68, y: 30, r: 0.8, a: 0.55, spark: false },
  { x: 36, y: 44, r: 0.6, a: 0.4, spark: false },
];

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function AppLogo({ size = 80, animate = true }: { size?: number; animate?: boolean }) {
  // non-native: line draw via strokeDashoffset (150 > any path length in 120×120 viewBox)
  const lineDraw = useRef(new Animated.Value(animate ? 150 : 0)).current;
  const nodesOpacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  // native: now star pop
  const nowOpacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const nowScale = useRef(new Animated.Value(animate ? 0.3 : 1)).current;

  useEffect(() => {
    if (!animate) return;
    Animated.sequence([
      // 1. draw the line
      Animated.timing(lineDraw, { toValue: 0, duration: 850, useNativeDriver: false }),
      // 2. fade in nodes
      Animated.timing(nodesOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
    ]).start(() => {
      // 3. pop in now star (native driver, starts after draw finishes)
      Animated.parallel([
        Animated.spring(nowScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
        Animated.timing(nowOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  return (
    <View style={{ width: size, height: size }}>
      {/* Layer 1 — star field + past trail */}
      <Svg width={size} height={size} viewBox="0 0 120 120" fill="none" style={StyleSheet.absoluteFill}>
        {FIELD.map((f, i) =>
          f.spark ? (
            <Polygon
              key={i}
              points={sparklePts(f.x, f.y, f.r + 0.6, (f.r + 0.6) * 0.34)}
              fill={i === 2 ? ACCENT_HI : '#fff'}
              opacity={f.a}
            />
          ) : (
            <Circle key={i} cx={f.x} cy={f.y} r={f.r} fill="#fff" opacity={f.a} />
          )
        )}
        <Path
          d={PAST_PATH}
          stroke={`rgba(${HALO},0.55)`}
          strokeWidth={2.2}
          strokeDasharray="0.12 5.4"
          strokeLinecap="round"
        />
      </Svg>

      {/* Layer 2 — future line draws in, then nodes fade in */}
      <Svg width={size} height={size} viewBox="0 0 120 120" fill="none" style={StyleSheet.absoluteFill}>
        {/* glow always follows the line */}
        <AnimatedPath
          d={FUTURE_PATH}
          stroke={`rgba(${HALO},0.18)`}
          strokeWidth={6.5}
          strokeLinecap="round"
          strokeDasharray={[150, 150]}
          strokeDashoffset={lineDraw}
        />
        <AnimatedPath
          d={FUTURE_PATH}
          stroke={ACCENT}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeDasharray={[150, 150]}
          strokeDashoffset={lineDraw}
        />
        {CURVE_PTS.map((p, i) =>
          i > NOW_IDX ? (
            <AnimatedPath
              key={i}
              d={`M ${p.x - 2.7} ${p.y} a 2.7 2.7 0 1 0 5.4 0 a 2.7 2.7 0 1 0 -5.4 0`}
              fill={ACCENT}
              opacity={nodesOpacity}
            />
          ) : null
        )}
      </Svg>

      {/* Layer 3 — now star pops in last */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: nowOpacity, transform: [{ scale: nowScale }] },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
          <Circle cx={NOW.x} cy={NOW.y} r={16.5} fill={`rgba(${HALO},0.16)`} />
          <Circle cx={NOW.x} cy={NOW.y} r={11} fill={`rgba(${HALO},0.26)`} />
          <Circle cx={NOW.x} cy={NOW.y} r={6.5} fill={`rgba(${HALO},0.4)`} />
          <Polygon points={sparklePts(NOW.x, NOW.y, 9.6)} fill={STAR_FILL} />
        </Svg>
      </Animated.View>
    </View>
  );
}
