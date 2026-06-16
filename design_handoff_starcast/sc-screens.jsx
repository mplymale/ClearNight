/* StarCast — interactive destination screens (pushed over Home). */

const { useState: useStateS } = React;

function Nav({ left, title, right, onLeft, onRight }) {
  return (
    <div className="sc-nav">
      <button className="sc-nav-btn" onClick={onLeft}>{left && left.chev ? <span className="chev">‹</span> : null}{left ? left.label : null}</button>
      <span className="sc-nav-title">{title}</span>
      {right ? <button className="sc-nav-ico right" onClick={onRight}>{right}</button> : <span style={{ minWidth: 56 }} />}
    </div>);
}

/* ---------------- TARGET DETAIL ---------------- */
function SkyPosition({ target, v }) {
  const accent = (v && v.accent) || "#7ef0d2";
  const peakDeg = parseInt(target.peak, 10) || 28;
  const H = 150, top = 22, span = H - top;            // 0° at horizon (y=150), 90° at y=22
  const altY = (deg) => H - (Math.max(0, Math.min(90, deg)) / 90) * span;
  const peakY = altY(peakDeg);
  // smooth symmetric arc: rises from SE horizon, crests at transit (center), sets toward SW
  const curve = `M28 ${H} C 92 ${H}, 122 ${peakY}, 150 ${peakY} C 178 ${peakY}, 208 ${H}, 272 ${H}`;
  const area = `${curve} L272 ${H} L28 ${H} Z`;
  const ends = (target.dir || "SE → S").split("→").map((s) => s.trim());
  const cE = ends[0] || "SE", cT = ends[1] || "S";
  const cW = cT === "S" ? "SW" : cT === "SE" ? "S" : "W";
  return (
    <svg viewBox="0 0 300 180" className="tg-sky" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="skyArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.20" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <text x="22" y="18" fontSize="8.5" letterSpacing="0.12em" fontWeight="600" fill="rgba(255,255,255,0.4)" fontFamily="ui-monospace, Menlo, monospace">ALTITUDE TONIGHT</text>
      {[30, 60].map((g) => {const y = altY(g);return (
        <g key={g}>
          <line x1="28" x2="272" y1={y} y2={y} stroke="rgba(255,255,255,0.10)" strokeWidth="1" strokeDasharray="2 5" />
          <text x="24" y={y + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.32)" fontFamily="ui-monospace, Menlo, monospace">{g}°</text>
        </g>);})}
      <line x1="24" x2="276" y1={H} y2={H} stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      <path d={area} fill="url(#skyArea)" />
      <path d={curve} fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="150" cy={peakY} r="9" fill={accent} opacity="0.18" />
      <circle cx="150" cy={peakY} r="4" fill={accent} />
      <text x="150" y={peakY - 13} textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff" fontFamily="var(--disp), sans-serif">{target.peak || peakDeg + "°"}</text>
      <g fontFamily="ui-monospace, Menlo, monospace" fontSize="8.5" fill="rgba(255,255,255,0.46)" textAnchor="middle">
        <text x="28" y="167">{cE}</text>
        <text x="150" y="167">{cT}</text>
        <text x="272" y="167">{cW}</text>
      </g>
    </svg>);
}

