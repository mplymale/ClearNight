import React from 'react';
import Svg, { Circle, Ellipse } from 'react-native-svg';

// Saturn-like glyph for the Planets preference card, replacing the 🪐
// color emoji that wasn't rendering reliably in this build.
export function RingedPlanetIcon({ size = 24, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={5} fill={color} />
      <Ellipse cx={12} cy={12} rx={10.5} ry={3} stroke={color} strokeWidth={1.4} />
    </Svg>
  );
}
