import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppLogo } from '../src/components/common/AppLogo';
import { useLocations } from '../src/context/LocationsContext';

const LAUNCH_COUNT_KEY = 'clearnight:launchCount';

export default function IntroScreen() {
  const { locations, hydrated } = useLocations();
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const [timerDone, setTimerDone] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);

  // Animation sequence — runs once on mount regardless of hydration state.
  useEffect(() => {
    const wordIn = setTimeout(() => {
      Animated.timing(wordOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, 1000);

    const fadeOut = setTimeout(() => {
      Animated.timing(screenOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
    }, 2700);

    const done = setTimeout(() => setTimerDone(true), 3150);

    return () => {
      clearTimeout(wordIn);
      clearTimeout(fadeOut);
      clearTimeout(done);
    };
  }, []);

  // Resolve destination once hydrated — may fire before or after timerDone.
  useEffect(() => {
    if (!hydrated || destination) return;
    AsyncStorage.getItem(LAUNCH_COUNT_KEY)
      .then((raw) => {
        const count = raw ? Number(raw) : 0;
        AsyncStorage.setItem(LAUNCH_COUNT_KEY, String(count + 1)).catch(() => {});
        setDestination(count === 0 || locations.length === 0 ? '/onboarding' : '/(tabs)');
      })
      .catch(() => {
        setDestination(locations.length > 0 ? '/(tabs)' : '/onboarding');
      });
  }, [hydrated]);

  // Navigate only when both the animation has finished AND we know where to go.
  useEffect(() => {
    if (!timerDone || !destination) return;
    router.replace(destination as any);
  }, [timerDone, destination]);

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <LinearGradient colors={['#04060e', '#060d1a', '#081422']} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        <AppLogo size={240} animate />
        <Animated.Text style={[styles.wordmark, { opacity: wordOpacity }]}>
          ClearNight
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#04060e',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  wordmark: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 34,
    letterSpacing: -0.5,
    color: '#fff',
  },
});
