import { Redirect } from 'expo-router';

// Always show the intro animation first — it handles routing to onboarding
// or home based on launch count and whether spots are saved.
export default function Root() {
  return <Redirect href="/intro" />;
}