function TargetDetail({ V, vKey, target, onBack, motion, inPlan, onTogglePlan, onSetAlert, hasAlert }) {
  const v = V[vKey] || V.excellent;
  const [fav, setFav] = useStateS(false);
  const intro = useIntro(560, motion !== false);
  const planned = inPlan ? inPlan(target) : false;
  const alerted = hasAlert ? hasAlert(target) : false;
  const alt = [30, 48, 66, 82, 92, 78, 54, 32];
  return (
    <div className={"sc-page sky-deep" + (intro ? " push-enter" : "")}>
      <Nav left={{ chev: true, label: "Tonight" }} title="" right={fav ? "★" : "☆"} onLeft={onBack} onRight={() => setFav((f) => !f)} />
      <div className={"sc-scroll sc-stagger" + (intro ? " intro" : "")}>
        <div className="tg-hero">
          <span className="tg-eyebrow">{target.kind === "obj" ? "VISIBLE TONIGHT" : "PRIME TARGET · " + v.label}</span>
          <div className="tg-name">{target.name}</div>
          <span className="tg-sub">{target.sub || target.type + " · " + target.con}</span>
        </div>
        <div className="tg-img"><SkyPosition target={target} v={v} /></div>
        <div className="tg-window">
          <span className="k">Best window tonight</span>
          <div className="v">{target.visible || "11:10pm – 4:20am"}</div>
          <div className="alt">{alt.map((h, i) => <span key={i} style={{ height: h + "%" }} />)}</div>
        </div>
        <div className="tg-grid">
          <div className="tg-cell"><span className="k">Peak altitude</span><div className="v">{target.peak || "28°"}<small> at 1:50am</small></div></div>
          <div className="tg-cell"><span className="k">Transit</span><div className="v">1:50<small>am S</small></div></div>
          <div className="tg-cell"><span className="k">Magnitude</span><div className="v">{target.mag != null ? target.mag : "—"}</div></div>
          <div className="tg-cell"><span className="k">Apparent size</span><div className="v">{target.size || "—"}</div></div>
          <div className="tg-cell span2">
            <div><span className="k">Direction</span><div className="v">{target.dir || "SE → S"}</div></div>
            <CompassH deg={target.dirDeg || 158} accent={v.accent} />
          </div>
        </div>
        <div className="tg-cta">
          <button className={"btn btn-ghost" + (planned ? " on" : "")} onClick={() => onTogglePlan && onTogglePlan(target)}>{planned ? "✓ In your plan" : "Add to plan"}</button>
          <button className={"btn btn-primary" + (alerted ? " btn-set" : "")} onClick={() => onSetAlert && onSetAlert(target)}>{alerted ? "✓ Alert on" : "Set alert"}</button>
        </div>
      </div>
    </div>);
}

/* ---------------- VISIBLE TONIGHT ---------------- */
const FILTERS = ["All", "Nebulae", "Galaxies", "Clusters"];
function matchFilter(o, f) {
  if (f === "All") return true;
  if (f === "Nebulae") return /nebula/i.test(o.type);
  if (f === "Galaxies") return /galaxy/i.test(o.type);
  if (f === "Clusters") return /cluster/i.test(o.type);
  return true;
}
function VisibleTonight({ loc, onBack, onTarget, motion }) {
  const [f, setF] = useStateS("All");
  const intro = useIntro(560, motion !== false);
  const rows = loc.objects.filter((o) => matchFilter(o, f));
  return (
    <div className={"sc-page sky-deep" + (intro ? " push-enter" : "")}>
      <Nav left={{ chev: true, label: "Home" }} title="Visible Tonight" right="⇅" onLeft={onBack} />
      <div className="sc-scroll">
        <div className="sc-filter">
          {FILTERS.map((x) => <button key={x} className={x === f ? "on" : ""} onClick={() => setF(x)}>{x === "All" ? "All " + loc.objects.length : x}</button>)}
        </div>
        <div className={"m-skylist sc-stagger" + (intro ? " intro" : "")} style={{ marginTop: 0 }}>
          {rows.map((o, i) =>
          <button className="m-skyrow" key={i} onClick={() => onTarget(o, "obj")}>
              <div className="m-skyrow-main">
                <span className="m-skyrow-name">{o.name}</span>
                <span className="m-skyrow-id">{o.cat} · {o.con}</span>
                <span className="m-skyrow-stats">{o.type} · Mag {o.mag} · {o.size}</span>
              </div>
              <div className="m-skyrow-right">
                <span className="m-skyrow-q" style={{ color: QCOLOR[o.quality] }}>{o.quality}</span>
                <span className="m-skyrow-chev">›</span>
              </div>
            </button>)}
          {rows.length === 0 && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, padding: "20px 4px" }}>Nothing in this category up tonight.</div>}
        </div>
      </div>
    </div>);
}

/* ---------------- LOCATIONS ---------------- */
function LocationsScreen({ V, onBack, onAdd, onSelect, motion }) {
  const intro = useIntro(560, motion !== false);
  return (
    <div className={"sc-page sky-deep" + (intro ? " push-enter" : "")}>
      <Nav left={{ chev: true, label: "Home" }} title="My Spots" right="+" onLeft={onBack} onRight={onAdd} />
      <div className="sc-scroll">
        <div className={"sc-list sc-stagger" + (intro ? " intro" : "")}>
          {FORECAST.map((loc, i) => {
            const sc = loc.days[0].score;
            const vk = verdictFromScore(sc);
            const v = V[vk];
            return (
              <button className="loc-card" key={i} onClick={() => onSelect(i)}>
                <div className="glow" style={{ background: `radial-gradient(80% 120% at 100% 0%, ${v.accentSoft}, rgba(0,0,0,0) 60%)` }} />
                <div className="loc-score" style={{ borderColor: v.accent, color: v.accent, background: v.accentSoft }}>{sc}</div>
                <div className="loc-card-main">
                  <div className="loc-card-name">{loc.name}</div>
                  <div className="loc-card-meta">Bortle {loc.bortle} · {loc.region}</div>
                  <div className="loc-card-verdict" style={{ color: v.accent }}>{v.label} · {v.word}</div>
                </div>
                <span className="loc-card-chev">›</span>
              </button>);
          })}
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 18, width: "100%" }} onClick={onAdd}>+ Add a spot</button>
      </div>
    </div>);
}

