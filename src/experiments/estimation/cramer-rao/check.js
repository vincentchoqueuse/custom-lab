import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { mu: 2, sigma: 1.5, N: 20, M: 8000, seed: 29 };

export const checks = [
  {
    name: 'the CRB line is exactly σ²/N on the grid',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, M: 200 });
      let worst = 0;
      for (let g = 0; g < o.crbLine.x.length; g++) {
        worst = Math.max(worst, Math.abs(o.crbLine.y[g] - BASE.sigma ** 2 / o.crbLine.x[g]));
      }
      return { ok: worst < 1e-12, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'x̄ attains the bound: Var(x̄) ≈ σ²/N within 4 SE (M = 8000)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE });
      const crb = BASE.sigma ** 2 / BASE.N;
      const v = crb / o.effMeanS.value; // Var(x̄) from the pill-N distribution
      // se of an empirical variance: v·√(2/M)
      const tol = 4 * crb * Math.sqrt(2 / BASE.M);
      return { ok: Math.abs(v - crb) < tol, detail: `Var=${v.toFixed(5)} ≈ CRB=${crb.toFixed(5)}` };
    },
  },
  {
    name: 'no estimator significantly beats the bound (all N, all three)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, M: 4000 });
      const floor = 1 + 4 * Math.sqrt(2 / 4000); // efficiency ≤ 1 + 4 SE
      let worst = 0;
      for (const key of ['effMean', 'effMedian', 'effMidrange']) {
        for (let g = 0; g < o[key].y.length; g++) worst = Math.max(worst, o[key].y[g]);
      }
      return { ok: worst < floor, detail: `max eff=${worst.toFixed(3)} < ${floor.toFixed(3)}` };
    },
  },
  {
    name: 'median efficiency → 2/π at N = 200 (within 8%)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, M: 6000 });
      const eff = o.effMedian.y[o.effMedian.y.length - 1];
      const rel = Math.abs(eff - 2 / Math.PI) / (2 / Math.PI);
      return { ok: rel < 0.08, detail: `eff=${eff.toFixed(3)} ≈ ${(2 / Math.PI).toFixed(3)}` };
    },
  },
  {
    name: 'the midrange collapses: efficiency at N = 200 below the median\'s half',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, M: 4000 });
      const last = o.effMidrange.y.length - 1;
      return {
        ok: o.effMidrange.y[last] < 0.5 * o.effMedian.y[last],
        detail: `midrange=${o.effMidrange.y[last].toFixed(3)} vs median=${o.effMedian.y[last].toFixed(3)}`,
      };
    },
  },
  standardChecks.determinism(compute, { ...BASE, M: 500 }, 'dMean'),
];
