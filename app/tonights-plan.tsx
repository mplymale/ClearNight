import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { usePlan } from '../src/context/PlanContext';
import { VERDICTS } from '../src/constants/verdicts';
import { useLocations } from '../src/context/LocationsContext';
import { Location } from '../src/data/mockForecast';

function SparkleIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Path
        d="M16 4 C16 4 17 12 24 16 C17 16 17 24 16 28 C16 28 15 20 8 16 C15 16 15 8 16 4Z"
        fill="#7ef0d2"
      />
    </Svg>
  );
}

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

export default function TonightsPlanScreen() {
  const insets = useSafeAreaInsets();
  const { plan, removeFromPlan } = usePlan();
  const { locations } = useLocations();

  const items = Array.from(plan)
    .map(key => resolvePlanKey(key, locations))
    .filter(Boolean) as NonNullable<ReturnType<typeof resolvePlanKey>>[];

  const overallWindow = parseWindowBounds(items.map((i) => i.window));
  // Use the accent from the first item (or default teal)
  const headerAccent = items[0]?.accent ?? '#7ef0d2';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav bar */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backChev}>‹</Text>
          <Text style={styles.backLabel}>Home</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Tonight's Plan</Text>
        <View style={styles.navRight} />
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <SparkleIcon />
          </View>
          <Text style={styles.emptyTitle}>No targets yet</Text>
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
              <Text style={styles.countLabel}>targets queued</Text>
            </View>
            {overallWindow ? (
              <Text style={styles.overallWindow}>{overallWindow}</Text>
            ) : null}
          </View>

          {items.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={styles.card}
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
              {/* Numbered circle */}
              <View style={styles.numCircle}>
                <Text style={styles.numText}>{idx + 1}</Text>
              </View>

              <View style={styles.cardText}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardSub}>{item.sub}</Text>
                <Text style={[styles.cardWindow, { color: item.accent }]}>{item.window}</Text>
              </View>

              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeFromPlan(item.key)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
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
    gap: 2,
    minWidth: 70,
  },
  backChev: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 22,
    lineHeight: 26,
    color: '#7ef0d2',
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
    fontSize: 15,
    color: 'rgba(255,255,255,0.28)',
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    marginBottom: 60,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(15,22,30,1)',
    borderWidth: 1.5,
    borderColor: '#7ef0d2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
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
