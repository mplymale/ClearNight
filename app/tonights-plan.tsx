import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlan } from '../src/context/PlanContext';
import { CheckIcon } from '../src/components/common/CheckIcon';
import { useNightVision, NV_ACCENT, NV_BORDER, NV_CARD, NV_TEXT, NV_TEXT_DIM, NV_TEXT_FAINT } from '../src/context/NightVisionContext';

import { VERDICTS } from '../src/constants/verdicts';
import { useLocations } from '../src/context/LocationsContext';
import { Location } from '../src/data/mockForecast';
import { parseWindowStartDate, parseWindowEndDate } from '../src/services/alertScheduling';
import { usePreferences, applyTimeFormat } from '../src/context/PreferencesContext';


function resolvePlanKey(key: string, locations: Location[]) {
  const parts = key.split('-');
  const locIndex = Number(parts[0]);
  const type = parts[1] as 'prime' | 'object';
  const objIndex = parts[2] ? Number(parts[2]) : undefined;

  const loc = locations[locIndex];
  if (!loc) return null;

  const day = loc.days[0];
  const verdict = VERDICTS[day.verdict];

  if (type === 'prime') {
    return {
      key,
      name: loc.prime.name,
      sub: loc.prime.sub,
      window: loc.prime.visible,
      accent: verdict.accent,
      locIndex,
      type,
    };
  } else if (type === 'object' && objIndex !== undefined) {
    const obj = loc.objects[objIndex];
    if (!obj) return null;
    return {
      key,
      name: obj.name,
      sub: `${obj.type} · ${obj.con}`,
      window: obj.window,
      accent: verdict.accent,
      locIndex,
      type,
      objIndex,
    };
  }
  return null;
}

// Parse "11:10pm – 4:20am" → [start, end] as comparable strings (crude but consistent)
function parseWindowBounds(windows: string[]): string {
  const all = windows.flatMap((w) => w.split(' – ').map((s) => s.trim()));
  if (!all.length) return '';
  // Just return first start – last end from the array order
  const starts = windows.map((w) => w.split(' – ')[0]?.trim()).filter(Boolean);
  const ends = windows.map((w) => w.split(' – ')[1]?.trim()).filter(Boolean);
  if (!starts.length || !ends.length) return '';
  return `${starts[0]} – ${ends[ends.length - 1]}`;
}

const EXPIRY_GRACE_MS = 60 * 60 * 1000; // keep an item active for 1hr after its window closes

function compareByWindow(a: { window: string }, b: { window: string }): number {
  const aStart = parseWindowStartDate(a.window)?.getTime() ?? Infinity;
  const bStart = parseWindowStartDate(b.window)?.getTime() ?? Infinity;
  if (aStart !== bStart) return aStart - bStart;

  const aEnd = parseWindowEndDate(a.window)?.getTime() ?? Infinity;
  const bEnd = parseWindowEndDate(b.window)?.getTime() ?? Infinity;
  return aEnd - bEnd;
}

