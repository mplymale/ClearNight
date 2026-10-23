import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  NativeAd,
  NativeAdEventType,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
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

  return (
    <NativeAdView
      nativeAd={nativeAd}
      style={[styles.card, { borderColor: cardBorder, backgroundColor: cardBg }]}
    >
      <View style={styles.adBadge} pointerEvents="none">
        <Text style={[styles.adBadgeText, { color: badgeColor }]}>Ad</Text>
      </View>

      {nativeAd.icon?.url && (
        <NativeAsset assetType={NativeAssetType.ICON}>
          <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
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

      <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
        <View style={[styles.cta, { backgroundColor: accent }]}>
          <Text style={[styles.ctaText, { color: ctaTextColor }]} numberOfLines={1}>
            {nativeAd.callToAction || 'View'}
          </Text>
        </View>
      </NativeAsset>
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 18,
    padding: 15,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  adBadge: {
    position: 'absolute',
    top: 10,
    right: 14,
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
  },
  main: {
    flex: 1,
    gap: 2,
    minWidth: 0,
    paddingRight: 28,
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
