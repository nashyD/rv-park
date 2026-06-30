// Sea Island RV Resort — interactive pro forma.
// compute() turns the slider inputs + the current pad mix into a full set of KPIs.
// drawChart() renders a 5-year revenue / cash-flow chart on a <canvas>.
import { PAD_TYPES } from './data.js';

const BASE_OCC = 0.68; // ancillary revenue is quoted at this occupancy

// annual loan payment (mortgage-style)
function pmt(principal, annualRate, years) {
  if (principal <= 0) return 0;
  if (annualRate <= 0) return principal / years;
  return principal * annualRate / (1 - Math.pow(1 + annualRate, -years));
}

export function compute(inp, pads) {
  // ---- pad mix ----
  const mix = {};
  for (const k of Object.keys(PAD_TYPES)) mix[k] = { count: 0, rate: 0, potential: 0, effective: 0 };
  let rvSites = 0, blendedSum = 0;
  for (const p of pads) {
    const t = PAD_TYPES[p.type]; if (!t) continue;
    const nightly = t.rate * inp.rate;
    const m = mix[p.type];
    m.count++; m.rate = nightly;
    m.potential += nightly * 365;
    m.effective += nightly * 365 * inp.occupancy;
    if (p.type !== 'glamping') { rvSites++; blendedSum += nightly; }
  }
  const sites = pads.length;
  const blendedNightly = rvSites ? blendedSum / rvSites : 0;

  // ---- revenue ----
  const siteEffective = Object.values(mix).reduce((s, m) => s + m.effective, 0);
  const sitePotential = Object.values(mix).reduce((s, m) => s + m.potential, 0);
  const ancillaryEff = inp.ancillary * (inp.occupancy / BASE_OCC);
  const grossPotential = sitePotential + inp.ancillary / BASE_OCC;
  const effectiveRevenue = siteEffective + ancillaryEff;

  // ---- operations ----
  const opex = inp.opexRatio * effectiveRevenue;
  const noi = effectiveRevenue - opex;

  // ---- capital ----
  const devCost = sites * inp.capexPerSite + inp.landCost;
  const value = noi / inp.capRate;
  const yieldOnCost = noi / devCost;
  const paybackYears = noi > 0 ? devCost / noi : Infinity;
  const profitOnSale = value - devCost;

  // ---- financing ----
  const loan = inp.ltv * devCost;
  const equity = devCost - loan;
  const debtService = pmt(loan, inp.interest, inp.termYears);
  const cashFlow = noi - debtService;
  const cashOnCash = equity > 0 ? cashFlow / equity : yieldOnCost;
  const dscr = debtService > 0 ? noi / debtService : Infinity;

  return {
    sites, rvSites, blendedNightly, mix,
    grossPotential, effectiveRevenue, opex, noi, noiMargin: noi / effectiveRevenue,
    devCost, value, yieldOnCost, paybackYears, profitOnSale,
    loan, equity, debtService, cashFlow, cashOnCash, dscr,
    inp,
  };
}

// 5-year projection used by the chart (revenue grows at rentGrowth; costs scale with revenue).
export function project(model, years = 5) {
  const out = [];
  for (let y = 1; y <= years; y++) {
    const g = Math.pow(1 + model.inp.rentGrowth, y - 1);
    const rev = model.effectiveRevenue * g;
    const opex = model.opex * g;
    const noi = rev - opex;
    out.push({ y, rev, opex, noi, debt: model.debtService, cash: noi - model.debtService });
  }
  return out;
}

// ---- chart: stacked annual bars (opex / debt service / cash flow) over 5 years ----
export function drawChart(canvas, model, css) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const W = canvas.clientWidth || 320, H = canvas.clientHeight || 150;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const data = project(model, 5);
  const pad = { l: 38, r: 8, t: 10, b: 18 };
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  const max = Math.max(...data.map(d => d.rev)) * 1.08 || 1;
  const yOf = v => pad.t + ch - (v / max) * ch;
  const col = css || { opex: '#8a93a0', debt: '#e0a955', cash: '#2f9e8f', grid: 'rgba(255,255,255,.08)', text: '#9aa6b2' };

  // gridlines + $ labels
  ctx.font = '10px JetBrains Mono, monospace'; ctx.fillStyle = col.text; ctx.strokeStyle = col.grid; ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const v = max * i / 3, y = yOf(v);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    ctx.textAlign = 'right'; ctx.fillText('$' + (v / 1e6).toFixed(1) + 'M', pad.l - 5, y + 3);
  }

  const bw = cw / data.length * 0.56;
  data.forEach((d, i) => {
    const cx = pad.l + cw * (i + 0.5) / data.length;
    const x = cx - bw / 2;
    let yTop = pad.t + ch;
    const seg = (val, color) => { const h = (val / max) * ch; yTop -= h; ctx.fillStyle = color; ctx.fillRect(x, yTop, bw, h); };
    seg(d.opex, col.opex);
    seg(Math.max(0, Math.min(d.debt, d.noi)), col.debt);
    if (d.cash > 0) seg(d.cash, col.cash);
    ctx.fillStyle = col.text; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Y' + d.y, cx, H - 5);
  });
}
