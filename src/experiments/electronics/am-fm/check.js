import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

// fc = 1000 Hz and fm = 62.5 Hz are integer cycle counts over the record
// (1024 and 64), so spectral lines sit exactly on bins and the power
// identities hold to machine precision.
const AM = { mode: 'am', fm: 62.5, ka: 0.6, beta: 1, seed: 1 };
const FM = { mode: 'fm', fm: 62.5, ka: 0.5, beta: 1, seed: 1 };

/** Spectrum level (dB) at the bin closest to frequency f. */
function levelAt(o, f) {
  let best = 0;
  for (let i = 1; i < o.spectrum.x.length; i++) {
    if (Math.abs(o.spectrum.x[i] - f) < Math.abs(o.spectrum.x[best] - f)) best = i;
  }
  return o.spectrum.y[best];
}

/** J0 by the same ascending series used in compute (reference values below). */
function besselJ0(x) {
  const h = x / 2;
  let term = 1;
  let sum = 1;
  for (let k = 0; k < 40; k++) {
    term *= (-h * h) / ((k + 1) * (k + 1));
    sum += term;
  }
  return sum;
}

export const checks = [
  {
    name: 'AM sidebands sit at 20·log10(ka/2) (on-bin, exact)',
    category: 'numeric',
    run() {
      const { observables: o } = compute(AM);
      const th = 20 * Math.log10(AM.ka / 2);
      const lo = levelAt(o, 1000 - 62.5);
      const hi = levelAt(o, 1000 + 62.5);
      const worst = Math.max(Math.abs(lo - th), Math.abs(hi - th));
      return { ok: worst < 0.01, detail: `${lo.toFixed(3)}/${hi.toFixed(3)} dB vs ${th.toFixed(3)}` };
    },
  },
  {
    name: 'AM power identity: mean s² = (1 + ka²/2)/2 (exact, integer cycles)',
    category: 'numeric',
    run() {
      const { observables: o } = compute(AM);
      const th = (1 + AM.ka ** 2 / 2) / 2;
      const gap = Math.abs(o.meanPow - th);
      return { ok: gap < 1e-12, detail: `gap=${gap.toExponential(2)}` };
    },
  },
  {
    name: 'FM carrier level = 20·log10|J0(β)| at β = 1',
    category: 'numeric',
    run() {
      const { observables: o } = compute(FM);
      const th = 20 * Math.log10(Math.abs(besselJ0(1))); // J0(1) = 0.765198…
      const gap = Math.abs(o.carrierDb - th);
      return { ok: gap < 0.05, detail: `${o.carrierDb.toFixed(3)} dB vs ${th.toFixed(3)}` };
    },
  },
  {
    name: 'FM carrier extinction at the first zero of J0 (β = 2.40483)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...FM, beta: 2.40483 });
      return { ok: o.carrierDb < -50, detail: `carrier=${o.carrierDb.toFixed(1)} dB` };
    },
  },
  {
    name: 'FM power invariance: mean s² = 1/2 (constant envelope, exact)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...FM, beta: 3.7 });
      const gap = Math.abs(o.meanPow - 0.5);
      return { ok: gap < 1e-12, detail: `gap=${gap.toExponential(2)}` };
    },
  },
  {
    name: "Carson's rule brackets the measured 98% bandwidth (β = 5)",
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...FM, beta: 5 });
      const ratio = o.b98m.value / o.carson.value;
      // Carson ≈ the 98%-power bandwidth: the measured value must land close
      return { ok: ratio > 0.7 && ratio < 1.15, detail: `B98=${o.b98m.value.toFixed(0)} Hz, Carson=${o.carson.value.toFixed(0)} Hz (ratio ${ratio.toFixed(2)})` };
    },
  },
  standardChecks.determinism(compute, AM, 'spectrum'),
];
