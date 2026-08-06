// What it costs NOT to know — the same detection problem as next door, with
// one piece of knowledge removed at a time.
//
// The neighbouring experiment assumes the signal known down to its amplitude
// and the noise power known: the Neyman–Pearson test then exists, is optimal,
// and its statistic is Gaussian. Real detection almost never has that. Take the
// knowledge away one item at a time and a different test appears each time,
// with a different law and a different price:
//
//   matched   s known, A known, σ known    T = Σxs            N(0,1) | N(A,1)
//   GLRT      s known, A UNKNOWN, σ known  T = (Σxs)²         χ²₁ | χ'²₁(A²)
//   energy    s UNKNOWN, σ known           T = Σx²            χ²_N | χ'²_N(A²)
//   CFAR      s unknown, σ UNKNOWN         T = (Σx²/N)/σ̂²    F(N, RN) | —
//
// Every one of those laws is exact and in closed form here (core/numeric.js
// carries the χ², non-central χ² and F CDFs), so the curves are theory and the
// Monte Carlo runs the FULL N-sample simulation beside them rather than
// sampling the statistic's known law — the same discipline as the neighbour.
//
// THE RESULT THE EXPERIMENT EXISTS FOR is the slope of P_D against SNR. The
// matched filter's deflection grows as √N·SNR; the energy detector's as
// N·SNR²/√(2N) = SNR²·√(N/2). Per decibel of SNR that is a factor of TWO in
// the exponent, which is why an unknown signal costs so much more than an
// unknown amplitude, and why a radiometer needs N ∝ 1/SNR² samples where a
// matched filter needs N ∝ 1/SNR.
//
// CFAR is the other kind of ignorance and it behaves differently: not knowing
// σ costs a THRESHOLD that has to move with the estimate, and the loss is a
// fixed number of decibels that vanishes as the reference window grows —
// α = R(P_FA^(−1/R) − 1) → −ln P_FA. Nothing about the slope changes.
//
// Convention shared with detection/neyman-pearson: σ = 1, `snr` is the
// PER-SAMPLE signal-to-noise ratio, and the signal has unit norm, so its
// amplitude is A = √(N·snr) and the matched filter's deflection is that A.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import {
  normalPdf,
  normalCdf,
  normalQuantile,
  chi2Cdf,
  chi2Pdf,
  chi2Quantile,
  ncChi2Cdf,
  fQuantile,
  logGamma,
} from '../../../core/numeric.js';

const NG = 301; // points on a density
const NROC = 121; // points on the ROC
const NSNR = 61; // points on P_D vs SNR
const NQUAD = 160; // nodes of the quadrature over the estimated noise power

/** The unit-norm signal shape: a half-cycle of sine, so the matched filter is
 *  not the trivial sum and the energy detector has something to be ignorant
 *  of. Σs² = 1 exactly, by construction. */
export function shape(N) {
  const s = new Float64Array(N);
  let e = 0;
  for (let n = 0; n < N; n++) {
    s[n] = Math.sin((Math.PI * (n + 0.5)) / N);
    e += s[n] * s[n];
  }
  const g = 1 / Math.sqrt(e);
  for (let n = 0; n < N; n++) s[n] *= g;
  return s;
}

/** pdf of Fisher's F(d1, d2), through logs. */
export function fPdf(x, d1, d2) {
  if (x <= 0) return 0;
  const lb = logGamma(d1 / 2) + logGamma(d2 / 2) - logGamma((d1 + d2) / 2);
  return Math.exp(
    (d1 / 2) * Math.log(d1 / d2) +
      (d1 / 2 - 1) * Math.log(x) -
      ((d1 + d2) / 2) * Math.log(1 + (d1 * x) / d2) -
      lb
  );
}

/**
 * P_D of the CA-CFAR at a given amplitude. The threshold is γ·V/R with
 * V ~ χ²_{RN} the reference energy, so the detection probability is the
 * detection probability of the energy detector AVERAGED over a threshold that
 * moves — which is exactly what estimating σ costs, and it is a quadrature
 * over the reference law rather than an approximation.
 */
export function cfarPd(gamma, N, R, lambda) {
  const dof = R * N;
  const lo = chi2Quantile(1e-7, dof);
  const hi = chi2Quantile(1 - 1e-7, dof);
  const h = (hi - lo) / (NQUAD - 1);
  let acc = 0;
  let wsum = 0;
  for (let i = 0; i < NQUAD; i++) {
    const v = lo + i * h;
    const w = chi2Pdf(v, dof) * (i === 0 || i === NQUAD - 1 ? 0.5 : 1);
    acc += w * (1 - ncChi2Cdf((gamma * v) / R, N, lambda));
    wsum += w;
  }
  return acc / wsum; // normalised: the tails outside the bracket carry 2e-7
}

