import React, { useEffect, useRef, useState } from 'react';
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

const SCREEN_W = Dimensions.get('window').width;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { router } from 'expo-router';

import { VERDICTS } from '../../src/constants/verdicts';
import { useNightVision, NV_ACCENT, NV_BORDER, NV_TEXT, NV_TEXT_DIM, NV_TEXT_FAINT } from '../../src/context/NightVisionContext';
import { usePlan } from '../../src/context/PlanContext';
import { useLocations } from '../../src/context/LocationsContext';
import { BottomSheet } from '../../src/components/home/BottomSheet';
import { DayStrip } from '../../src/components/home/DayStrip';
import { FactorChips } from '../../src/components/home/FactorChips';
import { LockedCards } from '../../src/components/home/LockedCards';
import { NightArc } from '../../src/components/home/NightArc';
import { FeaturedTargets } from '../../src/components/home/PrimeTargetCard';
import { MoonHumidityRow } from '../../src/components/home/MoonHumidityRow';
import { SkyBackground } from '../../src/components/home/SkyBackground';
import { StarField } from '../../src/components/home/StarField';
import { useSubscription, SubscriptionStatus } from '../../src/context/SubscriptionContext';
import { useAlerts } from '../../src/context/AlertsContext';
import { usePreferences } from '../../src/context/PreferencesContext';

// ── Shared icons ─────────────────────────────────────────────────────────────

function ForecastMark({ size = 26, accent }: { size?: number; accent?: string }) {
  accent = accent ?? '#7ef0d2';
  const glowColor = accent === '#7ef0d2' ? 'rgba(126,240,210,0.22)' : 'rgba(224,120,48,0.22)';
  const trailColor = accent === '#7ef0d2' ? 'rgba(126,240,210,0.45)' : 'rgba(224,120,48,0.45)';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Circle cx={24} cy={26} r={1.4} fill="#fff" opacity={0.7} />
      <Circle cx={78} cy={22} r={1.3} fill="#8fd0ff" opacity={0.6} />
      <Circle cx={90} cy={66} r={1.2} fill="#ffce8f" opacity={0.55} />
      <Path
        d="M14 80 Q30 71 47 60"
        stroke={trailColor}
        strokeWidth={2.4}
        strokeDasharray={[0.5, 5]}
        strokeLinecap="round"
      />
      <Path
        d="M58 56 Q80 47 100 43"
        stroke={accent}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Circle cx={88} cy={45} r={2.6} fill={accent} />
      <Circle cx={53} cy={58} r={10} fill={glowColor} />
      <Circle cx={53} cy={58} r={5.2} fill="#f3f6f8" />
    </Svg>
  );
}

