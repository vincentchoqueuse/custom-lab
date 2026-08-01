import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { law: 'dice', n: 2000, K: 10, p: 0.5, seed: 23 };

export const checks = [
  {
    name: 'funnel equals μ ± 2σ/√n at every checkpoint (exact)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      const mu = 3.5;
      const sd = Math.sqrt(35 / 12);
      const f = o.funnel;
      let worst = 0;
      for (let i = 0; i < f.x.length; i++) {
        const half = (2 * sd) / Math.sqrt(f.x[i]);
        worst = Math.max(worst, Math.abs(f.hi[i] - (mu + half)), Math.abs(f.lo[i] - (mu - half)));
      }
      return { ok: worst < 1e-12, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'trajectory series contains exactly K NaN-separated segments',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      let segments = 0;
      let inSegment = false;
      for (const v of o.trajectories.y) {
        if (Number.isNaN(v)) {
          if (inSegment) segments++;
          inSegment = false;
        } else inSegment = true;
      }
      return { ok: segments === BASE.K, detail: `${segments} segments for K=${BASE.K}` };
    },
  },
  {
    name: 'all K final means within 4σ/√n of μ (n = 2000)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE });
      const tol = 4 * Math.sqrt(35 / 12 / BASE.n);
      const worst = o.worstErr.value;
      return { ok: worst < tol, detail: `max|x̄ₙ−μ|=${worst.toFixed(4)} < ${tol.toFixed(4)}` };
    },
  },
  {
    name: 'Bernoulli frequency converges to p (n = 5000)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, law: 'bernoulli', n: 5000 });
      const tol = 4 * Math.sqrt(0.25 / 5000);
      return {
        ok: o.worstErr.value < tol,
        detail: `max|f−p|=${o.worstErr.value.toFixed(4)} < ${tol.toFixed(4)}`,
      };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'finalMeans'),
];
