// Robust regression — what a single bad point costs, and the three answers.
//
// Least squares minimises Σ r², and that square is the whole problem: a
// residual twice as large weighs four times as much, so one point far enough
// out decides the line by itself. The experiment quantifies that rather than
// asserting it — the OLS slope is an EXACT affine function of the outlier's
// offset,
//
//     ∂â/∂shift = (x_out − x̄) / Sxx
//
// which is checked to machine precision. "One point drags the line" is a
// closed form.
//
// Three replacements for the square, all of them a choice of ρ(r):
//   L1       ρ = |r|            every point weighs the same, whatever it does
//   Huber    ρ = r²/2 (|r| ≤ δ), δ|r| − δ²/2 beyond — quadratic near zero for
//            efficiency on clean data, linear far out for resistance
//   RANSAC   ρ = 0 inside a band, constant outside: the outlier stops counting
//            AT ALL, which is what buys a 50 % breakdown point
//
// L1 and Huber are solved by IRLS — the same normal equations, reweighted, so
// nothing new has to be believed about the algebra. Both have an exact limit
// the harness pins: Huber at large δ IS ordinary least squares (to 1e-12), and
// the L1 line passes through TWO of the data points, which is its
// characterisation and not a coincidence.
//
// RANSAC is seeded like everything else here: it draws its pairs from
// mulberry32, so the same URL gives the same line.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';


const IRLS_ITERS = 250;
// The 1/|r| weight of L1 is infinite at a residual of exactly zero, and an L1
// optimum HAS such residuals — it interpolates two points. A fixed guard would
// stop the iteration a guard's width short of the optimum; the guard therefore
// shrinks with the iteration, which is what makes IRLS land on the
// combinatorial optimum rather than near it.
const eps = (it) => Math.max(1e-11, 0.05 * 0.93 ** it);
const NLOSS = 240; // points on the ρ(r) curve
const NSWEEP = 61; // offsets on the breakdown sweep

/** OLS through (x, y), with the sums the closed forms need. */
export function ols(x, y, w = null) {
  let sw = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < x.length; i++) {
    const wi = w ? w[i] : 1;
    sw += wi;
    sx += wi * x[i];
    sy += wi * y[i];
  }
  const xb = sx / sw;
  const yb = sy / sw;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < x.length; i++) {
    const wi = w ? w[i] : 1;
    sxx += wi * (x[i] - xb) * (x[i] - xb);
    sxy += wi * (x[i] - xb) * (y[i] - yb);
  }
  const a = sxx > 0 ? sxy / sxx : 0;
  return { a, b: yb - a * xb, sxx, xb };
}

/**
 * IRLS for L1 (delta = Infinity gives OLS back, delta finite gives Huber).
 * The weight is ρ'(r)/r, which is 1/|r| for L1 and min(1, δ/|r|) for Huber:
 * the SAME normal equations, solved again with those weights until they stop
 * moving.
 */
export function irls(x, y, kind, delta = 1) {
  const n = x.length;
  const w = new Float64Array(n).fill(1);
  let f = ols(x, y);
  for (let it = 0; it < IRLS_ITERS; it++) {
    const g = eps(it);
    for (let i = 0; i < n; i++) {
      const r = Math.abs(y[i] - (f.a * x[i] + f.b));
      w[i] = kind === 'l1' ? 1 / Math.max(r, g) : Math.min(1, delta / Math.max(r, 1e-12));
    }
    const next = ols(x, y, w);
    const move = Math.abs(next.a - f.a) + Math.abs(next.b - f.b);
    f = next;
    if (kind !== 'l1' && move < 1e-15) break;
  }
  return f;
}

/**
 * RANSAC: draw two points, count how many of the others fall within `thr` of
 * the line through them, keep the best count, refit OLS on that consensus.
 * The refit matters — without it the answer is a line through two points and
 * carries none of the precision the inliers could have given.
 */
