// The harness of the epicycles: every contour was chosen to have EXACT
// coefficients, so the FFT, the ordering and the chain are compared to hand
// algebra — c_k of a trig polynomial below N/2 carries no aliasing at all.
import { compute } from './compute.js';
import { standardChecks, maxAbsDiff } from '../../../core/checks.js';

const P = (over = {}) => ({ shape: 'heart', K: 8, tau: 0.35, sort: 'mag', ...over });

/** |c_k| read off the spectrum view (k ∈ [−24, 24]). */
const magOf = (o, k) => o.spectrum.y[k + 24];

export const checks = [
  {
    name: 'the star is exactly three circles: c₁ = 0.85, c₆ = c₋₄ = 0.1275, rest < 1e-12',
    category: 'numeric',
    run() {
      // r(θ) = 0.85(1 + 0.3cos5θ): r·e^{iθ} = 0.85e^{iθ} + 0.1275(e^{i6θ} + e^{−i4θ})
      const { observables: o } = compute(P({ shape: 'star', K: 3 }));
      const err = Math.max(
        Math.abs(magOf(o, 1) - 0.85),
        Math.abs(magOf(o, 6) - 0.1275),
        Math.abs(magOf(o, -4) - 0.1275)
      );
      let rest = 0;
      for (let k = -24; k <= 24; k++)
        if (k !== 1 && k !== 6 && k !== -4 && k !== 0) rest = Math.max(rest, magOf(o, k));
      return {
        ok: err < 1e-12 && rest < 1e-12,
        detail: `|Δc|=${err.toExponential(1)}, rest=${rest.toExponential(1)}`,
      };
    },
  },
  {
    name: 'and at K = 3 it is drawn exactly: RMS distance and energy at their walls',
    category: 'numeric',
    run() {
      const { observables: o } = compute(P({ shape: 'star', K: 3, tau: 1 }));
      return {
        ok: o.rmsError.value < 1e-12 && Math.abs(o.captured.value - 100) < 1e-9,
        detail: `rms=${o.rmsError.value.toExponential(1)}, energy=${o.captured.value.toFixed(6)}%`,
      };
    },
  },
  {
    name: 'the heart has eight coefficients, at the hand-derived values',
    category: 'numeric',
    run() {
      // z = (12sinθ − 4sin3θ)/17 + i(13cosθ − 5cos2θ − 2cos3θ − cos4θ)/17:
      // |c₁| = 0.5/17, |c₋₁| = 12.5/17, |c±₂| = 2.5/17, |c₃| = 1/17,
      // |c₋₃| = 3/17, |c±₄| = 0.5/17 — and nothing anywhere else
      const { observables: o } = compute(P());
      const want = [
        [1, 0.5],
        [-1, 12.5],
        [2, 2.5],
        [-2, 2.5],
        [3, 1],
        [-3, 3],
        [4, 0.5],
        [-4, 0.5],
      ];
      let err = 0;
      for (const [k, v] of want) err = Math.max(err, Math.abs(magOf(o, k) - v / 17));
      let rest = 0;
      for (let k = -24; k <= 24; k++)
        if (Math.abs(k) > 4) rest = Math.max(rest, magOf(o, k));
      return {
        ok: err < 1e-12 && rest < 1e-12,
        detail: `|Δc|=${err.toExponential(1)}, rest=${rest.toExponential(1)}`,
      };
    },
  },
  {
    name: 'the square obeys its selection rule: c_k = 0 unless k ≡ 1 (mod 4)',
    category: 'numeric',
    run() {
      // z(t + 1/4) = i·z(t) — a symmetry of the parametrized tour, so it holds
      // in floating point, not asymptotically
      const { observables: o } = compute(P({ shape: 'square' }));
      let forbidden = 0;
      let allowed = 0;
      for (let k = -24; k <= 24; k++) {
        if (k === 0) continue;
        if (((k % 4) + 4) % 4 === 1) allowed = Math.max(allowed, magOf(o, k));
        else forbidden = Math.max(forbidden, magOf(o, k));
      }
      return {
        ok: forbidden < 1e-13 && allowed > 0.1,
        detail: `forbidden<${forbidden.toExponential(1)}, c₁=${allowed.toFixed(3)}`,
      };
    },
  },
  {
    name: 'square decay: k²·|c_k| is pinned to its k = 1 value across the spectrum',
    category: 'numeric',
    run() {
      // uniform-speed corners are C⁰ kinks → the CONTINUOUS coefficients obey
      // |c_k| = |c₁|/k² exactly on the allowed frequencies (the square wave's
      // 1/k, integrated once). The compute holds the DFT of 1024 samples, not
      // the integral, and the two differ by O((k/N)²): measured 1.6e-3 at
      // k = 21 — that gap is the discretization, not the law.
      const { observables: o } = compute(P({ shape: 'square' }));
      const c1 = magOf(o, 1);
      let worst = 0;
      for (const k of [5, 9, 13, 17, 21, -3, -7, -11])
        worst = Math.max(worst, Math.abs(magOf(o, k) * k * k - c1));
      return { ok: worst < 5e-3, detail: `max|k²c_k − c₁| = ${worst.toExponential(1)}` };
    },
  },
  {
    name: 'the pen is the arm is the trace: three constructions, one point',
    category: 'numeric',
    run() {
      const { observables: o } = compute(P({ shape: 'heart', K: 5, tau: 0.617 }));
      const ax = o.arm.x[o.arm.x.length - 1];
      const ay = o.arm.y[o.arm.y.length - 1];
      const tx = o.trace.x[o.trace.x.length - 1];
      const ty = o.trace.y[o.trace.y.length - 1];
      const d = Math.max(Math.hypot(ax - o.pen.x[0], ay - o.pen.y[0]), Math.hypot(tx - ax, ty - ay));
      return { ok: d < 1e-12, detail: `max gap = ${d.toExponential(1)}` };
    },
  },
  {
    name: 'greedy beats truncation: on the heart at K = 3, mag order captures more energy',
    category: 'numeric',
    run() {
      const byMag = compute(P({ K: 3, sort: 'mag' })).observables.captured.value;
      const byFreq = compute(P({ K: 3, sort: 'freq' })).observables.captured.value;
      return { ok: byMag > byFreq, detail: `${byMag.toFixed(1)}% vs ${byFreq.toFixed(1)}%` };
    },
  },
  {
    name: 'Parseval closes: kept + discarded = 100 % at K = 64 on every shape',
    category: 'numeric',
    run() {
      let worst = 0;
      for (const shape of ['heart', 'star', 'square'])
        worst = Math.max(worst, Math.abs(compute(P({ shape, K: 64 })).observables.captured.value - 100));
      // the square keeps a 1/k² tail beyond the 200-frequency candidate pool
      return { ok: worst < 0.05, detail: `max|100 − captured| = ${worst.toExponential(1)}%` };
    },
  },
  standardChecks.determinism(compute, P(), 'trace'),
];
