// A filter that adjusts itself — and what each way of doing so costs.
//
// The setup is the IDENTIFICATION one: an unknown system w* receives an input
// u(n) and returns an output observed only through noise. The adaptive filter
// sees only u and d, and works its way back to w* one iteration at a time. It is
// the setup of echo cancellation, of reference-based denoising and of
// equalization — up to the wiring, always the same diagram.
//
// THREE THINGS ARE READ HERE, and each has its view:
//   1. the learning curve descends to a PLATEAU, never to zero: the gradient is
//      estimated from a single sample, so it fluctuates, so ŵ dances around w*.
//      The excess is called the misadjustment and equals μ·tr(R)/2 — it is
//      PROPORTIONAL to the step size, just as the convergence speed is. The
//      whole tuning problem is there.
//   2. the conditioning of R sets the speed of LMS and NOTHING at all for RLS.
//      Colouring the input (a → 0.95) slows LMS by a factor that can be
//      measured; RLS does not budge.
//   3. getting the step size wrong does not degrade: it diverges. The bound is
//      μ < 2/tr(R), and it is crossed live.
//
// THE ITERATION IS A PARAMETER, which avoids any animation engine: the full
// trajectory is a pure function of (params, seed), it is computed in one go and
// the `n` slider sweeps inside it. The scene stays reproducible through its URL,
// freezable and exportable — which an animation that plays by itself is not.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { noiseSigma } from '../../../core/dsp.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { toDb } from '../../../core/numeric.js';
import {
  trueChannel,
  ar1Input,
  toeplitzAR1,
  eigSpread,
  quadForm,
  runAdaptive,
  costContour,
  msBound,
} from '../_lib/adaptive.js';

const N_ITER = 3000; // adaptation iterations
const N_RUNS = 24; // realizations averaged for the learning curve
const SWITCH_AT = 1500; // the channel jumps halfway, in tracking mode

