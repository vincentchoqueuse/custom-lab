// The Cramér-Rao bound as a floor: for N Gaussian draws the Fisher
// information gives Var(μ̂) ≥ σ²/N for any unbiased estimator. Three
// candidates estimated over M repeated experiments:
//   x̄           attains the bound (efficient)
//   median       asymptotic variance πσ²/2N — efficiency 2/π ≈ 63.7%
//   midrange     (min+max)/2 — variance ~ σ²·π²/(24·ln N): efficiency → 0
// Views feed on the empirical variances across N (log-log against the CRB
// line), the sampling distributions at the pill's N with the best-possible
// N(μ, σ²/N) density, and the efficiency CRB/Var vs N.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { median, variance, normalPdf } from '../../../core/numeric.js';

const N_GRID = [2, 5, 10, 20, 50, 100, 200];

/**
 * @param {{mu: number, sigma: number, N: number, M: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ mu, sigma, N, M, seed }) {
  const gauss = gaussFrom(mulberry32(seed));

  // one experiment: N draws → the three estimates
  const buf = new Float64Array(200);
  const drawEstimates = (n) => {
    let sum = 0;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = mu + sigma * gauss();
      buf[i] = x;
      sum += x;
      if (x < lo) lo = x;
      if (x > hi) hi = x;
    }
    return [sum / n, median(buf.subarray(0, n)), (lo + hi) / 2];
  };

  // sampling distributions at the pill's N
  const d1 = new Float64Array(M);
  const d2 = new Float64Array(M);
  const d3 = new Float64Array(M);
  for (let m = 0; m < M; m++) {
    const [a, b, c] = drawEstimates(N);
    d1[m] = a;
    d2[m] = b;
    d3[m] = c;
  }

  // empirical variance across sample sizes + the CRB line σ²/N
  const gx = new Float64Array(N_GRID.length);
  const v1 = new Float64Array(N_GRID.length);
  const v2 = new Float64Array(N_GRID.length);
  const v3 = new Float64Array(N_GRID.length);
  const crb = new Float64Array(N_GRID.length);
  const t1 = new Float64Array(M);
  const t2 = new Float64Array(M);
  const t3 = new Float64Array(M);
  for (let g = 0; g < N_GRID.length; g++) {
    const n = N_GRID[g];
    for (let m = 0; m < M; m++) {
      const [a, b, c] = drawEstimates(n);
      t1[m] = a;
      t2[m] = b;
      t3[m] = c;
    }
    gx[g] = n;
    v1[g] = variance(t1);
    v2[g] = variance(t2);
    v3[g] = variance(t3);
    crb[g] = (sigma * sigma) / n;
  }

  // efficiency CRB/Var (capped at slightly above 1 for MC noise)
  const effOf = (v) => Float64Array.from(v, (x, g) => Math.min(crb[g] / x, 1.15));

  // best-possible density N(μ, σ²/N) for the sampling view
  const ng = 161;
  const span = (4.5 * sigma) / Math.sqrt(N);
  const px = new Float64Array(ng);
  const py = new Float64Array(ng);
  for (let i = 0; i < ng; i++) {
    px[i] = mu - span + (2 * span * i) / (ng - 1);
    py[i] = normalPdf(px[i], mu, sigma / Math.sqrt(N));
  }

  const crbPill = (sigma * sigma) / N;
  return {
    observables: {
      dMean: d1,
      dMedian: d2,
      dMidrange: d3,
      bestPdf: { x: px, y: py },
      varMean: { x: gx, y: v1 },
      varMedian: { x: gx, y: v2 },
      varMidrange: { x: gx, y: v3 },
      crbLine: { x: gx, y: crb },
      effMean: { x: gx, y: effOf(v1) },
      effMedian: { x: gx, y: effOf(v2) },
      effMidrange: { x: gx, y: effOf(v3) },
      crbValue: { value: crbPill, meta: { label: 'bound on Var(μ̂) = σ²/N', precision: 4 } },
      effMeanS: {
        value: crbPill / variance(d1),
        meta: { label: 'efficiency of x̄', precision: 3 },
      },
      effMedianS: {
        value: crbPill / variance(d2),
        meta: { label: 'efficiency of the median', precision: 3 },
      },
    },
  };
}
