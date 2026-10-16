import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface AlertData {
  label: string;
  alertType: 'location' | 'target';
  enabled: boolean;
  preference: {
    threshold: number;
    timing: 'evening' | 'dayBefore';
  };
}

type PushData =
  | { kind: 'location'; locationName: string }
  | { kind: 'target'; locationName: string; targetType: 'prime' | 'object'; objIndex?: number };

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data: PushData;
}

Deno.serve(async (req) => {
  // Allow manual POST trigger or scheduled cron
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // 1. Load all enabled alerts
    const { data: alertRows, error: alertErr } = await supabase
      .from('alerts')
      .select('user_id, key, data, last_notified_at');

    if (alertErr) throw alertErr;

    // 2. Load all push tokens
    const { data: tokenRows, error: tokenErr } = await supabase
      .from('push_tokens')
      .select('user_id, token');

    if (tokenErr) throw tokenErr;

    // Build a map of user_id → tokens
    const tokensByUser = new Map<string, string[]>();
    for (const row of tokenRows ?? []) {
      if (!tokensByUser.has(row.user_id)) tokensByUser.set(row.user_id, []);
      tokensByUser.get(row.user_id)!.push(row.token);
    }

    // 3. Load forecasts for each user's locations
    // Ordered by sort_order to match the client's own location array order —
    // alert keys like "alert-loc-0" reference that positional index, so a
    // mismatched order here silently resolves to the wrong location (or none).
    const { data: locationRows, error: locErr } = await supabase
      .from('locations')
      .select('user_id, name, latitude, longitude, bortle, sort_order, tonight_score, has_window')
      .order('sort_order');

    if (locErr) throw locErr;

    const locationsByUser = new Map<string, typeof locationRows>();
    for (const loc of locationRows ?? []) {
      if (!locationsByUser.has(loc.user_id)) locationsByUser.set(loc.user_id, []);
      locationsByUser.get(loc.user_id)!.push(loc);
    }

    // Keyed by token (not pushed to a flat array) so that if several
    // Supabase user_ids — e.g. leftover "ghost" anonymous accounts from
    // before sessions were persisted client-side — all resolve to the same
    // physical device's push token, that device still only gets ONE
    // message per run instead of one per stale account.
    const messagesByToken = new Map<string, PushMessage>();
    // Alerts that qualify this run — mark these as notified afterward so a
    // config that stays clear all night doesn't re-fire on every hourly run.
    const notifiedAlerts: { user_id: string; key: string }[] = [];
    const now = new Date();

    // 4. For each user, check their alerts against forecast scores
    const userIds = new Set((alertRows ?? []).map(r => r.user_id));

    for (const userId of userIds) {
      const tokens = tokensByUser.get(userId);
      if (!tokens || tokens.length === 0) continue;

      const userAlerts = (alertRows ?? []).filter(r => r.user_id === userId);
      const userLocations = locationsByUser.get(userId) ?? [];

      for (const alertRow of userAlerts) {
        const alert = alertRow.data as AlertData;
        if (!alert.enabled) continue;

        // Already sent once today — skip regardless of how many times this
        // hour's cron run repeats while conditions stay good.
        if (alertRow.last_notified_at && isSameUtcDay(new Date(alertRow.last_notified_at), now)) continue;

        // Match alert key to location index — either a location alert or a
        // target alert (prime target / specific object) for that location.
        const locMatch = alertRow.key.match(/^alert-loc-(\d+)$/);
        const targetMatch = alertRow.key.match(/^alert-(\d+)-(prime|object)-(.*)$/);
        const locIndex = locMatch
          ? parseInt(locMatch[1], 10)
          : targetMatch
          ? parseInt(targetMatch[1], 10)
          : -1;
        if (locIndex < 0) continue;

        const loc = userLocations[locIndex];
        if (!loc) continue;

        // Use the score/window the app itself already computed and synced —
        // not an independent recalculation — so this can never disagree with
        // what the user sees on screen. No score yet (never refreshed) or no
        // real contiguous clear window both mean "doesn't qualify." Target
        // alerts piggyback on the same location-level score/window: a
        // target's own visibility window is static per location (not
        // date-dependent), so the location's nightly conditions are what
        // actually decide whether tonight qualifies.
        if (loc.tonight_score == null || !loc.has_window) continue;
        const score = loc.tonight_score;
        if (score < alert.preference.threshold) continue;

        const verdict = scoreToVerdict(score);
        const isEvening = alert.preference.timing === 'evening';

        let title: string;
        let body: string;
        let data: PushData;

        if (locMatch) {
          title = isEvening
            ? `${verdict} — skies are open at ${loc.name}`
            : `${verdict} night ahead at ${loc.name}`;
          body = isEvening
            ? `Score ${score} tonight at ${loc.name}. Time to head out.`
            : `Tomorrow night is looking ${verdict} — score ${score}. Plan your session.`;
          data = { kind: 'location', locationName: loc.name };
        } else {
          const targetType = targetMatch![2] as 'prime' | 'object';
          const objIndexStr = targetMatch![3];
          title = isEvening
            ? `${alert.label} window is open now`
            : `${alert.label} is up tomorrow night`;
          body = isEvening
            ? `${verdict} skies — score ${score}. ${alert.label} is visible now.`
            : `${verdict} conditions tomorrow — score ${score}. Good night for ${alert.label}.`;
          data = {
            kind: 'target',
            locationName: loc.name,
            targetType,
            objIndex: targetType === 'object' ? parseInt(objIndexStr, 10) : undefined,
          };
        }

        for (const token of tokens) {
          if (!messagesByToken.has(token)) {
            messagesByToken.set(token, { to: token, title, body, sound: 'default', data });
          }
        }
        notifiedAlerts.push({ user_id: userId, key: alertRow.key });
      }
    }

    // 5. Send all messages in batches of 100 (Expo limit)
    const messages = Array.from(messagesByToken.values());
    const results = [];
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(batch),
      });
      results.push(await res.json());
    }

    // 6. Mark qualifying alerts as notified so this run's matches don't
    // fire again on the next hourly check tonight.
    for (const { user_id, key } of notifiedAlerts) {
      await supabase
        .from('alerts')
        .update({ last_notified_at: now.toISOString() })
        .eq('user_id', user_id)
        .eq('key', key);
    }

    return new Response(
      JSON.stringify({ sent: messages.length, results }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('send-alerts error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

function isSameUtcDay(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate();
}

function scoreToVerdict(score: number): string {
  if (score >= 78) return 'Excellent';
  if (score >= 62) return 'Good';
  if (score >= 42) return 'Fair';
  return 'Poor';
}
