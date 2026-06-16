import React, { useState, useRef } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useNightVision, NV_ACCENT, NV_BORDER, NV_CARD } from '../src/context/NightVisionContext';

type Tier = 'free' | 'trial' | 'premium';

// ── Small icons ───────────────────────────────────────────────────────────────

function ForecastMark({ size = 24, accent = '#7ef0d2' }: { size?: number; accent?: string }) {
  const isNV = accent !== '#7ef0d2';
  const trail = isNV ? 'rgba(224,120,48,0.45)' : 'rgba(126,240,210,0.45)';
  const glow = isNV ? 'rgba(224,120,48,0.22)' : 'rgba(126,240,210,0.22)';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Circle cx={24} cy={26} r={1.4} fill="#fff" opacity={0.7} />
      <Circle cx={78} cy={22} r={1.3} fill="#8fd0ff" opacity={0.6} />
      <Circle cx={90} cy={66} r={1.2} fill="#ffce8f" opacity={0.55} />
      <Path d="M14 80 Q30 71 47 60" stroke={trail} strokeWidth={2.4} strokeDasharray={[0.5, 5]} strokeLinecap="round" />
      <Path d="M58 56 Q80 47 100 43" stroke={accent} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={88} cy={45} r={2.6} fill={accent} />
      <Circle cx={53} cy={58} r={10} fill={glow} />
      <Circle cx={53} cy={58} r={5.2} fill="#f3f6f8" />
    </Svg>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ value, onToggle, accent = '#7ef0d2' }: { value: boolean; onToggle: () => void; accent?: string }) {
  return (
    <TouchableOpacity
      style={[styles.toggle, value && { backgroundColor: accent, borderColor: accent }]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
    </TouchableOpacity>
  );
}

// ── Segmented control ─────────────────────────────────────────────────────────

function SegControl({ options, value, onChange, accent = '#7ef0d2' }: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  accent?: string;
}) {
  return (
    <View style={styles.seg}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.segBtn, value === opt && { backgroundColor: accent }]}
          onPress={() => onChange(opt)}
          activeOpacity={0.7}
        >
          <Text style={[styles.segBtnText, value === opt && { color: '#04130f' }]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Threshold slider ──────────────────────────────────────────────────────────

function ThreshSlider({ value, onChange, accent = '#7ef0d2', divider }: {
  value: number;
  onChange: (v: number) => void;
  accent?: string;
  divider?: string;
}) {
  const trackWidth = useRef(0);
  const trackRef = useRef<View>(null);
  const startValue = useRef(0);
  const startPageX = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        startPageX.current = e.nativeEvent.pageX;
        startValue.current = value;
        // Also snap to tap position
        trackRef.current?.measure((_x, _y, _w, _h, px) => {
          const pct = Math.max(0, Math.min(1, (e.nativeEvent.pageX - px) / trackWidth.current));
          startValue.current = Math.round(pct * 100);
          startPageX.current = e.nativeEvent.pageX;
          onChange(startValue.current);
        });
      },
      onPanResponderMove: (_e, gs) => {
        const delta = (gs.dx / trackWidth.current) * 100;
        onChange(Math.round(Math.max(0, Math.min(100, startValue.current + delta))));
      },
    })
  ).current;

  const verdictLabel = value >= 78 ? 'GO' : value >= 62 ? 'GO' : value >= 42 ? 'COND' : 'Any';
  const knobLeft = trackWidth.current > 0 ? (value / 100) * trackWidth.current - 11 : 0;
  const fillWidth = trackWidth.current > 0 ? (value / 100) * trackWidth.current : 0;

  return (
    <View style={[styles.sliderWrap, divider && { borderBottomColor: divider }]}>
      <Text style={styles.rowName}>Alert me when tonight scores</Text>
      <View
        ref={trackRef}
        style={styles.sliderTrack}
        onLayout={(e: LayoutChangeEvent) => {
          trackWidth.current = e.nativeEvent.layout.width;
        }}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={['#ffc27a', accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.sliderFill, { width: fillWidth }]}
          pointerEvents="none"
        />
        <View style={[styles.sliderKnob, { left: knobLeft }]} pointerEvents="none" />
      </View>
      <View style={styles.sliderScale}>
        <Text style={styles.sliderScaleText}>0</Text>
        <Text style={[styles.sliderScaleText, { color: accent }]}>
          {verdictLabel} · {value}+
        </Text>
        <Text style={styles.sliderScaleText}>100</Text>
      </View>
    </View>
  );
}

// ── Reusable section primitives ───────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function Card({ children, border, bg }: { children: React.ReactNode; border?: string; bg?: string }) {
  return <View style={[styles.card, border && { borderColor: border }, bg && { backgroundColor: bg }]}>{children}</View>;
}

