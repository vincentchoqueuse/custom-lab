import { compute } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { sinc } from '../../../core/numeric.js';

// f0 = 1000 Hz sits on a 62.5 Hz bin of the 16 ms spectrum window, and so
// do the images at k·L·Fs ± f0 — spectral levels are read without leakage.
const BASE = { f0: 1000, L: 4, digFilter: true, seed: 1 };

export const checks = [
  {
    name: 'the interpolated stream passes through the original samples exactly',
    category: 'numeric',
    run() {
      // windowed-sinc kernel: 1 at its center, 0 at the other multiples of L
      const { observables: o } = compute(BASE);
      // upBars carries the stuffed stream (originals at multiples of L),
      // upLine the filtered one, on the same time base
      const originals = range(o.upBars.y.length).filter((i) => o.upBars.y[i] !== 0);
      const worst = maxGap(originals, (i) => o.upLine.y[i], (i) => o.upBars.y[i]);
      return { ok: worst < 1e-12, detail: `max|interp−sample|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'baseband droop matches 20·log10|sinc(f0/(L·Fs))|',
    category: 'numeric',
    run() {
      // measured absolute baseband level vs the ZOH theory (the interpolation
      // FIR adds a small passband ripple: 0.1 dB tolerance)
      const worst = maxGap(
        [1, 4],
        (L) => compute({ ...BASE, L }).observables.baseDb,
        (L) => 20 * Math.log10(Math.abs(sinc(1000 / (L * 8000))))
      );
      const detail = [1, 4]
        .map((L) => `L=${L}:${compute({ ...BASE, L }).observables.baseDb.toFixed(3)}`)
        .join(' ');
      return { ok: worst < 0.1, detail: detail.trim() + ' dB' };
    },
  },
  {
    name: 'first image at L·Fs − f0 sits on the ZOH sinc envelope',
    category: 'numeric',
    run() {
      const { observables: o } = compute(BASE);
      const fImg = 4 * 8000 - 1000;
      const th =
        20 * Math.log10(Math.abs(sinc(fImg / (4 * 8000)))) -
        20 * Math.log10(Math.abs(sinc(1000 / (4 * 8000))));
      const gap = Math.abs(o.img1Db.value - th);
      return {
        ok: gap < 0.5,
        detail: `image=${o.img1Db.value.toFixed(2)} dB vs sinc ${th.toFixed(2)} dB`,
      };
    },
  },
  {
    name: 'the digital filter is what kills the stuffed image at Fs − f0',
    category: 'numeric',
    run() {
      // without it the image at 7 kHz stays within 3 dB of the baseband;
      // with it the windowed-sinc stopband buries it below −50 dB
      const withF = compute(BASE).observables.imgFsDb;
      const without = compute({ ...BASE, digFilter: false }).observables.imgFsDb;
      return {
        ok: withF < -50 && without > -3,
        detail: `with=${withF.toFixed(1)} dB, without=${without.toFixed(1)} dB`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'spectrum'),
];
