import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Window labels look like "11:10pm – 4:20am" or "12:40 – 4:30am" (the start
// segment can omit am/pm when it matches the end's period). This pulls out
// a real Date for the start, assuming "pm" belongs to tonight and "am"
// belongs to the following morning — true for every window in this app
// since they always represent a single overnight span.
export function parseWindowStartDate(label: string, now: Date = new Date()): Date | null {
  const [startPart, endPart] = label.split('–').map((s) => s.trim());
  if (!startPart) return null;

  const startPeriod = startPart.match(/am|pm/i)?.[0]?.toLowerCase();
  const endPeriod = endPart?.match(/am|pm/i)?.[0]?.toLowerCase();
  const period = startPeriod ?? endPeriod;
  if (!period) return null;

  const timeOnly = startPart.replace(/am|pm/i, '').trim();
  const [hStr, mStr] = timeOnly.split(':');
  let hour = parseInt(hStr, 10);
  const minute = parseInt(mStr ?? '0', 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  if (period === 'pm' && hour !== 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;

  const result = new Date(now);
  result.setHours(hour, minute, 0, 0);
  if (period === 'am') {
    result.setDate(result.getDate() + 1); // after-midnight start belongs to "tomorrow" relative to tonight
  }
  return result;
}

// Same idea as parseWindowStartDate, but for the end of the window. Useful
// as a tiebreaker when two windows start at the same time.
export function parseWindowEndDate(label: string, now: Date = new Date()): Date | null {
  const [startPart, endPart] = label.split('–').map((s) => s.trim());
  if (!endPart) return null;

  const endPeriod = endPart.match(/am|pm/i)?.[0]?.toLowerCase();
  const startPeriod = startPart?.match(/am|pm/i)?.[0]?.toLowerCase();
  const period = endPeriod ?? startPeriod;
  if (!period) return null;

  const timeOnly = endPart.replace(/am|pm/i, '').trim();
  const [hStr, mStr] = timeOnly.split(':');
  let hour = parseInt(hStr, 10);
  const minute = parseInt(mStr ?? '0', 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  if (period === 'pm' && hour !== 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;

  const result = new Date(now);
  result.setHours(hour, minute, 0, 0);
  if (period === 'am') {
    result.setDate(result.getDate() + 1); // after-midnight end belongs to "tomorrow" relative to tonight
  }
  return result;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const current: any = await Notifications.getPermissionsAsync();
  if (current.granted || current.status === 'granted') return true;
  const requested: any = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.status === 'granted';
}

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

interface ScheduleParams {
  title: string;
  body: string;
  fireDate: Date;
  quietStart?: number;
  quietEnd?: number;
}

// Returns the scheduled notification id, or null if the fire time has
// already passed or falls inside quiet hours.
export async function scheduleLocalAlert({ title, body, fireDate, quietStart, quietEnd }: ScheduleParams): Promise<string | null> {
  if (fireDate.getTime() <= Date.now()) return null;

  if (quietStart !== undefined && quietEnd !== undefined) {
    const { isInQuietHours } = require('../context/PreferencesContext');
    if (isInQuietHours(fireDate, quietStart, quietEnd)) return null;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
  });
  return id;
}

export async function cancelLocalAlert(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired/cancelled — fine to ignore.
  }
}
