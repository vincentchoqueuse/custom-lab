import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { N: 256, pad: 4, f1: 200, df: 15, a2: -20, win: 'rect', seed: 1 };

export const checks = [
  {
    name: 'Parseval holds through the zero-padded DFT',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, win: 'hann' });
      return {
        ok: o.parsevalGap < 1e-9,
        detail: `relative gap=${o.parsevalGap.toExponential(2)}`,
      };
    },
  },
  {
    name: 'periodic Hann ENBW = 1.5 bins (exact identity)',
    category: 'numeric',
    run() {
      // periodic Hann: Σw = N/2 and Σw² = 3N/8 exactly, so ENBW = 1.5
      const { observables: o } = compute({ ...BASE, win: 'hann' });
      const gap = Math.abs(o.enbw.value - 1.5);
      return { ok: gap < 1e-12, detail: `ENBW=${o.enbw.value} (gap ${gap.toExponential(1)})` };
    },
  },
  {
    name: 'rect first sidelobe at −13.26 dB (Dirichlet kernel)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, win: 'rect' });
      return {
        ok: Math.abs(o.sidelobe.value - -13.26) < 0.15,
        detail: `measured=${o.sidelobe.value.toFixed(2)} dB`,
      };
    },
  },
  {
    name: 'Hann highest sidelobe at −31.5 dB',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, win: 'hann' });
      return {
        ok: Math.abs(o.sidelobe.value - -31.5) < 0.3,
        detail: `measured=${o.sidelobe.value.toFixed(2)} dB`,
      };
    },
  },
  {
    name: 'an on-bin full-scale tone reads 0 dB at its exact frequency',
    category: 'numeric',
    run() {
      // f1 = 250 Hz sits exactly on bin 256 of Nfft = 1024 (Fs = 1000);
      // normalization by the coherent gain Σw/2 puts its peak at 0 dB (the
      // −80 dB second tone and the negative-frequency image only perturb at
      // the ~0.01 dB level)
      const { observables: o } = compute({ ...BASE, f1: 250, a2: -80 });
      const okDb = Math.abs(o.peakDb) < 0.05;
      const okF = Math.abs(o.peakF - 250) < 1000 / 1024 / 2;
      return {
        ok: okDb && okF,
        detail: `peak=${o.peakDb.toFixed(4)} dB at ${o.peakF.toFixed(3)} Hz`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'spectrum'),
];
