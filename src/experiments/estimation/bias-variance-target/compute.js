// The dartboard figure of chapter 1: four estimators of the center (μ, μ) of
// an isotropic 2D Gaussian, each applied coordinate-wise to the SAME N-point
// sample, over M repeated experiments ("shots"):
//   x̄        sample mean        unbiased,            Var = 2σ²/N   (2D trace)
//   médiane  coordinate median  unbiased,            Var ≈ πσ²/N   (asymptotic)
//   λx̄      shrunk mean        bias ‖(1−λ)μ‖√2,     Var = 2λ²σ²/N
//   x₁       first point alone  unbiased,            Var = 2σ²
// Empirical decomposition per estimator (exact identity at finite M):
//   EQM = ‖biais‖² + variance
// plus the exact EQM(λ) curve of the shrunk mean — the U that shows the best
// estimator is biased whenever σ²/N is not negligible against μ².
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { median } from '../../../core/numeric.js';

const NAMES = ['x̄', 'médiane', 'λx̄', 'x₁'];
const L_GRID = 101; // λ grid for the EQM(λ) curves

/**
 * @param {{mu: number, sigma: number, N: number, lambda: number, M: number,
 *          seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ mu, sigma, N, lambda, M, seed }) {
  const gauss = gaussFrom(mulberry32(seed));

  // shots[e] = {x, y} of estimator e over the M experiments
  const shots = Array.from({ length: 4 }, () => ({
    x: new Float64Array(M),
    y: new Float64Array(M),
  }));
  const bx = new Float64Array(N);
  const by = new Float64Array(N);
  for (let m = 0; m < M; m++) {
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < N; i++) {
      bx[i] = mu + sigma * gauss();
      by[i] = mu + sigma * gauss();
      sx += bx[i];
      sy += by[i];
    }
    const mx = sx / N;
    const my = sy / N;
    shots[0].x[m] = mx;
    shots[0].y[m] = my;
    shots[1].x[m] = median(bx);
    shots[1].y[m] = median(by);
    shots[2].x[m] = lambda * mx;
    shots[2].y[m] = lambda * my;
    shots[3].x[m] = bx[0];
    shots[3].y[m] = by[0];
  }

  // empirical 2D decomposition: EQM = ‖biais‖² + variance (exact at finite M)
  const estStats = shots.map((s, e) => {
    let cx = 0;
    let cy = 0;
    for (let m = 0; m < M; m++) {
      cx += s.x[m];
      cy += s.y[m];
    }
    cx /= M;
    cy /= M;
    let v = 0;
    for (let m = 0; m < M; m++) v += (s.x[m] - cx) ** 2 + (s.y[m] - cy) ** 2;
    v /= M;
    const b2 = (cx - mu) ** 2 + (cy - mu) ** 2;
    return { name: NAMES[e], bias2: b2, variance: v, mse: b2 + v };
  });

  // exact EQM(λ) decomposition of the shrunk mean, and its minimizer λ*
  const lx = new Float64Array(L_GRID);
  const lb = new Float64Array(L_GRID);
  const lv = new Float64Array(L_GRID);
  const lm = new Float64Array(L_GRID);
  for (let g = 0; g < L_GRID; g++) {
    const l = g / (L_GRID - 1);
    lx[g] = l;
    lb[g] = 2 * ((1 - l) * mu) ** 2;
    lv[g] = (2 * l * l * sigma * sigma) / N;
    lm[g] = lb[g] + lv[g];
  }
  const lambdaStar = (mu * mu) / (mu * mu + (sigma * sigma) / N);

  return {
    observables: {
      shotsMean: { x: shots[0].x, y: shots[0].y },
      shotsMedian: { x: shots[1].x, y: shots[1].y },
      shotsShrink: { x: shots[2].x, y: shots[2].y },
      shotsFirst: { x: shots[3].x, y: shots[3].y },
      estStats,
      // x-coordinate sampling distributions for the histogram view
      dMean: shots[0].x,
      dMedian: shots[1].x,
      dShrink: shots[2].x,
      dFirst: shots[3].x,
      bias2VsLambda: { x: lx, y: lb },
      varVsLambda: { x: lx, y: lv },
      mseVsLambda: { x: lx, y: lm },
      lambdaStar: {
        value: lambdaStar,
        meta: { label: 'λ*', precision: 3 },
      },
      mseMean: { value: estStats[0].mse, meta: { label: 'EQM x̄', precision: 3 } },
      mseShrink: { value: estStats[2].mse, meta: { label: 'EQM λx̄', precision: 3 } },
    },
  };
}
