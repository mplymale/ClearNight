import { Redirect } from 'expo-router';
import { useLocations } from '../src/context/LocationsContext';

export default function Root() {
  const { locations, hydrated } = useLocations();

  // Wait for the persisted state to load before deciding where to send the
  // user — redirecting too early would always show onboarding, even for
  // returning users who already have spots saved.
  if (!hydrated) return null;

  return <Redirect href={locations.length > 0 ? '/(tabs)' : '/onboarding'} />;
}
