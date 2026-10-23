// Lightweight analytics via PostHog's plain HTTP capture API — deliberately
// no SDK (posthog-react-native pulls in native modules for some features,
// and after the CocoaPods saga on the ads work, anything avoidable that
// would force another `expo prebuild` + `pod install` cycle is worth
// avoiding). This is pure JS/TS: a single `fetch()` per event.
// https://posthog.com/docs/product-analytics/installation/api
//
// Real PostHog Cloud project token, confirmed live Oct 23 — this is
// actually collecting events now, not a placeholder.
const POSTHOG_PROJECT_TOKEN = 'phc_toRMaJbsC3Zy5wFSnxGXycNiSCSqryHLaBiNPXMAUCc3';
const POSTHOG_HOST = 'https://us.i.posthog.com'; // use eu.i.posthog.com if the project is EU Cloud

const configured = !POSTHOG_PROJECT_TOKEN.startsWith('REPLACE_WITH');

// Fire-and-forget, best-effort — analytics should never be able to affect
// the app, same posture as everything else ad/analytics-adjacent here
// (AdsErrorBoundary, the silent catches throughout SubscriptionContext).
// `distinctId` is always the Supabase user id (`useAuth()`'s `user.id`) —
// the same identity RevenueCat is now linked to (see SubscriptionContext),
// so all three systems (Supabase, RevenueCat, PostHog) agree on one id per
// install rather than three unrelated anonymous ones.
export function track(event: string, distinctId: string, properties: Record<string, unknown> = {}) {
  if (!configured || !distinctId) return;

  fetch(`${POSTHOG_HOST}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: POSTHOG_PROJECT_TOKEN,
      event,
      properties: { distinct_id: distinctId, ...properties },
    }),
  }).catch(() => {});
}
