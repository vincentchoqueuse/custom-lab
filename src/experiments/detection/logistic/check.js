import { compute, logRatio, sigmoid } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { normalCdf } from '../../../core/numeric.js';

const BASE = { d: 2.5, v: 1, N: 200, prior: 0.5, lam: 1e-12, thresh: 0.5, k: 25, seed: 34 };
const obs = (p) => compute({ ...BASE, ...p }).observables;

/** The test set is 4000 points drawn from the prior, so each class holds about
 *  4000·π. An AUC estimated on n₀ negatives and n₁ positives has, by
 *  Hanley–McNeil, SE ≈ √(A(1−A)/min(n₀,n₁)) to within a factor that is below
 *  one for A above ½. Every statistical tolerance below is 4 of those. */
const aucSE = (a, nMin) => Math.sqrt((a * (1 - a)) / nMin);

export const checks = [
  {
    // THE IDENTITY THE EXPERIMENT EXISTS FOR, and it is exact.
    //
    // With Σ₀ = Σ₁ = I the analytic Neyman–Pearson statistic is affine:
    //     w = Σ⁻¹(μ₁−μ₀) = (d, 0)      b = log(π₁/π₀)
    // (the quadratic terms cancel and ‖μ₁‖² = ‖μ₀‖² by symmetry), so the
    // logistic MODEL evaluated at those coefficients must reproduce the exact
    // Bayes posterior at every point of the plane — not approximately, to the
    // last bit. If this ever fails, the claim that a classifier and a detector
    // are the same machine is false and the whole experiment goes with it.
    name: 'the bridge: σ(wᵀx+b) IS the exact Bayes posterior at v = 1',
    category: 'numeric',
    run() {
      let worst = 0;
      for (const d of [0.5, 2.5, 6]) {
        for (const prior of [0.2, 0.5, 0.8]) {
          const b = Math.log(prior / (1 - prior));
          worst = Math.max(
            worst,
            maxGap(range(11), (i) => {
              const x1 = -5 + i;
              const x2 = 2.3 - 0.4 * i;
              const model = sigmoid(b + d * x1 + 0 * x2);
              const exact = sigmoid(logRatio(x1, x2, { d, v: 1 }) + b);
              return Math.abs(model - exact);
            })
          );
        }
      }
      return { ok: worst < 1e-15, detail: `max |σ(wᵀx+b) − P(H₁|x)| = ${worst.toExponential(2)}` };
    },
  },
  {
    // Newton has to reach a stationary point of the penalized cross-entropy —
    // this is the optimality condition itself, not a proxy for it.
    name: 'IRLS converges to ∇ = 0 (the KKT condition)',
    category: 'numeric',
    run() {
      const worst = Math.max(
        ...[
          { v: 1 },
          { v: 2.5 },
          { prior: 0.15, N: 400 },
          { lam: 1, d: 1 },
          { d: 5, N: 600 },
        ].map((p) => obs({ ...p, k: 40 }).gradOut.value)
      );
      return { ok: worst < 1e-8, detail: `max ‖∇‖ over five settings = ${worst.toExponential(2)}` };
    },
  },
  {
    // The clairvoyant detector's AUC has a closed form for two equal-covariance
    // Gaussians: Φ(d′/√2), with d′ = ‖μ₁−μ₀‖ = d here. This checks the ROC
    // machinery — the sort, the tie handling, the rank sum — against analysis,
    // and it is the number the room is told to verify in scene 1.
    name: 'clairvoyant AUC = Φ(d/√2) at v = 1',
    category: 'statistical',
    run() {
      const bad = [];
      for (const d of [1, 2.5, 4]) {
        const o = obs({ d });
        const a = o.aucBayes.value;
        const theory = normalCdf(d / Math.SQRT2);
        // ~2000 points per class at π₁ = ½
        if (Math.abs(a - theory) > 4 * aucSE(theory, 2000))
          bad.push(`d=${d}: ${a.toFixed(4)} vs ${theory.toFixed(4)}`);
      }
      return { ok: bad.length === 0, detail: bad.join(' · ') || 'three separations within 4 SE' };
    },
  },
  {
    // NEYMAN–PEARSON, AS AN INEQUALITY. The likelihood-ratio test maximizes P_D
    // at every P_FA, so its ROC dominates any other test's pointwise and its
    // AUC cannot be beaten. A learned detector may equal it, never exceed it.
    //
    // Both AUCs are measured on the SAME 4000 points, so the difference is far
    // less variable than either term; the slack below is one SE of a single
    // AUC, which is already generous for their difference.
    name: 'no learned detector beats the clairvoyant LRT (NP lemma)',
    category: 'statistical',
    run() {
      const bad = [];
      let worst = -1;
      for (const d of [1, 2.5, 5])
        for (const v of [1, 1.8, 3])
          for (const N of [40, 200, 800]) {
            const o = obs({ d, v, N });
            const excess = o.aucLearned.value - o.aucBayes.value;
            if (excess > worst) worst = excess;
            if (excess > aucSE(o.aucBayes.value, 1800))
              bad.push(`d=${d} v=${v} N=${N}: +${excess.toFixed(4)}`);
          }
      return {
        ok: bad.length === 0,
        detail: bad.join(' · ') || `27 settings, worst excess ${worst.toExponential(2)}`,
      };
    },
  },
  {
    // THE EXPERIMENT'S OWN CLAIM, asserted rather than narrated: the gap closes
    // with data when the model is well specified, and does NOT when it is not.
    // Averaged over eight seeds, because a single draw of 40 points is noisy
    // enough to invert either statement.
    name: 'the AUC gap closes with N at v = 1, and does not at v = 2.5',
    category: 'statistical',
    run() {
      const gap = (v, N) => {
        let s = 0;
        for (let seed = 1; seed <= 8; seed++) {
          const o = obs({ v, N, seed });
          s += o.aucBayes.value - o.aucLearned.value;
        }
        return s / 8;
      };
      const wellSmall = gap(1, 40);
      const wellBig = gap(1, 800);
      const badSmall = gap(2.5, 40);
      const badBig = gap(2.5, 800);
      // well specified: the gap shrinks by at least half; misspecified: it
      // survives, and stays an order of magnitude above the well-specified one
      const ok = wellBig < wellSmall / 2 && badBig > 0.6 * badSmall && badBig > 10 * wellBig;
      return {
        ok,
        detail:
          `v=1: ${wellSmall.toFixed(4)} → ${wellBig.toFixed(4)} · ` +
          `v=2.5: ${badSmall.toFixed(4)} → ${badBig.toFixed(4)}`,
      };
    },
  },
  {
    // The separable pathology, asserted as a FACT rather than avoided: with a
    // vanishing penalty the cost goes to zero while ‖w‖ keeps climbing, which
    // is what "the supremum is not attained" looks like in arithmetic. The
    // curve flattens near iteration 30 because the margins overflow σ, so the
    // growth is measured over the range where the arithmetic is still exact.
    name: 'separable data, λ→0: the cost reaches 0 and ‖w‖ does not settle',
    category: 'numeric',
    run() {
      const o = obs({ d: 8, N: 30, lam: 1e-12, k: 30 });
      const w = o.wPath.y;
      const nll = o.nllPath.y;
      const grew = w[20] > 4 * w[5] && w[10] > 2 * w[5];
      const cheap = nll[20] < 1e-8;
      const separated = o.separated.value.startsWith('training set separated');
      return {
        ok: grew && cheap && separated,
        detail: `‖w‖ 5→10→20: ${w[5].toFixed(2)}→${w[10].toFixed(2)}→${w[20].toFixed(2)} · NLL(20)=${nll[20].toExponential(1)}`,
      };
    },
  },
  {
    // And the cure, exactly: a strictly convex coercive objective has one
    // finite minimum, so Newton stops moving at all — to the last digit.
    name: 'the same data with λ = 1: ‖w‖ converges to a finite optimum',
    category: 'numeric',
    run() {
      const o = obs({ d: 8, N: 30, lam: 1, k: 60 });
      const w = o.wPath.y;
      const drift = Math.abs(w[60] - w[40]);
      return {
        ok: drift < 1e-12 && o.gradOut.value < 1e-10,
        detail: `‖w‖ = ${w[60].toFixed(6)}, |Δ| over 20 iterations = ${drift.toExponential(2)}`,
      };
    },
  },
  {
    // CALIBRATION, and its decay — and the statistic is chosen so that the two
    // are separable at all.
    //
    // Each of the fourteen bins holds 4000/14 ≈ 285 test points, so a single
    // observed fraction carries SE = √(p(1−p)/285) ≈ 0.030, and the WORST of
    // fourteen such draws lands near 0.05 on a perfectly calibrated model. That
    // noise floor is the same size as the effect, which is why the deviation is
    // averaged SIGNED over eight seeds before anything is compared: binomial
    // noise falls as 1/√8, a misspecification bias does not move at all. The
    // residual floor is then 0.030/√8 ≈ 0.011 per bin.
    //
    // The assertion is monotonicity, which is the real claim — the further the
    // true log-ratio is from affine, the worse the model's own probabilities.
    name: 'calibration decays monotonically as the model leaves its own assumption',
    category: 'statistical',
    run() {
      const SEEDS = 8;
      const dev = (v) => {
        const acc = new Float64Array(14);
        for (let seed = 1; seed <= SEEDS; seed++) {
          const o = obs({ v, N: 1000, seed });
          for (let i = 0; i < 14; i++) acc[i] += (o.calibration.y[i] - o.calPred.y[i]) / SEEDS;
        }
        return Math.sqrt(acc.reduce((a, b) => a + b * b, 0) / 14);
      };
      const vs = [1, 1.5, 2, 2.5, 3];
      const d = vs.map(dev);
      const floor = Math.sqrt(0.25 / (4000 / 14) / SEEDS);
      const monotone = d.every((x, i) => i === 0 || x > d[i - 1]);
      return {
        ok: monotone && d[0] < 1.5 * floor && d[4] > 5 * d[0],
        detail:
          vs.map((v, i) => `v=${v}: ${d[i].toFixed(4)}`).join(' · ') +
          ` (noise floor ${floor.toFixed(4)})`,
      };
    },
  },
  {
    // The prior is not supplied to the fit — it is in the labels, and the
    // intercept has to find it. At large N the learned threshold on the score
    // must sit where the analytic one does: b = log(π₁/π₀) once the slope is
    // right, so the score at which the posterior crosses ½ tracks the prior.
    name: 'the intercept recovers log(π₁/π₀) from the labels alone',
    category: 'statistical',
    run() {
      const bad = [];
      for (const prior of [0.2, 0.5, 0.8]) {
        // average the crossing over six draws: the intercept of a single fit of
        // 2000 points has SE ≈ 1/√(N·π₀π₁) ≈ 0.06 at π = 0.2
        let s = 0;
        for (let seed = 1; seed <= 6; seed++) {
          s += obs({ prior, N: 2000, d: 2.5, seed, k: 40 }).intercept.value;
        }
        const bHat = s / 6;
        const truth = Math.log(prior / (1 - prior));
        if (Math.abs(bHat - truth) > 4 * 0.06) bad.push(`π₁=${prior}: ${bHat.toFixed(3)} vs ${truth.toFixed(3)}`);
      }
      return { ok: bad.length === 0, detail: bad.join(' · ') || 'three priors recovered within 4 SE' };
    },
  },
  standardChecks.determinism(compute, { ...BASE, v: 1.6, N: 300, seed: 7 }, 'rocLearned'),
];
