import { compute, requiredOrder } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { polyEvalComplex } from '../../../core/numeric.js';

const SPEC = { fp: 1000, fstop: 2000, Amax: 1, Amin: 40, seed: 1 };

/** Passband minimum and stopband maximum read off the response grid. */
function bandLevels(o, fp, fstop) {
  let pMin = 0;
  let sMax = -999;
  for (let i = 0; i < o.response.x.length; i++) {
    const f = o.response.x[i];
    if (f <= fp) pMin = Math.min(pMin, o.response.y[i]);
    if (f >= fstop) sMax = Math.max(sMax, o.response.y[i]);
  }
  return { pMin, sMax };
}

export const checks = [
  {
    name: 'order formulas: 8 / 5 / 5 / 4 on the reference template',
    category: 'numeric',
    run() {
      const ns = ['butter', 'cheby1', 'cheby2', 'ellip'].map((family) =>
        requiredOrder({ family, ...SPEC })
      );
      return { ok: String(ns) === '8,5,5,4', detail: `n = ${ns.join('/')}` };
    },
  },
  {
    name: 'passband anchor: |H(j·ωp)| = −Amax exactly (butter, cheby1, ellip)',
    category: 'numeric',
    run() {
      const worst = maxGap(
        ['butter', 'cheby1', 'ellip'],
        (family) => compute({ family, ...SPEC }).observables.edgeDb,
        () => -1
      );
      return { ok: worst < 1e-6, detail: `max|H(fp)+1dB|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'stopband anchor: cheby2 and ellip give exactly Amin at fa',
    category: 'numeric',
    run() {
      const worst = maxGap(
        ['cheby2', 'ellip'],
        (family) => compute({ family, ...SPEC }).observables.attStopDb.value,
        () => 40
      );
      return { ok: worst < 0.05, detail: `max|att−40|=${worst.toExponential(2)} dB` };
    },
  },
  {
    name: 'DC gain: 0 dB for odd orders and all-pole evens designed so',
    category: 'numeric',
    run() {
      // butter: always 0 dB; cheby1 n=5 (odd): 0 dB; ellip n=4 (even): −Amax
      const b = compute({ family: 'butter', ...SPEC }).observables.dcDb;
      const c = compute({ family: 'cheby1', ...SPEC }).observables.dcDb;
      const e = compute({ family: 'ellip', ...SPEC }).observables.dcDb;
      const ok = Math.abs(b) < 1e-9 && Math.abs(c) < 1e-9 && Math.abs(e - -1) < 1e-9;
      return { ok, detail: `butter=${b.toExponential(1)}, cheby1=${c.toExponential(1)}, ellip=${e.toFixed(6)}` };
    },
  },
  {
    name: 'the template is respected by all four families',
    category: 'numeric',
    run() {
      // grid-resolution tolerance: 0.05 dB on a 500-point log grid
      let detail = '';
      let ok = true;
      for (const family of ['butter', 'cheby1', 'cheby2', 'ellip']) {
        const { observables: o } = compute({ family, ...SPEC });
        const { pMin, sMax } = bandLevels(o, 1000, 2000);
        ok = ok && pMin > -1 - 0.05 && sMax < -40 + 0.05;
        detail += `${family}:${pMin.toFixed(2)}/${sMax.toFixed(1)} `;
      }
      return { ok, detail: detail.trim() };
    },
  },
  {
    name: 'elliptic equiripple: both bands touch their bound',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ family: 'ellip', ...SPEC });
      const { pMin, sMax } = bandLevels(o, 1000, 2000);
      // equiripple = the response TOUCHES −Amax and −Amin (grid tolerance)
      const ok = Math.abs(pMin - -1) < 0.02 && Math.abs(sMax - -40) < 0.3;
      return { ok, detail: `passband min=${pMin.toFixed(3)}, stopband max=${sMax.toFixed(2)}` };
    },
  },
  {
    name: 'poles strictly in the left half-plane, zeros on the jω axis',
    category: 'numeric',
    run() {
      let ok = true;
      let detail = '';
      for (const family of ['butter', 'cheby1', 'cheby2', 'ellip']) {
        const { observables: o } = compute({ family, ...SPEC });
        for (const re of o.poles.x) ok = ok && re < 0;
        for (const re of o.zeros.x) ok = ok && re === 0;
        detail += `${family}:${o.poles.x.length}p/${o.zeros.x.length}z `;
      }
      return { ok, detail: detail.trim() };
    },
  },
  {
    name: 'exported coefficients rebuild the same response (denormalized)',
    category: 'numeric',
    run() {
      // evaluate numReal/denReal at s = j·2πf and compare with the response
      const { observables: o } = compute({ family: 'cheby2', ...SPEC });
      const evalDb = (num, den, w) => {
        const mag = (p) => Math.hypot(...polyEvalComplex(p, 0, w));
        return 20 * Math.log10(mag(num) / mag(den));
      };
      const sampled = range(Math.ceil(o.response.x.length / 25), (k) => k * 25).filter(
        (i) => o.response.y[i] > -85
      );
      const worst = maxGap(
        sampled,
        (i) => evalDb(o.numReal, o.denReal, 2 * Math.PI * o.response.x[i]),
        (i) => o.response.y[i]
      );
      return { ok: worst < 1e-6, detail: `max gap=${worst.toExponential(2)} dB` };
    },
  },
  standardChecks.determinism(compute, { family: 'ellip', ...SPEC }, 'response'),
];
