import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { solveLinearSystem } from '../../../core/linalg.js';

/* THE MODEL, and why this experiment belongs to detection.
 *
 * Two classes in the plane. Class 0 is N(μ₀, I); class 1 is N(μ₁, Σ₁) with
 *
 *      μ₀ = (−d/2, 0)      μ₁ = (+d/2, 0)      Σ₁ = diag(v, 1/v)
 *
 * and the determinant of Σ₁ is 1 for every v, deliberately: turning v stretches
 * class 1 without making it bigger, so the log-determinant term of the ratio
 * stays zero and the ONLY thing that changes is the shape of the boundary.
 *
 * The exact log-likelihood ratio is then
 *
 *      log Λ(x) = −½[ (x₁−m₁)²/v + v·x₂² − (x₁−m₀)² − x₂² ]
 *
 * which is AFFINE in x when v = 1 and quadratic otherwise. That single fact is
 * the whole experiment: logistic regression postulates
 *
 *      P(H₁|x) = σ(β₀ + β₁x₁ + β₂x₂)
 *
 * i.e. it postulates exactly that the log-ratio is affine, and then estimates
 * the coefficients from labelled examples instead of deriving them from a known
 * model. At v = 1 the postulate is TRUE and the fit converges to the clairvoyant
 * Neyman–Pearson detector; at v ≠ 1 it is false and no amount of data repairs
 * it. Same threshold, same P_FA, same P_D, same ROC — one rung further down the
 * ladder of what is known.
 */

/** Test set size. Fixed, and large: the ROC gap this experiment measures must
 *  be a property of the two detectors, not of how many points happened to be
 *  drawn to score them. */
const NTEST = 4000;

/** Numerically safe sigmoid — the naive form overflows at |t| ≳ 750, which the
 *  separable scene reaches on purpose. */
export const sigmoid = (t) => (t >= 0 ? 1 / (1 + Math.exp(-t)) : Math.exp(t) / (1 + Math.exp(t)));

/** log(1 + eᵗ), stable at both ends: the cross-entropy is summed over every
 *  point at every iteration, so a single overflow poisons the whole curve. */
const log1pexp = (t) => (t > 0 ? t + Math.log1p(Math.exp(-t)) : Math.log1p(Math.exp(t)));

export const logit = (p) => Math.log(p / (1 - p));

/** The exact log-likelihood ratio of the model above. Used to draw the
 *  clairvoyant detector, and by the harness to prove the bridge. */
export function logRatio(x1, x2, { d, v }) {
  const m0 = -d / 2;
  const m1 = d / 2;
  const a = x1 - m1;
  const b = x1 - m0;
  return -0.5 * ((a * a) / v + v * x2 * x2 - b * b - x2 * x2);
}

/** Draw a labelled set. The LABEL is drawn from the prior rather than the class
 *  counts being fixed, because the prior is something the intercept has to
 *  LEARN — fixing the counts would hand it over. */
function drawSet(rng, n, { d, v, prior }) {
  const gauss = gaussFrom(rng);
  const x1 = new Float64Array(n);
  const x2 = new Float64Array(n);
  const y = new Uint8Array(n);
  const m0 = -d / 2;
  const m1 = d / 2;
  const sx = Math.sqrt(v);
  const sy = Math.sqrt(1 / v);
  for (let i = 0; i < n; i++) {
    const c = rng() < prior ? 1 : 0;
    y[i] = c;
    x1[i] = c ? m1 + sx * gauss() : m0 + gauss();
    x2[i] = c ? sy * gauss() : gauss();
  }
  return { x1, x2, y, n };
}

/**
 * IRLS — Newton's method on the penalized cross-entropy. Returns the WHOLE
 * path, because the iteration index is a pill: the separable scene is about
 * watching ‖w‖ leave, and a converged answer cannot show that.
 *
 * The penalty spares the intercept (`j > 0` below). Penalizing it would shrink
 * the prior towards ½, and the prior is exactly what the third scene reads off
 * the intercept.
 */
