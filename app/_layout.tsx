import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
} from '@expo-google-fonts/hanken-grotesk';
import { Sora_600SemiBold } from '@expo-google-fonts/sora';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Component, useEffect, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { NightVisionProvider } from '../src/context/NightVisionContext';
import { PlanProvider } from '../src/context/PlanContext';
import { LocationsProvider } from '../src/context/LocationsContext';
import { AlertsProvider } from '../src/context/AlertsContext';
import { FavoritesProvider } from '../src/context/FavoritesContext';
import { InterestsProvider } from '../src/context/InterestsContext';
import { SubscriptionProvider } from '../src/context/SubscriptionContext';
import { initializeAds } from '../src/services/ads';
import { useAppOpenAdGate } from '../src/hooks/useAppOpenAdGate';
import { PreferencesProvider } from '../src/context/PreferencesContext';
import { AuthProvider } from '../src/context/AuthContext';
import { useNotificationRouting } from '../src/services/notificationRouting';
import { useSiriRouting } from '../src/services/siriRouting';

SplashScreen.preventAutoHideAsync();

// Rendered inside the provider tree so it can read/set the active location
// via context — routes a tapped alert notification to the right screen.
function NotificationRouter() {
  useNotificationRouting();
  return null;
}

// Same idea, for a "this week"/"this weekend" Siri query — jumps to
// whichever saved spot was asked about once the app comes to the foreground.
function SiriRouter() {
  useSiriRouting();
  return null;
}

// Owns the free-tier App Open interstitial end to end (preload, trigger
// rules, show) — see useAppOpenAdGate for the actual logic.
function AdsGate() {
  useAppOpenAdGate();
  return null;
}

// A third-party ad SDK hiccup should never be able to take the whole app
// down with it — this is the backstop. AdsGate renders nothing either way,
// so catching here just means "no ad this session," never a blank screen.
class AdsErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch(error: unknown) {
    if (__DEV__) console.warn('[AdsGate] swallowed a crash so it would not take down the app:', error);
  }
  render() {
    return this.state.crashed ? null : this.props.children;
  }
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_600SemiBold,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    Sora_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    initializeAds();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
    <NightVisionProvider>
      <LocationsProvider>
      <PreferencesProvider>
      <PlanProvider>
      <AlertsProvider>
      <FavoritesProvider>
      <InterestsProvider>
      <SubscriptionProvider>
        <NotificationRouter />
        <SiriRouter />
        <AdsErrorBoundary>
          <AdsGate />
        </AdsErrorBoundary>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="intro" options={{ animation: 'fade', gestureEnabled: false, contentStyle: { backgroundColor: '#04060e' } }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade', contentStyle: { backgroundColor: '#04060e' } }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade', contentStyle: { backgroundColor: '#04060e' } }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="tonights-plan" />
          <Stack.Screen name="object-detail" />
          <Stack.Screen name="factor-detail" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
          <Stack.Screen name="manage-locations" />
          <Stack.Screen name="add-location" options={{ presentation: 'modal' }} />
          <Stack.Screen name="set-alert" options={{ presentation: 'modal' }} />
          <Stack.Screen name="paywall" />
          <Stack.Screen name="about" />
          <Stack.Screen name="privacy-policy" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="redeem-code" />
        </Stack>
      </SubscriptionProvider>
      </InterestsProvider>
      </FavoritesProvider>
      </AlertsProvider>
      </PlanProvider>
      </PreferencesProvider>
      </LocationsProvider>
    </NightVisionProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({});