/* ---------------- ADD SPOT ---------------- */
const NEARBY = [
{ name: "Big Bend NP", meta: "Texas · 320 mi", b: "B1" },
{ name: "Death Valley", meta: "California · 410 mi", b: "B2" },
{ name: "Mauna Kea", meta: "Hawaii · 2,890 mi", b: "B2" },
{ name: "Joshua Tree NP", meta: "California · 380 mi", b: "B3" }];

function LocArrow({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: "block" }}>
      <path d="M21.4 2.6 L1.7 11.5 a0.7 0.7 0 0 0 0.1 1.3 L10.8 13.2 L12.6 22.2 a0.7 0.7 0 0 0 1.3 0.1 Z" />
    </svg>);
}

function AddSpot({ onBack, motion }) {  const intro = useIntro(560, motion !== false);
  return (
    <div className={"sc-page sky-deep" + (intro ? " push-enter" : "")}>
      <Nav left={{ chev: false, label: "Cancel" }} title="Add a Spot" onLeft={onBack} />
      <div className="sc-scroll">
        <div className="sc-search">
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.6" /><path d="M11.5 11.5 L15 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          Search a place or park…
        </div>
        <button className="result-row" onClick={onBack}>
          <span className="result-pin"><LocArrow size={15} /></span>
          <div className="result-main"><div className="result-name">Use my current location</div><div className="result-meta">GPS · most accurate</div></div>
          <span className="result-bortle" style={{ color: "var(--acc)", fontSize: 20 }}>›</span>
        </button>
        <span className="m-sec-l" style={{ display: "block", margin: "16px 0 0" }}>Dark-sky places nearby</span>
        <div className="result-list">
          {NEARBY.map((r, i) =>
          <button className="result-row" key={i} onClick={onBack}>
              <span className="result-pin">◐</span>
              <div className="result-main"><div className="result-name">{r.name}</div><div className="result-meta">{r.meta}</div></div>
              <span className="result-bortle">{r.b}</span>
            </button>)}
        </div>
      </div>
    </div>);
}

