import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = {
  law: 'gaussian', N: 500, a: 0, b: 1, mu: 0, sigma: 1, lambda: 1.5, p: 0.3, n: 10, seed: 7,
};

const CONTINUOUS = ['uniform', 'gaussian', 'exponential', 'rayleigh'];
const DISCRETE = ['bernoulli', 'binomial', 'poisson'];

function trapz(x, y) {
  let s = 0;
  for (let i = 1; i < x.length; i++) s += ((y[i] + y[i - 1]) / 2) * (x[i] - x[i - 1]);
  return s;
}

/** linear interpolation of a series at x (series x ascending). */
function interp(series, x) {
  const { x: xs, y: ys } = series;
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) {
      const t = xs[i] === xs[i - 1] ? 1 : (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
      return ys[i - 1] + t * (ys[i] - ys[i - 1]);
    }
  }
  return ys[ys.length - 1];
}

export const checks = [
  {
    name: 'every continuous pdf integrates to 1 on its display range',
    category: 'numeric',
    run() {
      let worst = 0;
      let where = '';
      for (const law of CONTINUOUS) {
        const { observables: o } = compute({ ...BASE, law });
        const integral = trapz(o.theoreticalPdf.x, o.theoreticalPdf.y);
        const err = Math.abs(integral - 1);
        if (err > worst) {
          worst = err;
          where = law;
        }
      }
      // tolerance: tail truncation (exponential at 6/λ: e⁻⁶ ≈ 2.5e-3) plus the
      // trapezoid error across a pdf jump on the 301-point display grid
      // (≈ λ·h/2 ≈ 5e-3) — a wrong formula would miss by orders of magnitude
      return { ok: worst < 1.5e-2, detail: `worst=${where} |∫−1|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'every pmf sums to 1 on its support',
    category: 'numeric',
    run() {
      let worst = 0;
      let where = '';
      for (const law of DISCRETE) {
        const { observables: o } = compute({ ...BASE, law });
        let s = 0;
        for (const v of o.theoreticalPdf.y) s += v;
        const err = Math.abs(s - 1);
        if (err > worst) {
          worst = err;
          where = law;
        }
      }
      return { ok: worst < 1e-6, detail: `worst=${where} |Σ−1|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'ECDF close to the theoretical CDF (KS-type, gaussian, N = 5000)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, law: 'gaussian', N: 5000 });
      const emp = o.empiricalCdf;
      let sup = 0;
      for (let i = 0; i < emp.x.length; i++) {
        sup = Math.max(sup, Math.abs(emp.y[i] - interp(o.theoreticalCdf, emp.x[i])));
      }
      const tol = (1.63 / Math.sqrt(5000)) * 1.3; // 1% KS critical value + margin
      return { ok: sup < tol, detail: `sup|F̂−F|=${sup.toFixed(4)} < ${tol.toFixed(4)}` };
    },
  },
  {
    name: 'observed frequencies close to the pmf (Poisson, N = 5000)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, law: 'poisson', N: 5000 });
      let sup = 0;
      for (let i = 0; i < o.theoreticalPdf.y.length; i++) {
        sup = Math.max(sup, Math.abs(o.empiricalPdf.y[i] - o.theoreticalPdf.y[i]));
      }
      // se of a frequency ≤ 0.5/√N — allow 5 of them
      const tol = 2.5 / Math.sqrt(5000);
      return { ok: sup < tol, detail: `sup|f̂−p|=${sup.toFixed(4)} < ${tol.toFixed(4)}` };
    },
  },
  {
    name: 'empirical mean matches E[X] (binomial, N = 5000)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, law: 'binomial', N: 5000 });
      const err = Math.abs(o.xbar.value - o.meanTh.value);
      const tol = 4 * Math.sqrt(o.varTh.value / 5000);
      return { ok: err < tol, detail: `|x̄−np|=${err.toFixed(4)} < ${tol.toFixed(4)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'samples'),
];
