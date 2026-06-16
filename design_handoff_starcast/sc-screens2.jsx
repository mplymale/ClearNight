/* StarCast — additional destination screens: Tonight's Plan, Set Alert,
   Gear, Quiet Hours, About. All pushed over Home like the others. */

const { useState: useStateS2 } = React;

/* ---------------- TONIGHT'S PLAN ---------------- */
function PlanScreen({ plan, onBack, onTarget, onRemove, onToggleDone, motion }) {
  const intro = useIntro(560, motion !== false);
  const active = plan.filter(p => !p.done);
  return (
    <div className={"sc-page sky-deep" + (intro ? " push-enter" : "")}>
      <Nav left={{ chev: true, label: "Home" }} title="Tonight's Plan" onLeft={onBack} />
      <div className="sc-scroll">
        {plan.length === 0 ? (
          <div className="sc-empty">
            <div className="sc-empty-mark">✦</div>
            <div className="sc-empty-title">No targets yet</div>
            <p className="sc-empty-body">Open a target from tonight's sky and tap <b>Add to plan</b> to build your observing run for the night.</p>
          </div>
        ) : (
          <React.Fragment>
            <div className="plan-summary">
              <div><span className="plan-summary-n">{active.length}</span> <span className="plan-summary-l">{active.length === 1 ? "target" : "targets"} queued</span></div>
              <div className="plan-summary-win">{active.length ? "11:10pm – 4:35am" : "All observed 🎉"}</div>
            </div>
            <div className={"plan-list sc-stagger" + (intro ? " intro" : "")}>
              {plan.map((o, i) => (
                <div className={"plan-row" + (o.done ? " done" : "")} key={o.name}>
                  <button className="plan-check" onClick={() => onToggleDone(o.name)} aria-label="Mark observed">{o.done ? "✓" : (i + 1)}</button>
                  <button className="plan-main" onClick={() => onTarget(o, "obj")}>
                    <span className="plan-name">{o.name}</span>
                    <span className="plan-sub">{o.sub}</span>
                    <span className="plan-win">{o.visible || "Up most of the night"}</span>
                  </button>
                  <button className="plan-x" onClick={() => onRemove(o.name)} aria-label="Remove">×</button>
                </div>))}
            </div>
          </React.Fragment>
        )}
      </div>
    </div>);
}

/* ---------------- SET ALERT ---------------- */
const ALERT_NIGHTS = ["Any clear night", "Weekends only", "Pick nights"];
function SetAlert({ V, vKey, target, days, onBack, onConfirm, motion }) {
  const v = V[vKey] || V.excellent;
  const intro = useIntro(560, motion !== false);
  const [thresh, setThresh] = useStateS2(72);
  const [when, setWhen] = useStateS2("Any clear night");
  const [lead, setLead] = useStateS2("Evening of");
  const [picked, setPicked] = useStateS2(() => new Set());
  const [done, setDone] = useStateS2(false);
  const word = thresh >= 78 ? "GO" : thresh >= 62 ? "GO" : thresh >= 42 ? "COND" : "Any";
  const onTrack = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setThresh(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100));
  };
  const toggleNight = (i) => setPicked(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const confirm = () => { setDone(true); setTimeout(() => { onConfirm && onConfirm({ target: target.name, thresh, when, lead }); onBack(); }, 850); };
  return (
    <div className={"sc-page sky-deep" + (intro ? " push-enter" : "")}>
      <Nav left={{ chev: false, label: "Cancel" }} title="Set Alert" onLeft={onBack} />
      <div className={"sc-scroll sc-stagger" + (intro ? " intro" : "")}>
        <div className="alert-target">
          <span className="alert-eyebrow" style={{ color: v.accent }}>NOTIFY ME ABOUT</span>
          <div className="alert-name">{target.name}</div>
        </div>

        <div className="set-card">
          <div className="thresh">
            <div className="set-row-name">Only when its night scores</div>
            <div className="thresh-track" onClick={onTrack}>
              <div className="thresh-fill" style={{ width: thresh + "%" }} />
              <div className="thresh-knob" style={{ left: thresh + "%" }} />
            </div>
            <div className="thresh-scale"><span>0</span><span style={{ color: "var(--acc)" }}>{word} · {thresh}+</span><span>100</span></div>
          </div>
        </div>

        <span className="m-sec-l" style={{ display: "block", margin: "22px 0 0" }}>Which nights</span>
        <div className="sc-filter" style={{ marginTop: 10 }}>
          {ALERT_NIGHTS.map(x => <button key={x} className={x === when ? "on" : ""} onClick={() => setWhen(x)}>{x}</button>)}
        </div>
        {when === "Pick nights" && (
          <div className="alert-nights">
            {days.map((d, i) => (
              <button key={i} className={"alert-night" + (picked.has(i) ? " on" : "")} onClick={() => toggleNight(i)}>
                <span className="alert-night-d">{d.day === "Tonight" ? "Ton" : d.day}</span>
                <span className="alert-night-s" style={{ color: picked.has(i) ? "#04130f" : V[d.verdict].accent }}>{d.score}</span>
              </button>))}
          </div>
        )}

        <span className="m-sec-l" style={{ display: "block", margin: "22px 0 0" }}>When to ping me</span>
        <div className="sc-seg" style={{ marginTop: 10, width: "100%" }}>
          {["Evening of", "Day before"].map(x => <button key={x} className={x === lead ? "on" : ""} style={{ flex: 1 }} onClick={() => setLead(x)}>{x}</button>)}
        </div>

        <button className={"btn btn-primary alert-confirm" + (done ? " done" : "")} style={{ marginTop: 24, width: "100%" }} onClick={confirm} disabled={done}>
          {done ? "✓ Alert set" : "Set alert"}
        </button>
      </div>
    </div>);
}

