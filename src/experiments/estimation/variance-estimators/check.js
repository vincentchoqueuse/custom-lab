import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { mu: 0, sigma: 1.5, N: 5, M: 2000, seed: 29 };

export const checks = [
  {
    name: 'the two estimators differ by exactly (N−1)/N (same sum of squares)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      let worst = 0;
      for (let m = 0; m < o.v1.length; m++) {
        worst = Math.max(worst, Math.abs(o.v1[m] - (o.v2[m] * (BASE.N - 1)) / BASE.N));
      }
      return { ok: worst < 1e-12, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'theoretical bias curve is exactly −σ²/N on the grid',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      let worst = 0;
      for (let g = 0; g < o.biasTh1.x.length; g++) {
        worst = Math.max(worst, Math.abs(o.biasTh1.y[g] + BASE.sigma ** 2 / o.biasTh1.x[g]));
      }
      return { ok: worst < 1e-12, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 's² (÷N−1) is unbiased: ⟨s²⟩ ≈ σ² (M = 20000)',
    category: 'statistical',
    run() {
      const M = 20000;
      const { observables: o } = compute({ ...BASE, M });
      const s2 = BASE.sigma ** 2;
      const err = Math.abs(o.meanV2.value - s2);
      // se of ⟨s²⟩: s²·√(2/(N−1))/√M
      const tol = 4 * s2 * Math.sqrt(2 / (BASE.N - 1) / M);
      return { ok: err < tol, detail: `|⟨s²⟩−σ²|=${err.toFixed(4)} < ${tol.toFixed(4)}` };
    },
  },
  {
    name: 'σ̂² (÷N) shows its −σ²/N bias: ⟨σ̂²⟩ ≈ σ²(N−1)/N (M = 20000)',
    category: 'statistical',
    run() {
      const M = 20000;
      const { observables: o } = compute({ ...BASE, M });
      const expected = (BASE.sigma ** 2 * (BASE.N - 1)) / BASE.N;
      const err = Math.abs(o.meanV1.value - expected);
      const tol = 4 * expected * Math.sqrt(2 / (BASE.N - 1) / M);
      return { ok: err < tol, detail: `|⟨σ̂²⟩−σ²(N−1)/N|=${err.toFixed(4)} < ${tol.toFixed(4)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'v1'),
];
