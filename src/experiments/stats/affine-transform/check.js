import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { law: 'gaussian', a: 2, b: 1, N: 5000, seed: 13 };
const ALL_LAWS = ['gaussian', 'uniform', 'exponential', 'rayleigh'];

function trapz(x, y, f = (yi) => yi) {
  let s = 0;
  for (let i = 1; i < x.length; i++)
    s += ((f(y[i], x[i]) + f(y[i - 1], x[i - 1])) / 2) * (x[i] - x[i - 1]);
  return s;
}

export const checks = [
  {
    name: 'transformed pdf integrates to 1 (all laws, a = 2 and a = −1.5)',
    category: 'numeric',
    run() {
      let worst = 0;
      let where = '';
      for (const law of ALL_LAWS) {
        for (const a of [2, -1.5]) {
          const { observables: o } = compute({ ...BASE, law, a });
          const err = Math.abs(trapz(o.pdfY.x, o.pdfY.y) - 1);
          if (err > worst) {
            worst = err;
            where = `${law}, a=${a}`;
          }
        }
      }
      // display-grid tolerance: trapezoid across pdf jumps (uniform edges,
      // exponential at 0) — a missing 1/|a| would miss by ~50%
      return { ok: worst < 2e-2, detail: `worst=${where} |∫−1|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'E[Y] and Var(Y) match ∫y·f_Y and ∫(y−E[Y])²·f_Y (numerical integration)',
    category: 'numeric',
    run() {
      // gaussian and uniform: supports fully covered by the display grid, so
      // the integrals are truncation-free (the exponential's clipped tail at
      // 6/λ carries too much second-moment mass for this identity check)
      let worst = 0;
      let where = '';
      for (const [law, a, b] of [['gaussian', -1.5, 2], ['uniform', 2, -1]]) {
        const { observables: o } = compute({ ...BASE, law, a, b });
        const m = trapz(o.pdfY.x, o.pdfY.y, (fy, x) => x * fy);
        const v = trapz(o.pdfY.x, o.pdfY.y, (fy, x) => (x - o.meanY.value) ** 2 * fy);
        const err = Math.max(Math.abs(m - o.meanY.value), Math.abs(v - o.varY.value));
        if (err > worst) {
          worst = err;
          where = law;
        }
      }
      return { ok: worst < 2e-2, detail: `worst=${where} |Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'empirical mean of Y ≈ aE[X] + b (N = 5000)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE });
      let s = 0;
      for (const y of o.ySamples) s += y;
      const err = Math.abs(s / o.ySamples.length - o.meanY.value);
      const tol = 4 * Math.sqrt(o.varY.value / o.ySamples.length);
      return { ok: err < tol, detail: `|ȳ−E[Y]|=${err.toFixed(4)} < ${tol.toFixed(4)}` };
    },
  },
  {
    name: 'empirical variance of Y ≈ a²Var(X) (N = 5000)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, law: 'uniform', a: -2.5, b: 3 });
      const n = o.ySamples.length;
      let s = 0;
      for (const y of o.ySamples) s += y;
      const m = s / n;
      let ss = 0;
      for (const y of o.ySamples) ss += (y - m) ** 2;
      const rel = Math.abs(ss / (n - 1) / o.varY.value - 1);
      const tol = 4 * Math.sqrt(2 / n);
      return { ok: rel < tol, detail: `|s²/Var−1|=${rel.toFixed(4)} < ${tol.toFixed(4)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'ySamples'),
];
