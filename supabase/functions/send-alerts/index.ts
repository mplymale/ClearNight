import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

// A tokenless alert can never be delivered. Users with no token are skipped
// on every run anyway; this is about not re-reading them forever. 30 days is
// long enough that a user who set an alert before granting notification
// permission has had every chance to grant it.
const TOKENLESS_ALERT_MAX_AGE_DAYS = 30;

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
  // The phone's own locally-scheduled notifications for this alert, synced
  // up by AlertsContext. If one of these is still in the future, the phone
  // will show it itself and this function must not send a second one.
  fires?: { fireDateMs: number }[];
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
    // 0. Resolve receipts from earlier runs. Apple reports an uninstalled
    //    device as DeviceNotRegistered on the receipt, not the ticket, and
    //    receipts take ~15 minutes to appear — so each run settles the
    //    previous runs' sends. This is the mechanism that actually stops
    //    pushes after an uninstall.
    const receiptDead = await resolvePendingReceipts();
    let prunedTokens = 0;
    let prunedAlertUsers = 0;
    if (receiptDead.size > 0) {
      const pruned = await pruneDeadTokens(receiptDead);
      prunedTokens += pruned.tokens;
      prunedAlertUsers += pruned.alertUsers;
    }

    // 0b. Sweep alerts that belong to users with no push token and are older
    //     than the grace period. One ghost accumulates per reinstall under
    //     anonymous auth; without this they grow without bound.
    const sweptAlerts = await sweepTokenlessAlerts();

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

        // The phone has a local notification queued for this alert. It will
        // fire on its own; a push on top of it is the "double alert" bug.
        // Server push is the backstop for a phone that has not run the app
        // recently enough to have scheduled anything — in that case the
        // fires here are in the past or empty, and we fall through.
        if ((alert.fires ?? []).some(f => f.fireDateMs > now.getTime())) continue;

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

    // 5. Send all messages in batches of 100 (Expo limit). Tickets come back
    //    in the same order as the batch, so index maps back to the token.
    const messages = Array.from(messagesByToken.values());
    const results = [];
    const deadTokens = new Set<string>();
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(batch),
      });
      const json = await res.json();
      results.push(json);
      const tickets: { status: string; id?: string; details?: { error?: string } }[] = json?.data ?? [];
      const pendingTickets: { ticket_id: string; token: string }[] = [];
      tickets.forEach((t, idx) => {
        if (t?.status === 'error' && t.details?.error === 'DeviceNotRegistered') {
          deadTokens.add(batch[idx].to);
        } else if (t?.status === 'ok' && t.id) {
          pendingTickets.push({ ticket_id: t.id, token: batch[idx].to });
        }
      });
      if (pendingTickets.length > 0) {
        await supabase.from('push_tickets').upsert(pendingTickets, { onConflict: 'ticket_id' });
      }
    }

    // 5b. A token Expo reports as DeviceNotRegistered belongs to a phone that
    //     uninstalled the app (or turned notifications off for good). Delete
    //     the token, and the alerts of any user left with no token at all —
    //     nothing can ever deliver them, and leaving them makes this run
    //     re-evaluate ghosts every hour forever.
    if (deadTokens.size > 0) {
      const pruned = await pruneDeadTokens(deadTokens);
      prunedTokens += pruned.tokens;
      prunedAlertUsers += pruned.alertUsers;
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
      JSON.stringify({ sent: messages.length, prunedTokens, prunedAlertUsers, sweptAlerts, results }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('send-alerts error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

// Fetch receipts for tickets older than 15 minutes; return the tokens Expo
// says are DeviceNotRegistered. Processed tickets are deleted either way.
async function resolvePendingReceipts(): Promise<Set<string>> {
  const dead = new Set<string>();
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: pending, error } = await supabase
    .from('push_tickets')
    .select('ticket_id, token')
    .lt('created_at', cutoff)
    .limit(1000);
  if (error || !pending || pending.length === 0) return dead;

  const byTicket = new Map(pending.map(p => [p.ticket_id, p.token]));
  try {
    const res = await fetch(EXPO_RECEIPTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ ids: Array.from(byTicket.keys()) }),
    });
    const json = await res.json();
    const receipts: Record<string, { status: string; details?: { error?: string } }> = json?.data ?? {};
    for (const [id, r] of Object.entries(receipts)) {
      if (r?.status === 'error' && r.details?.error === 'DeviceNotRegistered') {
        const token = byTicket.get(id);
        if (token) dead.add(token);
      }
    }
  } catch (e) {
    console.error('receipt check failed:', e);
    return dead; // keep the tickets; try again next run
  }

  // Expo drops receipts after ~24h; anything we asked about is settled or gone.
  await supabase.from('push_tickets').delete().in('ticket_id', Array.from(byTicket.keys()));
  return dead;
}

// Delete the given tokens, then the alerts of any user left with no token.
async function pruneDeadTokens(deadTokens: Set<string>): Promise<{ tokens: number; alertUsers: number }> {
  const dead = Array.from(deadTokens);
  const { data: owners } = await supabase.from('push_tokens').select('user_id').in('token', dead);
  const affectedUsers = new Set((owners ?? []).map(o => o.user_id));

  const { error: delTokErr } = await supabase.from('push_tokens').delete().in('token', dead);
  let alertUsers = 0;
  for (const uid of affectedUsers) {
    const { count } = await supabase
      .from('push_tokens').select('*', { count: 'exact', head: true }).eq('user_id', uid);
    if ((count ?? 0) === 0) {
      const { error: delAlertErr } = await supabase.from('alerts').delete().eq('user_id', uid);
      if (!delAlertErr) alertUsers++;
    }
  }
  return { tokens: delTokErr ? 0 : dead.length, alertUsers };
}

// Alerts whose user has no push token and that are past the grace period.
async function sweepTokenlessAlerts(): Promise<number> {
  const cutoff = new Date(Date.now() - TOKENLESS_ALERT_MAX_AGE_DAYS * 86400000).toISOString();
  const { data: stale } = await supabase
    .from('alerts')
    .select('user_id')
    .lt('created_at', cutoff);
  if (!stale || stale.length === 0) return 0;
  const candidates = Array.from(new Set(stale.map(s => s.user_id)));
  const { data: withTokens } = await supabase
    .from('push_tokens')
    .select('user_id')
    .in('user_id', candidates);
  const keep = new Set((withTokens ?? []).map(t => t.user_id));
  const doomed = candidates.filter(u => !keep.has(u));
  if (doomed.length === 0) return 0;
  const { error, count } = await supabase
    .from('alerts')
    .delete({ count: 'exact' })
    .in('user_id', doomed)
    .lt('created_at', cutoff);
  return error ? 0 : (count ?? 0);
}

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
