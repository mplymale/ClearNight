import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'clearnight:subscriptionStatus';
const INSTALL_KEY = 'clearnight:installedAt';
// Length of the free-tier "soft trial" shown before any purchase exists —
// counted from first app launch (install), not from when onboarding
// finishes, so it can't be reset by re-running onboarding.
const TRIAL_LENGTH_DAYS = 7;
const REVENUECAT_API_KEY_IOS = 'appl_LrnaPpbHDGInzsJXNtDMKDnBbRL';
export const PREMIUM_ENTITLEMENT_ID = 'ClearNight Premium';

// 'trial' and 'subscribed' both unlock premium features — the distinction
// is just whether the trial banner/CTA should still show. 'free' is the
// locked-down tier shown when neither applies.
export type SubscriptionStatus = 'free' | 'trial' | 'subscribed';

interface SubscriptionCtx {
  status: SubscriptionStatus;
  setStatus: (next: SubscriptionStatus) => void;
  // True once a real RevenueCat entitlement is active — distinguishes an
  // actual paying customer (even mid free-trial) from the local "soft
  // trial" shown before any purchase exists. Both can produce status
  // 'trial', but only one of them should still see an upgrade prompt.
  hasActivePurchase: boolean;
  // Whole days left in the active trial — a real RevenueCat trial if one
  // exists, otherwise the local soft trial countdown from install. Null
  // when not currently on any trial (free or subscribed).
  trialDaysLeft: number | null;
  // Dev-only QA override — forces `status`/`hasActivePurchase` to a chosen
  // value regardless of the real RevenueCat entitlement, so premium states
  // can be previewed on a device that's already a real sandbox subscriber
  // (StoreKit won't re-prompt a purchase once one is active). No-ops
  // outside __DEV__.
  devPreview: SubscriptionStatus | null;
  setDevPreview: (next: SubscriptionStatus | null) => void;
}

const SubscriptionContext = createContext<SubscriptionCtx>({
  status: 'trial',
  setStatus: () => {},
  hasActivePurchase: false,
  trialDaysLeft: null,
  devPreview: null,
  setDevPreview: () => {},
});

interface PurchaseInfo {
  status: SubscriptionStatus;
  expirationDate: string | null;
}

