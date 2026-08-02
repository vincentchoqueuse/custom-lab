import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { wave: 'square', N: 10, A: 1, seed: 42 };

export const checks = [
  {
    name: 'square-wave coefficients are exactly 4A/(πn) on odd ranks',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      let worst = 0;
      for (let i = 0; i < o.spectrum.x.length; i++) {
        const n = o.spectrum.x[i];
        const expected = n % 2 === 1 ? 4 / (Math.PI * n) : 0;
        worst = Math.max(worst, Math.abs(o.spectrum.y[i] - expected));
      }
      return { ok: worst < 1e-14, detail: `max|Δbₙ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'Parseval: tail energy at N=1 equals signal power minus b₁²/2',
    category: 'numeric',
    run() {
      // square power = A²; err(1)² = A² − (4A/π)²/2, up to the 2000-term cap
      const { observables: o } = compute({ ...BASE });
      const expected = Math.sqrt(1 - (4 / Math.PI) ** 2 / 2);
      const err = Math.abs(o.errorVsN.y[0] - expected);
      return { ok: err < 1e-3, detail: `|Δ|=${err.toExponential(2)}` };
    },
  },
  {
    name: 'time-domain RMS error matches the Parseval prediction (triangle)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, wave: 'triangle', N: 5 });
      // continuous signal: sampled RMS ≈ analytic tail closely
      const rel = Math.abs(o.rmsError.value - o.errorVsN.y[4]) / o.errorVsN.y[4];
      return { ok: rel < 0.05, detail: `rel Δ=${(rel * 100).toFixed(2)}%` };
    },
  },
  {
    name: 'Gibbs overshoot ≈ 8.95% at N = 60, independent of A',
    category: 'numeric',
    run() {
      const a = compute({ ...BASE, N: 60 }).observables.overshoot.value;
      const b = compute({ ...BASE, N: 60, A: 2 }).observables.overshoot.value;
      const ok = Math.abs(a - 8.95) < 1 && Math.abs(a - b) < 0.1;
      return { ok, detail: `overshoot=${a.toFixed(2)}% (A=1), ${b.toFixed(2)}% (A=2)` };
    },
  },
  {
    name: 'convergence slopes: triangle error falls ~N^(-3/2), square ~N^(-1/2)',
    category: 'numeric',
    run() {
      const slope = (o) => {
        const y = o.errorVsN.y;
        const x = o.errorVsN.x;
        // fit between N=10 and N=50 in log-log (odd-harmonic series are not
        // yet asymptotic at small N)
        return Math.log(y[49] / y[9]) / Math.log(x[49] / x[9]);
      };
      const sq = slope(compute({ ...BASE }).observables);
      const tr = slope(compute({ ...BASE, wave: 'triangle' }).observables);
      const ok = Math.abs(sq + 0.5) < 0.1 && Math.abs(tr + 1.5) < 0.1;
      return { ok, detail: `slope square=${sq.toFixed(2)}, triangle=${tr.toFixed(2)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'reconstruction'),
];
