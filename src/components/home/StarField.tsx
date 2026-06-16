import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface Props {
  intensity?: number;
  count?: number;
  seed?: number;
  twinkle?: boolean;
}

interface Star {
  x: number;
  y: number;
  r: number;
  opacity: number;
  duration: number;
  delay: number;
}

function TwinkleStar({ star }: { star: Star }) {
  const anim = useRef(new Animated.Value(star.opacity)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0,
          duration: star.duration,
          delay: star.delay,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: star.opacity,
          duration: star.duration,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${star.x}%` as unknown as number,
        top: `${star.y}%` as unknown as number,
        width: star.r * 2,
        height: star.r * 2,
        borderRadius: star.r,
        backgroundColor: '#fff',
        opacity: anim,
      }}
    />
  );
}

export function StarField({ intensity = 1, count = 46, seed = 1, twinkle = true }: Props) {
  const stars = useMemo<Star[]>(() => {
    let s = seed * 9301 + 49297;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    return Array.from({ length: count }, () => ({
      x: rnd() * 100,
      y: rnd() * 100,
      r: 0.5 + rnd() * 1.4,
      opacity: (0.25 + rnd() * 0.6) * intensity,
      duration: 1200 + rnd() * 1800,
      delay: rnd() * 2000,
    }));
  }, [count, seed, intensity]);

  if (intensity <= 0.02) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((st, i) =>
        twinkle ? (
          <TwinkleStar key={i} star={st} />
        ) : (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: `${st.x}%` as unknown as number,
              top: `${st.y}%` as unknown as number,
              width: st.r * 2,
              height: st.r * 2,
              borderRadius: st.r,
              backgroundColor: '#fff',
              opacity: st.opacity,
            }}
          />
        )
      )}
    </View>
  );
}
