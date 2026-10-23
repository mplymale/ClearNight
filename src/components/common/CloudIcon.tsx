import React from 'react';
import Svg, { Path } from 'react-native-svg';

// Replaces the ☁ color emoji (default-emoji-presentation, same broken-glyph
// class as ⭐/🌌/🪐 in this build) wherever "clouded out" is shown.
export function CloudIcon({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 18a4.5 4.5 0 01-.5-8.98A5.5 5.5 0 0117 8.1 4 4 0 0116.5 18H7z"
        fill={color}
      />
    </Svg>
  );
}
