import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { DayForecast } from '../../data/mockForecast';
import { useNightVision, NV_BORDER, NV_CARD } from '../../context/NightVisionContext';

interface ChipItem {
  key: string;
  label: string;
  value: number;
  unit: string;
}

interface Props {
  day: DayForecast;
  locIndex: number;
  dayIndex: number;
}

export function FactorChips({ day, locIndex, dayIndex }: Props) {
  const { nightVision } = useNightVision();
  const chipBorder = nightVision ? NV_BORDER : 'rgba(255,255,255,0.12)';
  const chipBg = nightVision ? NV_CARD : 'rgba(255,255,255,0.06)';
  const items: ChipItem[] = [
    { key: 'cloud',  label: 'Cloud',   value: day.cloud,   unit: '%'  },
    { key: 'moon',   label: 'Moon',    value: day.moon,    unit: '%'  },
    { key: 'seeing', label: 'Seeing',  value: day.seeingN, unit: '/5' },
    { key: 'bortle', label: 'Bortle',  value: day.bortle,  unit: ''   },
  ];

  return (
    <View style={styles.chips}>
      {items.map((it) => (
        <TouchableOpacity
          key={it.key}
          style={[styles.chip, { borderColor: chipBorder, backgroundColor: chipBg }]}
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/factor-detail', params: { factor: it.key, locIndex: String(locIndex), dayIndex: String(dayIndex) } })}
        >
          <Text style={styles.chipVal}>
            {it.value}
            <Text style={styles.chipUnit}>{it.unit}</Text>
          </Text>
          <Text style={styles.chipLabel}>{it.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingTop: 14,
    paddingBottom: 12,
    alignItems: 'center',
    gap: 3,
  },
  chipVal: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 26,
  },
  chipUnit: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13,
    opacity: 0.65,
  },
  chipLabel: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 10.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.6)',
  },
});
