// The harness of the test: the identities are exact (duality with the
// confidence interval, power at δ = 0 equal to α) and the statistics carry
// derived standard errors, never magic tolerances.
import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { normalQuantile, qfunc, trapz } from '../../../core/numeric.js';

const P = (over = {}) => ({ delta: 0.5, sigma: 1, N: 20, alpha: 0.05, M: 4000, seed: 34, ...over });

export const checks = [
  {
    name: 'the shaded area IS the p: trapezoid over the tails matches 2Q(|t|)',
    category: 'numeric',
    run() {
      // the density view claims p is an area; integrate what is actually drawn
      const { observables: o } = compute(P({ seed: 7 }));
      const area = trapz(o.tailLeft.x, o.tailLeft.hi) + trapz(o.tailRight.x, o.tailRight.hi);
      // the grid stops at ±4.5, whose remaining tail is 2Q(4.5) ≈ 6.8e-6; the
      // trapezoid on 80 points adds ~1e-5 of its own — hence 1e-4, not 1e-12
      const err = Math.abs(area - o.pObs.value);
      return { ok: err < 1e-4, detail: `|area − p| = ${err.toExponential(1)}` };
    },
  },
  {
    name: 'duality with the confidence interval: p < α ⟺ μ₀ outside the CI, zero mismatches',
    category: 'numeric',
    run() {
      // the exact identity that ties this experiment to the one next door:
      // |t| > z_{α/2} is simultaneously "reject" and "0 outside x̄ ± z σ/√N"
      const alpha = 0.05;
      const zA = normalQuantile(1 - alpha / 2);
      const gauss = gaussFrom(mulberry32(3));
      let mismatches = 0;
      for (let m = 0; m < 5000; m++) {
        const t = 0.3 + gauss(); // some effect, so both verdicts occur
        const reject = 2 * qfunc(Math.abs(t)) < alpha;
        const outside = Math.abs(t) > zA; // CI excludes 0 ⟺ |x̄| > z·σ/√N
        if (reject !== outside) mismatches++;
      }
      return { ok: mismatches === 0, detail: `${mismatches} mismatches / 5000` };
    },
  },
  {
    name: 'under H₀ the p-value is uniform: mean = 1/2 within 4·SE',
    category: 'statistical',
    run() {
      // SE of the mean of M uniforms = 1/√(12M)
      const { observables: o } = compute(P({ delta: 0, M: 20000 }));
      const p = o.pValues;
      const mean = p.reduce((a, b) => a + b, 0) / p.length;
      const tol = 4 / Math.sqrt(12 * p.length);
      return { ok: Math.abs(mean - 0.5) < tol, detail: `mean=${mean.toFixed(4)} tol=${tol.toFixed(4)}` };
    },
  },
  {
    name: 'under H₀ the share below α equals α: within 4·SE of a Bernoulli(α)',
    category: 'statistical',
    run() {
      // SE = √(α(1−α)/M)
      const { observables: o } = compute(P({ delta: 0, M: 20000 }));
      const tol = 4 * Math.sqrt((0.05 * 0.95) / 20000);
      const err = Math.abs(o.fracBelow.value - 0.05);
      return { ok: err < tol, detail: `share=${o.fracBelow.value.toFixed(4)} tol=${tol.toFixed(4)}` };
    },
  },
  {
    name: 'the closed-form power at δ = 0 equals α exactly, at every N of the curve',
    category: 'numeric',
    run() {
      // Q(z_{α/2}) + Q(z_{α/2}) = α is exact mathematics; what this measures
      // is the quantile→CDF round trip, and its floor is normalQuantile's own
      // accuracy (Acklam's rational approximation, ~1e-9 on z → ~1e-7 on α).
      // Measured: 1.4e-7. The theory curve sits ON the dashed α line.
      const { observables: o } = compute(P({ delta: 0 }));
      const worst = Math.max(...[...o.powerCurve.y].map((v) => Math.abs(v - 0.05)));
      return { ok: worst < 1e-6, detail: `max|power − α| = ${worst.toExponential(1)}` };
    },
  },
  {
    name: 'measured rejection rate sits on the closed form (δ = 0.5, each N within 4·SE)',
    category: 'statistical',
    run() {
      // per Monte Carlo point: 400 Bernoulli(power) reps → SE = √(pw(1−pw)/400)
      const { observables: o } = compute(P());
      const zA = normalQuantile(1 - 0.05 / 2);
      let worstRatio = 0;
      for (let k = 0; k < o.powerMc.x.length; k++) {
        const shift = 0.5 * Math.sqrt(o.powerMc.x[k]);
        const pw = qfunc(zA - shift) + qfunc(zA + shift);
        const se = Math.sqrt(Math.max(pw * (1 - pw), 1e-9) / 400);
        worstRatio = Math.max(worstRatio, Math.abs(o.powerMc.y[k] - pw) / (4 * se));
      }
      return { ok: worstRatio < 1, detail: `worst |Δ|/4SE = ${worstRatio.toFixed(2)}` };
    },
  },
  {
    name: 'power grows with N and with |δ| — monotone wherever it is not saturated',
    category: 'numeric',
    run() {
      const { observables: o } = compute(P({ delta: 0.3 }));
      const y = o.powerCurve.y;
      let ok = true;
      for (let i = 1; i < y.length; i++) if (y[i] < y[i - 1] - 1e-12) ok = false;
      const lo = compute(P({ delta: 0.2 })).observables.powerCurve.y;
      const hi = compute(P({ delta: 0.4 })).observables.powerCurve.y;
      for (let i = 0; i < lo.length; i++) if (hi[i] < lo[i] - 1e-12) ok = false;
      return { ok, detail: 'monotone in N and in |δ|' };
    },
  },
  standardChecks.determinism(compute, P(), 'pValues'),
];
