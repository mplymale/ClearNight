import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useLocations } from '../context/LocationsContext';
import { AlertNavData } from './alertScheduling';

// Routes a tapped alert notification to the specific location or target it
// was about, instead of just opening the app to wherever it last was.
export function useNotificationRouting() {
  const { locations, setActiveLocIndex } = useLocations();

  useEffect(() => {
    function handle(data: unknown) {
      const navData = data as Partial<AlertNavData> | undefined;
      if (!navData?.kind || !navData.locationName) return;

      const locIndex = locations.findIndex(l => l.name === navData.locationName);
      if (locIndex === -1) return; // location renamed/removed since the alert fired

      if (navData.kind === 'location') {
        setActiveLocIndex(locIndex);
        router.push('/(tabs)');
      }
      if (navData.kind === 'target') {
        router.push({
          pathname: '/object-detail',
          params: {
            locIndex: String(locIndex),
            type: navData.targetType,
            objIndex: navData.objIndex != null ? String(navData.objIndex) : undefined,
          },
        });
      }
    }

    // App was already open/backgrounded and the user tapped a notification.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handle(response.notification.request.content.data);
    });

    // App was fully killed and launched by tapping a notification.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handle(response.notification.request.content.data);
    });

    return () => sub.remove();
  }, [locations, setActiveLocIndex]);
}
