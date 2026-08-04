import { compute, interpKernel, filterStream, FS } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { fft } from '../../../core/numeric.js';

// f0 = 1000 Hz falls on a bin of the grid: the levels are read without
// fuite spectrale.
const BASE = { stage: 'filtered', L: 4, f0: 1000, half: 8 };

export const checks = [
  {
    name: 'zero-stuffing changes NOTHING in the spectrum — an exact identity',
    category: 'numeric',
    run() {
      // The heart of the experiment, and the only thing that has to be believed:
      // inserting L−1 zeros leaves the transform identical, periodized. On DFTs
      // of lengths N and N·L that reads X_up[k] = X[k mod N] — no window, no
      // tolerance, to machine precision.
      const N = 64;
      const bad = [];
      for (const L of [2, 4, 8]) {
        const xr = new Float64Array(N);
        const xi = new Float64Array(N);
        for (let n = 0; n < N; n++) xr[n] = Math.sin((2 * Math.PI * 1000 * n) / FS);
        const ur = new Float64Array(N * L);
        const ui = new Float64Array(N * L);
        for (let n = 0; n < N; n++) ur[n * L] = xr[n];
        fft(xr, xi);
        fft(ur, ui);
        const worst = Math.max(
          ...range(N * L, (k) => Math.abs(Math.hypot(ur[k], ui[k]) - Math.hypot(xr[k % N], xi[k % N])))
        );
        if (worst > 1e-12) bad.push(`L=${L} : ${worst.toExponential(1)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : '|X_up[k]| = |X[k mod N]| to 1e-12 for L = 2, 4, 8',
      };
    },
  },
  {
    name: 'the kernel is 1 at the centre and 0 at the other multiples of L',
    category: 'numeric',
    run() {
      // The property that makes the interpolation not DISPLACE the data: at the
      // instants of the original samples, the filter reads nothing but them.
      const bad = [];
      for (const L of [2, 4, 8]) {
        const half = 8 * L;
        const h = interpKernel(L, half);
        if (Math.abs(h[half] - 1) > 1e-15) bad.push(`L=${L} : centre ${h[half]}`);
        const worst = Math.max(
          ...range(2 * 8 + 1, (i) => (i === 8 ? 0 : Math.abs(h[half + (i - 8) * L])))
        );
        if (worst > 1e-15) bad.push(`L=${L}: zeros ${worst.toExponential(1)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'h(0) = 1 to 1e-15, h(mL) = 0 to 1e-15',
      };
    },
  },
  {
    name: 'the interpolated stream passes EXACTLY through the original samples',
    category: 'numeric',
    run() {
      const { observables: o } = compute(BASE);
      return {
        ok: o.interpErr.value < 1e-12,
        detail: `max gap ${o.interpErr.value.toExponential(2)}`,
      };
    },
  },
  {
    name: 'zero-stuffing divides the mean power by exactly L',
    category: 'numeric',
    run() {
      // The hidden price of the first gesture, and the reason the filter carries
      // a gain of L: one sample in L is non-zero, so the mean power is divided by
      // L — exactly, not approximately.
      const N = 512;
      const bad = [];
      for (const L of [2, 4, 8]) {
        const x = new Float64Array(N);
        for (let n = 0; n < N; n++) x[n] = Math.sin((2 * Math.PI * 1000 * n) / FS);
        const up = new Float64Array(N * L);
        for (let n = 0; n < N; n++) up[n * L] = x[n];
        const p = (a) => a.reduce((s, v) => s + v * v, 0) / a.length;
        const ratio = p(x) / p(up);
        if (Math.abs(ratio - L) > 1e-12) bad.push(`L=${L} : ${ratio}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'P(x)/P(x_up) = L to 1e-12 for L = 2, 4, 8',
      };
    },
  },
  {
    name: 'the gain the filter gives back is EXACTLY 20·log₁₀(L)',
    category: 'numeric',
    run() {
      // The corollary of the previous check, read off the figure: the stuffing
      // had divided the power by L, and the kernel of DC gain L gives it back.
      // The useful line therefore does not "come back" to its level in the
      // zero-stuffed stream — it goes 20·log10(L) above it, and that is what has
      // to be said.
      const bad = [];
      for (const L of [2, 4, 8]) {
        const v = compute({ ...BASE, L }).observables.bandLevel.value;
        const th = 20 * Math.log10(L);
        if (Math.abs(v - th) > 0.15) bad.push(`L=${L} : ${v.toFixed(2)} vs ${th.toFixed(2)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : '+6.02, +12.04, +18.06 dB for L = 2, 4, 8 (±0.15)',
      };
    },
  },
  {
    name: 'a filter too short rejects nothing — but the rejection is NOT monotone',
    category: 'numeric',
    run() {
      // What scene 4 projects, and the trap it must avoid. Lengthening the
      // filter improves the rejection as a TREND, not at every step: the Hann
      // window sets a lobe floor, and the ripple pattern slides as M changes —
      // so the image at Fs − f₀ falls sometimes in a trough, sometimes on a bump
      // (−55 dB at M = 2, −44 at M = 4). The check pins both ends, which do not
      // mislead, AND the non-monotonicity, so that nobody "fixes" it one day by
      // mistake.
      const img = (half) => compute({ ...BASE, half }).observables.imgFilteredDb;
      const short = img(1);
      const long = img(16);
      const nonMono = img(4) > img(2);
      return {
        ok: short > -12 && long < -75 && nonMono,
        detail:
          `M=1: ${short.toFixed(1)} dB (there is no filter) · M=16: ${long.toFixed(1)} dB · ` +
          `M=2 → 4 : ${img(2).toFixed(1)} → ${img(4).toFixed(1)} dB, l'ondulation glisse`,
      };
    },
  },
  {
    name: 'at step 2 the images are there, at step 3 they are gone',
    category: 'numeric',
    run() {
      // What the last two scenes show, in a single number: without the filter
      // the image at Fs − f₀ is at the level of the useful line; with it, it is
      // buried.
      const stuffed = compute({ ...BASE, stage: 'stuffed' }).observables.imgStuffedDb;
      const filtered = compute(BASE).observables.imgFilteredDb;
      return {
        ok: stuffed > -3 && filtered < -45,
        detail: `step 2: ${stuffed.toFixed(1)} dB · step 3: ${filtered.toFixed(1)} dB`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'spectrum'),
];
