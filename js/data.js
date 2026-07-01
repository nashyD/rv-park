// Sea Island RV Resort — site data, parcel geometry, pad layouts, amenities, financials.
// Geometry is in LOCAL METERS: origin = parcel centroid, +x = east, +y = north.
// The renderer maps (x, y) -> Three.js (x, groundY, -y). 1 unit = 1 meter.
// Real ~25-ac infill tract between the Walmart and Airport Circle on Lady's Island.

export const SITE = {
  name: 'Sea Island RV Resort',
  brand: 'RV Resort',
  tagline: 'A wooded RV resort on Sea Island Parkway, Beaufort’s gateway to the beaches',
  address: '291 Sea Island Pkwy + adjacent tracts, Beaufort, SC 29907',
  county: 'Beaufort County · Lady’s Island, South Carolina',
  lat: 32.40706, lon: -80.63064,
  acres: 25,
  drive: {
    walmart: 'Walk to the Walmart Supercenter next door',
    downtown: '10 min to downtown Beaufort',
    hunting: '30 min up US-21 to Hunting Island beach',
    parris: '20 min to Parris Island (recruit graduations)',
    savannah: '1 h to Savannah, GA',
  },
  why: 'A rare infill tract on Sea Island Parkway (US-21), the gateway from Beaufort to St. Helena, Hunting Island’s beach, and Fripp Island. A Walmart Supercenter sits next door for groceries and supplies, the county airport is at the gate, and downtown Beaufort is ten minutes west. Year-round Lowcountry demand from beach traffic, Parris Island graduations, and winter snowbirds.',
};

// ---------- money / number formatting ----------
export const M = (n) => '$' + (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + 'M' : Math.round(n / 1e3) + 'k');
export const D0 = (n) => '$' + Math.round(n).toLocaleString();
export const PCT = (n) => (n * 100).toFixed(n * 100 >= 100 ? 0 : 1) + '%';

// ---------- parcel boundary (local meters) ----------
// The real ~25.4-ac assemblage, unioned from Beaufort County GIS (EnerGov parcel
// layer), anchored on 291 Sea Island Pkwy. PINs R200-018: 0060 (291 Sea Island,
// Atkins) · 0064 (307 Sea Island, Drive N Range) · 0062 (64 Airport Cir, Glover)
// · 062A + 0264 (rear, Drive N Range). Centroid at origin. 1 unit = 1 m.
export const PARCEL = [
  [-32.6, -219.5], [-72.3, -286.3], [-130.8, -251.8], [-21.9, -68.4], [-80.3, -33.9],
  [-189.2, -217.4], [-259.8, -175.8], [-77.4, 120.9], [-11.5, 81.9], [114.6, 294.4],
  [146.4, 277.7], [130.2, 250.1], [158.4, 235.2], [174.8, 262.7], [235.0, 231.1],
  [126.0, 47.6], [152.4, 32.5], [-6.6, -235.2],
];

// No river frontage — the marsh is across US-21. No on-parcel open water.
export const WATER = [];

// ---------- pad types ----------
export const PAD_TYPES = {
  backin:   { label: 'Back-in full hookup', rate: 72, len: 16, wid: 6.5, color: 0xc2c8cf, siteCapex: 36000 },
  pullthru: { label: 'Pull-through (big-rig)', rate: 82, len: 23, wid: 6.5, color: 0xa7c2ad, siteCapex: 42000 },
  premium:  { label: 'Premium patio site', rate: 99, len: 18, wid: 7.5, color: 0x7fb2a0, siteCapex: 50000 },
  glamping: { label: 'Glamping cabin', rate: 129, len: 8, wid: 6, color: 0xd9a05a, siteCapex: 60000 },
};

// ---------- site orientation ----------
// Long axis of the real parcel band (Beaufort County GIS minimum rotated rectangle).
export const SITE_ROT = 1.035; // rad ≈ 59.3°
const _rc = Math.cos(SITE_ROT), _rs = Math.sin(SITE_ROT);
export const rot = (x, y) => [x * _rc - y * _rs, x * _rs + y * _rc];  // design → world
const unrot = (x, y) => [x * _rc + y * _rs, -x * _rs + y * _rc];      // world → design

