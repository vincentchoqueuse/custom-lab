import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { shape: 'rect', N: 32, snr: 0.2, tau: 32, M: 800, seed: 29 };

export const checks = [
  {
    name: 'clean correlation peaks at τ with value E = N·SNR, every shape',
    category: 'numeric',
    run() {
      let worst = 0;
      for (const shape of ['rect', 'halfsine', 'gauss']) {
        const { observables: o } = compute({ ...BASE, shape });
        const E = BASE.N * BASE.snr;
        let kMax = 0;
        for (let k = 0; k < o.corrClean.y.length; k++) {
          if (o.corrClean.y[k] > o.corrClean.y[kMax]) kMax = k;
        }
        worst = Math.max(worst, Math.abs(kMax - BASE.tau), Math.abs(o.corrClean.y[BASE.tau] - E));
      }
      return { ok: worst < 1e-9, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'clean correlation is symmetric around τ (autocorrelation)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, shape: 'halfsine' });
      let worst = 0;
      for (let d = 1; d <= 10; d++) {
        worst = Math.max(
          worst,
          Math.abs(o.corrClean.y[BASE.tau - d] - o.corrClean.y[BASE.tau + d])
        );
      }
      return { ok: worst < 1e-9, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'processing gain: empirical output SNR ≈ N·SNR on the whole grid',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, M: 5000 });
      let worst = 0;
      for (let g = 0; g < o.gainTheory.x.length; g++) {
        worst = Math.max(worst, Math.abs(o.gainEmp.y[g] - o.gainTheory.y[g]));
      }
      // SNR-in-dB estimate from M = 5000 reps: ~0.5 dB fluctuation
      return { ok: worst < 1, detail: `max|Δ|=${worst.toFixed(2)} dB` };
    },
  },
  {
    name: 'shape invariance: same output SNR for rect, half-sine and gaussian',
    category: 'statistical',
    run() {
      const out = ['rect', 'halfsine', 'gauss'].map(
        (shape) => compute({ ...BASE, shape, M: 5000 }).observables.gainEmp.y[3]
      );
      const spread = Math.max(...out) - Math.min(...out);
      return { ok: spread < 1, detail: `spread=${spread.toFixed(2)} dB @ N=32` };
    },
  },
  {
    name: 'delay estimation: |τ̂ − τ| ≤ 2 at high SNR, across 20 seeds',
    category: 'statistical',
    run() {
      // the rect autocorrelation is a triangle: adjacent lags trail the peak
      // by only E/N, so τ̂ legitimately lands at ±1–2 — delay accuracy comes
      // from peak curvature, not peak height
      let hits = 0;
      for (let s = 0; s < 20; s++) {
        const { observables: o } = compute({ ...BASE, snr: 5, M: 100, seed: 100 + s });
        if (Math.abs(o.tauHat.value - BASE.tau) <= 2) hits++;
      }
      return { ok: hits === 20, detail: `${hits}/20 within ±2` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'corrNoisy'),
];
