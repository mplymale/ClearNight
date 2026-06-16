import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const ACCENT = '#7ef0d2';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function sparklePath(cx: number, cy: number, r: number, k = r * 0.26): string {
  return `M ${cx} ${cy - r}
    C ${cx + k} ${cy - k}, ${cx + k} ${cy - k}, ${cx + r} ${cy}
    C ${cx + k} ${cy + k}, ${cx + k} ${cy + k}, ${cx} ${cy + r}
    C ${cx - k} ${cy + k}, ${cx - k} ${cy + k}, ${cx - r} ${cy}
    C ${cx - k} ${cy - k}, ${cx - k} ${cy - k}, ${cx} ${cy - r} Z`;
}

const CORE_X = 58;
const CORE_Y = 54;
const LINE_START = { x: 67, y: 49, r: 3.2 };
const LINE_END = { x: 89, y: 38, r: 4 };
const TRAIL_LENGTH = 30;
const TAIL_LARGE_R = [3.4, 2.7, 2.2, 1.7, 1.3, 1.0];
const TAIL_SMALL_R = [2.0, 1.6, 1.3, 1.0, 0.7];
const TAIL_START = { x: 50, y: 60 };
const TAIL_END = { x: 11, y: 87 };
const TAIL_POINTS = Array.from({ length: 11 }, (_, i) => {
  const t = i / 10;
  return {
    x: TAIL_START.x + (TAIL_END.x - TAIL_START.x) * t,
    y: TAIL_START.y + (TAIL_END.y - TAIL_START.y) * t,
    r: i % 2 === 0 ? TAIL_LARGE_R[i / 2] : TAIL_SMALL_R[(i - 1) / 2],
    opacity: 0.9 - 0.4 * t,
  };
});

export function AppLogo({ size = 80, animate = true }: { size?: number; animate?: boolean }) {
  const coreScale = useRef(new Animated.Value(animate ? 0.5 : 1)).current;
  const coreOpacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const lineDraw = useRef(new Animated.Value(animate ? TRAIL_LENGTH : 0)).current;
  const dotOpacity = useRef(new Animated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (!animate) return;
    Animated.sequence([
      Animated.parallel([
        Animated.spring(coreScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
        Animated.timing(coreOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(lineDraw, { toValue: 0, duration: 750, useNativeDriver: false }),
      Animated.timing(dotOpacity, { toValue: 1, duration: 350, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: coreScale }], opacity: coreOpacity }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Circle cx={14} cy={20} r={0.9} fill="#fff" opacity={0.55} />
        <Circle cx={30} cy={8} r={0.7} fill="#fff" opacity={0.4} />
        <Circle cx={6} cy={48} r={0.8} fill="#fff" opacity={0.45} />
        <Circle cx={78} cy={16} r={1.3} fill="#8fd0ff" opacity={0.6} />
        <Circle cx={92} cy={64} r={1.1} fill="#ffce8f" opacity={0.55} />
        <Path d={sparklePath(20, 30, 3.2)} fill="#fff" opacity={0.55} />
        <Path d={sparklePath(36, 14, 2.1)} fill="#fff" opacity={0.5} />
        <Path d={sparklePath(11, 60, 2.4)} fill="#fff" opacity={0.42} />
        <Path d={sparklePath(60, 8, 2.6)} fill="#fff" opacity={0.5} />
        <Circle cx={CORE_X} cy={CORE_Y} r={21} fill="rgba(126,240,210,0.12)" />
        <Circle cx={CORE_X} cy={CORE_Y} r={14} fill="rgba(126,240,210,0.22)" />
        {TAIL_POINTS.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill={ACCENT} opacity={p.opacity} />
        ))}
        <Circle cx={LINE_START.x} cy={LINE_START.y} r={LINE_START.r} fill={ACCENT} opacity={0.8} />
        <AnimatedPath
          d={`M ${LINE_START.x} ${LINE_START.y} Q 78 44 ${LINE_END.x} ${LINE_END.y}`}
          stroke={ACCENT}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={[TRAIL_LENGTH, TRAIL_LENGTH]}
          strokeDashoffset={lineDraw}
        />
        <AnimatedCircle cx={LINE_END.x} cy={LINE_END.y} r={LINE_END.r} fill={ACCENT} opacity={dotOpacity} />
        <AnimatedCircle cx={LINE_END.x - 1.7} cy={LINE_END.y - 1.8} r={1.3} fill="#fff" opacity={dotOpacity} />
        <Circle cx={CORE_X} cy={CORE_Y} r={8} fill="rgba(126,240,210,0.55)" />
        <Path d={sparklePath(CORE_X, CORE_Y, 9)} fill="#ffffff" />
      </Svg>
    </Animated.View>
  );
}