function GearIcon() {
  // Proper cog with 8 teeth
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="#fff" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="#fff" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function ListIcon() {
  return (
    <Svg width={18} height={14} viewBox="0 0 18 14" fill="none">
      <Line x1={1} y1={1}  x2={17} y2={1}  stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={1} y1={7}  x2={17} y2={7}  stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={1} y1={13} x2={11} y2={13} stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function BellIcon({ active, color }: { active: boolean; color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill={active ? color : 'none'} fillOpacity={active ? 0.25 : 0} />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={14} viewBox="0 0 12 14" fill="none">
      <Path d="M2 6V4a4 4 0 0 1 8 0v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <G transform="translate(0, 5)">
        <Path d="M1 0h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V1a1 1 0 0 1 1-1Z" fill={color} opacity={0.55} />
      </G>
    </Svg>
  );
}

// ── Top section: brand + location row ────────────────────────────────────────

interface TopSectionProps {
  onList: () => void;
  onSettings: () => void;
  isPremium: boolean;
  locName: string;
  locRegion: string;
  locIndex: number;
  locCount: number;
  onPrevLoc: () => void;
  onNextLoc: () => void;
  isFree: boolean;
  accentColor: string;
  onAddSpot: () => void;
  onManage: () => void;
  planCount: number;
  refreshing: boolean;
}

function TopSection(p: TopSectionProps) {
  const { nightVision } = useNightVision();
  const nvAccent = nightVision ? NV_ACCENT : undefined;
  const btnBorder = nightVision ? NV_BORDER : 'rgba(255,255,255,0.14)';
  const btnBg = nightVision ? 'rgba(120,30,10,0.25)' : 'rgba(255,255,255,0.07)';
  const textPrimary = nightVision ? NV_TEXT : '#fff';
  const textDim = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.55)';
  return (
    <View style={styles.topSection}>
      {/* Location row: [≡] [‹ City ›] [⚙]  */}
      <View style={styles.locRow}>
        <TouchableOpacity style={[styles.iconBtn, { borderColor: btnBorder, backgroundColor: btnBg }]} onPress={p.onList} activeOpacity={0.7}>
          <ListIcon />
          {p.planCount > 0 && (
            <View style={[styles.planBadge, { backgroundColor: nvAccent ?? '#7ef0d2' }]}>
              <Text style={styles.planBadgeText}>{p.planCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Left chevron */}
        {p.isPremium && (
          <TouchableOpacity
            onPress={p.onPrevLoc}
            disabled={p.locIndex === 0}
            activeOpacity={0.6}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Text style={[styles.locChevron, p.locIndex === 0 && styles.locChevronFaded]}>‹</Text>
          </TouchableOpacity>
        )}

        <View style={styles.locCenter}>
          {p.isFree ? (
            <View style={styles.freeLocNameRow}>
              <Text style={[styles.locName, { color: textPrimary }]}>{p.locName}</Text>
              <LockIcon color={nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.55)'} />
            </View>
          ) : (
            <TouchableOpacity onPress={p.onManage} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.locName, { color: textPrimary }]} numberOfLines={1}>{p.locName}</Text>
            </TouchableOpacity>
          )}
          <View style={styles.locRegionRow}>
            <Text style={[styles.locRegion, { color: textDim }]}>{p.locRegion}</Text>
            {p.refreshing && <View style={[styles.refreshDot, { backgroundColor: nightVision ? NV_ACCENT : '#7ef0d2' }]} />}
          </View>
        </View>

        {/* Right chevron */}
        {p.isPremium && (
          <TouchableOpacity
            onPress={p.onNextLoc}
            disabled={p.locIndex === p.locCount - 1}
            activeOpacity={0.6}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Text style={[styles.locChevron, p.locIndex === p.locCount - 1 && styles.locChevronFaded]}>›</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.iconBtn, { borderColor: btnBorder, backgroundColor: btnBg }]} onPress={p.onSettings} activeOpacity={0.7}>
          <GearIcon />
        </TouchableOpacity>
      </View>

      {/* Dots (premium only) */}
      {p.isPremium && (
        <View style={styles.locDots}>
          {Array.from({ length: p.locCount }).map((_, i) => (
            <View key={i} style={[styles.locDot, i === p.locIndex && styles.locDotActive]} />
          ))}
        </View>
      )}

      {/* Free tier add-spots link */}
      {p.isFree && (
        <TouchableOpacity activeOpacity={0.7} onPress={p.onAddSpot}>
          <Text style={[styles.freeLocAdd, { color: p.accentColor }]}>
            + Add more spots with Premium
          </Text>
        </TouchableOpacity>
      )}

      {/* Premium single-spot nudge */}
      {p.isPremium && p.locCount === 1 && (
        <TouchableOpacity activeOpacity={0.7} onPress={p.onAddSpot}>
          <Text style={[styles.freeLocAdd, { color: p.accentColor }]}>
            + Add more spots
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { nightVision } = useNightVision();
  const { status } = useSubscription();
  const { plan } = usePlan();
  const { locations, activeLocIndex, hydrated, refreshingNames, fetchErrorNames, clearFetchError } = useLocations();
  const [locIndex, setLocIndex] = useState(0);
  const [dayIndex, setDayIndex] = useState(0);
  // Sync when user picks a location from manage-locations
  useEffect(() => {
    setLocIndex(activeLocIndex);
    setDayIndex(0);
  }, [activeLocIndex]);

  const { hasAlert, evaluateAndSchedule } = useAlerts();
  const { quietStart, quietEnd } = usePreferences();
  const isFree = status === 'free';

  // Re-evaluate alert schedules whenever forecast data refreshes
  useEffect(() => {
    if (locations.length > 0) {
      evaluateAndSchedule(locations, quietStart, quietEnd);
    }
  }, [locations]);
  const nvTextPrimary = nightVision ? NV_TEXT : '#fff';
  const nvTextDim = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.72)';

  const safeLocIndex = Math.min(locIndex, Math.max(0, locations.length - 1));
  const loc = locations.length > 0 ? (isFree ? locations[0] : locations[safeLocIndex]) : null;
  const day = loc ? (isFree ? loc.days[0] : loc.days[dayIndex]) : null;
  const verdict = day ? VERDICTS[day.verdict] : VERDICTS.poor;

  // Use refs so PanResponder callbacks always see current values
  const locIndexRef = useRef(locIndex);
  const locationsRef = useRef(locations);
  useEffect(() => { locIndexRef.current = locIndex; }, [locIndex]);
  useEffect(() => { locationsRef.current = locations; }, [locations]);

  const swipeX = useRef(new Animated.Value(0)).current;

  const goLoc = (delta: number) => {
    const next = locIndexRef.current + delta;
    if (next < 0 || next >= locationsRef.current.length) return;
    // Slide out in the swipe direction, then jump to new location
    Animated.timing(swipeX, {
      toValue: delta < 0 ? SCREEN_W : -SCREEN_W,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      swipeX.setValue(0);
      setLocIndex(next);
      setDayIndex(0);
    });
  };

  const arcSwiper = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderMove: (_, gs) => {
        // Resist slightly at edges
        const atStart = locIndexRef.current === 0 && gs.dx > 0;
        const atEnd = locIndexRef.current === locationsRef.current.length - 1 && gs.dx < 0;
        swipeX.setValue(atStart || atEnd ? gs.dx * 0.25 : gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        const atStart = locIndexRef.current === 0;
        const atEnd = locIndexRef.current === locationsRef.current.length - 1;
        const wantsNext = gs.dx < -50;
        const wantsPrev = gs.dx > 50;

        if (wantsNext && !atEnd) {
          goLoc(1);
        } else if (wantsPrev && !atStart) {
          goLoc(-1);
        } else {
          // No more locations in that direction (or didn't pass the
          // threshold) — always snap back so the arc never gets stuck.
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 14 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 14 }).start();
      },
    })
  ).current;

  // No spots saved (e.g. the user removed their last one) — prompt to add
  // one rather than crashing on undefined location/day data below.
  if (!hydrated) {
    return (
      <View style={[styles.container, styles.emptyState, { paddingTop: insets.top, backgroundColor: nightVision ? '#100200' : '#080b12' }]}>
        <ForecastMark size={48} accent={nightVision ? NV_ACCENT : '#7ef0d2'} />
        <Text style={[styles.emptyStateBody, { color: nvTextDim, marginTop: 20 }]}>Loading your spots…</Text>
      </View>
    );
  }

  if (!loc || !day) {
    return (
      <View style={[styles.container, styles.emptyState, { paddingTop: insets.top }]}>
        <Text style={[styles.emptyStateTitle, { color: nvTextPrimary }]}>No spots yet</Text>
        <Text style={[styles.emptyStateBody, { color: nvTextDim }]}>Add a place to see tonight's forecast.</Text>
        <TouchableOpacity
          style={styles.emptyStateBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/add-location')}
        >
          <Text style={styles.emptyStateBtnText}>+ Add a spot</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const weekScores = loc.days.map((d) => d.score);

  return (
    <View style={[styles.container, nightVision && { backgroundColor: '#100200' }]}>
      <SkyBackground verdictKey={day.verdict} />
      <StarField intensity={verdict.stars} count={46} seed={locIndex * 3 + dayIndex} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top section: brand + location row */}
        <TopSection
          onList={() => router.push('/tonights-plan')}
          onManage={() => router.push('/manage-locations')}
          planCount={plan.size}
          onSettings={() => router.push('/settings')}
          isPremium={!isFree}
          isFree={isFree}
          locName={loc.name}
          locRegion={loc.region}
          locIndex={locIndex}
          locCount={locations.length}
          onPrevLoc={() => goLoc(-1)}
          onNextLoc={() => goLoc(1)}
          accentColor={verdict.accent}
          onAddSpot={() => router.push('/add-location')}
          refreshing={refreshingNames.has(loc.name)}
        />

        {fetchErrorNames.has(loc.name) && (
          <TouchableOpacity
            style={styles.fetchErrorBanner}
            activeOpacity={0.8}
            onPress={() => clearFetchError(loc.name)}
          >
            <Text style={styles.fetchErrorText}>⚠ Couldn't update forecast — showing last known data. Tap to dismiss.</Text>
          </TouchableOpacity>
        )}

        {/* Day strip (premium only) */}
        {!isFree && (
          <View style={styles.stripWrap}>
            <DayStrip
              days={loc.days}
              selectedIndex={dayIndex}
              onSelect={(i) => setDayIndex(i)}
            />
            {/* Location alert bell — sits below the forecast strip */}
            {(() => {
              const locAlert = hasAlert(`alert-loc-${safeLocIndex}`);
              const nvAccent = nightVision ? NV_ACCENT : verdict.accent;
              return (
                <TouchableOpacity
                  style={styles.locationBellRow}
                  onPress={() => router.push({ pathname: '/set-alert', params: { locIndex: String(safeLocIndex), type: 'location' } })}
                  activeOpacity={0.7}
                >
                  <BellIcon active={locAlert} color={locAlert ? nvAccent : 'rgba(255,255,255,0.4)'} />
                  <Text style={[styles.locationBellText, { color: locAlert ? nvAccent : 'rgba(255,255,255,0.4)' }]}>
                    {locAlert ? 'Alert set for this location' : 'Set an alert for this location'}
                  </Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        )}

        {/* Trial banner — only while actually on trial, not once subscribed */}
        {status === 'trial' && (
          <View style={styles.trialBanner}>
            <View style={[styles.trialDot, { backgroundColor: verdict.accent }]} />
            <Text style={[styles.trialText, { color: nvTextDim }]}>
              <Text style={[styles.trialBold, { color: nvTextPrimary }]}>Premium trial</Text>
              {' · 5 days left — full forecast & GO alerts'}
            </Text>
            <TouchableOpacity style={[styles.trialBtn, { backgroundColor: verdict.accent }]} activeOpacity={0.8} onPress={() => router.push('/paywall')}>
              <Text style={[styles.trialBtnText, { color: '#04130f' }]}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Night arc + cards — swipeable block */}
        <Animated.View
          style={{ transform: [{ translateX: swipeX }] }}
          {...(isFree ? {} : arcSwiper.panHandlers)}
        >
          <NightArc loc={loc} day={day} verdict={verdict} freeMode={isFree} />

            {/* Factor chips — premium only (day-by-day breakdown) */}
          {!isFree && (
            <>
              <FactorChips day={day} locIndex={locIndex} dayIndex={dayIndex} />
              <MoonHumidityRow day={day} locIndex={locIndex} dayIndex={dayIndex} />
            </>
          )}

          {/* Prime target card — always visible, even on free */}
          <FeaturedTargets loc={loc} day={day} verdict={verdict} locIndex={locIndex} freeMode={isFree} />
        </Animated.View>

        {/* ── FREE: locked upsell cards (week ahead + alerts) ── */}
        {isFree && (
          <LockedCards
            verdict={verdict}
            weekScores={weekScores}
            onUpgrade={() => router.push('/paywall')}
          />
        )}

        {/* Bottom sheet spacer so content isn't hidden behind the sheet —
            taller than the sheet's peek height (88) to leave clear room
            below content like the empty-state notes in FeaturedTargets. */}
        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Hour-by-hour bottom sheet */}
      <BottomSheet loc={loc} day={day} verdict={verdict} locIndex={locIndex} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#04060e',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyStateTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
  },
  emptyStateBody: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateBtn: {
    borderRadius: 999,
    backgroundColor: '#7ef0d2',
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  emptyStateBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: '#04130f',
  },
  fetchErrorBanner: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(224,100,60,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(224,100,60,0.35)',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  fetchErrorText: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: '#e87050',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // top section
  topSection: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 6,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  brandWord: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
    color: '#fff',
  },
  brandWordFaded: {
    opacity: 0.5,
  },

  // location row: [icon btn] [‹ City ›] [icon btn]
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    gap: 2,
  },
  locRowSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  planBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  planBadgeText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 10,
    fontWeight: '600',
    color: '#04130f',
    lineHeight: 12,
  },
  locCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  locNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locChevron: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 56,
    lineHeight: 56,
    color: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 20,
  },
  locChevronFaded: {
    opacity: 0,
  },
  locName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: '#fff',
    textAlign: 'center',
    flexShrink: 1,
  },
  locRegion: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.2,
  },
  locRegionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.8,
  },

  // dots
  locDots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  locDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  locDotActive: {
    width: 16,
    borderRadius: 3,
    backgroundColor: '#fff',
  },

  // free tier add-spots link
  freeLocNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  freeLocAdd: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },



  // day strip
  stripWrap: {
    paddingHorizontal: 16,
  },
  locationBellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  locationBellText: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
  },

  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(126,240,210,0.22)',
    backgroundColor: 'rgba(126,240,210,0.07)',
    gap: 8,
  },
  trialDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  trialText: {
    flex: 1,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 17,
  },
  trialBold: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontWeight: '600',
    color: '#fff',
  },
  trialBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    flexShrink: 0,
  },
  trialBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
  },
});
