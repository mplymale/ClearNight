import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

const ACCENT = '#7ef0d2';

function GiftIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={7} width={20} height={14} rx={2} stroke={ACCENT} strokeWidth={1.6} />
      <Path d="M12 7V21" stroke={ACCENT} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M2 12h20" stroke={ACCENT} strokeWidth={1.6} strokeLinecap="round" />
      <Path
        d="M12 7C12 7 10 3 8 3C6.5 3 5.5 4 5.5 5.5C5.5 7 7 7 12 7Z"
        stroke={ACCENT} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M12 7C12 7 14 3 16 3C17.5 3 18.5 4 18.5 5.5C18.5 7 17 7 12 7Z"
        stroke={ACCENT} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function RedeemCodeScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  async function handleRedeem() {
    setLoading(true);
    try {
      // Opens the native App Store offer code redemption sheet (iOS 14+)
      const url = 'https://apps.apple.com/redeem';
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Not available', 'Could not open the App Store. Please try from the App Store app directly.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#070912', '#0a0e1a']} style={styles.container}>
      <View style={[styles.inner, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navBack} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={[styles.navBackChev, { color: ACCENT }]}>‹</Text>
            <Text style={[styles.navBackLabel, { color: ACCENT }]}>Settings</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Redeem Code</Text>
          <View style={styles.navSpacer} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <GiftIcon />
          </View>

          <Text style={styles.heading}>Have an offer code?</Text>
          <Text style={styles.sub}>
            Tap below to open the App Store and enter your promotional or gift code to unlock StarCast Premium.
          </Text>

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={handleRedeem}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'Opening…' : 'Redeem in App Store'}</Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            You'll be taken to the App Store where you can enter your code. Make sure you're signed into the correct Apple ID.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 20 },

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

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 8,
  },

  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: 'rgba(126,240,210,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(126,240,210,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  heading: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 22,
    textAlign: 'center',
  },

  btn: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: ACCENT,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  btnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#04130f',
  },

  note: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.35)',
    lineHeight: 18,
    textAlign: 'center',
  },
});
