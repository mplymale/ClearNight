import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VERDICTS } from '../src/constants/verdicts';
import { useLocations } from '../src/context/LocationsContext';
import { useNightVision, NV_ACCENT, NV_BORDER, NV_CARD, NV_TEXT, NV_TEXT_DIM, NV_TEXT_FAINT } from '../src/context/NightVisionContext';

export default function ManageLocationsScreen() {
  const insets = useSafeAreaInsets();
  const { locations, removeLocation, setActiveLocIndex } = useLocations();
  const { nightVision } = useNightVision();
  const nvAccent = nightVision ? NV_ACCENT : '#7ef0d2';
  const containerBg = nightVision ? '#150400' : '#080b12';
  const cardBg = nightVision ? NV_CARD : 'rgba(255,255,255,0.04)';
  const cardBorder = nightVision ? NV_BORDER : 'rgba(255,255,255,0.09)';
  const addCardBorder = nightVision ? NV_BORDER : 'rgba(255,255,255,0.09)';
  const textPrimary = nightVision ? NV_TEXT : '#fff';
  const textDim = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.5)';
  const textFaint = nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.35)';

  function handleRemove(i: number) {
    const name = locations[i].name;
    Alert.alert(
      'Remove spot',
      `Remove ${name} from your spots?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeLocation(i) },
      ],
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: containerBg }]}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backChev, { color: nvAccent }]}>‹</Text>
          <Text style={[styles.backLabel, { color: nvAccent }]}>Home</Text>
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: textPrimary }]}>My Spots</Text>
        <TouchableOpacity
          style={styles.navRight}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.doneBtn, { color: nvAccent }]}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {locations.map((loc, i) => {
          const day = loc.days[0];
          const v = VERDICTS[day.verdict];
          const accent = nightVision ? NV_ACCENT : v.accent;
          const label = `${v.label.toUpperCase()} · ${v.word.toUpperCase()}`;

          return (
            <TouchableOpacity
              key={`${loc.name}-${i}`}
              style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
              activeOpacity={0.8}
              onPress={() => {
                setActiveLocIndex(i);
                router.back();
              }}
            >
              {/* Score badge */}
              <View style={[styles.badge, { borderColor: accent }]}>
                <Text style={[styles.badgeScore, { color: accent }]}>{day.score}</Text>
              </View>

              {/* Info */}
              <View style={styles.cardMain}>
                <Text style={[styles.cardName, { color: textPrimary }]}>{loc.name}</Text>
                <Text style={[styles.cardMeta, { color: textDim }]}>Bortle {loc.bortle} · {loc.region}</Text>
                <Text style={[styles.cardVerdict, { color: accent }]}>{label}</Text>
              </View>

              {/* X remove button */}
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemove(i)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.removeBtnText, { color: nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.45)' }]}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        {/* Add a spot */}
        <TouchableOpacity
          style={[styles.addCard, { backgroundColor: cardBg, borderColor: addCardBorder }]}
          activeOpacity={0.8}
          onPress={() => router.push('/add-location')}
        >
          <Text style={styles.addCardText}>+ Add a spot</Text>
        </TouchableOpacity>
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
    paddingTop: 8,
    gap: 10,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 16,
  },

  badge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeScore: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.5,
  },

  cardMain: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  cardMeta: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  cardVerdict: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginTop: 5,
  },

  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  removeBtnText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 16,
  },

  addCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 22,
    alignItems: 'center',
    marginTop: 4,
  },
  addCardText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
});
