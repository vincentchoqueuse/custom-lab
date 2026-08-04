import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

/** Closed-form Riccati fixed point of the scalar random-walk model. */
function riccatiGain(Q, R) {
  const PmInf = (Q + Math.sqrt(Q * Q + 4 * Q * R)) / 2;
  return PmInf / (PmInf + R);
}

export const checks = [
  {
    name: 'steady-state gain reaches the Riccati fixed point (closed form)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ sigw: 0.3, sigv: 1, N: 500, seed: 1 });
      const kLast = o.gains.y[499];
      const kTh = riccatiGain(0.09, 1);
      // convergence is exponential (contraction ratio (1−K∞)² ≈ 0.55): at
      // k = 500 the transient is far below floating-point noise
      return {
        ok: Math.abs(kLast - kTh) < 1e-9,
        detail: `K_500=${kLast.toFixed(10)} vs K∞=${kTh.toFixed(10)}`,
      };
    },
  },
  {
    name: 'posterior identity P⁺ₖ = Kₖ·R at every step (exact algebra)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ sigw: 0.1, sigv: 2, N: 300, seed: 2 });
      const R = 4;
      let worst = 0;
      for (let k = 0; k < 300; k++) {
        worst = Math.max(worst, Math.abs(o.pks[k] - o.gains.y[k] * R));
      }
      return { ok: worst < 1e-12, detail: `max|P−KR|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'normalized innovations are N(0,1): sample variance ≈ 1',
    category: 'statistical',
    run() {
      // innovations ν/√S are exactly iid N(0,1) here; Var(s²) ≈ 2/N so the
      // tolerance is 4·√(2/N)
      const N = 2000;
      const { observables: o } = compute({ sigw: 0.2, sigv: 1, N, seed: 3 });
      const tol = 4 * Math.sqrt(2 / N);
      return {
        ok: Math.abs(o.nuVar - 1) < tol,
        detail: `var(ν̃)=${o.nuVar.toFixed(4)} (tol ${tol.toFixed(4)})`,
      };
    },
  },
  {
    name: 'the filter beats the raw sensor (RMSE)',
    category: 'statistical',
    run() {
      // steady state P⁺∞ = K∞R < R always, so this holds at any setting with
      // enough samples
      const { observables: o } = compute({ sigw: 0.1, sigv: 1, N: 500, seed: 4 });
      return {
        ok: o.rmseF.value < o.rmseZ.value,
        detail: `filter=${o.rmseF.value.toFixed(3)} < sensor=${o.rmseZ.value.toFixed(3)}`,
      };
    },
  },
  standardChecks.determinism(compute, { sigw: 0.1, sigv: 1, N: 120, seed: 7 }, 'est'),
];
