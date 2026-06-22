import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { DayForecast } from '../../data/mockForecast';
import { useNightVision, NV_BORDER, NV_CARD, NV_TEXT, NV_TEXT_DIM } from '../../context/NightVisionContext';

// SVG moon that actually draws the correct phase shape based on illumination
// and whether the moon is waxing or waning.
function MoonPhaseIcon({
  illumination,
  phaseName,
  size = 32,
  litColor,
  darkColor,
}: {
  illumination: number;
  phaseName: string;
  size?: number;
  litColor: string;
  darkColor: string;
}) {
  const R = size / 2 - 1;
  const cx = size / 2;
  const cy = size / 2;

  const isNew = phaseName === 'New moon';
  const isFull = phaseName === 'Full moon';
  const isWaxing =
    phaseName === 'Waxing crescent' ||
    phaseName === 'First quarter' ||
    phaseName === 'Waxing gibbous';

  if (isNew) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={R} fill={darkColor} />
        <Circle cx={cx} cy={cy} r={R} fill="none" stroke={litColor} strokeWidth={0.8} opacity={0.4} />
      </Svg>
    );
  }

  if (isFull) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={R} fill={litColor} />
      </Svg>
    );
  }

  // For crescent/quarter/gibbous: draw a dark disc then overlay the lit path.
  // The lit path is always the appropriate semicircle (left or right) plus an
  // elliptical terminator that creates the crescent or gibbous shape.
  //
  // Formula: terminator ellipse rx = R * |cos(π * illum)|
  //   • illum approaching 0 → rx = R (wide, crescent nearly invisible)
  //   • illum = 0.5         → rx = 0 (straight line = quarter)
  //   • illum approaching 1 → rx = R (wide, gibbous nearly full)
  //
  // termSweep = 0 for crescent, 1 for gibbous (controls which way the
  // ellipse bows — inward for crescent, outward for gibbous).
  const illum = illumination / 100;
  const termRx = Math.round(R * Math.abs(Math.cos(Math.PI * illum)));
  const termSweep = illum > 0.5 ? 1 : 0;
  const top = `${cx} ${cy - R}`;
  const bot = `${cx} ${cy + R}`;

  // Waxing: lit on right (CW semicircle). Waning: lit on left (CCW semicircle).
  const litPath = isWaxing
    ? `M ${top} A ${R} ${R} 0 0 1 ${bot} A ${termRx} ${R} 0 0 ${termSweep} ${top} Z`
    : `M ${top} A ${R} ${R} 0 0 0 ${bot} A ${termRx} ${R} 0 0 ${1 - termSweep} ${top} Z`;

  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={R} fill={darkColor} />
      <Path d={litPath} fill={litColor} />
    </Svg>
  );
}

// Water drop that fills from the bottom based on humidity (0–100)
function DropIcon({ color, humidity, size = 28 }: { color: string; humidity: number; size?: number }) {
  const fill = Math.max(0, Math.min(1, humidity / 100));
  const dropTop = 2, dropBot = 24;
  const clipY = dropTop + (1 - fill) * (dropBot - dropTop);
  const DROP = 'M12 2 C12 2 5 10 5 15 a7 7 0 0 0 14 0 C19 10 12 2 12 2Z';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <ClipPath id="drop-fill">
          <Rect x="0" y={clipY} width="24" height={24 - clipY} />
        </ClipPath>
      </Defs>
      {/* Empty shell */}
      <Path d={DROP} fill={color} opacity={0.18} />
      {/* Filled portion rising from the bottom */}
      <Path d={DROP} fill={color} opacity={0.85} clipPath="url(#drop-fill)" />
    </Svg>
  );
}

function humidityLabel(humidity: number, precipProb: number): string {
  if (precipProb >= 60) return 'Rainy';
  if (precipProb >= 30) return 'Showery';
  if (humidity >= 85) return 'Very humid';
  if (humidity >= 65) return 'Humid';
  if (humidity >= 40) return 'Comfortable';
  return 'Dry';
}

interface Props {
  day: DayForecast;
  locIndex: number;
  dayIndex: number;
}

export function MoonHumidityRow({ day, locIndex, dayIndex }: Props) {
  const { nightVision } = useNightVision();
  const cardBorder = nightVision ? NV_BORDER : 'rgba(255,255,255,0.12)';
  const cardBg = nightVision ? NV_CARD : 'rgba(255,255,255,0.06)';
  const textPrimary = nightVision ? NV_TEXT : '#fff';
  const textDim = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.6)';

  const litColor = nightVision ? 'rgba(224,140,80,0.9)' : 'rgba(255,240,200,0.92)';
  const darkColor = nightVision ? 'rgba(60,20,5,0.8)' : 'rgba(12,16,28,0.9)';
  const dropColor = nightVision ? 'rgba(200,120,60,0.75)' : 'rgba(140,200,255,0.75)';

  const params = { locIndex: String(locIndex), dayIndex: String(dayIndex) };

  return (
    <View style={styles.row}>
      {/* Moon phase card */}
      <TouchableOpacity
        style={[styles.card, { borderColor: cardBorder, backgroundColor: cardBg }]}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/factor-detail', params: { ...params, factor: 'moon' } })}
      >
        <MoonPhaseIcon
          illumination={day.moon}
          phaseName={day.moonPhase}
          size={34}
          litColor={litColor}
          darkColor={darkColor}
        />
        <View style={styles.cardText}>
          <Text style={[styles.cardLabel, { color: textPrimary }]}>{day.moonPhase}</Text>
          <Text style={[styles.cardSub, { color: textDim }]}>{100 - day.moon}% dark</Text>
        </View>
      </TouchableOpacity>

      {/* Humidity + Rain card */}
      <TouchableOpacity
        style={[styles.card, { borderColor: cardBorder, backgroundColor: cardBg }]}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/factor-detail', params: { ...params, factor: 'humidity' } })}
      >
        <DropIcon color={dropColor} humidity={day.humidity ?? 0} size={28} />
        <View style={styles.cardText}>
          <Text style={[styles.cardLabel, { color: textPrimary }]}>{humidityLabel(day.humidity ?? 0, day.precipProb ?? 0)}</Text>
          <Text style={[styles.cardSub, { color: textDim }]}>
            {day.humidity != null ? `${day.humidity}% humid` : '—'}
            {(day.precipProb ?? 0) > 0 && ` · ${day.precipProb}% rain`}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  cardText: {
    gap: 2,
  },
  cardLabel: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
  },
  cardSub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 10.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