export function irls(set, lam, iters) {
  const { x1, x2, y, n } = set;
  const beta = [0, 0, 0];
  const path = [];
  const g = [0, 0, 0];
  const H = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  for (let it = 0; it <= iters; it++) {
    let nll = 0;
    for (let j = 0; j < 3; j++) {
      g[j] = 0;
      for (let k = 0; k < 3; k++) H[j][k] = 0;
    }

    for (let i = 0; i < n; i++) {
      const xi = [1, x1[i], x2[i]];
      const t = beta[0] + beta[1] * x1[i] + beta[2] * x2[i];
      const p = sigmoid(t);
      nll += log1pexp(t) - y[i] * t;
      // p(1−p) underflows to exactly 0 once a point is classified with a large
      // margin — which is the separable case. Flooring it keeps the Hessian
      // invertible, so the divergence stays OBSERVABLE instead of throwing.
      const w = Math.max(p * (1 - p), 1e-14);
      for (let j = 0; j < 3; j++) {
        g[j] += (p - y[i]) * xi[j];
        for (let k = 0; k < 3; k++) H[j][k] += w * xi[j] * xi[k];
      }
    }
    for (let j = 1; j < 3; j++) {
      nll += lam * beta[j] * beta[j];
      g[j] += 2 * lam * beta[j];
      H[j][j] += 2 * lam;
    }

    path.push({
      beta: beta.slice(),
      nll: nll / n,
      wNorm: Math.hypot(beta[1], beta[2]),
      gradNorm: Math.hypot(g[0], g[1], g[2]),
    });
    if (it === iters) break;

    // Newton: β ← β − H⁻¹g. solveLinearSystem MODIFIES its arguments, so it is
    // handed copies.
    const step = solveLinearSystem(
      H.map((r) => r.slice()),
      g.slice()
    );
    for (let j = 0; j < 3; j++) beta[j] -= step[j];
  }
  return path;
}

/**
 * The ROC of a score, and its AUC. The curve is subsampled for drawing; the
 * AUC is the EXACT Mann–Whitney statistic over every point, ties averaged —
 * a rank sum, not an integration of the drawn polyline.
 */
function roc(score, y, nDraw = 280) {
  const n = score.length;
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => score[a] - score[b]);
  let n1 = 0;
  for (let i = 0; i < n; i++) n1 += y[i];
  const n0 = n - n1;

  // tie-averaged ranks (1-based), then AUC = (R₁ − n₁(n₁+1)/2) / (n₀n₁)
  let rankSum1 = 0;
  for (let i = 0; i < n; ) {
    let j = i;
    while (j + 1 < n && score[idx[j + 1]] === score[idx[i]]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) if (y[idx[k]] === 1) rankSum1 += avg;
    i = j + 1;
  }
  const auc = n0 && n1 ? (rankSum1 - (n1 * (n1 + 1)) / 2) / (n0 * n1) : 0.5;

  // the curve: sweep the threshold from +∞ down, i.e. walk the sorted scores
  // backwards, and keep about nDraw points plus both endpoints
  const step = Math.max(1, Math.floor(n / nDraw));
  const pfa = [0];
  const pd = [0];
  let c0 = 0;
  let c1 = 0;
  for (let k = n - 1; k >= 0; k--) {
    if (y[idx[k]] === 1) c1++;
    else c0++;
    if (k % step === 0) {
      pfa.push(n0 ? c0 / n0 : 0);
      pd.push(n1 ? c1 / n1 : 0);
    }
  }
  pfa.push(1);
  pd.push(1);
  return { x: Float64Array.from(pfa), y: Float64Array.from(pd), auc };
}

