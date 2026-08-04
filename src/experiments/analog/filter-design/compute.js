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
import {
  requiredOrder,
  designButter,
  designCheby1,
  designCheby2,
  designEllip,
} from '../../../core/filters.js';

export { requiredOrder }; // re-exported: the manifest's validate rules use it

const NPTS = 500; // response grid (log-spaced)
const DB_FLOOR = -90;

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
      // {x, y} series: the shape a declarative plane consumes
      poles: { x: Float64Array.from(px), y: Float64Array.from(py) },
      zeros: { x: Float64Array.from(zx), y: Float64Array.from(zy) },
      numProto: num, // normalized prototype (ωp = 1) — Inspector download
      denProto: den,
      numReal, // denormalized (rad/s)
      denReal,
      dcDb, // checks
      edgeDb: magDb(1), // checks: level at fp
      nOrder: { value: n, meta: { label: 'ordre n', precision: 0 } },
      attStopDb: {
        value: attStop,
        meta: { label: 'attenuation at f_a', unit: 'dB', precision: 1 },
      },
    },
  };
}