/* ---------------- GEAR ---------------- */
const GEAR = {
  Telescopes: [
    { name: "8\" Dobsonian", meta: "f/5.9 · 1200mm · visual" },
    { name: "ED80 Refractor", meta: "f/7.5 · 600mm · imaging" },
  ],
  Cameras: [
    { name: "Canon EOS Ra", meta: "Full-frame · Hα-modified" },
    { name: "ASI294MC Pro", meta: "Cooled · one-shot color" },
  ],
  Eyepieces: [
    { name: "25mm Plössl", meta: "48× · 1.7° field" },
    { name: "10mm Plössl", meta: "120× · planetary" },
  ],
};
function GearScreen({ onBack, motion }) {
  const intro = useIntro(560, motion !== false);
  return (
    <div className={"sc-page sky-deep" + (intro ? " push-enter" : "")}>
      <Nav left={{ chev: true, label: "Settings" }} title="Gear" onLeft={onBack} />
      <div className={"sc-scroll sc-stagger" + (intro ? " intro" : "")}>
        <p className="gear-note">Tells StarCast which targets are realistic for you — and tunes the "Excellent / Good" call on each object.</p>
        {Object.keys(GEAR).map(group => (
          <div className="set-group" key={group}>
            <span className="m-sec-l">{group}</span>
            <div className="set-card">
              {GEAR[group].map((g, i) => (
                <div className="set-row" key={i}>
                  <div className="set-row-main"><div className="set-row-name">{g.name}</div><div className="set-row-sub">{g.meta}</div></div>
                  <span className="loc-card-chev">›</span>
                </div>))}
              <button className="set-row gear-add"><span style={{ color: "var(--acc)", fontWeight: 600 }}>+ Add {group.toLowerCase().replace(/s$/, "")}</span></button>
            </div>
          </div>))}
      </div>
    </div>);
}

