// IIR design by discretizing the analog prototypes of core/filters.js
// (Butterworth / Chebyshev 1, all-pole — the families where every method
// below is well defined). Three discretizations of H_a(s), Fs = 8 kHz:
//   · bilinear WITH prewarping: s = 2Fs·(1−z⁻¹)/(1+z⁻¹), prototype scaled
//     to ωa = 2Fs·tan(π·fc/Fs) — the −Amax point lands EXACTLY at fc;
//   · naive bilinear (ωa = 2π·fc): the tan() warping shifts the cutoff to
//     (Fs/π)·atan(π·fc/Fs) — the classic beginner's surprise, checked;
//   · impulse invariance: h[n] = T·h_a(nT) by partial fractions — exact in
//     time (checked to machine precision) but the analog tail beyond
//     Nyquist FOLDS back: aliasing error, shrinking as the order grows.
// The bilinear transform puts n zeros at z = −1 (s = ∞ → z = −1): the
// digital response dives at Nyquist where the analog one merely rolls off.
// Digital b/a coefficients are exported — downloadable from the Inspector.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { toDb, polyEvalComplex } from '../../../core/numeric.js';
import { designButter, designCheby1, polyFromRoots } from '../../../core/filters.js';

const FS = 8000;
const T = 1 / FS;
const NR = 600; // response grid over [0, Fs/2]
const DB_FLOOR = -100;
const NH = 60; // impulse-response samples (checks)

/* ---- tiny complex-polynomial helpers (impulse-invariance assembly) ---- */
const cAdd = (a, b) => [a[0] + b[0], a[1] + b[1]];
const cSub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cMul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cDiv = (a, b) => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
/** Multiply complex polynomials (ascending powers of z⁻¹). */
function cPolyMul(p, q) {
  const r = Array.from({ length: p.length + q.length - 1 }, () => [0, 0]);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) r[i + j] = cAdd(r[i + j], cMul(p[i], q[j]));
  }
  return r;
}

/** H(e^{j2πf/Fs}) from b/a coefficients (ascending powers of z⁻¹). */
function evalZ(b, a, f) {
  const th = (2 * Math.PI * f) / FS;
  const u = [Math.cos(th), -Math.sin(th)]; // z⁻¹
  // ascending-in-z⁻¹ Horner: c[0] + u·(c[1] + u·(…))
  const horner = (c) => {
    let acc = [c[c.length - 1], 0];
    for (let i = c.length - 2; i >= 0; i--) {
      acc = cMul(acc, u);
      acc = cAdd(acc, [c[i], 0]);
    }
    return acc;
  };
  return cDiv(horner(b), horner(a));
}

