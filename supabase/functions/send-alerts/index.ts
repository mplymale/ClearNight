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

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
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
      .select('user_id, key, data');

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
    const { data: locationRows, error: locErr } = await supabase
      .from('locations')
      .select('user_id, name, latitude, longitude, bortle');

    if (locErr) throw locErr;

    const locationsByUser = new Map<string, typeof locationRows>();
    for (const loc of locationRows ?? []) {
      if (!locationsByUser.has(loc.user_id)) locationsByUser.set(loc.user_id, []);
      locationsByUser.get(loc.user_id)!.push(loc);
    }

    const messages: PushMessage[] = [];

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

        // Match alert key to location index
        const locMatch = alertRow.key.match(/^alert-loc-(\d+)$/);
        if (!locMatch) continue;

        const locIndex = parseInt(locMatch[1], 10);
        const loc = userLocations[locIndex];
        if (!loc) continue;

        // Fetch tonight's forecast score from Open-Meteo
        const score = await fetchNightScore(loc.latitude, loc.longitude);
        if (score < alert.preference.threshold) continue;

        const verdict = scoreToVerdict(score);
        const isEvening = alert.preference.timing === 'evening';

        const title = isEvening
          ? `${verdict} — skies are open at ${loc.name}`
          : `${verdict} night ahead at ${loc.name}`;
        const body = isEvening
          ? `Score ${score} tonight at ${loc.name}. Time to head out.`
          : `Tomorrow night is looking ${verdict} — score ${score}. Plan your session.`;

        for (const token of tokens) {
          messages.push({ to: token, title, body, sound: 'default' });
        }
      }
    }

    // 5. Send all messages in batches of 100 (Expo limit)
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

    return new Response(
      JSON.stringify({ sent: messages.length, results }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('send-alerts error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

// Fetch average cloud cover for tonight (dusk to dawn) from Open-Meteo
async function fetchNightScore(lat: number, lon: number): Promise<number> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=cloudcover&timezone=auto&forecast_days=2`;
    const res = await fetch(url);
    const json = await res.json();
    const clouds: number[] = json.hourly?.cloudcover ?? [];
    // Use hours 20-28 (8pm to 4am) as a rough night window
    const nightSlice = clouds.slice(20, 28);
    if (nightSlice.length === 0) return 0;
    const avgCloud = nightSlice.reduce((a, b) => a + b, 0) / nightSlice.length;
    return Math.round(100 - avgCloud);
  } catch {
    return 0;
  }
}

function scoreToVerdict(score: number): string {
  if (score >= 78) return 'Excellent';
  if (score >= 62) return 'Good';
  if (score >= 42) return 'Fair';
  return 'Poor';
}
