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
  lat: 32.4052, lon: -80.6318,
  acres: 25,
  drive: {
    walmart: 'Walk to the Walmart Supercenter next door',
    downtown: '10 min to downtown Beaufort',
    hunting: '30 min up US-21 to Hunting Island beach',
    parris: '20 min to Parris Island (recruit graduations)',
    savannah: '1 h to Savannah, GA',
  },
  why: 'A rare 25-acre infill tract on Sea Island Parkway (US-21), the gateway from Beaufort to St. Helena, Hunting Island’s beach, and Fripp Island. A Walmart Supercenter sits next door for groceries and supplies, the county airport is at the gate, and downtown Beaufort is ten minutes west. Year-round Lowcountry demand from beach traffic, Parris Island graduations, and winter snowbirds.',
};

// ---------- money / number formatting ----------
export const M = (n) => '$' + (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + 'M' : Math.round(n / 1e3) + 'k');
export const D0 = (n) => '$' + Math.round(n).toLocaleString();
export const PCT = (n) => (n * 100).toFixed(n * 100 >= 100 ? 0 : 1) + '%';

// ---------- parcel boundary (local meters, ~25 ac) ----------
// The wooded block: Walmart + commercial to the W/NW, Airport Circle wrapping N/E,
// Sea Island Pkwy (US-21) + marsh to the S.
export const PARCEL = [
  [-212, -108], [-218, 42], [-135, 128], [10, 145], [158, 128],
  [190, 28], [170, -105], [22, -135], [-118, -128],
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

// ---------- pad-layout generators ----------
function rowPads(ax, ay, bx, by, count, type, startId) {
  const out = [];
  const ang = Math.atan2(by - ay, bx - ax) + Math.PI / 2;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    out.push({ id: startId + i, type, x: ax + (bx - ax) * t, y: ay + (by - ay) * t, rot: ang });
  }
  return out;
}
function glamping(startId) {
  return rowPads(55, 108, 140, 108, 6, 'glamping', startId);
}

// "Optimized" — roomier layout (~77 sites), good flow.
function layoutOptimized() {
  let id = 1; const pads = [];
  const rows = [
    [-180, -105, 35, -105, 13, 'backin'],
    [-180, -70, 35, -70, 13, 'backin'],
    [-180, -32, 15, -32, 11, 'pullthru'],
    [-180, 5, 15, 5, 11, 'pullthru'],
    [-165, 42, -15, 42, 8, 'backin'],
    [-150, 82, 0, 82, 7, 'backin'],
  ];
  for (const [ax, ay, bx, by, n, t] of rows) { pads.push(...rowPads(ax, ay, bx, by, n, t, id)); id += n; }
  pads.push(...rowPads(150, -95, 150, 45, 7, 'premium', id)); id += 7;
  pads.push(...glamping(id)); id += 6;
  const roads = [
    [[-30, -130], [-30, -105], [-30, 85]],
    [[-180, -88], [150, -88]],
    [[-180, 22], [60, 22]],
    [[150, -95], [150, 50]],
  ];
  return { pads, roads };
}

// "Max density" — tighter rows (~91 sites) for the revenue ceiling.
function layoutMax() {
  let id = 1; const pads = [];
  const rows = [
    [-185, -105, 55, -105, 15, 'backin'],
    [-185, -72, 55, -72, 15, 'backin'],
    [-185, -40, 35, -40, 13, 'backin'],
    [-185, -8, 35, -8, 13, 'pullthru'],
    [-175, 26, 20, 26, 11, 'pullthru'],
    [-160, 62, -5, 62, 9, 'backin'],
  ];
  for (const [ax, ay, bx, by, n, t] of rows) { pads.push(...rowPads(ax, ay, bx, by, n, t, id)); id += n; }
  pads.push(...rowPads(155, -95, 155, 55, 8, 'premium', id)); id += 8;
  pads.push(...glamping(id)); id += 6;
  const roads = [
    [[-30, -130], [-30, -105], [-30, 58]],
    [[-185, -56], [155, -56]],
    [[-185, 9], [40, 9]],
    [[155, -95], [155, 55]],
  ];
  return { pads, roads };
}

export const LAYOUTS = {
  optimized: { label: 'Optimized', build: layoutOptimized },
  max: { label: 'Max density', build: layoutMax },
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
    cat: 'water', x: 175, y: -55, w: 34, h: 26, phase: 2,
    role: 'Stocked stormwater pond with a pier and benches',
    capex: 120000, revenue: 'Amenity + doubles as stormwater detention', payback: 'Amenity (dual-purpose infrastructure)',
    why: 'Turns required detention into a feature; a quiet catch-and-release draw on the marsh-side edge.',
  },
  'Maintenance & Storage': {
    cat: 'service', x: -205, y: -95, w: 18, h: 12, phase: 1,
    role: 'Shop, equipment barn, RV/boat storage yard',
    capex: 130000, revenue: 'Off-season RV/boat storage ≈ $30k/yr', payback: '4–6 yr',
    why: 'Tucked at the back by the commercial edge; storage monetizes the off-season and screens the service area.',
  },
};

// area labels (local m)
export const AREAS = [
  { name: 'RESORT CORE', x: 55, y: 5 },
  { name: 'GLAMPING', x: 90, y: 126 },
  { name: 'AIRPORT', x: -30, y: 215 },
  { name: 'SEA ISLAND PKWY · US-21', x: -30, y: -180 },
  { name: 'WALMART', x: -410, y: 70 },
  { name: 'MARSH', x: 150, y: -210 },
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
