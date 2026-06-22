import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { DayForecast, Location } from '../../data/mockForecast';
import { Verdict } from '../../constants/verdicts';
import { useNightVision, NV_ACCENT, NV_BORDER, NV_CARD, NV_TEXT, NV_TEXT_DIM, NV_TEXT_FAINT } from '../../context/NightVisionContext';
import { usePreferences, applyTimeFormat } from '../../context/PreferencesContext';

// Single consistent chevron shape — rotated for open/closed instead of
// swapping Unicode glyphs (⌃/⌄ render at different sizes in-font).
function HeaderChevron({ open }: { open: boolean }) {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
    >
      <Path
        d="M3 10 L8 5 L13 10"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const SCREEN_H = Dimensions.get('window').height;
const PEEK = 88;
const FULL = Math.round(SCREEN_H * 0.68);

// ── Clarity color ramp ────────────────────────────────────────────────────────

const STOPS: [number, [number, number, number]][] = [
  [0,   [201, 53,  42]],
  [28,  [222, 96,  48]],
  [50,  [229, 165, 60]],
  [70,  [150, 196, 82]],
  [100, [56,  186, 96]],
];

function clarityColor(pct: number): string {
  const p = Math.max(0, Math.min(100, pct));
  let lo = STOPS[0], hi = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (p >= STOPS[i][0] && p <= STOPS[i + 1][0]) { lo = STOPS[i]; hi = STOPS[i + 1]; break; }
  }
  const span = (hi[0] - lo[0]) || 1;
  const t = (p - lo[0]) / span;
  const c = lo[1].map((v, k) => Math.round(v + (hi[1][k] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

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

const HOURS = ['9p', '10', '11', '12', '1a', '2', '3', '4', '5'];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  loc: Location;
  day: DayForecast;
  verdict: Verdict;
  locIndex: number;
}

export function BottomSheet({ loc, day, verdict: v, locIndex }: Props) {
  const { nightVision } = useNightVision();
  const { use24h } = usePreferences();
  const fmt = (s: string) => applyTimeFormat(s, use24h);
  const accent = nightVision ? NV_ACCENT : v.accent;
  const sheetBg = nightVision ? '#140200' : '#0a0c14';
  const cardBorder = nightVision ? NV_BORDER : 'rgba(255,255,255,0.10)';
  const cardBg = nightVision ? NV_CARD : 'rgba(255,255,255,0.04)';
  const textPrimary = nightVision ? NV_TEXT : '#fff';
  const textDim = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.52)';
  const textFaint = nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.36)';
  const textSection = nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.48)';
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  // Travel distance between fully closed (peek) and fully open
  const travel = FULL - PEEK;
  // Tracks the drag's 0–1 progress so release can read the live value
  // (Animated.Value doesn't expose its current number synchronously).
  const dragStartProgress = useRef(0);
  const dragProgress = useRef(0);

  const openSheet = () => {
    setOpen(true);
    Animated.spring(anim, { toValue: 1, useNativeDriver: false, tension: 60, friction: 12 }).start();
  };

  const closeSheet = () => {
    Animated.spring(anim, { toValue: 0, useNativeDriver: false, tension: 60, friction: 12 }).start(
      ({ finished }) => { if (finished) setOpen(false); }
    );
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        anim.stopAnimation();
        dragStartProgress.current = open ? 1 : 0;
        dragProgress.current = dragStartProgress.current;
      },
      onPanResponderMove: (_, g) => {
        const delta = -g.dy / travel;
        const next = Math.max(0, Math.min(1, dragStartProgress.current + delta));
        dragProgress.current = next;
        anim.setValue(next);
        // Mount the content as soon as it starts revealing, so it's visible
        // while still under the finger instead of popping in at release.
        if (next > 0.02 && !open) setOpen(true);
      },
      onPanResponderRelease: (_, g) => {
        // Fast flicks open/close regardless of how far the drag got;
        // otherwise snap to whichever side the sheet is closer to.
        const FLICK_VELOCITY = 0.5;
        let shouldOpen: boolean;
        if (g.vy < -FLICK_VELOCITY) shouldOpen = true;
        else if (g.vy > FLICK_VELOCITY) shouldOpen = false;
        else shouldOpen = dragProgress.current > 0.5;

        if (shouldOpen) openSheet();
        else closeSheet();
      },
      onPanResponderTerminate: () => {
        if (dragProgress.current > 0.5) openSheet();
        else closeSheet();
      },
    })
  ).current;

  const sheetBottom = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-FULL + PEEK, 0],
  });

  const blurOpacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  return (
    <>
      {/* Blur overlay — fades in behind the sheet; tappable when open to dismiss */}
      <Animated.View
        style={[styles.blurOverlay, { opacity: blurOpacity }]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeSheet}>
          <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
        </TouchableOpacity>
      </Animated.View>

      {/* Sheet — slides up from bottom. NO overflow:hidden so ScrollView works */}
      <Animated.View style={[styles.sheet, { bottom: sheetBottom, backgroundColor: sheetBg }]}>

        {/* Grab zone — always visible, drives pan */}
        <View style={styles.handle} {...panResponder.panHandlers}>
          <View style={styles.handlePill} />
          <TouchableOpacity
            style={styles.headerRow}
            onPress={() => (open ? closeSheet() : openSheet())}
            activeOpacity={0.8}
          >
            <Text style={[styles.headerTitleText, { color: textPrimary }]}>Tonight's sky</Text>
            <View style={styles.headerChevAbs}>
              <HeaderChevron open={open} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Content — scrollable, only rendered once open so layout is stable */}
        {open && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Hour-by-hour ── */}
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionLabel, { color: textSection }]}>Hour-by-hour · Tonight</Text>
              <View style={styles.legend}>
                <Text style={[styles.legendText, { color: textFaint }]}>Poor</Text>
                <LinearGradient
                  colors={STOPS.map(([, [r, g, b]]) => `rgb(${r},${g},${b})`) as [string, string, ...string[]]}
                  locations={STOPS.map(([pct]) => pct / 100) as [number, number, ...number[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.legendRamp}
                />
                <Text style={[styles.legendText, { color: textFaint }]}>Great</Text>
              </View>
            </View>

            <View style={styles.bars}>
              {day.hourly.map((h, i) => {
                const inWin = day.window
                  ? i / 8 >= day.window.s - 0.06 && i / 8 <= day.window.e + 0.02
                  : false;
                return (
                  <View key={i} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          { height: Math.max(12, h * 0.72), backgroundColor: clarityColor(h) },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: textFaint }, inWin && { color: textPrimary, fontFamily: 'HankenGrotesk_600SemiBold', fontWeight: '700' }]}>
                      {HOURS[i]}
                    </Text>
                    {/* Teal underline below label for in-window hours */}
                    {inWin
                      ? <View style={[styles.barWinUnderline, { backgroundColor: accent }]} />
                      : <View style={styles.barWinUnderlinePlaceholder} />
                    }
                  </View>
                );
              })}
            </View>

            {day.window && (
              <View style={styles.winNote}>
                <View style={[styles.winDash, { backgroundColor: accent }]} />
                <Text style={[styles.winText, { color: textDim }]}>Best window · {fmt(day.window.label)}</Text>
              </View>
            )}

            {/* ── Visible tonight ── */}
            <View style={styles.visSectionHead}>
              <Text style={[styles.sectionLabel, { color: textSection }]}>Visible Tonight</Text>
              <Text style={[styles.visSeeAll, { color: textFaint }]}>
                {loc.objects.length + (loc.prime.peakAlt > 0 ? 1 : 0)} targets
              </Text>
            </View>

            {/* Prime target — the flagship pick (often the galactic core),
                tracked separately from loc.objects but just as "visible
                tonight" as anything else, so it belongs in this list too. */}
            {loc.prime.peakAlt > 0 && (
              <TouchableOpacity
                style={[styles.objCard, { borderColor: cardBorder, backgroundColor: cardBg }]}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/object-detail', params: { locIndex: String(locIndex), type: 'prime' } })}
              >
                <View style={styles.objMain}>
                  <Text style={[styles.objName, { color: textPrimary }]}>{loc.prime.name}</Text>
                  <Text style={[styles.objId, { color: textDim }]}>{loc.prime.sub}</Text>
                  <Text style={[styles.objStats, { color: textFaint }]}>Visible {fmt(loc.prime.visible)}</Text>
                </View>
                <View style={styles.objRight}>
                  <Text style={[styles.objQuality, { color: accent }]}>PRIME</Text>
                  <Text style={[styles.objChev, { color: textFaint }]}>›</Text>
                </View>
              </TouchableOpacity>
            )}

            {loc.objects.map((obj, i) => {
              const qColors = nightVision ? QUALITY_COLOR_NV : QUALITY_COLOR;
              const qColor = qColors[obj.quality] ?? textDim;
              const mag = typeof obj.mag === 'number' ? Number(obj.mag).toFixed(1) : obj.mag;
              const idLine = [obj.cat, obj.con].filter(Boolean).join(' · ');
              const statsLine = [obj.type, `Mag ${mag}`, obj.size !== '—' ? obj.size : null].filter(Boolean).join(' · ');
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.objCard, { borderColor: cardBorder, backgroundColor: cardBg }]}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/object-detail', params: { locIndex: String(locIndex), type: 'object', objIndex: String(i) } })}
                >
                  <View style={styles.objMain}>
                    <Text style={[styles.objName, { color: textPrimary }]}>{obj.name}</Text>
                    <Text style={[styles.objId, { color: textDim }]}>{idLine}</Text>
                    <Text style={[styles.objStats, { color: textFaint }]}>{statsLine}</Text>
                  </View>
                  <View style={styles.objRight}>
                    <Text style={[styles.objQuality, { color: qColor }]}>{obj.quality}</Text>
                    <Text style={[styles.objChev, { color: textFaint }]}>›</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {loc.objects.length === 0 && loc.prime.peakAlt <= 0 && (
              <View style={[styles.emptyState, { borderColor: cardBorder, backgroundColor: cardBg }]}>
                <Text style={[styles.emptyIcon, { color: textFaint }]}>☁</Text>
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>Nothing clears the horizon tonight</Text>
                <Text style={[styles.emptyBody, { color: textFaint }]}>
                  Clouds or geometry are keeping the sky closed. Check back tomorrow or try a darker location.
                </Text>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </Animated.View>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: PEEK,
  },

  // Sheet uses bottom offset animation — no overflow:hidden (breaks ScrollView on iOS)
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: FULL,
    backgroundColor: '#0a0c14',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },

  // grab handle
  handle: {
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  handlePill: {
    width: 40,
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginBottom: 12,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerChevAbs: {
    position: 'absolute',
    right: 2,
  },

  // scrollable body
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },

  // section header
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionLabel: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 10.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.48)',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendText: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 9,
    color: 'rgba(255,255,255,0.36)',
  },
  legendRamp: {
    flexDirection: 'row',
    width: 44,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  legendSeg: {
    flex: 1,
    height: 5,
  },

  // bars
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 92,
    gap: 4,
    marginBottom: 10,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 5,
  },
  barLabel: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.38)',
  },
  barLabelActive: {
    color: '#fff',
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontWeight: '700',
  },
  barWinUnderline: {
    height: 2,
    borderRadius: 1,
    width: '80%',
    marginTop: 2,
  },
  barWinUnderlinePlaceholder: {
    height: 2,
    marginTop: 2,
  },

  // best window note
  winNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 22,
  },
  winDash: {
    width: 18,
    height: 2,
    borderRadius: 2,
  },
  winText: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },

  // visible tonight
  visSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  visSeeAll: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.36)',
  },

  // object cards
  objCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 8,
  },
  objMain: {
    flex: 1,
    gap: 3,
  },
  objName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  objId: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.52)',
  },
  objStats: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.36)',
  },
  objRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  objQuality: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 2,
  },
  emptyTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptyBody: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 260,
  },
  objChev: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.25)',
  },
});
