// Adaptive filtering: three algorithms, one question.
//
// An unknown system w* turns an input u(n) into an output observed only
// through noise, d(n) = w*ᵀu(n) + v(n). The adaptive filter knows only u and d,
// and must recover w* as it goes — one iteration per sample, without ever
// solving a global system.
//
//   LMS    ŵ ← ŵ + μ·e·u          the stochastic gradient, two lines, one
//                                 multiplication per coefficient
//   NLMS   ŵ ← ŵ + μ̃·e·u/‖u‖²     the same, with the step made dimensionless:
//                                 μ̃ ∈ ]0, 2[ whatever the input power, which
//                                 is THE whole difference in practice
//   RLS    ŵ ← ŵ + k·e            exact least squares at every instant, L²
//                                 operations instead of L
//
// The price and the gain are read off a single quantity: the autocorrelation
// matrix R of the input. LMS follows its eigenvalues — each mode converges at
// its own rate, so the slowest holds everyone up, and the ratio λmax/λmin says
// how long the wait is. RLS implicitly whitens by R⁻¹ and stops seeing that
// ratio at all. That is what the L² multiplications buy.
//
// PURE: no DOM, no state, generator passed as an argument. Importable from
// compute.js AND check.js.

import { jacobiSym, quadForm } from '../../../core/linalg.js';

/**
 * The system to identify: an oscillating, damped impulse response of unit
 * norm, so that the useful signal power does not depend on L. Deterministic —
 * it is not the thing being drawn at random.
 *
 * @param {number} L length
 * @param {number} variant 0 = the nominal channel, 1 = the one after the jump
 */
export function trueChannel(L, variant = 0) {
  const w = new Float64Array(L);
  let norm = 0;
  for (let k = 0; k < L; k++) {
    // the second channel is not noise: it is the SAME system with a faster
    // oscillation and the first coefficient flipped, so that the jump shows
    // on the coefficient plot
    w[k] = variant === 0
      ? Math.cos(0.4 * Math.PI * k) * Math.exp(-0.25 * k)
      : -Math.cos(0.75 * Math.PI * k) * Math.exp(-0.2 * k);
    norm += w[k] * w[k];
  }
  norm = Math.sqrt(norm);
  for (let k = 0; k < L; k++) w[k] /= norm;
  return w;
}

/**
 * A UNIT-variance AR(1) input: u(n) = a·u(n−1) + √(1−a²)·g(n).
 *
 * The √(1−a²) factor is not cosmetic — without it, colouring the input would
 * also raise its power, and the slowdown of LMS one wants to attribute to the
 * conditioning would partly come from a step grown too large. At fixed
 * variance, only one explanation remains.
 */
export function ar1Input(N, a, gauss) {
  const u = new Float64Array(N);
  const s = Math.sqrt(1 - a * a);
  let prev = 0;
  for (let n = 0; n < N; n++) {
    prev = a * prev + s * gauss();
    u[n] = prev;
  }
  return u;
}

/** Autocorrélation EXACTE d'une AR(1) de variance 1 : R[i][j] = a^|i−j|. */
export function toeplitzAR1(a, L) {
  const R = new Float64Array(L * L);
  for (let i = 0; i < L; i++) for (let j = 0; j < L; j++) R[i * L + j] = a ** Math.abs(i - j);
  return R;
}

/** Valeurs propres extrêmes et conditionnement d'une matrice symétrique. */
export function eigSpread(R, L) {
  const eig = jacobiSym(Float64Array.from(R), L);
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of eig.values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return { min: lo, max: hi, spread: hi / lo, vectors: eig.vectors, values: eig.values };
}

/**
 * The MEAN-SQUARE stability bound of LMS: the largest step such that
 * Σ_i μλ_i/(1−μλ_i) < 2.
 *
 * This is not the textbook bound. μ < 2/tr(R) guarantees convergence of the
 * MEAN of ŵ, which does not stop its variance from exploding — and the variance
 * is what decides, as the measurement shows: at L = 8 with a white input,
 * divergence happens at 0.195 where 2/tr(R) announces 0.25 and this bound
 * announces 0.200.
 *
 * It still assumes the regressor independent of the filter, and that assumption
 * breaks when the input is correlated: at a = 0.9 the real threshold falls to
 * 0.038 against 0.104 announced. A theoretical bound optimistic by a factor of
 * 2.7 is something an experiment must SHOW, not hide.
 */
