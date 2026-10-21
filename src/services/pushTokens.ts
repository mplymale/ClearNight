import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

const PROJECT_ID = '67acbb81-4fcf-43a8-a93b-b37833920d88';

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
