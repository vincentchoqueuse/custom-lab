import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { mu: 5, sigma: 2, N: 30, M: 40, conf: 0.95, known: false, seed: 1 };

export const checks = [
  {
    name: 'empirical coverage ≈ 1−α within 1% (σ known, M = 10⁴)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, known: true, M: 10000 });
      const cov = o.coverage.value;
      return { ok: Math.abs(cov - 0.95) < 0.01, detail: `cov=${cov.toFixed(4)}` };
    },
  },
  {
    name: 'Student CI wider than Gaussian CI at small N',
    category: 'numeric',
    run() {
      const student = compute({ ...BASE, N: 5, M: 2000 }).observables.meanHalfWidth.value;
      const gauss = compute({ ...BASE, N: 5, M: 2000, known: true }).observables
        .meanHalfWidth.value;
      return {
        ok: student > gauss,
        detail: `student=${student.toFixed(3)} gauss=${gauss.toFixed(3)}`,
      };
    },
  },
  {
    name: 'half-width decreases as 1/√N (σ known: exact)',
    category: 'numeric',
    run() {
      // known σ → half-width = z·σ/√N deterministically: the N=25 / N=100
      // ratio must be exactly 2
      const a = compute({ ...BASE, known: true, N: 25, M: 10 }).observables.meanHalfWidth.value;
      const b = compute({ ...BASE, known: true, N: 100, M: 10 }).observables.meanHalfWidth.value;
      const r = a / b;
      return { ok: Math.abs(r - 2) < 1e-9, detail: `ratio=${r.toFixed(10)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'means'),
];
