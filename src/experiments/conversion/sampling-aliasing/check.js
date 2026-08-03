import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { source: 'sine', f: 5, fe: 50, seed: 34 };

export const checks = [
  {
    name: 'folding formula: 45 Hz sampled at 50 Hz appears at exactly 5 Hz',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, f: 45 });
      const err = Math.abs(o.fApp.value - 5);
      return { ok: err < 1e-12, detail: `f_app=${o.fApp.value}` };
    },
  },
  {
    name: 'aliasing identity: samples of 45 Hz equal −(samples of 5 Hz)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, f: 45 });
      let worst = 0;
      for (let k = 0; k < o.sampled.x.length; k++) {
        const expected = -Math.sin(2 * Math.PI * 5 * o.sampled.x[k]);
        worst = Math.max(worst, Math.abs(o.sampled.y[k] - expected));
      }
      return { ok: worst < 1e-9, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'sinc reconstruction is exact below Nyquist (interior of the window)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, f: 2 });
      // sinc truncation degrades the edges: judge the middle third only
      const n = o.continuous.x.length;
      let worst = 0;
      for (let i = Math.floor(n / 3); i < Math.floor((2 * n) / 3); i++) {
        worst = Math.max(worst, Math.abs(o.reconstructed.y[i] - o.continuous.y[i]));
      }
      return { ok: worst < 0.02, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'square wave: every folded harmonic lands inside [0, fe/2]',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, source: 'square', f: 15 });
      let ok = o.specAlias.x.length > 2;
      for (let i = 0; i < o.specAlias.x.length; i++) {
        if (o.specAlias.x[i] < 0 || o.specAlias.x[i] > BASE.fe / 2 + 1e-12) ok = false;
      }
      // 3rd harmonic 45 Hz must fold to 5 Hz
      const h3 = Math.abs(o.specAlias.x[1] - 5) < 1e-12;
      return { ok: ok && h3, detail: `${o.specAlias.x.length} raies, 45→${o.specAlias.x[1]} Hz` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'reconstructed'),
];
