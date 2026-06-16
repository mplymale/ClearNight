import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface ThreshOption {
  key: string;
  label: string;
  sub: string;
  value: number;
  dot: string;
}

export const THRESH_OPTIONS: ThreshOption[] = [
  {
    key: 'any',
    label: 'Any clear night',
    sub: 'Workable conditions or better',
    value: 42,
    dot: '#ffce8f',
  },
  {
    key: 'good',
    label: 'Good nights',
    sub: 'Clearly favorable skies',
    value: 62,
    dot: '#7ef0d2',
  },
  {
    key: 'perfect',
    label: 'Perfect only',
    sub: 'Top-tier conditions, rare nights',
    value: 78,
    dot: '#8fd0ff',
  },
];

export function threshKeyFromValue(value: number): string {
  if (value >= 78) return 'perfect';
  if (value >= 62) return 'good';
  return 'any';
}

export function ThreshPreset({
  value,
  onChange,
  accent = '#7ef0d2',
}: {
  value: number;
  onChange: (v: number) => void;
  accent?: string;
}) {
  const current = threshKeyFromValue(value);

  return (
    <View style={styles.wrap}>
      {THRESH_OPTIONS.map((opt) => {
        const selected = current === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.card, selected && { borderColor: accent, backgroundColor: accent + '14' }]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.75}
          >
            <View style={[styles.dot, { backgroundColor: opt.dot }]} />
            <View style={styles.text}>
              <Text style={[styles.label, selected && { color: '#fff' }]}>{opt.label}</Text>
              <Text style={styles.sub}>{opt.sub}</Text>
            </View>
            {selected && (
              <View style={[styles.check, { borderColor: accent }]}>
                <View style={[styles.checkFill, { backgroundColor: accent }]} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  sub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.42)',
    lineHeight: 16,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
