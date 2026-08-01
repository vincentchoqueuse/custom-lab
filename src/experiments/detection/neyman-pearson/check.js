import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';
import { normalCdf } from '../../../core/numeric.js';

const BASE = { snr: 1, pfa: 0.05, N: 10, M: 5000, seed: 31 };

/** linear interpolation of a series at x (ascending x). */
function interp(series, x) {
  const { x: xs, y: ys } = series;
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) {
      const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
      return ys[i - 1] + t * (ys[i] - ys[i - 1]);
    }
  }
  return ys[ys.length - 1];
}

export const checks = [
  {
    name: 'threshold consistency: Φ(γ) = 1 − P_FA',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      const err = Math.abs(normalCdf(o.gamma.value) - (1 - BASE.pfa));
      return { ok: err < 1e-7, detail: `|Δ|=${err.toExponential(2)}` };
    },
  },
  {
    name: 'the operating point lies ON the theoretical ROC',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      const err = Math.abs(interp(o.rocCurve, BASE.pfa) - o.pdTh.value);
      return { ok: err < 1e-4, detail: `|Δ|=${err.toExponential(2)}` };
    },
  },
  {
    name: 'P_D(SNR) curve passes through the current point',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      const err = Math.abs(interp(o.pdVsSnr, 10 * Math.log10(BASE.snr)) - o.pdTh.value);
      return { ok: err < 1e-3, detail: `|Δ|=${err.toExponential(2)}` };
    },
  },
  {
    name: 'the 3 dB rule: doubling N shifts P_D(SNR) by exactly −3.01 dB',
    category: 'numeric',
    run() {
      // d² = N·SNR: P_D at (2N, SNR) equals P_D at (N, 2·SNR)
      const a = compute({ ...BASE, N: 20 }).observables.pdTh.value;
      const b = compute({ ...BASE, snr: 2 }).observables.pdTh.value;
      const err = Math.abs(a - b);
      return { ok: err < 1e-12, detail: `|Δ|=${err.toExponential(2)}` };
    },
  },
  {
    name: 'Monte Carlo P̂_FA matches the target (M = 20000)',
    category: 'statistical',
    run() {
      const M = 20000;
      const { observables: o } = compute({ ...BASE, M });
      const err = Math.abs(o.pfaEmpS.value - BASE.pfa);
      const tol = 4 * Math.sqrt((BASE.pfa * (1 - BASE.pfa)) / M);
      return { ok: err < tol, detail: `|P̂_FA−P_FA|=${err.toFixed(4)} < ${tol.toFixed(4)}` };
    },
  },
  {
    name: 'Monte Carlo P̂_D matches the theory (M = 20000)',
    category: 'statistical',
    run() {
      const M = 20000;
      const { observables: o } = compute({ ...BASE, M });
      const p = o.pdTh.value;
      const err = Math.abs(o.pdEmpS.value - p);
      const tol = 4 * Math.sqrt((p * (1 - p)) / M);
      return { ok: err < tol, detail: `|P̂_D−P_D|=${err.toFixed(4)} < ${tol.toFixed(4)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'pdEmpS'),
];
