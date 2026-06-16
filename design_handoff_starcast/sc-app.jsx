/* StarCast — interactive app root: navigation stack, accent theming, and Tweaks. */

const { useState: useStateA, useMemo: useMemoA, useEffect: useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "start": "home",
  "tier": "trial",
  "trialDays": 5,
  "lockPreview": "off",
  "animSpeed": 1,
  "ease": "spring",
  "starDensity": 1,
  "skyIntensity": 1,
  "accent": "#7ef0d2",
  "nightVision": false,
  "radius": 1,
  "reduceMotion": false
}/*EDITMODE-END*/;

const EASES = {
  spring: "cubic-bezier(.22, 1, .36, 1)",
  smooth: "cubic-bezier(.4, 0, .2, 1)",
  snappy: "cubic-bezier(.5, 0, .1, 1)",
  linear: "linear",
};

/* build a themed verdict map: swap the GO/excellent accent to the chosen hue */
function hexToRgba(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function buildVerdicts(accent) {
  const base = JSON.parse(JSON.stringify(VERDICTS));
  base.excellent.accent = accent;
  base.excellent.accentSoft = hexToRgba(accent, 0.16);
  base.excellent.chip = accent;
  base.excellent.glow = hexToRgba(accent, 0.30);
  return base;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [index, setIndex] = useStateA(0);
  const [sel, setSel] = useStateA(0);
  const [stack, setStack] = useStateA([]);                 // pushed screens
  const [plan, setPlan] = useStateA([]);                   // tonight's plan targets
  const [alerts, setAlerts] = useStateA([]);               // set alerts (by target name)
  const [onboarding, setOnboarding] = useStateA(t.start === "onboarding");
  const [homeKey, setHomeKey] = useStateA(0);              // retrigger home entrance

  useEffectA(() => { setOnboarding(t.start === "onboarding"); }, [t.start]);

  const V = useMemoA(() => buildVerdicts(t.accent), [t.accent]);
  const curVerdict = FORECAST[index].days[sel].verdict;

  const rootStyle = {
    "--sc-dur": (1 / Math.max(0.2, t.animSpeed)).toFixed(3),
    "--sc-ease": EASES[t.ease] || EASES.spring,
    "--acc": t.accent,
    "--acc-soft": hexToRgba(t.accent, 0.16),
    "--sc-radius": t.radius,
  };

  const push = (screen) => setStack(s => [...s, screen]);
  const pop = () => setStack(s => s.slice(0, -1));
  const onUpgrade = () => push({ type: "paywall" });
  const purchase = () => { setTweak("tier", "premium"); setStack(s => s.filter(x => x.type !== "paywall")); };

  // plan helpers
  const inPlan = (tg) => plan.some(p => p.name === tg.name);
  const togglePlan = (tg) => setPlan(p => p.some(x => x.name === tg.name)
    ? p.filter(x => x.name !== tg.name)
    : [...p, { name: tg.name, sub: tg.sub || ([tg.type, tg.con].filter(Boolean).join(" · ")), visible: tg.visible, dir: tg.dir, mag: tg.mag, done: false }]);
  const removeFromPlan = (name) => setPlan(p => p.filter(x => x.name !== name));
  const toggleDone = (name) => setPlan(p => p.map(x => x.name === name ? { ...x, done: !x.done } : x));
  // alert helpers
  const hasAlert = (tg) => alerts.includes(tg.name);
  const addAlert = (cfg) => setAlerts(a => a.includes(cfg.target) ? a : [...a, cfg.target]);

  const nav = {
    target: (tg, kind) => push({ type: "target", target: { ...tg, kind }, vKey: curVerdict }),
    locations: () => push({ type: "locations" }),
    settings: () => push({ type: "settings" }),
    visible: () => push({ type: "visible" }),
    plan: () => push({ type: "plan" }),
    setAlert: (tg) => push({ type: "setAlert", target: tg, vKey: curVerdict }),
    gear: () => push({ type: "gear" }),
    quietHours: () => push({ type: "quietHours" }),
    about: () => push({ type: "about" }),
  };
  const selectLoc = (i) => { setIndex(i); setSel(0); setStack([]); setHomeKey(k => k + 1); };

  const top = stack[stack.length - 1];

  return (
    <div className={"sc-app" + (t.nightVision ? " night-vision" : "") + (t.reduceMotion ? " reduce-motion" : " force-motion")} style={rootStyle}>
      <PhoneFrame tint="#fff">
        {onboarding ? (
          <Onboarding onDone={() => { setOnboarding(false); setHomeKey(k => k + 1); }} />
        ) : (
          <React.Fragment>
            {t.tier === "free" ? (
              <FreeHome
                key={homeKey}
                V={V} nav={nav} onUpgrade={onUpgrade}
                glowMul={t.skyIntensity} starMul={t.starDensity}
                animate={!t.reduceMotion}
              />
            ) : (
              <HomeScreen
                key={homeKey}
                V={V} index={index} setIndex={setIndex} sel={sel} setSel={setSel}
                glowMul={t.skyIntensity} starMul={t.starDensity}
                animate={!t.reduceMotion} nav={nav} planCount={plan.filter(p => !p.done).length}
                tier={t.tier} trialDays={t.trialDays} onUpgrade={onUpgrade}
              />
            )}
            {top && top.type === "target" && <TargetDetail V={V} vKey={top.vKey} target={top.target} onBack={pop} motion={!t.reduceMotion} inPlan={inPlan} onTogglePlan={togglePlan} onSetAlert={nav.setAlert} hasAlert={hasAlert} />}
            {top && top.type === "visible" && <VisibleTonight loc={FORECAST[index]} onBack={pop} onTarget={nav.target} motion={!t.reduceMotion} />}
            {top && top.type === "locations" && <LocationsScreen V={V} onBack={pop} onAdd={() => push({ type: "add" })} onSelect={selectLoc} motion={!t.reduceMotion} />}
            {top && top.type === "add" && <AddSpot onBack={pop} motion={!t.reduceMotion} />}
            {top && top.type === "settings" && <SettingsScreen onBack={pop} motion={!t.reduceMotion} nav={nav} tier={t.tier} onUpgrade={onUpgrade} nightVision={t.nightVision} onNightVision={(v) => setTweak("nightVision", v)} />}
            {top && top.type === "paywall" && <PaywallScreen onBack={pop} onPurchase={purchase} motion={!t.reduceMotion} trialDays={t.trialDays} isTrial={t.tier === "trial"} />}
            {top && top.type === "plan" && <PlanScreen plan={plan} onBack={pop} onTarget={nav.target} onRemove={removeFromPlan} onToggleDone={toggleDone} motion={!t.reduceMotion} />}
            {top && top.type === "setAlert" && <SetAlert V={V} vKey={top.vKey} target={top.target} days={FORECAST[index].days} onBack={pop} onConfirm={addAlert} motion={!t.reduceMotion} />}
            {top && top.type === "gear" && <GearScreen onBack={pop} motion={!t.reduceMotion} />}
            {top && top.type === "quietHours" && <QuietHours onBack={pop} motion={!t.reduceMotion} />}
            {top && top.type === "about" && <AboutScreen onBack={pop} motion={!t.reduceMotion} />}
          </React.Fragment>
        )}
        {t.lockPreview !== "off" && <LockScreen V={V} variant={t.lockPreview} onClose={() => setTweak("lockPreview", "off")} />}
      </PhoneFrame>

      <TweaksPanel>
        <TweakSection label="Flow" />
        <TweakRadio label="Open on" value={t.start} options={["home", "onboarding"]} onChange={(v) => setTweak("start", v)} />

        <TweakSection label="Membership" />
        <TweakRadio label="Tier" value={t.tier} options={["trial", "free", "premium"]} onChange={(v) => setTweak("tier", v)} />
        <TweakSlider label="Trial days left" value={t.trialDays} min={0} max={7} step={1} unit="d" onChange={(v) => setTweak("trialDays", v)} />
        <TweakSelect label="Lock-screen push" value={t.lockPreview} options={["off", "tonight", "window"]} onChange={(v) => setTweak("lockPreview", v)} />

        <TweakSection label="Motion" />
        <TweakSlider label="Animation speed" value={t.animSpeed} min={0.5} max={2} step={0.1} unit="×" onChange={(v) => setTweak("animSpeed", v)} />
        <TweakSelect label="Easing" value={t.ease} options={["spring", "smooth", "snappy", "linear"]} onChange={(v) => setTweak("ease", v)} />
        <TweakToggle label="Reduce motion" value={t.reduceMotion} onChange={(v) => setTweak("reduceMotion", v)} />

        <TweakSection label="Sky" />
        <TweakSlider label="Starfield density" value={t.starDensity} min={0} max={1.6} step={0.1} unit="×" onChange={(v) => setTweak("starDensity", v)} />
        <TweakSlider label="Glow intensity" value={t.skyIntensity} min={0} max={1.8} step={0.1} unit="×" onChange={(v) => setTweak("skyIntensity", v)} />

        <TweakSection label="Look" />
        <TweakColor label="GO accent" value={t.accent} options={["#7ef0d2", "#8fd0ff", "#c9a8ff", "#ffce8f", "#ff9e7d"]} onChange={(v) => setTweak("accent", v)} />
        <TweakToggle label="Night vision (red)" value={t.nightVision} onChange={(v) => setTweak("nightVision", v)} />
        <TweakSlider label="Corner radius" value={t.radius} min={0.4} max={1.5} step={0.1} unit="×" onChange={(v) => setTweak("radius", v)} />
      </TweaksPanel>
    </div>);
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
