import { compute, firGain } from './compute.js';
import { standardChecks } from '../../../core/checks.js';
import { BENCH } from '../../../core/bench.js';

const FS = BENCH.FS;
// f0 = 125 Hz = 64 bins of the 4096-point window: harmonics on exact bins
const BASE = { b: [0.25, 0.25, 0.25, 0.25], source: 'square', f0: 125, seed: 1 };

export const checks = [
  {
    name: 'DC gain is exactly the sum of the taps',
    category: 'numeric',
    run() {
      let worst = 0;
      for (const b of [[0.25, 0.25, 0.25, 0.25], [1, -1], [0.5, 0, -0.5], [0, 0, 0, 1]]) {
        const { observables: o } = compute({ ...BASE, b });
        const sum = b.reduce((a, c) => a + c, 0);
        worst = Math.max(worst, Math.abs(o.dcGain.value - sum), Math.abs(firGain(b, 0) - Math.abs(sum)));
      }
      return { ok: worst < 1e-15, detail: `max|H(0)−Σb|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'a length-L moving average nulls exactly at k·Fs/L',
    category: 'numeric',
    run() {
      // Dirichlet zeros: Σ e^{−j2πkm/L} = 0 for m = 1…L−1
      let worst = 0;
      for (const L of [4, 8, 10]) {
        const b = Array.from({ length: L }, () => 1 / L);
        for (let m = 1; m < L; m++) worst = Math.max(worst, firGain(b, (m * FS) / L));
      }
      return { ok: worst < 1e-14, detail: `max|H(k·Fs/L)|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'pure delay b = [0,0,0,1]: output = input shifted by 3, bit for bit',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, b: [0, 0, 0, 1] });
      const x = compute({ ...BASE, b: [1] }).observables.yFull; // identity filter
      let worst = 0;
      for (let n = 3; n < o.yFull.length; n++) worst = Math.max(worst, Math.abs(o.yFull[n] - x[n - 3]));
      return { ok: worst === 0, detail: `max|y[n]−x[n−3]|=${worst}` };
    },
  },
  {
    name: 'the pure delay is all-pass: |H| = 1 at every frequency',
    category: 'numeric',
    run() {
      let worst = 0;
      for (let f = 0; f <= FS / 2; f += 37) worst = Math.max(worst, Math.abs(firGain([0, 0, 0, 1], f) - 1));
      return { ok: worst < 1e-15, detail: `max||H|−1|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'the difference filter [1,−1] has |H| = 2·|sin(πf/Fs)| exactly',
    category: 'numeric',
    run() {
      let worst = 0;
      for (let f = 0; f <= FS / 2; f += 53) {
        const th = 2 * Math.abs(Math.sin((Math.PI * f) / FS));
        worst = Math.max(worst, Math.abs(firGain([1, -1], f) - th));
      }
      return { ok: worst < 1e-15, detail: `max gap=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'steady state: output harmonics = input harmonics × |H|',
    category: 'numeric',
    run() {
      // ties the convolution loop to the transfer function (bench identity)
      let worst = 0;
      for (const b of [[0.25, 0.25, 0.25, 0.25], [1, -1], [0.5, 0, -0.5]]) {
        const { observables: o } = compute({ ...BASE, b });
        const binHz = FS / BENCH.NFFT;
        for (let k = 1; k <= 15; k += 2) {
          const bin = Math.round((k * 125) / binHz);
          const ratioDb = o.specOut.y[bin] - o.specIn.y[bin];
          const thDb = 20 * Math.log10(firGain(b, k * 125));
          worst = Math.max(worst, Math.abs(ratioDb - thDb));
        }
      }
      return { ok: worst < 1e-9, detail: `max harmonic gap=${worst.toExponential(2)} dB` };
    },
  },
  standardChecks.determinism(compute, BASE, 'specOut'),
];