export function msBound(values) {
  const lMax = Math.max(...values);
  let lo = 0;
  let hi = 1 / lMax;
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2;
    let s = 0;
    for (const l of values) s += (m * l) / (1 - m * l);
    if (s < 2) lo = m;
    else hi = m;
  }
  return lo;
}

// xᵀRx — the power of a filter at its input — comes from the core: three
// subjects compute it, each for a different reason (signal power here, excess
// MSE below, projected variance in PCA). Re-exported so that this subject's
// harness finds it where it has always found it.
export { quadForm };

/**
 * ONE realization of the adaptation.
 *
 * Returns the instantaneous SQUARED error at each iteration — that is what gets
 * averaged over independent realizations to obtain a learning curve. A single
 * realization is unreadable: e²(n) fluctuates over two decades around its mean,
 * and the eye sees a decay there where there is none yet.
 *
 * @param {object} o
 * @param {'lms'|'nlms'|'rls'} o.algo
 * @param {number} o.mu     step (μ for LMS, normalized μ̃ for NLMS)
 * @param {number} o.lambda forgetting factor (RLS)
 * @param {number} o.L      filter length
 * @param {number} o.N      number of iterations
 * @param {Float64Array} o.u      input
 * @param {Float64Array} o.wTrue  system to identify
 * @param {Float64Array} [o.wAfter] system after the jump (tracking)
 * @param {number} [o.switchAt]   instant of the jump, or 0
 * @param {number} o.sigmaV       measurement-noise standard deviation
 * @param {() => number} o.gauss
 * @param {boolean} [o.keepPath]  keep the coefficient trajectory
 * @param {Float64Array} [o.R]    L×L autocorrelation — if given, the excess
 *   MSE w̃ᵀRw̃ is returned at each iteration
 * @returns {{e2: Float64Array, ex: Float64Array|null, wPath: Float64Array|null,
 *            wFinal: Float64Array, diverged: boolean}}
 */
export function runAdaptive({
  algo,
  mu,
  lambda = 1,
  L,
  N,
  u,
  wTrue,
  wAfter = null,
  switchAt = 0,
  sigmaV,
  gauss,
  keepPath = false,
  R = null,
  p0 = 1e4,
}) {
  const w = new Float64Array(L); // ŵ(0) = 0: nothing is assumed
  const x = new Float64Array(L); // the regressor, most recent to oldest
  const e2 = new Float64Array(N);
  const wPath = keepPath ? new Float64Array(N * L) : null;
  // The EXCESS MSE, w̃ᵀRw̃: the only quantity in this setup that measures the
  // adaptation WITHOUT the measurement noise. e²(n) holds σ² plus a few per
  // cent of excess, and estimating those few per cent through the variance of
  // σ² would take tens of thousands of iterations — at the nominal step, the
  // reading taken from e² is off by a factor of 1.5. Here the noise does not
  // enter: ŵ is what it is, and its distance to w* is computed.
  const ex = R ? new Float64Array(N) : null;
  const wErrVec = R ? new Float64Array(L) : null;

  // RLS: P = δ⁻¹I. δ = 1/p0 is the initial regularization — "no prior
  // information" as it tends to zero, which makes the first L iterations
  // equivalent to solving the system exactly. The default stays moderate
  // (δ = 1e-4) so that the very first iterations are not numerically wild on
  // screen; the harness pushes it to 1e-10 to pin the EXACT identity.
  const P = algo === 'rls' ? new Float64Array(L * L) : null;
  const Px = algo === 'rls' ? new Float64Array(L) : null;
  const kg = algo === 'rls' ? new Float64Array(L) : null;
  if (P) for (let i = 0; i < L; i++) P[i * L + i] = p0;

  let diverged = false;

  for (let n = 0; n < N; n++) {
    // regressor: u(n), u(n−1), … (zeros before the start, like a real filter
    // powering up)
    for (let k = 0; k < L; k++) x[k] = n - k >= 0 ? u[n - k] : 0;

    const wRef = wAfter && switchAt && n >= switchAt ? wAfter : wTrue;
    let d = 0;
    for (let k = 0; k < L; k++) d += wRef[k] * x[k];
    d += sigmaV * gauss();

    let y = 0;
    for (let k = 0; k < L; k++) y += w[k] * x[k];
    const e = d - y;
    e2[n] = e * e;

    if (!Number.isFinite(e) || e2[n] > 1e12) {
      // A divergence is a RESULT (μ above the bound), not a failure: it is
      // recorded, the curve is frozen at a huge but finite value, and the plot
      // stays readable instead of disappearing.
      diverged = true;
      for (let m = n; m < N; m++) e2[m] = 1e12;
      if (ex) for (let m = n; m < N; m++) ex[m] = 1e12;
      if (wPath) for (let m = n; m < N; m++) for (let k = 0; k < L; k++) wPath[m * L + k] = w[k];
      break;
    }

    if (algo === 'lms') {
      for (let k = 0; k < L; k++) w[k] += mu * e * x[k];
    } else if (algo === 'nlms') {
      let nx = 1e-8;
      for (let k = 0; k < L; k++) nx += x[k] * x[k];
      const g = (mu * e) / nx;
      for (let k = 0; k < L; k++) w[k] += g * x[k];
    } else {
      // P·x, then the Kalman gain k = Px / (λ + xᵀPx)
      let xpx = 0;
      for (let i = 0; i < L; i++) {
        let s = 0;
        for (let j = 0; j < L; j++) s += P[i * L + j] * x[j];
        Px[i] = s;
        xpx += x[i] * s;
      }
      const den = lambda + xpx;
      for (let i = 0; i < L; i++) kg[i] = Px[i] / den;
      for (let i = 0; i < L; i++) w[i] += kg[i] * e;
      // P ← (P − k·(Px)ᵀ)/λ — symmetrized at the end of the update, without
      // which rounding drifts it toward a non-symmetric matrix and the
      // algorithm eventually explodes after a few thousand iterations
      for (let i = 0; i < L; i++)
        for (let j = 0; j < L; j++) P[i * L + j] = (P[i * L + j] - kg[i] * Px[j]) / lambda;
      for (let i = 0; i < L; i++)
        for (let j = i + 1; j < L; j++) {
          const s = 0.5 * (P[i * L + j] + P[j * L + i]);
          P[i * L + j] = s;
          P[j * L + i] = s;
        }
    }

    if (wPath) for (let k = 0; k < L; k++) wPath[n * L + k] = w[k];
    if (ex) {
      for (let k = 0; k < L; k++) wErrVec[k] = w[k] - wRef[k];
      ex[n] = quadForm(R, wErrVec, L);
    }
  }

  return { e2, ex, wPath, wFinal: w, diverged };
}