function entitlementInfo(info: CustomerInfo): PurchaseInfo | null {
  const entitlement = info.entitlements.active[PREMIUM_ENTITLEMENT_ID];
  if (!entitlement) return null;
  return {
    status: entitlement.periodType === 'TRIAL' ? 'trial' : 'subscribed',
    expirationDate: entitlement.expirationDate,
  };
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  // Local status drives onboarding's "soft trial" demo flow, dev resets, and
  // account deletion. A real RevenueCat entitlement always overrides it once
  // one becomes active — see `status` below.
  const [localStatus, setLocalStatus] = useState<SubscriptionStatus>('trial');
  const [purchaseInfo, setPurchaseInfo] = useState<PurchaseInfo | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // When the free-tier soft trial actually started (epoch ms) — recorded on
  // first-ever launch, independent of onboarding or `localStatus`, so it
  // can't be reset by re-onboarding. Null until hydration resolves it.
  const [installedAt, setInstalledAt] = useState<number | null>(null);
  // Distinct from `purchaseInfo` being null, which is also the initial
  // state before RevenueCat has answered at all — this only flips once a
  // real entitlement check has actually resolved, so the Supabase sync
  // effect below never writes a premature "not premium" before we genuinely
  // know that.
  const [entitlementKnown, setEntitlementKnown] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'free' || saved === 'trial' || saved === 'subscribed') {
          setLocalStatus(saved);
        }
        const savedInstall = await AsyncStorage.getItem(INSTALL_KEY);
        if (savedInstall) {
          setInstalledAt(Number(savedInstall));
        } else {
          // First time we've ever seen this key — either a genuinely fresh
          // install, or an existing install from before this field existed.
          // Either way, start the clock now rather than guessing a past
          // date; an existing trial user just gets a fresh full-length
          // trial from this point, which is the safe direction to be wrong.
          const now = Date.now();
          setInstalledAt(now);
          AsyncStorage.setItem(INSTALL_KEY, String(now)).catch(() => {});
        }
      } catch {
        // Corrupt/unavailable storage — start fresh.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, localStatus).catch(() => {});
  }, [localStatus, hydrated]);

  // Expires the local soft trial once TRIAL_LENGTH_DAYS have actually
  // passed since install. Runs on every mount (app open) rather than a live
  // timer — the trial only needs to expire the next time the app is
  // opened, same as how every other app's trial actually behaves. Never
  // touches `localStatus` once a real RevenueCat purchase exists.
  useEffect(() => {
    if (!hydrated || installedAt == null) return;
    if (localStatus !== 'trial') return;
    if (purchaseInfo !== null) return;
    const daysLeft = Math.max(0, TRIAL_LENGTH_DAYS - Math.floor((Date.now() - installedAt) / 86400000));
    if (daysLeft <= 0) setLocalStatus('free');
  }, [hydrated, installedAt, localStatus, purchaseInfo]);

  const { user } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    Purchases.configure({ apiKey: REVENUECAT_API_KEY_IOS });

    Purchases.getCustomerInfo()
      .then((info) => {
        setPurchaseInfo(entitlementInfo(info));
        setEntitlementKnown(true);
      })
      .catch(() => {});

    const listener = (info: CustomerInfo) => {
      setPurchaseInfo(entitlementInfo(info));
      setEntitlementKnown(true);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => { Purchases.removeCustomerInfoUpdateListener(listener); };
  }, []);

  // Links the RevenueCat customer to the same identity as the Supabase row
  // (every user here — anonymous or not — has a stable Supabase user id from
  // AuthProvider). Without this, RevenueCat generates its own anonymous ID
  // with no relationship to anything in Supabase, which is what made it
  // impossible to tell from a `profiles` row whether it belongs to a paying
  // subscriber. `logIn` is safe to call repeatedly with the same id — it's a
  // no-op once already aliased — so this doesn't need to guard against
  // re-running if `user.id` happens not to change.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (!user?.id) return;

    Purchases.logIn(user.id).catch(() => {
      // RevenueCat not reachable / SDK hiccup — purchases still work under
      // whatever identity it already has; this just retries next time the
      // provider re-renders with a user id.
    });
  }, [user?.id]);

  // Keeps `profiles.is_premium` in sync with the real RevenueCat entitlement
  // (not the dev-preview override below — a QA device previewing "premium"
  // must never write that into a real Supabase row). Gated on
  // `entitlementKnown` so this never fires "false" before the first real
  // answer comes back and overwrites a genuinely premium row for a moment.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (!user?.id || !entitlementKnown) return;

    (async () => {
      try {
        // supabase-js resolves (doesn't reject) on a query-level failure —
        // e.g. RLS denial — so that's checked explicitly below, not just
        // caught. Either way this is best-effort: worst case this row is
        // stale until the next entitlement change or app launch re-syncs it.
        const { error } = await supabase
          .from('profiles')
          .update({ is_premium: purchaseInfo !== null })
          .eq('id', user.id);
        if (error && __DEV__) console.warn('[SubscriptionContext] is_premium sync failed:', error.message);
      } catch {
        // Network/SDK-level failure — same best-effort shrug as above.
      }
    })();
  }, [user?.id, entitlementKnown, purchaseInfo]);

  const [devPreview, setDevPreview] = useState<SubscriptionStatus | null>(null);
  const previewing = __DEV__ && devPreview !== null;

  const status = previewing ? devPreview! : (purchaseInfo?.status ?? localStatus);
  const hasActivePurchase = previewing ? devPreview === 'subscribed' : purchaseInfo !== null;
  const setStatus = (next: SubscriptionStatus) => setLocalStatus(next);

  // Days left in the local soft trial (not a real RevenueCat trial) — null
  // until install time is known, then counts down from TRIAL_LENGTH_DAYS.
  const localTrialDaysLeft = installedAt == null
    ? null
    : Math.max(0, TRIAL_LENGTH_DAYS - Math.floor((Date.now() - installedAt) / 86400000));

  const trialDaysLeft = previewing
    ? (devPreview === 'trial' ? TRIAL_LENGTH_DAYS : null)
    : purchaseInfo?.status === 'trial' && purchaseInfo.expirationDate
      ? Math.max(0, Math.ceil((new Date(purchaseInfo.expirationDate).getTime() - Date.now()) / 86400000))
      : purchaseInfo === null && localStatus === 'trial'
        ? localTrialDaysLeft
        : null;

  return (
    <SubscriptionContext.Provider value={{ status, setStatus, hasActivePurchase, trialDaysLeft, devPreview, setDevPreview }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