// ---------- geometry helpers ----------
function pip(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function edgeDist(x, y, poly) {
  let m = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j][0], ay = poly[j][1], dx = poly[i][0] - ax, dy = poly[i][1] - ay;
    const L = dx * dx + dy * dy; let t = L ? ((x - ax) * dx + (y - ay) * dy) / L : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy)); if (d < m) m = d;
  }
  return m;
}
const inMargin = (x, y, m) => pip(x, y, PARCEL) && edgeDist(x, y, PARCEL) >= m;

// ---------- parametric layout ----------
// Fill the real parcel with rows along its long axis, every pad set back `margin` m
// from each property line so nothing touches the roads. Re-snaps to any PARCEL edit.
const CROSS = 132, AISLE = 9; // cross drive-aisle period + half-width (m)
function fillLayout(rowGap, padGap, margin) {
  let minu = 1e9, maxu = -1e9, minv = 1e9, maxv = -1e9;
  for (const [x, y] of PARCEL) { const [u, v] = unrot(x, y); if (u < minu) minu = u; if (u > maxu) maxu = u; if (v < minv) minv = v; if (v > maxv) maxv = v; }
  const inAisle = (u) => { const p = ((u - minu) % CROSS + CROSS) % CROSS; return Math.abs(p - CROSS / 2) < AISLE; };
  const rows = [];
  for (let v = minv + rowGap / 2; v <= maxv; v += rowGap) {
    let start = null, prev = null;
    for (let u = minu; u <= maxu + 2; u += 2) {
      const [wx, wy] = rot(u, v); const ok = u <= maxu && inMargin(wx, wy, margin);
      if (ok && start === null) start = u;
      if (!ok && start !== null) { if (prev - start >= padGap) rows.push([start, prev, v]); start = null; }
      if (ok) prev = u;
    }
  }
  // rows nearest the quiet NE end (max v) become premium then glamping
  rows.sort((a, b) => a[2] - b[2]);
  const pads = []; let id = 1; const nr = rows.length;
  rows.forEach((r, ri) => {
    const [ua, ub, v] = r;
    let type = ri % 3 === 1 ? 'pullthru' : 'backin', cap = 0;
    if (ri === nr - 1) { type = 'glamping'; cap = 6; }
    else if (ri === nr - 2) type = 'premium';
    const n = Math.max(1, Math.round((ub - ua) / padGap)); let placed = 0;
    for (let i = 0; i <= n; i++) {
      const u = ua + (ub - ua) * (n === 0 ? 0.5 : i / n);
      if (inAisle(u)) continue;
      const [x, y] = rot(u, v); pads.push({ id: id++, type, x, y, rot: SITE_ROT + Math.PI / 2 });
      if (cap && ++placed >= cap) break;
    }
  });
  // roads: centre spine along the band + aligned cross drive-aisles
  const midv = (minv + maxv) / 2, roads = [];
  const clip = (au, av, bu, bv) => { const pts = []; const steps = Math.max(2, Math.hypot(bu - au, bv - av) / 8);
    for (let i = 0; i <= steps; i++) { const t = i / steps, p = rot(au + (bu - au) * t, av + (bv - av) * t); if (inMargin(p[0], p[1], margin * 0.5)) pts.push(p); } return pts; };
  const spine = clip(minu, midv, maxu, midv); if (spine.length > 1) roads.push(spine);
  for (let uc = minu + CROSS / 2; uc < maxu; uc += CROSS) { const seg = clip(uc, minv, uc, maxv); if (seg.length > 1) roads.push(seg); }
  return { pads, roads };
}

export const LAYOUTS = {
  optimized: { label: 'Optimized', build: () => fillLayout(42, 11, 26) },
  max: { label: 'Max density', build: () => fillLayout(34, 9.5, 24) },
};

// ---------- amenities (clickable, with ROI) ----------
export const CATS = {
  core:    { color: 0xe0a955, label: 'Core / front desk' },
  rec:     { color: 0x2f9e8f, label: 'Recreation' },
  water:   { color: 0x3f7d97, label: 'Water feature' },
  service: { color: 0x8a93a0, label: 'Service' },
  lodging: { color: 0xd98b4a, label: 'Lodging' },
};