/* ---------------- SETTINGS ---------------- */
function SettingsScreen({ onBack, motion, nav, tier, onUpgrade, nightVision, onNightVision }) {
  const isPremium = tier === "premium";
  const unlocked = tier !== "free";          // trial or premium
  const [thresh, setThresh] = useStateS(78);
  const [push, setPush] = useStateS(true);
  const [milky, setMilky] = useStateS(true);
  const [unit, setUnit] = useStateS("F");
  const [clock, setClock] = useStateS("12h");
  const intro = useIntro(560, motion !== false);
  const verdictWord = thresh >= 78 ? "GO" : thresh >= 62 ? "GO" : thresh >= 42 ? "COND" : "Any";
  const onTrack = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setThresh(Math.round(p * 100));
  };
  return (
    <div className={"sc-page sky-deep" + (intro ? " push-enter" : "")}>
      <Nav left={{ chev: true, label: "Home" }} title="Settings" onLeft={onBack} />
      <div className={"sc-scroll sc-stagger" + (intro ? " intro" : "")}>
        <div className="set-group">
          <span className="m-sec-l">Membership</span>
          {isPremium ? (
            <div className="set-prem">
              <div className="set-prem-ic"><ForecastMark size={24} ink idp="set-prem" /></div>
              <div className="set-prem-main">
                <div className="set-prem-title">StarCast Premium</div>
                <div className="set-prem-sub">All features unlocked · thank you</div>
              </div>
              <span className="set-prem-check">✓</span>
            </div>
          ) : (
            <button className="set-upgrade" onClick={onUpgrade}>
              <div className="set-upgrade-ic"><ForecastMark size={24} ink idp="set-up" /></div>
              <div className="set-upgrade-main">
                <div className="set-upgrade-title">StarCast Premium</div>
                <div className="set-upgrade-sub">{tier === "trial" ? "Trial active — keep alerts & the full week" : "Unlock alerts, targets & the 7-night forecast"}</div>
              </div>
              <span className="set-upgrade-cta">Upgrade</span>
            </button>
          )}
        </div>
        <div className="set-group">
          <span className="m-sec-l">Alerts</span>
          {unlocked ? (
          <div className="set-card">
            <div className="thresh">
              <div className="set-row-name">Alert me when tonight scores</div>
              <div className="thresh-track" onClick={onTrack}>
                <div className="thresh-fill" style={{ width: thresh + "%" }} />
                <div className="thresh-knob" style={{ left: thresh + "%" }} />
              </div>
              <div className="thresh-scale"><span>0</span><span style={{ color: "var(--acc)" }}>{verdictWord} · {thresh}+</span><span>100</span></div>
            </div>
            <div className="set-row">
              <div className="set-row-main"><div className="set-row-name">Push notifications</div><div className="set-row-sub">A nudge by 6pm on good nights</div></div>
              <button className={"sc-toggle" + (push ? " on" : "")} onClick={() => setPush((p) => !p)}><div className="knob" /></button>
            </div>
            <button className="set-row" onClick={() => nav && nav.quietHours()}><div className="set-row-main"><div className="set-row-name">Quiet hours</div></div><span className="set-row-val">11pm – 7am <span className="loc-card-chev" style={{ marginLeft: 4 }}>›</span></span></button>
          </div>
          ) : (
          <div className="set-card">
            <div className="set-locked">
              <div className="set-locked-main">
                <div className="set-locked-name">GO alerts <span className="lock-pill">Premium</span></div>
                <div className="set-locked-sub">Get pushed when tonight — or a night this week — turns into a GO.</div>
              </div>
              <button className="set-locked-cta" onClick={onUpgrade}>Unlock</button>
            </div>
          </div>
          )}
        </div>
        <div className="set-group">
          <span className="m-sec-l">Display</span>
          <div className="set-card">
            <div className="set-row"><div className="set-row-main"><div className="set-row-name">Night vision</div><div className="set-row-sub">Red mode preserves dark adaptation</div></div>
              <button className={"sc-toggle" + (nightVision ? " on" : "")} onClick={() => onNightVision && onNightVision(!nightVision)}><div className="knob" /></button></div>
            <div className="set-row"><div className="set-row-main"><div className="set-row-name">Temperature</div></div>
              <div className="sc-seg"><button className={unit === "F" ? "on" : ""} onClick={() => setUnit("F")}>°F</button><button className={unit === "C" ? "on" : ""} onClick={() => setUnit("C")}>°C</button></div></div>
            <div className="set-row"><div className="set-row-main"><div className="set-row-name">Time format</div></div>
              <div className="sc-seg"><button className={clock === "12h" ? "on" : ""} onClick={() => setClock("12h")}>12h</button><button className={clock === "24h" ? "on" : ""} onClick={() => setClock("24h")}>24h</button></div></div>
            <div className="set-row"><div className="set-row-main"><div className="set-row-name">Show Milky Way band</div><div className="set-row-sub">Overlay on the sky view</div></div>
              <button className={"sc-toggle" + (milky ? " on" : "")} onClick={() => setMilky((m) => !m)}><div className="knob" /></button></div>
          </div>
        </div>
        <div className="set-group">
          <span className="m-sec-l">Account</span>
          <div className="set-card">
            <button className="set-row" onClick={() => nav && nav.gear()}><div className="set-row-main"><div className="set-row-name">Gear</div><div className="set-row-sub">8" Dobsonian · DSLR</div></div><span className="loc-card-chev">›</span></button>
            <button className="set-row" onClick={() => nav && nav.about()}><div className="set-row-main"><div className="set-row-name">About StarCast</div><div className="set-row-sub">Version 1.0</div></div><span className="loc-card-chev">›</span></button>
          </div>
        </div>
      </div>
    </div>);
}

