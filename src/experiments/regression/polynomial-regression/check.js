import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { a0: 0.5, a1: -1, a2: -0.5, a3: 2, d: 3, N: 30, sigma: 0.3, lambda: 1, seed: 5 };

export const checks = [
  {
    name: 'zero noise, d = 3: exact recovery of the true coefficients',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, sigma: 0 });
      const aTrue = [BASE.a0, BASE.a1, BASE.a2, BASE.a3];
      let worst = 0;
      for (let k = 0; k < 4; k++) worst = Math.max(worst, Math.abs(o.coeffsHat.y[k] - aTrue[k]));
      return { ok: worst < 1e-9, detail: `max|Δaₖ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'least-squares residuals orthogonal to the design (Xᵀr ≈ 0)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      const { xData: x, yData: y } = o;
      const a = o.coeffsHat.y;
      const fit = (xi) => a.reduce((s, ak, k) => s + ak * xi ** k, 0);
      let worst = 0;
      for (let k = 0; k <= BASE.d; k++) {
        let dot = 0;
        for (let i = 0; i < x.length; i++) dot += (y[i] - fit(x[i])) * x[i] ** k;
        worst = Math.max(worst, Math.abs(dot));
      }
      return { ok: worst < 1e-8, detail: `max|Xᵀr|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'ridge λ→0 collapses onto least squares',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, lambda: 1e-3 });
      let worst = 0;
      for (let k = 0; k < o.coeffsHat.y.length; k++) {
        worst = Math.max(worst, Math.abs(o.coeffsRidge.y[k] - o.coeffsHat.y[k]));
      }
      return { ok: worst < 0.02, detail: `max|Δaₖ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'ridge shrinks: penalized norm ≤ LS norm, training RMSE ≥ LS RMSE',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, d: 9, N: 20, sigma: 0.4, lambda: 10 });
      const norm = (c) => c.slice(1).reduce((s, v) => s + v * v, 0);
      const shrinks = norm(Array.from(o.coeffsRidge.y)) <= norm(Array.from(o.coeffsHat.y)) + 1e-12;
      const fitsWorse = o.rmseRidge.value >= o.rmse.value - 1e-12;
      return {
        ok: shrinks && fitsWorse,
        detail: `‖aᵣ‖²=${norm(Array.from(o.coeffsRidge.y)).toFixed(3)} ≤ ‖a‖²=${norm(Array.from(o.coeffsHat.y)).toFixed(3)}`,
      };
    },
  },
  {
    name: 'Monte Carlo decomposition holds exactly: MSE = bias² + variance',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, d: 9, N: 20, sigma: 0.4 });
      let worst = 0;
      for (let g = 0; g < o.mseVsLambda.y.length; g++) {
        worst = Math.max(
          worst,
          Math.abs(o.mseVsLambda.y[g] - (o.bias2VsLambda.y[g] + o.varVsLambda.y[g]))
        );
      }
      return { ok: worst < 1e-9, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'along λ: variance falls, bias² rises (overfit regime d = 9)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, d: 9, N: 20, sigma: 0.4 });
      const last = o.varVsLambda.y.length - 1;
      const varFalls = o.varVsLambda.y[last] < 0.2 * o.varVsLambda.y[0];
      const biasRises = o.bias2VsLambda.y[last] > 10 * (o.bias2VsLambda.y[0] + 1e-12);
      return {
        ok: varFalls && biasRises,
        detail: `var ${o.varVsLambda.y[0].toFixed(4)}→${o.varVsLambda.y[last].toFixed(4)}, biais² ${o.bias2VsLambda.y[0].toExponential(1)}→${o.bias2VsLambda.y[last].toExponential(1)}`,
      };
    },
  },
  {
    name: 'consistency: coefficients approach truth at N = 200',
    category: 'statistical',
    run() {
      const N = 200;
      const { observables: o } = compute({ ...BASE, N });
      const aTrue = [BASE.a0, BASE.a1, BASE.a2, BASE.a3];
      let worst = 0;
      for (let k = 0; k < 4; k++) worst = Math.max(worst, Math.abs(o.coeffsHat.y[k] - aTrue[k]));
      // largest asymptotic variance is â₃'s: Var ≈ σ²·43.75/N on a uniform
      // [-1, 1] design (inverse moment matrix) — allow 4 standard errors
      const tol = 4 * BASE.sigma * Math.sqrt(43.75 / N);
      return { ok: worst < tol, detail: `max|Δaₖ|=${worst.toFixed(4)} < ${tol.toFixed(4)}` };
    },
  },
  {
    name: 'overfit regime (d = 9, N = 15) still solves and interpolates better in-sample',
    category: 'numeric',
    run() {
      const lo = compute({ ...BASE, d: 3, N: 15, sigma: 0.4 }).observables.rmse.value;
      const hi = compute({ ...BASE, d: 9, N: 15, sigma: 0.4 }).observables.rmse.value;
      // in-sample RMSE always decreases with model order — the overfitting trap
      return { ok: hi < lo, detail: `rmse d=9: ${hi.toFixed(4)} < d=3: ${lo.toFixed(4)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'yData'),
];
