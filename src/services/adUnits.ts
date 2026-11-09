import { TestIds } from 'react-native-google-mobile-ads';

// ─────────────────────────────────────────────────────────────────────────
// Which ad units this binary uses — decided by the build profile, not by
// hand.
//
// TestFlight and the App Store release are the same binary, and `__DEV__`
// is false in both, so no runtime signal separates them. That is why this
// used to be a hand-flipped constant: `true` through every TestFlight
// round, `false` on the one build going to review, back to `true`
// afterwards. Two chances to forget per release, and forgetting in the
// TestFlight direction serves live ads to testers — an AdMob policy
// violation.
//
// The signal that does exist is the EAS build profile. `eas.json` sets
// EXPO_PUBLIC_USE_TEST_ADS per profile and Expo inlines it into the bundle
// at build time.
//
// Written as `!== 'false'` deliberately. Anything that is not an explicit
// production build — a dev client, a preview build, a bare `expo run`, a
// profile someone adds later and forgets to annotate — gets TEST ads. The
// cost of forgetting is a build that earns nothing, never one that breaks
// Google's policy.
//
// So: `eas build --profile production` is the only thing that produces
// live ads. Nothing to remember before or after a TestFlight round.
export const USE_TEST_ADS = process.env.EXPO_PUBLIC_USE_TEST_ADS !== 'false';

export const NATIVE_AD_UNIT_ID = USE_TEST_ADS
  ? TestIds.NATIVE
  : 'ca-app-pub-8886357120051718/2830301096';

export const APP_OPEN_AD_UNIT_ID = USE_TEST_ADS
  ? TestIds.APP_OPEN
  : 'ca-app-pub-8886357120051718/5299631897';