/* ---------------- ONBOARDING ---------------- */
function Onboarding({ onDone }) {
  const [step, setStep] = useStateS(0);
  const [obIntro, setObIntro] = useStateS(true);
  React.useEffect(() => {setObIntro(true);const id = setTimeout(() => setObIntro(false), 600);return () => clearTimeout(id);}, [step]);
  const [prefs, setPrefs] = useStateS({ milky: true, deep: true, planets: false, meteors: false });
  const toggle = (k) => setPrefs((p) => ({ ...p, [k]: !p[k] }));
  const PREFS = [
  { k: "milky", ico: "🌌", name: "Milky Way", sub: "Wide-field core season" },
  { k: "deep", ico: "✦", name: "Deep sky", sub: "Nebulae & galaxies" },
  { k: "planets", ico: "🪐", name: "Planets", sub: "Moon, Jupiter, Saturn" },
  { k: "meteors", ico: "☄", name: "Meteors", sub: "Showers & fireballs" }];

  if (step === 0) {
    return (
      <div className={"sc-page" + (obIntro ? " push-enter" : "")} style={{ background: skyBg(VERDICTS, "excellent", 26, 1) }} key="ob0">
        <StarField intensity={1} count={40} seed={7} />
        <div className="ob">
          <div className="ob-top">
            <div className="ob-brand anim">
              <ForecastMark size={104} animate idp="ob-hero" />
              <div className="ob-word">Star<span>Cast</span></div>
            </div>
            <div className="ob-title">Plan your
night sky.</div>
            <p className="ob-body">A clear read on tonight's sky — clouds, moon, seeing and darkness — for the spots you actually go.</p>
          </div>
          <div className="ob-foot">
            <button className="btn btn-primary" onClick={() => setStep(1)}>Get started</button>
            <div className="ob-dots"><span className="ob-dot on" /><span className="ob-dot" /><span className="ob-dot" /></div>
          </div>
        </div>
      </div>);}
  if (step === 1) {
    return (
      <div className={"sc-page" + (obIntro ? " push-enter" : "")} style={{ background: skyBg(VERDICTS, "excellent", 26, 1) }} key="ob1">
        <StarField intensity={0.9} count={36} seed={9} />
        <div className="ob" style={{ justifyContent: "flex-start", paddingTop: 24 }}>
          <span className="ob-kicker">Step 1 of 2</span>
          <div className="ob-title" style={{ fontSize: 30, margin: "12px 0 8px" }}>Where do you watch from?</div>
          <p className="ob-body" style={{ marginBottom: 22 }}>We'll forecast the sky for this exact spot. You can add more later.</p>
          <button className="btn btn-primary" style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => setStep(2)}><LocArrow size={16} /> Use my current location</button>
          <div className="sc-or"><span />or<span /></div>
          <div className="sc-search"><svg width="17" height="17" viewBox="0 0 17 17" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.6" /><path d="M11.5 11.5 L15 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>Search a place or park…</div>
          <div className="result-list" style={{ marginTop: 6 }}>
            <button className="result-row" onClick={() => setStep(2)}><span className="result-pin">◐</span><div className="result-main"><div className="result-name">Cherry Springs</div><div className="result-meta">Pennsylvania · Bortle 2</div></div><span className="result-bortle" style={{ color: "var(--acc)", fontSize: 20 }}>+</span></button>
            <button className="result-row" onClick={() => setStep(2)}><span className="result-pin">◐</span><div className="result-main"><div className="result-name">Big Bend NP</div><div className="result-meta">Texas · Bortle 1</div></div><span className="result-bortle" style={{ color: "var(--acc)", fontSize: 20 }}>+</span></button>
          </div>
          <div className="ob-foot"><div className="ob-dots"><span className="ob-dot" /><span className="ob-dot on" /><span className="ob-dot" /></div></div>
        </div>
      </div>);
  }
  return (
    <div className={"sc-page" + (obIntro ? " push-enter" : "")} style={{ background: skyBg(VERDICTS, "excellent", 26, 1) }} key="ob2">
      <StarField intensity={1} count={40} seed={11} />
      <div className="ob" style={{ justifyContent: "flex-start", paddingTop: 24 }}>
        <span className="ob-kicker">Step 2 of 2</span>
        <div className="ob-title" style={{ fontSize: 30, margin: "12px 0 8px" }}>What do you chase?</div>
        <p className="ob-body" style={{ marginBottom: 18 }}>Pick a few. We'll surface the right targets and only ping you when they're up.</p>
        <div className="pref-grid">
          {PREFS.map((p) =>
          <button className={"pref" + (prefs[p.k] ? " on" : "")} key={p.k} onClick={() => toggle(p.k)}>
              <span className="pref-check">{prefs[p.k] ? "✓" : ""}</span>
              <span className="pref-ico">{p.ico}</span>
              <span className="pref-name">{p.name}</span>
              <span className="pref-sub">{p.sub}</span>
            </button>)}
        </div>
        <div className="ob-foot">
          <button className="btn btn-primary" onClick={onDone}>Show me tonight</button>
          <div className="ob-dots"><span className="ob-dot" /><span className="ob-dot" /><span className="ob-dot on" /></div>
        </div>
      </div>
    </div>);
}

Object.assign(window, { TargetDetail, VisibleTonight, LocationsScreen, AddSpot, SettingsScreen, Onboarding });