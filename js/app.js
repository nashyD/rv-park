// Sea Island RV Resort — interactive 3D RV-resort master plan.
// Real Esri World Imagery draped over the parcel; pads/amenities in 3D;
// every interaction feeds the live pro forma. Flat Lowcountry datum: 1 unit = 1 m.
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { SITE, SITE_ROT, PARCEL, WATER, PAD_TYPES, LAYOUTS, AMENITIES, CATS, AREAS, FINANCE, FEASIBILITY, M, D0, PCT } from './data.js';
import { compute, drawChart } from './proforma.js';

// ---------- geo / projection ----------
const CLAT = SITE.lat, CLON = SITE.lon;
const MLAT = 110574, MLON = 111320 * Math.cos(CLAT * Math.PI / 180);
const EXT = { x0: -760, x1: 760, y0: -760, y1: 760 };
const ll2xy = (lat, lon) => [(lon - CLON) * MLON, (lat - CLAT) * MLAT];
const xy2ll = (x, y) => [CLAT + y / MLAT, CLON + x / MLON];
const R = 6378137;
const mercX = (lon) => R * lon * Math.PI / 180;
const mercY = (lat) => R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
const tile2mercX = (tx, z) => (tx / 2 ** z * 2 - 1) * Math.PI * R;
const tile2mercY = (ty, z) => (1 - ty / 2 ** z * 2) * Math.PI * R;
const [latS] = xy2ll(0, EXT.y0), [latN] = xy2ll(0, EXT.y1);
const [, lonW] = xy2ll(EXT.x0, 0), [, lonE] = xy2ll(EXT.x1, 0);
const MRECT = { x0: mercX(lonW), x1: mercX(lonE), y0: mercY(latS), y1: mercY(latN) };

async function stitch(z, urlFn, px) {
  const n = 2 ** z;
  const tx0 = Math.floor((MRECT.x0 / (Math.PI * R) + 1) / 2 * n);
  const tx1 = Math.floor((MRECT.x1 / (Math.PI * R) + 1) / 2 * n);
  const ty0 = Math.floor((1 - MRECT.y1 / (Math.PI * R)) / 2 * n);
  const ty1 = Math.floor((1 - MRECT.y0 / (Math.PI * R)) / 2 * n);
  const cv = document.createElement('canvas');
  cv.width = px; cv.height = Math.round(px * (MRECT.y1 - MRECT.y0) / (MRECT.x1 - MRECT.x0));
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#2b3a33'; ctx.fillRect(0, 0, cv.width, cv.height);
  const jobs = []; let done = 0; const total = (tx1 - tx0 + 1) * (ty1 - ty0 + 1);
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) {
    jobs.push((async () => {
      const img = await loadImg(urlFn(z, tx, ty)).catch(() => null);
      if (img) {
        const mx0 = tile2mercX(tx, z), mx1 = tile2mercX(tx + 1, z);
        const my1 = tile2mercY(ty, z), my0 = tile2mercY(ty + 1, z);
        const X = (mx0 - MRECT.x0) / (MRECT.x1 - MRECT.x0) * cv.width;
        const Y = (MRECT.y1 - my1) / (MRECT.y1 - MRECT.y0) * cv.height;
        const Wd = (mx1 - mx0) / (MRECT.x1 - MRECT.x0) * cv.width;
        const Hd = (my1 - my0) / (MRECT.y1 - MRECT.y0) * cv.height;
        ctx.drawImage(img, X, Y, Wd + 0.5, Hd + 0.5);
      }
      loadTick(++done / total);
    })());
  }
  await Promise.all(jobs);
  return cv;
}
function loadImg(url) {
  return new Promise((res, rej) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => res(im); im.onerror = rej; im.src = url;
  });
}

// ---------- loading overlay ----------
const loadEl = document.getElementById('loading');
const loadBar = document.getElementById('loadbar');
const loadMsg = document.getElementById('loadmsg');
function loadTick(f) { loadBar.style.width = Math.round(f * 100) + '%'; }
function loadStage(t) { loadMsg.textContent = t; }

// ---------- scene ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd3c8b4, 2300, 3900);
const camera = new THREE.PerspectiveCamera(46, 2, 1, 14000);
camera.position.set(90, 470, 560);
const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.id = 'labels';
document.getElementById('stage').appendChild(labelRenderer.domElement);
const controls = new MapControls(camera, canvas);
controls.target.set(0, 0, -30);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 12; controls.maxDistance = 2400;
controls.screenSpacePanning = false; controls.zoomToCursor = true;

