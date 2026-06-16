import { Tabs } from 'expo-router';

// Single-tab layout — tab bar hidden. Navigation happens via icon buttons on screen.
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="index" />
    </Tabs>
  );
}
