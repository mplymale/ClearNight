import React from 'react';
import Svg, { Polyline } from 'react-native-svg';

export function CheckIcon({ size = 12, color = '#04130f', strokeWidth = 2.5 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Polyline
        points="1.5,6 4.5,9.5 10.5,2.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
