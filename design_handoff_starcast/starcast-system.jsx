/* StarCast — shared design system: frames, verdict gradients, starfield, gestures, data */

const { useState, useEffect, useRef, useCallback } = React;

/* ----------------------------------------------------------------------------
   VERDICT SYSTEM
   The gradient IS the data. Dark + starry = great. Pale + hazy = poor.
---------------------------------------------------------------------------- */
const VERDICTS = {
  excellent: {
    label: "GO",
    word: "Pristine",
    accent: "#7ef0d2",          // mint
    accentSoft: "rgba(126,240,210,0.16)",
    stars: 1,                    // star brightness 0..1
    // zenith -> horizon
    sky: ["#04060e", "#06121f", "#0a2230"],
    glow: "rgba(60,200,180,0.30)",
    chip: "#7ef0d2",
  },
  good: {
    label: "GO",
    word: "Great",
    accent: "#8fd0ff",          // sky blue
    accentSoft: "rgba(143,208,255,0.16)",
    stars: 0.85,
    sky: ["#05060f", "#0a1226", "#122039"],
    glow: "rgba(90,150,240,0.28)",
    chip: "#8fd0ff",
  },
  fair: {
    label: "COND",
    word: "Workable",
    accent: "#ffce8f",          // warm amber
    accentSoft: "rgba(255,206,143,0.15)",
    stars: 0.45,
    sky: ["#140f1f", "#2a1d33", "#412a37"],
    glow: "rgba(230,150,90,0.26)",
    chip: "#ffc27a",
  },
  poor: {
    label: "NO-GO",
    word: "Washed out",
    accent: "#c4ccd6",          // pale grey
    accentSoft: "rgba(196,204,214,0.14)",
    stars: 0.12,
    sky: ["#283039", "#39434f", "#4d5864"],
    glow: "rgba(190,205,220,0.30)",
    chip: "#aab4c0",
  },
};

function verdictFromScore(s) {
  if (s >= 78) return "excellent";
  if (s >= 62) return "good";
  if (s >= 42) return "fair";
  return "poor";
}

