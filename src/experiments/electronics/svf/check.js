import { compute, svfGain } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const FS = 8000;
// f0 = 125 Hz = 64 bins of the 4096-point window: harmonics sit on bins
const BASE = { source: 'square', f0: 125, fc: 500, Q: 2, output: 'lp', seed: 1 };

export const checks = [
  {
    name: 'exact identity: H_lp(z = 1) = 1 whatever (fc, Q)',
    category: 'numeric',
    run() {
      let worst = 0;
      for (const fc of [100, 700, 1500]) {
        for (const Q of [0.5, 5, 20]) {
          const f1 = 2 * Math.sin((Math.PI * fc) / FS);
          worst = Math.max(worst, Math.abs(svfGain('lp', 0, f1, 1 / Q) - 1));
        }
      }
      return { ok: worst < 1e-12, detail: `max|H_lp(0)−1|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'the notch zero sits exactly at fc (the reason f1 = 2·sin(π·fc/Fs))',
    category: 'numeric',
    run() {
      let worst = 0;
      for (const fc of [250, 800, 1400]) {
        const f1 = 2 * Math.sin((Math.PI * fc) / FS);
        worst = Math.max(worst, svfGain('notch', fc, f1, 1 / 5));
      }
      return { ok: worst < 1e-12, detail: `max|H_notch(fc)|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'steady state: output harmonics = input harmonics × |H| (square)',
    category: 'numeric',
    run() {
      // ties the sample-by-sample simulation to the z-domain algebra: the
      // square's odd harmonics (4/(πk)) through H_lp, read on exact bins
      // via the Hann-windowed spectra (identical windows cancel in the
      // ratio); Q = 2, fc = 500 → transient fully decayed after SKIP
      const { observables: o } = compute(BASE);
      const f1 = 2 * Math.sin((Math.PI * 500) / FS);
      const binHz = FS / 4096;
      let worst = 0;
      for (let k = 1; k <= 15; k += 2) {
        const bin = Math.round((k * 125) / binHz);
        const ratioDb = o.specOut.y[bin] - o.specIn.y[bin];
        const thDb = 20 * Math.log10(svfGain('lp', k * 125, f1, 0.5));
        worst = Math.max(worst, Math.abs(ratioDb - thDb));
      }
      return { ok: worst < 1e-6, detail: `max harmonic gap=${worst.toExponential(2)} dB` };
    },
  },
  {
    name: 'notch scene: the targeted harmonic vanishes from the output',
    category: 'numeric',
    run() {
      // fc = 375 Hz = harmonic 3 of 125 Hz, both on exact bins
      const { observables: o } = compute({ ...BASE, fc: 375, Q: 8, output: 'notch' });
      const binHz = FS / 4096;
      const b3 = Math.round(375 / binHz);
      const suppression = o.specIn.y[b3] - o.specOut.y[b3];
      return { ok: suppression > 70, detail: `harmonic 3 suppressed by ${suppression.toFixed(1)} dB` };
    },
  },
  {
    name: 'stability everywhere the validate rule allows — and only there',
    category: 'numeric',
    run() {
      // the Chamberlin structure genuinely goes unstable at high fc + low Q:
      // the manifest's validate rule draws the boundary f1·(f1 + 2/Q) < 4,
      // and this check certifies BOTH sides of it
      const boundary = (fc, Q) => {
        const f1 = 2 * Math.sin((Math.PI * fc) / FS);
        return f1 * f1 + (2 * f1) / Q;
      };
      let worstIn = 0;
      for (const fc of [100, 700, 1000, 1500]) {
        for (const Q of [0.5, 1, 5, 20]) {
          if (boundary(fc, Q) >= 3.92) continue; // blocked by validate
          const { observables: o } = compute({ ...BASE, fc, Q });
          worstIn = Math.max(worstIn, o.maxPole);
        }
      }
      const beyond = compute({ ...BASE, fc: 1500, Q: 0.5 }).observables.maxPole;
      return {
        ok: worstIn < 1 && beyond > 1,
        detail: `allowed box max|z|=${worstIn.toFixed(4)}; beyond the rule |z|=${beyond.toFixed(2)} (unstable, as taught)`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'specOut'),
];
