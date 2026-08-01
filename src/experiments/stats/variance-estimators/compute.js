// The sampling distribution of an estimator: repeat M experiments of N
// Gaussian draws; each computes the two classic variance estimators,
//   σ̂² = (1/N)·Σ(xᵢ−x̄)²   (MLE, biased: E[σ̂²] = σ²(N−1)/N)
//   s²  = (1/(N−1))·Σ(xᵢ−x̄)²  (unbiased)
// plus the empirical bias of both across a grid of sample sizes.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { mean } from '../../../core/numeric.js';

const N_GRID = [2, 3, 5, 8, 12, 20, 35, 60, 100];

/**
 * @param {{mu: number, sigma: number, N: number, M: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ mu, sigma, N, M, seed }) {
  const gauss = gaussFrom(mulberry32(seed));

  // one experiment: sum of squared deviations from the SAMPLE mean
  const drawSS = (n) => {
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const x = mu + sigma * gauss();
      sum += x;
      sumSq += x * x;
    }
    const m = sum / n;
    return Math.max(sumSq - n * m * m, 0);
  };

  // sampling distribution at the pill's N
  const v1 = new Float64Array(M);
  const v2 = new Float64Array(M);
  for (let m = 0; m < M; m++) {
    const ss = drawSS(N);
    v1[m] = ss / N;
    v2[m] = ss / (N - 1);
  }
  const meanV1 = mean(v1);
  const meanV2 = mean(v2);

  // empirical bias across sample sizes (same M experiments per grid point)
  const s2True = sigma * sigma;
  const gx = new Float64Array(N_GRID.length);
  const b1 = new Float64Array(N_GRID.length);
  const b2 = new Float64Array(N_GRID.length);
  const bTh = new Float64Array(N_GRID.length);
  for (let g = 0; g < N_GRID.length; g++) {
    const n = N_GRID[g];
    let acc = 0;
    for (let m = 0; m < M; m++) acc += drawSS(n);
    const meanSS = acc / M;
    gx[g] = n;
    b1[g] = meanSS / n - s2True;
    b2[g] = meanSS / (n - 1) - s2True;
    bTh[g] = -s2True / n;
  }

  return {
    observables: {
      v1,
      v2,
      biasEmp1: { x: gx, y: b1 },
      biasEmp2: { x: gx, y: b2 },
      biasTh1: { x: gx, y: bTh },
      meanV1: { value: meanV1, meta: { label: '⟨σ̂²⟩ (÷N)', precision: 3 } },
      meanV2: { value: meanV2, meta: { label: '⟨s²⟩ (÷N−1)', precision: 3 } },
      sigma2: { value: s2True, meta: { label: 'σ²', precision: 3 } },
    },
  };
}
