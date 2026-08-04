import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = {
  basis: 'rbf',
  target: 'damped',
  M: 8,
  ell: 0.15,
  lambda: 1e-8,
  N: 60,
  sigma: 0.1,
  seed: 29,
};

export const checks = [
  {
    name: 'training error is monotone in M for NESTED families (poly, fourier)',
    category: 'numeric',
    run() {
      // a theorem only for nested bases: span(M) ⊂ span(M+1). RBF centers
      // move with M (families not nested), so no monotonicity there.
      let ok = true;
      for (const basis of ['poly', 'fourier']) {
        const { observables: o } = compute({ ...BASE, basis });
        const y = o.errTrain.y;
        for (let i = 1; i < y.length; i++) if (y[i] > y[i - 1] * 1.001) ok = false;
      }
      return { ok, detail: 'poly & fourier — décroissante point à point' };
    },
  },
  {
    name: 'Fourier on the square target reproduces the Gibbs overshoot (~9%)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({
        ...BASE,
        basis: 'fourier',
        target: 'square',
        M: 19,
        N: 300,
        sigma: 0,
      });
      let peak = -Infinity;
      for (let i = 0; i < o.fitCurve.y.length; i++) peak = Math.max(peak, o.fitCurve.y[i]);
      const overshoot = (peak - 1) / 2; // fraction of the jump (height 2)
      return {
        ok: Math.abs(overshoot - 0.089) < 0.03,
        detail: `overshoot=${(overshoot * 100).toFixed(1)}% (Gibbs ≈ 8.9%)`,
      };
    },
  },
  {
    name: 'one sigmoid nails the square target (a neuron is an edge detector)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({
        ...BASE,
        basis: 'sigmoid',
        target: 'square',
        M: 1,
        ell: 0.02,
        N: 200,
        sigma: 0,
      });
      return {
        ok: o.rmseTrain.value < 0.15,
        detail: `RMSE=${o.rmseTrain.value.toFixed(4)} avec M=1`,
      };
    },
  },
  {
    name: 'noiseless bump: enough RBFs drive the training error to ~0',
    category: 'numeric',
    run() {
      const { observables: o } = compute({
        ...BASE,
        target: 'bump',
        M: 15,
        ell: 0.15,
        sigma: 0,
        N: 100,
      });
      return { ok: o.rmseTrain.value < 1e-3, detail: `RMSE=${o.rmseTrain.value.toExponential(2)}` };
    },
  },
  {
    name: 'the test-error U: overfitting at M = 20 costs vs the best M',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, N: 40, sigma: 0.15, ell: 0.12 });
      const y = o.errTest.y;
      let best = Infinity;
      for (let i = 0; i < y.length; i++) best = Math.min(best, y[i]);
      const last = y[y.length - 1];
      return {
        ok: last > 1.3 * best && best > 0.5 * 0.15 ** 2,
        detail: `min=${best.toExponential(2)}, M=20: ${last.toExponential(2)}`,
      };
    },
  },
  {
    name: 'test error floors near σ² at the sweet spot',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, sigma: 0.2, N: 150 });
      let best = Infinity;
      for (const v of o.errTest.y) best = Math.min(best, v);
      const ratio = best / 0.2 ** 2;
      return { ok: ratio > 0.7 && ratio < 1.6, detail: `min EQM/σ² = ${ratio.toFixed(2)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'fitCurve'),
];
