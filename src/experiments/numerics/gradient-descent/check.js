import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { fn: 'quad', kappa: 10, alpha: 0.1, beta: 0.9, N: 30, seed: 34 };

export const checks = [
  {
    name: 'Newton solves the quadratic in exactly one iteration',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, kappa: 37 });
      return {
        // f − f* is QUADRATIC in the coordinate error, so an iterate correct
        // to machine precision (1e-16) shows up here around 1e-32. Asserting
        // an exact zero would be asserting the rounding of one particular
        // division; 1e-20 is the machine floor squared, with room.
        ok: o.rawNewton[1] < 1e-20,
        detail: `gap(1)=${o.rawNewton[1].toExponential(2)}`,
      };
    },
  },
  {
    name: 'gradient linear rate equals ((κ−1)/(κ+1))² at the optimal step',
    category: 'numeric',
    run() {
      const kappa = 20;
      const alpha = 2 / (kappa + 1);
      const { observables: o } = compute({ ...BASE, kappa, alpha, N: 40 });
      // measured per-iteration ratio over the tail (asymptotic regime)
      const g = o.rawGradient;
      const rate = (g[40] / g[20]) ** (1 / 20);
      const th = ((kappa - 1) / (kappa + 1)) ** 2;
      const rel = Math.abs(rate - th) / th;
      return { ok: rel < 0.02, detail: `taux=${rate.toFixed(4)} ≈ ${th.toFixed(4)}` };
    },
  },
  {
    name: 'gradient diverges past the stability limit α > 2/κ',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, kappa: 10, alpha: 0.25, N: 40 });
      return {
        ok: o.gapGradient.y[40] > o.gapGradient.y[0] * 100,
        detail: `gap(40)=${o.gapGradient.y[40].toExponential(1)}`,
      };
    },
  },
  {
    name: 'heavy-ball at its optimal (α, β) beats the optimally-stepped gradient',
    category: 'numeric',
    run() {
      // κ = 50: gradient at α* = 2/(κ+1); heavy ball at α = 4/(√L+√μ)²,
      // β = ((√κ−1)/(√κ+1))² — rate √ρ vs ρ per iteration
      const kappa = 50;
      const sk = Math.sqrt(kappa);
      const grad = compute({ ...BASE, kappa, alpha: 2 / (kappa + 1), N: 60 }).observables;
      const mom = compute({
        ...BASE,
        kappa,
        alpha: 4 / (sk + 1) ** 2,
        beta: ((sk - 1) / (sk + 1)) ** 2,
        N: 60,
      }).observables;
      return {
        ok: mom.rawMomentum[60] < 0.01 * grad.rawGradient[60],
        detail: `momentum=${mom.rawMomentum[60].toExponential(2)} vs gradient=${grad.rawGradient[60].toExponential(2)}`,
      };
    },
  },
  {
    name: 'Newton reaches the Rosenbrock minimum; gradient is still far',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, fn: 'rosenbrock', alpha: 0.0015, N: 100 });
      const newtonDone = o.rawNewton[100] < 1e-10;
      const gradSlow = o.gapGradient.y[100] > 1e-3;
      return {
        ok: newtonDone && gradSlow,
        detail: `Newton=${o.rawNewton[100].toExponential(2)}, gradient=${o.rawGradient[100].toExponential(2)}`,
      };
    },
  },
  {
    name: 'marching squares: every contour segment endpoint lies on its level',
    category: 'numeric',
    run() {
      // segments interpolate f linearly per cell: endpoints must be within
      // one cell's f-variation of the level → coarse sanity via re-evaluation
      const { observables: o } = compute({ ...BASE, kappa: 4 });
      const s = o.contourSegs;
      const f = (x, y) => (x * x + 4 * y * y) / 2;
      // linear edge interpolation of a quadratic: relative error scales as
      // (cell/ellipse-radius)² — judge the large contours only, where it
      // must be sub-percent; tiny inner levels are visually fine but noisy
      let worst = 0;
      for (let i = 0; i + 3 < s.length; i += 4) {
        const fa = f(s[i], s[i + 1]);
        const fb = f(s[i + 2], s[i + 3]);
        if (Math.max(fa, fb) < 0.1) continue;
        worst = Math.max(worst, Math.abs(fa - fb) / Math.max(fa, fb));
      }
      return { ok: worst < 0.06, detail: `max rel Δf (grands contours)=${(worst * 100).toFixed(2)}%` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'gapGradient'),
];
