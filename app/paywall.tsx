import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useSubscription } from '../src/context/SubscriptionContext';
import { useNightVision, NV_ACCENT, NV_TEXT, NV_TEXT_DIM, NV_TEXT_FAINT } from '../src/context/NightVisionContext';
import { AppLogo } from '../src/components/common/AppLogo';
import { CheckIcon } from '../src/components/common/CheckIcon';

const ACCENT = '#7ef0d2';
const ACCENT_SOFT = 'rgba(126,240,210,0.15)';

// ── Icons ─────────────────────────────────────────────────────────────────────

function IcWeek({ color }: { color: string }) {
  // Calendar grid — 7 nights
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Rect x={2} y={4} width={14} height={11} rx={2} stroke={color} strokeWidth={1.5} />
      <Path d="M2 7.5 L16 7.5" stroke={color} strokeWidth={1.2} />
      <Path d="M6 3 L6 5.5M12 3 L12 5.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Rect x={4.5} y={9.5} width={2} height={2} rx={0.5} fill={color} />
      <Rect x={8} y={9.5} width={2} height={2} rx={0.5} fill={color} />
      <Rect x={11.5} y={9.5} width={2} height={2} rx={0.5} fill={color} />
    </Svg>
  );
}
function IcTarget({ color }: { color: string }) {
  // Bullseye — sky targets
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Circle cx={9} cy={9} r={7} stroke={color} strokeWidth={1.5} />
      <Circle cx={9} cy={9} r={3.5} stroke={color} strokeWidth={1.2} />
      <Circle cx={9} cy={9} r={1.2} fill={color} />
    </Svg>
  );
}
function IcAlert({ color }: { color: string }) {
  // Bell — GO alerts
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path d="M9 2.5 C6.5 2.5 4.5 4.5 4.5 7 L4.5 11 L3 12.5 L15 12.5 L13.5 11 L13.5 7 C13.5 4.5 11.5 2.5 9 2.5 Z" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M7.2 12.5 C7.2 13.6 8 14.5 9 14.5 C10 14.5 10.8 13.6 10.8 12.5" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}
function IcSpots({ color }: { color: string }) {
  // Location pin — saved spots
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path d="M9 2 C6.2 2 4 4.2 4 7 C4 10.5 9 16 9 16 C9 16 14 10.5 14 7 C14 4.2 11.8 2 9 2 Z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Circle cx={9} cy={7} r={1.8} fill={color} />
    </Svg>
  );
}
function IcGear({ color }: { color: string }) {
  // Telescope/scope — gear-tuned scoring
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path d="M3 6 L12 4 L15 9 L6 11 Z" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M6 11 L7 15" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M5 15 L9 15" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={12.5} cy={6.5} r={1} fill={color} />
    </Svg>
  );
}
function IcHour({ color }: { color: string }) {
  // Clock — hour-by-hour
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Circle cx={9} cy={9} r={6.5} stroke={color} strokeWidth={1.5} />
      <Path d="M9 5.5 L9 9 L11.5 11.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Plans ─────────────────────────────────────────────────────────────────────

const PLANS: { id: string; name: string; amt: string; per: string; note: string; badge?: string; save?: string }[] = [
  { id: 'annual',   name: 'Annual',   amt: '$12.99', per: '/year',  note: '7-day free trial, then billed yearly', badge: 'Best value', save: 'Save 46%' },
  { id: 'monthly',  name: 'Monthly',  amt: '$1.99',  per: '/month', note: '7-day free trial, then monthly' },
  { id: 'lifetime', name: 'Lifetime', amt: '$29.99', per: 'once',   note: 'Pay once — yours forever, no subscription' },
];

const FEATURE_DEFS: { Icon: React.ComponentType<{ color: string }>; text: string }[] = [
  { Icon: IcSpots,  text: 'Unlimited saved spots' },
  { Icon: IcWeek,   text: 'Full 7-night forecast' },
  { Icon: IcAlert,  text: 'Sky alerts + lookahead' },
  { Icon: IcTarget, text: 'Prime targets & timing' },
  { Icon: IcHour,   text: 'Hour-by-hour clarity' },
  { Icon: IcGear,   text: 'Gear-tuned scoring' },
];

// ── Success state ─────────────────────────────────────────────────────────────

function SuccessView({ returnTo, locIndex, type, objIndex }: {
  returnTo?: string;
  locIndex?: string;
  type?: string;
  objIndex?: string;
}) {
  const insets = useSafeAreaInsets();
  const { nightVision } = useNightVision();
  const nvAccent = nightVision ? NV_ACCENT : ACCENT;
  const textPrimary = nightVision ? NV_TEXT : '#fff';
  const textDim = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.65)';

  function handleContinue() {
    if (returnTo === 'object-detail') {
      router.replace({ pathname: '/object-detail', params: { locIndex, type, objIndex } });
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <LinearGradient colors={nightVision ? ['#100200', '#1a0400', '#200500'] : ['#04060e', '#061510', '#081f18']} style={styles.container}>
      <View style={[styles.successWrap, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 32 }]}>
        <View style={[styles.successMark, { borderColor: nvAccent, backgroundColor: nightVision ? 'rgba(224,120,48,0.15)' : ACCENT_SOFT }]}>
          <CheckIcon size={28} color="#04130f" strokeWidth={2.5} />
        </View>
        <Text style={[styles.successTitle, { color: textPrimary }]}>You're all set</Text>
        <Text style={[styles.successBody, { color: textDim }]}>
          ClearNight Premium is unlocked. Every spot, the full week, and alerts the moment your sky clears.
        </Text>
        <TouchableOpacity style={[styles.ctaBtn, { maxWidth: 280, alignSelf: 'center', width: '100%', marginTop: 0, backgroundColor: nvAccent }]} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.ctaBtnText}>Start exploring</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { setStatus } = useSubscription();
  const { nightVision } = useNightVision();
  const nvAccent = nightVision ? NV_ACCENT : ACCENT;
  const textPrimary = nightVision ? NV_TEXT : '#fff';
  const textDim = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.62)';
  const textFaint = nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.5)';
  const { returnTo, locIndex, type, objIndex } = useLocalSearchParams<{
    returnTo?: string;
    locIndex?: string;
    type?: string;
    objIndex?: string;
  }>();
  const [plan, setPlan] = useState<'annual' | 'monthly' | 'lifetime'>('annual');
  const [done, setDone] = useState(false);

  if (done) return <SuccessView returnTo={returnTo} locIndex={locIndex} type={type} objIndex={objIndex} />;

  const sel = PLANS.find((p) => p.id === plan)!;
  const ctaLabel = plan === 'lifetime'
    ? `Unlock forever — $29.99`
    : `Start 7-day free trial`;
  const ctaNote = plan === 'annual'
    ? 'Free for 7 days, then $12.99/year. Cancel anytime.'
    : plan === 'monthly'
    ? 'Free for 7 days, then $1.99/month. Cancel anytime.'
    : 'One payment of $29.99. No subscription, ever.';

  return (
    <LinearGradient colors={nightVision ? ['#100200', '#1a0400', '#200500'] : ['#04060e', '#06121f', '#0a1e2e']} style={styles.container}>
      {/* Nav */}
      <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.notNow}>
          <Text style={[styles.notNowText, { color: textFaint }]}>Not now</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <AppLogo size={90} />
          <Text style={[styles.kicker, { color: nvAccent }]}>ClearNight Premium</Text>
          <Text style={[styles.heroTitle, { color: textPrimary }]}>Never miss a clear night</Text>
          <Text style={[styles.heroSub, { color: textDim }]}>
            Plan ahead, chase every GO window, and get a nudge the moment the sky opens up.
          </Text>
        </View>

        {/* Features 2-col grid */}
        <View style={styles.features}>
          {FEATURE_DEFS.map((f, i) => (
            <View key={i} style={styles.feat}>
              <View style={[styles.featIcon, { borderColor: nvAccent, backgroundColor: nightVision ? 'rgba(224,120,48,0.15)' : ACCENT_SOFT }]}>
                <f.Icon color={nvAccent} />
              </View>
              <Text style={[styles.featText, { color: textDim }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Plan selector */}
        <View style={styles.plans}>
          {PLANS.map((p) => {
            const on = plan === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.planRow, on && { borderColor: nvAccent, backgroundColor: nightVision ? 'rgba(224,120,48,0.12)' : ACCENT_SOFT }]}
                onPress={() => setPlan(p.id as any)}
                activeOpacity={0.8}
              >
                {/* Radio */}
                <View style={[styles.radio, on && { borderColor: nvAccent, backgroundColor: nvAccent }]}>
                  {on && <CheckIcon size={11} color="#04130f" strokeWidth={2.8} />}
                </View>

                {/* Name + note */}
                <View style={styles.planMain}>
                  <View style={styles.planNameRow}>
                    <Text style={[styles.planName, { color: textPrimary }]}>{p.name}</Text>
                    {p.badge && (
                      <View style={[styles.badge, { backgroundColor: nvAccent }]}>
                        <Text style={styles.badgeText}>{p.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.planNote, { color: textFaint }]}>
                    {p.note}
                    {p.save && <Text style={[styles.planSave, { color: nvAccent }]}> · {p.save}</Text>}
                  </Text>
                </View>

                {/* Price */}
                <View style={styles.planPrice}>
                  <Text style={[styles.planAmt, { color: textPrimary }]}>{p.amt}</Text>
                  <Text style={[styles.planPer, { color: textFaint }]}>{p.per}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: nvAccent }]}
          onPress={() => {
            // Checkout "succeeded" — stop showing the trial nag everywhere
            // else in the app from this point on.
            setStatus('subscribed');
            setDone(true);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>{ctaLabel}</Text>
        </TouchableOpacity>
        <Text style={[styles.ctaNote, { color: textFaint }]}>{ctaNote}</Text>

        <TouchableOpacity activeOpacity={0.7} style={styles.restoreBtn}>
          <Text style={[styles.restoreText, { color: nvAccent }]}>Restore purchase</Text>
        </TouchableOpacity>

        <Text style={[styles.legal, { color: nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.34)' }]}>
          Payment is charged to your App Store account. Subscriptions auto-renew unless cancelled at least 24h before the period ends.{'  '}
          <Text style={{ textDecorationLine: 'underline' }}>Terms</Text>
          {'  '}
          <Text style={{ textDecorationLine: 'underline' }}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  nav: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    alignItems: 'flex-start',
  },
  notNow: { padding: 4 },
  notNowText: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },

  scroll: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 22,
    gap: 6,
  },
  kicker: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: ACCENT,
    marginTop: 10,
  },
  heroTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 30,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginTop: 4,
  },
  heroSub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.62)',
    textAlign: 'center',
    maxWidth: 270,
    marginTop: 2,
  },

  // Features
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 24,
  },
  feat: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  featIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT_SOFT,
    borderWidth: 1,
    borderColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
    color: ACCENT,
  },
  featText: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.86)',
    flex: 1,
  },

  // Plans
  plans: { gap: 10, marginBottom: 4 },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 15,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioCheck: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
    fontWeight: '700',
    color: '#04130f',
    lineHeight: 14,
  },
  planMain: { flex: 1 },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  badge: {
    backgroundColor: ACCENT,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#04130f',
  },
  planNote: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  planSave: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    fontWeight: '600',
  },
  planPrice: { alignItems: 'flex-end', flexShrink: 0 },
  planAmt: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  planPer: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },

  // CTA
  ctaBtn: {
    marginTop: 20,
    borderRadius: 999,
    backgroundColor: ACCENT,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 17,
    fontWeight: '600',
    color: '#1a2e28',
  },
  ctaNote: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 11,
    lineHeight: 17,
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  restoreText: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 13.5,
    color: ACCENT,
  },
  legal: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.34)',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Success
  successWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 26,
  },
  successMark: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: ACCENT_SOFT,
    borderWidth: 1.5,
    borderColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  successCheck: {
    fontSize: 36,
    color: ACCENT,
  },
  successTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  successBody: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 26,
  },
});
