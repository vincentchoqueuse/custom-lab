// Bivariate Gaussian N(μ, Σ) with Σ = [[σₓ², ρσₓσᵧ], [ρσₓσᵧ, σᵧ²]]:
// N correlated realizations, exact iso-density ellipses (1σ, 2σ, 3σ) from
// the analytic 2×2 eigendecomposition, principal axes, the regression line
// E[Y|X=x], and both marginal densities.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { normalPdf } from '../../../core/numeric.js';

/**
 * @param {{mux: number, muy: number, sigmax: number, sigmay: number,
 *          rho: number, N: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ mux, muy, sigmax, sigmay, rho, N, seed }) {
  const gauss = gaussFrom(mulberry32(seed));

  // correlated pair from two independent N(0,1) draws (Cholesky of Σ)
  const xs = new Float64Array(N);
  const ys = new Float64Array(N);
  const c = Math.sqrt(1 - rho * rho);
  for (let i = 0; i < N; i++) {
    const z1 = gauss();
    const z2 = gauss();
    xs[i] = mux + sigmax * z1;
    ys[i] = muy + sigmay * (rho * z1 + c * z2);
  }

  // empirical correlation
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < N; i++) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / N;
  const my = sy / N;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < N; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  const rhoHat = sxy / Math.sqrt(sxx * syy);

  // analytic eigendecomposition of the 2×2 covariance
  const a = sigmax * sigmax;
  const b = sigmay * sigmay;
  const cov = rho * sigmax * sigmay;
  const disc = Math.sqrt((a - b) ** 2 + 4 * cov * cov);
  const l1 = (a + b + disc) / 2; // major
  const l2 = (a + b - disc) / 2; // minor
  const theta = 0.5 * Math.atan2(2 * cov, a - b); // angle of the major axis
  const u1 = [Math.cos(theta), Math.sin(theta)];
  const u2 = [-Math.sin(theta), Math.cos(theta)];
  const r1 = Math.sqrt(l1);
  const r2 = Math.sqrt(l2);

  // iso-density ellipses: μ + k(r₁cos t·u₁ + r₂sin t·u₂), level sets of the pdf
  const ellipse = (k) => {
    const np = 73;
    const ex = new Float64Array(np);
    const ey = new Float64Array(np);
    for (let i = 0; i < np; i++) {
      const t = (2 * Math.PI * i) / (np - 1);
      const p = k * r1 * Math.cos(t);
      const q = k * r2 * Math.sin(t);
      ex[i] = mux + p * u1[0] + q * u2[0];
      ey[i] = muy + p * u1[1] + q * u2[1];
    }
    return { x: ex, y: ey };
  };

  const axisSeg = (u, r) => ({
    x: Float64Array.from([mux - 3 * r * u[0], mux + 3 * r * u[0]]),
    y: Float64Array.from([muy - 3 * r * u[1], muy + 3 * r * u[1]]),
  });

  // regression line E[Y|X=x] = μᵧ + ρ(σᵧ/σₓ)(x − μₓ) across the 3σ span
  const slope = (rho * sigmay) / sigmax;
  const regLine = {
    x: Float64Array.from([mux - 3.2 * sigmax, mux + 3.2 * sigmax]),
    y: Float64Array.from([muy - 3.2 * sigmax * slope, muy + 3.2 * sigmax * slope]),
  };

  // marginal densities (they carry NO trace of ρ — a scene makes the point)
  const marginal = (mu, s) => {
    const ng = 161;
    const gx = new Float64Array(ng);
    const gy = new Float64Array(ng);
    for (let i = 0; i < ng; i++) {
      const x = mu - 4 * s + (8 * s * i) / (ng - 1);
      gx[i] = x;
      gy[i] = normalPdf(x, mu, s);
    }
    return { x: gx, y: gy };
  };

  return {
    observables: {
      samples: { x: xs, y: ys },
      ellipse1: ellipse(1),
      ellipse2: ellipse(2),
      ellipse3: ellipse(3),
      axisMajor: axisSeg(u1, r1),
      axisMinor: axisSeg(u2, r2),
      regLine,
      pdfMarginalX: marginal(mux, sigmax),
      pdfMarginalY: marginal(muy, sigmay),
      rhoHat: { value: rhoHat, meta: { label: 'ρ̂', precision: 3 } },
      covTh: { value: cov, meta: { label: 'cov(X,Y)', precision: 3 } },
    },
  };
}