/** PURE, stateless, seeded. */
export function compute(params) {
  const { d, v, N, prior, lam, thresh, k, seed } = params;

  /* ---------- the two sets ------------------------------------------------ */
  const train = drawSet(mulberry32(seed), N, params);
  // a stream of its own, so that moving N re-draws the TRAINING set and leaves
  // the ruler alone: "more data helps" is only readable against a fixed test set
  const test = drawSet(mulberry32(seed + 10007), NTEST, params);

  /* ---------- the fit ----------------------------------------------------- */
  const path = irls(train, lam, k);
  const beta = path[path.length - 1].beta;
  const wNorm = Math.hypot(beta[1], beta[2]);

  /* ---------- the two scores on the test set ------------------------------ */
  const tLearned = new Float64Array(NTEST);
  const tBayes = new Float64Array(NTEST);
  const priorOdds = Math.log(prior / (1 - prior));
  for (let i = 0; i < NTEST; i++) {
    tLearned[i] = beta[0] + beta[1] * test.x1[i] + beta[2] * test.x2[i];
    tBayes[i] = logRatio(test.x1[i], test.x2[i], params) + priorOdds;
  }

  const rLearned = roc(tLearned, test.y);
  const rBayes = roc(tBayes, test.y);

  /* ---------- error rates at the CURRENT threshold ------------------------ */
  // the same τ on both posteriors — the comparison is only honest if the two
  // detectors are asked for the same operating point
  const tStar = logit(thresh);
  let errL = 0;
  let errB = 0;
  let opFa = 0;
  let opPd = 0;
  let n0 = 0;
  let n1 = 0;
  for (let i = 0; i < NTEST; i++) {
    const dl = tLearned[i] > tStar ? 1 : 0;
    const db = tBayes[i] > tStar ? 1 : 0;
    if (dl !== test.y[i]) errL++;
    if (db !== test.y[i]) errB++;
    if (test.y[i] === 1) {
      n1++;
      opPd += dl;
    } else {
      n0++;
      opFa += dl;
    }
  }

  /* ---------- the plane --------------------------------------------------- */
  const halfX = d / 2 + 3.6 * Math.max(1, Math.sqrt(v));
  const halfY = 3.6 * Math.max(1, Math.sqrt(1 / v));
  const inWindow = (x, yy) => Math.abs(x) <= halfX && Math.abs(yy) <= halfY;

  const cloud = (set, label) => {
    const xs = [];
    const ys = [];
    for (let i = 0; i < set.n; i++)
      if (set.y[i] === label) {
        xs.push(set.x1[i]);
        ys.push(set.x2[i]);
      }
    return { x: Float64Array.from(xs), y: Float64Array.from(ys) };
  };

  // the learned boundary: β₀ + β₁x₁ + β₂x₂ = logit(τ). Swept along whichever
  // axis it is least parallel to, so a near-vertical line stays drawable.
  const NB = 220;
  const learnedX = new Float64Array(NB);
  const learnedY = new Float64Array(NB);
  const alongX = Math.abs(beta[2]) >= Math.abs(beta[1]);
  for (let i = 0; i < NB; i++) {
    const u = -1 + (2 * i) / (NB - 1);
    let px;
    let py;
    if (alongX) {
      px = u * halfX;
      py = beta[2] !== 0 ? (tStar - beta[0] - beta[1] * px) / beta[2] : NaN;
    } else {
      py = u * halfY;
      px = beta[1] !== 0 ? (tStar - beta[0] - beta[2] * py) / beta[1] : NaN;
    }
    const ok = Number.isFinite(px) && Number.isFinite(py) && inWindow(px, py);
    learnedX[i] = ok ? px : NaN;
    learnedY[i] = ok ? py : NaN;
  }

  // the Bayes boundary: log Λ(x) + log(π₁/π₀) = logit(τ). Writing c for the
  // right-hand side minus the prior odds,
  //     (v−1)·x₂² = (x₁−m₀)² − (x₁−m₁)²/v − 2c
  // which is a conic — two branches, joined by a NaN so the generic Line draws
  // them as two strokes. At v = 1 the left side vanishes and the boundary is
  // the vertical x₁ = c/d, which is the LDA line and gets its own branch here
  // rather than a division by (v−1) that would be 0/0.
  const c = tStar - priorOdds;
  const m0 = -d / 2;
  const m1 = d / 2;
  let bx;
  let by;
  if (Math.abs(v - 1) < 1e-9) {
    const x1s = d !== 0 ? c / d : NaN;
    bx = Float64Array.from([x1s, x1s]);
    by = Float64Array.from([-halfY, halfY]);
    if (!Number.isFinite(x1s) || Math.abs(x1s) > halfX) {
      bx = Float64Array.from([NaN, NaN]);
      by = Float64Array.from([NaN, NaN]);
    }
  } else {
    const xs = [];
    const ys = [];
    const push = (px, py) => {
      const ok = Number.isFinite(py) && inWindow(px, py);
      xs.push(ok ? px : NaN);
      ys.push(ok ? py : NaN);
    };
    for (const sign of [1, -1]) {
      for (let i = 0; i < NB; i++) {
        const px = -halfX + (2 * halfX * i) / (NB - 1);
        const a = px - m1;
        const b = px - m0;
        const rhs = (b * b - (a * a) / v - 2 * c) / (v - 1);
        push(px, rhs >= 0 ? sign * Math.sqrt(rhs) : NaN);
      }
      xs.push(NaN);
      ys.push(NaN);
    }
    bx = Float64Array.from(xs);
    by = Float64Array.from(ys);
  }

  /* ---------- the sigmoid, and whether it is calibrated -------------------- */
  let tMin = Infinity;
  let tMax = -Infinity;
  for (let i = 0; i < NTEST; i++) {
    if (tLearned[i] < tMin) tMin = tLearned[i];
    if (tLearned[i] > tMax) tMax = tLearned[i];
  }
  const NS = 240;
  const sigX = new Float64Array(NS);
  const sigY = new Float64Array(NS);
  for (let i = 0; i < NS; i++) {
    sigX[i] = tMin + ((tMax - tMin) * i) / (NS - 1);
    sigY[i] = sigmoid(sigX[i]);
  }

  // CALIBRATION: equal-count bins along t, and the empirical fraction of class 1
  // in each. The model says that fraction is σ(t) — true when the log-ratio
  // really is affine, and visibly false when it is not.
  const order = Array.from({ length: NTEST }, (_, i) => i).sort(
    (a, b) => tLearned[a] - tLearned[b]
  );
  const NBIN = 14;
  const calX = new Float64Array(NBIN);
  const calY = new Float64Array(NBIN);
  // What the model PREDICTS for the same bin — the mean of σ over its points,
  // not σ of the mean score. The two differ by Jensen's inequality wherever σ
  // is curved and the bin is wide, which is exactly the outer bins; the drawn
  // dot sits at (mean t, observed fraction) because that is the readable
  // picture, but the harness compares like with like.
  const calPred = new Float64Array(NBIN);
  for (let k = 0; k < NBIN; k++) {
    const lo = Math.floor((k * NTEST) / NBIN);
    const hi = Math.floor(((k + 1) * NTEST) / NBIN);
    let st = 0;
    let sy = 0;
    let sp = 0;
    for (let i = lo; i < hi; i++) {
      st += tLearned[order[i]];
      sy += test.y[order[i]];
      sp += sigmoid(tLearned[order[i]]);
    }
    calX[k] = st / (hi - lo);
    calY[k] = sy / (hi - lo);
    calPred[k] = sp / (hi - lo);
  }

  // a thin rug of the test points at 0 and 1, so the sigmoid is read against
  // the data it claims to describe rather than in the abstract
  const NRUG = 240;
  const rugX = new Float64Array(NRUG);
  const rugY = new Float64Array(NRUG);
  for (let i = 0; i < NRUG; i++) {
    const j = order[Math.floor((i * NTEST) / NRUG)];
    rugX[i] = tLearned[j];
    rugY[i] = test.y[j];
  }

  /* ---------- the path ---------------------------------------------------- */
  const it = Float64Array.from(path, (_, i) => i);
  const nllPath = Float64Array.from(path, (s) => s.nll);
  // floored for a log axis: a converged NLL is positive here, but ‖w‖ starts at
  // exactly 0 and a log scale has no room for it
  const wPath = Float64Array.from(path, (s) => Math.max(s.wNorm, 1e-3));

  /* ---------- is the training set separated by what was fitted? ----------- */
  let sep = true;
  for (let i = 0; i < N && sep; i++) {
    const t = beta[0] + beta[1] * train.x1[i] + beta[2] * train.x2[i];
    if ((t > 0 ? 1 : 0) !== train.y[i]) sep = false;
  }

  return {
    observables: {
      /* the ROC, and the gap that is the whole point */
      rocLearned: { x: rLearned.x, y: rLearned.y },
      rocBayes: { x: rBayes.x, y: rBayes.y },
      chance: { x: Float64Array.from([0, 1]), y: Float64Array.from([0, 1]) },
      opLearned: { x: Float64Array.from([n0 ? opFa / n0 : 0]), y: Float64Array.from([n1 ? opPd / n1 : 0]) },

      /* the plane */
      class0: cloud(train, 0),
      class1: cloud(train, 1),
      learnedBoundary: { x: learnedX, y: learnedY },
      bayesBoundary: { x: bx, y: by },

      /* the posterior along the learned direction */
      sigmoidCurve: { x: sigX, y: sigY },
      calibration: { x: calX, y: calY },
      // not drawn: the model's own prediction per bin, which is what
      // calibration must be judged against (see calPred above)
      calPred: { x: calX, y: calPred },
      rug: { x: rugX, y: rugY },
      threshT: tStar,

      /* the fit itself */
      nllPath: { x: it, y: nllPath },
      wPath: { x: it, y: wPath },

      /* statline */
      aucLearned: { value: rLearned.auc, meta: { label: 'AUC learned', precision: 4 } },
      aucBayes: { value: rBayes.auc, meta: { label: 'AUC clairvoyant', precision: 4 } },
      errLearned: { value: errL / NTEST, meta: { label: 'test error', precision: 4 } },
      errBayes: { value: errB / NTEST, meta: { label: 'Bayes error', precision: 4 } },
      wNormOut: { value: wNorm, meta: { label: '‖w‖', precision: 2 } },
      // The intercept, in the statline because it is READ in scene 3: nobody
      // hands the fit the prior, and at large N this number lands on
      // log(π₁/π₀) all by itself, out of the labels.
      intercept: { value: beta[0], meta: { label: 'b', precision: 3 } },
      gradOut: {
        value: path[path.length - 1].gradNorm,
        meta: { label: '‖∇‖', precision: 6 },
      },
      regime: {
        value:
          Math.abs(v - 1) < 1e-9
            ? 'well specified — the Bayes boundary IS a line'
            : 'misspecified — the Bayes boundary is a conic',
        meta: { label: 'model' },
      },
      separated: {
        value: sep ? 'training set separated — no maximum likelihood' : 'training set overlaps',
        meta: { label: 'data' },
      },
    },
  };
}
