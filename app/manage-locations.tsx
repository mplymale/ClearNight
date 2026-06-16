import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VERDICTS } from '../src/constants/verdicts';
import { useLocations } from '../src/context/LocationsContext';

export default function ManageLocationsScreen() {
  const insets = useSafeAreaInsets();
  const { locations, removeLocation, setActiveLocIndex } = useLocations();
  const [editing, setEditing] = useState(false);

  function handleRemove(i: number) {
    const name = locations[i].name;
    Alert.alert(
      'Remove spot',
      `Remove ${name} from your spots?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeLocation(i);
            if (locations.length <= 1) setEditing(false);
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backChev}>‹</Text>
          <Text style={styles.backLabel}>Home</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>My Spots</Text>
        <TouchableOpacity
          style={styles.navRight}
          onPress={() => {
            if (editing) {
              setEditing(false);
            } else if (locations.length > 0) {
              setEditing(true);
            } else {
              router.push('/add-location');
            }
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.editBtnText, editing && styles.editBtnDone]}>
            {editing ? 'Done' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {locations.map((loc, i) => {
          const day = loc.days[0];
          const v = VERDICTS[day.verdict];
          const accent = v.accent;
          const label = `${v.label.toUpperCase()} · ${v.word.toUpperCase()}`;

          return (
            <View key={`${loc.name}-${i}`} style={styles.cardRow}>
              {/* Remove button — shown in edit mode */}
              {editing && (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(i)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.removeBtnText}>−</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.card, editing && styles.cardEditing]}
                activeOpacity={editing ? 1 : 0.8}
                onPress={() => {
                  if (!editing) {
                    setActiveLocIndex(i);
                    router.back();
                  }
                }}
              >
                {/* Score badge */}
                <View style={[styles.badge, { borderColor: accent }]}>
                  <Text style={[styles.badgeScore, { color: accent }]}>{day.score}</Text>
                </View>

                {/* Info */}
                <View style={styles.cardMain}>
                  <Text style={styles.cardName}>{loc.name}</Text>
                  <Text style={styles.cardMeta}>Bortle {loc.bortle} · {loc.region}</Text>
                  <Text style={[styles.cardVerdict, { color: accent }]}>{label}</Text>
                </View>

                {!editing && <Text style={styles.cardChev}>›</Text>}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Add a spot */}
        {!editing && (
          <TouchableOpacity
            style={styles.addCard}
            activeOpacity={0.8}
            onPress={() => router.push('/add-location')}
          >
            <Text style={styles.addCardText}>+ Add a spot</Text>
          </TouchableOpacity>
        )}
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
  editBtnText: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  editBtnDone: {
    color: '#7ef0d2',
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },

  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#c0392b',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  removeBtnText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '600',
  },

  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 16,
  },
  cardEditing: {
    opacity: 0.85,
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

  cardChev: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.25)',
    flexShrink: 0,
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
