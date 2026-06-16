import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT = '#7ef0d2';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
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
          <Text style={styles.navTitle}>Privacy Policy</Text>
          <View style={styles.navSpacer} />
        </View>

        <Text style={styles.updated}>Last updated: June 2026</Text>

        <Section title="Overview">
          StarCast ("we", "our", or "us") is committed to protecting your privacy. This policy explains what information we collect, how we use it, and your choices regarding your data.
        </Section>

        <Section title="Information We Collect">
          {"Location data: We request access to your device's location to generate sky forecasts for your area. Location is used only locally on your device and is not transmitted to our servers.\n\nUsage data: We may collect anonymous, aggregated usage statistics to improve the app. This data cannot be used to identify you personally.\n\nPurchase data: If you subscribe to StarCast Premium, Apple handles all payment processing. We do not store your payment information."}
        </Section>

        <Section title="How We Use Your Information">
          {"• To generate accurate sky and weather forecasts for your location\n• To deliver push notifications you have opted into\n• To restore your subscription status across devices\n• To improve app performance and fix bugs"}
        </Section>

        <Section title="Data Sharing">
          We do not sell, trade, or rent your personal information to third parties. We may share anonymized, aggregated data with analytics providers to help us understand how the app is used.
        </Section>

        <Section title="Push Notifications">
          If you enable alerts, we schedule notifications locally on your device. No location data is sent to external servers to generate these alerts.
        </Section>

        <Section title="Data Retention">
          All forecast preferences and location data are stored locally on your device. You can delete this data at any time by uninstalling the app.
        </Section>

        <Section title="Children's Privacy">
          StarCast is not directed at children under 13. We do not knowingly collect personal information from children under 13.
        </Section>

        <Section title="Changes to This Policy">
          We may update this Privacy Policy from time to time. We will notify you of any significant changes by updating the date at the top of this page.
        </Section>

        <Section title="Contact Us">
          If you have questions about this Privacy Policy, please contact us at privacy@starcastapp.com
        </Section>
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
  navBack: { flexDirection: 'row', alignItems: 'center', minWidth: 80, gap: 2 },
  navBackChev: { fontSize: 20, lineHeight: 24 },
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

  updated: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 24,
  },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  body: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 22,
  },
});
