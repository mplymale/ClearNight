import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  NativeAd,
  NativeAdEventType,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
  TestIds,
} from 'react-native-google-mobile-ads';
import { AdFormat, trackAdRevenue } from '../../services/adRevenueTracker';
import {
  useNightVision,
  NV_ACCENT,
  NV_BORDER,
  NV_CARD,
  NV_TEXT,
  NV_TEXT_DIM,
} from '../../context/NightVisionContext';

// Real AdMob account live as of Oct 22 (Release A #2). Test IDs still used
// in dev builds so nobody's own testing counts as real impressions against
// the real account.
const AD_UNIT_ID = __DEV__ ? TestIds.NATIVE : 'ca-app-pub-8886357120051718/2830301096';

// Free-tier-only native ad card for the home screen target list. Deliberately
// built to the same shape as the real target cards it sits beside
// (PrimeTargetCard.tsx's `styles.card`/`styles.list`) so it reads as one more
// card in the stack rather than a bolted-on banner. Renders nothing until an
// ad has actually loaded — no placeholder/skeleton state, since a free user
// simply seeing one fewer card for a session is a fine fallback for a no-fill.
export function HomeNativeAdCard() {
  const { nightVision } = useNightVision();
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  // NativeAdView's own registered native bounds don't always reliably match
  // a decimal (non-integer) RN-computed height — that mismatch is what the
  // AdMob native ad validator flags as "[asset] outside native ad view."
  // Measuring the actual content once laid out and feeding back a rounded
  // integer height fixes it.
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  // A '100%' style on MediaView wasn't reliably resolving (rendered as a
  // small square instead of spanning the card), so its width is measured
  // off the actual card layout and passed in as an explicit number instead.
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadedAd: NativeAd | null = null;

    NativeAd.createForAdRequest(AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    })
      .then((ad) => {
        if (cancelled) {
          ad.destroy();
          return;
        }
        loadedAd = ad;
        setNativeAd(ad);
        ad.addAdEventListener(NativeAdEventType.PAID, (event) => {
          trackAdRevenue(event, {
            adFormat: AdFormat.nativeAd,
            adUnitId: AD_UNIT_ID,
            impressionId: ad.responseId,
          });
        });
      })
      .catch(() => {
        // No fill / network error — card just doesn't appear this session.
      });

    return () => {
      cancelled = true;
      loadedAd?.destroy();
    };
  }, []);

  if (!nativeAd) return null;

  const cardBorder = nightVision ? NV_BORDER : 'rgba(255,255,255,0.09)';
  const cardBg = nightVision ? NV_CARD : 'rgba(255,255,255,0.055)';
  const textPrimary = nightVision ? NV_TEXT : '#fff';
  const textDim = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.55)';
  const badgeColor = nightVision ? NV_TEXT_DIM : 'rgba(255,255,255,0.4)';
  const accent = nightVision ? NV_ACCENT : '#7ef0d2';
  const ctaTextColor = nightVision ? '#180300' : '#04130f';

  // NativeAdView is a thin native wrapper required for Google's click/impression
  // attribution — it doesn't reliably apply RN's flexbox (padding, alignItems,
  // absolute-position containment) to its own style prop. So it stays unstyled
  // here, and all real visual layout — including the "Ad" badge's positioning
  // context — lives on the plain View inside it, which Yoga lays out normally.
  return (
    <NativeAdView
      nativeAd={nativeAd}
      style={[styles.adViewWrapper, measuredHeight != null && { height: measuredHeight }]}
    >
      <View
        style={[styles.card, { borderColor: cardBorder, backgroundColor: cardBg }]}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          const roundedH = Math.ceil(h);
          const roundedW = Math.round(w);
          if (roundedH !== measuredHeight) setMeasuredHeight(roundedH);
          if (roundedW !== measuredWidth) setMeasuredWidth(roundedW);
        }}
      >
        {/* Required by AdMob's native ad policy: the main image/video asset
            must render through MediaView, not a plain Image. Bleeds edge to
            edge above the padded content row; `card` keeps overflow hidden
            so this clips to the card's own rounded top corners. Omitted
            entirely on a no-media-content fill rather than reserving empty
            space for it. */}
        {nativeAd.mediaContent && measuredWidth != null && (
          <NativeMediaView style={[styles.media, { width: measuredWidth }]} resizeMode="contain" />
        )}

        <View style={styles.content}>
          {nativeAd.icon?.url && (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image
                source={{ uri: nativeAd.icon.url }}
                style={styles.icon}
                resizeMode="contain"
              />
            </NativeAsset>
          )}

          <View style={styles.main}>
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={[styles.headline, { color: textPrimary }]} numberOfLines={1}>
                {nativeAd.headline}
              </Text>
            </NativeAsset>
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text style={[styles.advertiser, { color: textDim }]} numberOfLines={1}>
                {nativeAd.advertiser ? `${nativeAd.advertiser} · Sponsored` : 'Sponsored'}
              </Text>
            </NativeAsset>
          </View>

          {/* Stacked in-flow (not absolutely positioned) so the "Ad" disclosure
              badge can never overlap the CTA button, whatever the card's actual
              content height ends up being. */}
          <View style={styles.trailing}>
            <View style={styles.adBadge} pointerEvents="none">
              <Text style={[styles.adBadgeText, { color: badgeColor }]}>Ad</Text>
            </View>

            <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
              <View style={[styles.cta, { backgroundColor: accent }]}>
                <Text style={[styles.ctaText, { color: ctaTextColor }]} numberOfLines={1}>
                  {nativeAd.callToAction || 'View'}
                </Text>
              </View>
            </NativeAsset>
          </View>
        </View>
      </View>
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  adViewWrapper: {
    // No margin on purpose — inherits whatever horizontal inset its parent
    // container provides (LockedCards' own paddingHorizontal), same as the
    // other cards it sits beside; vertical spacing comes from that
    // container's own `gap`. A self-imposed margin here is what made it
    // double up with the parent's padding and render too wide/misaligned.
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  media: {
    // Width is set numerically inline (see MEDIA_WIDTH) rather than here.
    // Video's back on (ad unit allows both image + video again) — now that
    // the ad sits last in the stack instead of right after the hero card,
    // Mike's fine with it reading bigger/more video-like down there. No
    // fixed height, so a normal-aspect creative displays at its real
    // proportions with nothing cropped off; `maxHeight` just stops an
    // unusually tall/near-square creative from ballooning past a reasonable
    // size. `contain` (the resizeMode prop) means a creative that hits that
    // cap letterboxes instead of getting cropped.
    maxHeight: 280,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    paddingHorizontal: 18,
  },
  trailing: {
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: 6,
  },
  adBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  adBadgeText: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontWeight: '600',
    fontSize: 9,
    letterSpacing: 0.6,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'center',
  },
  main: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  headline: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontWeight: '600',
    fontSize: 15,
  },
  advertiser: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
  },
  cta: {
    flexShrink: 0,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  ctaText: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontWeight: '600',
    fontSize: 12.5,
  },
});
