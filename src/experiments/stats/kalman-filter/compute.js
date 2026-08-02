// Scalar Kalman filter on the canonical random-walk-plus-noise model:
//   x_{k+1} = x_k + w_k,   w ~ N(0, Q)     (a slowly drifting quantity)
//   z_k     = x_k + v_k,   v ~ N(0, R)     (noisy sensor)
// One pure pass simulates the trajectory and runs the filter. Gains and
// variances are DATA-INDEPENDENT (they depend only on Q, R, P0), so their
// convergence to the Riccati fixed point is deterministic:
//   P⁻∞ = (Q + √(Q² + 4QR)) / 2,   K∞ = P⁻∞ / (P⁻∞ + R)
// Exact identities used by check.js: P⁺_k = K_k·R at every step, and the
// normalized innovations ν_k/√S_k are iid N(0,1) in this linear-Gaussian
// setting.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';

const P0 = 25; // initial prior variance (deliberately ignorant)

/**
 * @param {{sigw: number, sigv: number, N: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ sigw, sigv, N, seed }) {
  const gauss = gaussFrom(mulberry32(seed));
  const Q = sigw * sigw;
  const R = sigv * sigv;

  const ks = new Float64Array(N);
  const xs = new Float64Array(N); // true state
  const zs = new Float64Array(N); // measurements
  const es = new Float64Array(N); // estimates (posterior)
  const sd = new Float64Array(N); // posterior std √P⁺
  const gains = new Float64Array(N);
  const pks = new Float64Array(N); // posterior variances P⁺
  const errs = new Float64Array(N); // estimation error

  let x = 0; // true state
  let xh = 0; // estimate
  let P = 0; // posterior variance (unused before first update)
  let nuSum = 0;
  let nuSq = 0;
  let seF = 0;
  let seZ = 0;

  for (let k = 0; k < N; k++) {
    if (k > 0) x += sigw * gauss();
    const z = x + sigv * gauss();

    // predict (the k = 0 prior is {0, P0}), then update
    const Pm = k === 0 ? P0 : P + Q;
    const xm = xh;
    const S = Pm + R;
    const K = Pm / S;
    const nu = z - xm;
    xh = xm + K * nu;
    P = (1 - K) * Pm;

    ks[k] = k;
    xs[k] = x;
    zs[k] = z;
    es[k] = xh;
    sd[k] = Math.sqrt(P);
    gains[k] = K;
    pks[k] = P;
    errs[k] = xh - x;

    const nun = nu / Math.sqrt(S);
    nuSum += nun;
    nuSq += nun * nun;
    seF += (xh - x) ** 2;
    seZ += (z - x) ** 2;
  }

  // ±3σ tubes (around the estimate, and around zero for the error view)
  const lo = new Float64Array(N);
  const hi = new Float64Array(N);
  const eLo = new Float64Array(N);
  const eHi = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    lo[k] = es[k] - 3 * sd[k];
    hi[k] = es[k] + 3 * sd[k];
    eLo[k] = -3 * sd[k];
    eHi[k] = 3 * sd[k];
  }

  // Riccati fixed point (closed form for this scalar model)
  const PmInf = (Q + Math.sqrt(Q * Q + 4 * Q * R)) / 2;
  const kInf = PmInf / (PmInf + R);

  const nuMean = nuSum / N;
  const nuVar = nuSq / N - nuMean * nuMean;

  return {
    observables: {
      trueState: { x: ks, y: xs },
      meas: { x: ks, y: zs },
      est: { x: ks, y: es },
      tube: { x: ks, lo, hi },
      gains: { x: ks, y: gains },
      err: { x: ks, y: errs },
      errTube: { x: ks, lo: eLo, hi: eHi },
      pks, // posterior variances (checks, inspector)
      nuVar, // normalized-innovation variance (checks)
      kInf: { value: kInf, meta: { label: 'K∞ (Riccati)', precision: 3 } },
      rmseF: {
        value: Math.sqrt(seF / N),
        meta: { label: 'RMSE filtre', precision: 3 },
      },
      rmseZ: {
        value: Math.sqrt(seZ / N),
        meta: { label: 'RMSE capteur', precision: 3 },
      },
    },
  };
}
