/* StarCast — FREEMIUM layer
   - TrialBanner: countdown strip on the premium/trial home
   - PaywallScreen: 3-plan upgrade (annual / monthly / lifetime)
   - LockScreen: iOS lock-screen push preview (GO tonight / GO window coming)
   - FreeHome: locked-down free tier (one location, tonight GO-or-not)
   All reuse the shared verdict palette (V), FORECAST data, and base components. */

const { useState: useStateP } = React;

/* ---- tiny token-simple icons (rects + circles only) ---- */
function IcWeek() {
  return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="9" width="3" height="6" rx="1" fill="currentColor"/><rect x="7.5" y="5" width="3" height="10" rx="1" fill="currentColor"/><rect x="13" y="7" width="3" height="8" rx="1" fill="currentColor"/></svg>);
}
function IcTarget() {
  return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.6"/><circle cx="9" cy="9" r="2.4" fill="currentColor"/></svg>);
}
function IcAlert() {
  return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" fill="currentColor"/><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" opacity="0.55"/></svg>);
}

/* ============================ TRIAL BANNER ============================ */
function TrialBanner({ days, onUpgrade }) {
  const left = Math.max(0, days);
  return (
    <div className="tb">
      <span className="tb-dot" />
      <span className="tb-text"><b>Premium trial</b> · {left === 0 ? "ends today" : left + (left === 1 ? " day left" : " days left")} — full forecast & GO alerts</span>
      <button className="tb-cta" onClick={onUpgrade}>Upgrade</button>
    </div>);
}

/* ============================ PAYWALL ============================ */
const PLANS = [
  { id: "annual",   name: "Annual",   amt: "$12.99", per: "/year",  note: "7-day free trial, then billed yearly", badge: "Best value", save: "Save 46%" },
  { id: "monthly",  name: "Monthly",  amt: "$1.99",  per: "/month", note: "7-day free trial, then monthly" },
  { id: "lifetime", name: "Lifetime", amt: "$29.99", per: "once",   note: "Pay once — yours forever, no subscription" },
];
const PW_FEATURES = [
  "Unlimited saved spots",
  "Full 7-night forecast",
  "GO alerts + lookahead",
  "Prime targets & timing",
  "Hour-by-hour clarity",
  "Gear-tuned scoring",
];

function PaywallScreen({ onBack, onPurchase, motion, trialDays, isTrial }) {
  const [plan, setPlan] = useStateP("annual");
  const [done, setDone] = useStateP(false);
  const intro = useIntro(560, motion !== false);
  const sel = PLANS.find(p => p.id === plan);
  const isSub = plan !== "lifetime";
  const ctaLabel = isSub ? (isTrial ? "Continue with " + sel.name : "Start 7-day free trial") : "Unlock forever — $29.99";
  const ctaNote = plan === "annual" ? "Free for 7 days, then $12.99/year. Cancel anytime."
    : plan === "monthly" ? "Free for 7 days, then $1.99/month. Cancel anytime."
    : "One payment of $29.99. No subscription, ever.";

  const buy = () => { setDone(true); setTimeout(() => onPurchase && onPurchase(plan), 1500); };

  if (done) {
    return (
      <div className={"sc-page sky-deep" + (intro ? " push-enter" : "")}>
        <div className="pw-success">
          <div className="pw-success-mark">✓</div>
          <div className="pw-success-title">You're all set</div>
          <p className="pw-success-body">StarCast Premium is unlocked. Every spot, the full week, and GO alerts the moment your sky clears.</p>
          <button className="pw-cta" style={{ maxWidth: 240 }} onClick={() => onPurchase && onPurchase(plan)}>Start exploring</button>
        </div>
      </div>);
  }

  return (
    <div className={"sc-page sky-deep" + (intro ? " push-enter" : "")}>
      <Nav left={{ chev: false, label: "Not now" }} title="" onLeft={onBack} />
      <div className="sc-scroll">
        <div className="pw-hero">
          <div className="pw-mark"><ForecastMark size={76} idp="pw-mark" /></div>
          <span className="pw-kicker">StarCast Premium</span>
          <h1 className="pw-title">Never miss a clear night</h1>
          <p className="pw-sub">Plan ahead, chase every GO window, and get a nudge the moment the sky opens up.</p>
        </div>

        <div className="pw-features">
          {PW_FEATURES.map((f, i) => (
            <div className="pw-feat" key={i}><span className="pw-feat-ic">✓</span>{f}</div>
          ))}
        </div>

        <div className="pw-plans">
          {PLANS.map(p => (
            <button key={p.id} className={"pw-plan" + (plan === p.id ? " on" : "")} onClick={() => setPlan(p.id)}>
              <span className="pw-radio">{plan === p.id ? "✓" : ""}</span>
              <span className="pw-plan-main">
                <span className="pw-plan-name">{p.name}{p.badge && <span className="pw-badge">{p.badge}</span>}</span>
                <span className="pw-plan-note">{p.note}{p.save && <span className="pw-save"> · {p.save}</span>}</span>
              </span>
              <span className="pw-plan-price">
                <span className="pw-plan-amt">{p.amt}</span><br /><span className="pw-plan-per">{p.per}</span>
              </span>
            </button>
          ))}
        </div>

        <button className="pw-cta" onClick={buy}>{ctaLabel}</button>
        <p className="pw-cta-note">{ctaNote}</p>
        <button className="pw-restore" onClick={() => onPurchase && onPurchase("restore")}>Restore purchase</button>
        <p className="pw-legal">Payment is charged to your App Store account. Subscriptions auto-renew unless cancelled at least 24h before the period ends. Terms · Privacy Policy</p>
      </div>
    </div>);
}

