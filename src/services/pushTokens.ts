import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

const PROJECT_ID = '67acbb81-4fcf-43a8-a93b-b37833920d88';

/**
 * Re-register this device's token for the current user WITHOUT prompting.
 *
 * Why this exists: under anonymous auth every reinstall is a new user, but
 * the device's Expo push token usually survives the reinstall. Until the
 * new user claims it, the token still belongs to the old (dead) user — and
 * if iOS kept notification permission across the reinstall, that old
 * user's alerts keep pushing to this phone. Calling this at launch moves
 * the token over immediately; the old user goes tokenless and the server
 * skips them from the next run.
 *
 * Never shows the permission prompt. If permission was not already
 * granted there is nothing to reclaim.
 */
export async function reclaimPushTokenIfPermitted(): Promise<void> {
  if (!Device.isDevice) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await registerPushToken();
  } catch {
    // Best effort; the alert-driven registration path still runs later.
  }
}

export async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    if (!token) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Uses an RPC (not a direct table upsert) because the same device's
    // push token can outlive the anonymous Supabase user that registered
    // it — e.g. a reinstall creates a new anonymous user, but the token
    // itself is unchanged. A direct upsert would violate RLS trying to
    // reassign a row still owned by the previous (now-abandoned) user.
    const { error } = await supabase.rpc('register_push_token', { p_token: token });
    if (error) console.error('registerPushToken RPC failed:', error.message);
  } catch (err) {
    console.error('registerPushToken failed:', err);
  }
}
