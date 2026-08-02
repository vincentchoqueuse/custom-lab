// Analog low-pass filter design from a template (gabarit): passband edge
// fp with at most Amax dB of ripple, stopband edge fa with at least Amin dB
// of attenuation. The DESIGN TECHNIQUE is played in full: order formula →
// normalized prototype (ωp = 1) → denormalization s → s/ωp. Four families:
//   Butterworth   n = ⌈log10(A) / (2·log10 Ωs)⌉,      A = (10^(Amin/10)−1)/(10^(Amax/10)−1)
//   Chebyshev 1&2 n = ⌈acosh(√A) / acosh(Ωs)⌉
//   elliptic      n = ⌈K(k)K'(k1) / (K'(k)K(k1))⌉,    k = 1/Ωs, k1 = εp/εs
// The elliptic prototype uses the Landen/Jacobi machinery (Orfanidis's
// formulation): after rounding n up, the degree equation is re-solved
// through the COMPLEMENT moduli, so the passband ripple is exactly Amax
// and the stopband floor exactly Amin (the transition edge moves inward —
// the design margin). Chebyshev 2 is anchored at the stopband (exactly
// Amin at fa); Butterworth and Chebyshev 1 at the passband (exactly Amax
// at fp). Coefficients are exported both as the normalized prototype and
// denormalized in rad/s — downloadable from the Inspector.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { polyEvalComplex } from '../../../core/numeric.js';

const NPTS = 500; // response grid (log-spaced)
const DB_FLOOR = -90;
const M_LANDEN = 10;

/* ---------- small complex helpers (a = [re, im]) ------------------------ */
const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a, b) => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const ccos = (a) => [Math.cos(a[0]) * Math.cosh(a[1]), -Math.sin(a[0]) * Math.sinh(a[1])];

/* ---------- Landen / Jacobi (Orfanidis's cde/sne/asne) ------------------ */
/** Descending Landen moduli k → v[0] ≥ v[1] ≥ … → 0. */
function landen(k) {
  const v = [];
  for (let i = 0; i < M_LANDEN; i++) {
    k = (k / (1 + Math.sqrt(1 - k * k))) ** 2;
    v.push(k);
  }
  return v;
}

/** Complete elliptic integral K(k) via the Landen product. */
function ellipK(k) {
  if (k >= 1) return Infinity;
  let prod = 1;
  for (const v of landen(k)) prod *= 1 + v;
  return (Math.PI / 2) * prod;
}

/** w = cd(u·K(k), k) for complex normalized u. */
function cde(u, k) {
  const v = landen(k);
  let w = ccos([(u[0] * Math.PI) / 2, (u[1] * Math.PI) / 2]);
  for (let i = M_LANDEN - 1; i >= 0; i--) {
    const w2 = cmul(w, w);
    w = cdiv([(1 + v[i]) * w[0], (1 + v[i]) * w[1]], [1 + v[i] * w2[0], v[i] * w2[1]]);
  }
  return w;
}

/** sn(u·K(k), k) for real normalized u. */
function sne(u, k) {
  const v = landen(k);
  let w = Math.sin((u * Math.PI) / 2);
  for (let i = M_LANDEN - 1; i >= 0; i--) {
    w = ((1 + v[i]) * w) / (1 + v[i] * w * w);
  }
  return w;
}

/** sn(j·u·K(k), k) = j·y — purely imaginary result, tracked as real y. */
function sneImag(u, k) {
  const v = landen(k);
  let y = Math.sinh((u * Math.PI) / 2); // sin(j·uπ/2) = j·sinh(uπ/2)
  for (let i = M_LANDEN - 1; i >= 0; i--) {
    y = ((1 + v[i]) * y) / (1 - v[i] * y * y);
  }
  return y;
}

/**
 * Imaginary-argument inverse sn: returns real u₀ with sn(j·u₀·K(k), k) = j·y.
 * The Landen descent keeps a purely imaginary iterate, tracked as real y.
 */
