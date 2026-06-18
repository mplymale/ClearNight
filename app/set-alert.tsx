import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThreshPreset } from '../src/components/common/ThreshPreset';
import { useLocations } from '../src/context/LocationsContext';
import { useAlerts, AlertPreference } from '../src/context/AlertsContext';
import { usePreferences } from '../src/context/PreferencesContext';
import { ensureNotificationPermission, parseWindowStartDate } from '../src/services/alertScheduling';
import { useNightVision, NV_ACCENT, NV_BORDER, NV_CARD, NV_TEXT, NV_TEXT_DIM, NV_TEXT_FAINT } from '../src/context/NightVisionContext';

const NIGHTS_OPTIONS: { key: AlertPreference['nightsMode']; label: string }[] = [
  { key: 'any', label: 'Any clear night' },
  { key: 'weekends', label: 'Weekends only' },
  { key: 'pick', label: 'Pick nights' },
];

const TIMING_OPTIONS: { key: AlertPreference['timing']; label: string }[] = [
  { key: 'evening', label: 'Evening of' },
  { key: 'dayBefore', label: 'Day before' },
];

export default function SetAlertScreen() {
  const insets = useSafeAreaInsets();
  const { locIndex, type, objIndex, objectName } = useLocalSearchParams<{
    locIndex: string;
    type: 'prime' | 'object';
    objIndex?: string;
    objectName: string;
  }>();
  const { locations } = useLocations();
  const { quietStart, quietEnd } = usePreferences();
  const { nightVision } = useNightVision();
  const nvAccent = nightVision ? NV_ACCENT : '#7ef0d2';
  const containerBg = nightVision ? '#150400' : '#080b12';
  const cardBg = nightVision ? NV_CARD : 'rgba(255,255,255,0.04)';
  const cardBorder = nightVision ? NV_BORDER : 'rgba(255,255,255,0.10)';
  const textPrimary = nightVision ? NV_TEXT : '#fff';
  const textDim = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.65)';
  const textFaint = nightVision ? NV_TEXT_FAINT : 'rgba(255,255,255,0.4)';
  const { setMultiAlert, getAlert } = useAlerts();

  const loc = locations[Number(locIndex) ?? 0];
  const isPrime = type === 'prime';
  const obj = isPrime ? loc.prime : loc.objects[Number(objIndex)];
  const windowLabel = isPrime ? loc.prime.visible : (obj as typeof loc.objects[0]).window;

  const alertKey = `alert-${locIndex}-${type}-${objIndex || 'prime'}`;
  const existing = getAlert(alertKey)?.preference;

  const [threshold, setThreshold] = useState(existing?.threshold ?? 70);
  const [nightsMode, setNightsMode] = useState<AlertPreference['nightsMode']>(existing?.nightsMode ?? 'any');
  const [pickedDays, setPickedDays] = useState<Set<number>>(new Set(existing?.pickedDays ?? []));
  const [timing, setTiming] = useState<AlertPreference['timing']>(existing?.timing ?? 'evening');
  const [saving, setSaving] = useState(false);

  function togglePickedDay(i: number) {
    setPickedDays((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function handleSetAlert() {
    if (nightsMode === 'pick' && pickedDays.size === 0) {
      Alert.alert('Pick at least one night', 'Choose which nights you want alerts for.');
      return;
    }

    setSaving(true);
    try {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        Alert.alert('Notifications disabled', 'Enable notifications in Settings to get alerts.');
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const qualifyingDays = loc.days
        .map((d, i) => ({ d, i }))
        .filter(({ d, i }) => {
          if (d.score < threshold) return false;
          if (nightsMode === 'pick') return pickedDays.has(i);
          if (nightsMode === 'weekends') {
            const dow = new Date(today.getTime() + i * 86400000).getDay(); // 0=Sun, 6=Sat
            return dow === 0 || dow === 6;
          }
          return true; // 'any'
        });

      if (qualifyingDays.length === 0) {
        Alert.alert(
          'No matching nights',
          `None of the next 6 nights meet that threshold yet. We'll keep this saved — try lowering the score or check back later.`
        );
      }

      const fires = qualifyingDays
        .map(({ i }) => {
          const dayBase = new Date(today.getTime() + i * 86400000);
          const windowStart = windowLabel ? parseWindowStartDate(windowLabel, dayBase) : null;
          if (!windowStart) return null;

          let fireDate: Date;
          if (timing === 'dayBefore') {
            fireDate = new Date(dayBase.getTime() - 86400000);
            fireDate.setHours(18, 0, 0, 0); // a sensible evening heads-up, not literally "window time minus a day"
          } else {
            fireDate = windowStart;
          }

          const nightLabel = i === 0 ? 'tonight' : loc.days[i].day;
          return {
            title: `${objectName} is up ${nightLabel}`,
            body:
              timing === 'dayBefore'
                ? `${objectName} should be visible tomorrow night — score ${loc.days[i].score}.`
                : `${objectName}'s window is starting — score ${loc.days[i].score}.`,
            fireDate,
            quietStart,
            quietEnd,
          };
        })
        .filter((f): f is { title: string; body: string; fireDate: Date; quietStart: number; quietEnd: number } => f !== null && f.fireDate.getTime() > Date.now());

      const preference: AlertPreference = {
        threshold,
        nightsMode,
        pickedDays: nightsMode === 'pick' ? Array.from(pickedDays) : undefined,
        timing,
      };

      const count = await setMultiAlert(alertKey, preference, fires);
      if (count > 0) {
        router.back();
      } else if (qualifyingDays.length > 0) {
        Alert.alert("Couldn't schedule", 'Those alert times have already passed.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: containerBg }]}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Text style={[styles.backChev, { color: nvAccent }]}>‹</Text>
          <Text style={[styles.backLabel, { color: nvAccent }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: textPrimary }]}>Set Alert</Text>
        <View style={styles.navRight} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.eyebrow, { color: nvAccent }]}>NOTIFY ME ABOUT</Text>
        <Text style={[styles.objectName, { color: textPrimary }]}>{objectName}</Text>

        {/* Threshold picker */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.cardLabel, { color: textPrimary }]}>Alert me on</Text>
          <View style={{ marginTop: 14 }}>
            <ThreshPreset value={threshold} onChange={setThreshold} accent={nvAccent} />
          </View>
        </View>

        {/* Which nights */}
        <Text style={[styles.sectionLabel, { color: textFaint }]}>WHICH NIGHTS</Text>
        <View style={styles.pillRow}>
          {NIGHTS_OPTIONS.map((opt) => {
            const selected = nightsMode === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.pill, { borderColor: cardBorder, backgroundColor: cardBg }, selected && { borderColor: nvAccent, backgroundColor: nightVision ? 'rgba(224,120,48,0.10)' : 'rgba(126,240,210,0.10)' }]}
                activeOpacity={0.8}
                onPress={() => setNightsMode(opt.key)}
              >
                <Text style={[styles.pillText, { color: textDim }, selected && { color: nvAccent }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {nightsMode === 'pick' && (
          <View style={styles.dayPickRow}>
            {loc.days.map((d, i) => {
              const selected = pickedDays.has(i);
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dayChip, { borderColor: cardBorder, backgroundColor: cardBg }, selected && { borderColor: nvAccent, backgroundColor: nightVision ? 'rgba(224,120,48,0.10)' : 'rgba(126,240,210,0.10)' }]}
                  activeOpacity={0.8}
                  onPress={() => togglePickedDay(i)}
                >
                  <Text style={[styles.dayChipText, { color: textDim }, selected && { color: nvAccent }]}>
                    {i === 0 ? 'Now' : d.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* When to ping me */}
        <Text style={[styles.sectionLabel, { color: textFaint }]}>WHEN TO PING ME</Text>
        <View style={[styles.segWrap, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          {TIMING_OPTIONS.map((opt) => {
            const selected = timing === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.segBtn, selected && { backgroundColor: nvAccent }]}
                activeOpacity={0.8}
                onPress={() => setTiming(opt.key)}
              >
                <Text style={[styles.segBtnText, { color: textDim }, selected && { color: '#04130f' }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.setBtn, { backgroundColor: nvAccent }, saving && { opacity: 0.6 }]}
          activeOpacity={0.85}
          onPress={handleSetAlert}
          disabled={saving}
        >
          <Text style={styles.setBtnText}>Set alert</Text>
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
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 70 },
  backChev: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 28, lineHeight: 32 },
  backLabel: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 15 },
  navTitle: {
    flex: 1,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  navRight: { minWidth: 70 },

  scroll: {
    paddingHorizontal: 18,
  },

  eyebrow: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#7ef0d2',
    marginTop: 12,
  },
  objectName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.4,
    marginTop: 4,
    marginBottom: 24,
  },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 18,
    marginBottom: 28,
  },
  cardLabel: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 15,
    color: '#fff',
  },

  sectionLabel: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 12,
  },

  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  pill: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pillSelected: {
    borderColor: '#7ef0d2',
    backgroundColor: 'rgba(126,240,210,0.10)',
  },
  pillText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },

  dayPickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -10,
    marginBottom: 24,
  },
  dayChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dayChipSelected: {
    borderColor: '#7ef0d2',
    backgroundColor: 'rgba(126,240,210,0.10)',
  },
  dayChipText: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },

  segWrap: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 5,
    marginBottom: 32,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  segBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
  },

  setBtn: {
    borderRadius: 999,
    backgroundColor: '#7ef0d2',
    paddingVertical: 17,
    alignItems: 'center',
  },
  setBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#04130f',
  },
});
