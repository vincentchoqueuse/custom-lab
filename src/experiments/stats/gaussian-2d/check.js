import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { mux: 0.5, muy: -0.5, sigmax: 1.5, sigmay: 1, rho: 0.6, N: 1000, seed: 19 };

export const checks = [
  {
    name: 'ellipse points satisfy (p−μ)ᵀΣ⁻¹(p−μ) = k² (eigendecomposition exact)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      const { mux, muy, sigmax, sigmay, rho } = BASE;
      const a = sigmax ** 2;
      const b = sigmay ** 2;
      const cv = rho * sigmax * sigmay;
      const det = a * b - cv * cv;
      let worst = 0;
      for (const [name, k2] of [['ellipse1', 1], ['ellipse2', 4], ['ellipse3', 9]]) {
        const e = o[name];
        for (let i = 0; i < e.x.length; i++) {
          const dx = e.x[i] - mux;
          const dy = e.y[i] - muy;
          const q = (b * dx * dx - 2 * cv * dx * dy + a * dy * dy) / det;
          worst = Math.max(worst, Math.abs(q - k2));
        }
      }
      return { ok: worst < 1e-9, detail: `max|q−k²|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'regression line has slope ρσᵧ/σₓ (exact)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      const r = o.regLine;
      const slope = (r.y[1] - r.y[0]) / (r.x[1] - r.x[0]);
      const expected = (BASE.rho * BASE.sigmay) / BASE.sigmax;
      const err = Math.abs(slope - expected);
      return { ok: err < 1e-12, detail: `|Δslope|=${err.toExponential(2)}` };
    },
  },
  {
    name: 'marginal densities carry no trace of ρ',
    category: 'numeric',
    run() {
      const A = compute({ ...BASE, rho: -0.9 }).observables;
      const B = compute({ ...BASE, rho: 0.9 }).observables;
      let worst = 0;
      for (let i = 0; i < A.pdfMarginalX.y.length; i++) {
        worst = Math.max(worst, Math.abs(A.pdfMarginalX.y[i] - B.pdfMarginalX.y[i]));
        worst = Math.max(worst, Math.abs(A.pdfMarginalY.y[i] - B.pdfMarginalY.y[i]));
      }
      return { ok: worst === 0, detail: `max|Δpdf|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'empirical correlation ≈ ρ (N = 5000)',
    category: 'statistical',
    run() {
      const N = 5000;
      const { observables: o } = compute({ ...BASE, N });
      const err = Math.abs(o.rhoHat.value - BASE.rho);
      const tol = (4 * (1 - BASE.rho ** 2)) / Math.sqrt(N); // Fisher se of ρ̂
      return { ok: err < tol, detail: `|ρ̂−ρ|=${err.toFixed(4)} < ${tol.toFixed(4)}` };
    },
  },
  {
    name: '≈ 39% of the cloud falls inside the 1σ ellipse (N = 5000)',
    category: 'statistical',
    run() {
      const N = 5000;
      const { observables: o } = compute({ ...BASE, N });
      const { mux, muy, sigmax, sigmay, rho } = BASE;
      const a = sigmax ** 2;
      const b = sigmay ** 2;
      const cv = rho * sigmax * sigmay;
      const det = a * b - cv * cv;
      const s = o.samples;
      let inside = 0;
      for (let i = 0; i < N; i++) {
        const dx = s.x[i] - mux;
        const dy = s.y[i] - muy;
        if ((b * dx * dx - 2 * cv * dx * dy + a * dy * dy) / det <= 1) inside++;
      }
      // P(χ²₂ ≤ 1) = 1 − e^{−1/2} ≈ 0.3935
      const p = 1 - Math.exp(-0.5);
      const err = Math.abs(inside / N - p);
      const tol = 4 * Math.sqrt((p * (1 - p)) / N);
      return { ok: err < tol, detail: `frac=${(inside / N).toFixed(4)} vs ${p.toFixed(4)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'samples'),
];
