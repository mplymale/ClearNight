import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppOpenAd, TestIds } from 'react-native-google-mobile-ads';
import { useSubscription } from '../context/SubscriptionContext';
import { useNightVision } from '../context/NightVisionContext';
import { AdFormat, trackAdRevenue } from '../services/adRevenueTracker';

// Real AdMob account live as of Oct 22 (Release A #2). Test IDs still used
// in dev builds so nobody's own testing counts as real impressions against
// the real account.
const AD_UNIT_ID = __DEV__ ? TestIds.APP_OPEN : 'ca-app-pub-8886357120051718/5299631897';

// How long the app has to have been backgrounded before a return visit is
// eligible to show the ad. This — not launch count — is the gate: Mike was
// explicit he didn't want an ad on every app open, only after a real gap
// away. A quick switch-away-and-back (check a notification, answer a text)
// never qualifies; it needs real elapsed time.
//
// Dev builds get a much shorter cooldown so this is actually testable
// without sitting backgrounded for 5 real minutes per attempt — this never
// ships, __DEV__ is false in release/TestFlight builds.
const MIN_AWAY_MS = __DEV__ ? 10 * 1000 : 5 * 60 * 1000;

// App Open ads expire 4 hours after they're loaded. Refresh a bit ahead of
// that so a stale ad is never what's sitting there when the gate opens.
const MAX_AD_AGE_MS = 3.5 * 60 * 60 * 1000;

const BACKGROUNDED = /inactive|background/;

// Hoisted to a stable module-level reference on purpose. Passing a fresh
// object literal here on every render is what the native-side "ad has been
// destroyed" crash traced back to: the SDK treats a changed `requestOptions`
// reference as a reason to tear down and recreate the underlying ad
// instance, and a component driven by the ad's own status transitions
// (idle -> loading -> loaded -> showing -> closed) re-renders on every one
// of those transitions, which was recreating a brand-new object each time.
const REQUEST_OPTIONS = { requestNonPersonalizedAdsOnly: true } as const;

// Mounted once, high in the tree (inside SubscriptionProvider +
// NightVisionProvider), for the whole app session. Owns the App Open
// interstitial end to end: preloads it, watches foreground/background
// transitions, and decides whether *this* return to the app is allowed to
// show it. Renders nothing — this is pure trigger logic.
//
// Rules this enforces (confirmed with Mike):
//  - free tier only
//  - never while night vision is on (the whole point of night vision is
//    protecting dark-adapted eyes — a full-brightness interstitial there
//    would undercut the app's core use case)
//  - once per session, full stop
//  - only after a real elapsed-time gap away from the app, not on launch
//    and not on every foreground
export function useAppOpenAdGate() {
  const { status } = useSubscription();
  const { nightVision } = useNightVision();
  const isFree = status === 'free';

  const { status: adStatus, show, load, revenue } = useAppOpenAd({
    adUnitId: isFree ? AD_UNIT_ID : null,
    requestOptions: REQUEST_OPTIONS,
  });

  const loadedAtRef = useRef<number | null>(null);
  const shownThisSessionRef = useRef(false);
  const backgroundedAtRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // Set right before `show()` so the revenue event this impression produces
  // (handled in the effect below) can be tied to the impression that earned
  // it, rather than a fresh id per render.
  const impressionIdRef = useRef<string | null>(null);
  // Guards against double-reporting the same PaidEvent object to RevenueCat
  // if this effect re-runs for an unrelated reason.
  const lastReportedRevenueRef = useRef<typeof revenue>(null);

  useEffect(() => {
    if (adStatus === 'loaded') loadedAtRef.current = Date.now();
    if (adStatus === 'idle') loadedAtRef.current = null;
  }, [adStatus]);

  useEffect(() => {
    if (!isFree) return;

    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (BACKGROUNDED.test(next)) {
        backgroundedAtRef.current = Date.now();
        return;
      }

      // Only a transition INTO active FROM a backgrounded state is a
      // candidate — that's what keeps a cold launch from ever qualifying:
      // there's no prior `backgroundedAt` to measure a gap against yet.
      if (next === 'active' && BACKGROUNDED.test(prev)) {
        const awayForMs = backgroundedAtRef.current ? Date.now() - backgroundedAtRef.current : 0;
        backgroundedAtRef.current = null;

        if (shownThisSessionRef.current) return;
        if (nightVision) return;
        if (awayForMs < MIN_AWAY_MS) return;

        const stale = loadedAtRef.current !== null && Date.now() - loadedAtRef.current > MAX_AD_AGE_MS;
        try {
          if (adStatus !== 'loaded' || stale) {
            // Not ready (or gone stale) right when we wanted it — refresh
            // for next time rather than showing nothing or an expired ad.
            load();
            return;
          }

          shownThisSessionRef.current = true;
          impressionIdRef.current = `app_open-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          show();
        } catch {
          // An ad-SDK hiccup here should never be able to take down the
          // whole app over something as non-essential as an interstitial —
          // worst case, no ad shows this session.
        }
      }
    });

    return () => sub.remove();
  }, [isFree, nightVision, adStatus, load, show]);

  // AdMob reports revenue slightly after the impression itself — this
  // fires independently of the gate logic above, whenever a new PaidEvent
  // shows up for the ad this hook is currently holding.
  useEffect(() => {
    if (!revenue || revenue === lastReportedRevenueRef.current || !impressionIdRef.current) return;
    lastReportedRevenueRef.current = revenue;
    trackAdRevenue(revenue, {
      adFormat: AdFormat.appOpen,
      adUnitId: AD_UNIT_ID,
      impressionId: impressionIdRef.current,
    });
  }, [revenue]);
}
