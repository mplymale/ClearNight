import React, { useState, useRef } from 'react';
import {
  LayoutChangeEvent,
  Modal,
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
import { useNightVision, NV_ACCENT, NV_BORDER, NV_CARD, NV_TEXT, NV_TEXT_DIM, NV_TEXT_FAINT } from '../src/context/NightVisionContext';
import { usePreferences, formatQuietHours } from '../src/context/PreferencesContext';
import { CheckIcon } from '../src/components/common/CheckIcon';
import { ThreshPreset } from '../src/components/common/ThreshPreset';

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

function ThreshPresetRow({ value, onChange, accent = '#7ef0d2', divider }: {
  value: number;
  onChange: (v: number) => void;
  accent?: string;
  divider?: string;
}) {
  return (
    <View style={[styles.sliderWrap, divider && { borderBottomColor: divider }]}>
      <Text style={styles.rowName}>Alert me on</Text>
      <View style={{ marginTop: 12 }}>
        <ThreshPreset value={value} onChange={onChange} accent={accent} />
      </View>
    </View>
  );
}

// ── Reusable section primitives ───────────────────────────────────────────────

function SectionLabel({ text, color }: { text: string; color?: string }) {
  return <Text style={[styles.sectionLabel, color && { color }]}>{text}</Text>;
}

function Card({ children, border, bg }: { children: React.ReactNode; border?: string; bg?: string }) {
  return <View style={[styles.card, border && { borderColor: border }, bg && { backgroundColor: bg }]}>{children}</View>;
}

function Row({
  name, sub, right, onPress, borderless, divider, nameColor, subColor,
}: {
  name: string;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  borderless?: boolean;
  divider?: string;
  nameColor?: string;
  subColor?: string;
}) {
  const Inner = (
    <View style={[styles.row, borderless && styles.rowBorderless, divider && { borderBottomColor: divider }]}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowName, nameColor && { color: nameColor }]}>{name}</Text>
        {sub && <Text style={[styles.rowSub, subColor && { color: subColor }]}>{sub}</Text>}
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

// ── Quiet hours picker modal ──────────────────────────────────────────────────

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);

