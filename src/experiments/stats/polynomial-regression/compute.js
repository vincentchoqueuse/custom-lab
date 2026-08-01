// Polynomial least squares: draw N noisy observations of a true cubic on
// [-1, 1], fit a degree-d polynomial by solving the normal equations
// XᵀX â = Xᵀy, and expose true/fitted curves plus both coefficient sets.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
//
// No linear-algebra dependency: the system is (d+1) ≤ 10 unknowns, solved by
// Gaussian elimination with partial pivoting below (experiment-owned science,
// per the no-runtime-dependency-without-justification rule). On [-1, 1] the
// normal equations stay well within float64 accuracy for d ≤ 9.
import { mulberry32, gaussFrom } from '../../../core/rng.js';

/** Solve A·z = b in place (partial pivoting). A is n×n row-major. */
function solve(A, b) {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    }
    if (A[piv][col] === 0) throw new Error('singular normal equations');
    if (piv !== col) {
      [A[piv], A[col]] = [A[col], A[piv]];
      [b[piv], b[col]] = [b[col], b[piv]];
    }
    for (let r = col + 1; r < n; r++) {
      const f = A[r][col] / A[col][col];
      for (let c = col; c < n; c++) A[r][c] -= f * A[col][c];
      b[r] -= f * b[col];
    }
  }
  const z = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let c = r + 1; c < n; c++) s -= A[r][c] * z[c];
    z[r] = s / A[r][r];
  }
  return z;
}

function polyval(coeffs, x) {
  let y = 0;
  for (let k = coeffs.length - 1; k >= 0; k--) y = y * x + coeffs[k];
  return y;
}

/**
 * @param {{a0: number, a1: number, a2: number, a3: number, d: number,
 *          N: number, sigma: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ a0, a1, a2, a3, d, N, sigma, seed }) {
  const gauss = gaussFrom(mulberry32(seed));
  const aTrue = [a0, a1, a2, a3];
  const K = d + 1;

  // uniformly spaced design on [-1, 1], Gaussian noise
  const x = new Float64Array(N);
  const y = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    x[i] = N === 1 ? 0 : -1 + (2 * i) / (N - 1);
    y[i] = polyval(aTrue, x[i]) + sigma * gauss();
  }

  // normal equations via power sums: (XᵀX)ⱼₖ = Σ xʲ⁺ᵏ, (Xᵀy)ⱼ = Σ yᵢxʲ
  const pow = new Float64Array(2 * K - 1);
  const rhs = new Float64Array(K);
  for (let i = 0; i < N; i++) {
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
  const aHat = solve(XtX, Array.from(rhs));

  // residual RMSE
  let ssr = 0;
  for (let i = 0; i < N; i++) ssr += (y[i] - polyval(aHat, x[i])) ** 2;
  const rmse = Math.sqrt(ssr / N);

  // dense curves on [-1, 1]
  const ng = 161;
  const gx = new Float64Array(ng);
  const gyTrue = new Float64Array(ng);
  const gyFit = new Float64Array(ng);
  for (let i = 0; i < ng; i++) {
    const xi = -1 + (2 * i) / (ng - 1);
    gx[i] = xi;
    gyTrue[i] = polyval(aTrue, xi);
    gyFit[i] = polyval(aHat, xi);
  }

  // coefficient comparison, zero-padded to a common length
  const Kc = Math.max(4, K);
  const ck = new Float64Array(Kc);
  const cTrue = new Float64Array(Kc);
  const cHat = new Float64Array(Kc);
  for (let k = 0; k < Kc; k++) {
    ck[k] = k;
    cTrue[k] = k < 4 ? aTrue[k] : 0;
    cHat[k] = k < K ? aHat[k] : 0;
  }

  return {
    observables: {
      xData: x,
      yData: y,
      noisyPoints: { x, y },
      trueCurve: { x: gx, y: gyTrue },
      fittedCurve: { x: gx, y: gyFit },
      coeffsTrue: { x: ck, y: cTrue },
      coeffsHat: { x: ck, y: cHat },
      rmse: { value: rmse, meta: { label: 'RMSE', precision: 3 } },
    },
  };
}