/* ============================ LOCK-SCREEN PUSH PREVIEW ============================ */
const LS_NOTES = {
  tonight: {
    clock: "9:02", date: "Wednesday, June 11",
    title: (<>Tonight is a <span className="go">GO</span> over Cherry Springs</>),
    text: "Clear window 11:10pm – 4:20am · Bortle 2 skies. Grab your gear.",
    time: "now",
  },
  window: {
    clock: "8:47", date: "Wednesday, June 11",
    title: (<>A <span className="go">GO</span> window is coming</>),
    text: "Thursday looks excellent — score 88, clear and moonless. Plan your night out.",
    time: "now",
  },
};

function LockScreen({ V, variant, onClose }) {
  const note = LS_NOTES[variant] || LS_NOTES.tonight;
  const wall = skyBg(V, "excellent", 30, 1);
  return (
    <div className="ls" onClick={onClose}>
      <div className="ls-wall" style={{ background: wall }} />
      <StarField intensity={1} count={44} seed={variant === "window" ? 21 : 7} />
      <div className="ls-scrim" />
      <div className="ls-top">
        <div className="ls-lock">⏾</div>
        <div className="ls-date">{note.date}</div>
        <div className="ls-clock">{note.clock}</div>
      </div>
      <div className="ls-notes">
        <div className="ls-note">
          <div className="ls-note-icon"><ForecastMark size={22} idp="ls-ic" /></div>
          <div className="ls-note-body">
            <div className="ls-note-head">
              <span className="ls-note-app">StarCast</span>
              <span className="ls-note-time">{note.time}</span>
            </div>
            <div className="ls-note-title">{note.title}</div>
            <div className="ls-note-text">{note.text}</div>
          </div>
        </div>
      </div>
      <div className="ls-hint">Tap to open StarCast</div>
    </div>);
}

/* ============================ FREE-TIER HOME ============================ */
function FreeHome({ V, nav, onUpgrade, animate, glowMul, starMul }) {
  const loc = FORECAST[0];
  const d = loc.days[0];
  const v = V[d.verdict];
  const star = Math.max(0, v.stars * starMul);
  const intro = useIntro(950, animate);
  const week = loc.days.map(x => x.score);

  return (
    <div className={"sc-screen m" + (intro ? " m-anim" : "")} style={{ background: skyBg(V, d.verdict, 26, glowMul) }}>
      <StarField intensity={star} count={Math.round(46 * Math.min(1.6, starMul))} seed={3} />
      <button onClick={() => nav.settings()} aria-label="Settings" className="m-iconbtn" style={{ right: 16 }}>⚙</button>
      <div className="m-brand">
        <ForecastMark size={26} idp="free-brand" />
        <span className="m-brand-word">Star<span>Cast</span></span>
      </div>

      <div className="m-top">
        <div className="fh-loc">
          <span className="fh-loc-name">{loc.name} <span className="fh-lock-glyph">⌾</span></span>
          <span className="fh-loc-region">Bortle {loc.bortle} · {loc.region}</span>
          <button className="fh-loc-add" onClick={onUpgrade}>+ Add more spots with Premium</button>
        </div>
      </div>

      <NightArcH V={V} loc={loc} d={d} v={v} bind={{}} dx={0} animKey={"free"} animate={intro} freeMode />

      <div className="fh-locks">
        <button className="lock-card" onClick={onUpgrade}>
          <span className="lock-card-ic"><IcWeek /></span>
          <span className="lock-card-main">
            <span className="lock-card-title">The week ahead <span className="lock-pill">Premium</span></span>
            <span className="lock-card-sub">See clear nights up to 7 days out</span>
          </span>
          <span className="lock-week">{week.map((s, i) => <span key={i} style={{ height: 6 + s * 0.24 }} />)}</span>
        </button>

        <button className="lock-card" onClick={onUpgrade}>
          <span className="lock-card-ic"><IcTarget /></span>
          <span className="lock-card-main">
            <span className="lock-card-title">Targets & timing <span className="lock-pill">Premium</span></span>
            <span className="lock-card-sub">Prime target, best window & hour-by-hour</span>
          </span>
          <span className="lock-card-chev2">›</span>
        </button>

        <div className="lock-card accent">
          <span className="lock-card-ic"><IcAlert /></span>
          <span className="lock-card-main">
            <span className="lock-card-title">Never miss a GO</span>
            <span className="lock-card-sub">Get a push the moment tonight turns clear</span>
          </span>
          <button className="lock-card-cta" onClick={onUpgrade}>Turn on</button>
        </div>
      </div>
    </div>);
}

Object.assign(window, { TrialBanner, PaywallScreen, LockScreen, FreeHome, PLANS });
