import { compute, combGain } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const FS = 8000;
// f0 = 125 Hz = 64 bins of the 4096-point window: harmonics on exact bins
const BASE = { structure: 'ff', D: 40, g: 0.7, source: 'square', f0: 125, seed: 1 };

export const checks = [
  {
    name: 'teeth and dips at their closed-form values (both structures)',
    category: 'numeric',
    run() {
      // |H| at a tooth (k·Fs/D) and a dip ((k+½)·Fs/D), against 1±g and
      // 1/(1∓g) — the whole frequency story in four numbers
      const g = 0.6;
      const D = 32;
      const tooth = (3 * FS) / D;
      const dip = (3.5 * FS) / D;
      const gaps = [
        combGain('ff', tooth, D, g) - (1 + g),
        combGain('ff', dip, D, g) - (1 - g),
        combGain('fb', tooth, D, g) - 1 / (1 - g),
        combGain('fb', dip, D, g) - 1 / (1 + g),
      ].map(Math.abs);
      const worst = Math.max(...gaps);
      return { ok: worst < 1e-12, detail: `max gap=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'the feedback impulse response is exactly the echo train g^k',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, structure: 'fb', D: 25, g: 0.8 });
      let worst = 0;
      for (let n = 0; n < o.hImp.length; n++) {
        const th = n % 25 === 0 ? 0.8 ** (n / 25) : 0;
        worst = Math.max(worst, Math.abs(o.hImp[n] - th));
      }
      return { ok: worst < 1e-15, detail: `max|h[n]−g^(n/D)|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'steady state: output harmonics = input harmonics × |H| (both)',
    category: 'numeric',
    run() {
      // ties the sample loop to the closed form; the FIR comb has no
      // transient beyond D samples, the IIR one has g^(SKIP/D) ≈ 1e-10 left
      let worst = 0;
      for (const structure of ['ff', 'fb']) {
        const { observables: o } = compute({ ...BASE, structure, D: 64, g: 0.7 });
        const binHz = FS / 4096;
        for (let k = 1; k <= 15; k += 2) {
          const bin = Math.round((k * 125) / binHz);
          const ratioDb = o.specOut.y[bin] - o.specIn.y[bin];
          const thDb = 20 * Math.log10(combGain(structure, k * 125, 64, 0.7));
          worst = Math.max(worst, Math.abs(ratioDb - thDb));
        }
      }
      return { ok: worst < 1e-8, detail: `max harmonic gap=${worst.toExponential(2)} dB` };
    },
  },
  {
    name: 'alignment: f0 = Fs/D puts every harmonic on a tooth (gain 1/(1−g))',
    category: 'numeric',
    run() {
      // scene 3: f0 = 250 Hz, D = 32 → Fs/D = 250; every harmonic of the
      // square must gain exactly 20·log10(1/(1−g)) = 13.98 dB
      const { observables: o } = compute({ ...BASE, structure: 'fb', D: 32, g: 0.8, f0: 250 });
      const binHz = FS / 4096;
      const th = 20 * Math.log10(1 / 0.2);
      let worst = 0;
      for (let k = 1; k <= 9; k += 2) {
        const bin = Math.round((k * 250) / binHz);
        worst = Math.max(worst, Math.abs(o.specOut.y[bin] - o.specIn.y[bin] - th));
      }
      return { ok: worst < 1e-6, detail: `max|gain−13.98dB|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'feedback poles on |z| = |g|^(1/D): stable over the whole box',
    category: 'numeric',
    run() {
      let worst = 0;
      for (const [D, g] of [[8, 0.95], [160, 0.95], [40, -0.95]]) {
        const { observables: o } = compute({ ...BASE, structure: 'fb', D, g });
        const th = Math.abs(g) ** (1 / D);
        worst = Math.max(worst, Math.abs(o.maxPole - th));
        if (o.maxPole >= 1) return { ok: false, detail: `unstable at D=${D}, g=${g}` };
      }
      return { ok: worst < 1e-12, detail: `|z| matches |g|^(1/D), max|z|=${(0.95 ** (1 / 160)).toFixed(5)}` };
    },
  },
  standardChecks.determinism(compute, BASE, 'specOut'),
];
