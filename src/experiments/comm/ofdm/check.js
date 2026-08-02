import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { Nc: 64, L: 6, cp: 8, snr: 15, M: 50, seed: 5 };

export const checks = [
  {
    name: 'channel normalization and Parseval: Σ|h|² = 1 = (1/Nc)·Σ|H_k|²',
    category: 'numeric',
    run() {
      const { observables: o } = compute(BASE);
      const g1 = Math.abs(o.hEnergy - 1);
      const g2 = Math.abs(o.parseval - 1);
      return {
        ok: g1 < 1e-12 && g2 < 1e-9,
        detail: `|Σ|h|²−1|=${g1.toExponential(1)}, |Parseval−1|=${g2.toExponential(1)}`,
      };
    },
  },
  {
    name: 'sufficient prefix diagonalizes the channel: error-free without noise',
    category: 'numeric',
    run() {
      // snr = 200 dB ≈ noiseless: with cp ≥ L−1 the one-tap ZF must recover
      // every bit through a 6-tap channel — circular convolution is exact
      const { observables: o } = compute({ ...BASE, snr: 200 });
      return { ok: o.berMeas.value === 0, detail: `BER=${o.berMeas.value} through L=6 taps` };
    },
  },
  {
    name: 'missing prefix leaves an error floor no SNR can fix',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, cp: 0, snr: 200 });
      return {
        ok: o.berMeas.value > 0.005,
        detail: `BER=${o.berMeas.value.toFixed(4)} at 200 dB SNR (ISI floor)`,
      };
    },
  },
  {
    name: 'flat channel (L = 1): measured BER matches Q(√SNR)',
    category: 'statistical',
    run() {
      // n = 2·Nc·M bits; tolerance 4·SE with SE from the binomial variance
      // at the theoretical p (computed in-run as berSe)
      const { observables: o } = compute({ ...BASE, L: 1, snr: 7, M: 200 });
      const gap = Math.abs(o.berMeas.value - o.berThAvg.value);
      return {
        ok: gap < 4 * o.berSe + 1e-12,
        detail: `meas=${o.berMeas.value.toFixed(4)} th=${o.berThAvg.value.toFixed(4)} (tol ${(4 * o.berSe).toFixed(4)})`,
      };
    },
  },
  {
    name: 'selective channel: mean BER within 4 SE of the per-carrier ZF theory',
    category: 'statistical',
    run() {
      // the strongest statement of the experiment: averaging Q(√(|H_k|²·SNR))
      // over the ACTUAL fades predicts the measured mean BER
      const { observables: o } = compute({ ...BASE, snr: 10, M: 200 });
      const gap = Math.abs(o.berMeas.value - o.berThAvg.value);
      return {
        ok: gap < 4 * o.berSe,
        detail: `meas=${o.berMeas.value.toFixed(4)} th=${o.berThAvg.value.toFixed(4)} (tol ${(4 * o.berSe).toFixed(4)})`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'berMeasured'),
];
