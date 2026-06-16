/* StarCast — rich per-night data. Every night drives the arc, window, factors, hourly. */

const SEEING_WORD = { 5: "Excellent", 4: "Good", 3: "Fair", 2: "Poor", 1: "Bad" };
const MOON_PHASE = ["Waxing crescent", "Waxing crescent", "First quarter", "Waxing gibbous", "Waxing gibbous", "Waxing gibbous"];

// organic hourly clarity curve (9 readings, 9pm->5am) peaking mid-night
function genHourly(score, seedN) {
  let s = seedN * 131 + 7;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const peak = 3.5 + rnd() * 1.5;
  return Array.from({ length: 9 }, (_, i) => {
    const bell = 1 - Math.abs(i - peak) / 6.2;
    const v = score * 0.5 + score * 0.55 * bell + (rnd() * 16 - 8);
    return Math.max(4, Math.min(99, Math.round(v)));
  });
}

const FACTOR_META = {
  cloud:  { label: "Cloud cover", unit: "%", lowerBetter: true,  blurb: (v) => v <= 15 ? "Skies are wide open — almost no cloud to block your targets." : v <= 40 ? "Some passing cloud. Workable in the clear gaps." : "Heavy cloud cover. Most of the night is socked in." },
  moon:   { label: "Moonlight", unit: "%", lowerBetter: true,  blurb: (v) => v <= 25 ? "A thin moon means a properly dark sky for faint deep-sky objects." : v <= 55 ? "A half-lit moon will wash out the faintest nebulae until it sets." : "A bright moon dominates the sky — best for lunar and planetary work." },
  seeing: { label: "Seeing", unit: "/5", lowerBetter: false, blurb: (v) => v >= 4 ? "Steady atmosphere — stars hold tight, great for high magnification." : v >= 3 ? "Average steadiness. Fine for wide-field, soft on planets." : "Turbulent air. Stars will boil; keep it wide-field." },
  bortle: { label: "Light pollution", unit: "", lowerBetter: true, blurb: (v) => v <= 3 ? "A genuinely dark site — the Milky Way casts shadows here." : v <= 5 ? "Rural/suburban transition. The core is visible but soft." : "Bright suburban sky. Stick to the moon, planets, bright clusters." },
};

// mkDay rows: [day, date, score, cloud, moon, seeingN, windowLabel|null, startFrac, endFrac, clearBy, primeDark]
function mkLoc(name, region, bortle, dusk, dawn, targets, rows) {
  return {
    name, region, bortle, dusk, dawn, targets,
    days: rows.map((r, i) => {
      const [day, date, score, cloud, moon, seeingN, wlabel, sF, eF, clearBy, primeDark] = r;
      return {
        day, date, score, cloud, moon, seeingN, bortle,
        verdict: verdictFromScore(score),
        seeingWord: SEEING_WORD[seeingN],
        moonPhase: MOON_PHASE[i] || "Waxing gibbous",
        window: wlabel ? { label: wlabel, s: sF, e: eF } : null,
        clearBy, primeDark,
        hourly: genHourly(score, i + name.length),
      };
    }),
  };
}

const FORECAST = [
  mkLoc("Cherry Springs", "Pennsylvania", 2, "8:58p", "5:21a",
    ["Galactic core", "M8 Lagoon", "M20 Trifid", "Scorpius"], [
    ["Tonight", "Jun 8", 82, 8,  14, 5, "2:15 – 5:00am", 0.55, 0.94, "1 am",  "2h 45m"],
    ["Mon",     "Jun 9", 34, 68, 22, 2, null, 0, 0, "—", "—"],
    ["Tue",     "Jun 10",28, 78, 31, 2, null, 0, 0, "—", "—"],
    ["Wed",     "Jun 11",55, 40, 42, 3, "2:40 – 4:30am", 0.62, 0.85, "2 am", "1h 20m"],
    ["Thu",     "Jun 12",88, 5,  54, 5, "12:30 – 5:05am", 0.40, 0.96, "11 pm","3h 40m"],
    ["Fri",     "Jun 13",79, 14, 66, 4, "1:30 – 4:50am", 0.50, 0.90, "12 am","2h 30m"],
  ]),
  mkLoc("Acworth", "Georgia", 6, "8:46p", "6:08a",
    ["Moon", "Jupiter", "Albireo", "M13"], [
    ["Tonight", "Jun 8", 31, 74, 14, 2, null, 0, 0, "—", "—"],
    ["Mon",     "Jun 9", 22, 82, 22, 1, null, 0, 0, "—", "—"],
    ["Tue",     "Jun 10",44, 52, 31, 3, "1:50 – 3:30am", 0.60, 0.80, "1 am", "1h 10m"],
    ["Wed",     "Jun 11",38, 60, 42, 2, null, 0, 0, "—", "—"],
    ["Thu",     "Jun 12",52, 44, 54, 3, "1:20 – 3:20am", 0.55, 0.78, "1 am", "1h 05m"],
    ["Fri",     "Jun 13",60, 30, 66, 4, "12:50 – 3:40am", 0.48, 0.82, "12 am","1h 40m"],
  ]),
  mkLoc("Moab", "Utah", 2, "8:52p", "5:58a",
    ["Milky Way", "Andromeda", "Scorpius", "M51"], [
    ["Tonight", "Jun 8", 71, 22, 14, 4, "12:40 – 4:30am", 0.45, 0.90, "12 am","2h 10m"],
    ["Mon",     "Jun 9", 64, 30, 22, 4, "1:00 – 4:10am", 0.50, 0.86, "12 am","2h 00m"],
    ["Tue",     "Jun 10",48, 48, 31, 3, "1:40 – 3:30am", 0.58, 0.80, "1 am", "1h 15m"],
    ["Wed",     "Jun 11",70, 24, 42, 4, "1:10 – 4:30am", 0.52, 0.92, "12 am","2h 20m"],
    ["Thu",     "Jun 12",75, 16, 54, 5, "12:50 – 4:50am", 0.46, 0.95, "11 pm","2h 50m"],
    ["Fri",     "Jun 13",58, 34, 66, 3, "1:30 – 3:50am", 0.55, 0.84, "1 am", "1h 30m"],
  ]),
];