/* ---------------- QUIET HOURS ---------------- */
function clampHour(h) { return (h + 24) % 24; }
function fmtHour(h) { const ap = h >= 12 ? "PM" : "AM"; let hr = h % 12; if (hr === 0) hr = 12; return { hr, ap }; }
function TimeStepper({ label, hour, onChange }) {
  const { hr, ap } = fmtHour(hour);
  return (
    <div className="qh-time">
      <span className="qh-time-l">{label}</span>
      <div className="qh-time-ctrl">
        <button onClick={() => onChange(clampHour(hour - 1))} aria-label="earlier">‹</button>
        <span className="qh-time-v">{hr}<i>:00</i> <em>{ap}</em></span>
        <button onClick={() => onChange(clampHour(hour + 1))} aria-label="later">›</button>
      </div>
    </div>);
}
function QuietHours({ onBack, motion }) {
  const intro = useIntro(560, motion !== false);
  const [on, setOn] = useStateS2(true);
  const [from, setFrom] = useStateS2(23);
  const [to, setTo] = useStateS2(7);
  return (
    <div className={"sc-page sky-deep" + (intro ? " push-enter" : "")}>
      <Nav left={{ chev: true, label: "Settings" }} title="Quiet Hours" onLeft={onBack} />
      <div className={"sc-scroll sc-stagger" + (intro ? " intro" : "")}>
        <div className="set-card">
          <div className="set-row">
            <div className="set-row-main"><div className="set-row-name">Quiet hours</div><div className="set-row-sub">Hold alerts during these hours</div></div>
            <button className={"sc-toggle" + (on ? " on" : "")} onClick={() => setOn(o => !o)}><div className="knob" /></button>
          </div>
        </div>
        <div className="set-card" style={{ marginTop: 12, opacity: on ? 1 : 0.4, pointerEvents: on ? "auto" : "none" }}>
          <TimeStepper label="From" hour={from} onChange={setFrom} />
          <TimeStepper label="To" hour={to} onChange={setTo} />
        </div>
        <p className="gear-note" style={{ marginTop: 16 }}>A "tonight looks great" alert that lands inside quiet hours is held until the window opens.</p>
      </div>
    </div>);
}

/* ---------------- ABOUT ---------------- */
const SCORE_FACTORS = [
  { name: "Cloud cover", w: 40, c: "#8fd0ff" },
  { name: "Light pollution", w: 25, c: "#c9a8ff" },
  { name: "Moonlight", w: 20, c: "#ffce8f" },
  { name: "Seeing & transparency", w: 15, c: "#7ef0d2" },
];
function AboutScreen({ onBack, motion }) {
  const intro = useIntro(560, motion !== false);
  return (
    <div className={"sc-page sky-deep" + (intro ? " push-enter" : "")}>
      <Nav left={{ chev: true, label: "Settings" }} title="About" onLeft={onBack} />
      <div className={"sc-scroll sc-stagger" + (intro ? " intro" : "")}>
        <div className="about-top">
          <ForecastMark size={88} idp="about-brand" />
          <div className="about-name">StarCast</div>
          <div className="about-ver">Version 1.0 · build 24</div>
        </div>

        <span className="m-sec-l">How the score works</span>
        <div className="set-card" style={{ padding: "16px 16px 8px" }}>
          <p className="gear-note" style={{ margin: "0 0 14px" }}>Each night gets a 0–100 score from four weighted factors, then a GO / COND / NO-GO verdict.</p>
          {SCORE_FACTORS.map((f, i) => (
            <div className="score-factor" key={i}>
              <div className="score-factor-top"><span>{f.name}</span><span className="score-factor-w">{f.w}%</span></div>
              <div className="score-factor-bar"><span style={{ width: f.w * 2.2 + "%", background: f.c }} /></div>
            </div>))}
        </div>

        <div className="set-card" style={{ marginTop: 16 }}>
          <button className="set-row gear-add"><div className="set-row-main"><div className="set-row-name">Data sources</div><div className="set-row-sub">NOAA · Light pollution atlas · Astropy</div></div><span className="loc-card-chev">›</span></button>
          <button className="set-row gear-add"><div className="set-row-main"><div className="set-row-name">Privacy policy</div></div><span className="loc-card-chev">›</span></button>
          <button className="set-row gear-add"><div className="set-row-main"><div className="set-row-name">Rate StarCast</div></div><span className="loc-card-chev">›</span></button>
        </div>
        <p className="about-foot">Made for dark skies.</p>
      </div>
    </div>);
}

Object.assign(window, { PlanScreen, SetAlert, GearScreen, QuietHours, AboutScreen });
