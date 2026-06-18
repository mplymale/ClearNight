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

export default function TermsScreen() {
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
          <Text style={styles.navTitle}>Terms of Use</Text>
          <View style={styles.navSpacer} />
        </View>

        <Text style={styles.updated}>Last updated: June 2026</Text>

        <Section title="Acceptance of Terms">
          By downloading or using ClearNight, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use the app.
        </Section>

        <Section title="Use of the App">
          {"ClearNight is provided for personal, non-commercial use. You agree not to:\n\n• Reverse engineer, decompile, or disassemble the app\n• Use the app for any unlawful purpose\n• Attempt to gain unauthorized access to any part of the app or its infrastructure\n• Reproduce or distribute any part of the app without our written permission"}
        </Section>

        <Section title="Subscriptions">
          {"ClearNight Premium is available as a monthly or annual auto-renewing subscription. Payment is charged to your Apple ID account at confirmation of purchase. Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.\n\nYou can manage or cancel your subscription in your Apple ID account settings. No refunds are provided for unused portions of a subscription period."}
        </Section>

        <Section title="Free Trial">
          If a free trial is offered, it will be specified at the time of purchase. Any unused portion of a free trial period will be forfeited when you purchase a subscription.
        </Section>

        <Section title="Forecasts and Accuracy">
          ClearNight provides sky condition forecasts based on available meteorological and astronomical data. Forecasts are estimates only and may not always be accurate. We make no guarantees about the accuracy, completeness, or reliability of any forecast data. ClearNight is not liable for decisions made based on forecast information.
        </Section>

        <Section title="Intellectual Property">
          All content, features, and functionality of ClearNight — including but not limited to text, graphics, logos, and software — are the exclusive property of ClearNight LLC and are protected by intellectual property laws.
        </Section>

        <Section title="Disclaimer of Warranties">
          ClearNight is provided "as is" without warranties of any kind, express or implied. We do not warrant that the app will be uninterrupted, error-free, or free of viruses or other harmful components.
        </Section>

        <Section title="Limitation of Liability">
          To the maximum extent permitted by law, ClearNight LLC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the app.
        </Section>

        <Section title="Changes to Terms">
          We reserve the right to modify these Terms at any time. Continued use of the app after changes constitutes acceptance of the revised Terms.
        </Section>

        <Section title="Contact">
          Questions about these Terms? Contact us at legal@clearnightapp.com
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
