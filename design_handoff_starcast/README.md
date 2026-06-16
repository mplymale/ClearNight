# StarCast — Developer Handoff

> Everything you (or Claude Code) need to turn the StarCast prototype into a real, shippable app.
> **New to development? Start with `GETTING_STARTED.md` — it's written for a first-timer.**

---

## What StarCast is

A stargazing-forecast app. It scores every upcoming night for how good the sky will be for
observing, and gives a one-glance verdict — **GO / COND / NO-GO** — for a saved location.
Premium users get the full week ahead, multiple locations, prime-target detail, and push
**GO alerts** that fire when the sky clears.

The core idea: **the gradient IS the data.** A dark, starry screen means a great night; a pale,
hazy screen means a poor one. The look of each screen is driven by the night's score.

---

## About the files in this bundle

The HTML/JSX/CSS files here are a **high-fidelity design reference** — a working prototype that
shows the intended look, motion, and behavior. **They are not the production app and should not be
shipped as-is.** They run React through an in-browser compiler (Babel) with mock data; there is no
build step, no real backend, no app-store packaging.

**Your job is to *recreate* these designs in a real codebase**, using a proper framework and its
established patterns — not to copy the HTML directly. See `GETTING_STARTED.md` for the
recommended stack (Expo / React Native, because push notifications require a native app).

**Fidelity: High.** Colors, typography, spacing, copy, and interactions in the prototype are final
design intent. Match them closely. Where this README gives an exact hex or pixel value, treat it as
the source of truth.

---

## The design system (tokens)

### Fonts
| Role | Family | Used for |
|---|---|---|
| Display | **Space Grotesk** | Numbers, labels, UI headings, buttons |
| Body / UI | **Hanken Grotesk** | Body copy, metadata |
| Logo | **Sora** | The "StarCast" wordmark and big titles |

### Core colors
| Token | Hex | Use |
|---|---|---|
| App background | `#0a0b0e` (+ radial `#16191f` glow at top) | Stage behind the phone |
| Text primary | `#e7eaef` | Default text |
| Accent (mint) | `#7ef0d2` | GO accent, primary buttons, active states |
| Accent soft | `rgba(126,240,210,0.16)` | Accent fills, selected cards |
| Hairline | `rgba(255,255,255,0.10–0.12)` | Borders, dividers |

### The verdict palette — the heart of the app
Each night is scored 0–100, mapped to one of four verdicts. **The verdict drives the screen's
entire color: the sky gradient, the star brightness, and the accent.**

| Score | Verdict key | Label | Word | Accent | Star brightness | Sky gradient (zenith → horizon) |
|---|---|---|---|---|---|---|
| **≥ 78** | `excellent` | **GO** | Pristine | `#7ef0d2` mint | 1.0 | `#04060e → #06121f → #0a2230` |
| **62–77** | `good` | **GO** | Great | `#8fd0ff` sky blue | 0.85 | `#05060f → #0a1226 → #122039` |
| **42–61** | `fair` | **COND** | Workable | `#ffce8f` amber | 0.45 | `#140f1f → #2a1d33 → #412a37` |
| **< 42** | `poor` | **NO-GO** | Washed out | `#c4ccd6` grey | 0.12 | `#283039 → #39434f → #4d5864` |

> Implementation note: in the prototype this lives in `VERDICTS` and `verdictFromScore()` in
> `starcast-system.jsx`. Port it verbatim — it's the data model AND the visual model.

### Spacing, radius, motion
- **Radius:** cards ~18px, pills ~10–11px, phone screen 42px. (Prototype multiplies these by a
  `--sc-radius` tweak; ship with multiplier = 1.)
- **Motion:** spring ease `cubic-bezier(.22, 1, .36, 1)`. Standard durations 170 / 320 / 520 / 720ms.
  Entrance transitions only — no infinite decorative loops.
- **Touch targets:** minimum 44px.

---

## Screens / views

> Reference renderings: open `StarCast Interactive.html` and use the **Tweaks** panel
> (Membership → Tier / Lock-screen push) to see every state below.

### 1. Onboarding — "Where do you watch from?"
- **Purpose:** first-run location capture.
- **Layout:** centered column. Title (Sora 30px), body copy, a primary "Use my current location"
  button, an "or" divider, a search field, then a list of nearby dark-sky sites.
- **Key component:** primary button `#7ef0d2` fill, dark text `#04130f`, with the **navigation-arrow
  icon** (filled SVG, points upper-right). Same icon used in the Add-a-Spot GPS row.

### 2. Home (Premium / Trial)
- **Purpose:** the daily glance — "is tonight a GO?"
- **Layout (top→bottom):** brand wordmark + settings gear · location name · **the night arc** (big
  central verdict ring showing label, word, best-window time) · a horizontal **day strip** of the
  week · (trial only) a **trial countdown banner**.
- **Night arc:** the centerpiece. Shows verdict label (GO/COND/NO-GO) in the verdict accent, the
  descriptive word, and the best clear-sky window time.
- **Trial banner:** accent-soft pill, pulsing dot, "Premium trial · N days left", "Upgrade" button.

### 3. Home (Free tier)
- **Purpose:** the locked-down free experience — one location, tonight only.
- **Layout:** same brand + arc, but location name carries a small lock glyph and an
  "+ Add more spots with Premium" link. Below the arc, **three locked cards**:
  1. *The week ahead* (Premium pill, blurred mini week-bar preview)
  2. *Targets & timing* (Premium pill)
  3. *Never miss a GO* (accent card, "Turn on" → paywall)
