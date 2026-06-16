# Notifications Backend — making GO alerts actually fire

This is the one feature that can't live inside the app alone. A phone can't reliably wake itself up
each night to check the weather and notify you while the app is closed. So a small server-side piece
does it. This doc explains exactly what to build. It's a well-trodden pattern — don't overthink it.

---

## The two notifications (from the design)

| # | Name | When it fires | Tier | Example copy |
|---|---|---|---|---|
| 1 | **Tonight is a GO** | Early evening, if **tonight's** score ≥ the user's threshold (and not in quiet hours) | Premium | *"Tonight is a GO over Cherry Springs — clear window 11:10pm–4:20am · Bortle 2 skies."* |
| 2 | **A GO window is coming** | When a **future** night in the next few days first becomes a GO | Premium | *"A GO window is coming — Thursday looks excellent, score 88, clear and moonless."* |

Both are **Premium-only**. Free users never receive pushes.

---

## The moving parts

```
  ┌─────────────┐   register token + prefs    ┌──────────────┐
  │  The app    │ ──────────────────────────▶ │   Database   │
  │ (Expo / RN) │                             │  (Supabase)  │
  └─────────────┘                             └──────┬───────┘
        ▲                                            │ reads users + locations + prefs
        │ push arrives                               ▼
  ┌─────┴───────┐    send push     ┌──────────────────────────────┐
  │ Expo Push   │ ◀─────────────── │  Scheduled job (runs nightly)│
  │  service    │                  │  score tonight + the week,   │
  └─────────────┘                  │  compare to each user's rule │
                                   └──────────────────────────────┘
```

1. **The app** asks the OS for notification permission (this is the prompt that appears when the user
   flips your "Push notifications" toggle on). On success it gets an **Expo push token** and saves it
   to the database, along with the user's **alert preferences**: threshold (0–100), push on/off,
   quiet-hours range, and their saved location(s).

2. **The database** (Supabase) stores: users, their push tokens, their locations (lat/lng + Bortle),
   and their alert prefs.

3. **A scheduled job** runs once or twice each evening. For every Premium user with alerts on:
   - Score **tonight** for their location (same scoring module the app uses).
   - If score ≥ their threshold AND the current time isn't in their quiet hours AND you haven't
     already notified them for tonight → queue a **"Tonight is a GO"** push.
   - For the lookahead: score the next few nights; if a night **newly** crosses into GO (it wasn't a
     GO last time you checked) → queue a **"A GO window is coming"** push.
   - Send all queued pushes through the **Expo Push API**.

---

## Step by step

### In the app (Expo / React Native)
1. Use `expo-notifications` to request permission when the user enables alerts.
2. Get the Expo push token (`getExpoPushTokenAsync`) and `upsert` it to the user's row in Supabase.
3. Save alert prefs whenever the user changes the threshold slider, the toggle, or quiet hours.
4. Make sure you only ask for permission **after** the user opts in — never on first launch (Apple
   discourages it and conversion is better when it's tied to a clear benefit).

### In the database (Supabase)
Minimal tables:
- `profiles` — user id, `tier` (mirror from RevenueCat), expo_push_token
- `locations` — user id, name, lat, lng, bortle
- `alert_prefs` — user id, threshold, push_enabled, quiet_start, quiet_end
- `alert_log` — user id, night_date, type — so you don't double-send

### The scheduled job
Run it on a **Supabase scheduled Edge Function** (or any cron: Vercel Cron, GitHub Actions,
a tiny cloud function). Pseudocode:

```
for each premium user with push_enabled:
    loc = their location
    forecast = scoreNights(loc, daysAhead = 7)   // SAME scoring module as the app

    // 1) tonight
    tonight = forecast[0]
    if tonight.score >= prefs.threshold
       and not inQuietHours(now, prefs)
       and not alreadyLogged(user, tonight.date, 'tonight'):
          queue push("Tonight is a GO over " + loc.name + " — clear window " + tonight.window)
          log(user, tonight.date, 'tonight')

    // 2) lookahead — a future night NEWLY becomes a GO
    for night in forecast[1..]:
        if night.label == 'GO' and not alreadyLogged(user, night.date, 'window'):
            queue push("A GO window is coming — " + night.weekday + " looks " + night.word)
            log(user, night.date, 'window')
            break   // one lookahead nudge at a time

sendViaExpo(allQueuedPushes)
```

### Sending
POST the queued messages to the Expo Push API (`https://exp.host/--/api/v2/push/send`). Expo routes
them to Apple (APNs) and Google (FCM) for you — you don't touch those directly.

---

## Things that will bite you (forewarned)
- **Quiet hours that cross midnight** (e.g. 11pm–7am) need care — it's "after 11pm OR before 7am",
  not "between". Test it.
- **Time zones** — score and time-check in the *user's* local time, not the server's.
- **Don't double-send** — that's what `alert_log` is for. Check it before every send.
- **"Tonight" has a deadline** — a 6pm push is useless at 2am. Run the job early evening local time.
- **Scoring must match the app** — if the backend says GO but the app shows COND, users lose trust.
  Share one scoring module/function between them.
- **iOS permission is one-shot** — if a user denies, you can't re-prompt; you must deep-link them to
  Settings. Tie the first ask to a clear payoff (the "Turn on" button on the GO-alert card).

---

## A sane build order
1. Get a **single hardcoded test push** to land on your own phone via Expo. (Proves the pipe works.)
2. Save **one real token + threshold** from the app to Supabase.
3. Write the **scoring + tonight check**; trigger it manually; confirm it pushes you correctly.
4. Put it **on a schedule**.
5. Add the **lookahead** notification.
6. Add **quiet hours** + the **dedupe log** last.

Each step is independently testable. Don't wire the whole chain before the first push ever arrives.
