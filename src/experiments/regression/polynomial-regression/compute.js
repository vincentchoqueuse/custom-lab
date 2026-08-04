// Polynomial least squares and ridge: draw N noisy observations of a true
// cubic on [-1, 1], fit a degree-d polynomial two ways —
//   LS:    XᵀX â = Xᵀy
//   ridge: (XᵀX + λD) â = Xᵀy with D = diag(0, 1, …, 1) (intercept unpenalized)
// — exposing true/LS/ridge curves and coefficient sets, plus a Monte Carlo
// bias²/variance/MSE decomposition of the ridge prediction across a λ grid
// (fresh noise realizations on the same design, paired across λ values).
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
//
// No external linear-algebra dependency: the system is (d+1) ≤ 10 unknowns,
// solved by core/numeric.js's pivoted Gaussian elimination. On [-1, 1] the
// normal equations stay well within float64 accuracy for d ≤ 9.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { ridgeSolve } from '../../../core/linalg.js';
import { polyval } from '../../../core/numeric.js';

// λ grid of the Monte Carlo sweep — must span the manifest's [min, max]
const L_GRID = Array.from({ length: 21 }, (_, g) => 10 ** (-3 + (6 * g) / 20));
const MC = 160; // noise realizations per λ

/** Normal equations via power sums: (XᵀX)ⱼₖ = Σ xʲ⁺ᵏ, (Xᵀy)ⱼ = Σ yᵢxʲ. */
function normalEquations(x, y, K) {
  const pow = new Float64Array(2 * K - 1);
  const rhs = new Float64Array(K);
  for (let i = 0; i < x.length; i++) {
    let p = 1;
    for (let j = 0; j < 2 * K - 1; j++) {
      pow[j] += p;
      if (j < K) rhs[j] += y[i] * p;
      p *= x[i];
    }
  }
  const XtX = [];
  for (let j = 0; j < K; j++) {
    XtX.push(Array.from({ length: K }, (_, k) => pow[j + k]));
  }
  return { XtX, rhs: Array.from(rhs) };
}

// La résolution ridge vient du cœur : `skipFirst` laisse le terme constant
// hors de la pénalité, ce qui est la convention — pénaliser l'ordonnée à
// l'origine ferait préférer les modèles passant près de zéro, donc dépendre
// de l'endroit où l'on a placé l'origine.
const solveRidge = (XtX, rhs, lam) => ridgeSolve(XtX, rhs, lam, { skipFirst: true });

/**
 * @param {{a0: number, a1: number, a2: number, a3: number, d: number,
 *          N: number, sigma: number, lambda: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ a0, a1, a2, a3, d, N, sigma, lambda, seed }) {
  const gauss = gaussFrom(mulberry32(seed));
  const aTrue = [a0, a1, a2, a3];
  const K = d + 1;

  // uniformly spaced design on [-1, 1], Gaussian noise
  const x = new Float64Array(N);
  const y = new Float64Array(N);
  const fTrue = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    x[i] = N === 1 ? 0 : -1 + (2 * i) / (N - 1);
    fTrue[i] = polyval(aTrue, x[i]);
    y[i] = fTrue[i] + sigma * gauss();
  }

  const { XtX, rhs } = normalEquations(x, y, K);
  const aHat = solveRidge(XtX, rhs, 0);
  const aRidge = solveRidge(XtX, rhs, lambda);

  // residual RMSE of both fits
  const rmseOf = (a) => {
    let ssr = 0;
    for (let i = 0; i < N; i++) ssr += (y[i] - polyval(a, x[i])) ** 2;
    return Math.sqrt(ssr / N);
  };
  const rmse = rmseOf(aHat);
  const rmseRidge = rmseOf(aRidge);

  // dense curves on [-1, 1]
  const ng = 161;
  const gx = new Float64Array(ng);
  const gyTrue = new Float64Array(ng);
  const gyFit = new Float64Array(ng);
  const gyRidge = new Float64Array(ng);
  for (let i = 0; i < ng; i++) {
    const xi = -1 + (2 * i) / (ng - 1);
    gx[i] = xi;
    gyTrue[i] = polyval(aTrue, xi);
    gyFit[i] = polyval(aHat, xi);
    gyRidge[i] = polyval(aRidge, xi);
  }

  // coefficient comparison, zero-padded to a common length
  const Kc = Math.max(4, K);
  const ck = new Float64Array(Kc);
  const cTrue = new Float64Array(Kc);
  const cHat = new Float64Array(Kc);
  const cRidge = new Float64Array(Kc);
  for (let k = 0; k < Kc; k++) {
    ck[k] = k;
    cTrue[k] = k < 4 ? aTrue[k] : 0;
    cHat[k] = k < K ? aHat[k] : 0;
    cRidge[k] = k < K ? aRidge[k] : 0;
  }

  // Monte Carlo bias²/variance/MSE of the ridge prediction vs λ, on the
  // design points. The same MC noise matrix is reused across the λ grid
  // (paired comparison → smooth curves); XᵀX is fixed, only Xᵀy changes.
  const mcRhs = [];
  for (let m = 0; m < MC; m++) {
    const ym = new Float64Array(N);
    for (let i = 0; i < N; i++) ym[i] = fTrue[i] + sigma * gauss();
    mcRhs.push(normalEquations(x, ym, K).rhs);
  }
  const lx = new Float64Array(L_GRID.length);
  const bias2 = new Float64Array(L_GRID.length);
  const varc = new Float64Array(L_GRID.length);
  const mse = new Float64Array(L_GRID.length);
  const pred = new Float64Array(N);
  const predSq = new Float64Array(N);
  const err2 = new Float64Array(N);
  for (let g = 0; g < L_GRID.length; g++) {
    pred.fill(0);
    predSq.fill(0);
    err2.fill(0);
    for (let m = 0; m < MC; m++) {
      const a = solveRidge(XtX, mcRhs[m], L_GRID[g]);
      for (let i = 0; i < N; i++) {
        const p = polyval(a, x[i]);
        pred[i] += p;
        predSq[i] += p * p;
        err2[i] += (p - fTrue[i]) ** 2;
      }
    }
    let b = 0;
    let v = 0;
    let e = 0;
    for (let i = 0; i < N; i++) {
      const mMean = pred[i] / MC;
      b += (mMean - fTrue[i]) ** 2;
      v += Math.max(predSq[i] / MC - mMean * mMean, 0);
      e += err2[i] / MC;
    }
    lx[g] = L_GRID[g];
    bias2[g] = b / N;
    varc[g] = v / N;
    mse[g] = e / N;
  }

  return {
    observables: {
      xData: x,
      yData: y,
      noisyPoints: { x, y },
      trueCurve: { x: gx, y: gyTrue },
      fittedCurve: { x: gx, y: gyFit },
      ridgeCurve: { x: gx, y: gyRidge },
      coeffsTrue: { x: ck, y: cTrue },
      coeffsHat: { x: ck, y: cHat },
      coeffsRidge: { x: ck, y: cRidge },
      bias2VsLambda: { x: lx, y: bias2 },
      varVsLambda: { x: lx, y: varc },
      mseVsLambda: { x: lx, y: mse },
      rmse: { value: rmse, meta: { label: 'RMSE (MC)', precision: 3 } },
      rmseRidge: { value: rmseRidge, meta: { label: 'RMSE (ridge)', precision: 3 } },
    },
  };
}
