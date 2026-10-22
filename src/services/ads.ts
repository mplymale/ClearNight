import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';

let initialized = false;

// Starts the Google Mobile Ads SDK and sets the app-wide request
// configuration. Safe to call more than once in the same app run — only the
// first call does anything. Call once near app start, before any ad format
// (the home-screen native card, the App Open interstitial) requests an ad.
//
// Non-personalized ads only for now (see clearnight-next-release-plan.md,
// Release A #2) — that's set per-request (`requestNonPersonalizedAdsOnly`)
// wherever an ad is actually requested, not here; this just sets the
// content-rating ceiling and child-directed flags every request should share.
export async function initializeAds(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await mobileAds().initialize();
  } catch {
    // Init failed (offline, SDK hiccup) — don't block app start over it.
    // Ad requests made before a later successful initialize() will just fail
    // quietly (no-fill/error), same as any other ad network hiccup.
    initialized = false;
  }
}
