/* StarCast — interactive home (themed). Reads verdict palette + motion knobs from props
   so the Tweaks panel can recolor the GO accent and retime every interaction. */

const { useState: useStateH, useEffect: useEffectH, useRef: useRefH } = React;

/* themed sky background (glowMul scales the hero glow for the "sky intensity" tweak) */
function skyBg(V, vKey, glowY, glowMul) {
  const v = V[vKey];
  const [a, b, c] = v.sky;
  const gm = Math.max(0, glowMul);
  return [
  `radial-gradient(120% 80% at 50% ${glowY}%, ${v.glow} 0%, rgba(0,0,0,0) ${52 + 0}%)`,
  `repeating-linear-gradient(125deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 9px)`,
  `linear-gradient(180deg, ${a} 0%, ${b} 52%, ${c} 100%)`].
  join(", ");
}

/* intro flag: true on mount, flips false after `ms` via setTimeout (fires even when the
   compositor timeline is frozen) so entrance classes self-remove and content can't get stuck. */
function useIntro(ms, enabled) {
  const [on, setOn] = useStateH(false);
  useEffectH(() => {
    if (!enabled) {setOn(false);return;}
    setOn(true);
    const id = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(id);
  }, [enabled, ms]);
  return on;
}

/* count-up hook */
function useCountUp(target, run, ms = 900) {
  const [val, setVal] = useStateH(target);
  const raf = useRefH(null);
  useEffectH(() => {
    if (!run) {setVal(target);return;}
    setVal(0);
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(target * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    const snap = setTimeout(() => setVal(target), ms + 250); // frozen-timeline fallback
    return () => {cancelAnimationFrame(raf.current);clearTimeout(snap);};
  }, [target, run, ms]);
  return val;
}

const ARC2 = { cx: 160, cy: 120, r: 108 };
function polar2(frac) {const a = Math.PI * (1 - frac);return [ARC2.cx + ARC2.r * Math.cos(a), ARC2.cy - ARC2.r * Math.sin(a)];}
function arcPath2(f0, f1) {const [x0, y0] = polar2(f0),[x1, y1] = polar2(f1);return `M${x0.toFixed(1)} ${y0.toFixed(1)} A ${ARC2.r} ${ARC2.r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;}
const QCOLOR = { Excellent: "var(--acc)", Good: "#8fd0ff", Mediocre: "rgba(255,255,255,0.5)" };

function CompassH({ deg, accent }) {
  return (
    <svg viewBox="0 0 64 64" className="m-compass" fill="none">
      <circle cx="32" cy="32" r="27" stroke="rgba(255,255,255,0.16)" fill="rgba(255,255,255,0.04)" />
      <text x="32" y="13" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.5)" fontWeight="600">N</text>
      <text x="32" y="59" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">S</text>
      <g transform={`rotate(${deg} 32 32)`}><path d="M32 14 L37 36 L32 31 L27 36 Z" fill={accent} /></g>
      <circle cx="32" cy="32" r="2.4" fill={accent} />
    </svg>);
}

function DayStripH({ V, days, sel, onSel }) {
  return (
    <div className="m-strip m-enter e1">
      {days.map((dd, i) => {
        const v = V[dd.verdict];const on = i === sel;
        return (
          <button key={i} className={"m-day" + (on ? " on" : "")} onClick={() => onSel(i)}
          style={{ background: on ? `linear-gradient(180deg, ${v.sky[1]}, ${v.sky[2]})` : "transparent" }}>
            <span className="m-day-badge" style={{ borderColor: v.chip, color: on ? "#fff" : "rgba(255,255,255,0.82)", background: on ? v.accentSoft : "transparent" }}>{dd.score}</span>
            <span className="m-day-label">{dd.day === "Tonight" ? "Now" : dd.day}</span>
            <span className="m-day-dot" style={{ background: v.chip, opacity: on ? 1 : 0.4 }} />
          </button>);
      })}
    </div>);
}

function NightArcH({ V, loc, d, v, bind, dx, animKey, animate, freeMode }) {
  const hasWin = !!d.window;
  const len = hasWin ? (ARC2.r * (d.window.e - d.window.s) * Math.PI).toFixed(1) : 0;
  return (
    <div className="m-hero m-enter e2" style={{ transform: `translateX(${dx * 0.16}px)` }} {...bind}>
      <svg viewBox="0 0 320 168" className="m-arc" fill="none">
        <defs>
          <linearGradient id="winGradH" x1="0" x2="1">
            <stop offset="0%" stopColor={v.accent} stopOpacity="0" />
            <stop offset="50%" stopColor={v.accent} stopOpacity="1" />
            <stop offset="100%" stopColor={v.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={arcPath2(0, 1)} stroke="rgba(255,255,255,0.13)" strokeWidth="3" strokeLinecap="round" />
        {[0.25, 0.5, 0.75].map((t, i) => {const [x, y] = polar2(t);return <circle key={i} cx={x} cy={y} r="1.6" fill="rgba(255,255,255,0.3)" />;})}
        {hasWin && <path key={"w" + animKey} className={"m-arc-win" + (animate ? " draw" : "")} d={arcPath2(d.window.s, d.window.e)} stroke="url(#winGradH)" strokeWidth="6" strokeLinecap="round" style={{ color: v.accent, "--len": len }} />}
        {hasWin && [d.window.s, d.window.e].map((f, i) => {const [x, y] = polar2(f);return <circle key={"p" + animKey + i} cx={x} cy={y} r="4.5" fill={v.accent} className={"m-arc-pt" + (animate ? " pop" : "")} style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `calc(${260 + i * 120}ms * var(--sc-dur))` }} />;})}
      </svg>
      <span className="m-arc-end left">{loc.dusk}<i>dusk</i></span>
      <span className="m-arc-end right">{loc.dawn}<i>dawn</i></span>
      <div className="m-arc-center">
        {freeMode ?
        <React.Fragment>
            <span className="m-arc-cap" style={{ color: v.accent }}>{v.label} TONIGHT</span>
            <span className="m-arc-win-time">{v.word}</span>
            <span className="m-arc-sub">over {loc.name} · {d.cloud}% cloud</span>
          </React.Fragment> :
        hasWin ?
        <React.Fragment>
            <span className="m-arc-cap" style={{ color: v.accent }}>{v.label} · BEST WINDOW</span>
            <span className="m-arc-win-time">{d.window.label}</span>
            <span className="m-arc-sub">{d.primeDark} of prime darkness · clear by {d.clearBy}</span>
          </React.Fragment> :

        <React.Fragment>
            <span className="m-arc-cap" style={{ color: v.accent }}>{v.label}</span>
            <span className="m-arc-win-time">No window</span>
            <span className="m-arc-sub">{d.cloud}% cloud · {v.word.toLowerCase()} sky tonight</span>
          </React.Fragment>
        }
      </div>
    </div>);
}

function FactorChipsH({ d, onOpen, animate }) {
  const items = [{ key: "cloud", val: d.cloud, unit: "%" }, { key: "moon", val: d.moon, unit: "%" }, { key: "seeing", val: d.seeingN, unit: "/5" }, { key: "bortle", val: d.bortle, unit: "" }];
  return (
    <div className="m-chips m-enter e3">
      {items.map((it, i) =>
      <ChipH key={it.key} it={it} i={i} onOpen={onOpen} animate={animate} />
      )}
    </div>);
}
function ChipH({ it, i, onOpen, animate }) {
  const shown = useCountUp(it.val, animate, 700 + i * 60);
  const display = it.unit === "/5" || it.unit === "" ? Math.round(shown) : Math.round(shown);
  return (
    <button className="m-chip" style={{ animationDelay: i * 0.4 + "s" }} onClick={() => onOpen(it.key)}>
      <span className="m-chip-val">{display}<i>{it.unit}</i></span>
      <span className="m-chip-label">{FACTOR_META[it.key].label.split(" ")[0]}</span>
      <span className="m-chip-more">›</span>
    </button>);
}

function PrimeCardH({ loc, d, v, onOpen }) {
  const clouded = d.verdict === "poor";
  return (
    <button className="m-prime m-enter e4" onClick={() => onOpen(loc.prime, "prime")} style={{ borderColor: clouded ? "rgba(255,255,255,0.1)" : v.accentSoft }}>
      {clouded ?
      <div className="m-prime-main">
          <span className="m-prime-eyebrow">PRIME TARGET</span>
          <span className="m-prime-name muted">Clouded out</span>
          <span className="m-prime-sub">{loc.prime.name} hidden behind {d.cloud}% cloud</span>
        </div> :

      <React.Fragment>
          <div className="m-prime-main">
            <span className="m-prime-eyebrow" style={{ color: v.accent }}>PRIME TARGET</span>
            <span className="m-prime-name">{loc.prime.name}</span>
            <span className="m-prime-sub">{loc.prime.sub}</span>
            <span className="m-prime-meta">Visible <b>{loc.prime.visible}</b></span>
          </div>
          <div className="m-prime-compass">
            <CompassH deg={loc.prime.dirDeg} accent={v.accent} />
            <span className="m-prime-dir">{loc.prime.dir.split(" ")[0]}</span>
          </div>
        </React.Fragment>
      }
    </button>);
}

const SHEET_H2 = 566,GRAB2 = 50,CLOSED2 = SHEET_H2 - GRAB2;
function BottomSheetH({ V, loc, d, v, open, setOpen, onTarget, onSeeAll }) {
  const [drag, setDrag] = useStateH(0);
  const start = useRefH(null);
  const onDown = (e) => {start.current = e.touches ? e.touches[0].clientY : e.clientY;};
  const onMove = (e) => {if (start.current == null) return;setDrag((e.touches ? e.touches[0].clientY : e.clientY) - start.current);};
  const onUp = () => {
    if (start.current == null) return;
    if (open && drag > 130) setOpen(false);else if (!open && drag < -64) setOpen(true);
    setDrag(0);start.current = null;
  };
  const grabBind = { onMouseDown: onDown, onMouseMove: onMove, onMouseUp: onUp, onMouseLeave: onUp, onTouchStart: onDown, onTouchMove: onMove, onTouchEnd: onUp };
  const ty = Math.max(0, Math.min(CLOSED2, (open ? 0 : CLOSED2) + drag));
  const hours = ["9p", "10", "11", "12", "1a", "2", "3", "4", "5"];
  return (
    <React.Fragment>
      <div className="m-scrim" onClick={() => setOpen(false)} style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }} />
      <div className="m-sheet" style={{ height: SHEET_H2, transform: `translateY(${ty}px)`, transition: drag ? "none" : undefined }}>
        <div className="m-grab" {...grabBind} onClick={() => setOpen(!open)}>
          <div className="m-grab-handle" />
          <span className="m-grab-label">{open ? "Tonight's sky" : "Hour-by-hour"}</span>
          <span className="m-grab-chev">{open ? "⌄" : "⌃"}</span>
        </div>
        <div className="m-sheet-body">
          <div className="m-bars-head">
            <span className="m-sec-l m-bars-title">Hour-by-hour · {d.day === "Tonight" ? "tonight" : d.day}</span>
            <span className="m-clarity-legend"><i>Poor</i><span className="m-legend-ramp" /><i>Great</i></span>
          </div>
          <div className="m-bars">
            {d.hourly.map((h, i) => {
              const inWin = d.window && i / 8 >= d.window.s - 0.05 && i / 8 <= d.window.e + 0.02;
              return (
                <div className={"m-bar-col" + (inWin ? " in-win" : "")} key={i}>
                  <div className="m-bar" style={{ height: 12 + h * 0.7, background: clarityColor(h) }} />
                  <span className="m-bar-h">{hours[i]}</span>
                </div>);
            })}
          </div>
          {d.window && <div className="m-win-note"><span className="m-win-dot" />Best window · {d.window.label}</div>}
          <button className="m-sec-head" onClick={onSeeAll} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 0 }}>
            <span className="m-sec-l">Visible tonight</span>
            <span className="m-sec-count">{loc.objects.length} up · see all ›</span>
          </button>
          <div className="m-skylist">
            {loc.objects.map((o, i) =>
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
          </div>
        </div>
      </div>
    </React.Fragment>);
}

function FactorSheetH({ V, type, loc, d, sel, v, onClose }) {
  if (!type) return null;
  const meta = FACTOR_META[type];
  return (
    <React.Fragment>
      <div className="m-scrim" style={{ opacity: 1 }} onClick={onClose} />
      <div className="m-fsheet">
        <div className="m-sheet-grip" onClick={onClose} />
        <div className="m-sheet-head">
          <span className="m-sheet-title">{meta.label}</span>
          <span className="m-detail-val" style={{ color: v.accent }}>
            {type === "moon" ? d.moon + "% · " + d.moonPhase : type === "seeing" ? d.seeingN + "/5 · " + d.seeingWord : type === "bortle" ? "Class " + d.bortle : d.cloud + "%"}
          </span>
        </div>
        <p className="m-detail-blurb">{meta.blurb(type === "seeing" ? d.seeingN : type === "moon" ? d.moon : type === "bortle" ? d.bortle : d.cloud)}</p>
        <span className="m-sec-l">Across the next 6 nights</span>
        <div className="m-trend">
          {loc.days.map((dd, i) => {
            const raw = type === "cloud" ? dd.cloud : type === "moon" ? dd.moon : type === "seeing" ? dd.seeingN * 20 : (7 - dd.bortle) * 14;
            return (
              <div className="m-trend-col" key={i}>
                <div className="m-trend-bar" style={{ height: 8 + raw * 0.6, background: i === sel ? v.accent : "rgba(255,255,255,0.22)" }} />
                <span className="m-trend-h" style={{ color: i === sel ? "#fff" : "rgba(255,255,255,0.5)" }}>{dd.day === "Tonight" ? "Now" : dd.day}</span>
              </div>);
          })}
        </div>
      </div>
    </React.Fragment>);
}

function HomeScreen({ V, index, setIndex, sel, setSel, glowMul, starMul, animate, nav, planCount, tier, trialDays, onUpgrade }) {
  const [sheetFactor, setSheetFactor] = useStateH(null);
  const [sheetOpen, setSheetOpen] = useStateH(false);
  const { dx, bind } = useSwipe(FORECAST.length, (n) => {setIndex(n);setSel(0);setSheetOpen(false);setSheetFactor(null);});
  const loc = FORECAST[index];
  const d = loc.days[sel];
  const v = V[d.verdict];
  const goLoc = (n) => {if (n < 0 || n >= FORECAST.length) return;setIndex(n);setSel(0);setSheetOpen(false);setSheetFactor(null);};
  const star = Math.max(0, v.stars * starMul);
  const intro = useIntro(950, animate);

  return (
    <div className={"sc-screen m" + (intro ? " m-anim" : "")} style={{ background: skyBg(V, d.verdict, 26, glowMul), transition: "background var(--d4) ease" }}>
      <StarField intensity={star} count={Math.round(46 * Math.min(1.6, starMul))} seed={index * 3 + sel} />
      <button onClick={() => nav.plan()} aria-label="Tonight's plan" className="m-iconbtn" style={{ left: 16 }}>
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M3 4.5h12M3 9h12M3 13.5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
        {planCount > 0 && <span className="m-iconbtn-badge">{planCount}</span>}
      </button>
      <button onClick={() => nav.settings()} aria-label="Settings" className="m-iconbtn" style={{ right: 16 }}>⚙</button>
      <div className="m-brand">
        <ForecastMark size={26} idp="home-brand" />
        <span className="m-brand-word">Star<span>Cast</span></span>
      </div>
      <div className="m-top">
        <div className="m-locline">
          <button className="m-loc-chev" onClick={() => goLoc(index - 1)} disabled={index === 0}>‹</button>
          <div className="m-loc-mid" onClick={() => nav.locations()}>
            <span className="m-loc-name">{loc.name}</span>
            <span className="m-loc-region">Bortle {loc.bortle} · {loc.region}</span>
          </div>
          <button className="m-loc-chev" onClick={() => goLoc(index + 1)} disabled={index === FORECAST.length - 1}>›</button>
        </div>
        <div className="m-locdots">
          {FORECAST.map((_, i) => <span key={i} className={"m-locdot" + (i === index ? " on" : "")} />)}
        </div>
        <DayStripH V={V} days={loc.days} sel={sel} onSel={setSel} />
        {tier === "trial" && <TrialBanner days={trialDays} onUpgrade={onUpgrade} />}
      </div>
      <NightArcH V={V} loc={loc} d={d} v={v} bind={bind} dx={dx} animKey={index + "-" + sel} animate={intro} />
      <FactorChipsH d={d} onOpen={setSheetFactor} animate={animate} />
      <PrimeCardH loc={loc} d={d} v={v} onOpen={nav.target} />
      <BottomSheetH V={V} loc={loc} d={d} v={v} open={sheetOpen} setOpen={setSheetOpen} onTarget={nav.target} onSeeAll={nav.visible} />
      <FactorSheetH V={V} type={sheetFactor} loc={loc} d={d} sel={sel} v={v} onClose={() => setSheetFactor(null)} />
    </div>);
}

Object.assign(window, { HomeScreen, NightArcH, CompassH, QCOLOR, skyBg, useCountUp, useIntro });