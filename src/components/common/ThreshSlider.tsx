import React, { useRef } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function verdictWordForThreshold(value: number): string {
  if (value >= 78) return 'Excellent';
  if (value >= 62) return 'Good';
  if (value >= 42) return 'Fair';
  return 'Any';
}

export function ThreshSlider({
  value,
  onChange,
  accent = '#7ef0d2',
}: {
  value: number;
  onChange: (v: number) => void;
  accent?: string;
}) {
  const trackWidth = useRef(0);
  const trackRef = useRef<View>(null);
  const startValue = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        startValue.current = value;
        // Also snap to tap position
        trackRef.current?.measure((_x, _y, _w, _h, px) => {
          const pct = Math.max(0, Math.min(1, (e.nativeEvent.pageX - px) / trackWidth.current));
          startValue.current = Math.round(pct * 100);
          onChange(startValue.current);
        });
      },
      onPanResponderMove: (_e, gs) => {
        const delta = (gs.dx / trackWidth.current) * 100;
        onChange(Math.round(Math.max(0, Math.min(100, startValue.current + delta))));
      },
    })
  ).current;

  const verdictLabel = verdictWordForThreshold(value);
  const knobLeft = trackWidth.current > 0 ? (value / 100) * trackWidth.current - 11 : 0;
  const fillWidth = trackWidth.current > 0 ? (value / 100) * trackWidth.current : 0;

  return (
    <View>
      <View
        ref={trackRef}
        style={styles.sliderTrack}
        onLayout={(e: LayoutChangeEvent) => {
          trackWidth.current = e.nativeEvent.layout.width;
        }}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={['#ffc27a', accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.sliderFill, { width: fillWidth }]}
          pointerEvents="none"
        />
        <View style={[styles.sliderKnob, { left: knobLeft }]} pointerEvents="none" />
      </View>
      <View style={styles.sliderScale}>
        <Text style={styles.sliderScaleText}>0</Text>
        <Text style={[styles.sliderScaleText, { color: accent }]}>
          {verdictLabel} · {value}+
        </Text>
        <Text style={styles.sliderScaleText}>100</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sliderTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 10,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  sliderKnob: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    marginLeft: -11,
    top: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderScaleText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.42)',
  },
});
