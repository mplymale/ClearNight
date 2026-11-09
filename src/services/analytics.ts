// Lightweight analytics via PostHog's plain HTTP capture API — deliberately
// no SDK (posthog-react-native pulls in native modules for some features,
// and after the CocoaPods saga on the ads work, anything avoidable that
// would force another `expo prebuild` + `pod install` cycle is worth
// avoiding). This is pure JS/TS: a single `fetch()` per event.
// https://posthog.com/docs/product-analytics/installation/api
//
// Real PostHog Cloud project token, confirmed live Oct 23.
import AsyncStorage from '@react-native-async-storage/async-storage';

const POSTHOG_PROJECT_TOKEN = 'phc_toRMaJbsC3Zy5wFSnxGXycNiSCSqryHLaBiNPXMAUCc3';
const POSTHOG_HOST = 'https://us.i.posthog.com'; // use eu.i.posthog.com if the project is EU Cloud

const configured = !POSTHOG_PROJECT_TOKEN.startsWith('REPLACE_WITH');

// --- Why this file is more than one `fetch()` ---------------------------
//
// The first version required a Supabase user id and returned silently
// without one. On a cold start the session has not resolved yet, so every
// event before sign-in was dropped — which is precisely the activation
// data that matters. Measured 2026-11-09: PostHog saw 44 people against
// 161 App Store downloads, roughly a quarter.
//
// The fix is the same thing the PostHog SDKs do:
//
//   1. Mint a random anonymous id on first launch and persist it, so a
//      returning user is the same person rather than a new one each time.
//   2. Attribute pre-auth events to that anonymous id.
//   3. The first time a real user id shows up, send `$identify` carrying
//      `$anon_distinct_id`. PostHog merges the two into one person, so the
//      pre-sign-in history is not a separate stranger.
//
// Events raised before the stored id has loaded are queued, not dropped —
// that read is a few milliseconds, but it covers exactly the window where
// app-open events happen.

const ANON_KEY = 'ph_anon_distinct_id';

let anonId: string | null = null;
let identifiedAs: string | null = null;

type Pending = {
  event: string;
  distinctId: string | null;
  properties: Record<string, unknown>;
  timestamp: string;
};

const pending: Pending[] = [];

function mintAnonId(): string {
  const rand = () => Math.random().toString(36).slice(2, 12);
  return `anon_${Date.now().toString(36)}_${rand()}${rand()}`;
}

// Resolves once `anonId` is populated. Storage failures are not fatal: we
// fall back to an in-memory id, which still beats dropping the event.
const ready: Promise<void> = (async () => {
  try {
    const stored = await AsyncStorage.getItem(ANON_KEY);
    if (stored) {
      anonId = stored;
      return;
    }
  } catch {
    // fall through to minting a fresh one
  }
  anonId = mintAnonId();
  try {
    await AsyncStorage.setItem(ANON_KEY, anonId);
  } catch {
    // in-memory only for this session
  }
})();

// Fire-and-forget, best-effort — analytics should never be able to affect
// the app, same posture as everything else ad/analytics-adjacent here
// (AdsErrorBoundary, the silent catches throughout SubscriptionContext).
function send(
  event: string,
  distinctId: string,
  properties: Record<string, unknown>,
  timestamp: string,
) {
  fetch(`${POSTHOG_HOST}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: POSTHOG_PROJECT_TOKEN,
      event,
      timestamp,
      properties: { distinct_id: distinctId, ...properties },
    }),
  }).catch(() => {});
}

// Stitches the anonymous history onto the real user, once per id.
function linkAnonToUser(userId: string) {
  if (identifiedAs === userId) return;
  identifiedAs = userId;
  if (!anonId || anonId === userId) return;
  send('$identify', userId, { $anon_distinct_id: anonId }, new Date().toISOString());
}

function flush() {
  while (pending.length) {
    const item = pending[0];
    const id = item.distinctId ?? anonId;
    if (!id) return; // anon id not loaded yet; stay queued
    pending.shift();
    if (item.distinctId) linkAnonToUser(item.distinctId);
    send(item.event, id, item.properties, item.timestamp);
  }
}

/**
 * Record an event.
 *
 * `distinctId` is the Supabase user id (`useAuth()`'s `user.id`) — the same
 * identity RevenueCat is linked to, so Supabase, RevenueCat and PostHog
 * agree on one id per person. Pass `null`/`undefined` when the session has
 * not resolved: the event is attributed to this install's anonymous id and
 * merged into the real person later. **Do not gate call sites on
 * `user?.id`** — that is the bug this file exists to fix.
 */
export function track(
  event: string,
  distinctId?: string | null,
  properties: Record<string, unknown> = {},
) {
  if (!configured) return;
  pending.push({
    event,
    distinctId: distinctId ?? null,
    properties,
    timestamp: new Date().toISOString(),
  });
  if (anonId) flush();
  else void ready.then(flush);
}
