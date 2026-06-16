import { Redirect } from 'expo-router';

export default function Root() {
  // Set to '/onboarding' to show onboarding, or '/(tabs)' to skip it
  return <Redirect href="/onboarding" />;
}
