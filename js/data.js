// Coosaw Landing — site data, parcel geometry, pad layouts, amenities, financials.
// Geometry is in LOCAL METERS: origin = parcel centroid, +x = east, +y = north.
// The renderer maps (x, y) -> Three.js (x, terrainY, -y). 1 unit = 1 meter.
// Coordinates are digitized by hand from the survey plat + Esri imagery — approximate.

export const SITE = {
  name: 'Coosaw Landing',
  brand: 'RV Resort & Marina',
  tagline: 'A waterfront RV resort on the Coosaw, minutes from Beaufort',
  address: '100–174 Airport Cir, Beaufort, SC 29906',
  county: 'Beaufort County · Lady’s Island, South Carolina',
  lat: 32.4088, lon: -80.6305,
  acres: 38.56,
  drive: {
    downtown: '10 min to downtown Beaufort',
    parris: '20 min to Parris Island (recruit graduations)',
    hunting: '35 min to Hunting Island State Park & beach',
    hilton: '45 min to Hilton Head',
    savannah: '1 h to Savannah, GA',
  },
  why: 'Tidal-marsh and Coosaw River frontage on the buildable upland, the county airport at the gate, and a year-round Lowcountry draw: Beaufort’s historic district, weekly Parris Island graduations, and overflow demand from Hunting Island’s storm-reduced campground.',
};

// ---------- money / number formatting ----------
export const M = (n) => '$' + (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + 'M' : Math.round(n / 1e3) + 'k');
export const D0 = (n) => '$' + Math.round(n).toLocaleString();
export const PCT = (n) => (n * 100).toFixed(n * 100 >= 100 ? 0 : 1) + '%';

// ---------- parcel boundary (local meters, ~38.56 ac) ----------
// Water/marsh lies to the north (+y) and east (+x); airport + entrance to the west.
export const PARCEL = [
  [-259, -137], [-273, 27], [-246, 159], [-109, 196], [36, 187],
  [137, 150], [187, 64], [205, -46], [178, -159], [18, -187], [-137, -178],
];

// Open water / tidal marsh zones (translucent sheen drawn over the satellite).
export const WATER = [
  { name: 'Coosaw River', pts: [[-600, 205], [600, 205], [600, 600], [-600, 600]] },
  { name: 'Tidal Creek', pts: [[212, -600], [600, -600], [600, 205], [212, 205]] },
];

// ---------- pad types ----------
// rate = base nightly; siteCapex shown on the card; color is the pad slab tint.
export const PAD_TYPES = {
  backin:     { label: 'Back-in full hookup', rate: 75,  len: 16, wid: 6.5, color: 0xc2c8cf, siteCapex: 38000 },
  pullthru:   { label: 'Pull-through (big-rig)', rate: 85, len: 23, wid: 6.5, color: 0xa7c2ad, siteCapex: 44000 },
  waterfront: { label: 'Waterfront premium', rate: 119, len: 18, wid: 7.5, color: 0x6fb6c8, siteCapex: 58000 },
  glamping:   { label: 'Glamping cabin', rate: 135, len: 8, wid: 6, color: 0xd9a05a, siteCapex: 62000 },
};

// ---------- pad-layout generators ----------
// Each returns { pads:[{id,type,x,y,rot}], roads:[[[x,y]...]] }. rot = pad long-axis angle.
function rowPads(ax, ay, bx, by, count, type, startId) {
  const out = [];
  const ang = Math.atan2(by - ay, bx - ax) + Math.PI / 2; // pad long axis perpendicular to the row
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    out.push({ id: startId + i, type, x: ax + (bx - ax) * t, y: ay + (by - ay) * t, rot: ang });
  }
  return out;
}
function arcPads(cx, cy, r, a0, a1, count, type, startId) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const a = (a0 + (a1 - a0) * t) * Math.PI / 180;
    out.push({ id: startId + i, type, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), rot: a }); // radial
  }
  return out;
}
function arcRoad(cx, cy, r, a0, a1, steps = 24) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (a0 + (a1 - a0) * i / steps) * Math.PI / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

// "My Sketch" — curved rows fanning across the upland, echoing the hand-drawn plan.
function layoutSketch() {
  const C = [-40, -490]; // arc center south of the parcel
  let id = 1; const pads = [];
  const arcs = [
    [330, 15], [372, 16], [414, 16], [456, 15], [498, 13],
  ];
  for (const [r, n] of arcs) { pads.push(...arcPads(C[0], C[1], r, 60, 117, n, 'backin', id)); id += n; }
  pads.push(...arcPads(C[0], C[1], 540, 64, 113, 12, 'pullthru', id)); id += 12;
  pads.push(...arcPads(C[0], C[1], 588, 70, 108, 11, 'waterfront', id)); id += 11;
  pads.push(...glamping(id)); id += 6;
  const roads = [
    arcRoad(C[0], C[1], 351, 58, 119), arcRoad(C[0], C[1], 435, 58, 119),
    arcRoad(C[0], C[1], 519, 60, 116), arcRoad(C[0], C[1], 564, 62, 112),
    [[-255, -40], [-150, -70], [-70, -120], [-40, -160]], // entrance spur
  ];
  return { pads, roads };
}

