// The harness of the locus: everything here is a CLOSED FORM of the three
// teaching plants, so the sweep, the root finder and the loop closing are
// compared to algebra rather than to themselves.
import { compute } from './compute.js';
import { standardChecks, maxAbsDiff } from '../../../core/checks.js';
import { polyRoots } from '../_lib/lti.js';
import { simulate } from '../_lib/sim.js';

const P = (over = {}) => ({ sys: 'triple', K: 1, z: 2, ...over });

export const checks = [
  {
    name: 'double plant: breakaway at K = 1 is a double pole at −1',
    category: 'numeric',
    run() {
      // s² + 2s + 1 = (s+1)² — Durand–Kerner floors at ε^(1/2) on a double
      // root, so the tolerance is 1e-6, not 1e-12 (documented in _lib/lti.js)
      const roots = polyRoots([1, 2, 1]);
      const err = Math.max(...roots.map((r) => Math.hypot(r[0] + 1, r[1])));
      return { ok: err < 1e-6, detail: `max|root+1|=${err.toExponential(1)}` };
    },
  },
  {
    name: 'triple plant: at K = 6 the poles cross at exactly ±j√2',
    category: 'numeric',
    run() {
      // s³ + 3s² + 2s + 6 = (s+3)(s² + 2): the Routh bound, hit exactly
      const roots = polyRoots([1, 3, 2, 6]);
      const cross = roots.filter((r) => Math.abs(r[1]) > 0.5);
      const err = Math.max(
        ...cross.map((r) => Math.max(Math.abs(r[0]), Math.abs(Math.abs(r[1]) - Math.SQRT2)))
      );
      return { ok: cross.length === 2 && err < 1e-9, detail: `err=${err.toExponential(1)}` };
    },
  },
  {
    name: 'zero plant: K_crit = 6/(z−3) — at z = 4, K = 6 gives ±j√8',
    category: 'numeric',
    run() {
      // s³ + 3s² + 8s + 24 = (s+3)(s² + 8)
      const roots = polyRoots([1, 3, 8, 24]);
      const cross = roots.filter((r) => Math.abs(r[1]) > 0.5);
      const err = Math.max(
        ...cross.map((r) => Math.max(Math.abs(r[0]), Math.abs(Math.abs(r[1]) - Math.sqrt(8))))
      );
      return { ok: cross.length === 2 && err < 1e-9, detail: `err=${err.toExponential(1)}` };
    },
  },
  {
    name: 'the branch sum is pinned: ΣRe = −3 and ΣIm = 0 at every K of the sweep',
    category: 'numeric',
    run() {
      // the sum of the roots is −(second coefficient), independent of K: the
      // locus centroid never moves, however far the branches travel
      const { observables: o } = compute(P());
      const { x, y } = o.branches;
      const nPts = 421; // per branch, before the NaN separator
      let worst = 0;
      for (let j = 0; j < nPts; j++) {
        let sr = 0;
        let si = 0;
        for (let b = 0; b < 3; b++) {
          sr += x[b * (nPts + 1) + j];
          si += y[b * (nPts + 1) + j];
        }
        worst = Math.max(worst, Math.abs(sr + 3), Math.abs(si));
      }
      return { ok: worst < 1e-8, detail: `max dev=${worst.toExponential(1)}` };
    },
  },
  {
    name: 'branches are paths: no jump larger than the sweep step allows',
    category: 'numeric',
    run() {
      // the nearest-assignment continuation is what makes the locus a set of
      // polylines; a mismatched permutation would show as a jump of order 1
      const { observables: o } = compute(P());
      const { x, y } = o.branches;
      let worst = 0;
      for (let i = 1; i < x.length; i++) {
        if (!Number.isFinite(x[i]) || !Number.isFinite(x[i - 1])) continue;
        worst = Math.max(worst, Math.hypot(x[i] - x[i - 1], y[i] - y[i - 1]));
      }
      return { ok: worst < 0.5, detail: `max step=${worst.toFixed(3)}` };
    },
  },
  {
    name: 'a branch ends on the zero: at K = 400, one pole sits at −z',
    category: 'numeric',
    run() {
      const { observables: o } = compute(P({ sys: 'zero', K: 400, z: 2 }));
      const d = Math.min(
        ...[...o.nowPoles.x].map((re, i) => Math.hypot(re + 2, o.nowPoles.y[i]))
      );
      return { ok: d < 0.02, detail: `dist to −z = ${d.toExponential(1)}` };
    },
  },
  {
    name: 'closed loop in time: at K = 1 (double) the step is exactly 1 − (1+t)e^(−t)',
    category: 'numeric',
    run() {
      // T(s) = 1/(s+1)² — the critically damped second order, in closed form;
      // this pins the loop closing AND the integrator through one identity
      const { t, y } = simulate([1], [1, 2, 1], () => 1, { T: 12, h: 0.004, keep: 6 });
      const ref = Float64Array.from(t, (ti) => 1 - (1 + ti) * Math.exp(-ti));
      const err = maxAbsDiff(y, ref);
      return { ok: err < 1e-6, detail: `max|Δ|=${err.toExponential(1)}` };
    },
  },
  {
    name: 'verdict crosses with Routh: stable at K = 5.9, unstable at 6.1',
    category: 'numeric',
    run() {
      const below = compute(P({ K: 5.9 })).observables.stability.value;
      const above = compute(P({ K: 6.1 })).observables.stability.value;
      return { ok: below === 'stable' && above === 'unstable', detail: `${below} / ${above}` };
    },
  },
  standardChecks.determinism(compute, P(), 'branches'),
];
