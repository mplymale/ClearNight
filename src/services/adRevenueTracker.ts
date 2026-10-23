// Forwards each ad's impression-level revenue into RevenueCat, so ad income
// shows up alongside subscription income in one dashboard instead of two
// unrelated ones (RevenueCat's ad-monetization feature, currently beta).
//
// Requires react-native-purchases >= 10.8.1 (bumped to 10.15.1, Oct 22) and
// "Impression-level ad revenue" enabled in the AdMob console — that's a
// one-time dashboard setting on Mike's side, not something this code can
// turn on. Without it, AdMob never sends a real `value`/`valueMicros` on
// the paid event, so this silently has nothing to report.
import Purchases, { AdFormat, AdMediatorName, AdRevenuePrecision } from 'react-native-purchases';
import { RevenuePrecisions } from 'react-native-google-mobile-ads';

export { AdFormat };

// Deliberately a minimal structural shape, not the library's full `PaidEvent`
// (or native-ad's near-identical `NativeAdPaidEventPayload`) — those two
// types differ slightly on `responseInfo`, which this never reads anyway.
// Matching only the fields actually used here keeps both ad surfaces
// (full-screen PaidEvent and native-ad's own payload) callable without a cast.
type AdPaidEventLike = {
  value: number;
  currency: string;
  precision: number;
  valueMicros?: string | null;
};

const PRECISION_MAP: Record<number, string> = {
  [RevenuePrecisions.UNKNOWN]: AdRevenuePrecision.unknown,
  [RevenuePrecisions.ESTIMATED]: AdRevenuePrecision.estimated,
  [RevenuePrecisions.PUBLISHER_PROVIDED]: AdRevenuePrecision.publisherDefined,
  [RevenuePrecisions.PRECISE]: AdRevenuePrecision.exact,
};

// Fire-and-forget, best-effort — same posture as analytics.ts and
// everything else ad-adjacent here. Ad revenue reporting should never be
// able to affect the app.
export function trackAdRevenue(
  event: AdPaidEventLike,
  opts: { adFormat: string; adUnitId: string; impressionId: string; placement?: string },
) {
  // AdMob reports `valueMicros` as an exact decimal string when it can;
  // only fall back to deriving micros from the floating-point `value` when
  // that's unavailable, per the library's own guidance.
  const revenueMicros =
    event.valueMicros != null ? Number(event.valueMicros) : Math.round(event.value * 1_000_000);

  Purchases.adTracker
    .trackAdRevenue({
      mediatorName: AdMediatorName.adMob,
      adFormat: opts.adFormat,
      adUnitId: opts.adUnitId,
      impressionId: opts.impressionId,
      revenueMicros,
      currency: event.currency,
      precision: PRECISION_MAP[event.precision] ?? AdRevenuePrecision.unknown,
      placement: opts.placement ?? null,
    })
    .catch(() => {});
}
