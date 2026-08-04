import { compute, overlap, gateGate, gateExp } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';

const BASE = { sig: 'gate', ker: 'gate', a: 1, b: 1, t: 1, seed: 34 };
const obs = (p) => compute({ ...BASE, ...p }).observables;
const WIDTHS = [
  { a: 1, b: 1 },
  { a: 2, b: 0.5 },
  { a: 0.3, b: 2.4 },
  { a: 1.7, b: 1.7 },
];

export const checks = [
  {
    name: 'gate * gate is the exact trapezoid, point by point',
    category: 'numeric',
    run() {
      // base a+b, plateau |a−b|, height min(a,b) — hence a TRIANGLE when
      // a = b. Splitting the integral at the breakpoints makes this identity
      // EXACT: a blind quadrature left 4·10⁻³ on the corners.
      const gap = maxGap(WIDTHS, ({ a, b }) => {
        const o = obs({ a, b });
        return maxGap(range(o.yOut.x.length), (i) => o.yOut.y[i], (i) => gateGate(a, b, o.yOut.x[i]));
      });
      return { ok: gap < 1e-12, detail: `worst gap ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'gate * exponential is an RC charging, in closed form',
    category: 'numeric',
    run() {
      // y(t) = 1 − e^{−t/b} during the pulse, then discharge as e^{−(t−a)/b}
      const gap = maxGap(
        [
          { a: 1.5, b: 0.4 },
          { a: 0.5, b: 1.2 },
          { a: 2.5, b: 2.5 },
        ],
        ({ a, b }) => {
          const o = obs({ ker: 'exp', a, b });
          return maxGap(range(o.yOut.x.length), (i) => o.yOut.y[i], (i) => gateExp(a, b, o.yOut.x[i]));
        }
      );
      return { ok: gap < 1e-6, detail: `worst gap ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'the support widths ADD UP',
    category: 'numeric',
    run() {
      // the rule students remember, and it falls out of the calculation:
      // y is zero before 0 and after a+b, and non-zero strictly between
      const ok = WIDTHS.every(({ a, b }) => {
        const o = obs({ a, b });
        let firstNZ = Infinity;
        let lastNZ = -Infinity;
        for (let i = 0; i < o.yOut.x.length; i++) {
          if (o.yOut.y[i] > 1e-12) {
            firstNZ = Math.min(firstNZ, o.yOut.x[i]);
            lastNZ = Math.max(lastNZ, o.yOut.x[i]);
          }
        }
        const step = o.yOut.x[1] - o.yOut.x[0];
        return firstNZ > -step && firstNZ < step && Math.abs(lastNZ - (a + b)) < 2 * step;
      });
      return { ok, detail: 'y ≠ 0 exactly on ]0, a+b[' };
    },
  },
  {
    name: 'the areas MULTIPLY: ∫(x*h) = ∫x · ∫h',
    category: 'numeric',
    run() {
      const gap = maxGap(WIDTHS, ({ a, b }) => {
        const o = obs({ a, b });
        return Math.abs(o.areaY.value - o.areaX.value * o.areaH.value);
      });
      // and ∫x is indeed a for a gate, a/2 for a ramp
      const exact = maxGap(WIDTHS, ({ a, b }) =>
        Math.max(
          Math.abs(obs({ a, b }).areaX.value - a),
          Math.abs(obs({ sig: 'ramp', a, b }).areaX.value - a / 2),
          Math.abs(obs({ a, b }).areaH.value - b)
        )
      );
      return {
        ok: gap < 1e-5 && exact < 1e-12,
        detail: `product of areas to ${gap.toExponential(2)}, areas exact to ${exact.toExponential(2)}`,
      };
    },
  },
  {
    name: 'convolution COMMUTES: x * h = h * x',
    category: 'numeric',
    run() {
      // two gates with swapped widths give the same output: the trapezoid is
      // symmetric in a and b, which is not obvious from the drawing since it
      // is h, not x, that gets flipped
      const gap = maxGap(WIDTHS, ({ a, b }) => {
        const o1 = obs({ a, b });
        const o2 = obs({ a: b, b: a });
        return maxGap(range(o1.yOut.x.length), (i) => o1.yOut.y[i], (i) => o2.yOut.y[i]);
      });
      return { ok: gap < 1e-12, detail: `worst gap ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'the marked point IS the area of the drawn band',
    category: 'numeric',
    run() {
      // What the view claims: the yellow point on the curve below equals the
      // shaded area of the view above, at the same t. Two claims of different
      // natures, and they must be separated:
      //   · the marker IS y(t), exactly — it is the same number;
      //   · the DRAWN area, by contrast, is that of a polygon sampled on the
      //     display grid, which cuts the gate edges between two points. It
      //     therefore cannot be better than one grid step — exactly the error
      //     the piecewise computation avoids, and the bound is that one, not a
      //     chosen percentage.
      const step = obs({}).shade.x[1] - obs({}).shade.x[0];
      let exact = 0;
      let drawn = 0;
      for (const t of [-0.5, 0, 0.37, 1, 1.62, 2, 4.8]) {
        const o = obs({ t, a: 1.3, b: 0.8 });
        exact = Math.max(exact, Math.abs(o.marker.y[0] - o.yValue.value), Math.abs(o.marker.x[0] - t));
        let area = 0;
        for (let i = 1; i < o.shade.x.length; i++)
          area += ((o.shade.hi[i] + o.shade.hi[i - 1]) / 2) * (o.shade.x[i] - o.shade.x[i - 1]);
        drawn = Math.max(drawn, Math.abs(area - o.yValue.value));
      }
      return {
        ok: exact < 1e-12 && drawn < 2 * step,
        detail: `marker exact (${exact.toExponential(2)}), drawn area to ${drawn.toExponential(2)} < 2 steps (${(2 * step).toExponential(2)})`,
      };
    },
  },
  {
    name: 'the four regimes fall at the right instants',
    category: 'numeric',
    run() {
      // what the statline announces must match the geometry
      const a = 1.4;
      const b = 0.6;
      const want = [
        [-0.3, 'before'],
        [0.3, 'entering'],
        [1.0, 'full'],
        [1.7, 'leaving'],
        [2.5, 'after'],
      ];
      const ok = want.every(([t, key]) => obs({ a, b, t }).regime.value.startsWith(key));
      // and the plateau value is exactly min(a,b)
      const plateau = Math.abs(obs({ a, b, t: 1 }).yValue.value - Math.min(a, b));
      return { ok: ok && plateau < 1e-12, detail: `plateau = min(a,b) to ${plateau.toExponential(2)}` };
    },
  },
  {
    name: 'the piecewise integral is insensitive to the drawing grid',
    category: 'numeric',
    run() {
      // overlap() depends ONLY on the breakpoints, not on the display grid:
      // that is what makes it exact on gates. Verified by changing the number of
      // panels… which cannot be done from outside — so the equivalent invariant
      // is verified instead: two t infinitely close to a breakpoint give the
      // same value on either side when y is continuous.
      const gap = maxGap([0.5, 1, 2.2], (a) => {
        const x = { f: (u) => (u >= 0 && u <= a ? 1 : 0), edges: [0, a] };
        const h = { f: (u) => (u >= 0 && u <= 1 ? 1 : 0), edges: [0, 1] };
        let worst = 0;
        for (const t of [0, a, 1, a + 1]) {
          const lo = overlap(x, h, t - 1e-9);
          const hi = overlap(x, h, t + 1e-9);
          worst = Math.max(worst, Math.abs(lo - hi));
        }
        return worst;
      });
      return { ok: gap < 1e-8, detail: `continuity at the breakpoints to ${gap.toExponential(2)}` };
    },
  },
  standardChecks.determinism(compute, BASE, 'yOut'),
];