- **Behavior:** every locked element opens the **Paywall**.

### 4. Paywall / Upgrade
- **Purpose:** convert to Premium.
- **Layout:** conic-gradient app mark · kicker "StarCast Premium" · title "Never miss a clear night"
  · 2-column feature grid (6 checks) · **three plan rows** · CTA · legal.
- **Plans (exact):**
  | Plan | Price | Note | Badge |
  |---|---|---|---|
  | Annual | **$12.99/year** | 7-day free trial, then yearly | "Best value" + "Save 46%" |
  | Monthly | **$1.99/month** | 7-day free trial, then monthly | — |
  | Lifetime | **$29.99 once** | Pay once, no subscription | — |
- **CTA copy** changes by plan: subs → "Start 7-day free trial"; lifetime → "Unlock forever — $29.99".
- **States:** plan selection (radio), purchase-success screen (check mark + "You're all set").
- Includes **Restore purchase** and App Store legal line.

### 5. Settings
- **Purpose:** membership status + alert preferences.
- **Membership block:** Premium users see a status card with check; Free/Trial users see an
  **Upgrade** card → Paywall.
- **Alerts block (Premium-gated):**
  - Threshold slider — "Alert me when tonight scores [N]+"
  - "Push notifications" toggle — "A nudge by 6pm on good nights"
  - "Quiet hours" row → sub-screen (e.g. 11pm–7am)
  - **Free users** see a single locked "GO alerts · Premium" card with an "Unlock" button instead.

### 6. Notifications (native push) — two types
Mocked as iOS lock-screen banners. Reference: Tweaks → Lock-screen push → `tonight` / `window`.
- **Tonight is a GO** — fires in the evening when tonight's score crosses the user's threshold.
  *"Tonight is a GO over Cherry Springs — clear window 11:10pm–4:20am · Bortle 2 skies."*
- **A GO window is coming** (Premium lookahead) — scans the next few days.
  *"A GO window is coming — Thursday looks excellent, score 88, clear and moonless."*

> Push notifications are the one feature that **requires a native app + a backend**. See
> `NOTIFICATIONS_BACKEND.md` for exactly what to build.

### Other screens in the prototype
Night Detail (per-night factor breakdown — cloud / moon / seeing / light pollution with plain-English
blurbs), Tonight's Plan, Set Alert, Gear, Quiet Hours, Locations list, About.

---

## Freemium model (the gating rules)

| Capability | Free | Trial (7 days) | Premium |
|---|---|---|---|
| Locations | 1 | unlimited | unlimited |
| Forecast | tonight only | full 7 nights | full 7 nights |
| GO alert (tonight) | ❌ | ✅ | ✅ |
| GO window lookahead | ❌ | ✅ | ✅ |
| Targets / timing / hourly | ❌ | ✅ | ✅ |
| Gear-tuned scoring, quiet hours | ❌ | ✅ | ✅ |

- **Trial = full Premium for 7 days**, then automatically **drops to Free** (not a hard lock).
- **All push notifications are Premium-only.** Free users can see *tonight's* verdict in-app but get
  no pushes.
- In the prototype, tier is a single state value (`free` / `trial` / `premium`) — in production it's
  derived from the user's subscription/receipt status.

---

## State the app needs to manage
- **`tier`** — `free | trial | premium`, derived from subscription receipt + trial start date.
- **`trialDaysLeft`** — computed from trial start.
- **Saved locations** — list; free tier capped at 1.
- **Selected day** — which night in the week strip is focused.
- **Alert prefs** — threshold (0–100), push on/off, quiet-hours range.
- **Forecast data** — per location, per night: score, cloud %, moon %, seeing (1–5), Bortle,
  best window, hourly clarity (9 readings 9pm→5am), prime targets. (See the mock shape in
  `starcast-data.jsx`.)

---

## Where the forecast data comes from (real version)
The prototype uses hand-authored mock nights. In production you'll compute `score` from real inputs:
- **Cloud cover** + **transparency** → a weather API (e.g. Open-Meteo, OpenWeather, 7Timer! Astro).
- **Moon illumination / phase** → computed locally (e.g. SunCalc) — no API needed.
- **Seeing** → astronomy weather feed (7Timer! provides a seeing index).
- **Light pollution (Bortle)** → a light-pollution dataset by lat/lng, captured once when the user
  saves a location.
- **Best window** → the contiguous hours where cloud is low AND the sun is down AND (ideally) the
  moon is below the horizon.

Keep the exact scoring weights in one module so the app and the notification backend score nights
**identically**.

---

## Files in this bundle
| File | What it is |
|---|---|
| `StarCast Interactive.html` | The clickable prototype entry point — open this first |
| `starcast-system.jsx` | **Verdict system, tokens, sky gradients, shared components** — the most important reference |
| `starcast-data.jsx` | Mock forecast data + the per-night data shape |
| `sc-app.jsx` | App root: navigation stack, tier/trial state, Tweaks |
| `sc-home.jsx` | Premium home + the night-arc centerpiece |
| `sc-screens.jsx` / `sc-screens2.jsx` | Add-spot, settings, detail, plan, alert, etc. |
| `sc-premium.jsx` / `sc-premium.css` | **Paywall, free home, lock-screen pushes, trial banner** |
| `sc-app.css` | All app styling + the live token definitions |
| `GETTING_STARTED.md` | Beginner roadmap: environment → build → publish |
| `NOTIFICATIONS_BACKEND.md` | How to make GO alerts actually fire |

Read `starcast-system.jsx` and `sc-app.css` first — together they define the whole visual language.
