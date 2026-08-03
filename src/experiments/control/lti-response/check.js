import { compute } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { polyEvalComplex } from '../../../core/numeric.js';
import { secondOrderPoles } from '../_lib/lti.js';

const BASE = { num: [1], den: [1, 2, 1], input: 'step', f: 0.5, seed: 34 };

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
  {
    name: 'impulse of 1/(s+1)² matches the closed form t·e^(−t)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      const t = o.impulseResponse.x;
      const worst = maxGap(
        range(t.length),
        (i) => o.impulseResponse.y[i],
        (i) => t[i] * Math.exp(-t[i])
      );
      return { ok: worst < 1e-6, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'h(t) is the derivative of the step response (any typed-in system)',
    category: 'numeric',
    run() {
      // The identity that justifies computing h as a FREE response from
      // x(0) = B rather than by feeding a tall thin pulse: y_step' = h.
      // Central differences on the 25 ms display grid, so the tolerance is
      // the O(Δt²) of the difference, not of the integrator.
      let worst = 0;
      for (const den of [
        [1, 2, 1],
        [1, 0.4, 1],
        [1, 3, 3, 1],
      ]) {
        const { observables: o } = compute({ ...BASE, den });
        const t = o.output.x;
        const dt = t[1] - t[0];
        for (let i = 1; i < t.length - 1; i++) {
          const d = (o.output.y[i + 1] - o.output.y[i - 1]) / (2 * dt);
          worst = Math.max(worst, Math.abs(d - o.impulseResponse.y[i]));
        }
      }
      return { ok: worst < 2e-3, detail: `max|y'−h|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'every returned pole and zero annihilates its own polynomial',
    category: 'numeric',
    run() {
      // The root-finder's defining identity, checked on the shapes a lecture
      // actually types: multiple real roots, a complex pair, an integrator,
      // and a numerator with roots of its own.
      const cases = [
        { num: [1], den: [1, 2, 1] }, // double root at −1
        { num: [1], den: [1, 3, 3, 1] }, // triple root at −1
        { num: [1], den: [1, 0, 1] }, // ±j, marginal
        { num: [1], den: [1, 2, 1, 0] }, // an integrator: a root at the origin
        { num: [1, 3, 2], den: [1, 4, 6, 4, 1] }, // zeros at −1 and −2
      ];
      let worst = 0;
      for (const c of cases) {
        const { observables: o } = compute({ ...BASE, ...c });
        for (const [poly, roots] of [
          [c.den, o.poles],
          [c.num, o.zeros],
        ]) {
          for (let i = 0; i < roots.x.length; i++) {
            const [re, im] = polyEvalComplex(poly, roots.x[i], roots.y[i]);
            worst = Math.max(worst, Math.hypot(re, im));
          }
        }
      }
      return { ok: worst < 1e-9, detail: `max|p(root)|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'poles agree with the second-order closed form −mω₀ ± jω₀√(1−m²)',
    category: 'numeric',
    run() {
      // Cross-check between two independent machineries: the roots found
      // numerically here, and the algebra `second-order` draws its own plane
      // from. If they ever disagree, one of the two experiments is lying.
      let worst = 0;
      for (const [m, w0] of [
        [0.3, 2],
        [0.7, 1],
        [1.4, 5],
      ]) {
        const den = [1, 2 * m * w0, w0 * w0];
        const { observables: o } = compute({ ...BASE, den });
        const want = secondOrderPoles(m, w0);
        // both lists are unordered: match each expected pole to its nearest
        for (const [wr, wi] of want) {
          let best = Infinity;
          for (let i = 0; i < o.poles.x.length; i++)
            best = Math.min(best, Math.hypot(o.poles.x[i] - wr, o.poles.y[i] - wi));
          worst = Math.max(worst, best);
        }
      }
      return { ok: worst < 1e-9, detail: `max|Δpôle|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'the right half-plane verdict follows the poles, not the simulation',
    category: 'numeric',
    run() {
      const want = [
        { den: [1, 2, 1], expect: 'stable' },
        { den: [1, -1, 1], expect: 'instable' },
        { den: [1, 0, 1], expect: 'marginalement stable' },
      ];
      const got = want.map((c) => compute({ ...BASE, den: c.den }).observables.stability.value);
      const ok = want.every((c, i) => got[i] === c.expect);
      return { ok, detail: got.join(' / ') };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'output'),
  standardChecks.determinism(compute, { ...BASE }, 'impulseResponse'),
];
