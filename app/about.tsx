import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLogo } from '../src/components/common/AppLogo';

const ACCENT = '#7ef0d2';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={['#070912', '#0a0e1a']} style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navBack} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={[styles.navBackChev, { color: ACCENT }]}>‹</Text>
            <Text style={[styles.navBackLabel, { color: ACCENT }]}>Settings</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>About</Text>
          <View style={styles.navSpacer} />
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <AppLogo size={56} animate={false} />
          </View>
          <Text style={styles.heroName}>ClearNight</Text>
          <Text style={styles.heroVersion}>Version 1.0.0</Text>
        </View>

        <Text style={styles.tagline}>
          Clear skies, perfectly timed.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardBody}>
            ClearNight helps amateur astronomers and astrophotographers plan their nights around the sky — not just the weather. We combine seeing conditions, light pollution estimates, celestial object windows, and cloud forecasts into a single score so you know exactly when to go out.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardBody}>
            Built with love for the dark-sky community. If you have feedback, spot a bug, or just want to say hi — we'd love to hear from you.
          </Text>
        </View>

        <View style={styles.metaList}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Developer</Text>
            <Text style={styles.metaValue}>Strange Glyph</Text>
          </View>
          <View style={styles.metaDivider} />
          <TouchableOpacity
            style={styles.metaRow}
            activeOpacity={0.7}
            onPress={() => Linking.openURL('mailto:info@strangeglyph.com')}
          >
            <Text style={styles.metaLabel}>Contact</Text>
            <Text style={[styles.metaValue, { color: ACCENT }]}>info@strangeglyph.com</Text>
          </TouchableOpacity>
          <View style={styles.metaDivider} />
          <TouchableOpacity
            style={styles.metaRow}
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://www.clearnightapp.com')}
          >
            <Text style={styles.metaLabel}>Website</Text>
            <Text style={[styles.metaValue, { color: ACCENT }]}>clearnightapp.com</Text>
          </TouchableOpacity>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Version</Text>
            <Text style={styles.metaValue}>1.0.0 (1)</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Platform</Text>
            <Text style={styles.metaValue}>iOS</Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    gap: 8,
  },
  navBack: { flexDirection: 'row', alignItems: 'center', minWidth: 80, gap: 6 },
  navBackChev: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 28, lineHeight: 32 },
  navBackLabel: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 15 },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  navSpacer: { minWidth: 80 },

  hero: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(126,240,210,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(126,240,210,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.3,
  },
  heroVersion: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
  },

  tagline: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 16,
    color: ACCENT,
    textAlign: 'center',
    marginBottom: 28,
    fontStyle: 'italic',
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 18,
    marginBottom: 12,
  },
  cardBody: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 14.5,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 22,
  },

  metaList: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginTop: 8,
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metaDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 16,
  },
  metaLabel: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 14.5,
    color: '#fff',
  },
  metaValue: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 14.5,
    color: 'rgba(255,255,255,0.5)',
  },
});
