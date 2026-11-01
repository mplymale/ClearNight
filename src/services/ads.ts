import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  MaxAdContentRating,
} from 'react-native-google-mobile-ads';

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
    // GDPR/UK consent (CMP), required before any ad request. gatherConsent()
    // checks the device's own region and only shows a form when the user is
    // somewhere that requires one (EEA/UK) — everyone else resolves
    // immediately with no UI. This doesn't change what we show (ads stay
    // non-personalized regardless — set per-request, see
    // clearnight-next-release-plan.md Release A #2); it's the required gate
    // for showing ads to EEA/UK users at all.
    await AdsConsent.gatherConsent();

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

// Whether Settings should show a "Privacy options" row. Google requires a
// way for EEA/UK users to revisit their ad-consent choice after the first
// time; everyone else never needed one, so this stays false for them.
export async function isAdsPrivacyOptionsRequired(): Promise<boolean> {
  try {
    const info = await AdsConsent.getConsentInfo();
    return (
      info.privacyOptionsRequirementStatus ===
      AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    );
  } catch {
    return false;
  }
}

export async function showAdsPrivacyOptionsForm(): Promise<void> {
  try {
    await AdsConsent.showPrivacyOptionsForm();
  } catch {
    // Nothing to show, or the SDK isn't ready yet — fail silently rather
    // than surface an error for a settings row the user tapped voluntarily.
  }
}
