// Linear basis-function regression: y = Σ wⱼ·φⱼ(x) — linear IN THE WEIGHTS,
// so the same closed-form least squares (ridge-stabilized normal equations)
// fits wildly nonlinear shapes; only the basis changes:
//   poly      φⱼ = xʲ                     (polynomial-regression, generalized)
//   rbf       φⱼ = exp(−(x−cⱼ)²/2ℓ²)      uniform centers, width ℓ
//   fourier   1, sin(πkx), cos(πkx)       (Gibbs on the square target!)
//   sigmoid   φⱼ = tanh((x−cⱼ)/ℓ)         a frozen one-hidden-layer network
// A fresh noisy TEST set exposes the train/test split: training error only
// ever falls with M, test error is U-shaped with a σ² floor.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { normalEquations, ridgeSolve } from '../../../core/linalg.js';

const NG = 300; // dense display grid
const N_TEST = 200;
const M_GRID_MAX = 20;

const TARGETS = {
  damped: (x) => Math.sin(2 * Math.PI * x) * Math.exp(-3 * x * x),
  square: (x) => Math.sign(Math.sin(Math.PI * x)) || 1,
  bump: (x) => Math.exp(-16 * (x - 0.3) ** 2),
};

/** φⱼ(x) for j = 0…M−1 of the chosen basis. */
function makeBasis(basis, M, ell) {
  if (basis === 'poly') return Array.from({ length: M }, (_, j) => (x) => x ** j);
  if (basis === 'fourier') {
    return Array.from({ length: M }, (_, j) => {
      if (j === 0) return () => 1;
      const k = Math.ceil(j / 2);
      return j % 2 === 1 ? (x) => Math.sin(Math.PI * k * x) : (x) => Math.cos(Math.PI * k * x);
    });
  }
  const centers = M === 1 ? [0] : Array.from({ length: M }, (_, j) => -1 + (2 * j) / (M - 1));
  if (basis === 'rbf') {
    return centers.map((c) => (x) => Math.exp(-((x - c) ** 2) / (2 * ell * ell)));
  }
  return centers.map((c) => (x) => Math.tanh((x - c) / ell)); // sigmoid
}

/** Ridge-stabilized LS fit: (ΦᵀΦ + λI) w = Φᵀy. */
function fit(phis, xs, ys, lambda) {
  const { AtA, Aty } = normalEquations(
    xs.length,
    phis.length,
    (i, row) => {
      for (let j = 0; j < phis.length; j++) row[j] = phis[j](xs[i]);
    },
    ys
  );
  return ridgeSolve(AtA, Aty, lambda);
}

const mseOf = (phis, w, xs, ys) => {
  let acc = 0;
  for (let i = 0; i < xs.length; i++) {
    let p = 0;
    for (let j = 0; j < phis.length; j++) p += w[j] * phis[j](xs[i]);
    acc += (ys[i] - p) ** 2;
  }
  return acc / xs.length;
};

/**
 * @param {{basis: string, target: string, M: number, ell: number,
 *          lambda: number, N: number, sigma: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ basis, target, M, ell, lambda, N, sigma, seed }) {
  const rng = mulberry32(seed);
  const gauss = gaussFrom(rng);
  const f = TARGETS[target];

  // train set (random abscissas), then a fresh noisy test set
  const draw = (n) => {
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      xs[i] = -1 + 2 * rng();
      ys[i] = f(xs[i]) + sigma * gauss();
    }
    return { xs, ys };
  };
  const train = draw(N);
  const test = draw(N_TEST);

  const phis = makeBasis(basis, M, ell);
  const w = fit(phis, train.xs, train.ys, lambda);

  // dense curves: truth, fit, and each weighted basis function (NaN-broken)
  const gx = new Float64Array(NG);
  const gyTrue = new Float64Array(NG);
  const gyFit = new Float64Array(NG);
  for (let i = 0; i < NG; i++) {
    gx[i] = -1 + (2 * i) / (NG - 1);
    gyTrue[i] = f(gx[i]);
    let p = 0;
    for (let j = 0; j < M; j++) p += w[j] * phis[j](gx[i]);
    gyFit[i] = p;
  }
  const bx = new Float64Array(M * (NG + 1));
  const by = new Float64Array(M * (NG + 1));
  let wp = 0;
  for (let j = 0; j < M; j++) {
    for (let i = 0; i < NG; i++) {
      bx[wp] = gx[i];
      by[wp] = w[j] * phis[j](gx[i]);
      wp++;
    }
    bx[wp] = NaN;
    by[wp] = NaN;
    wp++;
  }

  // train/test error across model sizes (same basis family, same data)
  const mg = new Float64Array(M_GRID_MAX);
  const eTrain = new Float64Array(M_GRID_MAX);
  const eTest = new Float64Array(M_GRID_MAX);
  for (let m = 1; m <= M_GRID_MAX; m++) {
    const ph = makeBasis(basis, m, ell);
    const wm = fit(ph, train.xs, train.ys, lambda);
    mg[m - 1] = m;
    eTrain[m - 1] = Math.max(mseOf(ph, wm, train.xs, train.ys), 1e-12);
    eTest[m - 1] = Math.max(mseOf(ph, wm, test.xs, test.ys), 1e-12);
  }

  let normW = 0;
  for (let j = 0; j < M; j++) normW += w[j] * w[j];

  return {
    observables: {
      trainPoints: { x: train.xs, y: train.ys },
      trueCurve: { x: gx, y: gyTrue },
      fitCurve: { x: gx, y: gyFit },
      basisCurves: { x: bx, y: by },
      errTrain: { x: mg, y: eTrain },
      errTest: { x: mg, y: eTest },
      rmseTrain: {
        value: Math.sqrt(mseOf(phis, w, train.xs, train.ys)),
        meta: { label: 'RMSE apprentissage', precision: 4 },
      },
      rmseTest: {
        value: Math.sqrt(mseOf(phis, w, test.xs, test.ys)),
        meta: { label: 'RMSE test', precision: 4 },
      },
      normW: { value: Math.sqrt(normW), meta: { label: '‖w‖', precision: 2 } },
    },
  };
}