/* ----------------------------------------------------------------------------
   CLARITY RAMP — utilitarian red→green scale for quantitative views
   (hour-by-hour bars, trends). 0 = bad/NO-GO (red), 100 = great/GO (green).
   Edit the stops to retune the traffic-light gradient.
---------------------------------------------------------------------------- */
const CLARITY_STOPS = [
  [0,   [201, 53, 42]],   // #c9352a  deep red
  [28,  [222, 96, 48]],   // #de6030  red-orange
  [50,  [229, 165, 60]],  // #e5a53c  amber
  [70,  [150, 196, 82]],  // #96c452  yellow-green
  [100, [56, 186, 96]],   // #38ba60  green
];
function clarityColor(pct) {
  const p = Math.max(0, Math.min(100, pct));
  let lo = CLARITY_STOPS[0], hi = CLARITY_STOPS[CLARITY_STOPS.length - 1];
  for (let i = 0; i < CLARITY_STOPS.length - 1; i++) {
    if (p >= CLARITY_STOPS[i][0] && p <= CLARITY_STOPS[i + 1][0]) { lo = CLARITY_STOPS[i]; hi = CLARITY_STOPS[i + 1]; break; }
  }
  const span = (hi[0] - lo[0]) || 1;
  const t = (p - lo[0]) / span;
  const c = lo[1].map((v, k) => Math.round(v + (hi[1][k] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
const CLARITY_RAMP_CSS = "linear-gradient(90deg, #c9352a, #de6030, #e5a53c, #96c452, #38ba60)";

/* Full-bleed background built from layered gradients (sky + glow + texture) */
function skyBackground(vKey, glowY = 50) {
  const v = VERDICTS[vKey];
  const [a, b, c] = v.sky;
  return [
    // soft radial glow behind the hero
    `radial-gradient(120% 80% at 50% ${glowY}%, ${v.glow} 0%, rgba(0,0,0,0) 55%)`,
    // faint diagonal texture (the Solar sheen)
    `repeating-linear-gradient(125deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 9px)`,
    // base vertical sky
    `linear-gradient(180deg, ${a} 0%, ${b} 52%, ${c} 100%)`,
  ].join(", ");
}

/* ----------------------------------------------------------------------------
   STARFIELD — lightweight CSS stars with staggered twinkle
---------------------------------------------------------------------------- */
function StarField({ intensity = 1, count = 46, seed = 1 }) {
  const stars = React.useMemo(() => {
    let s = seed * 9301 + 49297;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    return Array.from({ length: count }, () => ({
      x: rnd() * 100,
      y: rnd() * 100,
      r: 0.5 + rnd() * 1.4,
      d: 2.5 + rnd() * 4,
      delay: rnd() * 5,
      base: 0.25 + rnd() * 0.6,
    }));
  }, [count, seed]);
  if (intensity <= 0.02) return null;
  return (
    <div className="sc-stars" aria-hidden="true">
      {stars.map((st, i) => (
        <span
          key={i}
          style={{
            left: st.x + "%",
            top: st.y + "%",
            width: st.r + "px",
            height: st.r + "px",
            opacity: st.base * intensity,
            "--tw-min": (st.base * 0.3 * intensity).toFixed(2),
            "--tw-max": Math.min(1, st.base * 1.1 * intensity).toFixed(2),
            animationDuration: st.d + "s",
            animationDelay: st.delay + "s",
          }}
        />
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------------
   PHONE FRAME — iPhone-style bezel, status bar, home indicator
---------------------------------------------------------------------------- */
function StatusBar({ tint = "#ffffff" }) {
  return (
    <div className="sc-status" style={{ color: tint }}>
      <span className="sc-status-time">9:41</span>
      <span className="sc-status-right">
        <svg width="18" height="11" viewBox="0 0 18 11" fill="none"><rect x="0" y="3" width="3" height="8" rx="1" fill="currentColor"/><rect x="5" y="1.5" width="3" height="9.5" rx="1" fill="currentColor"/><rect x="10" y="0" width="3" height="11" rx="1" fill="currentColor" opacity="0.5"/><rect x="15" y="0" width="3" height="11" rx="1" fill="currentColor" opacity="0.5"/></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none"><path d="M8 2.2c2 0 3.8.75 5.2 2L8 10.5 2.8 4.2C4.2 2.95 6 2.2 8 2.2Z" fill="currentColor" opacity="0.55"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity="0.5"/><rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor"/><rect x="23" y="4" width="1.5" height="4" rx="0.75" fill="currentColor" opacity="0.5"/></svg>
      </span>
    </div>
  );
}

function PhoneFrame({ children, tint = "#fff", className = "" }) {
  return (
    <div className={"sc-phone " + className}>
      <div className="sc-phone-screen">
        <StatusBar tint={tint} />
        <div className="sc-island" />
        {children}
        <div className="sc-home-ind" style={{ background: tint }} />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   GESTURE HOOKS
---------------------------------------------------------------------------- */
// Horizontal swipe deck — returns index + bind handlers for a track element
function useSwipe(length, onChange) {
  const [index, setIndex] = useState(0);
  const [dx, setDx] = useState(0);
  const start = useRef(null);
  const W = 393;
  const onDown = (e) => { start.current = (e.touches ? e.touches[0].clientX : e.clientX); };
  const onMove = (e) => {
    if (start.current == null) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    let d = x - start.current;
    if ((index === 0 && d > 0) || (index === length - 1 && d < 0)) d *= 0.32; // rubber band
    setDx(d);
  };
  const onUp = () => {
    if (start.current == null) return;
    let next = index;
    if (dx < -56 && index < length - 1) next = index + 1;
    if (dx > 56 && index > 0) next = index - 1;
    if (next !== index) { setIndex(next); onChange && onChange(next); }
    setDx(0); start.current = null;
  };
  const bind = {
    onMouseDown: onDown, onMouseMove: onMove, onMouseUp: onUp, onMouseLeave: onUp,
    onTouchStart: onDown, onTouchMove: onMove, onTouchEnd: onUp,
  };
  return { index, setIndex, dx, bind, W };
}

// Pull-to-refresh
function usePull(onRefresh) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef(null);
  const onDown = (e) => {
    const t = e.target.closest(".sc-screen");
    if (t && t.scrollTop > 4) return;
    start.current = (e.touches ? e.touches[0].clientY : e.clientY);
  };
  const onMove = (e) => {
    if (start.current == null || refreshing) return;
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    const d = y - start.current;
    if (d > 0) setPull(Math.min(96, d * 0.5));
  };
  const onUp = () => {
    if (start.current == null) return;
    if (pull > 56) {
      setRefreshing(true);
      setTimeout(() => { setRefreshing(false); setPull(0); onRefresh && onRefresh(); }, 1100);
    } else setPull(0);
    start.current = null;
  };
  const bind = {
    onMouseDown: onDown, onMouseMove: onMove, onMouseUp: onUp, onMouseLeave: onUp,
    onTouchStart: onDown, onTouchMove: onMove, onTouchEnd: onUp,
  };
  return { pull, refreshing, bind };
}

/* ----------------------------------------------------------------------------
   DATA — saved locations, each its own mood
---------------------------------------------------------------------------- */
const LOCATIONS = [
  {
    name: "Cherry Springs", region: "Pennsylvania", bortle: 2,
    score: 82, window: "2:15 – 5:00", windowLabel: "Best window",
    cloud: 8, moon: 14, moonPhase: "Waxing crescent", seeing: "Excellent", seeingN: 5,
    transparency: "Above avg", targets: ["Galactic core", "M8 Lagoon", "M20 Trifid"],
    nights: [
      { day: "Tonight", score: 82 }, { day: "Mon", score: 34 }, { day: "Tue", score: 28 },
      { day: "Wed", score: 55 }, { day: "Thu", score: 88 }, { day: "Fri", score: 79 },
    ],
    hourly: [40,62,30,18,72,88,90,84,60], // 9p..5a clarity %
  },
  {
    name: "Acworth", region: "Georgia", bortle: 6,
    score: 31, window: "—", windowLabel: "No clear window",
    cloud: 74, moon: 14, moonPhase: "Waxing crescent", seeing: "Poor", seeingN: 2,
    transparency: "Hazy", targets: ["Moon", "Jupiter"],
    nights: [
      { day: "Tonight", score: 31 }, { day: "Mon", score: 22 }, { day: "Tue", score: 44 },
      { day: "Wed", score: 38 }, { day: "Thu", score: 52 }, { day: "Fri", score: 60 },
    ],
    hourly: [20,18,24,30,28,22,26,34,30],
  },
  {
    name: "Moab", region: "Utah", bortle: 2,
    score: 71, window: "12:40 – 4:30", windowLabel: "Best window",
    cloud: 22, moon: 14, moonPhase: "Waxing crescent", seeing: "Good", seeingN: 4,
    transparency: "Good", targets: ["Milky Way", "Andromeda", "Scorpius"],
    nights: [
      { day: "Tonight", score: 71 }, { day: "Mon", score: 64 }, { day: "Tue", score: 48 },
      { day: "Wed", score: 70 }, { day: "Thu", score: 75 }, { day: "Fri", score: 58 },
    ],
    hourly: [50,66,72,64,78,80,76,68,55],
  },
];

Object.assign(window, {
  VERDICTS, verdictFromScore, skyBackground,
  clarityColor, CLARITY_RAMP_CSS,
  StarField, PhoneFrame, StatusBar,
  useSwipe, usePull, LOCATIONS,
});