export const AMENITIES = {
  'Gatehouse & Entry': {
    cat: 'core', x: -40, y: -138, w: 10, h: 7, phase: 1,
    role: 'Staffed entry and gate arm off Sea Island Parkway',
    capex: 95000, revenue: 'Non-revenue — secures the gated-resort premium', payback: 'Infrastructure',
    why: 'Fronts US-21 for an easy, visible turn-in; a second service gate can tie to Airport Circle.',
  },
  'Office & Camp Store': {
    cat: 'core', x: -40, y: -100, w: 22, h: 14, phase: 1,
    role: 'Front desk, camp store, coffee bar, propane counter',
    capex: 280000, revenue: 'Store + propane margin ≈ $44k/yr', payback: '~6 yr; anchors guest spend',
    why: 'At the entry so every guest passes it; with a Walmart next door, the store stays lean and high-margin.',
  },
  'Clubhouse & Pavilion': {
    cat: 'core', x: 60, y: 20, w: 30, h: 20, phase: 2,
    role: 'Lounge, kitchen, events room, covered pavilion',
    capex: 440000, revenue: 'Events + private rentals ≈ $52k/yr', payback: '8–12 yr; lifts nightly rate & retention',
    why: 'Central social heart; rentable for rallies, reunions, and Parris Island graduation weekends.',
  },
  'Resort Pool & Deck': {
    cat: 'rec', x: 60, y: -15, w: 24, h: 18, phase: 2,
    role: 'Saltwater pool, sun deck, hot tub, shade cabanas',
    capex: 190000, revenue: 'Supports +$10–15/night rate lift', payback: '6–10 yr (indirect)',
    why: 'The amenity guests filter for; pays back through higher rates and summer occupancy.',
  },
  'Bathhouse North': {
    cat: 'service', x: -70, y: 68, w: 16, h: 10, phase: 1,
    role: 'Restrooms, private showers, family room',
    capex: 175000, revenue: 'Non-revenue — required, drives reviews', payback: 'Infrastructure',
    why: 'Serves the northern rows within a short walk.',
  },
  'Bathhouse South': {
    cat: 'service', x: 40, y: -92, w: 16, h: 10, phase: 1,
    role: 'Restrooms, showers, laundry annex',
    capex: 195000, revenue: 'Laundry ≈ $9k/yr', payback: 'Infrastructure + small recurring',
    why: 'Centers the south rows; laundry is a low-effort recurring line.',
  },
  'Pickleball & Courts': {
    cat: 'rec', x: 120, y: 72, w: 18, h: 14, phase: 3,
    role: 'Two pickleball courts + bocce',
    capex: 55000, revenue: 'Indirect occupancy lift; league nights', payback: '5–10 yr (indirect)',
    why: 'Top-requested amenity for the snowbird and active-retiree segment that fills the shoulder season.',
  },
  'Dog Park': {
    cat: 'rec', x: 150, y: 18, w: 22, h: 16, phase: 1,
    role: 'Fenced off-leash run with agility + wash station',
    capex: 14000, revenue: 'Indirect — pet-friendly draw', payback: '2–4 yr (indirect)',
    why: 'Cheap to build, heavily marketed; the pet-travel segment books pet-friendly parks first.',
  },
  'Fishing Pond': {
    cat: 'water', x: 158, y: -58, w: 34, h: 26, phase: 2,
    role: 'Stocked stormwater pond with a pier and benches',
    capex: 120000, revenue: 'Amenity + doubles as stormwater detention', payback: 'Amenity (dual-purpose infrastructure)',
    why: 'Turns required detention into a feature; a quiet catch-and-release draw on the marsh-side edge.',
  },
  'Maintenance & Storage': {
    cat: 'service', x: -120, y: -132, w: 18, h: 12, phase: 1,
    role: 'Shop, equipment barn, RV/boat storage yard',
    capex: 130000, revenue: 'Off-season RV/boat storage ≈ $30k/yr', payback: '4–6 yr',
    why: 'Tucked at the back by the commercial edge; storage monetizes the off-season and screens the service area.',
  },
};

