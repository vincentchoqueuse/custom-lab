// THE GALTON BOARD — the most photographed object in statistics, computed.
// A ball falls through D rows of pegs and bounces right with probability p at
// each one; the bin it lands in counts its rights, so the bins fill as a
// BINOMIAL(D, p), and for D large enough the silhouette is the Gaussian. The
// machine is the theorem: independence row by row in, bell curve out.
//
// Two figures. The board shows the MECHANISM — the pegs, a handful of real
// trajectories, the bins they end in. The histogram shows the LAW — M balls
// against the exact binomial (log-Gamma, no factorial overflow) and against
// the Gaussian the CLT promises.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32 } from '../../../core/rng.js';
import { logGamma, normalPdf } from '../../../core/numeric.js';

const N_PATHS = 7; // trajectories actually drawn on the board

/** Exact Binomial(D, p) pmf via log-Gamma — stable up to any D on the dial. */
function binomialPmf(D, p, k) {
  const logC = logGamma(D + 1) - logGamma(k + 1) - logGamma(D - k + 1);
  return Math.exp(logC + k * Math.log(p) + (D - k) * Math.log(1 - p));
}

/**
 * @param {{D: number, M: number, p: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ D, M, p, seed }) {
  const rng = mulberry32(seed);

  /* ---------- M balls through the board ---------------------------------- */
  const counts = new Float64Array(D + 1);
  // the first few balls keep their full trajectory for the board view;
  // lateral position after r rows with k rights is k − r/2 (pegs half a
  // step apart), so the picture is the classic triangle
  const px = [];
  const py = [];
  for (let m = 0; m < M; m++) {
    let k = 0;
    const keep = m < N_PATHS;
    if (keep) {
      px.push(0);
      py.push(0);
    }
    for (let r = 1; r <= D; r++) {
      if (rng() < p) k++;
      if (keep) {
        px.push(k - r / 2);
        py.push(-r);
      }
    }
    if (keep) {
      px.push(NaN);
      py.push(NaN);
    }
    counts[k]++;
  }

  /* ---------- the board geometry ----------------------------------------- */
  // peg row r (1 … D) holds r pegs at lateral positions j − (r−1)/2 − 1/2…
  // exactly the positions a ball can strike: after r−1 rows it sits at
  // k − (r−1)/2, and the peg it meets next is at that same abscissa.
  const pegX = [];
  const pegY = [];
  for (let r = 1; r <= D; r++)
    for (let j = 0; j < r; j++) {
      pegX.push(j - (r - 1) / 2);
      pegY.push(-(r - 1));
    }

  /* ---------- the law, twice --------------------------------------------- */
  const kAxis = new Float64Array(D + 1);
  const freq = new Float64Array(D + 1);
  const pmf = new Float64Array(D + 1);
  for (let k = 0; k <= D; k++) {
    kAxis[k] = k;
    freq[k] = counts[k] / M;
    pmf[k] = binomialPmf(D, p, k);
  }
  const mu = D * p;
  const sd = Math.sqrt(D * p * (1 - p));
  const NG = 241;
  const gx = new Float64Array(NG);
  const gy = new Float64Array(NG);
  for (let i = 0; i < NG; i++) {
    gx[i] = -0.5 + ((D + 1) * i) / (NG - 1);
    gy[i] = normalPdf(gx[i], mu, sd);
  }

  // where the Gaussian promise stands right now: the worst gap between the
  // exact binomial and its CLT silhouette, over the bins
  let gap = 0;
  for (let k = 0; k <= D; k++) gap = Math.max(gap, Math.abs(pmf[k] - normalPdf(k, mu, sd)));

  /* ---------- the bins, filling under the board --------------------------- */
  // the classic object has the histogram INSIDE it: the balls stack under the
  // pegs. A step band grows from a floor below the last row, each bin under
  // the lateral position its k lands at, height normalized on the PEAK OF THE
  // LAW (not of the draw) so the frame never jumps while M feeds it — the
  // silhouette converges upward into the binomial as the balls accumulate.
  const FLOOR = -D - 4.4;
  const pmfMax = Math.max(...pmf);
  const bx = new Float64Array(4 * (D + 1));
  const blo = new Float64Array(4 * (D + 1));
  const bhi = new Float64Array(4 * (D + 1));
  for (let k = 0; k <= D; k++) {
    const xk = k - D / 2;
    const h = FLOOR + (3.6 * freq[k]) / pmfMax;
    const o = 4 * k;
    bx[o] = xk - 0.44;
    bx[o + 1] = xk - 0.38;
    bx[o + 2] = xk + 0.38;
    bx[o + 3] = xk + 0.44;
    blo[o] = blo[o + 1] = blo[o + 2] = blo[o + 3] = FLOOR;
    bhi[o] = bhi[o + 3] = FLOOR;
    bhi[o + 1] = bhi[o + 2] = h;
  }

  let meanMeas = 0;
  for (let k = 0; k <= D; k++) meanMeas += k * counts[k];
  meanMeas /= M;
  let varMeas = 0;
  for (let k = 0; k <= D; k++) varMeas += (k - meanMeas) ** 2 * counts[k];
  varMeas /= M;

  return {
    observables: {
      pegs: { x: Float64Array.from(pegX), y: Float64Array.from(pegY) },
      bins: { x: bx, lo: blo, hi: bhi },
      paths: { x: Float64Array.from(px), y: Float64Array.from(py) },
      // the measured histogram, the exact law, the CLT silhouette
      landing: { x: kAxis, y: freq },
      binomial: { x: kAxis, y: pmf },
      gaussian: { x: gx, y: gy },
      meanMeas: { value: meanMeas, meta: { label: 'mean', precision: 2 } },
      meanTh: { value: mu, meta: { label: 'Dp', precision: 2 } },
      sdMeas: { value: Math.sqrt(varMeas), meta: { label: 'std', precision: 2 } },
      sdTh: { value: sd, meta: { label: '√(Dp(1−p))', precision: 2 } },
      gaussGap: { value: gap, meta: { label: 'CLT gap', precision: 4 } },
    },
  };
}