export function ransac(x, y, thr, trials, rng) {
  const n = x.length;
  let best = { a: 0, b: 0, count: -1 };
  for (let t = 0; t < trials; t++) {
    const i = Math.floor(rng() * n);
    let j = Math.floor(rng() * n);
    if (j === i) j = (j + 1) % n;
    const dx = x[j] - x[i];
    if (Math.abs(dx) < 1e-12) continue;
    const a = (y[j] - y[i]) / dx;
    const b = y[i] - a * x[i];
    let count = 0;
    for (let m = 0; m < n; m++) if (Math.abs(y[m] - (a * x[m] + b)) <= thr) count++;
    if (count > best.count) best = { a, b, count };
  }
  // refit on the consensus set
  const ix = [];
  const iy = [];
  for (let m = 0; m < n; m++)
    if (Math.abs(y[m] - (best.a * x[m] + best.b)) <= thr) {
      ix.push(x[m]);
      iy.push(y[m]);
    }
  const f = ix.length >= 2 ? ols(Float64Array.from(ix), Float64Array.from(iy)) : best;
  return { a: f.a, b: f.b, inliers: ix.length };
}

/**
 * The N observations, ε·N of them contaminated.
 *
 * The contaminated points are drawn ANYWHERE in the design and pushed by
 * shift·uᵢ, with uᵢ of its own between 0.4 and 1.6. Both details matter and
 * neither is decoration:
 *   · scattered rather than at one end, because a contiguous block at the edge
 *     is a leverage demonstration, not a contamination model;
 *   · with varying magnitudes, because a CONSTANT push leaves the outliers on
 *     a line parallel to the true one — collinear, same slope — and past the
 *     breakdown point RANSAC would then return the right slope for the wrong
 *     reason and the figure would show nothing.
 * The push stays LINEAR in `shift`, so the closed form for ∂â/∂shift survives
 * it exactly: Σ_out uᵢ(xᵢ − x̄)/Sxx.
 */
export function sample({ a, b, sigma, N, spread, contam, shift, pattern, seed }) {
  const rng = mulberry32(seed);
  const gauss = gaussFrom(rng);
  const x = new Float64Array(N);
  const y = new Float64Array(N);
  const bad = new Uint8Array(N);
  const mag = new Float64Array(N);
  const nOut = Math.min(Math.round(contam * N), N - 2);
  for (let i = 0; i < N; i++) {
    x[i] = -spread + (2 * spread * i) / (N - 1);
    y[i] = a * x[i] + b + sigma * gauss();
  }
  // which points are contaminated: a seeded shuffle, so the same URL gives the
  // same picture and moving the offset moves the SAME points
  const order = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (let k = 0; k < nOut; k++) {
    const i = order[k];
    bad[i] = 1;
    // SCATTERED: each contaminated point gets its own magnitude, so they form
    // a cloud. STRUCTURED: they all move by the same amount, which puts them
    // on a line PARALLEL to the true one — and that is a different problem,
    // because a consensus method can then be outvoted by a consensus.
    mag[i] = pattern === 'block' ? 1 : 0.4 + 1.2 * rng();
    y[i] += shift * mag[i];
  }
  return { x, y, bad, mag, nOut };
}

/** The estimate a given method produces on one sample. */
function estimate(x, y, { method, delta, thr, seed }) {
  if (method === 'l1') return irls(x, y, 'l1');
  if (method === 'huber') return irls(x, y, 'huber', delta);
  return ransac(x, y, thr, 200, mulberry32(seed + 77));
}

/** ρ(r), the cost a method puts on a residual — the figure that explains all. */
function rho(kind, r, delta, thr) {
  const t = Math.abs(r);
  if (kind === 'ols') return (r * r) / 2;
  if (kind === 'l1') return t;
  if (kind === 'huber') return t <= delta ? (r * r) / 2 : delta * t - (delta * delta) / 2;
  return t <= thr ? 0 : 1; // RANSAC counts, it does not weigh
}

