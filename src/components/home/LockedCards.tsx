import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { Verdict } from '../../constants/verdicts';

// ── Tiny icons ──────────────────────────────────────────────────────────────

function IcWeek() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Rect x={2}   y={9} width={3} height={6} rx={1} fill="#fff" />
      <Rect x={7.5} y={5} width={3} height={10} rx={1} fill="#fff" />
      <Rect x={13}  y={7} width={3} height={8}  rx={1} fill="#fff" />
    </Svg>
  );
}

function IcAlert() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Circle cx={9} cy={9} r={3} fill="#fff" />
      <Circle cx={9} cy={9} r={7} stroke="#fff" strokeWidth={1.4} opacity={0.55} />
    </Svg>
  );
}

// ── Mini blurred week bars ────────────────────────────────────────────────

function WeekPreview({ scores, accent }: { scores: number[]; accent: string }) {
  return (
    <View style={styles.weekPreview}>
      {scores.map((s, i) => (
        <View
          key={i}
          style={[
            styles.weekBar,
            { height: 6 + s * 0.24, backgroundColor: accent },
          ]}
        />
      ))}
    </View>
  );
}

// ── Premium pill ──────────────────────────────────────────────────────────

function PremiumPill({ accent }: { accent: string }) {
  return (
    <View style={[styles.pill, { borderColor: accent }]}>
      <Text style={[styles.pillText, { color: accent }]}>PREMIUM</Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────

interface Props {
  verdict: Verdict;
  weekScores: number[];
  onUpgrade: () => void;
}

export function LockedCards({ verdict: v, weekScores, onUpgrade }: Props) {
  return (
    <View style={styles.container}>
      {/* Card 1 — The week ahead */}
      <TouchableOpacity style={styles.card} onPress={onUpgrade} activeOpacity={0.75}>
        <View style={styles.cardIcon}>
          <IcWeek />
        </View>
        <View style={styles.cardMain}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>The week ahead</Text>
            <PremiumPill accent={v.accent} />
          </View>
          <Text style={styles.cardSub}>See clear nights up to 7 days out</Text>
        </View>
        <WeekPreview scores={weekScores} accent={v.accent} />
      </TouchableOpacity>

      {/* Card 2 — Never miss a GO (accent) */}
      <View style={[styles.card, styles.cardAccent, { backgroundColor: v.accentSoft, borderColor: v.accent }]}>
        <View style={[styles.cardIcon, styles.cardIconAccent]}>
          <IcAlert />
        </View>
        <View style={styles.cardMain}>
          <Text style={styles.cardTitle}>Never miss a GO</Text>
          <Text style={styles.cardSub}>Get a push the moment tonight turns clear</Text>
        </View>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: v.accent }]}
          onPress={onUpgrade}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaBtnText}>Upgrade</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 11,
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  // ── Card base ──
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  cardAccent: {
    // borderColor and backgroundColor set inline from verdict
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    color: '#fff',
  },
  cardIconAccent: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  cardMain: {
    flex: 1,
    gap: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15.5,
    fontWeight: '600',
    color: '#fff',
  },
  cardSub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 16,
  },
  cardChev: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
  },

  // ── Premium pill ──
  pill: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pillText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
  },

  // ── Mini week bars ──
  weekPreview: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 30,
    width: 64,
    flexShrink: 0,
    opacity: 0.7,
  },
  weekBar: {
    flex: 1,
    borderRadius: 2,
  },

  // ── Turn on CTA ──
  ctaBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 11,
    flexShrink: 0,
  },
  ctaBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#04130f',
  },
});
