import { compute, fit } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { solveLinearSystem } from '../../../core/linalg.js';

const BASE = { a: 1.5, b: 1, sigma: 1, N: 20, spread: 3, outlier: 0, seed: 34 };
const obs = (p) => compute({ ...BASE, ...p }).observables;

export const checks = [
  {
    name: 'les résidus sont orthogonaux à x et de somme nulle',
    category: 'numeric',
    run() {
      // The two normal equations, which CHARACTERISE the least-squares
      // solution: nothing else in the model is asserted, and if these hold
      // the fit is the projection it claims to be.
      let worst = 0;
      for (const p of [{}, { outlier: 9 }, { sigma: 3, N: 7 }, { spread: 0.7, N: 150 }]) {
        const o = obs(p);
        const e = o.residuals.y;
        const x = o.residuals.x;
        let s = 0;
        let sx = 0;
        let scale = 0;
        for (let i = 0; i < e.length; i++) {
          s += e[i];
          sx += e[i] * x[i];
          scale += Math.abs(e[i]) * (1 + Math.abs(x[i]));
        }
        worst = Math.max(worst, (Math.abs(s) + Math.abs(sx)) / scale);
      }
      return { ok: worst < 1e-14, detail: `résidu relatif max ${worst.toExponential(2)}` };
    },
  },
  {
    name: 'â et b̂ résolvent les équations normales (système 2×2 indépendant)',
    category: 'numeric',
    run() {
      // Same fit, other road: build Σx, Σx², Σy, Σxy and solve the 2×2 system
      // with the core's linear solver instead of the Sxy/Sxx shortcut.
      const o = obs({});
      const x = o.residuals.x;
      const y = o.points.y;
      const n = x.length;
      let sx = 0, sxx = 0, sy = 0, sxy = 0;
      for (let i = 0; i < n; i++) {
        sx += x[i];
        sxx += x[i] * x[i];
        sy += y[i];
        sxy += x[i] * y[i];
      }
      const [aSolve, bSolve] = solveLinearSystem(
        [
          [sxx, sx],
          [sx, n],
        ],
        [sxy, sy]
      );
      const gap = Math.max(Math.abs(aSolve - o.aHat.value), Math.abs(bSolve - o.bHat.value));
      return { ok: gap < 1e-12, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'sans bruit, la droite ajustée EST la droite vraie',
    category: 'numeric',
    run() {
      const gap = maxGap([-2.4, 0, 1.5], (a) => {
        const o = obs({ a, b: -1.7, sigma: 0 });
        return Math.max(Math.abs(o.aHat.value - a), Math.abs(o.bHat.value + 1.7));
      });
      return { ok: gap < 1e-13, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'R² = 1 − SCR/SCT, et vaut 1 exactement sans bruit',
    category: 'numeric',
    run() {
      const clean = obs({ sigma: 0 }).r2.value;
      const noisy = obs({ sigma: 2 });
      // recompute R² from the observables, by its definition
      const y = noisy.points.y;
      const yb = y.reduce((s, v) => s + v, 0) / y.length;
      let sct = 0;
      for (const v of y) sct += (v - yb) ** 2;
      const again = 1 - noisy.sse.value / sct;
      return {
        ok: Math.abs(clean - 1) < 1e-13 && Math.abs(again - noisy.r2.value) < 1e-13,
        detail: `R²(σ=0) = ${clean.toFixed(12)}, R²(σ=2) = ${noisy.r2.value.toFixed(4)}`,
      };
    },
  },
  {
    name: 'Sxx, donc l\'écart-type de â, suit exactement l\'étendue des x',
    category: 'numeric',
    run() {
      // scaling the design by k multiplies Sxx by k² and divides σ/√Sxx by k:
      // the design lesson, as an exact identity rather than a slogan
      const gap = maxGap([2, 3, 5], (k) => {
        const one = obs({ spread: 1 });
        const wide = obs({ spread: k });
        return Math.abs(one.seTh.value / wide.seTh.value - k) / k;
      });
      return { ok: gap < 1e-12, detail: `écart relatif max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'un point aberrant déplace la pente de son levier exact',
    category: 'numeric',
    run() {
      // Adding δ to the last observation moves â by δ·(x_N − x̄)/Sxx — the
      // leverage formula, checked against the fit itself.
      const delta = 7;
      const base = obs({ sigma: 0 });
      const moved = obs({ sigma: 0, outlier: delta });
      const x = base.residuals.x;
      const xb = x.reduce((s, v) => s + v, 0) / x.length;
      const want = (delta * (x[x.length - 1] - xb)) / base.sxx.value;
      const got = moved.aHat.value - base.aHat.value;
      return { ok: Math.abs(got - want) < 1e-13, detail: `Δâ = ${got.toFixed(6)}, levier ${want.toFixed(6)}` };
    },
  },
  {
    name: 'la dispersion mesurée de â est celle que σ/√Sxx annonce',
    category: 'statistical',
    run() {
      // 400 repeated experiments; the standard error of a standard deviation
      // estimated on n draws is ≈ s/√(2n), so 4 of those is the tolerance
      const o = obs({ sigma: 1.4, N: 25 });
      const tol = (4 * o.seTh.value) / Math.sqrt(2 * 400);
      const gap = Math.abs(o.seEmp.value - o.seTh.value);
      return {
        ok: gap < tol,
        detail: `mesuré ${o.seEmp.value.toFixed(4)} vs théorie ${o.seTh.value.toFixed(4)} (tol ${tol.toFixed(4)})`,
      };
    },
  },
  {
    name: 'les 400 pentes sont centrées sur a : l\'estimateur est sans biais',
    category: 'statistical',
    run() {
      const o = obs({ sigma: 1.4, N: 25 });
      const m = Array.from(o.slopes).reduce((s, v) => s + v, 0) / o.slopes.length;
      const tol = (4 * o.seTh.value) / Math.sqrt(400);
      return {
        ok: Math.abs(m - BASE.a) < tol,
        detail: `moyenne des â = ${m.toFixed(4)} vs a = ${BASE.a} (tol ${tol.toFixed(4)})`,
      };
    },
  },
  {
    name: 'les segments de résidus relient bien chaque point à la droite',
    category: 'numeric',
    run() {
      // the NaN-separated bundle drawn in the first view must match the fit
      const o = obs({ sigma: 2 });
      const rx = o.residualSegments.x;
      const ry = o.residualSegments.y;
      const gap = maxGap(
        range(o.residuals.x.length),
        (i) => ry[3 * i] - ry[3 * i + 1],
        (i) => o.residuals.y[i]
      );
      const separated = range(o.residuals.x.length).every((i) => Number.isNaN(rx[3 * i + 2]));
      return { ok: gap < 1e-15 && separated, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE, sigma: 2 }, 'points'),
];
