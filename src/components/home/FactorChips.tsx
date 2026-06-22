import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { DayForecast } from '../../data/mockForecast';
import { useNightVision, NV_BORDER, NV_CARD, NV_TEXT, NV_TEXT_DIM } from '../../context/NightVisionContext';
import { usePreferences, applyWindFormat, windLabel } from '../../context/PreferencesContext';

interface Props {
  day: DayForecast;
  locIndex: number;
  dayIndex: number;
}

export function FactorChips({ day, locIndex, dayIndex }: Props) {
  const { nightVision } = useNightVision();
  const { useKnots } = usePreferences();
  const chipBorder = nightVision ? NV_BORDER : 'rgba(255,255,255,0.12)';
  const chipBg = nightVision ? NV_CARD : 'rgba(255,255,255,0.06)';
  const textPrimary = nightVision ? NV_TEXT : '#fff';
  const textDim = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.6)';

  const wind = applyWindFormat(day.windKmh ?? 0, useKnots);
  const wLabel = windLabel(day.windKmh ?? 0);

  const standardChips = [
    { key: 'cloud',  label: 'Cloud',   val: `${day.cloud}%`,        sub: null },
    { key: 'seeing', label: 'Seeing',  val: `${day.seeingN}`,       sub: '/5' },
    { key: 'bortle', label: 'Bortle',  val: `${day.bortle}`,        sub: null },
  ];

  return (
    <View style={styles.chips}>
      {standardChips.map((it) => (
        <TouchableOpacity
          key={it.key}
          style={[styles.chip, { borderColor: chipBorder, backgroundColor: chipBg }]}
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/factor-detail', params: { factor: it.key, locIndex: String(locIndex), dayIndex: String(dayIndex) } })}
        >
          <Text style={[styles.chipVal, { color: textPrimary }]}>
            {it.val}
            {it.sub && <Text style={styles.chipUnit}>{it.sub}</Text>}
          </Text>
          <Text style={[styles.chipLabel, { color: textDim }]}>{it.label}</Text>
        </TouchableOpacity>
      ))}

      {/* Wind chip */}
      <TouchableOpacity
        style={[styles.chip, { borderColor: chipBorder, backgroundColor: chipBg }]}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/factor-detail', params: { factor: 'wind', locIndex: String(locIndex), dayIndex: String(dayIndex) } })}
      >
        <Text style={[styles.chipVal, { color: textPrimary }]}>
          {wind.value}
          <Text style={styles.chipUnit}> {wind.unit}</Text>
        </Text>
        <Text style={[styles.chipLabel, { color: textDim }]}>Wind</Text>
      </TouchableOpacity>
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