/**
 * The a posteriori error: what the filter WOULD have given on the same sample,
 * once the update is done. It is the quantity that defines NLMS — at μ̃ = 1 it
 * is exactly zero, and the harness pins it.
 */
export function posterioriError({ x, d, w, mu, L }) {
  let y = 0;
  for (let k = 0; k < L; k++) y += w[k] * x[k];
  const e = d - y;
  let nx = 0;
  for (let k = 0; k < L; k++) nx += x[k] * x[k];
  const wNew = Float64Array.from(w);
  for (let k = 0; k < L; k++) wNew[k] += ((mu * e) / nx) * x[k];
  let yNew = 0;
  for (let k = 0; k < L; k++) yNew += wNew[k] * x[k];
  return d - yNew;
}

/**
 * Level curves of the error surface, for L = 2: J(w) = σ² + (w−w*)ᵀR(w−w*) is
 * a paraboloid, so its levels are ELLIPSES whose axes are the eigenvectors of R
 * and whose half-lengths are √(c/λ). This is the figure that explains all the
 * rest: with a white input R = I, the ellipses are circles and the gradient
 * points at the bottom; coloured, they stretch in the ratio λmax/λmin and the
 * descent zigzags instead of descending.
 *
 * Computed HERE and not in the view: a view does no science.
 */
export function costContour(R, wTrue, level, points = 128) {
  const { values, vectors } = eigSpread(R, 2);
  const x = new Float64Array(points + 1);
  const y = new Float64Array(points + 1);
  for (let i = 0; i <= points; i++) {
    const t = (2 * Math.PI * i) / points;
    const r0 = Math.sqrt(level / Math.max(values[0], 1e-12)) * Math.cos(t);
    const r1 = Math.sqrt(level / Math.max(values[1], 1e-12)) * Math.sin(t);
    // back into the coefficient basis: w = w* + Q·r
    x[i] = wTrue[0] + vectors[0] * r0 + vectors[1] * r1;
    y[i] = wTrue[1] + vectors[2] * r0 + vectors[3] * r1;
  }
  return { x, y };
}
