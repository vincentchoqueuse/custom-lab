import { compute } from './compute.js';
import { standardChecks, maxGap, maxAbsDiff } from '../../../core/checks.js';
import { toDb, polyEvalComplex } from '../../../core/numeric.js';

const BASE = { family: 'butter', n: 4, fc: 1000, Amax: 1, method: 'bilinear', seed: 1 };
const FS = 8000;

/** |H(e^{j2πf/Fs})| in dB from the exported b/a coefficients. */
function levelAt(o, f) {
  const th = (2 * Math.PI * f) / FS;
  // ascending-in-z⁻¹ coefficients → reverse for the descending-power Horner
  const ev = (c) => Math.hypot(...polyEvalComplex([...c].reverse(), Math.cos(-th), Math.sin(-th)));
  return toDb(ev(o.bCoefs) / ev(o.aCoefs));
}

export const checks = [
  {
    name: 'prewarped bilinear: |H(fc)| = −Amax exactly (butter and cheby1)',
    category: 'numeric',
    run() {
      const cases = ['butter', 'cheby1'].flatMap((family) =>
        [500, 1000, 3000].map((fc) => [family, fc])
      );
      const worst = maxGap(
        cases,
        ([family, fc]) => levelAt(compute({ ...BASE, family, fc }).observables, fc),
        () => -1
      );
      return { ok: worst < 1e-9, detail: `max|H(fc)+1dB|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'naive bilinear: the edge lands at (Fs/π)·atan(π·fc/Fs) exactly',
    category: 'numeric',
    run() {
      // the whole warping story in one identity: the analog edge ωa = 2πfc
      // appears at the digital frequency solving 2Fs·tan(πf/Fs) = 2πfc
      const { observables: o } = compute({ ...BASE, fc: 3000, method: 'naive' });
      const fEdge = (FS / Math.PI) * Math.atan((Math.PI * 3000) / FS);
      const gap = Math.abs(levelAt(o, fEdge) - -1);
      return { ok: gap < 1e-9, detail: `|H(${fEdge.toFixed(1)} Hz)|+1dB=${gap.toExponential(2)}` };
    },
  },
  {
    name: 'bilinear puts n zeros at z = −1: the response dives at Nyquist',
    category: 'numeric',
    run() {
      const bi = compute(BASE).observables.nyqDb;
      const ii = compute({ ...BASE, method: 'impulse' }).observables.nyqDb;
      return {
        ok: bi <= -95 && ii > -60,
        detail: `bilinear=${bi.toFixed(1)} dB vs impulse-invariance=${ii.toFixed(1)} dB`,
      };
    },
  },
  {
    name: 'stability: every digital pole strictly inside the unit circle',
    category: 'numeric',
    run() {
      const cases = ['bilinear', 'naive', 'impulse'].flatMap((method) =>
        ['butter', 'cheby1'].map((family) => [method, family])
      );
      const worst = maxGap(
        cases,
        ([method, family]) => compute({ ...BASE, family, method, n: 8, fc: 3500 }).observables.maxPole
      );
      return { ok: worst < 1, detail: `max|z_pole|=${worst.toFixed(6)}` };
    },
  },
  {
    name: 'impulse invariance: h[n] = T·h_a(nT) to machine precision',
    category: 'numeric',
    run() {
      // the defining identity, validating the whole partial-fraction assembly
      const { observables: o } = compute({ ...BASE, family: 'cheby1', n: 5, method: 'impulse' });
      const worst = maxAbsDiff(o.hImp, o.hAna);
      return { ok: worst < 1e-12, detail: `max|h[n]−T·h_a(nT)|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'impulse-invariance aliasing shrinks as the order grows',
    category: 'numeric',
    run() {
      // deviation from the analog response at 0.45·Fs: the folded tail is
      // large for the lazy n = 2 rolloff, small for n = 6
      const err = (n) => {
        const { observables: o } = compute({ ...BASE, n, method: 'impulse' });
        const i = Math.round(0.9 * (o.respDig.x.length - 1));
        return Math.abs(o.respDig.y[i] - o.respAna.y[i]);
      };
      const e2 = err(2);
      const e6 = err(6);
      return { ok: e2 > 3 * e6 && e6 >= 0, detail: `n=2: ${e2.toFixed(2)} dB, n=6: ${e6.toFixed(2)} dB` };
    },
  },
  standardChecks.determinism(compute, BASE, 'respDig'),
];
