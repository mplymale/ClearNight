# Getting Started — building StarCast for real (first-timer's roadmap)

You've never shipped an app before. That's fine. This file walks the whole path in plain language,
in the order you'll actually do it. Don't try to read it all at once — do one phase, then come back.

There are **two big realities** to accept up front:

1. **You need a native app, not a website.** Because you want **push notifications** (the GO alerts),
   and reliable push needs a real app on the App Store / Play Store. A plain website can't do this
   well, especially on iPhone.
2. **You need a small backend.** Something on a server has to wake up each evening, check the
   forecast for each user, and send the "Tonight is a GO" push. Your phone can't reliably do that to
   itself while the app is closed. This is normal — almost every notification app works this way.

Neither is as scary as it sounds. Here's the plan.

---

## The recommended stack (what to build with)

| Need | Use | Why |
|---|---|---|
| The app | **Expo (React Native)** | One codebase → real iPhone + Android apps. Closest to the React in your prototype, and it has the easiest push-notification system that exists. |
| The backend + database | **Supabase** | Free to start. Gives you a database, user login, and scheduled jobs without running your own server. |
| Sending pushes | **Expo Push Notifications** | Expo handles the ugly Apple/Google plumbing for you. |
| Payments (the paywall) | **RevenueCat** | Handles App Store / Play subscriptions, the 7-day trial, and "restore purchase" — the exact model in your paywall. Free under a revenue threshold. |
| Weather/sky data | **Open-Meteo** (free, no key) + **7Timer! Astro** (free) | Cloud, and astronomy "seeing". Moon phase you compute locally. |

You don't need to learn all of these deeply. Claude Code will write most of the wiring — your job is
to understand the shape of it so you can steer.

---

## Phase 0 — set up your machine (half a day)

1. Install **Node.js** (the runtime everything uses) — get the "LTS" version from nodejs.org.
2. Install **VS Code** (the editor Claude Code plugs into).
3. Install **Claude Code** (follow Anthropic's setup docs).
4. Make a **free GitHub account** — this is where your code is backed up and where the app-build
   service pulls from.
5. Install **Expo Go** on your phone (App Store / Play Store) — it lets you see your app live on your
   actual phone while you build, before you ever submit to a store.

> ✅ You're done with Phase 0 when you can open VS Code, open a terminal inside it, and type
> `node --version` and see a number.

---

## Phase 1 — scaffold the app (1 day)

Open Claude Code in an empty folder and give it a prompt like:

> "Create a new Expo (React Native) app called StarCast using TypeScript and Expo Router.
> Set up a tab/stack navigation with empty screens for: Home, Settings, Add Location, Paywall.
> I'll provide a design handoff next."

Then **drop this entire handoff folder into the project** and tell Claude Code:

> "Read `design_handoff_starcast/README.md`. Recreate the **Home** screen (premium version) in React
> Native, matching the colors, fonts, and the night-arc verdict component exactly. Use the verdict
> palette and `verdictFromScore` thresholds from the README. Use placeholder/mock forecast data for
> now — I'll wire real data later."

Build it **one screen at a time**, in this order (easiest → hardest):
1. Home (premium) + the verdict/night-arc component
2. Free home + the locked cards
3. Settings
4. Paywall
5. Add Location / onboarding

> ✅ End of Phase 1: you can open the app in Expo Go on your phone and tap between screens. It uses
> fake data, has no login, and the paywall button does nothing yet. **That's exactly right.**

---

## Phase 2 — real data (a few days)

Now make the forecast real. Ask Claude Code to:
1. Add a location's latitude/longitude when the user saves a spot (Expo has a location API for
   "use my current location" — that's what your nav-arrow button triggers).
2. Fetch cloud cover from **Open-Meteo** and seeing from **7Timer!** for that lat/lng.
3. Compute **moon illumination** locally (SunCalc library).
4. Combine those into the 0–100 **score**, then map to a verdict with the README's thresholds.
5. Find the **best window** (darkest, clearest contiguous hours).

> Keep the scoring math in ONE file. The backend (Phase 4) must score nights the same way the app
> does, or your pushes won't match what users see.

> ✅ End of Phase 2: the verdict on your home screen reflects the *actual* sky for a real place.

---

## Phase 3 — accounts + payments (a few days)

1. **Login** — add Supabase auth (email or "Sign in with Apple"). You need accounts so the backend
   knows who to notify.
2. **Payments** — wire **RevenueCat** to the paywall. Configure three products to match your design:
   - Annual `$12.99` (with 7-day free trial)
   - Monthly `$1.99` (with 7-day free trial)
   - Lifetime `$29.99` (one-time)
   RevenueCat tells your app whether the user is `free`, `trial`, or `premium` — feed that straight
   into the `tier` state your prototype already uses to lock/unlock features.

> Note: real App Store products require an **Apple Developer account ($99/year)** and a
> **Google Play account ($25 once)**. You can build and test everything else for free first.

> ✅ End of Phase 3: a test purchase flips the app from Free to Premium and unlocks the week + alerts.

---

## Phase 4 — make the GO alerts fire (see NOTIFICATIONS_BACKEND.md)

This is the part that needs the backend. The short version:
1. When a user enables alerts, the app registers a **push token** with Expo and saves it + their
   alert prefs (threshold, quiet hours) to Supabase.
2. A **scheduled job** runs each evening, scores tonight (and the week, for Premium) for every user's
   location, and where it crosses their threshold, sends a push via Expo.

The dedicated doc spells this out step by step.

> ✅ End of Phase 4: you set your threshold, and that evening your phone buzzes "Tonight is a GO."

---

## Phase 5 — publish (1–2 weeks, mostly waiting on review)

1. **Apple Developer** ($99/yr) and **Google Play** ($25 once) accounts.
2. `eas build` (Expo's build service) turns your code into real app files.
3. Submit to **TestFlight** (Apple) / internal testing (Google) — try it on real devices first.
4. Fill in store listing: name, icon, screenshots (you can use the prototype screens), description,
   privacy policy (required — especially because you use location + notifications).
5. Submit for review. Apple usually takes 1–3 days.

> ✅ End of Phase 5: StarCast is live and installable by anyone.

---

## How to work with Claude Code (the meta-skill)

- **Small asks beat big asks.** "Build the whole app" fails. "Build the Home screen's verdict ring"
  works. One screen / one feature per request.
- **Always point it at the README.** When recreating a screen, say "match the spec in
  `design_handoff_starcast/README.md`."
- **Commit to GitHub often.** After anything works, save it. It's your undo button.
- **When something breaks, paste the error back to Claude Code** — it's good at fixing its own output.
- **Test on your real phone early** (Expo Go) — simulators hide things, especially around
  notifications and location.

---

## Rough cost + time, honestly
- **To build & test:** ~free (just your time). Budget several weekends, not several days.
- **To publish:** $99/yr Apple + $25 once Google. Backend/data on free tiers to start.
- **The hardest parts:** notifications (Phase 4) and your first store submission (Phase 5). Everything
  before that is steady, satisfying progress.

You already did the hardest *design* thinking — the prototype is a complete, precise spec. From here
it's assembly. Take it one phase at a time.
