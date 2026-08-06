import { compute, ols, irls, sample } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';

const BASE = {
  a: 1.5,
  b: 1,
  sigma: 0.7,
  N: 40,
  spread: 3,
  contam: 0.05,
  shift: 12,
  pattern: 'scatter',
  method: 'huber',
  delta: 1.5,
  thr: 1.5,
  seed: 34,
};
const obs = (p) => compute({ ...BASE, ...p }).observables;

/** The exact L1 line, by enumeration: an L1 fit passes through two of the
 *  points, so the optimum is among the N(N−1)/2 lines they define. Affordable
 *  in a harness at small N, and the ground truth IRLS is compared against. */
function exactL1(x, y) {
  const n = x.length;
  const cost = (a, b) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Math.abs(y[i] - (a * x[i] + b));
    return s;
  };
  let best = { a: 0, b: 0, c: Infinity };
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const dx = x[j] - x[i];
      if (Math.abs(dx) < 1e-12) continue;
      const a = (y[j] - y[i]) / dx;
      const b = y[i] - a * x[i];
      const c = cost(a, b);
      if (c < best.c) best = { a, b, c };
    }
  return best;
}

export const checks = [
  {
    // THE claim of the first scene, and it is an equality rather than a
    // warning. â is linear in every yᵢ, so pushing the contaminated points by
    // s moves the slope by exactly s·Σ(xᵢ−x̄)/Sxx — the number the statline
    // prints. Verified as a derivative AND as the straight line the sweep view
    // draws, which is the same statement twice on purpose: one is about the
    // formula, the other is about the figure.
    name: 'one point drags least squares by EXACTLY Σ(xᵢ−x̄)/Sxx',
    category: 'numeric',
    run() {
      const worst = maxGap([0.05, 0.15, 0.3], (contam) => {
        const lever = obs({ contam, shift: 0 }).lever.value;
        // â must be affine in the offset, of that exact slope. Read on the
        // estimate itself rather than on the sweep view, which draws the gap
        // to the true LINE and is therefore V-shaped rather than affine.
        const shifts = [-8, -3, 0, 5, 11, 17];
        const a0 = obs({ contam, shift: 0 }).aOls.value;
        return maxGap(range(shifts.length), (i) => obs({ contam, shift: shifts[i] }).aOls.value, (i) => a0 + lever * shifts[i]);
      });
      return { ok: worst < 1e-12, detail: `worst deviation from the closed form ${worst.toExponential(2)}` };
    },
  },
  {
    // The two limits of Huber, and they are what make it worth teaching: it is
    // not a third method, it is a dial between the two others.
    name: 'Huber at large δ IS least squares, at small δ it IS L1',
    category: 'numeric',
    run() {
      const { x, y } = sample(BASE);
      const ref = ols(x, y);
      const big = irls(x, y, 'huber', 1e9);
      const small = irls(x, y, 'huber', 1e-6);
      const l1 = exactL1(x, y);
      const dOls = Math.abs(big.a - ref.a) + Math.abs(big.b - ref.b);
      const dL1 = Math.abs(small.a - l1.a) + Math.abs(small.b - l1.b);
      return {
        ok: dOls < 1e-12 && dL1 < 1e-3,
        detail: `δ→∞ to OLS: ${dOls.toExponential(2)} · δ→0 to L1: ${dL1.toExponential(2)}`,
      };
    },
  },
  {
    // IRLS against the combinatorial optimum. The enumeration is the
    // definition; the iteration is the implementation, and they must agree.
    name: 'IRLS finds the L1 optimum the enumeration finds',
    category: 'numeric',
    run() {
      const worst = maxGap([34, 7, 101], (seed) => {
        const { x, y } = sample({ ...BASE, N: 25, seed });
        const it = irls(x, y, 'l1');
        const ex = exactL1(x, y);
        // compare the COSTS, not the coefficients: the L1 optimum can be a
        // whole segment of lines, and two of its ends are both correct answers
        const cost = (f) => {
          let s = 0;
          for (let i = 0; i < x.length; i++) s += Math.abs(y[i] - (f.a * x[i] + f.b));
          return s;
        };
        return (cost(it) - ex.c) / ex.c;
      });
      return { ok: worst < 1e-6, detail: `worst relative excess cost ${worst.toExponential(2)}` };
    },
  },
  {
    // The CHARACTERISATION of an L1 fit: it interpolates two data points. Not a
    // property of this implementation — a property of the problem, and the
    // reason the enumeration above is exhaustive.
    name: 'the L1 line passes through two of the points',
    category: 'numeric',
    run() {
      let worst = 0;
      for (const seed of [34, 7, 101]) {
        const { x, y } = sample({ ...BASE, N: 25, seed });
        const f = irls(x, y, 'l1');
        const r = [];
        for (let i = 0; i < x.length; i++) r.push(Math.abs(y[i] - (f.a * x[i] + f.b)));
        r.sort((p, q) => p - q);
        worst = Math.max(worst, r[1]); // the SECOND smallest residual must vanish
      }
      return { ok: worst < 1e-6, detail: `second-smallest |r| = ${worst.toExponential(2)}` };
    },
  },
  {
    // What the third scene claims, measured rather than asserted: below its
    // breakdown point RANSAC returns the clean line, above it the contaminated
    // one. The 50 % figure is the largest a regression estimator can have.
    // The breakdown point is about how ORGANISED the outliers are, not how
    // many there are — which is what this check found out and what the scene
    // now teaches. Written first as "RANSAC flips above ε = 1/2", it failed:
    // at ε = 0.55 with scattered contamination the fit was still 0.04 off the
    // true line. The physics was the check's, not the code's. Twenty-two
    // points spread over eighteen units of y are not a consensus, they are
    // twenty-two consensuses of one, and eighteen clean points still win.
    // Structure the same outliers onto one parallel line and the textbook
    // cliff appears exactly where it should.
    name: 'RANSAC breaks on ORGANISED outliers, not on numerous ones',
    category: 'statistical',
    run() {
      // read on the LINE and not on the slope: outliers pushed together sit on
      // a PARALLEL line, so a slope-only reading would call that fit perfect
      const err = (o) => {
        const f = o.fitRobust;
        return Math.max(Math.abs(f.y[0] - o.truth.y[0]), Math.abs(f.y[1] - o.truth.y[1]));
      };
      const R = { method: 'ransac', shift: 15 };
      const few = obs({ ...R, contam: 0.3, pattern: 'scatter' });
      const many = obs({ ...R, contam: 0.55, pattern: 'scatter' });
      const organised = obs({ ...R, contam: 0.55, pattern: 'block' });
      // the clean points still carry σ = 0.7 of noise: 4σ on a fitted endpoint
      // is generous, and it is a derived bound rather than a chosen percentage
      const tol = 4 * 0.7;
      return {
        ok: err(few) < tol && err(many) < tol && err(organised) > 3 * tol,
        detail:
          `scattered ε=0.30 → ${err(few).toFixed(2)} · scattered ε=0.55 → ${err(many).toFixed(2)} ` +
          `(both < ${tol.toFixed(2)}) · organised ε=0.55 → ${err(organised).toFixed(2)}`,
      };
    },
  },
  {
    // The other half of the deal, and the scene that keeps the lecture honest:
    // on CLEAN data the robust fit must not cost much. Asymptotic relative
    // efficiency of L1 on Gaussian noise is 2/π ≈ 0.637, so its slope should
    // scatter about 1/√0.637 = 1.25 times wider than the least-squares one.
    name: 'on clean data L1 scatters ≈ 1/√(2/π) wider than least squares',
    category: 'statistical',
    run() {
      const M = 200;
      let vOls = 0;
      let vL1 = 0;
      for (let m = 0; m < M; m++) {
        const { x, y } = sample({ ...BASE, contam: 0, shift: 0, N: 60, seed: 1000 + m });
        vOls += (ols(x, y).a - 1.5) ** 2 / M;
        vL1 += (irls(x, y, 'l1').a - 1.5) ** 2 / M;
      }
      const ratio = Math.sqrt(vL1 / vOls);
      const want = 1 / Math.sqrt(2 / Math.PI); // 1.2533
      // the ratio of two sample variances over M draws has relative spread
      // √(2/M) each, so ~2·√(2/M) on their square root: 0.10 at M = 200
      return {
        ok: Math.abs(ratio - want) < 0.16,
        detail: `measured ${ratio.toFixed(3)} vs 1/√(2/π) = ${want.toFixed(3)}`,
      };
    },
  },
  {
    name: 'no contamination, no disagreement',
    category: 'numeric',
    run() {
      // with ε = 0 and a Huber δ well above the noise every weight is 1, so
      // Huber is not merely close to least squares — it IS it
      const { x, y } = sample({ ...BASE, contam: 0, shift: 0 });
      const ref = ols(x, y);
      const hub = irls(x, y, 'huber', 50);
      const gap = Math.abs(hub.a - ref.a) + Math.abs(hub.b - ref.b);
      return { ok: gap < 1e-12, detail: `gap ${gap.toExponential(2)}` };
    },
  },
  standardChecks.determinism(compute, BASE, 'fitRobust'),
];
