import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';
import { mean } from '../../../core/numeric.js';

const BASE = { theta: 5, N: 10, M: 20000, seed: 29 };

export const checks = [
  {
    name: 'order invariants: max ≤ θ and max ≤ max+min, always',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      let ok = true;
      for (let m = 0; m < o.t1.length; m++) {
        if (o.t1[m] > BASE.theta || o.t2[m] < o.t1[m]) ok = false;
      }
      return { ok, detail: `M=${o.t1.length} repetitions` };
    },
  },
  {
    name: 'theory curves are exact: θ√(2/(N+1)(N+2)) and θ/√(3N) on the grid',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      let worst = 0;
      for (let g = 0; g < o.rmseTh1.x.length; g++) {
        const n = o.rmseTh1.x[g];
        worst = Math.max(
          worst,
          Math.abs(o.rmseTh1.y[g] - BASE.theta * Math.sqrt(2 / ((n + 1) * (n + 2)))),
          Math.abs(o.rmseTh3.y[g] - BASE.theta / Math.sqrt(3 * n))
        );
      }
      return { ok: worst < 1e-12, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'max is biased low: ⟨max⟩ ≈ Nθ/(N+1)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE });
      const expected = (BASE.N * BASE.theta) / (BASE.N + 1);
      const err = Math.abs(mean(o.t1) - expected);
      // se of ⟨max⟩: θ√(N/((N+1)²(N+2)))/√M
      const tol =
        (4 * BASE.theta * Math.sqrt(BASE.N / ((BASE.N + 1) ** 2 * (BASE.N + 2)))) /
        Math.sqrt(BASE.M);
      return { ok: err < tol, detail: `|⟨max⟩−Nθ/(N+1)|=${err.toFixed(4)} < ${tol.toFixed(4)}` };
    },
  },
  {
    name: 'max+min and 2x̄ are unbiased: ⟨θ̂⟩ ≈ θ',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE });
      const err2 = Math.abs(mean(o.t2) - BASE.theta);
      const err3 = Math.abs(mean(o.t3) - BASE.theta);
      const tol2 =
        4 * BASE.theta * Math.sqrt(2 / ((BASE.N + 1) * (BASE.N + 2))) / Math.sqrt(BASE.M);
      const tol3 = (4 * BASE.theta) / Math.sqrt(3 * BASE.N * BASE.M);
      return {
        ok: err2 < tol2 && err3 < tol3,
        detail: `|⟨max+min⟩−θ|=${err2.toFixed(4)}, |⟨2x̄⟩−θ|=${err3.toFixed(4)}`,
      };
    },
  },
  {
    name: 'empirical RMSE matches theory for all three (10% relative)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE });
      const th12 = BASE.theta * Math.sqrt(2 / ((BASE.N + 1) * (BASE.N + 2)));
      const th3 = BASE.theta / Math.sqrt(3 * BASE.N);
      const rel = (v, th) => Math.abs(v - th) / th;
      const worst = Math.max(
        rel(o.rmse1.value, th12),
        rel(o.rmse2.value, th12),
        rel(o.rmse3.value, th3)
      );
      return { ok: worst < 0.1, detail: `worst rel err=${(worst * 100).toFixed(1)}%` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 't1'),
];
