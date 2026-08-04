import { compute, X, targets } from './compute.js';
import { standardChecks } from '../../../core/checks.js';
import { ACTIVATIONS } from '../_lib/nn.js';

const BASE = { problem: 'xor', hidden: 2, act: 'tanh', lr: 0.5, epoch: 4000, seed: 34 };

export const checks = [
  {
    name: 'NO straight line classifies XOR — exhaustive search',
    category: 'numeric',
    run() {
      // The 1969 theorem, verified by brute force rather than taken on trust.
      // The proof does fit in two lines: classifying (0,1) and (1,0) on the
      // right side forces w₁+w₂+2b > 1, classifying (0,0) and (1,1) forces
      // w₁+w₂+2b ≤ 1. The two constraints exclude each other. The grid below
      // observes it over 68 921 lines, and the minimum error count is 1.
      const T = targets('xor');
      let best = 4;
      const g = [];
      for (let i = -20; i <= 20; i++) g.push(i / 5);
      for (const w1 of g)
        for (const w2 of g)
          for (const b of g) {
            let wrong = 0;
            for (let k = 0; k < 4; k++) {
              const y = w1 * X[k][0] + w2 * X[k][1] + b;
              if ((y > 0.5 ? 1 : 0) !== T[k]) wrong++;
            }
            if (wrong < best) best = wrong;
          }
      return {
        ok: best === 1,
        detail: `best line: ${best} point misclassified out of 4 (${g.length ** 3} lines tried)`,
      };
    },
  },
  {
    name: 'and its least-squares optimum is the constant 1/2',
    category: 'numeric',
    run() {
      // Since no line classifies, the descent converges to the best
      // APPROXIMATION — and that one is remarkable: w₁ = w₂ = 0, b = 1/2, that
      // is, "I always answer one half". The residual error is then
      // 4 × (1/2)² / (2 × 4) = 1/8, the orange line of the learning view.
      const o = compute({ ...BASE, hidden: 1, act: 'identity' }).observables;
      const outs = o.truth.value.split(' ').map((s) => parseFloat(s.split('→')[1]));
      const worst = Math.max(...outs.map((v) => Math.abs(v - 0.5)));
      return {
        ok: worst < 1e-6 && Math.abs(o.lossEnd.value - 1 / 8) < 1e-9,
        detail: `outputs within ${worst.toExponential(1)} of 1/2 · error ${o.lossEnd.value.toFixed(6)} vs 0.125`,
      };
    },
  },
  {
    name: 'OR and AND, by contrast, are separable: error well below the floor',
    category: 'numeric',
    run() {
      // The counterpoint that gives the previous check its meaning. The same
      // linear network, on the other two tables, classifies all four points.
      const bad = [];
      for (const problem of ['or', 'and']) {
        const o = compute({ ...BASE, problem, hidden: 1, act: 'identity' }).observables;
        if (o.errors.value !== 0) bad.push(`${problem}: ${o.errors.value} errors`);
        if (o.lossEnd.value > 0.05) bad.push(`${problem}: error ${o.lossEnd.value.toFixed(4)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'OR and AND: 0 errors, residual 0.031 (against 0.125 for XOR)',
      };
    },
  },
  {
    name: 'the HAND-WRITTEN solution gives the exact table',
    category: 'numeric',
    run() {
      // Two ReLU neurons suffice, and the weights can be set without learning
      // anything: y = ReLU(x₁+x₂) − 2·ReLU(x₁+x₂−1). That is "or, but not both"
      // written as two linear pieces, and it is EXACT — not accurate to 1e-3,
      // exact.
      const { f } = ACTIVATIONS.relu;
      const T = targets('xor');
      let worst = 0;
      for (let k = 0; k < 4; k++) {
        const s = X[k][0] + X[k][1];
        const y = f(s) - 2 * f(s - 1);
        worst = Math.max(worst, Math.abs(y - T[k]));
      }
      return {
        ok: worst === 0,
        detail: `max gap to the truth table: ${worst}`,
      };
    },
  },
  {
    name: 'two neurons and a tanh get there, to machine precision',
    category: 'numeric',
    run() {
      const o = compute(BASE).observables;
      return {
        ok: o.errors.value === 0 && o.lossEnd.value < 1e-12,
        detail: `error ${o.lossEnd.value.toExponential(2)} · ${o.truth.value}`,
      };
    },
  },
  {
    name: 'but the DRAW decides, and ReLU fails nine times out of ten at H = 2',
    category: 'statistical',
    run() {
      // The four numbers of scene 4, counted over 40 fixed seeds — hence
      // reproducible, despite the category. The striking fact is the last one:
      // ReLU, the default activation of the whole field, succeeds 4 times out of
      // 40 with two neurons. A neuron whose input is negative at all four points
      // has zero gradient: it is DEAD, and only one neuron is left for a problem
      // that needs two. Widening to H = 4 gives it back its chances (20/40)
      // without adding anything to the expressive power.
      const rate = (act, hidden) => {
        let ok = 0;
        for (let s = 1; s <= 40; s++)
          if (compute({ ...BASE, act, hidden, seed: s }).observables.errors.value === 0) ok++;
        return ok;
      };
      const t2 = rate('tanh', 2);
      const t4 = rate('tanh', 4);
      const r2 = rate('relu', 2);
      const r4 = rate('relu', 4);
      return {
        ok: t2 >= 30 && t4 >= 38 && r2 <= 10 && r4 > r2,
        detail: `tanh ${t2}/40 then ${t4}/40 at H = 4 · ReLU ${r2}/40 then ${r4}/40 — dead neurons`,
      };
    },
  },
  {
    name: 'the epoch really is a parameter: the error decreases along the path',
    category: 'numeric',
    run() {
      // What makes the sweep honest: the state read at epoch n really is that of
      // epoch n, not an interpolation. The check verifies that the displayed
      // error follows the curve and decreases overall.
      const at = (epoch) => compute({ ...BASE, epoch }).observables.lossNow.value;
      const v = [0, 200, 800, 4000].map(at);
      const dec = v.every((x, i) => i === 0 || x <= v[i - 1]);
      return {
        ok: dec && v[0] > 1e-2 && v[3] < 1e-12,
        detail: `epochs 0, 200, 800, 4000 → ${v.map((x) => x.toExponential(1)).join(', ')}`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'learning'),
];
