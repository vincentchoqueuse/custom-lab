import { compute, requiredOrder } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

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
      let worst = 0;
      for (const family of ['butter', 'cheby1', 'ellip']) {
        const { observables: o } = compute({ family, ...SPEC });
        worst = Math.max(worst, Math.abs(o.edgeDb - -1));
      }
      return { ok: worst < 1e-6, detail: `max|H(fp)+1dB|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'stopband anchor: cheby2 and ellip give exactly Amin at fa',
    category: 'numeric',
    run() {
      let worst = 0;
      for (const family of ['cheby2', 'ellip']) {
        const { observables: o } = compute({ family, ...SPEC });
        worst = Math.max(worst, Math.abs(o.attStopDb.value - 40));
      }
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
        for (const re of o.polesX) ok = ok && re < 0;
        for (const re of o.zerosX) ok = ok && re === 0;
        detail += `${family}:${o.polesX.length}p/${o.zerosX.length}z `;
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
        const ev = (p) => {
          let re = 0;
          let im = 0;
          for (const c of p) {
            const nr = -im * w + c;
            im = re * w;
            re = nr;
          }
          return Math.hypot(re, im);
        };
        return 20 * Math.log10(ev(num) / ev(den));
      };
      let worst = 0;
      for (let i = 0; i < o.response.x.length; i += 25) {
        const f = o.response.x[i];
        const db = evalDb(o.numReal, o.denReal, 2 * Math.PI * f);
        if (o.response.y[i] > -85) worst = Math.max(worst, Math.abs(db - o.response.y[i]));
      }
      return { ok: worst < 1e-6, detail: `max gap=${worst.toExponential(2)} dB` };
    },
  },
  standardChecks.determinism(compute, { family: 'ellip', ...SPEC }, 'response'),
];