// ---------- sky, sun & image-based lighting ----------
const sky = new Sky(); sky.scale.setScalar(12000); scene.add(sky);
{
  const u = sky.material.uniforms;
  u.turbidity.value = 8; u.rayleigh.value = 2.2;
  u.mieCoefficient.value = 0.005; u.mieDirectionalG.value = 0.86;
  u.sunPosition.value.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 26), THREE.MathUtils.degToRad(-120));
}
const sunDir = sky.material.uniforms.sunPosition.value.clone();
const sun = new THREE.DirectionalLight(0xffe0ad, 3.2);
sun.position.copy(sunDir).multiplyScalar(2200);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 300; sun.shadow.camera.far = 5200;
sun.shadow.camera.left = -470; sun.shadow.camera.right = 470;
sun.shadow.camera.top = 470; sun.shadow.camera.bottom = -470;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 1.5;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xbcd2e8, 0.17));
scene.add(new THREE.HemisphereLight(0xc2d6ea, 0x3a3324, 0.30));
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(sky).texture;
pmrem.dispose();

// meshes cast/receive sun shadows (ground receives only; transparent skips casting)
function updateShadowFlags() {
  group.traverse(o => {
    if (!o.isMesh) return;
    if (o.name === 'ground') { o.receiveShadow = true; o.castShadow = false; }
    else if (o.material && o.material.transparent) { o.castShadow = false; o.receiveShadow = true; }
    else { o.castShadow = true; o.receiveShadow = true; }
  });
}

const group = new THREE.Group(); scene.add(group);
const pickables = [];

// ---------- helpers ----------
const matL = (color, rough = 0.9, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: opts.metal || 0, transparent: opts.transparent || false, opacity: opts.opacity ?? 1, side: opts.side || THREE.FrontSide });
function polyArea(poly) { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function ribbon(pts, width, lift, color, opts = {}) {
  const n = pts.length, verts = new Float32Array(n * 2 * 3), idx = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[Math.min(i + 1, n - 1)], r = pts[Math.max(i - 1, 0)];
    let dx = q[0] - r[0], dy = q[1] - r[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const nx = -dy, ny = dx;
    verts.set([p[0] + nx * width / 2, lift, -(p[1] + ny * width / 2)], i * 6);
    verts.set([p[0] - nx * width / 2, lift, -(p[1] - ny * width / 2)], i * 6 + 3);
  }
  for (let i = 0; i < n - 1; i++) { const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.95, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: opts.po ?? -2, polygonOffsetUnits: -2 });
  return new THREE.Mesh(g, m);
}

