import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import {
  trueChannel,
  ar1Input,
  toeplitzAR1,
  eigSpread,
  quadForm,
  runAdaptive,
  posterioriError,
  msBound,
} from '../_lib/adaptive.js';

const BASE = {
  algo: 'lms',
  mu: 0.01,
  lambda: 1,
  L: 8,
  a: 0,
  snr: 20,
  n: 3000,
  track: false,
  seed: 34,
};

export const checks = [
  {
    name: 'NLMS at μ̃ = 1 cancels the a posteriori error EXACTLY',
    category: 'numeric',
    run() {
      // The identity that DEFINES NLMS, and the reason for the normalization:
      // the step size is chosen so that the updated filter explains exactly the
      // sample it has just seen. Nothing statistical in that — it is an
      // orthogonal projection, hence exact to machine precision, and at μ̃ = 2
      // the error is exactly the opposite of the a priori error (the double step
      // overshoots the target, symmetrically).
      const gauss = gaussFrom(mulberry32(7));
      const L = 6;
      let worst1 = 0;
      let worstSym = 0;
      for (let trial = 0; trial < 200; trial++) {
        const x = Float64Array.from({ length: L }, () => gauss());
        const w = Float64Array.from({ length: L }, () => gauss());
        const d = gauss();
        worst1 = Math.max(worst1, Math.abs(posterioriError({ x, d, w, mu: 1, L })));
        let y = 0;
        for (let k = 0; k < L; k++) y += w[k] * x[k];
        const ePrior = d - y;
        worstSym = Math.max(
          worstSym,
          Math.abs(posterioriError({ x, d, w, mu: 2, L }) + ePrior)
        );
      }
      return {
        ok: worst1 < 1e-12 && worstSym < 1e-12,
        detail: `μ̃=1 : |e⁺| ≤ ${worst1.toExponential(1)} · μ̃=2 : |e⁺+e| ≤ ${worstSym.toExponential(1)}`,
      };
    },
  },
  {
    name: 'RLS with no noise recovers the system in EXACTLY L iterations',
    category: 'numeric',
    run() {
      // RLS does not approximate the least-squares solution: it IS that
      // solution, at every instant. Noise-free and with L independent equations
      // the system is determined — so at iteration L the filter equals w*, up to
      // rounding error and the regularization δ.
      // Un algorithme de gradient, lui, n'y arrive jamais en temps fini.
      const L = 5;
      const N = 40;
      const gauss = gaussFrom(mulberry32(11));
      const u = ar1Input(N, 0, gauss);
      const wTrue = trueChannel(L, 0);
      const res = runAdaptive({
        algo: 'rls',
        mu: 0,
        lambda: 1,
        L,
        N,
        u,
        wTrue,
        sigmaV: 0,
        gauss: () => 0,
        keepPath: true,
        p0: 1e10, // δ = 1e-10 : « aucune information a priori », donc LS exacts
      });
      const errAt = (n) => {
        let s = 0;
        for (let k = 0; k < L; k++) s += (res.wPath[(n - 1) * L + k] - wTrue[k]) ** 2;
        return Math.sqrt(s);
      };
      // before L the system is underdetermined: the error cannot be zero
      return {
        ok: errAt(L) < 1e-6 && errAt(L - 1) > 1e-3,
        detail: `n=L−1 : ${errAt(L - 1).toExponential(1)} · n=L : ${errAt(L).toExponential(1)}`,
      };
    },
  },
  {
    name: 'the critical step is the MEAN-SQUARE one, not 2/tr(R)',
    category: 'numeric',
    run() {
      // μ < 2/tr(R) is the textbook bound: it makes the MEAN of ŵ converge, not
      // its variance. The second is what decides. The measured divergence
      // threshold (bisection over 3000 iterations) must therefore stay below
      // 2/tr(R) and stick to the root of Σ μλ/(1−μλ) = 2.
      const bad = [];
      const thr = (L, a) => {
        let lo = 1e-3;
        let hi = 2 / L;
        for (let i = 0; i < 16; i++) {
          const m = (lo + hi) / 2;
          const div = compute({ ...BASE, L, a, mu: m }).observables.state.value === '⚠ diverged';
          if (div) hi = m;
          else lo = m;
        }
        return lo;
      };
      const rows = [];
      for (const L of [4, 8, 16]) {
        const measured = thr(L, 0);
        const ms = msBound(eigSpread(toeplitzAR1(0, L), L).values);
        rows.push(`L=${L} : ${measured.toFixed(3)} vs ${ms.toFixed(3)}`);
        if (measured > 2 / L) bad.push(`L=${L} : diverge au-dessus de 2/tr(R)`);
        // 15 %: the independence assumption is the looser the smaller L is
        // (L = 4 reaches 1.12) and, very close to the threshold, the divergence
        // is so slow that 3000 iterations do not always suffice to declare it —
        // both biases pull the same way.
        if (Math.abs(measured / ms - 1) > 0.15) bad.push(`L=${L}: ${(measured / ms).toFixed(2)}× the bound`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `measured threshold vs mean-square bound — ${rows.join(' · ')}`,
      };
    },
  },
  {
    name: 'on a coloured input, the theoretical bound turns frankly optimistic',
    category: 'numeric',
    run() {
      // The corollary, and it is worth projecting: all these bounds assume the
      // regressor independent of the filter. Correlate the input and the
      // assumption breaks — the critical step size falls to less than half what
      // the theory announces. A setting "within the rules" diverges there.
      const L = 8;
      const a = 0.9;
      const ms = msBound(eigSpread(toeplitzAR1(a, L), L).values);
      let lo = 1e-3;
      let hi = 2 / L;
      for (let i = 0; i < 16; i++) {
        const m = (lo + hi) / 2;
        const div = compute({ ...BASE, L, a, mu: m }).observables.state.value === '⚠ diverged';
        if (div) hi = m;
        else lo = m;
      }
      return {
        ok: lo < 0.6 * ms,
        detail: `real threshold ${lo.toFixed(4)} against ${ms.toFixed(4)} announced (×${(ms / lo).toFixed(1)} optimism)`,
      };
    },
  },
  {
    name: 'measured misadjustment = μ·tr(R)/(2−μ·tr(R)), over three step sizes',
    category: 'statistical',
    run() {
      // The speed/accuracy trade-off law, the one scene 2 projects. Tolerance
      // at 12 %: the measurement is an ensemble average over 24 realizations and
      // 750 correlated iterations, and the theory itself assumes the regressor
      // independent of the filter. The three step sizes
      // doivent tomber dessus, pas seulement un.
      const bad = [];
      for (const mu of [0.005, 0.01, 0.02]) {
        const o = compute({ ...BASE, mu }).observables;
        const r = o.misMeas.value / o.misTheo.value;
        if (!(r > 0.88 && r < 1.12)) bad.push(`μ=${mu} : ${r.toFixed(3)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'measured/theory ∈ [0.88, 1.12] for μ = 0.005, 0.01, 0.02',
      };
    },
  },
  {
    name: 'NLMS: the misadjustment carries the L/(L−2) correction, not the asymptotic form',
    category: 'statistical',
    run() {
      // μ̃/(2−μ̃) is the ASYMPTOTIC textbook result — exact when L is large, and
      // short by a factor 2 at L = 4. The missing term is
      // E[‖x‖²]·E[1/‖x‖²] = L/(L−2) for a white Gaussian regressor. Verified here
      // from L = 4 to L = 16, where the asymptotic alone would be wrong by 98 %,
      // 32 % and 14 %; a long run (N = 60 000) gives the same ratios to within
      // 1 %, so it is not the measurement window.
      const bad = [];
      for (const L of [4, 8, 16]) {
        const o = compute({ ...BASE, algo: 'nlms', mu: 0.5, L }).observables;
        const r = o.misMeas.value / o.misTheo.value;
        const naive = o.misMeas.value / (0.5 / 1.5);
        if (!(r > 0.9 && r < 1.1)) bad.push(`L=${L}: corrected ${r.toFixed(3)}, raw ${naive.toFixed(2)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'measured/theory ∈ [0.9, 1.1] for L = 4, 8, 16',
      };
    },
  },
  {
    name: 'RLS does not suffer the conditioning, LMS suffers all of it',
    category: 'statistical',
    run() {
      // THE result of the experiment, and it is not illustrated: it is
      // measured. Colouring the input at constant power multiplies the
      // conditioning by 113 and the convergence time of LMS by 3.5; RLS does not
      // budge by one iteration.
      const lmsW = compute({ ...BASE, a: 0 }).observables;
      const lmsC = compute({ ...BASE, a: 0.9 }).observables;
      const rlsW = compute({ ...BASE, algo: 'rls', a: 0 }).observables;
      const rlsC = compute({ ...BASE, algo: 'rls', a: 0.9 }).observables;
      const slow = lmsC.n3.value / lmsW.n3.value;
      const rlsRatio = rlsC.n3.value / rlsW.n3.value;
      return {
        ok:
          lmsC.spread.value > 50 &&
          Math.abs(lmsC.spread.value - rlsC.spread.value) < 1e-9 &&
          slow > 2.5 &&
          rlsRatio < 1.5,
        detail:
          `conditionnement ${lmsC.spread.value.toFixed(0)} · LMS ${lmsW.n3.value}→${lmsC.n3.value} ` +
          `(×${slow.toFixed(1)}) · RLS ${rlsW.n3.value}→${rlsC.n3.value}`,
      };
    },
  },
  {
    name: 'the measured conditioning stays below its Szegő limit and climbs to it',
    category: 'numeric',
    run() {
      // The eigenvalues of a Toeplitz matrix are bracketed by the extremes of
      // the spectral density that generates it, and tend to them as the size
      // grows (Grenander–Szegő). For an AR(1) that gives
      // λmax/λmin ≤ ((1+a)/(1−a))², reached only in the limit: which is what
      // makes the sentence "the conditioning tends to 361" in the scene-3 notes
      // honest, where only 113 is measured.
      const a = 0.9;
      const limit = ((1 + a) / (1 - a)) ** 2;
      const s = [4, 8, 16, 32].map((L) => eigSpread(toeplitzAR1(a, L), L).spread);
      const under = s.every((v) => v < limit);
      const growing = s.every((v, i) => i === 0 || v > s[i - 1]);
      return {
        ok: under && growing && s[s.length - 1] > 0.5 * limit,
        detail: `L=4…32 : ${s.map((v) => v.toFixed(0)).join(' < ')} < ${limit.toFixed(0)}`,
      };
    },
  },
  {
    name: 'the coloured input keeps EXACTLY its power',
    category: 'statistical',
    run() {
      // The detail without which the whole of scene 3 would be an artefact: if
      // colouring the input also changed its power, the slowdown of LMS would be
      // explained by a step size become unsuitable and not by the conditioning.
      // The factor √(1−a²) is there for that — verified to 4 standard
      // deviations, SE = √(2/N) for an empirical Gaussian variance.
      const N = 200000;
      const tol = 4 * Math.sqrt(2 / N);
      const bad = [];
      for (const a of [0, 0.5, 0.9, 0.95]) {
        const u = ar1Input(N, a, gaussFrom(mulberry32(3)));
        let p = 0;
        for (let i = 0; i < N; i++) p += (u[i] * u[i]) / N;
        if (Math.abs(p - 1) > tol) bad.push(`a=${a} : ${p.toFixed(4)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `power = 1 ± ${tol.toFixed(4)} for a = 0…0.95`,
      };
    },
  },
  {
    name: 'the announced useful power really is w*ᵀRw*',
    category: 'statistical',
    run() {
      // The displayed SNR must be the true one: the power of the useful signal
      // is ‖w*‖² only on a white input, and is w*ᵀRw* in general. The exact
      // quadratic form is compared with a direct measurement.
      const L = 8;
      const a = 0.9;
      const N = 200000;
      const w = trueChannel(L, 0);
      const exact = quadForm(toeplitzAR1(a, L), w, L);
      const u = ar1Input(N, a, gaussFrom(mulberry32(5)));
      let p = 0;
      for (let n = L; n < N; n++) {
        let y = 0;
        for (let k = 0; k < L; k++) y += w[k] * u[n - k];
        p += (y * y) / (N - L);
      }
      const tol = 4 * exact * Math.sqrt(2 / (N / L)); // échantillons corrélés sur L retards
      return {
        ok: Math.abs(p - exact) < tol,
        detail: `measured ${p.toFixed(4)} vs exact ${exact.toFixed(4)} (tol ${tol.toFixed(4)})`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'learning'),
  standardChecks.determinism(compute, { ...BASE, algo: 'rls' }, 'excess'),
];