// "Optimized" — straight double-loaded rows on the west/center upland; amenities east.
function layoutOptimized() {
  let id = 1; const pads = [];
  const rows = [
    [-232, -152, 64, -152, 18, 'backin'],
    [-232, -112, 64, -112, 18, 'backin'],
    [-232, -64, 24, -64, 14, 'backin'],
    [-232, -16, 24, -16, 14, 'pullthru'],
    [-224, 40, -34, 40, 10, 'pullthru'],
    [-224, 86, -64, 86, 8, 'backin'],
    [-96, 150, 112, 150, 12, 'waterfront'],
  ];
  for (const [ax, ay, bx, by, n, t] of rows) { pads.push(...rowPads(ax, ay, bx, by, n, t, id)); id += n; }
  pads.push(...glamping(id)); id += 6;
  const roads = [
    [[-255, -40], [-150, -38], [-40, -38], [60, -40], [150, -36]],   // entry spine
    [[-150, -160], [-150, 160]], [[60, -160], [60, 160]],            // cross loops
    [[-96, 130], [150, 130]],                                        // waterfront drive
  ];
  return { pads, roads };
}

// shared glamping cluster on the NE waterfront
function glamping(startId) {
  return arcPads(40, -360, 500, 47, 60, 6, 'glamping', startId);
}

export const LAYOUTS = {
  sketch: { label: 'My Sketch', build: layoutSketch },
  optimized: { label: 'Optimized', build: layoutOptimized },
};

// ---------- amenities (clickable, with ROI) ----------
export const CATS = {
  core:    { color: 0xe0a955, label: 'Core / front desk' },
  rec:     { color: 0x2f9e8f, label: 'Recreation' },
  water:   { color: 0x3f7d97, label: 'Waterfront' },
  service: { color: 0x8a93a0, label: 'Service' },
  lodging: { color: 0xd98b4a, label: 'Lodging' },
};

// [x,y] = footprint center (local m); w,h = footprint meters.
export const AMENITIES = {
  'Gatehouse & Entry': {
    cat: 'core', x: -262, y: -88, w: 10, h: 7, phase: 1,
    role: 'Staffed entry, gate arm, welcome plaza off Airport Circle',
    capex: 95000, revenue: 'Non-revenue — secures the gated-resort premium', payback: 'Infrastructure',
    why: 'First impression at the Airport Circle approach; keeps day-traffic out and lets late arrivals self-check-in.',
  },
  'Office & Camp Store': {
    cat: 'core', x: -244, y: -32, w: 22, h: 14, phase: 1,
    role: 'Front desk, camp store, coffee bar, propane counter',
    capex: 280000, revenue: 'Store + propane margin ≈ $46k/yr', payback: '~6 yr; anchors guest spend',
    why: 'At the entry so every guest passes it; the store and propane are high-margin convenience revenue.',
  },
  'Clubhouse & Pavilion': {
    cat: 'core', x: 120, y: -42, w: 30, h: 20, phase: 2,
    role: 'Lounge, kitchen, events room, screened porch over the marsh',
    capex: 460000, revenue: 'Events + private rentals ≈ $55k/yr', payback: '8–12 yr; lifts nightly rate & retention',
    why: 'Marsh-view social heart of the resort; rentable for rallies, reunions, and Parris Island graduation weekends.',
  },
  'Resort Pool & Deck': {
    cat: 'rec', x: 122, y: -78, w: 24, h: 18, phase: 2,
    role: 'Saltwater pool, sun deck, hot tub, shade cabanas',
    capex: 190000, revenue: 'Supports +$10–15/night rate lift', payback: '6–10 yr (indirect)',
    why: 'The amenity guests filter for; pays back through higher rates and summer occupancy.',
  },
  'Bathhouse North': {
    cat: 'service', x: -28, y: 118, w: 16, h: 10, phase: 1,
    role: 'Restrooms, private showers, family room',
    capex: 175000, revenue: 'Non-revenue — required, drives reviews', payback: 'Infrastructure',
    why: 'Serves the waterfront and northern rows within a short walk.',
  },
  'Bathhouse South': {
    cat: 'service', x: 96, y: -120, w: 16, h: 10, phase: 1,
    role: 'Restrooms, showers, laundry annex',
    capex: 195000, revenue: 'Laundry ≈ $9k/yr', payback: 'Infrastructure + small recurring',
    why: 'Centers the south rows; laundry is a low-effort recurring revenue line.',
  },
  'Boat Ramp & Dock': {
    cat: 'water', x: 165, y: 138, w: 8, h: 8, phase: 2,
    role: 'Kayak/jon-boat ramp, floating dock, fish-cleaning station',
    capex: 165000, revenue: 'Mostly an amenity; ~breakeven on launch/slip fees', payback: 'Amenity — sells the waterfront sites',
    why: 'Coosaw access is the headline. Bundled into waterfront-site pricing rather than nickel-and-dimed.',
  },
  'Pickleball & Courts': {
    cat: 'rec', x: 150, y: 28, w: 18, h: 14, phase: 3,
    role: 'Two pickleball courts + bocce',
    capex: 55000, revenue: 'Indirect occupancy lift; league nights', payback: '5–10 yr (indirect)',
    why: 'Top-requested amenity for the snowbird and active-retiree segment that fills the shoulder season.',
  },
  'Dog Park': {
    cat: 'rec', x: 152, y: 74, w: 22, h: 16, phase: 1,
    role: 'Fenced off-leash run with agility + wash station',
    capex: 14000, revenue: 'Indirect — pet-friendly draw', payback: '2–4 yr (indirect)',
    why: 'Cheap to build, heavily marketed; the pet-travel segment books pet-friendly parks first.',
  },
  'Maintenance & Storage': {
    cat: 'service', x: -250, y: 70, w: 18, h: 12, phase: 1,
    role: 'Shop, equipment barn, RV/boat storage yard',
    capex: 130000, revenue: 'Off-season RV/boat storage ≈ $28k/yr', payback: '4–6 yr',
    why: 'Tucked at the back by the entry; storage monetizes the off-season and keeps gear out of sight.',
  },
};