/**
 * @param {{algo: string, mu: number, lambda: number, L: number, a: number,
 *          snr: number, n: number, track: boolean, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ algo, mu, lambda, L, a, snr, n, track, seed }) {
  const wTrue = trueChannel(L, 0);
  const wAfter = track ? trueChannel(L, 1) : null;
  const R = toeplitzAR1(a, L);
  const { spread, max: lMax, values: eigVals } = eigSpread(R, L);

  // Power of the useful signal, EXACTLY: w*ᵀRw*. The noise follows from it, so
  // that the displayed SNR is the true one and not an approximation "‖w*‖² = 1
  // hence power 1", which would be wrong as soon as the input is coloured.
  const sigPow = quadForm(R, wTrue, L);
  const sigmaV = noiseSigma(sigPow, snr);
  const noisePow = sigmaV * sigmaV;

  // The learning curve is an ENSEMBLE AVERAGE: e²(n) of a single realization
  // fluctuates over two decades and the eye reads a decay in it that never
  // happened. Realization 0 serves the views that show a PARTICULAR filter
  // (coefficients, trajectory) — the same split as in the estimation
  // experiments.
  const mse = new Float64Array(N_ITER);
  const exc = new Float64Array(N_ITER);
  let wPath = null;
  let wFinal = null;
  let diverged = false;
  for (let r = 0; r < N_RUNS; r++) {
    const gauss = gaussFrom(mulberry32(seed + r * 7919));
    const u = ar1Input(N_ITER, a, gauss);
    const res = runAdaptive({
      algo,
      mu,
      lambda,
      L,
      N: N_ITER,
      u,
      wTrue,
      wAfter,
      switchAt: track ? SWITCH_AT : 0,
      sigmaV,
      gauss,
      keepPath: r === 0,
      R,
    });
    for (let i = 0; i < N_ITER; i++) {
      mse[i] += res.e2[i] / N_RUNS;
      exc[i] += res.ex[i] / N_RUNS;
    }
    if (r === 0) {
      wPath = res.wPath;
      wFinal = res.wFinal;
    }
    diverged = diverged || res.diverged;
  }

  const mseDb = new Float64Array(N_ITER);
  const excDb = new Float64Array(N_ITER);
  const iters = new Float64Array(N_ITER);
  for (let i = 0; i < N_ITER; i++) {
    iters[i] = i + 1;
    mseDb[i] = toDb(Math.sqrt(Math.max(mse[i], 1e-30)));
    excDb[i] = toDb(Math.sqrt(Math.max(exc[i], 1e-30)));
  }
  const floorDb = toDb(Math.sqrt(noisePow));

  /* ---------- what the curve says, as numbers ----------------------------- */
  // The plateau: the mean of the last quarter, before the jump if there is one.
  const from = track ? Math.floor(SWITCH_AT * 0.75) : Math.floor(N_ITER * 0.75);
  const to = track ? SWITCH_AT : N_ITER;
  let plateau = 0;
  let plateauEx = 0;
  for (let i = from; i < to; i++) {
    plateau += mse[i] / (to - from);
    plateauEx += exc[i] / (to - from);
  }
  // A plateau is only one if it stops descending. At a very small step size —
  // or at strong conditioning — 3000 iterations are not enough, and the
  // "misadjustment" read would be that of a convergence still in progress. The
  // two halves of the window are therefore compared: while they differ, the
  // statline shows "—" rather than a wrong number.
  const mid = Math.floor((from + to) / 2);
  let exEarly = 0;
  let exLate = 0;
  for (let i = from; i < mid; i++) exEarly += exc[i] / (mid - from);
  for (let i = mid; i < to; i++) exLate += exc[i] / (to - mid);
  const settled = exEarly < 1.2 * exLate;
  // Misadjustment: the excess MSE relative to the floor. Its theory fits on one
  // line, which is the interest — provided it is MEASURED correctly. Read off
  // e², one would have to extract a few percent of excess from the variance of
  // the noise itself: at the nominal step size the reading is then wrong by a
  // factor 1.5, which is worse than showing nothing. Read off w̃ᵀRw̃, the noise
  // does not enter and the measurement lands on the theory (verified by the
  // harness). Once diverged there is no plateau: neither the measurement nor the
  // theory means anything (the formula would even go NEGATIVE, μ·tr(R) exceeding
  // 2), and the statline must say "—" rather than show a number that means
  // nothing beside the word "diverged".
  const misMeas = diverged || !settled ? NaN : plateauEx / noisePow;
  const trR = L; // tr(R) = L·σ_u² and σ_u² = 1 by construction
  const misTheo =
    algo === 'lms'
      ? (mu * trR) / (2 - mu * trR)
      : algo === 'nlms'
        ? // μ̃/(2−μ̃) is an ASYMPTOTIC IN L, not a wrong formula: it comes from
          // the approximation E[x xᵀ/‖x‖²] ≈ I/L, true when L is large, and the
          // textbooks state it as such. What would be wrong is applying it as is
          // at L = 4, where it is short by a factor 2. The term the
          // approximation discards is exactly E[‖x‖²]·E[1/‖x‖²] = L/(L−2) for a
          // white Gaussian regressor, since E[1/χ²_L] = 1/(L−2).
          //
          // Measured on a long run (N = 60 000, 24 realizations, μ̃ = 0.5), the
          // ratio to the asymptotic result is 1.978, 1.321, 1.137 and 1.061 for
          // L = 4, 8, 16 and 32 — that is L/(L−2) to within 1 %. It is therefore
          // no artefact of the measurement window, and nothing is converted to
          // decibels here: the misadjustment is a ratio of powers.
          //
          // At L = 2 the correction DIVERGES, E[1/χ²₂] being infinite, and the
          // statline shows "—" rather than a number: that is a property of NLMS,
          // not a hole in the computation.
          L > 2
          ? ((mu / (2 - mu)) * L) / (L - 2)
          : NaN
        : lambda < 1
          ? ((1 - lambda) * L) / 2
          : 0;

  // Speed: the first iteration where the curve comes within 3 dB of the
  // plateau. Measured on the averaged curve, hence reproducible.
  const target = plateau * 2;
  let n3 = NaN;
  for (let i = 0; i < to; i++)
    if (mse[i] <= target) {
      n3 = i + 1;
      break;
    }

  /* ---------- the coefficients at the chosen iteration -------------------- */
  const nIdx = Math.min(Math.max(Math.round(n), 1), N_ITER) - 1;
  const taps = new Float64Array(L);
  const tapsTrue = new Float64Array(L);
  const idx = new Float64Array(L);
  for (let k = 0; k < L; k++) {
    idx[k] = k;
    taps[k] = wPath[nIdx * L + k];
    tapsTrue[k] = (track && nIdx >= SWITCH_AT ? wAfter : wTrue)[k];
  }
  let wErr = 0;
  for (let k = 0; k < L; k++) wErr += (taps[k] - tapsTrue[k]) ** 2;
  wErr = Math.sqrt(wErr);

  /* ---------- the weights against time ------------------------------------ */
  // The L trajectories ŵₖ(n) and the L true values, as TWO observables and not
  // 2L: a single trace, cut by NaNs, which the generic plot breaks at each cut.
  // This is the view that shows the adaptation itself — the filter filling in
  // coefficient by coefficient — where the learning curve shows only its
  // quadratic summary.
  const dec = Math.max(1, Math.floor((nIdx + 1) / 500));
  const perTrack = Math.floor(nIdx / dec) + 1;
  const trackLen = (perTrack + 1) * L;
  const wtX = new Float64Array(trackLen);
  const wtY = new Float64Array(trackLen);
  const wrX = new Float64Array(3 * L);
  const wrY = new Float64Array(3 * L);
  for (let k = 0; k < L; k++) {
    const base = k * (perTrack + 1);
    for (let i = 0; i < perTrack; i++) {
      wtX[base + i] = i * dec + 1;
      wtY[base + i] = wPath[i * dec * L + k];
    }
    wtX[base + perTrack] = NaN; // the cut between two coefficients
    wtY[base + perTrack] = NaN;
    // the true value, as a horizontal segment over the whole duration
    wrX[k * 3] = 1;
    wrY[k * 3] = tapsTrue[k];
    wrX[k * 3 + 1] = nIdx + 1;
    wrY[k * 3 + 1] = tapsTrue[k];
    wrX[k * 3 + 2] = NaN;
    wrY[k * 3 + 2] = NaN;
  }

  /* ---------- the descent in the weight plane ----------------------------- */
  // Two coefficients are enough to see the geometry, and it is the only way to
  // SEE why the conditioning costs: at L = 2 the plot is the error surface
  // itself. Beyond that it is the projection onto the first two axes — still
  // readable, but the iso-contours would no longer mean anything and are
  // therefore not drawn at all.
  const stride = Math.max(1, Math.floor((nIdx + 1) / 600));
  const pts = Math.floor(nIdx / stride) + 1;
  const px = new Float64Array(pts);
  const py = new Float64Array(pts);
  for (let i = 0; i < pts; i++) {
    px[i] = wPath[i * stride * L];
    py[i] = wPath[i * stride * L + 1];
  }
  const wStart = { x: Float64Array.of(0), y: Float64Array.of(0) };
  const wOpt = { x: Float64Array.of(tapsTrue[0]), y: Float64Array.of(tapsTrue[1]) };
  const empty = { x: new Float64Array(0), y: new Float64Array(0) };
  // Three levels, as fractions of the cost at the STARTING point ŵ = 0, which
  // is exactly (0−w*)ᵀR(0−w*) = w*ᵀRw*. Deliberately well below: a contour
  // through the start would stretch the frame over the whole length of the
  // ellipse — four times the distance to the optimum when the input is coloured
  // — and the zigzag one came to look at would fit in ten pixels. The elongation
  // of the ellipses stays perfectly readable at these levels.
  const c0 = L === 2 ? quadForm(R, tapsTrue, 2) : 0;
  const contours =
    L === 2
      ? [0.06, 0.18, 0.4].map((f) => costContour(R, tapsTrue, f * c0))
      : [empty, empty, empty];

  return {
    observables: {
      // the learning curve, and what it aims at
      learning: { x: iters, y: mseDb },
      floorDb,
      plateauDb: toDb(Math.sqrt(Math.max(plateau, 1e-30))),
      switchLine: track ? SWITCH_AT : NaN,
      nLine: nIdx + 1,

      // the weights against time: L trajectories in a single trace
      wTracks: { x: wtX, y: wtY },
      wRefs: { x: wrX, y: wrY },

      // the coefficients at iteration n
      tapsTrue: { x: idx, y: tapsTrue },
      taps: { x: idx, y: taps },

      // the weight plane
      wTrack: { x: px, y: py },
      wStart,
      wOpt,
      contour1: contours[0],
      contour2: contours[1],
      contour3: contours[2],

      spread: {
        value: spread,
        meta: { label: 'conditioning λmax/λmin', precision: 1 },
      },
      lambdaMax: { value: lMax, meta: { label: 'λmax', precision: 2 } },
      muMax: {
        // The textbook bound — NECESSARY only: it makes the mean of ŵ converge,
        // not its variance. The real step size of divergence is always below it,
        // and scene 2 makes that plain.
        value: 2 / L,
        meta: { label: 'mean-sense bound 2/tr(R)', precision: 4 },
      },
      muMs: {
        // The one that predicts: Σ μλ/(1−μλ) = 2. It lands on the measured
        // threshold to within 3 % on a white input, and becomes optimistic by a
        // factor 2.7 at a = 0.9 — the independence assumption breaks there.
        value: msBound(eigVals),
        meta: { label: 'mean-square bound', precision: 4 },
      },
      misMeas: { value: misMeas, meta: { label: 'measured misadjustment', precision: 3 } },
      misTheo: {
        value: diverged || !(misTheo >= 0) ? NaN : misTheo,
        meta: { label: 'theory', precision: 3 },
      },
      n3: { value: n3, meta: { label: 'iterations to −3 dB of the plateau', precision: 0 } },
      wErrObs: { value: wErr, meta: { label: '‖ŵ(n) − w*‖', precision: 4 } },
      state: {
        value: diverged ? '⚠ diverged' : settled ? 'plateau reached' : 'still converging',
        meta: { label: 'regime' },
      },
      excess: { x: iters, y: excDb },
    },
  };
}
