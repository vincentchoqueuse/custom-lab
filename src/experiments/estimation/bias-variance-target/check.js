import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { mu: 2, sigma: 1.5, N: 5, lambda: 0.8, M: 4000, seed: 29 };

export const checks = [
  {
    name: 'λ = 1 makes the shrunk mean coincide with x̄ exactly',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, lambda: 1 });
      let worst = 0;
      for (let m = 0; m < o.shotsMean.x.length; m++) {
        worst = Math.max(worst, Math.abs(o.shotsShrink.x[m] - o.shotsMean.x[m]));
      }
      return { ok: worst < 1e-12, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'empirical decomposition is an identity: MSE = bias² + variance',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      let worst = 0;
      for (const s of o.estStats) {
        worst = Math.max(worst, Math.abs(s.mse - (s.bias2 + s.variance)));
      }
      return { ok: worst < 1e-9, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'MSE(λ) curve: minimum at λ* = μ²/(μ²+σ²/N), exact on the grid',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      const y = o.mseVsLambda.y;
      let gMin = 0;
      for (let g = 1; g < y.length; g++) if (y[g] < y[gMin]) gMin = g;
      const err = Math.abs(o.mseVsLambda.x[gMin] - o.lambdaStar.value);
      return { ok: err < 0.011, detail: `argmin=${o.mseVsLambda.x[gMin].toFixed(2)}, λ*=${o.lambdaStar.value.toFixed(3)}` };
    },
  },
  {
    name: 'x̄ variance ≈ 2σ²/N (2D trace, M = 4000)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE });
      const expected = (2 * BASE.sigma ** 2) / BASE.N;
      const v = o.estStats[0].variance;
      // se of a 2-dof variance estimate: expected·√(2/2M)·2, take 4σ
      const tol = 4 * expected / Math.sqrt(BASE.M);
      return { ok: Math.abs(v - expected) < tol, detail: `var=${v.toFixed(4)} ≈ ${expected.toFixed(4)}` };
    },
  },
  {
    name: 'shrunk-mean MSE matches the closed form 2(1−λ)²μ² + 2λ²σ²/N',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE });
      const expected =
        2 * ((1 - BASE.lambda) * BASE.mu) ** 2 +
        (2 * BASE.lambda ** 2 * BASE.sigma ** 2) / BASE.N;
      const rel = Math.abs(o.estStats[2].mse - expected) / expected;
      return { ok: rel < 0.1, detail: `rel Δ=${(rel * 100).toFixed(1)}%` };
    },
  },
  {
    name: 'ordering: Var(x̄) < Var(median) < Var(x₁), and Var(x₁) ≈ 2σ²',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, N: 25 });
      const [vMean, vMed, , vFirst] = o.estStats.map((s) => s.variance);
      const first = Math.abs(vFirst - 2 * BASE.sigma ** 2) / (2 * BASE.sigma ** 2) < 0.15;
      return {
        ok: vMean < vMed && vMed < vFirst && first,
        detail: `${vMean.toFixed(3)} < ${vMed.toFixed(3)} < ${vFirst.toFixed(3)}`,
      };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'dMean'),
];
