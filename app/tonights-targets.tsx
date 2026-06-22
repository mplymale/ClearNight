import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VERDICTS } from '../src/constants/verdicts';
import { useLocations } from '../src/context/LocationsContext';
import { useFavorites } from '../src/context/FavoritesContext';
import { usePreferences, applyTimeFormat } from '../src/context/PreferencesContext';
import { useNightVision, NV_ACCENT, NV_BORDER, NV_CARD, NV_TEXT, NV_TEXT_DIM, NV_TEXT_FAINT } from '../src/context/NightVisionContext';
import { SkyObject } from '../src/data/mockForecast';
import { METEOR_SHOWERS } from '../src/data/skyCatalog';
import { showerPeakAltitude } from '../src/services/skyObjects';

function nextMeteorShower(): { name: string; peakMonth: number; peakDay: number } | null {
  const now = new Date();
  const curOrd = now.getMonth() * 100 + now.getDate();
  const toOrd = (month: number, day: number) => month * 100 + day;
  const toDiff = (month: number, day: number) => {
    const ord = toOrd(month, day);
    return ord >= curOrd ? ord - curOrd : ord + 1200 - curOrd;
  };
  const next = [...METEOR_SHOWERS].sort((a, b) => toDiff(a.peak.month, a.peak.day) - toDiff(b.peak.month, b.peak.day))[0];
  return next ? { name: next.name, peakMonth: next.peak.month, peakDay: next.peak.day } : null;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const QUALITY_COLOR: Record<string, string> = {
  Excellent: '#8fd0ff',
  Good: '#7ef0d2',
  Mediocre: '#e8c55a',
  Poor: '#e07060',
};

const QUALITY_COLOR_NV: Record<string, string> = {
  Excellent: '#e07830',
  Good: '#c86428',
  Mediocre: '#a04820',
  Poor: '#7a2c14',
};

export default function TonightsSkyScreen() {
  const insets = useSafeAreaInsets();
  const { locIndex } = useLocalSearchParams<{ locIndex: string }>();
  const { locations } = useLocations();
  const { favorites, toggleFavorite } = useFavorites();
  const { use24h } = usePreferences();
  const { nightVision } = useNightVision();
  const nvAccent = nightVision ? NV_ACCENT : '#7ef0d2';
  const containerBg = nightVision ? '#150400' : '#080b12';
  const cardBg = nightVision ? NV_CARD : 'rgba(255,255,255,0.04)';
  const cardBorder = nightVision ? NV_BORDER : 'rgba(255,255,255,0.09)';
  const textPrimary = nightVision ? NV_TEXT : '#fff';
  const textDim = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.5)';
  const textFaint = nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.35)';
  const fmt = (s: string) => applyTimeFormat(s, use24h);

  const idx = Number(locIndex ?? 0);
  const loc = locations[idx];

  if (!loc) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: containerBg }]}>
        <Text style={styles.empty}>No location data.</Text>
      </View>
    );
  }

  const tonight = loc.days[0];
  const accent = nightVision ? NV_ACCENT : VERDICTS[tonight.verdict].accent;

  // Group objects by category
  const grouped: Record<string, SkyObject[]> = {};
  for (const obj of loc.objects) {
    const key = obj.category ?? 'deep';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(obj);
  }

  const CATEGORY_LABELS: Record<string, string> = {
    milkyway: 'Milky Way',
    deep: 'Deep Sky',
    planets: 'Planets',
    meteors: 'Meteor Showers',
  };

  const categoryOrder = ['milkyway', 'deep', 'planets', 'meteors'];

  const primeKey = `${idx}-prime-prime`;
  const primeStarred = favorites.has(primeKey);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: containerBg }]}>
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backChev, { color: nvAccent }]}>‹</Text>
          <Text style={[styles.backLabel, { color: nvAccent }]}>Tonight</Text>
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: textPrimary }]}>Tonight's Targets</Text>
        <TouchableOpacity style={styles.navRight} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.doneBtn, { color: nvAccent }]}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: textFaint }]}>{loc.name} · {loc.objects.length + 1} objects visible</Text>

        {/* Milky Way / prime target — always its own section at the top */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: textFaint }]}>{CATEGORY_LABELS.milkyway}</Text>
          <TouchableOpacity
            style={[styles.row, { backgroundColor: cardBg, borderColor: cardBorder }]}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/object-detail', params: { locIndex: String(idx), type: 'prime' } })}
          >
            <View style={styles.rowMain}>
              <View style={styles.rowTop}>
                <Text style={[styles.rowName, { color: textPrimary }]}>{loc.prime.name}</Text>
                <Text style={[styles.rowQuality, { color: (nightVision ? QUALITY_COLOR_NV : QUALITY_COLOR)['Excellent'] }]}>Prime</Text>
              </View>
              <Text style={[styles.rowSub, { color: textDim }]}>{loc.prime.sub}</Text>
              <Text style={[styles.rowMeta, { color: textDim }]}>
                Visible <Text style={[styles.rowMetaBold, { color: textPrimary }]}>{loc.prime.visible}</Text>
                {'  '}Peak <Text style={[styles.rowMetaBold, { color: textPrimary }]}>{loc.prime.peakAlt}°</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.starBtn}
              onPress={() => toggleFavorite(primeKey)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.starIcon, { color: nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.3)' }, primeStarred && { color: accent }]}>
                {primeStarred ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {categoryOrder.slice(1).map((cat) => {
          const items = grouped[cat];
          const isMeteors = cat === 'meteors';

          if (!items?.length && !isMeteors && cat !== 'deep' && cat !== 'planets') return null;

          const ZERO_STATE_COPY: Record<string, string> = {
            deep: 'No deep-sky objects clear of the horizon tonight.',
            planets: 'No planets well-placed tonight.',
          };

          return (
            <View key={cat} style={styles.section}>
              <Text style={[styles.sectionHeader, { color: textFaint }]}>{CATEGORY_LABELS[cat] ?? cat}</Text>

              {(!items?.length && (isMeteors || cat === 'deep' || cat === 'planets')) ? (() => {
                const next = nextMeteorShower();
                let nextLabel = 'Check back during peak seasons.';
                if (next) {
                  const peakAlt = showerPeakAltitude(
                    METEOR_SHOWERS.find(s => s.name === next.name)!.radiantRaHours,
                    METEOR_SHOWERS.find(s => s.name === next.name)!.radiantDecDeg,
                    loc.latitude, loc.longitude,
                    next.peakMonth, next.peakDay,
                  );
                  const visLabel = peakAlt < 0
                    ? 'below the horizon from here'
                    : peakAlt < 20
                    ? `low on the horizon (${peakAlt}°) from here`
                    : `${peakAlt}° altitude from ${loc.name}`;
                  nextLabel = `Next up: ${next.name} — peaks ${MONTH_NAMES[next.peakMonth - 1]} ${next.peakDay} · ${visLabel}`;
                }
                const title = isMeteors ? 'No active meteor showers tonight' : ZERO_STATE_COPY[cat];
                const sub = isMeteors ? nextLabel : undefined;
                return (
                  <View style={[styles.zeroStateCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    <Text style={[styles.zeroStateTitle, { color: textDim }]}>{title}</Text>
                    {sub && <Text style={[styles.zeroStateSub, { color: textFaint }]}>{sub}</Text>}
                  </View>
                );
              })() : items?.map((obj, i) => {
                const objIndex = loc.objects.indexOf(obj);
                const favKey = `${idx}-object-${objIndex}`;
                const starred = favorites.has(favKey);
                const qColors = nightVision ? QUALITY_COLOR_NV : QUALITY_COLOR;
                const qColor = qColors[obj.quality] ?? textDim;
                const subLine = [obj.type, obj.con].filter(Boolean).join(' · ');

                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.row, { backgroundColor: cardBg, borderColor: cardBorder }]}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/object-detail', params: { locIndex: String(idx), type: 'object', objIndex: String(objIndex) } })}
                  >
                    <View style={styles.rowMain}>
                      <View style={styles.rowTop}>
                        <Text style={[styles.rowName, { color: textPrimary }]}>{obj.name}</Text>
                        <Text style={[styles.rowQuality, { color: qColor }]}>{obj.quality}</Text>
                      </View>
                      <Text style={[styles.rowSub, { color: textDim }]}>{subLine}</Text>
                      <Text style={[styles.rowMeta, { color: textDim }]}>
                        Visible <Text style={[styles.rowMetaBold, { color: textPrimary }]}>{fmt(obj.window)}</Text>
                        {'  '}Peak <Text style={[styles.rowMetaBold, { color: textPrimary }]}>{obj.peakAlt}°</Text>
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.starBtn}
                      onPress={() => toggleFavorite(favKey)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={[styles.starIcon, { color: nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.3)' }, starred && { color: accent }]}>
                        {starred ? '★' : '☆'}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080b12',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 70,
  },
  backChev: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 28,
    lineHeight: 32,
  },
  backLabel: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 15,
    color: '#7ef0d2',
  },
  navTitle: {
    flex: 1,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  navRight: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  doneBtn: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 16,
    color: '#7ef0d2',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  subtitle: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    marginBottom: 8,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
    flex: 1,
  },
  rowQuality: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  rowSub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  rowMeta: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  rowMetaBold: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  starBtn: {
    paddingLeft: 12,
    paddingVertical: 4,
  },
  starIcon: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.3)',
  },
  empty: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
  zeroStateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  zeroStateTitle: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 14,
  },
  zeroStateSub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
  },
});
