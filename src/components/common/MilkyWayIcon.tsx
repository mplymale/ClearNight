import React from 'react';
import Svg, { Ellipse, Circle } from 'react-native-svg';

// Simple galaxy-core glyph: a bright center with a soft spiral band —
// stands in for the Milky Way preference card, replacing the 🌌 color
// emoji that wasn't rendering reliably in this build.
export function MilkyWayIcon({ size = 24, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Ellipse cx={12} cy={12} rx={10.5} ry={4} stroke={color} strokeWidth={1.4} opacity={0.55} />
      <Ellipse cx={12} cy={12} rx={6.5} ry={2.4} stroke={color} strokeWidth={1.4} opacity={0.8} />
      <Circle cx={12} cy={12} r={2} fill={color} />
    </Svg>
  );
}
