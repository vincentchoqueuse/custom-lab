import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { num: [1], den: [1, 2, 1], input: 'step', f: 0.5, seed: 42 };

export const checks = [
  {
    name: 'step of 1/(s+1)² matches the closed form 1 − (1+t)e^(−t)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      let worst = 0;
      for (let i = 0; i < o.output.x.length; i++) {
        const t = o.output.x[i];
        worst = Math.max(worst, Math.abs(o.output.y[i] - (1 - (1 + t) * Math.exp(-t))));
      }
      return { ok: worst < 1e-6, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'a zero shapes the response: num = [1,1] step matches its closed form',
    category: 'numeric',
    run() {
      // H = (s+1)/(s+1)² = 1/(s+1) → step response 1 − e^(−t)
      const { observables: o } = compute({ ...BASE, num: [1, 1] });
      let worst = 0;
      for (let i = 0; i < o.output.x.length; i++) {
        const t = o.output.x[i];
        worst = Math.max(worst, Math.abs(o.output.y[i] - (1 - Math.exp(-t))));
      }
      return { ok: worst < 1e-6, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'sine steady state: measured gain and phase equal H(jω)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, input: 'sine' });
      const dg = Math.abs(o.gainMeas.value - o.gainTh.value);
      const dp = Math.abs(o.phaseMeas.value - o.phaseTh.value);
      return {
        ok: dg < 1e-3 && dp < 0.5,
        detail: `|Δgain|=${dg.toExponential(1)}, |Δphase|=${dp.toFixed(2)}°`,
      };
    },
  },
  {
    name: 'ramp lag equals the sum of time constants (unit DC gain)',
    category: 'numeric',
    run() {
      // e_∞ = lim (1−H)/s: 2 for 1/(s+1)², 3 for 1/(s+1)³, and a zero at −1
      // hands one second back (phase LEAD, literally)
      const cases = [
        { num: [1], den: [1, 2, 1], expected: 2 },
        { num: [1], den: [1, 3, 3, 1], expected: 3 },
        { num: [1, 1], den: [1, 3, 3, 1], expected: 2 },
      ];
      let worst = 0;
      for (const c of cases) {
        const { observables: o } = compute({ ...BASE, ...c, input: 'ramp' });
        worst = Math.max(
          worst,
          Math.abs(o.trackError.y[o.trackError.y.length - 1] - c.expected)
        );
      }
      return { ok: worst < 0.02, detail: `max|Δe_∞|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'broken DC gain: the ramp error grows as (1 − H(0))·t',
    category: 'numeric',
    run() {
      // H(0) = 1/2 → e(t) ~ t/2: e(20) ≈ 10, still climbing
      const { observables: o } = compute({ ...BASE, den: [1, 2, 2], input: 'ramp' });
      const n = o.trackError.y.length;
      const e20 = o.trackError.y[n - 1];
      return {
        ok: Math.abs(e20 - 10) < 0.6 && e20 > o.trackError.y[n >> 1],
        detail: `e(20 s)=${e20.toFixed(2)} ≈ 10, croissante`,
      };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'output'),
];
