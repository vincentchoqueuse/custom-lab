import { compute } from './compute.js';
import { standardChecks, maxGap, maxAbsDiff, range } from '../../../core/checks.js';
import { fft, windowValue } from '../../../core/numeric.js';

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
    name: 'FM: the ridge follows F + Δ·sin(2π f_mod t), to within a bin',
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
  {
    name: 'full spectrum: the two tones land on 300 Hz and 300 + Δf',
    category: 'numeric',
    run() {
      // The whole-record spectrum resolves what a single STFT frame cannot:
      // over 2 s the Rayleigh limit is 0.5 Hz, so Δf = 15 Hz is two clean
      // peaks. Each is asked to be within one bin of where the source puts
      // it — the identity, not a tolerance pulled out of the air.
      const bin = FS / 4096;
      const o = compute({ ...BASE, source: 'tones', df: 15 }).observables;
      const peaks = [];
      for (let k = 1; k < o.spectrum.x.length - 1; k++) {
        const y = o.spectrum.y[k];
        if (y > -25 && y > o.spectrum.y[k - 1] && y >= o.spectrum.y[k + 1]) peaks.push(o.spectrum.x[k]);
      }
      const gap = maxGap([300, 315], (f) => Math.min(...peaks.map((q) => Math.abs(q - f))));
      return {
        ok: peaks.length === 2 && gap <= bin,
        detail: `${peaks.length} raies ${peaks.map((f) => f.toFixed(1)).join(', ')} Hz, écart max ${gap.toFixed(2)} ≤ ${bin.toFixed(2)} Hz`,
      };
    },
  },
  {
    name: 'the spectrum is blind to time: reversing the chirp leaves it unchanged',
    category: 'numeric',
    run() {
      // THE argument for the STFT, as an identity rather than as a slogan:
      // |X(f)| of a real signal is unchanged by time reversal, so an
      // up-chirp and a down-chirp — visibly opposite on the map — have the
      // same spectrum.
      //
      // The claim is about the SIGNAL, so both records are analysed with the
      // SYMMETRIC Hann here (windowValue's fourth argument), for which
      // w[N−1−n] = w[n] holds exactly and the identity is therefore exact.
      // compute() uses the periodic variant — the right choice for STFT
      // frames, where the window tiles — and the periodic Hann is NOT its own
      // reversal: analysing the reversed record with it leaves a residual of
      // 7.9e-4, which is the window's asymmetry and not the signal's. Passing
      // that off as "the tolerance" would have hidden the one thing this
      // check exists to state.
      const o = compute({ ...BASE, source: 'chirp' }).observables;
      const n = o.signal.y.length;
      const rev = Float64Array.from(o.signal.y, (_, i) => o.signal.y[n - 1 - i]);
      // recompute the spectrum of the reversed record with the same recipe
      const spectrumOf = (sig) => {
        const NF = 4096;
        const re = new Float64Array(NF);
        const im = new Float64Array(NF);
        for (let i = 0; i < sig.length; i++) re[i] = sig[i] * windowValue('hann', i, sig.length, true);
        fft(re, im);
        return Float64Array.from({ length: NF / 2 + 1 }, (_, k) => Math.hypot(re[k], im[k]));
      };
      const a = spectrumOf(o.signal.y);
      const b = spectrumOf(rev);
      const scale = Math.max(...a);
      const worst = maxAbsDiff(a, b) / scale;
      return { ok: worst < 1e-9, detail: `écart relatif max ${worst.toExponential(2)}` };
    },
  },
  {
    name: 'the time view is the source itself, at full rate',
    category: 'numeric',
    run() {
      // The plotted signal must BE x(t), not a decimated cousin: a decimated
      // chirp would alias and quietly draw the wrong picture.
      const o = compute({ ...BASE, source: 'am', fm: 8 }).observables;
      const worst = maxGap(
        range(o.signal.x.length),
        (i) => o.signal.y[i],
        (i) => {
          const t = o.signal.x[i];
          return (1 + 0.8 * Math.sin(2 * Math.PI * 8 * t)) * Math.sin(2 * Math.PI * 400 * t);
        }
      );
      return {
        ok: worst < 1e-12 && o.signal.x.length === FS * 2,
        detail: `${o.signal.x.length} points, max|Δ|=${worst.toExponential(2)}`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'slice'),
  standardChecks.determinism(compute, BASE, 'spectrum'),
];
