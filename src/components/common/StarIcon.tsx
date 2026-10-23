import React from 'react';
import Svg, { Path } from 'react-native-svg';

export function StarIcon({ size = 12, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.5l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.8l7.1-.7L12 2.5z"
        fill={color}
      />
    </Svg>
  );
}
