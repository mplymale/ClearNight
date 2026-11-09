import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useLocations } from '../context/LocationsContext';
import { useAuth } from '../context/AuthContext';
import { AlertNavData } from './alertScheduling';
import { track } from './analytics';

// Routes a tapped alert notification to the specific location or target it
// was about, instead of just opening the app to wherever it last was.
export function useNotificationRouting() {
  const { locations, setActiveLocIndex } = useLocations();
  const { user } = useAuth();

  // `alert_opened` must fire once per tap. This effect re-runs whenever
  // `locations` changes, and every run re-calls
  // getLastNotificationResponseAsync(), which keeps returning the same
  // response for the life of the process. Without this, one cold-start tap
  // would be counted on every re-render of the locations list.
  const trackedResponseIds = useRef<Set<string>>(new Set());

  // Read through a ref, not a dependency: adding user?.id to the deps would
  // be another source of re-runs for no routing benefit. On a cold start
  // the id is usually still null here; track() attributes the event to the
  // install's anonymous id and PostHog merges it once the session resolves.
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

  useEffect(() => {
    function handle(data: unknown, responseId: string, coldStart: boolean) {
      const navData = data as Partial<AlertNavData> | undefined;
      if (!navData?.kind || !navData.locationName) return;

      const locIndex = locations.findIndex(l => l.name === navData.locationName);

      // Before the locIndex early return, deliberately: an alert tapped for
      // a location that has since been renamed or removed is still an
      // opened alert, and how often that happens is itself worth knowing.
      if (!trackedResponseIds.current.has(responseId)) {
        trackedResponseIds.current.add(responseId);
        track('alert_opened', userIdRef.current, {
          kind: navData.kind,
          locationName: navData.locationName,
          targetType: navData.kind === 'target' ? navData.targetType : undefined,
          objIndex: navData.kind === 'target' ? navData.objIndex : undefined,
          coldStart,
          locationFound: locIndex !== -1,
        });
      }

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
      handle(response.notification.request.content.data, response.notification.request.identifier, false);
    });

    // App was fully killed and launched by tapping a notification.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handle(response.notification.request.content.data, response.notification.request.identifier, true);
    });

    return () => sub.remove();
  }, [locations, setActiveLocIndex]);
}