function hourLabel(h: number, use24h: boolean): string {
  if (use24h) return `${String(h).padStart(2, '0')}:00`;
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function QuietHoursPicker({
  visible,
  quietStart,
  quietEnd,
  use24h,
  accent,
  onChangeStart,
  onChangeEnd,
  onClose,
}: {
  visible: boolean;
  quietStart: number;
  quietEnd: number;
  use24h: boolean;
  accent: string;
  onChangeStart: (h: number) => void;
  onChangeEnd: (h: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={qStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={qStyles.sheet}>
        <View style={qStyles.handle} />
        <Text style={qStyles.title}>Quiet hours</Text>
        <Text style={qStyles.sub}>Notifications won't fire during this window</Text>

        <View style={qStyles.columns}>
          {/* Start column */}
          <View style={qStyles.col}>
            <Text style={qStyles.colLabel}>FROM</Text>
            <ScrollView
              style={qStyles.scroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={qStyles.scrollContent}
            >
              {HOURS_24.map((h) => {
                const selected = h === quietStart;
                return (
                  <TouchableOpacity
                    key={h}
                    style={[qStyles.hourBtn, selected && { backgroundColor: accent + '22', borderColor: accent }]}
                    onPress={() => onChangeStart(h)}
                    activeOpacity={0.7}
                  >
                    <Text style={[qStyles.hourText, selected && { color: accent }]}>
                      {hourLabel(h, use24h)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={qStyles.dividerVert} />

          {/* End column */}
          <View style={qStyles.col}>
            <Text style={qStyles.colLabel}>UNTIL</Text>
            <ScrollView
              style={qStyles.scroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={qStyles.scrollContent}
            >
              {HOURS_24.map((h) => {
                const selected = h === quietEnd;
                return (
                  <TouchableOpacity
                    key={h}
                    style={[qStyles.hourBtn, selected && { backgroundColor: accent + '22', borderColor: accent }]}
                    onPress={() => onChangeEnd(h)}
                    activeOpacity={0.7}
                  >
                    <Text style={[qStyles.hourText, selected && { color: accent }]}>
                      {hourLabel(h, use24h)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <TouchableOpacity style={[qStyles.doneBtn, { backgroundColor: accent }]} onPress={onClose} activeOpacity={0.85}>
          <Text style={qStyles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const qStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#0e1320',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 18,
  },
  title: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  sub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 20,
  },
  columns: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  col: {
    flex: 1,
  },
  colLabel: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 10,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginBottom: 8,
  },
  scroll: {
    maxHeight: 220,
  },
  scrollContent: {
    gap: 6,
  },
  hourBtn: {
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  hourText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
  },
  dividerVert: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'stretch',
  },
  doneBtn: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#04130f',
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [tier, setTier] = useState<Tier>('premium');
  const [thresh, setThresh] = useState(78);
  const [push, setPush] = useState(true);
  const [quietPickerVisible, setQuietPickerVisible] = useState(false);
  const { nightVision, setNightVision } = useNightVision();
  const { use24h, setUse24h, useCelsius, setUseCelsius, quietStart, quietEnd, setQuietStart, setQuietEnd } = usePreferences();

  const isPremium = tier === 'premium';
  const unlocked = tier !== 'free';
  const ACCENT = nightVision ? NV_ACCENT : '#7ef0d2';
  const bgColors: [string, string] = nightVision ? ['#100200', '#1a0400'] : ['#070912', '#0a0e1a'];
  const cardBorder = nightVision ? NV_BORDER : 'rgba(255,255,255,0.12)';
  const cardBg = nightVision ? NV_CARD : 'rgba(255,255,255,0.05)';
  const rowDivider = nightVision ? 'rgba(180,60,20,0.15)' : 'rgba(255,255,255,0.06)';
  const premIconBorder = nightVision ? `rgba(224,120,48,0.35)` : `rgba(126,240,210,0.3)`;
  const premIconBg = nightVision ? `rgba(224,120,48,0.12)` : `rgba(126,240,210,0.12)`;
  const textPrimary = nightVision ? NV_TEXT : '#fff';
  const textDim = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.6)';
  const textFaint = nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.4)';

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
          <Text style={[styles.navTitle, { color: textPrimary }]}>Settings</Text>
          <TouchableOpacity style={styles.navSpacer} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={[styles.navDone, { color: ACCENT }]}>Done</Text>
          </TouchableOpacity>
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
          <SectionLabel text="Membership" color={textFaint} />
          {isPremium ? (
            <View style={[styles.premCard, { borderColor: cardBorder, backgroundColor: cardBg }]}>
              <View style={[styles.premIcon, { borderColor: premIconBorder, backgroundColor: premIconBg }]}>
                <ForecastMark size={24} accent={ACCENT} />
              </View>
              <View style={styles.premMain}>
                <Text style={[styles.premTitle, { color: textPrimary }]}>ClearNight Premium</Text>
                <Text style={[styles.premSub, { color: textDim }]}>All features unlocked · thank you</Text>
              </View>
              <CheckIcon size={18} color={ACCENT} strokeWidth={2.5} />
            </View>
          ) : (
            <TouchableOpacity style={[styles.upgradeCard, { borderColor: ACCENT, backgroundColor: nightVision ? 'rgba(224,120,48,0.10)' : 'rgba(126,240,210,0.08)' }]} activeOpacity={0.8}>
              <View style={[styles.premIcon, { borderColor: premIconBorder, backgroundColor: premIconBg }]}>
                <ForecastMark size={24} accent={ACCENT} />
              </View>
              <View style={styles.premMain}>
                <Text style={[styles.premTitle, { color: textPrimary }]}>ClearNight Premium</Text>
                <Text style={[styles.premSub, { color: textDim }]}>
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
          <SectionLabel text="Alerts" color={textFaint} />
          <Card border={cardBorder} bg={cardBg}>
            {unlocked ? (
              <>
                <ThreshPresetRow value={thresh} onChange={setThresh} accent={ACCENT} divider={rowDivider} />
                <Row
                  name="Push notifications"
                  sub="A nudge by 6pm on good nights"
                  right={<Toggle value={push} onToggle={() => setPush((p) => !p)} accent={ACCENT} />}
                  divider={rowDivider}
                  nameColor={textPrimary} subColor={textDim}
                />
                <Row
                  name="Quiet hours"
                  right={<Text style={[styles.rowVal, { color: textDim }]}>{formatQuietHours(quietStart, quietEnd, use24h)}  ›</Text>}
                  onPress={() => setQuietPickerVisible(true)}
                  nameColor={textPrimary}
                  borderless
                />
              </>
            ) : (
              <View style={styles.lockedRow}>
                <View style={styles.lockedMain}>
                  <View style={styles.lockedNameRow}>
                    <Text style={[styles.rowName, { color: textPrimary }]}>GO alerts</Text>
                    <PremPill />
                  </View>
                  <Text style={[styles.rowSub, { color: textDim }]}>
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
          <SectionLabel text="Display" color={textFaint} />
          <Card border={cardBorder} bg={cardBg}>
            <Row
              name="Night vision"
              sub="Red mode preserves dark adaptation"
              right={<Toggle value={nightVision} onToggle={() => setNightVision(!nightVision)} accent={ACCENT} />}
              divider={rowDivider}
              nameColor={textPrimary} subColor={textDim}
            />
            <Row
              name="Temperature"
              right={<SegControl options={['°F', '°C']} value={useCelsius ? '°C' : '°F'} onChange={(v) => setUseCelsius(v === '°C')} accent={ACCENT} />}
              divider={rowDivider}
              nameColor={textPrimary}
            />
            <Row
              name="Time format"
              right={<SegControl options={['12h', '24h']} value={use24h ? '24h' : '12h'} onChange={(v) => setUse24h(v === '24h')} accent={ACCENT} />}
              borderless
              nameColor={textPrimary}
            />
          </Card>
        </View>

        {/* ── ACCOUNT ── */}
        <View style={styles.group}>
          <SectionLabel text="Account" color={textFaint} />
          <Card border={cardBorder} bg={cardBg}>
            <Row
              name="Redeem offer code"
              right={<Text style={[styles.rowChev, { color: textDim }]}>›</Text>}
              onPress={() => router.push('/redeem-code')}
              divider={rowDivider}
              nameColor={textPrimary}
            />
            <Row
              name="Privacy Policy"
              right={<Text style={[styles.rowChev, { color: textDim }]}>›</Text>}
              onPress={() => router.push('/privacy-policy')}
              divider={rowDivider}
              nameColor={textPrimary}
            />
            <Row
              name="Terms of Use"
              right={<Text style={[styles.rowChev, { color: textDim }]}>›</Text>}
              onPress={() => router.push('/terms')}
              divider={rowDivider}
              nameColor={textPrimary}
            />
            <Row
              name="About ClearNight"
              sub="Version 1.0"
              right={<Text style={[styles.rowChev, { color: textDim }]}>›</Text>}
              onPress={() => router.push('/about')}
              borderless
              nameColor={textPrimary} subColor={textDim}
            />
          </Card>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <QuietHoursPicker
        visible={quietPickerVisible}
        quietStart={quietStart}
        quietEnd={quietEnd}
        use24h={use24h}
        accent={ACCENT}
        onChangeStart={setQuietStart}
        onChangeEnd={setQuietEnd}
        onClose={() => setQuietPickerVisible(false)}
      />
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
    gap: 6,
  },
  navBackChev: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 28,
    lineHeight: 32,
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
  navSpacer: { minWidth: 64, alignItems: 'flex-end' },
  navDone: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 16,
  },

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