// ---------- ground + water ----------
const layers = {}; // toggleable groups
async function buildGround() {
  loadStage('Draping Esri satellite imagery over the parcel…');
  const icv = await stitch(18, (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`, 3400);
  const tex = new THREE.CanvasTexture(icv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const geo = new THREE.PlaneGeometry(EXT.x1 - EXT.x0, EXT.y1 - EXT.y0); geo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.97 }));
  ground.position.set((EXT.x0 + EXT.x1) / 2, 0, -(EXT.y0 + EXT.y1) / 2);
  ground.name = 'ground'; ground.receiveShadow = true; group.add(ground);
}
const waterMeshes = [];
function buildWater() {
  layers.water = new THREE.Group(); group.add(layers.water);
  const mat = new THREE.MeshStandardMaterial({ color: 0x2c6f86, roughness: 0.25, metalness: 0.35, transparent: true, opacity: 0.55 });
  for (const zone of WATER) {
    const shape = new THREE.Shape(zone.pts.map(p => new THREE.Vector2(p[0], -p[1])));
    const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat); m.position.y = 0.12; layers.water.add(m); waterMeshes.push(m);
  }
}

// ---------- parcel boundary ----------
function buildParcel() {
  const pts = PARCEL.map(p => new THREE.Vector3(p[0], 0.5, -p[1]));
  pts.push(pts[0].clone());
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0xe8c45b, dashSize: 12, gapSize: 8, transparent: true, opacity: 0.95 }));
  line.computeLineDistances(); line.name = 'parcel'; group.add(line);
  layers.boundary = line;
}

// ---------- RV + cabin models ----------
function makeRV(tint) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(7, 2.7, 2.7), matL(0xeef1f4, 0.5)); body.position.y = 1.7; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.9, 2.5), matL(0xdde6ec, 0.5)); cab.position.set(3.4, 1.25, 0); g.add(cab);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(7.02, 0.5, 2.72), matL(tint || 0x3f9c8c, 0.6)); stripe.position.y = 1.85; g.add(stripe);
  const wmat = matL(0x10161a, 0.4);
  for (const sx of [-2.2, 2.2]) for (const sz of [-1.45, 1.45]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 10), wmat); w.rotation.x = Math.PI / 2; w.position.set(sx, 0.5, sz); g.add(w);
  }
  return g;
}
function makeCabin(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 5), matL(color || 0xcf9c5e, 0.7)); body.position.y = 1.5; g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.4, 4), matL(0x4b3b2c, 0.8)); roof.position.y = 4.0; roof.rotation.y = Math.PI / 4; roof.scale.set(1.25, 1, 0.95); g.add(roof);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 5), matL(0x8a6a47, 0.85)); deck.position.set(5, 0.4, 0); g.add(deck);
  return g;
}

// ---------- pads ----------
let padObjs = [];      // { pad, group, rv }
let currentPads = [];
function clearGroup(g) { while (g.children.length) { const c = g.children.pop(); c.traverse?.(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); } }
function buildPads(pads) {
  if (!layers.pads) { layers.pads = new THREE.Group(); group.add(layers.pads); }
  // remove old pad pickables
  for (const o of padObjs) { const i = pickables.indexOf(o.slab); if (i >= 0) pickables.splice(i, 1); }
  clearGroup(layers.pads); padObjs = [];
  for (const pad of pads) {
    const t = PAD_TYPES[pad.type];
    const grp = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(t.len, 0.25, t.wid), matL(t.color, 0.92));
    slab.position.y = 0.14; slab.userData = { kind: 'pad', pad }; grp.add(slab); pickables.push(slab);
    let rv = null;
    if (pad.type === 'glamping') { rv = makeCabin(t.color); rv.position.y = 0.25; grp.add(rv); }
    else {
      const ped = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 0.4), matL(0x3a4a44, 0.8)); ped.position.set(-t.len / 2 + 0.6, 0.7, t.wid / 2 - 0.5); grp.add(ped);
      rv = makeRV(pad.type === 'premium' ? 0x2c8fb0 : 0x3f9c8c); rv.position.y = 0.25; grp.add(rv);
    }
    grp.position.set(pad.x, 0, -pad.y); grp.rotation.y = pad.rot;
    layers.pads.add(grp);
    padObjs.push({ pad, group: grp, slab, rv });
  }
  currentPads = pads;
  applyOccupancy();
}
function applyOccupancy() {
  const occ = inp.occupancy;
  for (const o of padObjs) {
    if (!o.rv) continue;
    if (o.pad.type === 'glamping') { o.rv.visible = layers.pads.visible && rvVisible; continue; }
    const show = ((o.pad.id * 0.61803398) % 1) < occ;
    o.rv.visible = show && rvVisible;
  }
}

// ---------- amenities ----------
function buildAmenities() {
  layers.amen = new THREE.Group(); group.add(layers.amen);
  for (const [name, a] of Object.entries(AMENITIES)) {
    const cat = CATS[a.cat];
    const grp = new THREE.Group();
    if (name.startsWith('Resort Pool')) {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(a.w, 0.3, a.h), matL(0xd9cdb4, 0.9)); deck.position.y = 0.2; grp.add(deck);
      const water = new THREE.Mesh(new THREE.BoxGeometry(a.w * 0.6, 0.35, a.h * 0.55), matL(0x46b3d6, 0.2, { metal: 0.3 })); water.position.y = 0.36; grp.add(water);
    } else if (name.startsWith('Pickleball')) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(a.w, 0.2, a.h), matL(0x2f6f5e, 0.95)); slab.position.y = 0.15; grp.add(slab);
    } else if (name.startsWith('Dog Park')) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(a.w, 0.12, a.h), matL(0x6f8f3f, 1)); slab.position.y = 0.1; grp.add(slab);
    } else if (name.startsWith('Fishing Pond')) {
      const r = Math.min(a.w, a.h) / 2;
      const water = new THREE.Mesh(new THREE.CircleGeometry(r, 30), matL(0x2f6f86, 0.18, { metal: 0.35 }));
      water.rotation.x = -Math.PI / 2; water.position.y = 0.18; water.scale.set(a.w / Math.min(a.w, a.h), 1, a.h / Math.min(a.w, a.h)); grp.add(water);
      const pier = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, a.h * 0.4), matL(0x8a6a47, 0.85)); pier.position.set(a.w / 2 - 2, 0.4, 0); grp.add(pier);
    } else {
      const tall = /Clubhouse/.test(name) ? 6.5 : 4.2;
      const body = new THREE.Mesh(new THREE.BoxGeometry(a.w, tall, a.h), matL(cat.color, 0.62)); body.position.y = tall / 2; grp.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(a.w, a.h) / 2 * 0.8, 2.4, 4), matL(0x3a322a, 0.8));
      roof.position.y = tall + 1.0; roof.rotation.y = Math.PI / 4;
      roof.scale.set(a.w / Math.hypot(a.w, a.h) * 1.45, 1, a.h / Math.hypot(a.w, a.h) * 1.45); grp.add(roof);
    }
    grp.position.set(a.x, 0, -a.y); grp.rotation.y = SITE_ROT;
    grp.traverse(o => { if (o.isMesh) { o.userData = { kind: 'amenity', name }; pickables.push(o); } });
    layers.amen.add(grp);
  }
}
// ---------- roads ----------
function buildRoads(roads) {
  if (layers.roads) { group.remove(layers.roads); }
  layers.roads = new THREE.Group(); group.add(layers.roads);
  for (const r of roads) if (r.length > 1) layers.roads.add(ribbon(r, 6, 0.06, 0x4a4640, { po: -1 }));
}

// ---------- trees ----------
function buildTrees() {
  const buffer = []; let tries = 0;
  while (buffer.length < 150 && tries < 4000) {
    tries++;
    const x = EXT.x0 + Math.random() * (EXT.x1 - EXT.x0) * 1, y = -200 + Math.random() * 420;
    if (!pointInPoly(x, y, PARCEL)) continue;
    let ok = true;
    for (const o of padObjs) { if (Math.hypot(o.pad.x - x, o.pad.y - y) < 11) { ok = false; break; } }
    if (!ok) continue;
    for (const a of Object.values(AMENITIES)) { if (Math.hypot(a.x - x, a.y - y) < 16) { ok = false; break; } }
    if (ok) buffer.push([x, y]);
  }
  const n = buffer.length;
  const canopy = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), matL(0x47703a, 0.9), n);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.45, 1, 6), matL(0x4d3a2a, 0.95), n);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion();
  buffer.forEach((p, i) => {
    const s = 3 + Math.random() * 2.5;
    mtx.compose(new THREE.Vector3(p[0], s * 0.95 + 2, -p[1]), q, new THREE.Vector3(s * 1.2, s, s * 1.2)); canopy.setMatrixAt(i, mtx);
    mtx.compose(new THREE.Vector3(p[0], 1.6, -p[1]), q, new THREE.Vector3(1, 3.2, 1)); trunk.setMatrixAt(i, mtx);
  });
  layers.trees = new THREE.Group(); layers.trees.add(canopy, trunk); group.add(layers.trees);
}

// ---------- survey overlay (optional) ----------
function buildSurveyOverlay() {
  const xs = PARCEL.map(p => p[0]), ys = PARCEL.map(p => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  new THREE.TextureLoader().load('data/survey-plat.jpg', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    const g = new THREE.PlaneGeometry(w * 1.15, h * 1.15); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.75 }));
    m.position.set(cx, 0.3, -cy); m.visible = false; group.add(m); layers.survey = m;
    document.querySelector('[data-v="survey"]').style.display = '';
  }, undefined, () => { /* no file — leave the toggle hidden */ });
}

// ---------- labels ----------
const labelGroups = { areas: [], amen: [] };
function mkLabel(text, cls, x, y, lift) {
  const div = document.createElement('div'); div.className = cls; div.textContent = text;
  const o = new CSS2DObject(div); o.position.set(x, lift, -y); group.add(o); return o;
}
function buildLabels() {
  for (const a of AREAS) labelGroups.areas.push(mkLabel(a.name, 'lbl lbl-a', a.x, a.y, 8));
  for (const [name, a] of Object.entries(AMENITIES)) labelGroups.amen.push(mkLabel(name, 'lbl lbl-b', a.x, a.y, 9));
}

// ---------- pro forma state ----------
const inp = { ...FINANCE.base };
let model = null;
function recompute() {
  model = compute(inp, currentPads);
  updateKPIs(); updateHeader(); drawPF();
}
function updateHeader() {
  setText('st-sites', model.sites);
  setText('st-devcost', M(model.devCost));
  setText('st-noi', M(model.noi) + '/yr');
  setText('st-value', M(model.value));
}
function updateKPIs() {
  setText('k-noi', M(model.noi)); setText('k-value', M(model.value));
  setText('k-yield', PCT(model.yieldOnCost)); setText('k-payback', isFinite(model.paybackYears) ? model.paybackYears.toFixed(1) + ' yr' : '—');
  setText('k-coc', PCT(model.cashOnCash)); setText('k-dscr', isFinite(model.dscr) ? model.dscr.toFixed(2) + '×' : '—');
  setText('k-rev', M(model.effectiveRevenue)); setText('k-opex', M(model.opex));
  setText('k-devcost', M(model.devCost)); setText('k-blended', D0(model.blendedNightly) + '/night');
  setText('k-profit', M(model.profitOnSale));
}
function drawPF() {
  const cv = document.getElementById('pfchart');
  if (cv && model) drawChart(cv, model, { opex: '#8a93a0', debt: '#e0a955', cash: '#2f9e8f', grid: 'rgba(255,255,255,.08)', text: '#9aa6b2' });
}
const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

// ---------- detail panel ----------
const detailEl = document.getElementById('detail');
const fmtRow = (k, v) => `<div class="row"><span>${k}</span><b>${v}</b></div>`;
const cardImg = (src) => `<img class="card-img" src="${src}" alt="" loading="lazy" onerror="this.style.display='none'">`;
const AMEN_IMG = {
  'Gatehouse & Entry': 'gatehouse', 'Office & Camp Store': 'store', 'Clubhouse & Pavilion': 'clubhouse',
  'Resort Pool & Deck': 'pool', 'Bathhouse North': 'bathhouse', 'Bathhouse South': 'bathhouse',
  'Fishing Pond': 'pond', 'Pickleball & Courts': 'pickleball', 'Dog Park': 'dogpark', 'Maintenance & Storage': 'storage',
};
function showOverview() {
  highlightType(null);
  const mixRows = Object.entries(model.mix).filter(([, m]) => m.count).map(([k, m]) =>
    fmtRow(PAD_TYPES[k].label, `${m.count} × ${D0(m.rate)}/night`)).join('');
  detailEl.innerHTML = `
    ${cardImg('assets/hero.jpg')}
    <div class="d-head"><span class="chip gold">MASTER PLAN</span><h2>${SITE.name}</h2>
    <p class="sub">${SITE.tagline}.</p></div>
    ${fmtRow('Sites', model.sites + ' (' + model.rvSites + ' RV + ' + (model.sites - model.rvSites) + ' glamping)')}
    ${fmtRow('Acreage', computedAcres.toFixed(2) + ' ac')}
    ${fmtRow('Blended RV rate', D0(model.blendedNightly) + '/night')}
    ${fmtRow('Stabilized NOI', M(model.noi) + '/yr')}
    ${fmtRow('Value @ ' + PCT(inp.capRate) + ' cap', M(model.value))}
    ${fmtRow('Yield on cost', PCT(model.yieldOnCost))}
    <h3>Site mix</h3>${mixRows}
    <h3>The location</h3><p class="note">${SITE.why}</p>
    <p class="hint">Click any pad or amenity for its economics. Open <b>Pro Forma</b> to model the deal, and switch <b>layouts</b> on the left.</p>`;
}
function showPad(pad) {
  highlightType(pad.type);
  const t = PAD_TYPES[pad.type];
  const m = model.mix[pad.type];
  const nightly = t.rate * inp.rate;
  const annual = nightly * 365 * inp.occupancy;
  detailEl.innerHTML = `
    ${cardImg('assets/' + pad.type + '.jpg')}
    <div class="d-head"><span class="chip site">SITE #${pad.id}</span><h2>${t.label}</h2>
    <p class="sub">${m.count} sites of this type in the ${LAYOUTS[layoutKey].label} layout.</p></div>
    ${fmtRow('Nightly rate', D0(nightly))}
    ${fmtRow('Pad size', Math.round(t.len * 3.28) + ' × ' + Math.round(t.wid * 3.28) + ' ft')}
    ${fmtRow('Site build cost', D0(t.siteCapex))}
    ${fmtRow('Revenue / site @ ' + PCT(inp.occupancy), D0(annual) + '/yr')}
    ${fmtRow('This type’s revenue', M(m.effective) + '/yr')}
    <h3>Why this type</h3><p class="note">${padWhy(pad.type)}</p>`;
}
function padWhy(type) {
  return ({
    backin: 'The bread-and-butter inventory — full 30/50-amp hookups, the lowest build cost, and the easiest sites to fill year-round.',
    pullthru: 'Big-rig pull-throughs for Class-A coaches and trailers that never unhitch — a premium a meaningful share of travelers will pay up for.',
    premium: 'Oversized patio sites on the quiet marsh-side edge by the pond — concrete patio, extra buffer, the best light. Highest rate, highest margin.',
    glamping: 'Cabins capture the no-RV traveler at a hotel-like rate, lift shoulder-season occupancy, and photograph well for marketing.',
  })[type] || '';
}
function showAmenity(name) {
  highlightType(null);
  const a = AMENITIES[name]; const cat = CATS[a.cat];
  detailEl.innerHTML = `
    ${cardImg('assets/' + (AMEN_IMG[name] || 'hero') + '.jpg')}
    <div class="d-head"><span class="chip phase">PHASE ${a.phase} · ${cat.label.toUpperCase()}</span><h2>${name}</h2>
    <p class="sub">${a.role}</p></div>
    ${fmtRow('Footprint', Math.round(a.w * 3.28) + ' × ' + Math.round(a.h * 3.28) + ' ft')}
    ${fmtRow('Cost to build', M(a.capex))}
    ${fmtRow('Revenue', a.revenue)}
    ${fmtRow('Payback', a.payback)}
    <h3>Why it’s here</h3><p class="note">${a.why}</p>`;
}
function highlightType(type) {
  for (const o of padObjs) {
    const on = type && o.pad.type === type;
    o.slab.material.emissive?.setHex(on ? 0x6b5418 : 0x000000);
    if (o.slab.material.emissive) o.slab.material.emissiveIntensity = on ? 0.9 : 0;
  }
}

// ---------- asset list ----------
function buildList() {
  const al = document.getElementById('alist');
  const typeItems = Object.entries(PAD_TYPES).map(([k, t]) =>
    `<div class="aitem" data-type="${k}"><span class="dot" style="background:#${t.color.toString(16).padStart(6, '0')}"></span><span class="an">${t.label}</span><span class="ac" id="cnt-${k}"></span></div>`).join('');
  const amenItems = Object.entries(AMENITIES).map(([name, a]) =>
    `<div class="aitem" data-amen="${name}"><span class="dot" style="background:#${CATS[a.cat].color.toString(16).padStart(6, '0')}"></span><span class="an">${name}</span><span class="ac chip phase">P${a.phase}</span></div>`).join('');
  al.innerHTML = `<h4>Site mix</h4>${typeItems}<h4>Amenities</h4>${amenItems}`;
  al.addEventListener('click', e => {
    const it = e.target.closest('.aitem'); if (!it) return;
    if (it.dataset.type) { const p = currentPads.find(p => p.type === it.dataset.type); if (p) { showPad(p); flyTo(p.x, p.y, 200); } }
    else if (it.dataset.amen) { showAmenity(it.dataset.amen); const a = AMENITIES[it.dataset.amen]; flyTo(a.x, a.y, 150); }
  });
}
function refreshCounts() {
  const counts = {}; for (const p of currentPads) counts[p.type] = (counts[p.type] || 0) + 1;
  for (const k of Object.keys(PAD_TYPES)) setText('cnt-' + k, (counts[k] || 0) + '');
}

// ---------- layout switching ----------
let layoutKey = 'sketch';
function setLayout(key) {
  layoutKey = key;
  const { pads, roads } = LAYOUTS[key].build();
  buildPads(pads); buildRoads(roads); refreshCounts(); recompute(); showOverview();
  updateShadowFlags();
  document.querySelectorAll('[data-layout]').forEach(b => b.classList.toggle('on', b.dataset.layout === key));
}

// ---------- camera ----------
let tween = null;
function flyTo(x, y, dist = 240, dur = 850) {
  const target = new THREE.Vector3(x, 4, -y);
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
  const pos = target.clone().add(new THREE.Vector3(dir.x * dist, Math.max(dist * 0.7, 50), dir.z * dist));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) dur = 0;
  tween = { t0: performance.now(), dur, p0: camera.position.clone(), p1: pos, c0: controls.target.clone(), c1: target };
}
const PRESETS = {
  aerial: () => { tween = { t0: performance.now(), dur: 1000, p0: camera.position.clone(), p1: new THREE.Vector3(90, 470, 560), c0: controls.target.clone(), c1: new THREE.Vector3(0, 0, -20) }; },
  entrance: () => flyTo(-40, -135, 150),
  core: () => flyTo(60, 0, 165),
  premium: () => flyTo(150, -20, 150),
  glamping: () => flyTo(115, 128, 120),
  pond: () => flyTo(175, -55, 140),
};

// ---------- picking ----------
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let hovered = null, moved = false, downAt = [0, 0];
canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); });
canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; moved = false; });
canvas.addEventListener('pointerup', e => { if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) moved = true; });
canvas.addEventListener('click', () => {
  if (moved) return;
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(pickables, false);
  if (!hits.length) return;
  const u = hits[0].object.userData;
  if (u.kind === 'pad') showPad(u.pad);
  else if (u.kind === 'amenity') showAmenity(u.name);
});
function hoverTick() {
  if (walkMode) { canvas.style.cursor = 'none'; return; }
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(pickables, false);
  const o = hits.length ? hits[0].object : null;
  if (hovered && hovered !== o && hovered.userData.kind !== 'pad') hovered.material.emissive?.setHex(0x000000);
  canvas.style.cursor = o ? 'pointer' : 'grab';
  hovered = o;
}

// ---------- navigation: recenter, roam, first-person walk ----------
// Double-click any ground point to pivot + zoom there (no more single fixed pivot).
canvas.addEventListener('dblclick', e => {
  if (walkMode) return;
  const r = canvas.getBoundingClientRect();
  ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const g = group.getObjectByName('ground');
  const hits = g ? ray.intersectObject(g, false) : [];
  if (hits.length) flyTo(hits[0].point.x, -hits[0].point.z, Math.max(70, camera.position.distanceTo(controls.target) * 0.55));
});
// WASD / arrows roam the site (and drive first-person walk)
const keys = { f: 0, s: 0 };
function roamKey(e, v) {
  const tag = (document.activeElement || {}).tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  const k = e.key.toLowerCase();
  if (k === 'w' || e.key === 'ArrowUp') keys.f = v;
  else if (k === 's' || e.key === 'ArrowDown') keys.f = -v;
  else if (k === 'a' || e.key === 'ArrowLeft') keys.s = -v;
  else if (k === 'd' || e.key === 'ArrowRight') keys.s = v;
  else return;
  e.preventDefault();
}
addEventListener('keydown', e => roamKey(e, 1));
addEventListener('keyup', e => roamKey(e, 0));
addEventListener('blur', () => { keys.f = keys.s = 0; });
document.addEventListener('visibilitychange', () => { if (document.hidden) keys.f = keys.s = 0; });
// Escape closes open panels / exits walk
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (walkMode) return; // PointerLockControls handles its own Escape
  document.getElementById('brief').classList.add('off');
  document.getElementById('pf').classList.remove('open');
  document.getElementById('left').classList.remove('open');
  document.getElementById('scrim').classList.remove('open');
});

const walk = new PointerLockControls(camera, canvas);
let walkMode = false;
function setWalk(on) {
  if (on) { tween = null; const t = controls.target; camera.position.set(t.x, 2.0, t.z + 22); controls.enabled = false; walk.lock(); }
  else walk.unlock();
}
walk.addEventListener('lock', () => { walkMode = true; document.getElementById('walkbtn')?.classList.add('on'); document.getElementById('walkhint')?.classList.add('show'); });
walk.addEventListener('unlock', () => {
  if (!walkMode) return;
  walkMode = false; controls.enabled = true;
  const d = new THREE.Vector3(); camera.getWorldDirection(d); d.y = 0; d.normalize();
  controls.target.copy(camera.position).addScaledVector(d, 45);
  document.getElementById('walkbtn')?.classList.remove('on'); document.getElementById('walkhint')?.classList.remove('show');
});
function applyMovement() {
  if (!keys.f && !keys.s) return;
  if (walkMode && walk.isLocked) {
    walk.moveForward(keys.f * 0.9); walk.moveRight(keys.s * 0.9); camera.position.y = 2.0;
  } else if (!walkMode) {
    const spd = Math.max(2, camera.position.y * 0.02);
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    const mv = dir.multiplyScalar(keys.f * spd).add(right.multiplyScalar(keys.s * spd));
    camera.position.add(mv); controls.target.add(mv);
  }
}

// ---------- pro forma dashboard wiring ----------
function bindSliders() {
  const ids = ['occupancy', 'rate', 'opexRatio', 'capexPerSite', 'capRate', 'ltv', 'interest'];
  for (const key of ids) {
    const s = document.getElementById('s-' + key); if (!s) continue;
    const rg = FINANCE.ranges[key];
    s.min = rg.min; s.max = rg.max; s.step = rg.step; s.value = inp[key];
    s.addEventListener('input', () => {
      inp[key] = parseFloat(s.value); setText('v-' + key, fmtSlider(rg.fmt, inp[key]));
      if (key === 'occupancy') applyOccupancy();
      recompute();
    });
    setText('v-' + key, fmtSlider(rg.fmt, inp[key]));
  }
}
function fmtSlider(fmt, v) { return fmt === 'pct' ? PCT(v) : fmt === 'usd' ? D0(v) : fmt === 'mult' ? '×' + v.toFixed(2) : v; }
function applyScenario(name) {
  const sc = FINANCE.scenarios[name]; if (!sc) return;
  for (const k of ['occupancy', 'rate', 'opexRatio', 'capRate']) if (sc[k] != null) { inp[k] = sc[k]; const s = document.getElementById('s-' + k); if (s) { s.value = inp[k]; setText('v-' + k, fmtSlider(FINANCE.ranges[k].fmt, inp[k])); } }
  applyOccupancy(); recompute();
  document.querySelectorAll('[data-scen]').forEach(b => b.classList.toggle('on', b.dataset.scen === name));
}

// ---------- developer brief ----------
function buildBrief() {
  document.getElementById('brieftitle').textContent = 'Developer Brief — ' + SITE.name;
  const remaining = Math.max(0, model.devCost - inp.landCost);
  const sumW = FINANCE.capexWeights.reduce((s, [, w]) => s + w, 0);
  const cap = [['Land (~' + computedAcres.toFixed(0) + ' ac assemblage)', inp.landCost],
    ...FINANCE.capexWeights.map(([k, w]) => [k, remaining * w / sumW])]
    .map(([k, v]) => fmtRow(k, M(v))).join('');
  const amen = Object.entries(AMENITIES).map(([name, a]) => `<tr><td>${name}</td><td>${CATS[a.cat].label}</td><td>${M(a.capex)}</td><td>P${a.phase}</td><td>${a.revenue}</td></tr>`).join('');
  document.getElementById('briefbody').innerHTML = `
    <img class="brief-hero" src="assets/hero.jpg" alt="" onerror="this.style.display='none'">
    <p class="sub">${SITE.address} · ${SITE.county} · ${computedAcres.toFixed(2)} ac · centroid ${SITE.lat.toFixed(5)}, ${SITE.lon.toFixed(5)} · ${LAYOUTS[layoutKey].label} layout, ${model.sites} sites</p>
    <h3>Stabilized pro forma (base case)</h3>
    ${fmtRow('Effective revenue', M(model.effectiveRevenue) + '/yr')}
    ${fmtRow('Operating expense (' + PCT(inp.opexRatio) + ')', M(model.opex) + '/yr')}
    ${fmtRow('Net operating income', M(model.noi) + '/yr (' + PCT(model.noiMargin) + ' margin)')}
    ${fmtRow('Stabilized value @ ' + PCT(inp.capRate) + ' cap', M(model.value))}
    ${fmtRow('Yield on cost', PCT(model.yieldOnCost))}
    ${fmtRow('Levered cash-on-cash', PCT(model.cashOnCash))}
    <h3>Development cost</h3>${cap}
    <div class="totals">All-in ≈ <b>${M(model.devCost)}</b> (${D0(inp.capexPerSite)}/site × ${model.sites} + land) · value over cost ≈ <b>${(model.value / model.devCost).toFixed(2)}×</b></div>
    <h3>Amenity program</h3>
    <table><thead><tr><th>Amenity</th><th>Category</th><th>Cost</th><th>Phase</th><th>Revenue</th></tr></thead><tbody>${amen}</tbody></table>
    <p class="warn">${FEASIBILITY}</p>
    <p class="warn">${FINANCE.disclaimer}</p>`;
}

// ---------- UI wiring ----------
let rvVisible = true;
function wireUI() {
  document.getElementById('layoutsw').addEventListener('click', e => { const b = e.target.closest('[data-layout]'); if (b) setLayout(b.dataset.layout); });
  document.querySelectorAll('[data-scen]').forEach(b => b.addEventListener('click', () => applyScenario(b.dataset.scen)));
  document.getElementById('toggles').addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    const v = b.dataset.v; const on = !b.classList.contains('on'); b.classList.toggle('on', on);
    if (v === 'pads') layers.pads.visible = on;
    else if (v === 'rvs') { rvVisible = on; applyOccupancy(); }
    else if (v === 'trees') layers.trees.visible = on;
    else if (v === 'water') layers.water.visible = on;
    else if (v === 'boundary') layers.boundary.visible = on;
    else if (v === 'labels') labelsOn = on;
    else if (v === 'survey' && layers.survey) layers.survey.visible = on;
  });
  document.getElementById('presets').addEventListener('change', e => { PRESETS[e.target.value]?.(); e.target.selectedIndex = 0; e.target.blur(); });
  document.getElementById('sumbtn').addEventListener('click', () => { showOverview(); PRESETS.aerial(); });
  document.getElementById('walkbtn').addEventListener('click', () => { if (walkMode) setWalk(false); else setWalk(true); });
  const pf = document.getElementById('pf');
  document.getElementById('pfbtn').addEventListener('click', () => { pf.classList.toggle('open'); drawPF(); });
  document.getElementById('pfclose').addEventListener('click', () => pf.classList.remove('open'));
  const left = document.getElementById('left'), scrim = document.getElementById('scrim');
  const closeLeft = () => { left.classList.remove('open'); scrim.classList.remove('open'); };
  document.getElementById('layersbtn').addEventListener('click', () => { const on = !left.classList.contains('open'); left.classList.toggle('open', on); scrim.classList.toggle('open', on); });
  scrim.addEventListener('click', closeLeft);
  document.getElementById('briefbtn').addEventListener('click', () => { buildBrief(); document.getElementById('brief').classList.remove('off'); });
  document.getElementById('briefclose').addEventListener('click', () => document.getElementById('brief').classList.add('off'));
  document.getElementById('brief').addEventListener('click', e => { if (e.target.id === 'brief') document.getElementById('brief').classList.add('off'); });
  document.getElementById('printbtn').addEventListener('click', () => print());
}

// ---------- render loop ----------
const north = document.getElementById('north');
const clock = new THREE.Clock(); let frame = 0;
let running = true;
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); running = false; });
canvas.addEventListener('webglcontextrestored', () => { running = true; });
function animate() {
  requestAnimationFrame(animate);
  if (!running) return;
  const t = clock.getElapsedTime();
  if (tween) {
    const k = tween.dur ? Math.min(1, (performance.now() - tween.t0) / tween.dur) : 1;
    const e = 1 - Math.pow(1 - k, 3);
    camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.c0, tween.c1, e);
    if (k >= 1) tween = null;
  }
  for (const w of waterMeshes) w.material.opacity = 0.5 + 0.06 * Math.sin(t * 0.8);
  applyMovement();
  if (!walkMode) controls.update();
  if ((frame++ & 3) === 0) hoverTick();
  if ((frame & 15) === 0) {
    const d = camera.position.distanceTo(controls.target);
    labelGroups.amen.forEach(l => l.visible = labelsOn && d < 520);
    labelGroups.areas.forEach(l => l.visible = labelsOn && d < 1500);
  }
  north.style.transform = `rotate(${controls.getAzimuthalAngle() * 180 / Math.PI}deg)`;
  renderer.render(scene, camera); labelRenderer.render(scene, camera);
}
let labelsOn = true;
function resize() {
  const w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
  renderer.setSize(w, h, false); labelRenderer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ---------- boot ----------
const computedAcres = polyArea(PARCEL) / 4046.8564;
resize(); buildList(); wireUI(); bindSliders(); animate();
buildWater(); buildParcel(); buildAmenities(); buildLabels(); buildSurveyOverlay();
setLayout('optimized'); buildTrees(); updateShadowFlags();
document.querySelectorAll('[data-scen]').forEach(b => b.classList.toggle('on', b.dataset.scen === 'base'));
buildGround().then(() => { loadTick(1); setTimeout(() => loadEl.classList.add('off'), 300); })
  .catch(err => { loadMsg.textContent = 'Imagery fetch failed — check your connection. (' + err.message + ')'; loadBar.style.background = '#d96459'; });
