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
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { NightVisionProvider } from '../src/context/NightVisionContext';
import { PlanProvider } from '../src/context/PlanContext';
import { LocationsProvider } from '../src/context/LocationsContext';
import { AlertsProvider } from '../src/context/AlertsContext';
import { FavoritesProvider } from '../src/context/FavoritesContext';
import { InterestsProvider } from '../src/context/InterestsContext';
import { SubscriptionProvider } from '../src/context/SubscriptionContext';
import { PreferencesProvider } from '../src/context/PreferencesContext';

SplashScreen.preventAutoHideAsync();


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

  if (!fontsLoaded && !fontError) return null;

  return (
    <NightVisionProvider>
      <LocationsProvider>
      <PlanProvider>
      <AlertsProvider>
      <FavoritesProvider>
      <InterestsProvider>
      <SubscriptionProvider>
      <PreferencesProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="tonights-plan" />
          <Stack.Screen name="object-detail" />
          <Stack.Screen name="factor-detail" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="manage-locations" />
          <Stack.Screen name="add-location" options={{ presentation: 'modal' }} />
          <Stack.Screen name="set-alert" options={{ presentation: 'modal' }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="about" />
          <Stack.Screen name="privacy-policy" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="redeem-code" />
        </Stack>
      </PreferencesProvider>
      </SubscriptionProvider>
      </InterestsProvider>
      </FavoritesProvider>
      </AlertsProvider>
      </PlanProvider>
      </LocationsProvider>
    </NightVisionProvider>
  );
}

const styles = StyleSheet.create({});
