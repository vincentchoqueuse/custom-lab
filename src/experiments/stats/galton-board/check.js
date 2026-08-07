// The harness of the board: the law is exact (log-Gamma binomial against an
// independent Pascal recurrence), the sampling is statistical with derived
// standard errors, and the CLT gap is measured where the doc quotes it.
import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const P = (over = {}) => ({ D: 12, M: 3000, p: 0.5, seed: 34, ...over });

/** Binomial pmf by the Pascal recurrence — a second construction, sharing no
 *  code with the log-Gamma one in compute.js. */
function pascalPmf(D, p) {
  let row = [1];
  for (let r = 1; r <= D; r++) {
    const next = new Array(r + 1).fill(0);
    for (let j = 0; j < r; j++) {
      next[j] += row[j] * (1 - p);
      next[j + 1] += row[j] * p;
    }
    row = next;
  }
  return row;
}

export const checks = [
  {
    name: 'the exact pmf: log-Gamma construction matches the Pascal recurrence',
    category: 'numeric',
    run() {
      const { observables: o } = compute(P({ D: 24, p: 0.3 }));
      const ref = pascalPmf(24, 0.3);
      let worst = 0;
      // the floor is logGamma's own accuracy (~1e-12 relative through three
      // calls and an exp) — measured 1.9e-12 at D = 24, hence 1e-11
      for (let k = 0; k <= 24; k++) worst = Math.max(worst, Math.abs(o.binomial.y[k] - ref[k]));
      return { ok: worst < 1e-11, detail: `max|Δ|=${worst.toExponential(1)}` };
    },
  },
  {
    name: 'the pmf sums to 1 and is symmetric at p = 1/2',
    category: 'numeric',
    run() {
      const { observables: o } = compute(P({ D: 15 }));
      const y = o.binomial.y;
      const sum = y.reduce((a, b) => a + b, 0);
      let sym = 0;
      for (let k = 0; k <= 15; k++) sym = Math.max(sym, Math.abs(y[k] - y[15 - k]));
      return {
        ok: Math.abs(sum - 1) < 1e-11 && sym < 1e-12, // sum carries logGamma's floor
        detail: `|Σ−1|=${Math.abs(sum - 1).toExponential(1)}, asym=${sym.toExponential(1)}`,
      };
    },
  },
  {
    name: 'M balls land with mean Dp, within 4·SE',
    category: 'statistical',
    run() {
      // SE of the mean of M Binomial(D, p) draws = √(Dp(1−p)/M)
      const { observables: o } = compute(P({ M: 20000 }));
      const tol = 4 * Math.sqrt((12 * 0.25) / 20000);
      const err = Math.abs(o.meanMeas.value - o.meanTh.value);
      return { ok: err < tol, detail: `|Δmean|=${err.toFixed(4)} tol=${tol.toFixed(4)}` };
    },
  },
  {
    name: 'and with variance Dp(1−p), within 4·SE of a sample variance',
    category: 'statistical',
    run() {
      // SE(s²) ≈ σ²·√(2/(M−1)) for near-Gaussian counts
      const { observables: o } = compute(P({ M: 20000 }));
      const v = o.sdMeas.value ** 2;
      const tol = 4 * 3 * Math.sqrt(2 / 19999);
      const err = Math.abs(v - 3);
      return { ok: err < tol, detail: `|Δvar|=${err.toFixed(4)} tol=${tol.toFixed(4)}` };
    },
  },
  {
    name: 'the CLT gap shrinks with D — and the doc quotes the measured values',
    category: 'numeric',
    run() {
      // local CLT: max_k |pmf − φ| decays as O(1/(Dpq)); what matters for the
      // lecture is the monotone shrink the D slider shows
      const gap = (D) => compute(P({ D })).observables.gaussGap.value;
      const g4 = gap(4);
      const g12 = gap(12);
      const g24 = gap(24);
      return {
        ok: g4 > g12 && g12 > g24 && g24 < 0.003,
        detail: `gap(4)=${g4.toFixed(4)} gap(12)=${g12.toFixed(4)} gap(24)=${g24.toFixed(4)}`,
      };
    },
  },
  {
    name: 'every drawn trajectory takes D steps and lands where a bin exists',
    category: 'numeric',
    run() {
      const { observables: o } = compute(P());
      const { x, y } = o.paths;
      let ok = true;
      let starts = 0;
      for (let i = 0; i < y.length; i++) {
        if (!Number.isFinite(y[i])) continue;
        if (y[i] === 0) starts++;
        if (y[i] === -12) {
          const k = x[i] + 6; // lateral k − D/2 back to k
          if (k < 0 || k > 12 || Math.abs(k - Math.round(k)) > 1e-12) ok = false;
        }
      }
      return { ok: ok && starts === 7, detail: `${starts} trajectories` };
    },
  },
  standardChecks.determinism(compute, P(), 'landing'),
];
