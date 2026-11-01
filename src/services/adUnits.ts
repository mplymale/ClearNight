import { TestIds } from 'react-native-google-mobile-ads';

// ─────────────────────────────────────────────────────────────────────────
// SHIP CHECK — the one flag to flip before a real App Store submission.
//
// TestFlight and the real App Store release are the exact same binary —
// Apple just points either audience at whichever build you tell it to
// release. There's no runtime signal the app can check to tell "I'm
// running as a TestFlight build" from "I'm running as the released App
// Store build" without native receipt-checking code this project doesn't
// have. The old per-file `__DEV__ ? TestIds.X : liveId` pattern assumed
// TestFlight would count as a "dev" build — it doesn't; __DEV__ is false
// in every release/TestFlight build, which is why real live ads were being
// served to TestFlight testers.
//
// So: leave this `true` through every TestFlight build. Flip it to `false`
// ONLY on the specific build you're about to submit for App Store review,
// and flip it back to `true` right after you upload that build, before the
// next TestFlight round goes out.
export const USE_TEST_ADS = true;

export const NATIVE_AD_UNIT_ID = USE_TEST_ADS
  ? TestIds.NATIVE
  : 'ca-app-pub-8886357120051718/2830301096';

export const APP_OPEN_AD_UNIT_ID = USE_TEST_ADS
  ? TestIds.APP_OPEN
  : 'ca-app-pub-8886357120051718/5299631897';
