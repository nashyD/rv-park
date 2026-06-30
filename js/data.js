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
  lat: 32.40708, lon: -80.63071,
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

// ---------- parcel boundary (local meters, ~25 ac) ----------
// The wooded block: Walmart + commercial to the W/NW, Airport Circle wrapping N/E,
// Sea Island Pkwy (US-21) + marsh to the S.
// Digitized over Esri imagery against geocoded anchors (Walmart bldg, 291 Sea
// Island frontage, ARW airport). Centroid ≈ origin so the layout sits inside it.
// The ~25-ac strip between Taylor Dr (W) and Airport Cir (E), fronting US-21 (S),
// digitized from the owner's outline over Esri imagery + geocoded road anchors.
export const PARCEL = [
  [-120, -221], [100, -236], [105, 224], [-85, 234],
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

// ---------- site rotation ----------
// The parcel runs NE–SW, so the whole resort is designed in a straight "design
// frame" (X = the long axis, Y = the short axis) and rotated into world meters.
export const SITE_ROT = 0; // the strip runs ~N–S; rows are E–W (no rotation)
const _rc = Math.cos(SITE_ROT), _rs = Math.sin(SITE_ROT);
export const rot = (x, y) => [x * _rc - y * _rs, x * _rs + y * _rc];

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
// row defined in the design frame, rotated into world coords
function rowD(ax, ay, bx, by, count, type, startId) {
  const [a0, a1] = rot(ax, ay), [b0, b1] = rot(bx, by);
  return rowPads(a0, a1, b0, b1, count, type, startId);
}
function glamping(startId) { return rowD(-25, 200, 60, 200, 6, 'glamping', startId); }
const rotRoads = (rds) => rds.map(r => r.map(p => rot(p[0], p[1])));

// "Optimized" — roomier layout, E–W rows stacked up the N–S strip.
// Footprint kept well inside the parcel so nothing touches the surrounding roads.
function layoutOptimized() {
  let id = 1; const pads = [];
  const rows = [
    [-86, 158, 80, 158, 12, 'backin'],
    [-90, 116, 82, 116, 13, 'backin'],
    [-92, 74, 82, 74, 13, 'pullthru'],
    [-90, 32, 80, 32, 13, 'pullthru'],
    [-86, -10, 76, -10, 12, 'backin'],
    [-82, -52, 72, -52, 11, 'backin'],
    [-76, -94, 66, -94, 11, 'backin'],
  ];
  for (const [ax, ay, bx, by, n, t] of rows) { pads.push(...rowD(ax, ay, bx, by, n, t, id)); id += n; }
  pads.push(...rowD(-68, -140, 58, -140, 8, 'premium', id)); id += 8;
  pads.push(...glamping(id)); id += 6;
  const roads = rotRoads([
    [[-4, -160], [-4, 188]],
    [[-90, 53], [82, 53]],
    [[-84, -31], [74, -31]],
  ]);
  return { pads, roads };
}

// "Max density" — tighter rows for the revenue ceiling, same road buffer.
function layoutMax() {
  let id = 1; const pads = [];
  const rows = [
    [-88, 165, 82, 165, 13, 'backin'],
    [-92, 127, 84, 127, 14, 'backin'],
    [-94, 89, 84, 89, 14, 'backin'],
    [-94, 51, 82, 51, 14, 'pullthru'],
    [-92, 13, 80, 13, 13, 'pullthru'],
    [-88, -25, 76, -25, 13, 'backin'],
    [-84, -63, 72, -63, 12, 'backin'],
    [-78, -101, 66, -101, 12, 'backin'],
  ];
  for (const [ax, ay, bx, by, n, t] of rows) { pads.push(...rowD(ax, ay, bx, by, n, t, id)); id += n; }
  pads.push(...rowD(-70, -142, 60, -142, 9, 'premium', id)); id += 9;
  pads.push(...glamping(id)); id += 6;
  const roads = rotRoads([
    [[-4, -162], [-4, 192]],
    [[-92, 70], [84, 70]],
    [[-90, -6], [78, -6]],
    [[-84, -82], [72, -82]],
  ]);
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
const AMEN_POS = {
  'Gatehouse & Entry': [-4, -178], 'Office & Camp Store': [34, -116],
  'Clubhouse & Pavilion': [40, 12], 'Resort Pool & Deck': [-46, 12],
  'Bathhouse North': [-50, 95], 'Bathhouse South': [40, -73],
  'Pickleball & Courts': [44, 138], 'Dog Park': [-54, -116],
  'Fishing Pond': [58, 180], 'Maintenance & Storage': [-66, -150],
};
for (const [name, a] of Object.entries(AMENITIES)) {
  const d = AMEN_POS[name]; if (d) { const [wx, wy] = rot(d[0], d[1]); a.x = wx; a.y = wy; }
}

// area labels (world m). Resort labels follow the rotated layout; context
// labels (Walmart, airport, marsh, parkway) sit on their real-world features.
export const AREAS = [
  { name: 'RESORT CORE', x: -2, y: 12 },
  { name: 'GLAMPING', x: 18, y: 200 },
  { name: 'AIRPORT', x: -300, y: 460 },
  { name: 'SEA ISLAND PKWY · US-21', x: 40, y: -270 },
  { name: 'WALMART', x: -215, y: 57 },
  { name: 'AIRPORT CIR', x: 175, y: 120 },
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