function asneImag(y, k) {
  const v = landen(k);
  let kc = k;
  for (let i = 0; i < M_LANDEN; i++) {
    y = (2 * y) / ((1 + v[i]) * (1 + Math.sqrt(1 + kc * kc * y * y)));
    kc = v[i];
  }
  return (2 / Math.PI) * Math.asinh(y);
}

/* ---------- polynomial helpers ------------------------------------------ */
/** Monic real polynomial (descending powers) from real roots + conjugate pairs. */
function polyFromRoots(realRoots, pairs) {
  let p = [1];
  const mul = (p, q) => {
    const r = new Array(p.length + q.length - 1).fill(0);
    for (let i = 0; i < p.length; i++) for (let j = 0; j < q.length; j++) r[i + j] += p[i] * q[j];
    return r;
  };
  for (const r of realRoots) p = mul(p, [1, -r]);
  for (const [a, b] of pairs) p = mul(p, [1, -2 * a, a * a + b * b]);
  return Float64Array.from(p);
}

/* ---------- order formulas (shared with the manifest's validate) -------- */
export function requiredOrder({ family, fp, fstop, Amax, Amin }) {
  const Ws = fstop / fp;
  if (Ws <= 1.05) return 99;
  const A = (10 ** (Amin / 10) - 1) / (10 ** (Amax / 10) - 1);
  if (family === 'butter') return Math.ceil(Math.log10(A) / (2 * Math.log10(Ws)));
  if (family === 'cheby1' || family === 'cheby2') {
    return Math.ceil(Math.acosh(Math.sqrt(A)) / Math.acosh(Ws));
  }
  const k = 1 / Ws;
  const k1 = Math.sqrt((10 ** (Amax / 10) - 1) / (10 ** (Amin / 10) - 1));
  const kp = Math.sqrt(1 - k * k);
  const k1p = Math.sqrt(1 - k1 * k1);
  return Math.ceil((ellipK(k) * ellipK(k1p)) / (ellipK(kp) * ellipK(k1)));
}

/* ---------- prototypes (normalized, ωp = 1, Ωs = fstop/fp) -------------- */
function designButter(n, ep) {
  const wc = ep ** (-1 / n);
  const pairs = [];
  const reals = [];
  for (let m = 0; m < Math.floor(n / 2); m++) {
    const th = (Math.PI * (2 * m + 1)) / (2 * n) + Math.PI / 2;
    pairs.push([wc * Math.cos(th), wc * Math.sin(th)]);
  }
  if (n % 2 === 1) reals.push(-wc);
  const den = polyFromRoots(reals, pairs);
  return { num: Float64Array.from([den[den.length - 1]]), den, zeros: [], poles: { reals, pairs } };
}

function designCheby1(n, ep, Amax) {
  const mu = Math.asinh(1 / ep) / n;
  const pairs = [];
  const reals = [];
  for (let m = 1; m <= Math.floor(n / 2); m++) {
    const th = ((2 * m - 1) * Math.PI) / (2 * n);
    pairs.push([-Math.sinh(mu) * Math.sin(th), Math.cosh(mu) * Math.cos(th)]);
  }
  if (n % 2 === 1) reals.push(-Math.sinh(mu));
  const den = polyFromRoots(reals, pairs);
  const K = den[den.length - 1] * (n % 2 === 1 ? 1 : 10 ** (-Amax / 20));
  return { num: Float64Array.from([K]), den, zeros: [], poles: { reals, pairs } };
}

