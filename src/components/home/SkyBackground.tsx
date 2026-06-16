import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect, Line } from 'react-native-svg';
import { VERDICTS, VerdictKey } from '../../constants/verdicts';
import { useNightVision, NV_SKY, NV_GLOW } from '../../context/NightVisionContext';

interface Props {
  verdictKey: VerdictKey;
}

// Lines repeat every LINE_SPACING px, so looping a translateY drift by exactly
// that distance is seamless — the reset is invisible since the pattern matches.
const LINE_SPACING = 9;

// Drift duration per verdict — lower = faster upward movement. Poor nights
// don't drift at all (still, washed-out sky). The gradient travels a much
// longer distance (one full screen height) per loop, so its duration is
// scaled up proportionally to read at the same perceived speed as the lines.
const LINE_DRIFT_DURATION: Record<VerdictKey, number | null> = {
  excellent: 1800,
  good: 2600,
  fair: 7000,
  poor: null,
};
const GRADIENT_DRIFT_DURATION: Record<VerdictKey, number | null> = {
  excellent: 6000,
  good: 9000,
  fair: 24000,
  poor: null,
};

function useDrift(duration: number | null, distance: number) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    value.setValue(0);
    if (!duration) return; // still — no drift

    const loop = Animated.loop(
      Animated.timing(value, {
        toValue: -distance,
        duration,
        easing: (t) => t, // linear
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [duration, distance]);

  return value;
}

export function SkyBackground({ verdictKey }: Props) {
  const { width, height } = useWindowDimensions();
  const { nightVision } = useNightVision();
  const v = VERDICTS[verdictKey];

  // Square side long enough that, once rotated 45°, it still fully covers
  // the screen — the diagonal of the viewport rectangle, plus a small buffer.
  const gradientTileSize = Math.ceil(Math.sqrt(width * width + height * height)) + 20;

  const lineShift = useDrift(LINE_DRIFT_DURATION[verdictKey], LINE_SPACING);
  const gradientShift = useDrift(GRADIENT_DRIFT_DURATION[verdictKey], gradientTileSize);

  // In night vision, swap the sky and glow to deep maroon
  const skyColors = nightVision ? NV_SKY : v.sky;
  // Mirror the 3-stop gradient (c1→c2→c3→c2→c1) so each `height`-tall copy
  // starts and ends on the same color. That's what makes the seam between
  // stacked copies disappear when the layer scrolls.
  const mirroredColors = [skyColors[0], skyColors[1], skyColors[2], skyColors[1], skyColors[0]] as [string, string, string, string, string];
  const mirroredLocations: [number, number, number, number, number] = [0, 0.26, 0.52, 0.78, 1];
  const rawGlow = nightVision ? NV_GLOW : v.glow;

  const glowMatch = rawGlow.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/);
  const glowRgb = glowMatch ? `rgb(${glowMatch[1]},${glowMatch[2]},${glowMatch[3]})` : '#ffffff';
  const glowOpacity = glowMatch ? parseFloat(glowMatch[4]) : 0;

  // Build diagonal line grid — 125° lines spaced 9px apart (matches prototype)
  const lineCount = Math.ceil((width + height) / 9) + 2;
  const lines = Array.from({ length: lineCount }, (_, i) => i * 9 - height);

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {/* Base sky gradient — the bands are horizontal in local space, but the
          whole tile is rotated 45° to match the line angle, so its drift
          (still a simple vertical translate, in local space) reads as
          diagonal motion on screen. Oversized + centered so the rotated
          square fully covers the rectangular viewport. */}
      <View
        style={{
          position: 'absolute',
          left: (width - gradientTileSize) / 2,
          top: (height - gradientTileSize) / 2,
          width: gradientTileSize,
          height: gradientTileSize,
          overflow: 'hidden',
          transform: [{ rotate: '45deg' }],
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: gradientTileSize,
            height: gradientTileSize * 2,
            transform: [{ translateY: gradientShift }],
          }}
        >
          <LinearGradient colors={mirroredColors} locations={mirroredLocations} style={{ width: gradientTileSize, height: gradientTileSize }} />
          <LinearGradient colors={mirroredColors} locations={mirroredLocations} style={{ width: gradientTileSize, height: gradientTileSize }} />
        </Animated.View>
      </View>

      {/* Faint diagonal line texture — drifts upward, speed tied to tonight's verdict */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ translateY: lineShift }] }]}
        pointerEvents="none"
      >
        <Svg
          style={StyleSheet.absoluteFill}
          width={width}
          height={height}
        >
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
      </Animated.View>

      {/* Radial glow — elliptical, centered behind the arc */}
      <Svg
        style={StyleSheet.absoluteFill}
        width={width}
        height={height}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient
            id="skyGlow"
            cx="50%"
            cy="42%"
            rx="65%"
            ry="48%"
            fx="50%"
            fy="42%"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor={glowRgb} stopOpacity={glowOpacity} />
            <Stop offset="100%" stopColor={glowRgb} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#skyGlow)" />
      </Svg>
    </View>
  );
}