/** Threshold, P_D and the two densities of one detector, all in closed form. */
export function theory(detector, { N, pfa, R }, A) {
  const lam = A * A;
  if (detector === 'matched') {
    const g = normalQuantile(1 - pfa);
    return { gamma: g, pd: 1 - normalCdf(g - A), dof: 0 };
  }
  if (detector === 'glrt') {
    const g = chi2Quantile(1 - pfa, 1);
    return { gamma: g, pd: 1 - ncChi2Cdf(g, 1, lam), dof: 1 };
  }
  if (detector === 'energy') {
    const g = chi2Quantile(1 - pfa, N);
    return { gamma: g, pd: 1 - ncChi2Cdf(g, N, lam), dof: N };
  }
  const g = fQuantile(1 - pfa, N, R * N);
  return { gamma: g, pd: cfarPd(g, N, R, lam), dof: N };
}

/** The statistic of one realization, from the N samples themselves. */
function statistic(detector, x, s, ref) {
  const N = x.length;
  if (detector === 'matched' || detector === 'glrt') {
    let t = 0;
    for (let n = 0; n < N; n++) t += x[n] * s[n];
    return detector === 'matched' ? t : t * t;
  }
  let e = 0;
  for (let n = 0; n < N; n++) e += x[n] * x[n];
  if (detector === 'energy') return e;
  let v = 0;
  for (let n = 0; n < ref.length; n++) v += ref[n] * ref[n];
  return e / N / (v / ref.length);
}