function designCheby2(n, Ws, Amin) {
  // anchored at the stopband: exactly Amin dB at Ωs, monotone passband
  const d = 1 / Math.sqrt(10 ** (Amin / 10) - 1);
  const mu = Math.asinh(1 / d) / n;
  const pairs = [];
  const reals = [];
  const inv = (a, b) => {
    // Ωs / (a + jb)
    const m = a * a + b * b;
    return [(Ws * a) / m, (-Ws * b) / m];
  };
  for (let m = 1; m <= Math.floor(n / 2); m++) {
    const th = ((2 * m - 1) * Math.PI) / (2 * n);
    pairs.push(inv(-Math.sinh(mu) * Math.sin(th), Math.cosh(mu) * Math.cos(th)));
  }
  if (n % 2 === 1) reals.push(inv(-Math.sinh(mu), 0)[0]);
  const zeros = [];
  for (let m = 1; m <= Math.floor(n / 2); m++) {
    zeros.push(Ws / Math.cos(((2 * m - 1) * Math.PI) / (2 * n)));
  }
  const den = polyFromRoots(reals, pairs);
  const num0 = polyFromRoots([], zeros.map((z) => [0, z]));
  const K = den[den.length - 1] / num0[num0.length - 1];
  return {
    num: Float64Array.from(num0, (c) => c * K),
    den,
    zeros,
    poles: { reals, pairs },
  };
}

function designEllip(n, k, ep, es, Amax) {
  const k1 = ep / es;
  // re-solve the degree equation for the integer n through the COMPLEMENT
  // moduli: ripples stay exactly Amax/Amin, the stopband edge moves inward
  const k1p = Math.sqrt(1 - k1 * k1);
  let kp = k1p ** n;
  const L = Math.floor(n / 2);
  for (let i = 1; i <= L; i++) {
    kp *= sne((2 * i - 1) / n, k1p) ** 4;
  }
  k = Math.sqrt(1 - kp * kp);

  const v0 = asneImag(1 / ep, k1) / n;
  const pairs = [];
  const reals = [];
  const zeros = [];
  for (let i = 1; i <= L; i++) {
    const u = (2 * i - 1) / n;
    const zeta = cde([u, 0], k)[0];
    zeros.push(1 / (k * zeta));
    const w = cde([u, -v0], k); // pole = j·w
    pairs.push([-w[1], w[0]]);
  }
  // odd order: one real pole p0 = j·sn(j·v0·K, k) = −sneImag(v0, k)
  if (n % 2 === 1) reals.push(-sneImag(v0, k));
  const den = polyFromRoots(reals, pairs);
  const num0 = polyFromRoots([], zeros.map((z) => [0, z]));
  let K = den[den.length - 1] / num0[num0.length - 1];
  if (n % 2 === 0) K *= 10 ** (-Amax / 20);
  return {
    num: Float64Array.from(num0, (c) => c * K),
    den,
    zeros,
    poles: { reals, pairs },
    ellipK: k,
  };
}

