// Confidence intervals: M intervals over N Gaussian draws, Student or
// Gaussian CI depending on `known`. PURE, stateless, seeded — runs in a
// worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { normalQuantile, studentQuantile, normalPdf } from '../../../core/numeric.js';

/* ---------- compute ------------------------------------------------------- */

/**
 * PURE. Stateless, no UI dependency, no DOM access. Runs in a Web Worker.
 * Deterministic at fixed seed. `seed` is injected by the core.
 * @param {{mu: number, sigma: number, N: number, M: number, conf: number,
 *          known: boolean, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ mu, sigma, N, M, conf, known, seed }) {
  const gauss = gaussFrom(mulberry32(seed));
  const pTail = 1 - (1 - conf) / 2;
  const quantile = (n) => (known ? normalQuantile(pTail) : studentQuantile(pTail, n - 1));

  // one sample of size n → mean and CI half-width
  const drawOne = (n, q) => {
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const x = mu + sigma * gauss();
      sum += x;
      sumSq += x * x;
    }
    const mean = sum / n;
    const hw = known
      ? (q * sigma) / Math.sqrt(n)
      : q * Math.sqrt(Math.max((sumSq - n * mean * mean) / (n - 1), 0) / n);
    return { mean, hw };
  };

  const qN = quantile(N);
  const means = new Float64Array(M);
  const intervals = new Array(M);
  let hits = 0;
  let hwSum = 0;
  for (let m = 0; m < M; m++) {
    const { mean, hw } = drawOne(N, qN);
    means[m] = mean;
    const ok = Math.abs(mean - mu) <= hw;
    if (ok) hits++;
    hwSum += hw;
    intervals[m] = { lo: mean - hw, hi: mean + hw, ok };
  }

  // sampling distribution of x̄: N(mu, sigma²/N)
  const se = sigma / Math.sqrt(N);
  const nd = 121;
  const dx = new Float64Array(nd);
  const dy = new Float64Array(nd);
  for (let i = 0; i < nd; i++) {
    const x = mu - 4 * se + (8 * se * i) / (nd - 1);
    dx[i] = x;
    dy[i] = normalPdf(x, mu, se);
  }

  // empirical coverage across a grid of sample sizes (M intervals per point)
  const grid = [2, 3, 5, 8, 12, 18, 27, 40, 60, 90, 135, 200];
  const cx = new Float64Array(grid.length);
  const cy = new Float64Array(grid.length);
  for (let gi = 0; gi < grid.length; gi++) {
    const n = grid[gi];
    const q = quantile(n);
    let h = 0;
    for (let m = 0; m < M; m++) {
      const { mean, hw } = drawOne(n, q);
      if (Math.abs(mean - mu) <= hw) h++;
    }
    cx[gi] = n;
    cy[gi] = h / M;
  }

  return {
    observables: {
      means,
      intervals,
      coverage: { value: hits / M, meta: { label: 'couverture', precision: 3 } },
      meanHalfWidth: { value: hwSum / M, meta: { label: 'demi-largeur', precision: 2 } },
      theoreticalDensity: { x: dx, y: dy },
      coverageVsN: { x: cx, y: cy },
    },
  };
}