/**
 * @param {{a: number, b: number, sigma: number, N: number, spread: number,
 *          contam: number, shift: number, method: string, delta: number,
 *          thr: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute(params) {
  const { a, b, sigma, N, spread, contam, shift, method, delta, thr, seed } = params;
  const { x, y, bad, mag, nOut } = sample(params);

  const fOls = ols(x, y);
  const fRob = estimate(x, y, params);

  /* ---------- the cloud, split so the contamination is visible ------------ */
  const gx = [];
  const gy = [];
  const bx = [];
  const by = [];
  for (let i = 0; i < N; i++) {
    (bad[i] ? bx : gx).push(x[i]);
    (bad[i] ? by : gy).push(y[i]);
  }

  const lx = Float64Array.from([-spread, spread]);
  const at = (f) => Float64Array.from([f.a * -spread + f.b, f.a * spread + f.b]);

  /* ---------- ρ(r): why the square is the problem ------------------------- */
  // Scaled so the four curves are comparable at r = 0: the point is the SHAPE
  // far from zero — unbounded, linear, or flat — and not the units.
  const rMax = 4 * Math.max(delta, thr, 1);
  const rr = new Float64Array(NLOSS);
  const lOls = new Float64Array(NLOSS);
  const lL1 = new Float64Array(NLOSS);
  const lHub = new Float64Array(NLOSS);
  const lRan = new Float64Array(NLOSS);
  for (let i = 0; i < NLOSS; i++) {
    const r = -rMax + (2 * rMax * i) / (NLOSS - 1);
    rr[i] = r;
    lOls[i] = rho('ols', r, delta, thr);
    lL1[i] = rho('l1', r, delta, thr);
    lHub[i] = rho('huber', r, delta, thr);
    lRan[i] = rho('ransac', r, delta, thr) * rMax * 0.4; // on a readable scale
  }

  /* ---------- the breakdown sweep ----------------------------------------- */
  // The SAME sample, with the offset swept, and how far each fitted LINE ends
  // up from the true one — the worst gap over the design, not the error on the
  // slope alone. That distinction is the whole figure: outliers pushed
  // TOGETHER sit on a line parallel to the truth, so a slope reading calls
  // that fit perfect while the line has moved bodily off the data.
  const lineErr = (f) =>
    Math.max(
      Math.abs(f.a * -spread + f.b - (a * -spread + b)),
      Math.abs(f.a * spread + f.b - (a * spread + b))
    );
  const sx = new Float64Array(NSWEEP);
  const sOls = new Float64Array(NSWEEP);
  const sRob = new Float64Array(NSWEEP);
  const S_MAX = 20;
  for (let i = 0; i < NSWEEP; i++) {
    const s = -S_MAX + (2 * S_MAX * i) / (NSWEEP - 1);
    sx[i] = s;
    const smp = sample({ ...params, shift: s });
    sOls[i] = lineErr(ols(smp.x, smp.y));
    sRob[i] = lineErr(estimate(smp.x, smp.y, params));
  }

  /* ---------- the closed form: how much ONE point moves OLS --------------- */
  // â is linear in every yᵢ, so the derivative of the slope with respect to the
  // offset of the contaminated points is exact: Σ_out (xᵢ − x̄) / Sxx.
  let lever = 0;
  for (let i = 0; i < N; i++) if (bad[i]) lever += (mag[i] * (x[i] - fOls.xb)) / fOls.sxx;

  const errOls = Math.abs(fOls.a - a);
  const errRob = Math.abs(fRob.a - a);

  return {
    observables: {
      clean: { x: Float64Array.from(gx), y: Float64Array.from(gy) },
      outliers: { x: Float64Array.from(bx), y: Float64Array.from(by) },
      truth: { x: lx, y: Float64Array.from([a * -spread + b, a * spread + b]) },
      fitOls: { x: lx, y: at(fOls) },
      fitRobust: { x: lx, y: at(fRob) },

      lossOls: { x: rr, y: lOls },
      lossL1: { x: rr, y: lL1 },
      lossHuber: { x: rr, y: lHub },
      lossRansac: { x: rr, y: lRan },

      sweepOls: { x: sx, y: sOls },
      sweepRobust: { x: sx, y: sRob },
      zeroLine: 0, // hline on the sweep: where a perfect fit would sit
      shiftLine: shift, // vline: where the scene is standing
      // raw, for the harness
      rawX: x,
      rawY: y,

      aOls: { value: fOls.a, meta: { label: 'â least squares', precision: 3 } },
      aRobust: { value: fRob.a, meta: { label: 'â robust', precision: 3 } },
      lever: {
        value: lever,
        meta: { label: '∂â/∂offset = Σ(xᵢ−x̄)/Sxx', precision: 4 },
      },
      nOut: { value: nOut, meta: { label: 'contaminated points', precision: 0 } },
      verdict: {
        value:
          nOut === 0
            ? 'clean data: the two lines agree'
            : errRob < 0.5 * errOls
              ? 'the robust fit holds, least squares does not'
              : errRob < 1.5 * errOls
                ? 'both are wrong: past the breakdown point'
                : 'the robust fit is paying for nothing here',
        meta: { label: 'state' },
      },
    },
  };
}
