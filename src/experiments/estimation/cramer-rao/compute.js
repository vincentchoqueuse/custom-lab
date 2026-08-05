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
import { medianInPlace, variance, normalPdf } from '../../../core/numeric.js';

const N_GRID = [2, 5, 10, 20, 50, 100, 200];

/**
 * @param {{mu: number, sigma: number, N: number, M: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ mu, sigma, N, M, seed }) {
  const gauss = gaussFrom(mulberry32(seed));

  // One experiment: n draws → the three estimates, written straight into the
  // three destination arrays at row m. This runs M×(1 + |N_GRID|) = 24 000
  // times at the default M, which is why it allocates NOTHING: no result
  // tuple, no buffer per call, and a median that selects in place rather than
  // copying and sorting (that copy alone was 60% of the experiment's runtime).
  const buf = new Float64Array(200);
  const views = new Map(); // one subarray per sample size, cut once and reused
  const drawInto = (n, m, o1, o2, o3) => {
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
    o1[m] = sum / n;
    o3[m] = (lo + hi) / 2; // read BEFORE the median reorders the buffer
    if (!views.has(n)) views.set(n, buf.subarray(0, n));
    o2[m] = medianInPlace(views.get(n));
  };

  // ONE REALIZATION, GROWING. The other views are about M repetitions; this one
  // is about a single experiment watched while its sample size increases, which
  // is the picture an estimator actually has in a room: one record, getting
  // longer, three numbers computed from it, and a band saying how far from μ
  // the best possible estimator would still be at that n.
  //
  // The three estimates are recomputed from the SAME growing sample, so the
  // curves are three readings of one record rather than three experiments —
  // which is what makes their separation a property of the estimators.
  const NMAX = 200;
  const grow = new Float64Array(NMAX);
  for (let i = 0; i < NMAX; i++) grow[i] = mu + sigma * gauss();
  const rn = new Float64Array(NMAX - 1);
  const rMean = new Float64Array(NMAX - 1);
  const rMedian = new Float64Array(NMAX - 1);
  const rMid = new Float64Array(NMAX - 1);
  const bLo = new Float64Array(NMAX - 1);
  const bHi = new Float64Array(NMAX - 1);
  const scratch = new Float64Array(NMAX);
  let run = grow[0];
  for (let n = 2; n <= NMAX; n++) {
    const j = n - 2;
    run += grow[n - 1];
    rn[j] = n;
    rMean[j] = run / n;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < n; i++) {
      scratch[i] = grow[i];
      if (grow[i] < lo) lo = grow[i];
      if (grow[i] > hi) hi = grow[i];
    }
    rMid[j] = (lo + hi) / 2;
    rMedian[j] = medianInPlace(scratch.subarray(0, n));
    // ±1 standard deviation of the BEST possible unbiased estimator: √(σ²/n),
    // which is the Cramér–Rao bound wearing the units of the estimate itself
    const sd = sigma / Math.sqrt(n);
    bLo[j] = mu - sd;
    bHi[j] = mu + sd;
  }

  // sampling distributions at the pill's N
  const d1 = new Float64Array(M);
  const d2 = new Float64Array(M);
  const d3 = new Float64Array(M);
  for (let m = 0; m < M; m++) drawInto(N, m, d1, d2, d3);

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
    for (let m = 0; m < M; m++) drawInto(n, m, t1, t2, t3);
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
      /* --- one record, growing: the estimators at work --- */
      runMean: { x: rn, y: rMean },
      runMedian: { x: rn, y: rMedian },
      runMidrange: { x: rn, y: rMid },
      crbBand: { x: rn, lo: bLo, hi: bHi },
      muLine: mu,

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