/* What's up tonight — prime target + the visible-tonight catalogue, per location */
const SKY = {
  "Cherry Springs": {
    prime: { name: "Galactic Core", sub: "Milky Way · Sagittarius", visible: "11:10pm – 4:20am", dir: "SE → S", dirDeg: 158 },
    objects: [
      { name: "Lagoon Nebula",   cat: "M8",  con: "Sagittarius", type: "Emission nebula",   mag: 6.0, size: "90'", band: "Ha · broadband", quality: "Excellent" },
      { name: "Trifid Nebula",   cat: "M20", con: "Sagittarius", type: "Emission / reflection", mag: 6.3, size: "28'", band: "Broadband", quality: "Excellent" },
      { name: "Eagle Nebula",    cat: "M16", con: "Serpens",     type: "Emission nebula",   mag: 6.4, size: "35'", band: "Narrowband", quality: "Good" },
      { name: "Hercules Cluster",cat: "M13", con: "Hercules",    type: "Globular cluster",  mag: 5.8, size: "20'", band: "Broadband", quality: "Good" },
      { name: "Andromeda Galaxy",cat: "M31", con: "Andromeda",   type: "Spiral galaxy",     mag: 3.4, size: "178'",band: "Broadband", quality: "Mediocre" },
    ],
  },
  "Acworth": {
    prime: { name: "Jupiter", sub: "Planet · Taurus", visible: "1:05am – 5:40am", dir: "E → SE", dirDeg: 110 },
    objects: [
      { name: "The Moon",        cat: "—",   con: "Cancer",      type: "Lunar",             mag: -8.1,size: "31'", band: "Broadband", quality: "Good" },
      { name: "Albireo",         cat: "β Cyg",con: "Cygnus",     type: "Double star",       mag: 3.1, size: "—",   band: "Broadband", quality: "Good" },
      { name: "Ring Nebula",     cat: "M57", con: "Lyra",        type: "Planetary nebula",  mag: 8.8, size: "1.4'",band: "Narrowband", quality: "Mediocre" },
      { name: "Hercules Cluster",cat: "M13", con: "Hercules",    type: "Globular cluster",  mag: 5.8, size: "20'", band: "Broadband", quality: "Mediocre" },
    ],
  },
  "Moab": {
    prime: { name: "Galactic Core", sub: "Milky Way · Sagittarius", visible: "11:40pm – 4:35am", dir: "SE → S", dirDeg: 162 },
    objects: [
      { name: "Whirlpool Galaxy",cat: "M51", con: "Canes Ven.",  type: "Spiral galaxy",     mag: 8.4, size: "11'", band: "Broadband", quality: "Good" },
      { name: "Lagoon Nebula",   cat: "M8",  con: "Sagittarius",  type: "Emission nebula",   mag: 6.0, size: "90'", band: "Ha · broadband", quality: "Excellent" },
      { name: "Sombrero Galaxy", cat: "M104",con: "Virgo",        type: "Spiral galaxy",     mag: 8.0, size: "9'",  band: "Broadband", quality: "Good" },
      { name: "Pinwheel Galaxy", cat: "M101",con: "Ursa Major",   type: "Spiral galaxy",     mag: 7.9, size: "29'", band: "Broadband", quality: "Mediocre" },
    ],
  },
};
FORECAST.forEach((l) => Object.assign(l, SKY[l.name]));

Object.assign(window, { FORECAST, FACTOR_META, SEEING_WORD });
