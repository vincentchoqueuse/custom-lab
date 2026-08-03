import { compute } from './compute.js';
import { standardChecks, maxGap } from '../../../core/checks.js';

const FS = 2000;
const T = 2;
const BASE = { source: 'chirp', f1: 900, df: 15, fm: 8, fmod: 1, fdev: 150,
               N: 256, win: 'hann', tcut: 1, seed: 1 };

/** Fold a frequency into the first Nyquist zone [0, Fs/2]. */
const fold = (f) => {
  const r = ((f % FS) + FS) % FS;
  return Math.min(r, FS - r);
};

export const checks = [
  {
    name: 'per-frame Parseval holds through the STFT',
    category: 'numeric',
    run() {
      const { observables: o } = compute(BASE);
      return {
        ok: o.parsevalGap < 1e-9,
        detail: `worst relative gap=${o.parsevalGap.toExponential(2)}`,
      };
    },
  },
  {
    name: 'AM source: the ridge stays on the 400 Hz carrier',
    category: 'numeric',
    run() {
      // sidebands are AM_DEPTH/2 = 0.4 of the carrier: argmax must stay on
      // the carrier bin on every interior frame (edge frames excluded)
      const { observables: o } = compute({ ...BASE, source: 'am', N: 512 });
      const binHz = FS / 512;
      let worst = 0;
      const n = o.ridge.y.length;
      for (let c = Math.floor(n * 0.1); c < Math.floor(n * 0.9); c++) {
        worst = Math.max(worst, Math.abs(o.ridge.y[c] - 400));
      }
      return { ok: worst <= binHz, detail: `max|ridge−400|=${worst.toFixed(2)} Hz (bin ${binHz.toFixed(2)})` };
    },
  },
  {
    name: 'chirp ridge slope = (f1 − f0)/T (least squares on the ridge)',
    category: 'numeric',
    run() {
      const { observables: o } = compute(BASE);
      const n = o.ridge.x.length;
      const i0 = Math.floor(n * 0.1);
      const i1 = Math.floor(n * 0.9);
      let mx = 0;
      let my = 0;
      let m = 0;
      for (let i = i0; i < i1; i++) {
        mx += o.ridge.x[i];
        my += o.ridge.y[i];
        m++;
      }
      mx /= m;
      my /= m;
      let num = 0;
      let den = 0;
      for (let i = i0; i < i1; i++) {
        num += (o.ridge.x[i] - mx) * (o.ridge.y[i] - my);
        den += (o.ridge.x[i] - mx) ** 2;
      }
      const slope = num / den;
      const th = (900 - 100) / T; // 400 Hz/s
      const rel = Math.abs(slope - th) / th;
      return { ok: rel < 0.03, detail: `slope=${slope.toFixed(1)} Hz/s vs ${th} (rel ${(rel * 100).toFixed(2)}%)` };
    },
  },
  {
    name: 'beyond Nyquist the ridge folds: ridge ≈ fold(f_inst)',
    category: 'numeric',
    run() {
      // f1 = 2800: the instantaneous frequency bounces on Nyquist (and on 0
      // after folding). PHYSICS at the bounce vertices: within one window the
      // chirp sweeps (f1−f0)/T · N/Fs ≈ 172 Hz, so frames whose window
      // CONTAINS a vertex see both branches at once and their argmax is
      // legitimately off the folded line. Those frames are excluded (margin =
      // half the in-window sweep); everywhere else the ridge must track
      // fold(f_inst) within 2 bins.
      const { observables: o } = compute({ ...BASE, f1: 2800 });
      const binHz = FS / 256;
      const margin = (((2800 - 100) / T) * (256 / FS)) / 2;
      let worst = 0;
      const n = o.ridge.x.length;
      for (let c = Math.floor(n * 0.1); c < Math.floor(n * 0.9); c++) {
        const t = o.ridge.x[c];
        const fInst = 100 + ((2800 - 100) * t) / T;
        const distToVertex = Math.abs(((fInst + 500) % 1000) - 500); // vertices at k·1000
        if (distToVertex < margin) continue;
        worst = Math.max(worst, Math.abs(o.ridge.y[c] - fold(fInst)));
      }
      return { ok: worst <= 2 * binHz, detail: `max|ridge−fold|=${worst.toFixed(1)} Hz (2 bins = ${(2 * binHz).toFixed(1)}, vertices excluded)` };
    },
  },
  {
    name: 'slice at t = 1: two-tones peak lands between the tones',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, source: 'tones', df: 40, N: 512 });
      let best = 0;
      for (let i = 1; i < o.slice.x.length; i++) {
        if (o.slice.y[i] > o.slice.y[best]) best = i;
      }
      const f = o.slice.x[best];
      const binHz = FS / 512;
      const okRange = f >= 300 - binHz && f <= 340 + binHz;
      return { ok: okRange, detail: `peak at ${f.toFixed(1)} Hz (tones 300/340)` };
    },
  },
  {
    name: 'FM : la crête suit F + Δ·sin(2π f_mod t), à un bin près',
    category: 'numeric',
    run() {
      // The phase is integrated in closed form; the STFT is asked whether it
      // agrees, at four instants covering a full modulation period. Only the
      // 350…700 Hz band is searched — the chirp's own line lives elsewhere.
      const fmod = 1;
      const fdev = 150;
      const binHz = FS / 256;
      const gap = maxGap(
        [0.25, 0.5, 0.75, 1],
        (tcut) => {
          const o = compute({ ...BASE, source: 'fm', fmod, fdev, tcut }).observables;
          let best = 0;
          for (let i = 0; i < o.slice.x.length; i++) {
            const f = o.slice.x[i];
            if (f > 350 && f < 700 && o.slice.y[i] > o.slice.y[best]) best = i;
          }
          return o.slice.x[best];
        },
        (tcut) => 500 + fdev * Math.sin(2 * Math.PI * fmod * tcut)
      );
      return { ok: gap <= binHz, detail: `écart max ${gap.toFixed(1)} Hz (bin = ${binHz.toFixed(1)} Hz)` };
    },
  },
  standardChecks.determinism(compute, BASE, 'slice'),
];
