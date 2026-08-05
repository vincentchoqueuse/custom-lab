import { compute } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';

const BASE = { signal: 'gauss', fs: 300, tau: 5, seed: 1 };

export const checks = [
  {
    name: 'Poisson: DTFT of the samples = Fs·Σ X(f − k·Fs) (gaussian, exact)',
    category: 'numeric',
    run() {
      // both sums converge superfast on a gaussian, so the identity is exact
      // to machine precision — the 1/f² spectra leave a truncation residue
      // and are checked qualitatively instead
      let worst = 0;
      for (const fs of [120, 300, 600]) {
        const { observables: o } = compute({ ...BASE, fs });
        const peak = Math.max(...o.periodized.y);
        // the DTFT is sampled every 8th point of the same grid
        const stride = (o.periodized.x.length - 1) / (o.dtft.x.length - 1);
        worst = Math.max(
          worst,
          maxGap(range(o.dtft.y.length), (j) => o.dtft.y[j], (j) => o.periodized.y[j * stride]) / peak
        );
      }
      return { ok: worst < 1e-12, detail: `max relative gap=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'Poisson at f = 0: Σₙ x(nTs) = Fs·Σₖ X(k·Fs)',
    category: 'numeric',
    run() {
      // the scalar face of the same identity, on the samples actually drawn
      const { observables: o } = compute({ ...BASE, fs: 400 });
      const th = 400 * o.periodized.y[(o.periodized.y.length - 1) / 2]; // f = 0 bin
      const gap = Math.abs(o.dcSamples - th) / Math.abs(th);
      return { ok: gap < 1e-12, detail: `Σx(nTs)=${o.dcSamples.toFixed(9)} vs ${th.toFixed(9)}` };
    },
  },
  {
    name: 'bandlimited sinc: aliasing is EXACTLY zero above Fs = 1/τ',
    category: 'numeric',
    run() {
      // rect copies that do not touch: the sum equals the central copy, bit
      // for bit — Shannon as an identity, not a tolerance
      const above = maxGap([220, 300, 500, 700], (fs) =>
        compute({ ...BASE, signal: 'sinc', fs }).observables.aliasErr.value
      );
      const below = compute({ ...BASE, signal: 'sinc', fs: 150 }).observables.aliasErr.value;
      return {
        ok: above === 0 && below > 10,
        detail: `above 1/τ: ${above}%, below (150 Hz): ${below.toFixed(1)}%`,
      };
    },
  },
  {
    name: 'the sampled spectrum is Fs-periodic (that IS the theorem)',
    category: 'numeric',
    run() {
      // P(f) = P(f + Fs) at every point where both fall on the axis — the
      // defining property, checked on the gaussian where the truncated sums
      // are numerically exact
      const fs = 300;
      const { observables: o } = compute({ ...BASE, fs });
      const idx = (f) => Math.round(((f + 400) / 800) * (o.periodized.y.length - 1));
      const shift = idx(fs) - idx(0);
      const pts = range(o.periodized.y.length - shift);
      const worst = maxGap(pts, (i) => o.periodized.y[i], (i) => o.periodized.y[i + shift]);
      return {
        ok: worst / Math.max(...o.periodized.y) < 1e-12,
        detail: `max|P(f) − P(f+Fs)|=${worst.toExponential(2)}`,
      };
    },
  },
  {
    name: 'aliasing falls with Fs — monotonically, except where X has nulls',
    category: 'numeric',
    run() {
      // More samples separate the copies, so the error collapses: a factor
      // 30+ from 60 Hz to 700 Hz on every source. It is strictly monotone
      // for the gaussian, the exponential and the sinc; the TRIANGLE is not,
      // and that is physics, not numerics: its spectrum τ·sinc²(fτ) has
      // zeros at k/τ, so the overlap alternately lands on a null and on a
      // lobe. The rise stays under one point.
      let detail = '';
      let ok = true;
      for (const signal of ['gauss', 'triangle', 'expo', 'sinc']) {
        const { observables: o } = compute({ ...BASE, signal });
        const y = o.errVsFs.y;
        const rise = maxGap(range(y.length - 1, (i) => i + 1), (i) => Math.max(0, y[i] - y[i - 1]));
        const limit = signal === 'triangle' ? 1 : 1e-9;
        ok = ok && y.at(-1) < y[0] / 30 && rise <= limit;
        detail += `${signal}:${y[0].toFixed(0)}→${y.at(-1).toFixed(2)}% (+${rise.toFixed(2)}) `;
      }
      return { ok, detail: detail.trim() };
    },
  },
  standardChecks.determinism(compute, BASE, 'periodized'),
];
