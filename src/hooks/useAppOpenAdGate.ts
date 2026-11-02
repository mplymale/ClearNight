import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppOpenAd } from 'react-native-google-mobile-ads';
import { APP_OPEN_AD_UNIT_ID } from '../services/adUnits';
import { useSubscription } from '../context/SubscriptionContext';
import { useNightVision } from '../context/NightVisionContext';
import { AdFormat, trackAdRevenue } from '../services/adRevenueTracker';

// Real AdMob account live as of Oct 22 (Release A #2). See adUnits.ts for
// why this isn't gated on __DEV__ — that let real live ads reach TestFlight
// testers, since TestFlight builds aren't "dev" builds.
const AD_UNIT_ID = APP_OPEN_AD_UNIT_ID;

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

// How long to keep waiting for a load that was in flight at foreground time
// to finish before giving up on showing it for that return visit. Long
// enough to cover a normal load (a couple seconds, typically), short enough
// that the ad never surprises the user well after they've moved on.
const PENDING_SHOW_WINDOW_MS = 20 * 1000;

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
  // Set when a foreground transition was otherwise eligible to show the ad
  // but the ad wasn't loaded yet at that exact instant — the common case,
  // since iOS freezes in-flight loads while the app is backgrounded, so a
  // load kicked off right before backgrounding only actually resumes once
  // the app is active again. Rather than losing that return visit entirely,
  // the effect below watches for the load to finish shortly after and shows
  // it then. Bounded by a deadline so a late/slow load can't pop an ad
  // while the user's already well into doing something else.
  const pendingShowDeadlineRef = useRef<number | null>(null);

  useEffect(() => {
    if (adStatus === 'loaded') loadedAtRef.current = Date.now();
    if (adStatus === 'idle') loadedAtRef.current = null;
  }, [adStatus]);

  // The "once per session" cap is keyed off this — NOT off calling show(),
  // which can silently decline (see useFullScreenAd.ts: `MobileAd.show()`
  // throws synchronously when not showable, and its promise can reject, but
  // the hook's own `show()` wrapper swallows both — "ad events stay the
  // failure channel, so nothing here writes hook state"). Setting the cap
  // optimistically before confirming the ad actually opened was the real
  // bug: one silently-declined show() permanently blocked every later
  // attempt for the rest of the app session, with nothing to retry it.
  // `'showing'` only ever gets set by a real AdEventType.OPENED event from
  // the native side, so this only latches once a show has actually happened.
  useEffect(() => {
    if (adStatus === 'showing') shownThisSessionRef.current = true;
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
            // Not ready (or gone stale) right when we wanted it — most often
            // because a load kicked off just before backgrounding never got
            // to finish, since iOS freezes it until the app is active again.
            // Kick off (or re-kick-off) the load, and give it a short window
            // to land — the effect below picks it up if it does.
            load();
            pendingShowDeadlineRef.current = Date.now() + PENDING_SHOW_WINDOW_MS;
            return;
          }

          impressionIdRef.current = `app_open-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          // A short defer before presenting — calling show() synchronously
          // inside the AppState 'active' handler can land before the app's
          // own window is actually frontmost/key again, which the native
          // side can decline silently (see the note on shownThisSessionRef
          // above for why "silently" is the operative word here).
          setTimeout(() => {
            try {
              show();
            } catch {
              // An ad-SDK hiccup here should never be able to take down the
              // whole app over something as non-essential as an interstitial
              // — worst case, no ad shows this session.
            }
          }, 300);
        } catch {
          // Same reasoning as above.
        }
      }
    });

    return () => sub.remove();
  }, [isFree, nightVision, adStatus, load, show]);

  // Catches up a load that was still in flight at the exact foreground
  // instant above. Runs whenever adStatus changes; only does anything if a
  // pending window is actually open.
  useEffect(() => {
    const deadline = pendingShowDeadlineRef.current;
    if (!deadline) return;

    if (Date.now() > deadline) {
      pendingShowDeadlineRef.current = null;
      return;
    }

    if (adStatus === 'loaded') {
      pendingShowDeadlineRef.current = null;
      if (shownThisSessionRef.current || nightVision) return;
      impressionIdRef.current = `app_open-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setTimeout(() => {
        try {
          show();
        } catch {
          // Never worth taking the app down over.
        }
      }, 300);
    } else if (adStatus === 'no-fill' || adStatus === 'error') {
      // That load isn't coming — stop waiting on it.
      pendingShowDeadlineRef.current = null;
    }
  }, [adStatus, nightVision, show]);

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