/**
 * @param {{snr: number, pfa: number, N: number, R: number, detector: string,
 *          M: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ snr, pfa, N, R, detector, M, seed }) {
  const s = shape(N);
  const A = Math.sqrt(N * snr);
  const th = theory(detector, { N, pfa, R }, A);
  const isGauss = detector === 'matched';

  /* ---------- the two densities of the selected statistic ----------------- */
  // CFAR draws the ENERGY densities: its statistic differs from the energy
  // detector's only by a threshold that moves, and showing that moving
  // threshold on the energy law says what estimating σ costs. A doubly
  // non-central F would say the same thing in a shape nobody can read.
  const dof = th.dof;
  const lam = A * A;
  const lo = isGauss ? -4.5 : 0;
  const hi = isGauss
    ? A + 4.5
    : Math.max(chi2Quantile(0.9995, dof + Math.ceil(lam)), th.gamma * (detector === 'cfar' ? 2.2 : 1.4));
  const gt = new Float64Array(NG);
  const f0 = new Float64Array(NG);
  const f1 = new Float64Array(NG);
  // the non-central χ² pdf as the Poisson mixture its CDF already is
  const ncPdf = (x, k, l) => {
    if (l <= 0) return chi2Pdf(x, k);
    const half = l / 2;
    let acc = 0;
    let logw = -half;
    const jMax = Math.max(60, Math.ceil(half + 12 * Math.sqrt(half + 1)));
    for (let j = 0; j <= jMax; j++) {
      if (j > 0) logw += Math.log(half) - Math.log(j);
      const w = Math.exp(logw);
      if (w > 1e-300) acc += w * chi2Pdf(x, k + 2 * j);
      if (j > half && w < 1e-17) break;
    }
    return acc;
  };
  for (let i = 0; i < NG; i++) {
    const t = lo + ((hi - lo) * i) / (NG - 1);
    gt[i] = t;
    f0[i] = isGauss ? normalPdf(t) : chi2Pdf(t, dof);
    f1[i] = isGauss ? normalPdf(t, A, 1) : ncPdf(t, dof, lam);
  }

  // WHERE THE THRESHOLD IS ON THIS AXIS. For the first three detectors it is
  // th.gamma, full stop. For CFAR it is not: the statistic drawn here is the
  // ENERGY, and the test's threshold lives on the RATIO — 2.12 against an
  // energy whose mean is 20. Drawn unconverted it put a line at the left edge
  // and shaded the whole figure. What belongs on this axis is the adaptive
  // threshold γ·V/R at the median reference energy, with the band around it
  // saying how far it moves.
  const gDraw =
    detector === 'cfar' ? (th.gamma * chi2Quantile(0.5, R * N)) / R : th.gamma;

  // the decision areas, as bands from 0 up to each density beyond the threshold
  const zone = (f) => {
    const zx = [gDraw];
    const zhi = [isGauss ? (f === f0 ? normalPdf(gDraw) : normalPdf(gDraw, A, 1)) : 0];
    for (let i = 0; i < NG; i++)
      if (gt[i] > gDraw) {
        zx.push(gt[i]);
        zhi.push(f[i]);
      }
    return { x: Float64Array.from(zx), lo: new Float64Array(zx.length), hi: Float64Array.from(zhi) };
  };

  // CFAR only: where the moving threshold actually lands, 5 % to 95 %
  let thrBand = { x: new Float64Array(0), lo: new Float64Array(0), hi: new Float64Array(0) };
  if (detector === 'cfar') {
    const q = (p) => (th.gamma * chi2Quantile(p, R * N)) / R;
    const a = q(0.05);
    const b = q(0.95);
    let top = 0;
    for (let i = 0; i < NG; i++) top = Math.max(top, f0[i], f1[i]);
    thrBand = {
      x: Float64Array.from([a, b]),
      lo: Float64Array.from([0, 0]),
      hi: Float64Array.from([top, top]),
    };
  }

  /* ---------- the ROC of the selected detector, and the ceiling ----------- */
  const rx = new Float64Array(NROC);
  const rSel = new Float64Array(NROC);
  const rMax = new Float64Array(NROC);
  for (let i = 0; i < NROC; i++) {
    // stops a hair short of 1: normalQuantile(0) is not a number, and a ROC
    // whose last point is NaN poisons every comparison made along it
    const p = Math.min(10 ** (-4 + (4 * i) / (NROC - 1)), 0.9999);
    rx[i] = p;
    rSel[i] = theory(detector, { N, pfa: p, R }, A).pd;
    rMax[i] = theory('matched', { N, pfa: p, R }, A).pd;
  }

  /* ---------- P_D vs SNR: the four of them, at this P_FA ------------------ */
  const sx = new Float64Array(NSNR);
  const pMat = new Float64Array(NSNR);
  const pGlr = new Float64Array(NSNR);
  const pEne = new Float64Array(NSNR);
  const pCfa = new Float64Array(NSNR);
  for (let i = 0; i < NSNR; i++) {
    const db = -25 + (35 * i) / (NSNR - 1);
    sx[i] = db;
    const a = Math.sqrt(N * 10 ** (db / 10));
    pMat[i] = theory('matched', { N, pfa, R }, a).pd;
    pGlr[i] = theory('glrt', { N, pfa, R }, a).pd;
    pEne[i] = theory('energy', { N, pfa, R }, a).pd;
    pCfa[i] = theory('cfar', { N, pfa, R }, a).pd;
  }

  /* ---------- Monte Carlo, on the N samples themselves -------------------- */
  const gauss = gaussFrom(mulberry32(seed));
  const x0 = new Float64Array(N);
  const x1 = new Float64Array(N);
  const ref = new Float64Array(detector === 'cfar' ? R * N : 0);
  let fa = 0;
  let det = 0;
  for (let m = 0; m < M; m++) {
    for (let n = 0; n < N; n++) {
      const w = gauss();
      x0[n] = w;
      x1[n] = A * s[n] + gauss();
    }
    for (let n = 0; n < ref.length; n++) ref[n] = gauss();
    if (statistic(detector, x0, s, ref) > th.gamma) fa++;
    for (let n = 0; n < ref.length; n++) ref[n] = gauss();
    if (statistic(detector, x1, s, ref) > th.gamma) det++;
  }
  const pfaEmp = fa / M;
  const pdEmp = det / M;

  /* ---------- what the ignorance costs, in decibels ----------------------- */
  // the extra SNR the selected detector needs to reach the matched filter's
  // P_D — read off the curves, which is where the room reads it too
  const target = th.pd;
  const snrDb = 10 * Math.log10(snr);
  // interpolated between the two bracketing points: read off the grid alone,
  // a detector that loses nothing came out at −0.17 dB, which is half a grid
  // step and reads like a result
  let needed = NaN;
  for (let i = 1; i < NSNR; i++)
    if (pMat[i] >= target && pMat[i - 1] < target) {
      const f = (target - pMat[i - 1]) / (pMat[i] - pMat[i - 1]);
      needed = sx[i - 1] + f * (sx[i] - sx[i - 1]);
      break;
    }
  const loss = Number.isFinite(needed) ? snrDb - needed : NaN;

  return {
    observables: {
      pdfH0: { x: gt, y: f0 },
      pdfH1: { x: gt, y: f1 },
      pfaZone: zone(f0),
      pdZone: zone(f1),
      thrBand,
      gammaLine: gDraw,

      rocSel: { x: rx, y: rSel },
      rocMatched: { x: rx, y: rMax },
      chanceLine: { x: rx, y: rx },
      opTheory: { x: Float64Array.from([pfa]), y: Float64Array.from([th.pd]) },
      opEmp: { x: Float64Array.from([pfaEmp]), y: Float64Array.from([pdEmp]) },

      pdMatched: { x: sx, y: pMat },
      pdGlrt: { x: sx, y: pGlr },
      pdEnergy: { x: sx, y: pEne },
      pdCfar: { x: sx, y: pCfa },
      snrLine: snrDb,
      opSnrEmp: { x: Float64Array.from([snrDb]), y: Float64Array.from([pdEmp]) },

      gamma: { value: th.gamma, meta: { label: 'γ', precision: 2 } },
      pdTh: { value: th.pd, meta: { label: 'P_D', precision: 3 } },
      pdEmpS: { value: pdEmp, meta: { label: 'P̂_D', precision: 3 } },
      pfaEmpS: { value: pfaEmp, meta: { label: 'P̂_FA', precision: 4 } },
      deflection: { value: A, meta: { label: 'd = √(N·SNR)', precision: 2 } },
      lossDb: { value: loss, meta: { label: 'cost of the ignorance', unit: 'dB', precision: 1 } },
    },
  };
}