export default function TonightsPlanScreen() {
  const insets = useSafeAreaInsets();
  const { plan, removeFromPlan, captured, toggleCaptured } = usePlan();
  const { locations } = useLocations();
  const { use24h } = usePreferences();
  const { nightVision } = useNightVision();
  const nvAccent = nightVision ? NV_ACCENT : '#7ef0d2';
  const containerBg = nightVision ? '#150400' : '#0a0d14';
  const cardBg = nightVision ? NV_CARD : 'rgba(255,255,255,0.04)';
  const cardBorder = nightVision ? NV_BORDER : 'rgba(255,255,255,0.10)';
  const textPrimary = nightVision ? NV_TEXT : '#fff';
  const textDim = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.6)';
  const textFaint = nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.35)';
  const fmt = (s: string) => applyTimeFormat(s, use24h);

  const resolved = Array.from(plan)
    .map(key => resolvePlanKey(key, locations))
    .filter(Boolean) as NonNullable<ReturnType<typeof resolvePlanKey>>[];

  // Nothing is ever auto-deleted — once a window's been closed for over an
  // hour, the item just fades and sinks to the bottom, sorted among the
  // other expired items the same way, so the active list up top stays
  // exactly the ones still worth going outside for.
  const now = Date.now();
  const isExpired = (item: { window: string }) => {
    const end = parseWindowEndDate(item.window)?.getTime();
    return end !== undefined && now - end > EXPIRY_GRACE_MS;
  };

  const active = resolved.filter((i) => !isExpired(i)).sort(compareByWindow);
  const expired = resolved.filter((i) => isExpired(i)).sort(compareByWindow);
  const items = [...active, ...expired];

  const overallWindow = parseWindowBounds(items.map((i) => i.window));
  // Use the accent from the first item (or default teal)
  const headerAccent = nightVision ? NV_ACCENT : (items[0]?.accent ?? '#7ef0d2');

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: containerBg }]}>
      {/* Nav bar */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backChev, { color: nvAccent }]}>‹</Text>
          <Text style={[styles.backLabel, { color: nvAccent }]}>Home</Text>
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: textPrimary }]}>Tonight's Plan</Text>
        <View style={styles.navRight} />
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Image
              source={require('../assets/clearnight-icon.png')}
              style={{ width: 148, height: 148, borderRadius: 33 }}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: textPrimary }]}>No targets yet</Text>
          <Text style={styles.emptyBody}>
            Open a target from tonight's sky and tap{'\n'}
            <Text style={styles.emptyBold}>Add to plan</Text>
            {' '}to build your observing run for{'\n'}the night.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header count row */}
          <View style={styles.countRow}>
            <View style={styles.countLeft}>
              <Text style={[styles.countNum, { color: headerAccent }]}>{items.length}</Text>
              <Text style={[styles.countLabel, { color: textDim }]}>targets queued</Text>
            </View>
            {overallWindow ? (
              <Text style={styles.overallWindow}>{overallWindow}</Text>
            ) : null}
          </View>

          {items.map((item, idx) => {
            const done = captured.has(item.key);
            const expiredItem = isExpired(item);
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }, expiredItem && styles.cardExpired]}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: '/object-detail',
                    params: {
                      locIndex: String(item.locIndex),
                      type: item.type,
                      ...(item.type === 'object' ? { objIndex: String((item as any).objIndex) } : {}),
                    },
                  })
                }
              >
                {/* Tap to mark as captured/checked off — a simple "did I get this" toggle */}
                <TouchableOpacity
                  style={[styles.numCircle, done && { borderColor: item.accent, backgroundColor: item.accent + '22' }]}
                  onPress={() => toggleCaptured(item.key)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {done
                    ? <CheckIcon size={14} color={item.accent} strokeWidth={2.8} />
                    : <Text style={[styles.numText, { color: textDim }]}>{idx + 1}</Text>
                  }
                </TouchableOpacity>

                <View style={styles.cardText}>
                  <Text style={[styles.cardName, { color: textPrimary }, done && styles.cardNameDone]}>{item.name}</Text>
                  <Text style={[styles.cardSub, { color: textDim }]}>{item.sub}</Text>
                  <Text style={[styles.cardWindow, { color: item.accent }]}>
                    {fmt(item.window)}{expiredItem ? ' · closed' : ''}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeFromPlan(item.key)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={[styles.removeBtnText, { color: nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.3)' }]}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0d14',
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
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 17,
    color: '#fff',
    textAlign: 'center',
  },
  navRight: { minWidth: 70 },

  list: {
    paddingHorizontal: 18,
    paddingTop: 4,
    gap: 10,
  },

  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  countLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  countNum: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 42,
    fontWeight: '600',
    lineHeight: 46,
    letterSpacing: -1,
  },
  countLabel: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
  },
  overallWindow: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'right',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  cardExpired: {
    opacity: 0.45,
  },
  numCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  cardNameDone: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.6)',
  },
  cardSub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  cardWindow: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 13,
    marginTop: 5,
  },
  removeBtn: {
    padding: 4,
    flexShrink: 0,
  },
  removeBtnText: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.35)',
    lineHeight: 24,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    marginBottom: 60,
  },
  emptyIconWrap: {
    marginBottom: 28,
  },
  emptyTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  emptyBold: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontWeight: '600',
    color: '#fff',
  },
});