function Row({
  name, sub, right, onPress, borderless, divider,
}: {
  name: string;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  borderless?: boolean;
  divider?: string;
}) {
  const Inner = (
    <View style={[styles.row, borderless && styles.rowBorderless, divider && { borderBottomColor: divider }]}>
      <View style={styles.rowMain}>
        <Text style={styles.rowName}>{name}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {right && <View style={styles.rowRight}>{right}</View>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {Inner}
      </TouchableOpacity>
    );
  }
  return Inner;
}

// ── Premium pill (for locked label) ──────────────────────────────────────────

function PremPill() {
  return (
    <View style={styles.lockPill}>
      <Text style={styles.lockPillText}>PREMIUM</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [tier, setTier] = useState<Tier>('premium');
  const [thresh, setThresh] = useState(78);
  const [push, setPush] = useState(true);
  const { nightVision, setNightVision } = useNightVision();
  const [tempUnit, setTempUnit] = useState('°F');
  const [clockFmt, setClockFmt] = useState('12h');
  const [milkyWay, setMilkyWay] = useState(true);

  const isPremium = tier === 'premium';
  const unlocked = tier !== 'free';
  const ACCENT = nightVision ? NV_ACCENT : '#7ef0d2';
  const bgColors: [string, string] = nightVision ? ['#100200', '#1a0400'] : ['#070912', '#0a0e1a'];
  const cardBorder = nightVision ? NV_BORDER : 'rgba(255,255,255,0.12)';
  const cardBg = nightVision ? NV_CARD : 'rgba(255,255,255,0.05)';
  const rowDivider = nightVision ? 'rgba(180,60,20,0.15)' : 'rgba(255,255,255,0.06)';
  const premIconBorder = nightVision ? `rgba(224,120,48,0.35)` : `rgba(126,240,210,0.3)`;
  const premIconBg = nightVision ? `rgba(224,120,48,0.12)` : `rgba(126,240,210,0.12)`;

  return (
    <LinearGradient
      colors={bgColors}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Nav bar ── */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navBack} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={[styles.navBackChev, { color: ACCENT }]}>‹</Text>
            <Text style={[styles.navBackLabel, { color: ACCENT }]}>Home</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Settings</Text>
          <View style={styles.navSpacer} />
        </View>

        {/* Dev tier toggle */}
        <View style={styles.devRow}>
          {(['free', 'trial', 'premium'] as Tier[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.devBtn, tier === t && { backgroundColor: 'rgba(126,240,210,0.2)', borderColor: ACCENT }]}
              onPress={() => setTier(t)}
              activeOpacity={0.7}
            >
              <Text style={[styles.devBtnText, tier === t && { color: ACCENT }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── MEMBERSHIP ── */}
        <View style={styles.group}>
          <SectionLabel text="Membership" />
          {isPremium ? (
            <View style={[styles.premCard, { borderColor: cardBorder, backgroundColor: cardBg }]}>
              <View style={[styles.premIcon, { borderColor: premIconBorder, backgroundColor: premIconBg }]}>
                <ForecastMark size={24} accent={ACCENT} />
              </View>
              <View style={styles.premMain}>
                <Text style={styles.premTitle}>StarCast Premium</Text>
                <Text style={styles.premSub}>All features unlocked · thank you</Text>
              </View>
              <Text style={[styles.premCheck, { color: ACCENT }]}>✓</Text>
            </View>
          ) : (
            <TouchableOpacity style={[styles.upgradeCard, { borderColor: ACCENT, backgroundColor: nightVision ? 'rgba(224,120,48,0.10)' : 'rgba(126,240,210,0.08)' }]} activeOpacity={0.8}>
              <View style={[styles.premIcon, { borderColor: premIconBorder, backgroundColor: premIconBg }]}>
                <ForecastMark size={24} accent={ACCENT} />
              </View>
              <View style={styles.premMain}>
                <Text style={styles.premTitle}>StarCast Premium</Text>
                <Text style={styles.premSub}>
                  {tier === 'trial'
                    ? 'Trial active — keep alerts & the full week'
                    : 'Unlock alerts, targets & the 7-night forecast'}
                </Text>
              </View>
              <View style={[styles.upgradeCta, { backgroundColor: ACCENT }]}>
                <Text style={styles.upgradeCtaText}>Upgrade</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── ALERTS ── */}
        <View style={styles.group}>
          <SectionLabel text="Alerts" />
          <Card border={cardBorder} bg={cardBg}>
            {unlocked ? (
              <>
                <ThreshSlider value={thresh} onChange={setThresh} accent={ACCENT} divider={rowDivider} />
                <Row
                  name="Push notifications"
                  sub="A nudge by 6pm on good nights"
                  right={<Toggle value={push} onToggle={() => setPush((p) => !p)} accent={ACCENT} />}
                  divider={rowDivider}
                />
                <Row
                  name="Quiet hours"
                  right={<Text style={styles.rowVal}>11pm – 7am  ›</Text>}
                  onPress={() => {}}
                  borderless
                />
              </>
            ) : (
              <View style={styles.lockedRow}>
                <View style={styles.lockedMain}>
                  <View style={styles.lockedNameRow}>
                    <Text style={styles.rowName}>GO alerts</Text>
                    <PremPill />
                  </View>
                  <Text style={styles.rowSub}>
                    Get pushed when tonight — or a night this week — turns into a GO.
                  </Text>
                </View>
                <TouchableOpacity style={[styles.lockedCta, { backgroundColor: ACCENT }]} activeOpacity={0.8}>
                  <Text style={styles.lockedCtaText}>Unlock</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        </View>

        {/* ── DISPLAY ── */}
        <View style={styles.group}>
          <SectionLabel text="Display" />
          <Card border={cardBorder} bg={cardBg}>
            <Row
              name="Night vision"
              sub="Red mode preserves dark adaptation"
              right={<Toggle value={nightVision} onToggle={() => setNightVision(!nightVision)} accent={ACCENT} />}
              divider={rowDivider}
            />
            <Row
              name="Temperature"
              right={<SegControl options={['°F', '°C']} value={tempUnit} onChange={setTempUnit} accent={ACCENT} />}
              divider={rowDivider}
            />
            <Row
              name="Time format"
              right={<SegControl options={['12h', '24h']} value={clockFmt} onChange={setClockFmt} accent={ACCENT} />}
              divider={rowDivider}
            />
            <Row
              name="Show Milky Way band"
              sub="Overlay on the sky view"
              right={<Toggle value={milkyWay} onToggle={() => setMilkyWay((v) => !v)} accent={ACCENT} />}
              borderless
            />
          </Card>
        </View>

        {/* ── ACCOUNT ── */}
        <View style={styles.group}>
          <SectionLabel text="Account" />
          <Card border={cardBorder} bg={cardBg}>
            <Row
              name="Gear"
              sub='8" Dobsonian · DSLR'
              right={<Text style={styles.rowChev}>›</Text>}
              onPress={() => {}}
              divider={rowDivider}
            />
            <Row
              name="About StarCast"
              sub="Version 1.0"
              right={<Text style={styles.rowChev}>›</Text>}
              onPress={() => {}}
              borderless
            />
          </Card>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 18, paddingBottom: 40 },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  navBack: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 64,
    gap: 2,
  },
  navBackChev: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 20,
    color: '#7ef0d2',
    lineHeight: 24,
  },
  navBackLabel: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 15,
    color: '#7ef0d2',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  navSpacer: { minWidth: 64 },

  // dev tier toggle
  devRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    marginTop: 4,
  },
  devBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  devBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.3,
  },

  // section
  group: { marginTop: 22 },
  sectionLabel: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
    paddingLeft: 4,
    marginBottom: 10,
  },

  // card
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },

  // row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowBorderless: { borderBottomWidth: 0 },
  rowMain: { flex: 1 },
  rowRight: { flexShrink: 0 },
  rowName: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 14.5,
    fontWeight: '500',
    color: '#fff',
  },
  rowSub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    lineHeight: 16,
  },
  rowVal: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  rowChev: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
  },

  // toggle
  toggle: {
    width: 46,
    height: 28,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
  },
  toggleKnob: {
    position: 'absolute',
    left: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  toggleKnobOn: { left: 20 },

  // segmented control
  seg: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 4,
  },
  segBtn: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
  },
  segBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  // slider
  sliderWrap: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 16,
    marginBottom: 10,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  sliderKnob: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    marginLeft: -11,
    top: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderScaleText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.42)',
  },

  // membership — premium status card
  premCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  premIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(126,240,210,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(126,240,210,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  premMain: { flex: 1 },
  premTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  premSub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 3,
    lineHeight: 18,
  },
  premCheck: {
    fontSize: 18,
    fontWeight: '600',
  },

  // membership — upgrade card
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  upgradeCta: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 11,
    flexShrink: 0,
  },
  upgradeCtaText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#04130f',
  },

  // locked alerts row (free tier)
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  lockedMain: { flex: 1 },
  lockedNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  lockedCta: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 11,
    flexShrink: 0,
  },
  lockedCtaText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#04130f',
  },

  // premium pill
  lockPill: {
    borderWidth: 1,
    borderColor: '#7ef0d2',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lockPillText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: '#7ef0d2',
  },
});
