// Image compression by SVD — the same theorem as PCA, on an image rather than
// on a cloud of points.
//
// A greyscale image IS a matrix. Its singular value decomposition writes it as
// a sum of rank-1 layers, σᵢ·uᵢvᵢᵀ, ordered from the most important to the most
// negligible. Keeping the first k gives the BEST rank-k approximation there is
// — Eckart–Young, exactly the theorem of the previous experiment, except that
// here one sees it with the eyes instead of reading it off a curve.
//
// What the experiment makes clear, and an algebra course does not say:
//
//   1. THE GAIN IS NOT IN THE ALGORITHM, IT IS IN THE IMAGE. The SVD compresses
//      nothing by itself; it exploits the decay of the singular values. The
//      phantom decays fast, the noise not at all — and the checkerboard, which
//      looks like the hard case, has rank 2, because it is separable. The eye
//      does not judge rank, and that is the result which surprises a room the
//      most. The four images are all there, and the comparison is made by
//      FREEZING (key F): freeze a spectrum, change image, superpose. That is
//      the gesture the application offers everywhere, and it saves recomputing
//      four decompositions on every move of the slider — 2.8 s, twice the
//      lecture guard.
//   2. THE COST IS COUNTABLE. Storing k layers takes k(m + n + 1) numbers
//      instead of m·n. At 128 × 128 and k = 20, that is 5140 against 16 384: a
//      third. At k = 5, a twelfth — and the image is already recognisable.
//   3. THE ERROR IS KNOWN IN ADVANCE. ‖A − Aₖ‖²_F = Σ_{i≥k} σᵢ². One therefore
//      knows what a compression will cost BEFORE doing it, which is true of no
//      heuristic method.
//
// The image is not copied but COMPUTED (see _lib/images.js): the Shepp–Logan
// phantom is a formula published in 1974, hence free of rights by construction
// — unlike "Lena", which never was.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32 } from '../../../core/rng.js';
import { svd, lowRank } from '../../../core/linalg.js';
import {
  sheppLogan,
  lowRankImage,
  checkerboard,
  noiseImage,
  toBmpDataUri,
} from '../_lib/images.js';

const N = 128; // square N × N image — 110 ms of SVD, sustainable live
const RANK_MAX = 40; // beyond that the eye no longer tells anything apart
const SPEC_FLOOR = 1.2e-3; // display floor of the spectrum (log axis, see below)