// Amenity positions are authored in the design frame (gaps between rows), then
// rotated into world meters so they line up with the tilted resort.
// design-frame (long axis = u), rotated into world; nudged to sit in the parcel
const AMEN_POS = {
  'Gatehouse & Entry': [-120, -32], 'Office & Camp Store': [-78, -32],
  'Clubhouse & Pavilion': [8, 6], 'Resort Pool & Deck': [8, -34],
  'Bathhouse North': [120, 18], 'Bathhouse South': [-52, -24],
  'Pickleball & Courts': [188, 8], 'Dog Park': [62, 34],
  'Fishing Pond': [232, -6], 'Maintenance & Storage': [-138, -42],
};
for (const [name, a] of Object.entries(AMENITIES)) {
  const d = AMEN_POS[name]; if (d) { const [wx, wy] = rot(d[0], d[1]); a.x = wx; a.y = wy; }
}

// area labels (world m). Resort labels follow the rotated layout; context
// labels (Walmart, airport, marsh, parkway) sit on their real-world features.
export const AREAS = [
  { name: 'RESORT CORE', x: -1, y: 10 },
  { name: 'GLAMPING', x: -70, y: 105 },
  { name: 'AIRPORT', x: -330, y: 440 },
  { name: 'SEA ISLAND PKWY · US-21', x: -100, y: -285 },
  { name: 'WALMART', x: -224, y: 60 },
  { name: 'AIRPORT CIR', x: 290, y: 120 },
  { name: 'TAYLOR DR', x: -140, y: -213 },
];

// ---------- financial model ----------
export const FINANCE = {
  base: {
    occupancy: 0.66,
    rate: 1.0,
    opexRatio: 0.60,
    capexPerSite: 45000,
    capRate: 0.085,
    ltv: 0.70,
    interest: 0.07,
    termYears: 25,
    landCost: 2000000,   // 291 Sea Island ($1.1M / 6.6 ac) + ~18 ac assemblage — assumption
    ancillary: 28000,
    rentGrowth: 0.04,
  },
  ranges: {
    occupancy: { min: 0.45, max: 0.85, step: 0.01, fmt: 'pct' },
    rate: { min: 0.7, max: 1.3, step: 0.01, fmt: 'mult' },
    opexRatio: { min: 0.45, max: 0.72, step: 0.01, fmt: 'pct' },
    capexPerSite: { min: 32000, max: 62000, step: 500, fmt: 'usd' },
    capRate: { min: 0.06, max: 0.11, step: 0.0025, fmt: 'pct' },
    ltv: { min: 0, max: 0.8, step: 0.05, fmt: 'pct' },
    interest: { min: 0.05, max: 0.10, step: 0.0025, fmt: 'pct' },
  },
  scenarios: {
    conservative: { label: 'Conservative', occupancy: 0.58, rate: 0.9, opexRatio: 0.66, capRate: 0.095 },
    base: { label: 'Base', occupancy: 0.66, rate: 1.0, opexRatio: 0.60, capRate: 0.085 },
    upside: { label: 'Upside', occupancy: 0.72, rate: 1.12, opexRatio: 0.55, capRate: 0.08 },
  },
  capexWeights: [
    ['Site work, clearing, grading, stormwater', 820],
    ['Roads + 50-amp power, water, sewer backbone', 1180],
    ['Pad construction + hookups', 980],
    ['Amenities (clubhouse, pool, bathhouses, pond)', 1180],
    ['Permitting, engineering, legal', 220],
    ['Contingency', 560],
  ],
  disclaimer: 'AACE Class-5 concept estimate (−30% / +50%), 2026 USD, pre-tax. Land is an assemblage assumption (291 Sea Island at $1.1M plus ~18 surrounding acres). Survey, geotech, SCDES wetland buffers, and county campground approval will move numbers. Not for construction.',
};

export const FEASIBILITY = 'Due diligence: Beaufort County restricts RVs as structures county-wide — the resort runs through a special-use / campground approval (budget a land-use attorney). Confirm the ~18-acre assemblage around 291 Sea Island Pkwy, the zoning, and access points on Airport Circle and US-21. Tidal marsh borders the south and east — hold SCDES/USACE wetland buffers and design stormwater for the flood zone. Verify utility capacity from the adjacent commercial corridor.';
