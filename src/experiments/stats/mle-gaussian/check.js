import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { mu: 5, sigma: 1.5, N: 20, model: 'both', seed: 3 };

export const checks = [
  {
    name: 'μ̂ equals the sample mean (exact)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      let sum = 0;
      for (const x of o.samples) sum += x;
      const diff = Math.abs(o.muHat.value - sum / o.samples.length);
      return { ok: diff < 1e-12, detail: `|Δ|=${diff.toExponential(2)}` };
    },
  },
  {
    name: 'σ̂² equals the MLE variance Σ(xᵢ−μ̂)²/N (exact)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      let ss = 0;
      for (const x of o.samples) ss += (x - o.muHat.value) ** 2;
      const diff = Math.abs(o.sigmaHat.value ** 2 - ss / o.samples.length);
      return { ok: diff < 1e-12, detail: `|Δ|=${diff.toExponential(2)}` };
    },
  },
  {
    name: 'log-likelihood profile is maximal at μ̂',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      const { x, y } = o.logLik;
      let arg = 0;
      for (let i = 1; i < y.length; i++) if (y[i] > y[arg]) arg = i;
      const step = x[1] - x[0];
      const diff = Math.abs(x[arg] - o.muHat.value);
      return { ok: diff <= step, detail: `argmax at ${x[arg].toFixed(3)}, μ̂=${o.muHat.value.toFixed(3)}` };
    },
  },
  {
    name: 'consistency: μ̂ within 4σ/√N of μ at N = 500',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, N: 500 });
      const tol = (4 * BASE.sigma) / Math.sqrt(500);
      const err = Math.abs(o.muHat.value - BASE.mu);
      return { ok: err < tol, detail: `|μ̂−μ|=${err.toFixed(4)} < ${tol.toFixed(4)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'samples'),
];