/**
 * @param {{image: string, k: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ image, k, seed }) {
  const rand = mulberry32(seed);
  const src =
    image === 'phantom'
      ? sheppLogan(N)
      : image === 'lowrank'
        ? lowRankImage(N, 4)
        : image === 'checker'
          ? checkerboard(N, 8)
          : noiseImage(N, rand);

  const model = modelFor(image, seed, src);
  const kk = Math.min(Math.max(Math.round(k), 1), N);
  const approx = lowRank(model, N, N, kk);

  /* ---------- what the compression costs and what it gives back ----------- */
  // Storing k layers: k vectors of length m, k of length n, k singular values.
  const stored = kk * (2 * N + 1);
  const full = N * N;

  // Measured Frobenius error, and its EXACT value: the sum of the squares of
  // the discarded singular values.
  let errMeasured = 0;
  for (let i = 0; i < full; i++) errMeasured += (approx[i] - src[i]) ** 2;
  let errTheory = 0;
  for (let i = kk; i < model.s.length; i++) errTheory += model.s[i] * model.s[i];

  // PSNR, the customary measure in imaging: 10·log10(max²/MSE), max = 1 here.
  const mse = errMeasured / full;
  const psnr = mse > 0 ? 10 * Math.log10(1 / mse) : Infinity;

  // The singular spectrum of the CURRENT image, normalized to σ₁.
  //
  // A DISPLAY floor, and it is a choice: the axis is logarithmic, exact-rank
  // images have zeros there, and a zero has no place on a log axis. Putting it
  // three decades below the smallest REAL value in the catalogue (2.2e-2, the
  // noise) shows it for what it is — a cliff followed by a plateau at the floor
  // — without squashing the phantom's collapse into the top of the frame, which
  // is the subject of the figure. The axis domain is pinned to the same place in
  // the manifest, failing which the FREEZE gesture would superpose two spectra
  // at different scales.
  const idx = new Float64Array(RANK_MAX);
  const spec = new Float64Array(RANK_MAX);
  const top = Math.max(model.s[0], 1e-300);
  for (let i = 0; i < RANK_MAX; i++) {
    idx[i] = i + 1;
    spec[i] = Math.max(model.s[i] / top, SPEC_FLOOR);
  }

  /* ---------- the energy kept, and the error as a function of k ----------- */
  const kAxis = new Float64Array(RANK_MAX + 1);
  const energy = new Float64Array(RANK_MAX + 1);
  const errK = new Float64Array(RANK_MAX + 1);
  let total = 0;
  for (const s of model.s) total += s * s;
  let acc = 0;
  for (let c = 0; c <= RANK_MAX; c++) {
    kAxis[c] = c;
    if (c > 0) acc += model.s[c - 1] * model.s[c - 1];
    energy[c] = (100 * acc) / total;
    errK[c] = Math.max(1 - acc / total, 1e-12);
  }

  return {
    observables: {
      original: { value: toBmpDataUri(src, N), meta: { label: 'original image' } },
      compressed: { value: toBmpDataUri(approx, N), meta: { label: 'rank k' } },
      // the difference, amplified: THIS is where what k discarded shows
      residual: {
        value: toBmpDataUri(
          Float64Array.from(approx, (v, i) => 0.5 + 4 * (v - src[i])),
          N
        ),
        meta: { label: 'residual ×4' },
      },
      singular: { x: idx, y: spec },
      kLine: kk,

      energy: { x: kAxis, y: energy },
      errCurve: { x: kAxis, y: errK },

      // The statline holds ONE line and truncates beyond it: what appears
      // there is therefore a choice, and the labels are short out of
      // necessity. Five readings — what the compression costs (numbers,
      // factor), what it gives back (PSNR), and the theorem itself, measured
      // then predicted, on either side of the midpoint.
      //
      // Three quantities stay observables WITHOUT a label, hence out of the
      // statline: the energy kept and the relative error are already whole
      // curves, and the full size never moves. They serve the inspector and
      // the harness, which read them by name.
      kept: { value: energy[kk] },
      stored: { value: stored, meta: { label: 'numbers stored', precision: 0 } },
      fullSize: { value: full },
      ratio: { value: full / stored, meta: { label: 'factor', precision: 2 } },
      psnr: { value: psnr, meta: { label: 'PSNR', unit: 'dB', precision: 1 } },
      errMeas: { value: errMeasured, meta: { label: '‖A−Aₖ‖²', precision: 2 } },
      errTheo: { value: errTheory, meta: { label: 'theory', precision: 2 } },
    },
  };
}

/**
 * The SVD of the current image, computed ONCE per image.
 *
 * It does not depend on k: only the number of layers kept changes as the slider
 * moves, and redoing the decomposition at every notch cost 450 ms per notch.
 * Memoized, the first display of an image pays them and the moves of k are
 * instantaneous — and that is the slider a room watches move.
 *
 * This is not state that changes the result: `compute` remains a function of
 * its arguments alone, which the determinism check verifies. It is a cache in
 * the strict sense, and its key carries the seed because the noise image
 * depends on it.
 *
 * And it is BOUNDED, because that key is unbounded: every press of R creates a
 * seed, hence a noise image, hence a 260 kB model. Thirty minutes of lecture
 * hammering the dice would fill the worker's memory. Six entries cover the four
 * images plus the last two draws, and the oldest one leaves — a JavaScript Map
 * preserves insertion order, which gives the queue with nothing more written.
 */
const MODELS = new Map();
const CACHE_MAX = 6;
function modelFor(image, seed, src) {
  const key = `${image}:${image === 'noise' ? seed : 0}`;
  let m = MODELS.get(key);
  if (!m) {
    m = svd(src, N, N);
    MODELS.set(key, m);
    if (MODELS.size > CACHE_MAX) MODELS.delete(MODELS.keys().next().value);
  }
  return m;
}

export { N, RANK_MAX, SPEC_FLOOR };