// area labels (local m)
export const AREAS = [
  { name: 'WATERFRONT ROW', x: 10, y: 158 },
  { name: 'GLAMPING VILLAGE', x: 150, y: 110 },
  { name: 'RESORT CORE', x: 120, y: -60 },
  { name: 'THE COOSAW', x: 240, y: 300 },
  { name: 'TIDAL CREEK', x: 330, y: -120 },
  { name: 'AIRPORT CIRCLE', x: -300, y: -60 },
];

// ---------- financial model ----------
// Base case from coastal-SC research; ranges drive the sliders; scenarios are presets.
export const FINANCE = {
  base: {
    occupancy: 0.68,
    rate: 1.0,          // nightly-rate multiplier on PAD_TYPES base rates
    opexRatio: 0.60,
    capexPerSite: 46500, // turnkey $/site incl. roads, utilities, amenities, contingency
    capRate: 0.085,
    ltv: 0.70,
    interest: 0.07,
    termYears: 25,
    landCost: 480000,
    ancillary: 33000,   // store/propane/laundry/storage at base occupancy
    rentGrowth: 0.04,
  },
  ranges: {
    occupancy: { min: 0.45, max: 0.85, step: 0.01, fmt: 'pct' },
    rate: { min: 0.7, max: 1.3, step: 0.01, fmt: 'mult' },
    opexRatio: { min: 0.45, max: 0.72, step: 0.01, fmt: 'pct' },
    capexPerSite: { min: 35000, max: 65000, step: 500, fmt: 'usd' },
    capRate: { min: 0.06, max: 0.11, step: 0.0025, fmt: 'pct' },
    ltv: { min: 0, max: 0.8, step: 0.05, fmt: 'pct' },
    interest: { min: 0.05, max: 0.10, step: 0.0025, fmt: 'pct' },
  },
  scenarios: {
    conservative: { label: 'Conservative', occupancy: 0.60, rate: 0.88, opexRatio: 0.66, capRate: 0.095 },
    base: { label: 'Base', occupancy: 0.68, rate: 1.0, opexRatio: 0.60, capRate: 0.085 },
    upside: { label: 'Upside', occupancy: 0.74, rate: 1.12, opexRatio: 0.55, capRate: 0.08 },
  },
  // relative weights for the non-land capex split (scaled to live dev cost in the brief)
  capexWeights: [
    ['Site work, grading, stormwater', 760],
    ['Roads + 50-amp power, water, sewer backbone', 1180],
    ['Pad construction + hookups', 980],
    ['Amenities (clubhouse, pool, bathhouses, dock)', 1310],
    ['Permitting, engineering, legal (coastal premium)', 240],
    ['Contingency', 590],
  ],
  disclaimer: 'AACE Class-5 concept estimate (−30% / +50%), 2026 USD, pre-tax. Survey, geotech, SCDES coastal/wetland permitting, and FEMA elevation requirements will move numbers. Not for construction.',
};

// brief feasibility footnote (per the plan: kept brief, surfaced in the Developer Brief)
export const FEASIBILITY = 'Due diligence: Beaufort County currently restricts RVs as structures county-wide — the resort path runs through a special-use permit / campground approval (budget a land-use attorney). The Coosaw frontage is likely FEMA AE/VE flood zone (elevate structures above BFE) and tidal-marsh work needs SCDES/USACE permits. Confirm the exact parcel, zoning district, and BFE before committing capital.';
