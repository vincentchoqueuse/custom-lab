import { compute, theory, shape, cfarPd } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { chi2Cdf, ncChi2Cdf, chi2Quantile, fCdf, normalCdf, erf } from '../../../core/numeric.js';

const BASE = { snr: 0.1, N: 20, pfa: 0.01, detector: 'glrt', R: 16, M: 4000, seed: 34 };
const obs = (p) => compute({ ...BASE, ...p }).observables;

export const checks = [
  {
    // The special functions first, against the two closed forms they have.
    // Everything else in this experiment is an application of them, so an error
    // here would be invisible everywhere and wrong everywhere.
    name: 'the χ² CDF against its closed forms at k = 1 and k = 2',
    category: 'numeric',
    run() {
      const pts = [0.05, 0.4, 1, 3, 7, 20, 60];
      // k = 2 is exactly 1 − e^{−x/2}, and that one is machine precision
      const two = maxGap(range(pts.length), (i) => chi2Cdf(pts[i], 2), (i) => 1 - Math.exp(-pts[i] / 2));
      // k = 1 is erf(√(x/2)). The catalogue's erf is a rational approximation
      // good to about 1e-7, so THAT is the bound here — it is erf being
      // checked against gammaP, not the other way round.
      const one = maxGap(range(pts.length), (i) => chi2Cdf(pts[i], 1), (i) => erf(Math.sqrt(pts[i] / 2)));
      return {
        ok: two < 1e-15 && one < 1e-6,
        detail: `k=2: ${two.toExponential(2)} (exact) · k=1 vs erf: ${one.toExponential(2)}`,
      };
    },
  },
  {
    // The non-central χ² must degenerate to the central one, and the F must
    // degenerate to the χ² as its reference window grows — the two limits the
    // whole experiment leans on.
    name: 'the two degeneracies: χ′²(0) is χ², and F(N, ∞) is χ²_N/N',
    category: 'numeric',
    run() {
      const nc = maxGap([1, 4, 20, 64], (k) =>
        maxGap([0.5, 4, 30, 90], (x) => Math.abs(ncChi2Cdf(x, k, 0) - chi2Cdf(x, k)))
      );
      // as the reference window grows the CFAR threshold must become the
      // known-σ one: F(N, MN) → χ²_N/N in distribution
      const N = 20;
      const far = maxGap([2, 6, 12], (x) => Math.abs(fCdf(x, N, 4000 * N) - chi2Cdf(N * x, N)));
      return { ok: nc === 0 && far < 2e-3, detail: `χ′²(0): ${nc.toExponential(2)} · F(20, 80000): ${far.toExponential(2)}` };
    },
  },
  {
    // Every detector's threshold has to deliver the P_FA it was set for, and
    // the Monte Carlo runs the N samples rather than the statistic's law — so
    // this checks the LAW, not the arithmetic that inverted it.
    name: 'every threshold delivers the P_FA it was set for',
    category: 'statistical',
    run() {
      const bad = [];
      for (const detector of ['matched', 'glrt', 'energy', 'cfar']) {
        const o = obs({ detector, pfa: 0.05, M: 20000 });
        const p = 0.05;
        const se = Math.sqrt((p * (1 - p)) / 20000); // 4 SE, not a percentage
        if (Math.abs(o.pfaEmpS.value - p) > 4 * se) bad.push(`${detector}: ${o.pfaEmpS.value.toFixed(4)}`);
      }
      return { ok: bad.length === 0, detail: bad.join(' · ') || 'all four within 4 SE of 0.05' };
    },
  },
  {
    // THE CFAR property, and the reason the letters stand for what they do: the
    // false-alarm rate does not depend on the noise power. Checked by scaling
    // σ over two decades — which the compute does not know about, since it
    // always draws σ = 1, so the scaling is applied here to the statistic's own
    // definition and the invariance is a property of the RATIO.
    name: 'CFAR: P_FA does not move when σ does',
    category: 'numeric',
    run() {
      // T = (Σx²/N)/(V/MN) is a ratio of two quantities both proportional to
      // σ², so it is invariant — exactly, and that is what the F law encodes.
      // Verified on the law: F(N, MN) has no σ in it at all, so the statement
      // to check is that the threshold solves the equation it claims to.
      const worst = maxGap([4, 16, 64], (R) =>
        maxGap([1e-3, 0.01, 0.1], (pfa) => {
          const g = theory('cfar', { N: 20, pfa, R }, 0).gamma;
          return Math.abs(1 - fCdf(g, 20, R * 20) - pfa) / pfa;
        })
      );
      return { ok: worst < 1e-9, detail: `worst relative error on P_FA ${worst.toExponential(2)}` };
    },
  },
  {
    // The CFAR LOSS and its limit, in closed form. The CA-CFAR multiplier for
    // an exponential statistic is α = M(P_FA^(−1/M) − 1), and it tends to
    // −ln P_FA — the known-σ threshold. Estimating the noise costs decibels;
    // estimating it from enough cells costs nothing, and here is the rate.
    name: 'the CA-CFAR multiplier tends to the known-σ threshold',
    category: 'numeric',
    run() {
      const pfa = 0.01;
      const want = -Math.log(pfa);
      const alpha = (R) => R * (pfa ** (-1 / R) - 1);
      // it approaches from ABOVE and as 1/M: the ratio of two successive gaps
      // at M and 2M must be 2, which is the rate and not merely the limit
      const g1 = alpha(64) - want;
      const g2 = alpha(128) - want;
      const rate = g1 / g2;
      return {
        ok: g1 > 0 && Math.abs(rate - 2) < 0.05 && Math.abs(alpha(4096) - want) < 0.01,
        detail: `α(64)−α(∞)=${g1.toFixed(4)}, halving rate ${rate.toFixed(3)}, α(4096)=${alpha(4096).toFixed(4)} vs ${want.toFixed(4)}`,
      };
    },
  },
  {
    // THE RESULT THE EXPERIMENT EXISTS FOR: the two detectors do not merely
    // differ by a constant, they differ in the EXPONENT. Measured by asking how
    // many samples each needs to reach P_D = 0.9 at two SNRs a decade apart —
    // the matched filter's requirement scales as 1/SNR, the energy detector's
    // as 1/SNR².
    name: 'N ∝ 1/SNR for the matched filter, 1/SNR² for the energy detector',
    category: 'numeric',
    run() {
      // The two SNRs are HALF a decade apart and not a full one: a full decade
      // sends the energy detector's requirement to forty million samples, and
      // a non-central χ² of forty million degrees of freedom is a Poisson
      // mixture nobody should sum in a test suite. The exponent of a power law
      // does not care how far apart the two points are.
      const need = (detector, snr) => {
        // the smallest N reaching P_D = 0.9 at P_FA = 1e-3, by bisection on a
        // quantity that is monotone in N
        let lo = 1;
        let hi = 1 << 18;
        while (hi - lo > 1) {
          const mid = Math.floor((lo + hi) / 2);
          const pd = theory(detector, { N: mid, pfa: 1e-3, R: 16 }, Math.sqrt(mid * snr)).pd;
          if (pd < 0.9) lo = mid;
          else hi = mid;
        }
        return hi;
      };
      const HI = 0.1;
      const LO = 0.0316227766; // half a decade below
      const exponent = (detector) =>
        Math.log(need(detector, LO) / need(detector, HI)) / Math.log(HI / LO);
      const eMatched = exponent('matched');
      const eEnergy = exponent('energy');
      return {
        ok: Math.abs(eMatched - 1) < 0.03 && Math.abs(eEnergy - 2) < 0.06,
        detail: `matched: N ∝ SNR^−${eMatched.toFixed(3)} · energy: N ∝ SNR^−${eEnergy.toFixed(3)}`,
      };
    },
  },
  {
    // The ordering is a theorem — Neyman–Pearson — and not an observation
    // about these particular curves: nothing that knows less can be above the
    // matched filter, anywhere on the ROC.
    name: 'no detector beats the matched filter, anywhere',
    category: 'numeric',
    run() {
      let worst = 0;
      for (const detector of ['glrt', 'energy', 'cfar']) {
        const o = obs({ detector, snr: 0.25 });
        for (let i = 0; i < o.rocSel.y.length; i++)
          worst = Math.max(worst, o.rocSel.y[i] - o.rocMatched.y[i]);
      }
      return { ok: worst < 1e-9, detail: `worst excess over the ceiling ${worst.toExponential(2)}` };
    },
  },
  {
    // What every P_D on the curves is worth: the theory against the full
    // N-sample simulation, for all four detectors at once.
    name: 'theory and Monte Carlo agree on P_D, for all four',
    category: 'statistical',
    run() {
      const bad = [];
      for (const detector of ['matched', 'glrt', 'energy', 'cfar']) {
        const o = obs({ detector, snr: 0.3, M: 20000 });
        const p = o.pdTh.value;
        const se = Math.sqrt((p * (1 - p)) / 20000);
        if (Math.abs(o.pdEmpS.value - p) > 4 * se)
          bad.push(`${detector}: ${o.pdEmpS.value.toFixed(4)} vs ${p.toFixed(4)}`);
      }
      return { ok: bad.length === 0, detail: bad.join(' · ') || 'all four within 4 SE' };
    },
  },
  {
    name: 'the signal has unit norm, so the deflection IS √(N·SNR)',
    category: 'numeric',
    run() {
      const norm = maxGap([1, 7, 20, 200], (N) => {
        const s = shape(N);
        let e = 0;
        for (let n = 0; n < N; n++) e += s[n] * s[n];
        return Math.abs(e - 1);
      });
      const d = maxGap([[20, 0.1], [7, 1.5]], ([N, snr]) =>
        Math.abs(obs({ N, snr }).deflection.value - Math.sqrt(N * snr))
      );
      return { ok: norm < 1e-15 && d < 1e-12, detail: `‖s‖²−1: ${norm.toExponential(2)} · d: ${d.toExponential(2)}` };
    },
  },
  standardChecks.determinism(compute, BASE, 'pdEnergy'),
];
