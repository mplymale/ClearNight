import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VERDICTS, VerdictKey } from '../../constants/verdicts';
import { DayForecast } from '../../data/mockForecast';
import { useNightVision, NV_ACCENT, NV_ACCENT_SOFT, NV_CHIP, NV_BORDER, NV_SKY } from '../../context/NightVisionContext';

interface Props {
  days: DayForecast[];
  selectedIndex: number;
  onSelect: (i: number) => void;
}

export function DayStrip({ days, selectedIndex, onSelect }: Props) {
  const { nightVision } = useNightVision();
  return (
    <View style={[styles.strip, nightVision && { backgroundColor: 'rgba(100,20,5,0.25)', borderColor: NV_BORDER }]}>
      {days.map((dd, i) => {
        const v = VERDICTS[dd.verdict as VerdictKey];
        const on = i === selectedIndex;
        const chip = nightVision ? NV_CHIP : v.chip;
        const accentSoft = nightVision ? NV_ACCENT_SOFT : v.accentSoft;
        const selectedBg = nightVision ? NV_SKY[0] : v.sky[1];
        return (
          <TouchableOpacity
            key={i}
            style={[
              styles.day,
              on && {
                backgroundColor: selectedBg,
                borderWidth: 1,
                borderColor: nightVision ? NV_BORDER : 'rgba(255,255,255,0.14)',
              },
            ]}
            onPress={() => onSelect(i)}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.badge,
                {
                  borderColor: chip,
                  backgroundColor: on ? accentSoft : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: on ? '#fff' : 'rgba(255,255,255,0.82)' },
                ]}
              >
                {dd.score}
              </Text>
            </View>
            <Text style={styles.dayLabel}>
              {dd.day === 'Tonight' ? 'Now' : dd.day}
            </Text>
            <View
              style={[
                styles.dot,
                { backgroundColor: chip, opacity: on ? 1 : 0.4 },
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: 4,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 8,
  },
  day: {
    flex: 1,
    borderRadius: 15,
    paddingTop: 12,
    paddingBottom: 11,
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
  },
  dayLabel: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.7)',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
