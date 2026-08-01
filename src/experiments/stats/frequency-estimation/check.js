import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { f: 5, A: 1, phi: 0, sigma: 0.3, f0: 5.2, seed: 17 };

export const checks = [
  {
    name: 'zero noise: grid search recovers f exactly (parabolic refinement)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, sigma: 0 });
      const err = Math.abs(o.fGrid.value - BASE.f);
      return { ok: err < 5e-3, detail: `|f̂−f|=${err.toExponential(2)}` };
    },
  },
  {
    name: 'well-initialized gradient and Newton agree with the grid minimizer',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      const eg = Math.abs(o.fGrad.value - o.fGrid.value);
      const en = Math.abs(o.fNewton.value - o.fGrid.value);
      return {
        ok: eg < 0.05 && en < 0.02,
        detail: `|grad−grille|=${eg.toFixed(4)} |newton−grille|=${en.toFixed(4)}`,
      };
    },
  },
  {
    name: 'far initialization traps gradient descent in a local basin',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, f0: 9 });
      const trapped = Math.abs(o.fGrad.value - BASE.f);
      return { ok: trapped > 0.5, detail: `|f̂grad−f|=${trapped.toFixed(3)} (stuck near f₀=9)` };
    },
  },
  {
    name: 'gradient iterates never increase the cost (Armijo backtracking)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, f0: 9 });
      const y = o.gradPath.y;
      for (let k = 1; k < y.length; k++) {
        if (y[k] > y[k - 1] + 1e-9)
          return { ok: false, detail: `increase at iterate ${k}` };
      }
      return { ok: true, detail: `${y.length} iterates, monotone` };
    },
  },
  {
    name: "Newton's basin is narrower than gradient's (f₀ = 5.4)",
    category: 'numeric',
    run() {
      // at 0.4 Hz from f the gradient still descends into the global basin,
      // while Newton (needing J'' > 0) has already left it
      const { observables: o } = compute({ ...BASE, f0: 5.4 });
      const gradOk = Math.abs(o.fGrad.value - BASE.f) < 0.1;
      const newtonLost = Math.abs(o.fNewton.value - BASE.f) > 0.5;
      return {
        ok: gradOk && newtonLost,
        detail: `grad=${o.fGrad.value.toFixed(3)} newton=${o.fNewton.value.toFixed(3)}`,
      };
    },
  },
  {
    name: 'moderate noise: grid estimate stays within 0.05 Hz of f',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE });
      const err = Math.abs(o.fGrid.value - BASE.f);
      return { ok: err < 0.05, detail: `|f̂−f|=${err.toFixed(4)} Hz` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'costCurve'),
];
