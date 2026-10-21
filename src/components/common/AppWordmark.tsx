import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const LOGO = require('../../../assets/ClearNight-logo-transparent-new.png');
const ASPECT_RATIO = 789 / 187;

export function AppWordmark({ height = 32, style }: { height?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={LOGO}
      style={[{ width: height * ASPECT_RATIO, height }, style]}
      resizeMode="contain"
    />
  );
}