/**
 * @param {{family: string, fp: number, fstop: number, Amax: number,
 *          Amin: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ family, fp, fstop, Amax, Amin }) {
  const Ws = fstop / fp;
  const ep = Math.sqrt(10 ** (Amax / 10) - 1);
  const es = Math.sqrt(10 ** (Amin / 10) - 1);
  const n = requiredOrder({ family, fp, fstop, Amax, Amin });

  let d;
  if (family === 'butter') d = designButter(n, ep);
  else if (family === 'cheby1') d = designCheby1(n, ep, Amax);
  else if (family === 'cheby2') d = designCheby2(n, Ws, Amin);
  else d = designEllip(n, 1 / Ws, ep, es, Amax);

  const { num, den } = d;
  const magDb = (W) => {
    const [nr, ni] = polyEvalComplex(num, 0, W);
    const [dr, di] = polyEvalComplex(den, 0, W);
    const m = Math.hypot(nr, ni) / Math.hypot(dr, di);
    return Math.max(DB_FLOOR, 20 * Math.log10(m + 1e-300));
  };

  // magnitude response on a log grid (Hz axis, Ω = f/fp internally)
  const fMin = fp / 8;
  const fMax = fstop * 8;
  const rf = new Float64Array(NPTS);
  const ry = new Float64Array(NPTS);
  const lr = Math.log(fMax / fMin);
  for (let i = 0; i < NPTS; i++) {
    const f = fMin * Math.exp((lr * i) / (NPTS - 1));
    rf[i] = f;
    ry[i] = magDb(f / fp);
  }

  // group delay over the passband and early transition, stopping before the
  // first transmission zero (the phase flips π at a notch — τg is undefined
  // there, for Chebyshev 2 and elliptic alike)
  const minZero = d.zeros.length ? Math.min(...d.zeros) : Infinity;
  const fTop = Math.min(1.5, 0.95 * minZero) * fp;
  const NG = 400;
  const gf = new Float64Array(NG);
  const phase = new Float64Array(NG);
  for (let i = 0; i < NG; i++) {
    const f = fMin + ((fTop - fMin) * i) / (NG - 1);
    gf[i] = f;
    const [nr, ni] = polyEvalComplex(num, 0, f / fp);
    const [dr, di] = polyEvalComplex(den, 0, f / fp);
    phase[i] = Math.atan2(ni, nr) - Math.atan2(di, dr);
  }
  // unwrap, then τg = −dφ/dω (seconds → ms); ω = 2πf/(2πfp)·ωp ⇒ dω = 2π df
  for (let i = 1; i < NG; i++) {
    while (phase[i] - phase[i - 1] > Math.PI) phase[i] -= 2 * Math.PI;
    while (phase[i] - phase[i - 1] < -Math.PI) phase[i] += 2 * Math.PI;
  }
  const gy = new Float64Array(NG);
  for (let i = 0; i < NG; i++) {
    const im = Math.max(1, Math.min(NG - 2, i));
    const dphi = phase[im + 1] - phase[im - 1];
    const domega = 2 * Math.PI * (gf[im + 1] - gf[im - 1]);
    gy[i] = (-dphi / domega) * 1000; // ms
  }

  // template forbidden zones (drawn as bands on the response view)
  const zone1 = {
    x: Float64Array.from([fMin, fp]),
    lo: Float64Array.from([DB_FLOOR, DB_FLOOR]),
    hi: Float64Array.from([-Amax, -Amax]),
  };
  const zone2 = {
    x: Float64Array.from([fstop, fMax]),
    lo: Float64Array.from([-Amin, -Amin]),
    hi: Float64Array.from([5, 5]),
  };

  // pole-zero map, normalized by ωp (checks + PZ view)
  const px = [];
  const py = [];
  for (const r of d.poles.reals) {
    px.push(r);
    py.push(0);
  }
  for (const [a, b] of d.poles.pairs) {
    px.push(a, a);
    py.push(b, -b);
  }
  const zx = [];
  const zy = [];
  for (const z of d.zeros) {
    zx.push(0, 0);
    zy.push(z, -z);
  }

  // denormalized coefficients (s in rad/s, ωp = 2π·fp) — same H(s)
  const wp = 2 * Math.PI * fp;
  const denReal = Float64Array.from(den, (c, i) => c * wp ** i);
  const numReal = Float64Array.from(num, (c, i) => c * wp ** (den.length - num.length + i));

  const dcDb = magDb(0);
  const attStop = -magDb(Ws);

  return {
    observables: {
      response: { x: rf, y: ry },
      zone1,
      zone2,
      delay: { x: gf, y: gy },
      polesX: Float64Array.from(px),
      polesY: Float64Array.from(py),
      zerosX: Float64Array.from(zx),
      zerosY: Float64Array.from(zy),
      numProto: num, // normalized prototype (ωp = 1) — Inspector download
      denProto: den,
      numReal, // denormalized (rad/s)
      denReal,
      dcDb, // checks
      edgeDb: magDb(1), // checks: level at fp
      nOrder: { value: n, meta: { label: 'ordre n', precision: 0 } },
      attStopDb: {
        value: attStop,
        meta: { label: 'atténuation à f_a', unit: 'dB', precision: 1 },
      },
    },
  };
}
