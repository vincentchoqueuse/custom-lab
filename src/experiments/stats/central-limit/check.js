import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';
import { trapz } from '../../../core/numeric.js';

const BASE = { law: 'dice', n: 10, M: 5000, p: 0.1, seed: 11 };

export const checks = [
  {
    name: 'CLT Gaussian integrates to 1 on its grid',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      const s = trapz(o.gaussPdf.x, o.gaussPdf.y);
      return { ok: Math.abs(s - 1) < 1e-3, detail: `∫=${s.toFixed(5)}` };
    },
  },
  {
    name: 'mean of the means ≈ μ (dice, n = 10, M = 10⁴)',
    category: 'statistical',
    run() {
      const M = 10000;
      const { observables: o } = compute({ ...BASE, M });
      const err = Math.abs(o.empMean.value - o.thMean.value);
      const tol = (4 * o.thSd.value) / Math.sqrt(M);
      return { ok: err < tol, detail: `|x̄−μ|=${err.toFixed(4)} < ${tol.toFixed(4)}` };
    },
  },
  {
    name: 'spread of the means ≈ σ/√n (exponential, M = 10⁴)',
    category: 'statistical',
    run() {
      const M = 10000;
      const { observables: o } = compute({ ...BASE, law: 'exponential', M });
      const rel = Math.abs(o.empSd.value / o.thSd.value - 1);
      const tol = 4 * Math.sqrt(2 / M); // sd-of-sd relative error
      return { ok: rel < tol, detail: `|s/σₙ−1|=${rel.toFixed(4)} < ${tol.toFixed(4)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'means'),
];
