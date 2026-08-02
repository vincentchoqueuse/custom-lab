// Analog low-pass prototype design (normalized, ωp = 1): order formulas
// and pole/zero prototypes for Butterworth, Chebyshev 1 & 2 and elliptic
// (Cauer) — including the Landen/Jacobi machinery (Orfanidis's cde/sne/
// asne formulation) behind the elliptic family. Promoted from the
// filter-design experiment when iir-design became the second consumer
// (repo rule: a pattern repeated twice becomes a generic).
// Everything here is pure and worker/Node-safe, importable from
// compute.js AND check.js.

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
export function polyFromRoots(realRoots, pairs) {
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
export function designButter(n, ep) {
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

export function designCheby1(n, ep, Amax) {
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

export function designCheby2(n, Ws, Amin) {
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

export function designEllip(n, k, ep, es, Amax) {
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