/**
 * @param {{family: string, n: number, fc: number, Amax: number,
 *          method: string, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ family, n, fc, Amax, method }) {
  const ep = Math.sqrt(10 ** (Amax / 10) - 1);
  const proto = family === 'butter' ? designButter(n, ep) : designCheby1(n, ep, Amax);
  const dcTarget = family === 'butter' || n % 2 === 1 ? 1 : 10 ** (-Amax / 20);

  // analog poles, scaled to the (possibly prewarped) edge frequency
  const wa = method === 'bilinear' ? 2 * FS * Math.tan((Math.PI * fc) / FS) : 2 * Math.PI * fc;
  const pa = [];
  for (const r of proto.poles.reals) pa.push([r * wa, 0]);
  for (const [x, y] of proto.poles.pairs) {
    pa.push([x * wa, y * wa]);
    pa.push([x * wa, -y * wa]);
  }
  // analog gain g: H_a(0) = g / Π|p_i| = dcTarget
  let prodMag = 1;
  for (const p of pa) prodMag *= Math.hypot(p[0], p[1]);
  const gAna = dcTarget * prodMag;

  const magAna = (w) => {
    let m = 1;
    for (const p of pa) m *= Math.hypot(-p[0], w - p[1]);
    return gAna / m;
  };

  // ---- discretization → b (numerator) and a (denominator), z⁻¹ ascending
  let b;
  let a;
  let zPoles;
  let zZeros = [];
  if (method === 'impulse') {
    // partial fractions (distinct poles): r_i = g / Π_{j≠i}(p_i − p_j),
    // then H(z) = Σ T·r_i / (1 − e^{p_i T} z⁻¹), assembled over a common
    // denominator with complex polynomial arithmetic
    const q = pa.map((p) => {
      const e = Math.exp(p[0] * T);
      return [e * Math.cos(p[1] * T), e * Math.sin(p[1] * T)];
    });
    const res = pa.map((pi, i) => {
      let d = [1, 0];
      for (let j = 0; j < pa.length; j++) if (j !== i) d = cMul(d, cSub(pi, pa[j]));
      return cDiv([gAna, 0], d);
    });
    let num = [[0, 0]];
    let den = [[1, 0]];
    for (let i = 0; i < pa.length; i++) {
      let term = [cMul([T, 0], res[i])];
      for (let j = 0; j < pa.length; j++) {
        if (j !== i) term = cPolyMul(term, [[1, 0], [-q[j][0], -q[j][1]]]);
      }
      num = num.length >= term.length ? num.map((c, k) => cAdd(c, term[k] ?? [0, 0])) : term.map((c, k) => cAdd(c, num[k] ?? [0, 0]));
      den = cPolyMul(den, [[1, 0], [-q[i][0], -q[i][1]]]);
    }
    b = Float64Array.from(num, (c) => c[0]); // imaginary parts cancel (~1e-16)
    a = Float64Array.from(den, (c) => c[0]);
    zPoles = q;
  } else {
    // bilinear pole map z = (1 + pT/2)/(1 − pT/2); n zeros at z = −1
    zPoles = pa.map((p) => cDiv([1 + (p[0] * T) / 2, (p[1] * T) / 2], [1 - (p[0] * T) / 2, (-p[1] * T) / 2]));
    const reals = [];
    const pairs = [];
    for (const z of zPoles) {
      if (Math.abs(z[1]) < 1e-14) reals.push(z[0]);
      else if (z[1] > 0) pairs.push(z);
    }
    a = polyFromRoots(reals, pairs); // descending in z ≡ ascending in z⁻¹
    const bin = new Float64Array(n + 1); // (1 + z⁻¹)^n
    bin[0] = 1;
    for (let k = 1; k <= n; k++) bin[k] = (bin[k - 1] * (n - k + 1)) / k;
    // normalize at z = 1 (DC): H(1) = K·2^n / Σa = dcTarget
    let sa = 0;
    for (const c of a) sa += c;
    const K = (dcTarget * sa) / 2 ** n;
    b = Float64Array.from(bin, (c) => c * K);
    zZeros = Array.from({ length: n }, () => [-1, 0]);
  }

  // ---- responses ---------------------------------------------------------
  const rf = new Float64Array(NR);
  const rd = new Float64Array(NR);
  const ra = new Float64Array(NR);
  for (let i = 0; i < NR; i++) {
    const f = ((FS / 2) * i) / (NR - 1);
    rf[i] = f;
    const [hr, hi] = evalZ(b, a, f);
    rd[i] = toDb(Math.hypot(hr, hi), DB_FLOOR);
    ra[i] = toDb(magAna(2 * Math.PI * f), DB_FLOOR);
  }

  // measured cutoff: highest f where the digital response still ≥ −Amax
  let fMeas = 0;
  for (let i = NR - 1; i >= 0; i--) {
    if (rd[i] >= -Amax - 1e-9) {
      fMeas = rf[i];
      break;
    }
  }

  // ---- warping view: analog frequency realized at digital f (bilinear) --
  const NWARP = 300;
  const wx = new Float64Array(NWARP);
  const wy = new Float64Array(NWARP);
  const wi = new Float64Array(NWARP);
  for (let i = 0; i < NWARP; i++) {
    const f = (0.49 * FS * i) / (NWARP - 1);
    wx[i] = f;
    wy[i] = Math.min(16000, (FS / Math.PI) * Math.tan((Math.PI * f) / FS));
    wi[i] = f;
  }

  // ---- impulse responses: difference equation vs analytic samples --------
  const hImp = new Float64Array(NH);
  for (let m = 0; m < NH; m++) {
    let acc = m < b.length ? b[m] : 0;
    for (let k = 1; k < a.length && k <= m; k++) acc -= a[k] * hImp[m - k];
    hImp[m] = acc;
  }
  const hAna = new Float64Array(NH); // T·h_a(nT) = T·Σ r_i e^{p_i nT}
  {
    const res = pa.map((pi, i) => {
      let d = [1, 0];
      for (let j = 0; j < pa.length; j++) if (j !== i) d = cMul(d, cSub(pi, pa[j]));
      return cDiv([gAna, 0], d);
    });
    for (let m = 0; m < NH; m++) {
      let s = 0;
      for (let i = 0; i < pa.length; i++) {
        const e = Math.exp(pa[i][0] * m * T);
        s += e * (res[i][0] * Math.cos(pa[i][1] * m * T) - res[i][1] * Math.sin(pa[i][1] * m * T));
      }
      hAna[m] = T * s;
    }
  }

  let maxPole = 0;
  for (const z of zPoles) maxPole = Math.max(maxPole, Math.hypot(z[0], z[1]));

  const zpx = Float64Array.from(zPoles, (z) => z[0]);
  const zpy = Float64Array.from(zPoles, (z) => z[1]);

  return {
    observables: {
      respDig: { x: rf, y: rd },
      respAna: { x: rf, y: ra },
      warp: { x: wx, y: wy },
      warpIdent: { x: wx, y: wi },
      // {x, y} series: the shape a declarative plane consumes
      poles: { x: zpx, y: zpy },
      zeros: { x: Float64Array.from(zZeros, (z) => z[0]), y: Float64Array.from(zZeros, (z) => z[1]) },
      bCoefs: b, // Inspector download (difference-equation b/a)
      aCoefs: a,
      hImp, // checks: impulse-invariance sampling identity
      hAna,
      maxPole, // checks: stability
      nyqDb: rd[NR - 1], // checks: bilinear zeros at Nyquist
      fMeas: { value: fMeas, meta: { label: 'coupure obtenue', unit: 'Hz', precision: 0 } },
      warpErr: {
        value: fc - fMeas,
        meta: { label: 'écart à la cible', unit: 'Hz', precision: 0 },
      },
    },
  };
}
